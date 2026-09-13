import { getMatchRoomLifecycle } from '../match-room/matchRoomLifecycle.js'

const ACTIVE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'SUBMITTED'])
const FINISHED_STATUSES = new Set(['COMPLETE', 'LOCKED', 'CANCELLED'])
const NEGOTIATION_PATTERN = /(改期|协商|候选.*时间|赛程变更)/
const SCHEDULE_WORKSPACE_URL = '/me?section=matches#schedule-negotiation'
const REPRESENTATIVE_ROLES = ['MANAGER', 'CAPTAIN', 'DEPUTY_CAPTAIN']

const ROLE_LABELS = {
  MANAGER: '经理',
  CAPTAIN: '队长',
  DEPUTY_CAPTAIN: '副队长',
  PLAYER: '选手',
  COACH: '教练'
}

export const MATCH_STATUS_LABELS = {
  PENDING: '未开始',
  IN_PROGRESS: '进行中',
  SUBMITTED: '结果审核中',
  COMPLETE: '已完成',
  LOCKED: '结果已锁定',
  CANCELLED: '已取消'
}

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

function timestamp(value, fallback = Number.POSITIVE_INFINITY) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : fallback
}

function teamLabel(team) {
  return team?.shortName || team?.name || 'TBD'
}

function identityType(context) {
  const identities = context?.identities || []
  const selected = identities.find(identity => identity?.isPrimary) || identities[0]
  return normalized(selected?.type || selected?.identityType || context?.primaryIdentityType || 'VIEWER')
}

function relationshipMatches(context) {
  const map = new Map()
  for (const teamContext of context?.teamContexts || []) {
    for (const match of teamContext?.matches || []) {
      if (!match?.id) continue
      const current = map.get(match.id) || {
        match,
        roles: new Set(),
        canNegotiateSchedule: false,
        canEnterMatchRoom: false,
        registrationIds: new Set()
      }
      for (const role of teamContext?.roles || []) current.roles.add(normalized(role))
      current.canNegotiateSchedule ||= Boolean(teamContext?.capabilities?.canNegotiateSchedule)
      current.canEnterMatchRoom ||= Boolean(teamContext?.capabilities?.canEnterMatchRoom)
      if (teamContext?.registrationId) current.registrationIds.add(teamContext.registrationId)
      map.set(match.id, current)
    }
  }
  return [...map.values()].map(item => ({
    ...item.match,
    relationshipRoles: [...item.roles],
    canNegotiateSchedule: item.canNegotiateSchedule,
    canEnterMatchRoom: item.canEnterMatchRoom,
    registrationIds: [...item.registrationIds]
  }))
}

function relationshipAccess(match) {
  const roles = match?.relationshipRoles || []
  const representativeRole = REPRESENTATIVE_ROLES.find(role => roles.includes(role))
  const primaryRole = representativeRole || ['PLAYER', 'COACH'].find(role => roles.includes(role)) || roles[0] || ''
  const roleLabel = ROLE_LABELS[primaryRole] || '赛事成员'

  if (match?.canNegotiateSchedule) {
    return {
      key: 'ACTION',
      label: `${roleLabel}可操作`,
      detail: '可提出候选时间并代表队伍确认'
    }
  }

  return {
    key: 'READ_ONLY',
    label: `${roleLabel}只读`,
    detail: primaryRole === 'PLAYER'
      ? '可查看协商结果，不代表队伍确认'
      : primaryRole === 'COACH'
        ? '可查看赛程，不进入协商与比赛房'
        : '可查看赛程，当前关系不能发起协商'
  }
}

function matchTimeState(match, nowTime) {
  const status = normalized(match?.status)
  if (status === 'IN_PROGRESS') return { key: 'live', label: '比赛进行中' }
  if (status === 'SUBMITTED') return { key: 'review', label: '结果审核中' }
  if (FINISHED_STATUSES.has(status)) return { key: 'finished', label: MATCH_STATUS_LABELS[status] || status }
  const scheduledTime = timestamp(match?.scheduledAt)
  if (!Number.isFinite(scheduledTime)) return { key: 'unscheduled', label: '时间待定' }
  const remaining = scheduledTime - nowTime
  if (remaining < -6 * 60 * 60_000) return { key: 'overdue', label: '等待状态更新' }
  if (remaining <= 24 * 60 * 60_000) return { key: 'soon', label: '24 小时内开始' }
  return { key: 'scheduled', label: '赛程已排定' }
}

function matchView(match, nowTime) {
  const timeState = matchTimeState(match, nowTime)
  const roomLifecycle = getMatchRoomLifecycle(match, { now: nowTime, room: match?.room })
  const isRoomAuthorized = Boolean(match?.canEnterMatchRoom)
  const canEnterRoom = Boolean(isRoomAuthorized && roomLifecycle.canEnter)
  const noRoomAccessLabel = match?.relationshipRoles?.includes('COACH')
    ? '教练无比赛房权限'
    : '当前关系无比赛房权限'
  const roomAccess = {
    ...roomLifecycle,
    isAuthorized: isRoomAuthorized,
    canEnter: canEnterRoom,
    label: isRoomAuthorized ? roomLifecycle.label : noRoomAccessLabel,
    actionLabel: isRoomAuthorized ? roomLifecycle.actionLabel : noRoomAccessLabel,
    detail: isRoomAuthorized
      ? roomLifecycle.isReadOnly
        ? '赛后比赛记录保留只读'
        : `默认赛前 ${roomLifecycle.openMinutesBefore} 分钟开放`
      : match?.relationshipRoles?.includes('COACH')
        ? '可查看赛程与结果，不能进入比赛房'
        : '当前赛事关系不包含比赛房权限'
  }
  return {
    ...match,
    statusKey: normalized(match?.status),
    statusLabel: MATCH_STATUS_LABELS[normalized(match?.status)] || match?.status || '状态待定',
    timeState,
    scheduleAccess: relationshipAccess(match),
    roomAccess,
    matchup: `${teamLabel(match?.teamA)} VS ${teamLabel(match?.teamB)}`,
    score: Number.isFinite(match?.scoreA) && Number.isFinite(match?.scoreB) ? `${match.scoreA} : ${match.scoreB}` : ''
  }
}

function nextRelationshipMatch(matches, overviewMatch, nowTime) {
  if (overviewMatch?.id) {
    const related = matches.find(match => match.id === overviewMatch.id)
    if (related) return related
  }
  return [...matches]
    .filter(match => ACTIVE_STATUSES.has(normalized(match.status)))
    .sort((left, right) => {
      const leftLive = normalized(left.status) === 'IN_PROGRESS' ? 0 : 1
      const rightLive = normalized(right.status) === 'IN_PROGRESS' ? 0 : 1
      if (leftLive !== rightLive) return leftLive - rightLive
      const leftTime = timestamp(left.scheduledAt)
      const rightTime = timestamp(right.scheduledAt)
      const leftExpired = leftTime < nowTime - 6 * 60 * 60_000 ? 1 : 0
      const rightExpired = rightTime < nowTime - 6 * 60 * 60_000 ? 1 : 0
      return leftExpired - rightExpired || leftTime - rightTime
    })[0] || null
}

function emptyCopy(type) {
  if (type === 'PLAYER') return { headline: '当前还没有关联比赛', description: '加入本届队伍并生成对阵后，比赛会自动同步到这里。', label: '查看队伍与阵容', url: '/me?section=team' }
  if (type === 'MANAGER') return { headline: '等待本届对阵生成', description: '完成队伍报名和正式名单后，对阵会按赛事阶段自动汇总。', label: '管理报名与阵容', url: '/me?section=team' }
  if (type === 'COACH') return { headline: '本届队伍暂时没有比赛', description: '教练关系确认后，将自动获得队伍比赛的只读视图。', label: '查看队伍关系', url: '/me?section=team' }
  return { headline: '这里仅汇总账号赛事关系', description: '关注比赛请前往公开赛程；成为选手、经理、教练或工作人员后会出现专属比赛。', label: '查看公开赛程', url: '/matches' }
}

export function buildMyMatchesView(context = {}, { now = new Date() } = {}) {
  const nowTime = now instanceof Date ? now.getTime() : timestamp(now, Date.now())
  const matches = relationshipMatches(context).map(match => matchView(match, nowTime))
  const nextMatch = nextRelationshipMatch(matches, context?.overview?.nextTeamMatch, nowTime)
  const negotiationTasks = (context?.overview?.tasks || []).filter(task => (
    NEGOTIATION_PATTERN.test(String(task?.title || ''))
  ))
  const negotiableMatches = matches
    .filter(match => match.statusKey === 'PENDING' && match.canNegotiateSchedule && match.scheduledAt)
    .sort((left, right) => timestamp(left.scheduledAt) - timestamp(right.scheduledAt))
  const upcomingMatches = matches
    .filter(match => ACTIVE_STATUSES.has(match.statusKey) && match.id !== nextMatch?.id)
    .sort((left, right) => timestamp(left.scheduledAt) - timestamp(right.scheduledAt))
  const historyMatches = matches
    .filter(match => FINISHED_STATUSES.has(match.statusKey))
    .sort((left, right) => timestamp(right.scheduledAt, 0) - timestamp(left.scheduledAt, 0))
  const type = identityType(context)

  let currentAction = emptyCopy(type)
  if (nextMatch) {
    currentAction = {
      headline: nextMatch.statusKey === 'IN_PROGRESS' ? '你的比赛正在进行' : `下一场：${nextMatch.matchup}`,
      description: nextMatch.scheduledAt ? `${nextMatch.stage || '赛事阶段'} · ${nextMatch.roundLabel || '轮次待定'}` : '比赛时间仍待赛事方确认。',
      label: '查看比赛资料',
      url: `/matches/${encodeURIComponent(nextMatch.id)}`,
      tone: nextMatch.statusKey === 'IN_PROGRESS' ? 'live' : nextMatch.timeState.key
    }
  }
  if (negotiationTasks.length) {
    currentAction = {
      headline: '赛程变更等待你确认',
      description: negotiationTasks[0]?.title || '请在截止时间前处理候选比赛时间。',
      label: '处理赛程协商',
      url: SCHEDULE_WORKSPACE_URL,
      tone: 'attention'
    }
  }

  return {
    identityType: type,
    currentAction,
    nextMatch,
    negotiableMatches,
    negotiationTasks,
    upcomingMatches,
    historyMatches,
    facts: [
      { label: '关联比赛', value: String(matches.length), detail: '场' },
      { label: '可协商赛程', value: String(negotiableMatches.length), detail: '场' },
      { label: '接下来', value: String(upcomingMatches.length + (nextMatch ? 1 : 0)), detail: '场' },
      { label: '历史比赛', value: String(historyMatches.length), detail: '场' }
    ]
  }
}
