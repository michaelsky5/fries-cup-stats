const WORKFLOW_STATUS_LABELS = {
  ACCEPTED: '已接受',
  APPROVED: '已通过',
  REJECTED: '未通过',
  WITHDRAWN: '已撤回',
  EXPIRED: '已失效',
  CANCELLED: '已取消',
  SUBMITTED: '审核中',
  LOCKED: '已锁定',
  PENDING: '待处理',
  OPEN: '开放中',
  COMPLETED: '已完成',
  SENT: '已发送',
  FAILED: '发送失败',
  SENDING: '发送中',
  SKIPPED: '未发送'
}

const NOTIFICATION_TYPE_LABELS = {
  TEAM_APPLICATION_RESULT: '入队申请',
  TEAM_INVITATION_RESULT: '队伍邀请',
  TEAM_REGISTRATION_RESULT: '赛事报名',
  EVENT_ROSTER_LOCKED: '正式阵容',
  ROSTER_CANDIDATE_RESTORED: '候选阵容',
  ROSTER_CANDIDATE_REMOVED: '候选阵容',
  EVENT_ROSTER_SUBMITTED_PLAYER: '正式名单',
  EVENT_ROSTER_SUBMITTED_NOT_SELECTED: '名单结果',
  EVENT_ROSTER_WITHDRAWN_PLAYER: '名单调整',
  EVENT_ROSTER_LOCKED_PLAYER: '正式名单',
  EVENT_ROSTER_NOT_SELECTED: '名单结果',
  EVENT_ROSTER_REJECTED_PLAYER: '名单退回',
  ROSTER_CHANGE_RESULT: '名单变更',
  EVENT_STAFF_APPLICATION_REJECTED: '工作人员申请'
}

const IDENTITY_TYPE_LABELS = {
  PLAYER: '选手',
  MANAGER: '经理',
  COACH: '教练',
  REFEREE: '赛管',
  CASTER: '解说',
  VIEWER: '普通观众'
}

const TASK_WORKFLOWS = {
  PREPARATION: { key: 'preparation', label: '参赛准备', en: 'PREPARATION' },
  RESULT: { key: 'result', label: '赛果确认', en: 'RESULT REVIEW' },
  REGISTRATION: { key: 'registration', label: '报名与入队', en: 'REGISTRATION' },
  ROSTER: { key: 'roster', label: '阵容与转会', en: 'ROSTER' },
  SCHEDULE: { key: 'schedule', label: '赛程协商', en: 'SCHEDULE' },
  STAFF: { key: 'staff', label: '赛事工作', en: 'STAFF' },
  COMMUNICATION: { key: 'communication', label: '公告与申诉', en: 'COMMS' },
  ACCOUNT: { key: 'account', label: '账号关系', en: 'ACCOUNT' },
  GENERAL: { key: 'general', label: '赛事事项', en: 'EVENT' }
}

const EMPTY_QUEUE_COPY = {
  PLAYER: {
    headline: '当前没有需要你确认的选手事项',
    description: '入队邀请、正式名单、转会确认和赛程相关提醒会自动进入这里。'
  },
  MANAGER: {
    headline: '当前队伍流程已经处理完',
    description: '新的选手申请、阵容提交、转会放行和赛程确认会自动进入这里。'
  },
  COACH: {
    headline: '当前没有需要回应的教练事项',
    description: '长期教练邀请与每届正式教练关系会在这里等待你的确认。'
  },
  REFEREE: {
    headline: '当前没有待处理的赛管安排',
    description: '赛事关系、档期确认和正式场次任务会自动同步到这里。'
  },
  CASTER: {
    headline: '当前没有待处理的解说安排',
    description: '赛事关系、可用时间和正式排班需要回应时会自动同步到这里。'
  },
  VIEWER: {
    headline: '当前任务队列已经清空',
    description: '需要你回应的账号或赛事事项出现后，会自动进入这里。'
  }
}

export function localizeWorkflowText(value) {
  return Object.entries(WORKFLOW_STATUS_LABELS).reduce(
    (text, [status, label]) => text.replace(new RegExp(`\\b${status}\\b`, 'g'), label),
    String(value || '')
  )
}

export function notificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[String(type || '').trim().toUpperCase()] || '赛事消息'
}

export function identityTypeLabel(type) {
  const normalized = String(type || '').trim().toUpperCase()
  return IDENTITY_TYPE_LABELS[normalized] || type || '账号'
}

export function resolveWorkflowActionUrl(actionUrl, withSeason) {
  if (!actionUrl) return ''
  return typeof withSeason === 'function' ? withSeason(actionUrl) : actionUrl
}

export const resolveNotificationActionUrl = resolveWorkflowActionUrl

export function findTaskDetail(taskView, taskId) {
  return [...taskView.openTasks, ...taskView.historyTasks].find(task => task.id === taskId) || null
}

export function isManualTaskCompletion(task, updated) {
  return Boolean(updated && updated.id === task.id && updated.status === 'COMPLETED'
    && (!task.userId || !updated.userId || updated.userId === task.userId)
    && (!task.seasonId || !updated.seasonId || updated.seasonId === task.seasonId))
}

const TASK_PRIORITY_WEIGHT = {
  LOW: 0,
  NORMAL: 1,
  IMPORTANT: 2,
  HIGH: 2,
  URGENT: 3
}

const TASK_ACTION_MODES = {
  WORKFLOW: {
    key: 'workflow',
    label: '进入流程处理',
    detail: '在对应业务流程完成操作后，任务会自动同步。'
  },
  MANUAL: {
    key: 'manual',
    label: '可直接确认',
    detail: '无需进入其他页面，确认后立即记为完成。'
  }
}

const TASK_CLOSURES = {
  COMPLETED: {
    key: 'completed',
    label: '已完成',
    detail: '该事项已经处理完成，记录保留用于追溯。'
  },
  CANCELLED: {
    key: 'cancelled',
    label: '流程已结束',
    detail: '来源流程已经撤销、更新或不再需要你处理。'
  },
  EXPIRED: {
    key: 'expired',
    label: '已过期',
    detail: '该事项已超过截止时间，只保留只读记录。'
  }
}

const PLAYER_TASK_FLOW = [
  {
    key: 'registration',
    order: '01',
    eyebrow: 'JOIN TEAM',
    title: '入队关系',
    description: '回应队伍邀请，或跟进自己提交的入队申请。',
    fallbackActionUrl: '/me?section=team'
  },
  {
    key: 'roster',
    order: '02',
    eyebrow: 'OFFICIAL ROSTER',
    title: '正式名单',
    description: '确认正式阵容、名单变更与转会关系。',
    fallbackActionUrl: '/me?section=team'
  },
  {
    key: 'schedule',
    order: '03',
    eyebrow: 'MATCH SCHEDULE',
    title: '赛程与比赛',
    description: '查看比赛安排；有权限时处理赛程协商。',
    fallbackActionUrl: '/me?section=matches#schedule-negotiation'
  }
]

function timestamp(value) {
  const time = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(time) ? time : null
}

export function getTaskDeadlineState(task, now = Date.now()) {
  if (String(task?.status || '').toUpperCase() !== 'OPEN') {
    return { key: 'history', label: '已结束', rank: -1, remainingMs: null }
  }

  const dueTime = timestamp(task?.dueAt)
  const priority = String(task?.priority || 'NORMAL').toUpperCase()
  if (dueTime === null) {
    const rank = priority === 'URGENT' ? 4 : priority === 'HIGH' || priority === 'IMPORTANT' ? 2 : 0
    return { key: rank >= 4 ? 'urgent' : 'open', label: '无截止时间', rank, remainingMs: null }
  }

  const remainingMs = dueTime - Number(now)
  if (remainingMs < 0) return { key: 'overdue', label: '已逾期', rank: 5, remainingMs }
  if (remainingMs <= 6 * 60 * 60_000) return { key: 'urgent', label: '6 小时内', rank: 4, remainingMs }
  if (remainingMs <= 24 * 60 * 60_000) return { key: 'today', label: '24 小时内', rank: 3, remainingMs }
  if (remainingMs <= 72 * 60 * 60_000) return { key: 'soon', label: '72 小时内', rank: 2, remainingMs }
  return { key: 'scheduled', label: '已排期', rank: priority === 'URGENT' ? 4 : 1, remainingMs }
}

export function sortOperationalTasks(tasks, now = Date.now()) {
  return [...(tasks || [])].sort((left, right) => {
    const leftState = getTaskDeadlineState(left, now)
    const rightState = getTaskDeadlineState(right, now)
    if (leftState.rank !== rightState.rank) return rightState.rank - leftState.rank

    const leftPriority = TASK_PRIORITY_WEIGHT[String(left?.priority || 'NORMAL').toUpperCase()] || 0
    const rightPriority = TASK_PRIORITY_WEIGHT[String(right?.priority || 'NORMAL').toUpperCase()] || 0
    if (leftPriority !== rightPriority) return rightPriority - leftPriority

    const leftDue = timestamp(left?.dueAt) ?? Number.MAX_SAFE_INTEGER
    const rightDue = timestamp(right?.dueAt) ?? Number.MAX_SAFE_INTEGER
    if (leftDue !== rightDue) return leftDue - rightDue

    return (timestamp(right?.createdAt) || 0) - (timestamp(left?.createdAt) || 0)
  })
}

export function sortTaskHistory(tasks) {
  return [...(tasks || [])].sort((left, right) => {
    const leftTime = timestamp(left?.completedAt || left?.updatedAt || left?.createdAt) || 0
    const rightTime = timestamp(right?.completedAt || right?.updatedAt || right?.createdAt) || 0
    return rightTime - leftTime
  })
}

export function summarizeTaskQueue(tasks, now = Date.now()) {
  const openTasks = (tasks || []).filter(task => String(task?.status || '').toUpperCase() === 'OPEN')
  return openTasks.reduce((summary, task) => {
    const deadline = getTaskDeadlineState(task, now)
    summary.open += 1
    if (['overdue', 'urgent'].includes(deadline.key)) summary.immediate += 1
    if (['today', 'soon'].includes(deadline.key)) summary.dueSoon += 1
    if (!task?.dueAt) summary.withoutDeadline += 1
    return summary
  }, { open: 0, immediate: 0, dueSoon: 0, withoutDeadline: 0 })
}

export function getTaskWorkflow(task) {
  const value = `${task?.taskType || ''} ${task?.sourceType || ''}`.toUpperCase()
  if (/WEEKLY_PREPARATION/.test(value)) return TASK_WORKFLOWS.PREPARATION
  if (/WEEKLY_RESULT/.test(value)) return TASK_WORKFLOWS.RESULT
  if (/(SCHEDULE|MATCH_TIME)/.test(value)) return TASK_WORKFLOWS.SCHEDULE
  if (/(ROSTER|TRANSFER|LINEUP)/.test(value)) return TASK_WORKFLOWS.ROSTER
  if (/(TEAM_APPLICATION|TEAM_INVITATION|TEAM_REGISTRATION|JOIN_APPLICATION)/.test(value)) return TASK_WORKFLOWS.REGISTRATION
  if (/(STAFF|REFEREE|CASTER|BROADCAST|AVAILABILITY)/.test(value)) return TASK_WORKFLOWS.STAFF
  if (/(ANNOUNCEMENT|APPEAL|ACKNOWLEDG)/.test(value)) return TASK_WORKFLOWS.COMMUNICATION
  if (/(IDENTITY|MANAGER_TRANSFER|COACH_RELATIONSHIP)/.test(value)) return TASK_WORKFLOWS.ACCOUNT
  return TASK_WORKFLOWS.GENERAL
}

export function getTaskActionMode(task) {
  if (String(task?.status || '').toUpperCase() !== 'OPEN') return null
  return task?.requiresSourceResolution === false ? TASK_ACTION_MODES.MANUAL : TASK_ACTION_MODES.WORKFLOW
}

export function getTaskClosure(task) {
  const status = String(task?.status || '').toUpperCase()
  return TASK_CLOSURES[status] || {
    key: 'closed',
    label: '已结束',
    detail: '该事项已经离开待处理队列，只保留只读记录。'
  }
}

export function getTaskActionUrl(task) {
  const actionUrl = String(task?.actionUrl || '')
  if (getTaskWorkflow(task).key !== 'schedule') return actionUrl

  const query = actionUrl.includes('?') ? actionUrl.split('?')[1].split('#')[0] : ''
  const actionSeasonId = new URLSearchParams(query).get('season')
  const seasonId = task?.seasonId || actionSeasonId
  const seasonQuery = seasonId ? `&season=${encodeURIComponent(seasonId)}` : ''
  return `/me?section=matches${seasonQuery}#schedule-negotiation`
}

export function buildPlayerTaskFlow(tasks = []) {
  return PLAYER_TASK_FLOW.map(stage => {
    const stageTasks = tasks.filter(task => getTaskWorkflow(task).key === stage.key)
    const nextTask = stageTasks[0] || null
    return {
      ...stage,
      state: nextTask ? 'action' : 'clear',
      stateLabel: nextTask ? `${stageTasks.length} 项待处理` : '当前无需操作',
      taskCount: stageTasks.length,
      nextTask,
      actionUrl: nextTask ? getTaskActionUrl(nextTask) : stage.fallbackActionUrl
    }
  })
}

function decorateTask(task, now) {
  return {
    ...task,
    deadline: getTaskDeadlineState(task, now),
    workflow: getTaskWorkflow(task),
    actionMode: getTaskActionMode(task),
    closure: getTaskClosure(task),
    resolvedActionUrl: getTaskActionUrl(task)
  }
}

export function buildTaskCenterView(tasks = [], { now = Date.now(), identityType = 'VIEWER' } = {}) {
  const nowTime = now instanceof Date ? now.getTime() : Number(now)
  const openTasks = sortOperationalTasks(
    tasks.filter(task => String(task?.status || '').toUpperCase() === 'OPEN'),
    nowTime
  ).map(task => decorateTask(task, nowTime))
  const historyTasks = sortTaskHistory(
    tasks.filter(task => String(task?.status || '').toUpperCase() !== 'OPEN')
  ).map(task => decorateTask(task, nowTime))
  const primaryTask = openTasks[0] || null
  const remainingTasks = openTasks.slice(1)
  const groups = [
    {
      key: 'immediate',
      eyebrow: 'DO NEXT',
      title: '随后优先处理',
      description: '已经逾期、6 小时内截止或被标记为紧急的事项。',
      tasks: remainingTasks.filter(task => ['overdue', 'urgent'].includes(task.deadline.key))
    },
    {
      key: 'upcoming',
      eyebrow: 'COMING UP',
      title: '近期需要回应',
      description: '24 至 72 小时内截止的赛事流程。',
      tasks: remainingTasks.filter(task => ['today', 'soon'].includes(task.deadline.key))
    },
    {
      key: 'routine',
      eyebrow: 'ON DECK',
      title: '普通待办',
      description: '已排期或没有固定截止时间，但仍需主动完成的事项。',
      tasks: remainingTasks.filter(task => !['overdue', 'urgent', 'today', 'soon'].includes(task.deadline.key))
    }
  ].filter(group => group.tasks.length)
  const queueSummary = summarizeTaskQueue(openTasks, nowTime)
  const activeIdentities = new Set(openTasks.map(task => String(task.identityType || '').toUpperCase()).filter(Boolean))
  const normalizedIdentity = String(identityType || 'VIEWER').toUpperCase()

  return {
    openTasks,
    historyTasks,
    primaryTask,
    groups,
    playerTaskFlow: buildPlayerTaskFlow(openTasks),
    queueSummary,
    emptyCopy: EMPTY_QUEUE_COPY[normalizedIdentity] || EMPTY_QUEUE_COPY.VIEWER,
    facts: [
      { label: '待处理', value: String(queueSummary.open), detail: '项' },
      { label: '立即处理', value: String(queueSummary.immediate), detail: '项' },
      { label: '近期截止', value: String(queueSummary.dueSoon), detail: '项' },
      { label: '涉及身份', value: String(activeIdentities.size), detail: '个' }
    ]
  }
}

export function mergeOperationalSummary(context, summary) {
  if (!context || !summary) return context
  return {
    ...context,
    overview: {
      ...(context.overview || {}),
      openTaskCount: Number(summary.openTasks) || 0,
      unreadNotificationCount: Number(summary.unreadNotifications) || 0
    }
  }
}
