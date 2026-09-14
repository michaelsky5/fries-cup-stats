import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildCommunicationCenterView,
  getNotificationActionUrl,
  getNotificationCategory,
  sortAccountNotifications,
  summarizeAccountNotifications
} from '../src/features/communications/communicationCenterModel.js'
import { getPendingAcknowledgementAnnouncements } from '../src/features/communications/mandatoryAnnouncementModel.js'
import { buildAccountAttention, formatAttentionCount } from '../src/features/my-space/accountAttentionModel.js'

assert.equal(getNotificationCategory({ notificationType: 'TEAM_APPLICATION_RESULT' }).key, 'registration')
assert.equal(getNotificationCategory({ notificationType: 'EVENT_ROSTER_LOCKED_PLAYER' }).key, 'roster')
assert.equal(getNotificationCategory({ notificationType: 'MATCH_SCHEDULE_CONFIRMED' }).key, 'match')
assert.equal(getNotificationCategory({ notificationType: 'MATCH_APPEAL_DECISION' }).key, 'communication')
assert.equal(getNotificationCategory({ notificationType: 'LONG_TERM_IDENTITY_RESTORED' }).key, 'identity')
assert.equal(getNotificationCategory({ notificationType: 'PREDICTION_SETTLED' }).key, 'prediction')

assert.equal(
  getNotificationActionUrl({ notificationType: 'MATCH_SCHEDULE_CONFIRMED', actionUrl: '/me?section=team&season=FCR26' }),
  '/me?section=matches&season=FCR26'
)
assert.equal(
  getNotificationActionUrl({ notificationType: 'EVENT_ROSTER_LOCKED_PLAYER', actionUrl: '/me?section=team&season=FCR26' }),
  '/me?section=team&season=FCR26'
)

const notifications = [
  { id: 'read-urgent', readAt: '2026-07-19T08:00:00Z', priority: 'URGENT', visibleAt: '2026-07-19T08:00:00Z', notificationType: 'MATCH_REMINDER' },
  { id: 'unread-normal', readAt: null, priority: 'NORMAL', visibleAt: '2026-07-19T09:00:00Z', notificationType: 'PREDICTION_SETTLED' },
  { id: 'unread-important', readAt: null, priority: 'IMPORTANT', visibleAt: '2026-07-19T07:00:00Z', notificationType: 'EVENT_ROSTER_LOCKED_PLAYER', emailDelivery: { status: 'SENT' } },
  { id: 'unread-important-new', readAt: null, priority: 'IMPORTANT', visibleAt: '2026-07-19T10:00:00Z', notificationType: 'TEAM_APPLICATION_RESULT' }
]

assert.deepEqual(sortAccountNotifications(notifications).map(item => item.id), [
  'unread-important-new', 'unread-important', 'unread-normal', 'read-urgent'
])
assert.deepEqual(summarizeAccountNotifications(notifications), {
  total: 4,
  unread: 3,
  importantUnread: 2,
  emailCopies: 1
})

const view = buildCommunicationCenterView(notifications)
assert.equal(view.primaryNotification.id, 'unread-important-new')
assert.equal(view.primaryNotification.category.label, '入队与报名')
assert.deepEqual(view.groups.map(group => group.key), ['roster', 'match', 'prediction'])
assert.deepEqual(view.facts.map(fact => fact.value), ['3', '2', '1', '4'])
assert.equal(view.groups.flatMap(group => group.notifications).some(item => item.id === view.primaryNotification.id), false)

const acknowledgementQueue = getPendingAcknowledgementAnnouncements([
  { id: 'urgent-without-ack', severity: 'URGENT', requiresAcknowledgement: false, publishedAt: '2026-07-21T10:00:00Z', receipt: {} },
  { id: 'acknowledged', severity: 'URGENT', requiresAcknowledgement: true, publishedAt: '2026-07-21T09:00:00Z', receipt: { acknowledgedAt: '2026-07-21T09:30:00Z' } },
  { id: 'important-due-first', severity: 'IMPORTANT', requiresAcknowledgement: true, dueAt: '2026-07-21T11:00:00Z', receipt: {} },
  { id: 'urgent-due-later', severity: 'URGENT', requiresAcknowledgement: true, dueAt: '2026-07-21T12:00:00Z', receipt: {} },
  { id: 'normal-without-deadline', severity: 'NORMAL', requiresAcknowledgement: true, publishedAt: '2026-07-21T13:00:00Z', receipt: {} }
])
assert.deepEqual(acknowledgementQueue.map(item => item.id), [
  'important-due-first', 'urgent-due-later', 'normal-without-deadline'
])

assert.equal(formatAttentionCount(120), '99+')
assert.deepEqual(buildAccountAttention({
  overview: { openTaskCount: 3.8, unreadNotificationCount: 120 }
}), {
  openTaskCount: 3,
  unreadNotificationCount: 120,
  visible: true,
  taskBadge: '待 3',
  unreadBadge: '未 99+',
  ariaLabel: '3 项待办，120 条未读消息'
})
assert.equal(buildAccountAttention(null).visible, false)
assert.equal(buildAccountAttention({ overview: { openTaskCount: 2 } }, 'en-US').ariaLabel, '2 open tasks, 0 unread messages')

const source = readFileSync(new URL('../src/features/communications/AccountCommunicationsCenter.jsx', import.meta.url), 'utf8')
const gateSource = readFileSync(new URL('../src/features/communications/UrgentAnnouncementGate.jsx', import.meta.url), 'utf8')
const layoutSource = readFileSync(new URL('../src/layouts/DataLayout.jsx', import.meta.url), 'utf8')
assert.equal(source.includes('流程消息'), true)
assert.equal(source.includes('这里记录结果与变化'), true)
assert.equal(source.includes('需要回应时进入任务中心'), true)
assert.equal(source.includes('buildCommunicationCenterView'), true)
assert.equal(gateSource.includes('getPendingAcknowledgementAnnouncements'), true)
assert.equal(gateSource.includes("globalThis.addEventListener('focus'"), true)
assert.equal(gateSource.includes("document.addEventListener('visibilitychange'"), true)
assert.equal(gateSource.includes('暂时无法核验赛事公告'), true)
const headerSource = readFileSync(new URL('../src/components/layout/PublicHeader.jsx', import.meta.url), 'utf8')
assert.equal(headerSource.includes('<AccountAttentionBadge attention={accountAttention} />'), true)
assert.equal(layoutSource.includes('accountAttention={accountAttention}'), true)
assert.equal(layoutSource.includes('fetchMySpaceContext(seasonId)'), true)
assert.match(layoutSource, /<UrgentAnnouncementGate\s+seasonId=\{seasonId\}/)

console.log('Communication center UI assertions passed.')
