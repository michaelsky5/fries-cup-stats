const TERMINAL = new Set(['CLOSED', 'CANCELLED'])
const time = value => value ? Date.parse(value) : NaN
const members = record => record?.members || []

export function weeklyConfirmationWindow(week, now = Date.now()) {
  if (!week) return 'missing'
  if (!week.status) return 'unknown'
  if (TERMINAL.has(week.status)) return 'closed'
  const opens = time(week.confirmationOpensAt)
  const closes = time(week.confirmationDeadlineAt)
  if ((week.confirmationOpensAt && !Number.isFinite(opens)) || (week.confirmationDeadlineAt && !Number.isFinite(closes))) return 'unknown'
  if (Number.isFinite(closes) && Number(now) > closes) return 'closed'
  if (Number.isFinite(opens) && Number(now) < opens) return 'upcoming'
  if (week.status === 'CONFIRMATION_OPEN') return 'open'
  return week.status === 'DRAFT' ? 'upcoming' : 'closed'
}

export function weeklyTeamDestination(cycleId, entryId, weekId, step) {
  const params = new URLSearchParams({ section: 'team', cycle: cycleId, entry: entryId })
  if (weekId) params.set('week', weekId)
  if (step) params.set('step', step)
  return `/me?${params}${step ? `#weekly-${step}` : ''}`
}

export function getWeeklyFocusStep(plan, requestedStep) {
  const steps = ['core', 'participation', 'roster']
  if (requestedStep && !steps.includes(requestedStep)) return null
  if (requestedStep === 'core' && plan?.stages && !plan.stages.some(stage => stage.key === 'core')) return plan.next?.key || 'participation'
  return requestedStep || plan?.next?.key || plan?.stages?.find(stage => ['blocked', 'waiting'].includes(stage.state))?.key || 'roster'
}

function weekRank(week, now) {
  const window = weeklyConfirmationWindow(week, now)
  if (window === 'open') return 0
  if (['PUBLISHED', 'IN_PROGRESS', 'RESULT_REVIEW', 'CONFIRMATION_CLOSED', 'ROSTER_LOCKED', 'PAIRING'].includes(week?.status)) return 1
  return window === 'upcoming' ? 2 : 3
}

export function orderWeeklyRecords(records = [], now = Date.now()) {
  return [...records].sort((a, b) => weekRank(a.week, now) - weekRank(b.week, now)
    || (weekRank(a.week, now) === 3 ? -1 : 1) * ((a.week?.weekNumber || 0) - (b.week?.weekNumber || 0)))
}

// Explicit links must never silently open a different team or week.
export function resolveWeeklySelection(workspace, requested = {}, now = Date.now()) {
  const cycles = workspace?.cycles || []
  const cycle = requested.cycleId ? cycles.find(item => item.id === requested.cycleId)
    : requested.entryId ? cycles.find(item => item.entries?.some(entry => entry.id === requested.entryId))
      : cycles.find(item => !TERMINAL.has(item.status) && item.entries?.length) || cycles.find(item => item.entries?.length) || cycles[0]
  const entry = requested.entryId ? cycle?.entries?.find(item => item.id === requested.entryId) : cycle?.entries?.[0]
  const weekRecord = requested.weekId ? entry?.weeks?.find(item => item.week?.id === requested.weekId) : orderWeeklyRecords(entry?.weeks, now)[0]
  const invalid = Boolean((requested.cycleId && !cycle) || (requested.entryId && !entry) || (requested.weekId && !weekRecord))
  return { cycle: cycle || null, entry: entry || null, weekRecord: weekRecord || null, invalid }
}

export function isWeeklyPreparationWorkspace(workspace, seasonId, userId) {
  return Boolean(workspace && workspace.userId === userId && workspace.season?.id === seasonId
    && Array.isArray(workspace.cycles) && Array.isArray(workspace.teams))
}

function prepareEntry(workspace, cycle, entry, record, { readOnly, now }) {
  const week = record?.week
  const participation = record?.participation
  const team = entry.team || {}
  const teamAccess = workspace.teams.find(item => item.team?.id === (entry.seasonTeamId || team.id))
  const terminal = TERMINAL.has(cycle.status) || TERMINAL.has(week?.status) || workspace.season.status === 'ARCHIVED' || (entry.status && entry.status !== 'ACTIVE')
  const writable = !readOnly && !terminal && workspace.accessMode === 'WRITE' && entry.accessMode === 'WRITE'
    && teamAccess?.accessMode === 'WRITE' && ['LEADER', 'MANAGER'].includes(teamAccess.role)
  const window = weeklyConfirmationWindow(week, now)
  const core = entry.coreSelections?.find(item => item.status === 'LOCKED')
  const previousAppearance = (record?.rules || cycle.rules)?.rosterContinuityMode === 'PREVIOUS_APPEARANCE'
  const coreReady = previousAppearance || core
  const coreDraft = entry.coreSelections?.find(item => item.status === 'DRAFT')
  const roster = participation?.rosters?.find(item => item.status === 'LOCKED')
    || participation?.rosters?.find(item => ['DRAFT', 'SUBMITTED'].includes(item.status))
  const confirmed = participation?.status === 'CONFIRMED'
  const declined = ['DECLINED', 'WITHDRAWN'].includes(participation?.status)
  const terminalDetail = week?.status === 'CANCELLED' || cycle.status === 'CANCELLED' ? '赛事安排已取消，已有记录仅供查看。'
    : entry.status && entry.status !== 'ACTIVE' ? '本队的参赛关系已结束，已有记录仅供查看。'
      : '本周期或周次已结束，已有记录仅供查看。'
  const owner = writable ? '由你代表队伍处理' : '由队长或经理处理'
  const windowDetail = terminal ? terminalDetail
    : window === 'closed' ? '确认期已结束，如需补录请联系周赛管理员。'
      : window === 'unknown' ? '确认时间尚未同步，请刷新后核对。'
        : window === 'missing' ? '周次公布后显示当周确认与名单。' : '确认窗口尚未开放。'
  const stages = [
    {
      key: 'core', title: '周期核心',
      state: core ? 'done' : terminal ? 'quiet' : cycle.status === 'REGISTRATION' ? writable ? 'action' : 'waiting' : 'blocked',
      label: core ? '已锁定' : coreDraft ? '草稿待锁定' : '尚未登记',
      detail: core ? `${members(core).length} 人 · 核心名单已锁定`
        : terminal ? terminalDetail : cycle.status === 'REGISTRATION' ? `${owner}，选定核心后确认锁定。` : '需要周赛管理员核对核心名单。'
    },
    {
      key: 'participation', title: '当周参赛',
      state: confirmed ? 'done' : declined || terminal ? 'quiet' : window === 'open' ? writable ? 'action' : 'waiting' : window === 'closed' ? 'blocked' : 'waiting',
      label: confirmed ? '已确认参赛' : declined ? participation.status === 'DECLINED' ? '本周不参赛' : '已撤回确认'
        : terminal ? '未确认参赛' : window === 'missing' ? '周次尚未公布' : window === 'unknown' ? '确认状态待同步'
          : window === 'open' ? '待确认参赛' : window === 'closed' ? '未确认 · 已截止' : '等待确认开放',
      detail: confirmed ? participation.availabilityNote || '本周参赛意向已保存。'
        : declined ? terminal ? terminalDetail : window === 'open' ? writable ? '截止前可在队伍页调整参赛意向。' : '如需调整参赛意向，请联系队长或经理。' : `本周无需提交名单。${windowDetail}`
          : window === 'open' && !terminal ? `${owner}，确认是否参加本周比赛。` : windowDetail
    },
    {
      key: 'roster', title: '出赛名单',
      state: declined ? 'quiet' : roster?.status === 'LOCKED' ? 'done' : terminal ? 'quiet'
        : !confirmed ? 'waiting' : roster?.status === 'SUBMITTED' ? 'waiting'
          : window === 'closed' ? 'blocked' : window === 'open' && coreReady && writable ? 'action' : 'waiting',
      label: declined ? '本周无需提交' : roster?.status === 'LOCKED' ? '管理员已锁定'
        : terminal ? roster?.status === 'SUBMITTED' ? '已提交 · 未锁定' : '未提交正式名单'
          : !confirmed ? window === 'closed' ? '本周未提交' : '确认参赛后开放' : roster?.status === 'SUBMITTED' ? '已提交 · 等待锁定'
          : window === 'closed' && !terminal ? '未提交 · 已截止' : roster ? '草稿待提交' : '尚未提交',
      detail: declined ? '不计入本周参赛准备。' : roster?.status === 'LOCKED' ? `${members(roster).length} 人 · 正式名单已锁定`
        : terminal ? terminalDetail : !confirmed ? window === 'closed' ? '未完成当周参赛确认，名单未提交。' : '由队长或经理确认参赛后，继续准备名单。'
          : roster?.status === 'SUBMITTED' ? `${members(roster).length} 人 · 等待周赛管理员锁定。`
            : terminal || window !== 'open' ? windowDetail
              : !coreReady ? '先完成周期核心锁定，再提交本周名单。'
                : `${roster ? `已保存 ${members(roster).length} 人，` : ''}${writable ? '核对后正式提交；保存草稿不会完成此步骤。' : '等待队长或经理提交名单。'}`
    }
  ].filter(stage => !previousAppearance || stage.key !== 'core').map(stage => ({ ...stage, actionUrl: weeklyTeamDestination(cycle.id, entry.id, week?.id, stage.key) }))
  const next = stages.find(stage => stage.state === 'action')
  const issue = stages.find(stage => stage.state === 'blocked')
  const readyForSchedule = !terminal && !declined && stages.every(stage => stage.state === 'done')
  const summary = terminal ? week?.status === 'CANCELLED' || cycle.status === 'CANCELLED' ? '赛事安排已取消' : '历史参赛记录'
    : declined ? participation.status === 'WITHDRAWN' ? '已撤回当周参赛' : '本周不参赛' : next ? `下一步：${next.title}`
      : issue ? '需要管理员协助' : readyForSchedule ? '本周名单准备已完成'
        : roster?.status === 'SUBMITTED' ? '等待管理员锁定名单' : !week ? '等待周次公布'
          : window === 'unknown' ? '确认状态待同步' : window === 'upcoming' ? '等待确认窗口开放'
            : !coreReady ? '等待队长或经理锁定核心' : !confirmed ? '等待队长或经理确认参赛' : '等待队长或经理提交名单'
  const guidance = terminal ? { label: '记录状态', detail: terminalDetail }
    : declined ? { label: '当前安排', detail: window === 'open' ? `本周无需提交名单。${writable ? '如计划有变，可在截止前调整参赛意向。' : '如计划有变，请联系队长或经理。'}` : `本周无需提交名单。${windowDetail}` }
      : issue ? { label: '需要协助', detail: issue.key === 'core' ? '可在下方队伍准备页提交问题，由赛管核对周期核心名单。' : '确认期已结束，可在队伍准备页提交问题并跟踪处理。' }
        : readyForSchedule ? { label: '接下来', detail: '名单已锁定，请留意赛程发布与比赛安排。' }
          : roster?.status === 'SUBMITTED' ? { label: '接下来由管理员处理', detail: '名单已提交，等待周赛管理员锁定；无需重复提交。' }
            : !week ? { label: '接下来', detail: '周次公布后，这里会显示当周确认时间与名单要求。' }
              : window === 'upcoming' ? { label: '开放后继续', detail: '确认窗口开放后，由队长或经理确认参赛并提交名单。' }
                : window === 'unknown' ? { label: '状态待确认', detail: '请刷新进度，核对确认窗口后再继续。' }
                  : { label: writable ? '接下来由你处理' : '接下来由队伍处理', detail: stages.find(stage => ['action', 'waiting'].includes(stage.state))?.detail || '请在队伍页核对当前参赛状态。' }
  return { id: `${entry.id}:${week?.id || 'cycle'}`, cycle, entry, week, team, stages, next, summary,
    dueAt: !terminal && window === 'open' ? week.confirmationDeadlineAt : null,
    guidance, readyForSchedule, window, writable, actionUrl: weeklyTeamDestination(cycle.id, entry.id, week?.id), terminal }
}

export function buildWeeklyPreparation(workspace, { seasonId, userId, readOnly = true, now = Date.now() } = {}) {
  if (!isWeeklyPreparationWorkspace(workspace, seasonId, userId)) return { plans: [], tasks: [] }
  const plans = workspace.cycles.flatMap(cycle => (cycle.entries || []).flatMap(entry => {
    const records = orderWeeklyRecords(entry.weeks, now)
    return (records.length ? records : [null]).map(record => prepareEntry(workspace, cycle, entry, record, { readOnly, now }))
  })).sort((a, b) => Number(a.terminal) - Number(b.terminal) || Number(!a.next) - Number(!b.next)
    || weekRank(a.week, now) - weekRank(b.week, now))
  const seen = new Set()
  const enrollmentTasks = !readOnly && workspace.accessMode === 'WRITE' && workspace.season.status !== 'ARCHIVED'
    ? workspace.cycles.filter(cycle => !TERMINAL.has(cycle.status) && cycle.enrollmentOpen).flatMap(cycle => (cycle.eligibleTeams || [])
      .filter(team => workspace.teams.some(access => access.team?.id === team.id && access.accessMode === 'WRITE' && ['LEADER', 'MANAGER'].includes(access.role)))
      .map(team => ({ id: `weekly-enrollment:${cycle.id}:${team.id}`, status: 'OPEN', identityType: 'MANAGER', priority: 'HIGH', requiresSourceResolution: true,
        taskType: 'WEEKLY_PREPARATION_ENROLLMENT', sourceType: 'WEEKLY_PREPARATION', sourceId: `enrollment:${cycle.id}:${team.id}`,
        title: `${team.shortName || team.name} · 登记参赛周期`, body: `${cycle.name}。队伍资格已通过，登记后继续确认每周参赛。`,
        teamOrganization: team, dueAt: cycle.endsAt || null, actionUrl: '/me?section=team#weekly-enrollment-title' }))) : []
  const tasks = [...enrollmentTasks, ...plans.flatMap(plan => plan.stages.filter(stage => stage.state === 'action').flatMap(stage => {
    const sourceId = stage.key === 'core' ? plan.entry.id : `${plan.entry.id}:${plan.week.id}`
    const id = `weekly-${stage.key}:${sourceId}`
    if (seen.has(id)) return []
    seen.add(id)
    return [{ id, status: 'OPEN', identityType: 'MANAGER', priority: 'HIGH', requiresSourceResolution: true,
      taskType: `WEEKLY_PREPARATION_${stage.key.toUpperCase()}`, sourceType: 'WEEKLY_PREPARATION', sourceId,
      title: `${plan.team.shortName || plan.team.name || '本队'} · ${stage.key === 'core' ? '锁定周期核心' : stage.key === 'participation' ? '确认当周参赛' : '提交出赛名单'}`,
      body: `${plan.cycle.name}${stage.key !== 'core' && plan.week ? ` · ${plan.week.label || `第 ${plan.week.weekNumber} 周`}` : ''}。${stage.detail}`,
      teamOrganization: plan.team, dueAt: stage.key === 'core' ? null : plan.dueAt, actionUrl: stage.actionUrl }]
  }))]
  return { plans, tasks }
}
