const PRIORITY_WEIGHT = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  IMPORTANT: 2,
  URGENT: 3
}

const MESSAGE_CATEGORIES = [
  {
    key: 'registration',
    eyebrow: 'JOIN & REGISTRATION',
    label: '入队与报名',
    description: '入队申请、队伍邀请和赛事报名结果。'
  },
  {
    key: 'roster',
    eyebrow: 'ROSTER & TRANSFER',
    label: '名单与转会',
    description: '候选阵容、正式名单和名单变更结果。'
  },
  {
    key: 'match',
    eyebrow: 'MATCH & SCHEDULE',
    label: '赛程与比赛',
    description: '比赛时间确认、变更和赛前提醒。'
  },
  {
    key: 'communication',
    eyebrow: 'RULING & NOTICE',
    label: '公告与裁定',
    description: '赛事公告、申诉受理和最终裁定。'
  },
  {
    key: 'identity',
    eyebrow: 'IDENTITY & STAFF',
    label: '身份与工作人员',
    description: '长期身份、队伍职务和赛事工作人员关系。'
  },
  {
    key: 'prediction',
    eyebrow: 'PREDICTION',
    label: '赛事竞猜',
    description: '竞猜结算、积分调整和撤销记录。'
  },
  {
    key: 'general',
    eyebrow: 'EVENT UPDATE',
    label: '其他赛事消息',
    description: '暂未归入固定流程的账号与赛事更新。'
  }
]

function timestamp(value) {
  const time = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(time) ? time : 0
}

export function getNotificationCategory(notification) {
  const value = `${notification?.notificationType || ''} ${notification?.sourceType || ''}`.toUpperCase()
  if (/(ROSTER|TRANSFER|LINEUP)/.test(value)) return MESSAGE_CATEGORIES[1]
  if (/(TEAM_APPLICATION|TEAM_INVITATION|TEAM_REGISTRATION|JOIN_APPLICATION)/.test(value)) return MESSAGE_CATEGORIES[0]
  if (/(MATCH_SCHEDULE|MATCH_REMINDER|MATCH_RESULT|MATCH_ROOM)/.test(value)) return MESSAGE_CATEGORIES[2]
  if (/(MATCH_APPEAL|ANNOUNCEMENT|RULING)/.test(value)) return MESSAGE_CATEGORIES[3]
  if (/(PREDICTION)/.test(value)) return MESSAGE_CATEGORIES[5]
  if (/(IDENTITY|MANAGER|COACH|STAFF|REFEREE|CASTER)/.test(value)) return MESSAGE_CATEGORIES[4]
  return MESSAGE_CATEGORIES[6]
}

export function sortAccountNotifications(notifications = []) {
  return [...notifications].sort((left, right) => {
    const leftUnread = left?.readAt ? 0 : 1
    const rightUnread = right?.readAt ? 0 : 1
    if (leftUnread !== rightUnread) return rightUnread - leftUnread

    const leftPriority = PRIORITY_WEIGHT[String(left?.priority || 'NORMAL').toUpperCase()] || 0
    const rightPriority = PRIORITY_WEIGHT[String(right?.priority || 'NORMAL').toUpperCase()] || 0
    if (leftPriority !== rightPriority) return rightPriority - leftPriority

    return timestamp(right?.visibleAt || right?.createdAt) - timestamp(left?.visibleAt || left?.createdAt)
  })
}

export function getNotificationActionUrl(notification) {
  const actionUrl = String(notification?.actionUrl || '')
  if (!actionUrl || getNotificationCategory(notification).key !== 'match') return actionUrl
  if (!/^\/me\?/.test(actionUrl) || !new URLSearchParams(actionUrl.split('?')[1]?.split('#')[0] || '').has('section')) return actionUrl

  const [pathAndQuery, hash = ''] = actionUrl.split('#')
  const [pathname, query = ''] = pathAndQuery.split('?')
  const params = new URLSearchParams(query)
  if (params.get('section') !== 'team') return actionUrl
  params.set('section', 'matches')
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`
}

function decorateNotification(notification) {
  return {
    ...notification,
    category: getNotificationCategory(notification),
    resolvedActionUrl: getNotificationActionUrl(notification),
    readState: notification?.readAt
      ? { key: 'read', label: '已读' }
      : { key: 'unread', label: '未读' }
  }
}

export function summarizeAccountNotifications(notifications = []) {
  return notifications.reduce((summary, notification) => {
    const priority = String(notification?.priority || 'NORMAL').toUpperCase()
    summary.total += 1
    if (!notification?.readAt) {
      summary.unread += 1
      if (['HIGH', 'IMPORTANT', 'URGENT'].includes(priority)) summary.importantUnread += 1
    }
    if (notification?.emailDelivery) summary.emailCopies += 1
    return summary
  }, { total: 0, unread: 0, importantUnread: 0, emailCopies: 0 })
}

export function buildCommunicationCenterView(notifications = []) {
  const sortedNotifications = sortAccountNotifications(notifications).map(decorateNotification)
  const primaryNotification = sortedNotifications[0] || null
  const remainingNotifications = sortedNotifications.slice(1)
  const summary = summarizeAccountNotifications(sortedNotifications)
  const groups = MESSAGE_CATEGORIES.map(category => ({
    ...category,
    notifications: remainingNotifications.filter(notification => notification.category.key === category.key)
  })).filter(group => group.notifications.length)

  return {
    notifications: sortedNotifications,
    primaryNotification,
    groups,
    summary,
    facts: [
      { label: '未读消息', value: String(summary.unread), detail: '条' },
      { label: '重要未读', value: String(summary.importantUnread), detail: '条' },
      { label: '邮件副本', value: String(summary.emailCopies), detail: '条' },
      { label: '全部记录', value: String(summary.total), detail: '条' }
    ]
  }
}
