import { buildWeeklyRoomJourney, weeklyResponseAccess, weeklyRoomScore, weeklyTeamName } from '../weekly-competition/weeklyMatchRoomModel.js'

export const PARTICIPATION_FILTERS = ['current', 'all', 'action', 'waiting', 'blocked', 'active', 'history']
export const PARTICIPATION_LABELS = { current: '当前事项', all: '全部事项', action: '待我处理', waiting: '等待处理', blocked: '需要协助', active: '参赛安排', history: '已有结果' }

export function summarizeParticipation(items, limit = 3) {
  const current = items.filter(item => item.category !== 'history')
  return { current: current.slice(0, limit), remaining: Math.max(0, current.length - limit), counts: Object.fromEntries(PARTICIPATION_FILTERS.map(key => [key, key === 'all' ? items.length : key === 'current' ? current.length : items.filter(item => item.category === key).length])) }
}

export function participationProgressHref(id) {
  return `/me?section=overview&journey=${encodeURIComponent(id)}`
}

export function withParticipationActionContext(actionUrl, currentSearch) {
  const target = new URL(actionUrl, 'https://local.test')
  const current = new URLSearchParams(currentSearch)
  for (const key of ['competition', 'season', 'lang', 'design']) {
    if (!target.searchParams.has(key) && current.has(key)) target.searchParams.set(key, current.get(key))
  }
  return `${target.pathname}${target.search}${target.hash}`
}

export function buildParticipationJourneys(plans = [], workspace, { seasonId, readOnly = true } = {}) {
  const preparation = plans.map(plan => {
    const optedOut = plan.stages.some(stage => stage.key === 'participation' && stage.state === 'quiet')
    const category = plan.terminal || optedOut ? 'history' : plan.next ? 'action' : plan.stages.some(stage => stage.state === 'blocked') ? 'blocked' : plan.readyForSchedule ? 'active' : 'waiting'
    return {
      id: `preparation:${plan.id}`, category, title: weeklyTeamName(plan.team),
      scope: [plan.cycle.name, plan.week?.label || (plan.week ? `第 ${plan.week.weekNumber} 周` : '周期登记')].filter(Boolean).join(' · '),
      summary: plan.summary, detail: plan.guidance.detail,
      owner: category === 'history' ? '记录可回看' : category === 'action' ? '由你处理' : category === 'blocked' ? '需周赛管理员协助' : plan.guidance.label,
      actionUrl: plan.next?.actionUrl || plan.actionUrl,
      actionLabel: plan.next ? `继续${plan.next.title}` : category === 'history' ? '查看参赛记录' : category === 'blocked' ? '核对受阻事项' : '查看名单与进度',
      dueAt: plan.dueAt, stages: plan.stages, readyForSchedule: plan.readyForSchedule
    }
  })
  const roomReadOnly = readOnly || workspace?.accessMode !== 'WRITE' || workspace?.featureAccess !== 'WRITE' || workspace?.season?.status === 'ARCHIVED'
  const rooms = workspace?.season?.id === seasonId ? (workspace.rooms || []).flatMap(room => (room.myTeams || []).map(team => {
    const ownRoom = { ...room, myTeams: [team] }
    const journey = buildWeeklyRoomJourney(ownRoom, { readOnly: roomReadOnly })
    const actionable = team.confirmation?.status === 'PENDING' && weeklyResponseAccess(ownRoom, team, { readOnly: roomReadOnly }).allowed
    const category = journey.terminal ? 'history' : actionable ? 'action' : ['DISPUTED', 'STALE'].includes(room.confirmationState) ? 'blocked' : journey.phase === 'live' || journey.preMatch && room.scheduledAt ? 'active' : 'waiting'
    return {
      id: `match:${room.id}:${team.team.id}`, category, title: `${weeklyTeamName(room.teamA)} vs ${weeklyTeamName(room.teamB)}`,
      scope: [weeklyTeamName(team.team), room.cycle?.name, room.displayName || room.week?.label].filter(Boolean).join(' · '),
      summary: actionable && room.confirmationState === 'DISPUTED' ? '本队待响应 · 已有争议' : journey.state.label,
      detail: actionable && room.confirmationState === 'DISPUTED' ? '本场已有争议，本队仍需核对当前赛果并提交响应。争议由周赛管理员处理，队伍响应不会直接结算。' : journey.state.detail,
      owner: category === 'history' ? '结果与响应可回看' : actionable ? '由你代表本队处理' : category === 'blocked' ? '等待周赛管理员处理' : journey.preMatch ? '按赛程安排参赛' : '等待赛果流程继续',
      actionUrl: `/me?section=matches&weeklyMatch=${encodeURIComponent(room.id)}`,
      actionLabel: actionable ? '核对本场赛果' : category === 'history' ? '查看赛果记录' : '查看比赛进度',
      stages: journey.stages.map(stage => ({ ...stage, title: stage.en === 'SCHEDULE' ? '赛程' : stage.en === 'MATCH' ? '参赛' : stage.en === 'RESULT' ? '赛果' : stage.en === 'OFFICIAL' ? '正式赛果' : stage.en === 'TEAM RESPONSE' ? '队伍响应' : '结算', detail: '', state: stage.state === 'current' ? actionable ? 'action' : 'waiting' : stage.state })),
      score: room.ready === true ? weeklyRoomScore(room) : '', scheduledAt: room.scheduledAt
    }
  })) : []
  const order = { action: 0, blocked: 1, waiting: 2, active: 3, history: 4 }
  return [...preparation, ...rooms].sort((a, b) => order[a.category] - order[b.category])
}

export function getParticipationView(items, params) {
  const filter = PARTICIPATION_FILTERS.includes(params.get('progress')) ? params.get('progress') : 'all'
  const visible = filter === 'all' ? items : items.filter(item => filter === 'current' ? item.category !== 'history' : item.category === filter)
  const requested = params.get('journey')
  const selected = requested ? visible.find(item => item.id === requested) : visible[0]
  return { filter, visible, selected, unavailable: Boolean(requested && !selected), counts: summarizeParticipation(items).counts }
}

export function getWeeklyRosterCheck(ids, coreIds, rules, players) {
  const chosen = new Set(ids)
  const coreCount = [...chosen].filter(id => coreIds.has(id)).length
  const known = new Set(players.map(player => player.id))
  const errors = []
  if ([...chosen].some(id => !known.has(id))) errors.push('名单含有当前队伍不可用的选手，请重新核对。')
  if (chosen.size < rules.rosterMin || chosen.size > rules.rosterMax) errors.push(`需要选择 ${rules.rosterMin}–${rules.rosterMax} 人，当前 ${chosen.size} 人。`)
  if (coreCount < rules.minimumCoreInWeeklyRoster) errors.push(`至少需要 ${rules.minimumCoreInWeeklyRoster} 名已锁定核心，当前 ${coreCount} 名。`)
  return { count: chosen.size, coreCount, errors, canSubmit: errors.length === 0 }
}
