import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildPlayerTaskFlow,
  buildTaskCenterView,
  getTaskActionMode,
  getTaskActionUrl,
  getTaskClosure,
  getTaskDeadlineState,
  getTaskWorkflow,
  identityTypeLabel,
  localizeWorkflowText,
  mergeOperationalSummary,
  notificationTypeLabel,
  resolveWorkflowActionUrl,
  sortOperationalTasks,
  sortTaskHistory,
  summarizeTaskQueue
} from '../src/features/tasks/taskNotificationModel.js'

assert.equal(localizeWorkflowText('BANANA 的申请状态：ACCEPTED。'), 'BANANA 的申请状态：已接受。')
assert.equal(localizeWorkflowText('ROSTER LOCKED / APPLICATION REJECTED'), 'ROSTER 已锁定 / APPLICATION 未通过')
assert.equal(localizeWorkflowText('SENT'), '已发送')
assert.equal(notificationTypeLabel('team_application_result'), '入队申请')
assert.equal(notificationTypeLabel('event_roster_not_selected'), '名单结果')
assert.equal(identityTypeLabel('manager'), '经理')
assert.equal(
  resolveWorkflowActionUrl('/me?section=team&season=FCR26', path => path.replace('season=FCR26', 'season=FCR2026')),
  '/me?section=team&season=FCR2026'
)

const now = Date.UTC(2026, 6, 19, 8, 0, 0)
const queue = [
  { id: 'low', status: 'OPEN', priority: 'LOW', createdAt: '2026-07-18T08:00:00Z' },
  { id: 'soon', status: 'OPEN', priority: 'HIGH', dueAt: '2026-07-21T08:00:00Z' },
  { id: 'urgent', status: 'OPEN', priority: 'URGENT', createdAt: '2026-07-19T07:00:00Z' },
  { id: 'overdue', status: 'OPEN', priority: 'NORMAL', dueAt: '2026-07-19T07:00:00Z' }
]
assert.deepEqual(sortOperationalTasks(queue, now).map(task => task.id), ['overdue', 'urgent', 'soon', 'low'])
assert.equal(getTaskDeadlineState(queue[0], now).key, 'open')
assert.equal(getTaskDeadlineState(queue[1], now).key, 'soon')
assert.equal(getTaskDeadlineState(queue[3], now).key, 'overdue')
assert.deepEqual(summarizeTaskQueue(queue, now), { open: 4, immediate: 2, dueSoon: 1, withoutDeadline: 2 })
assert.equal(getTaskWorkflow({ taskType: 'SCHEDULE_CONFIRMATION' }).key, 'schedule')
assert.equal(getTaskWorkflow({ taskType: 'ROSTER_CHANGE_PLAYER_CONFIRM' }).key, 'roster')
assert.equal(getTaskActionMode({ status: 'OPEN', requiresSourceResolution: true }).key, 'workflow')
assert.equal(getTaskActionMode({ status: 'OPEN', requiresSourceResolution: false }).key, 'manual')
assert.equal(getTaskClosure({ status: 'CANCELLED' }).label, '流程已结束')
assert.equal(getTaskClosure({ status: 'EXPIRED' }).detail.includes('只读记录'), true)
assert.equal(
  getTaskActionUrl({ taskType: 'SCHEDULE_CONFIRMATION', actionUrl: '/me?section=team&season=FCR26' }),
  '/me?section=matches&season=FCR26#schedule-negotiation'
)

const taskCenterView = buildTaskCenterView(queue.map(task => ({
  ...task,
  identityType: 'PLAYER',
  taskType: task.id === 'soon' ? 'SCHEDULE_CONFIRMATION' : 'TEAM_INVITATION_RESPONSE',
  sourceType: 'TEST',
  actionUrl: '/me?section=team&season=FCR26',
  requiresSourceResolution: task.id !== 'low'
})), { now, identityType: 'PLAYER' })
assert.equal(taskCenterView.primaryTask.id, 'overdue')
assert.equal(taskCenterView.primaryTask.deadline.key, 'overdue')
assert.deepEqual(taskCenterView.groups.map(group => group.key), ['immediate', 'upcoming', 'routine'])
assert.equal(taskCenterView.groups[0].tasks[0].id, 'urgent')
assert.equal(taskCenterView.facts[0].value, '4')
assert.equal(taskCenterView.facts[3].value, '1')
assert.equal(taskCenterView.openTasks.find(task => task.id === 'soon').resolvedActionUrl, '/me?section=matches&season=FCR26#schedule-negotiation')
assert.equal(taskCenterView.openTasks.find(task => task.id === 'low').actionMode.key, 'manual')
assert.deepEqual(taskCenterView.playerTaskFlow.map(stage => stage.taskCount), [3, 0, 1])
assert.equal(taskCenterView.playerTaskFlow[1].stateLabel, '当前无需操作')
assert.equal(buildTaskCenterView([], { identityType: 'PLAYER' }).emptyCopy.headline, '当前没有需要你确认的选手事项')

const playerFlow = buildPlayerTaskFlow([
  { status: 'OPEN', taskType: 'ROSTER_CHANGE_PLAYER_CONFIRM', actionUrl: '/me?section=team' }
])
assert.equal(playerFlow[1].state, 'action')
assert.equal(playerFlow[1].taskCount, 1)

const history = sortTaskHistory([
  { id: 'old', status: 'COMPLETED', completedAt: '2026-07-17T08:00:00Z' },
  { id: 'new', status: 'CANCELLED', updatedAt: '2026-07-18T08:00:00Z' }
])
assert.deepEqual(history.map(task => task.id), ['new', 'old'])

const context = mergeOperationalSummary({ overview: { tasks: [{ id: 'task-1' }], openTaskCount: 0 } }, {
  openTasks: 3,
  unreadNotifications: 2
})
assert.equal(context.overview.openTaskCount, 3)
assert.equal(context.overview.unreadNotificationCount, 2)
assert.equal(context.overview.tasks.length, 1)

const taskCenterSource = readFileSync(new URL('../src/features/tasks/TaskNotificationCenter.jsx', import.meta.url), 'utf8')
const communicationCenterSource = readFileSync(new URL('../src/features/communications/AccountCommunicationsCenter.jsx', import.meta.url), 'utf8')
assert.equal(taskCenterSource.includes('站内通知'), false)
assert.equal(taskCenterSource.includes('任务中心'), true)
assert.equal(taskCenterSource.includes('处理记录'), true)
assert.equal(taskCenterSource.includes('选手赛事流程'), true)
assert.equal(taskCenterSource.includes('这里需要你操作'), true)
assert.equal(taskCenterSource.includes('只需知道的内容在赛事消息'), true)
assert.equal(communicationCenterSource.includes('账号消息'), true)

console.log('Task and notification UI assertions passed.')

const { findTaskDetail, isManualTaskCompletion } = await import('../src/features/tasks/taskNotificationModel.js')
assert.equal(findTaskDetail(taskCenterView, 'low').id, 'low', 'an explicit manual task remains selected even when another task has higher priority')
assert.equal(findTaskDetail(taskCenterView, 'not-this-account'), null)
const manualTask = { id: 'manual', userId: 'member-a', seasonId: 'weekly-a' }
for (const updated of [null, { ...manualTask, status: 'OPEN' }, { ...manualTask, status: 'CANCELLED' }, { ...manualTask, id: 'another', status: 'COMPLETED' }, { ...manualTask, userId: 'member-b', status: 'COMPLETED' }, { ...manualTask, seasonId: 'weekly-b', status: 'COMPLETED' }]) assert.equal(isManualTaskCompletion(manualTask, updated), false)
assert.equal(isManualTaskCompletion(manualTask, { ...manualTask, status: 'COMPLETED' }), true)
const closedTaskView = buildTaskCenterView([{ ...manualTask, status: 'COMPLETED' }])
assert.equal(findTaskDetail(closedTaskView, 'manual').closure.key, 'completed', 'the same detail URL shows the completed receipt after reloading')
