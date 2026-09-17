function normalizeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

export function formatAttentionCount(value) {
  const count = normalizeCount(value)
  return count > 99 ? '99+' : String(count)
}

export function buildAccountAttention(context, locale = 'zh-CN') {
  const openTaskCount = normalizeCount(context?.overview?.openTaskCount)
  const unreadNotificationCount = normalizeCount(context?.overview?.unreadNotificationCount)
  const isEnglish = locale === 'en-US'

  return {
    openTaskCount,
    unreadNotificationCount,
    visible: openTaskCount > 0 || unreadNotificationCount > 0,
    taskBadge: isEnglish ? `TASK ${formatAttentionCount(openTaskCount)}` : `待 ${formatAttentionCount(openTaskCount)}`,
    unreadBadge: isEnglish ? `NEW ${formatAttentionCount(unreadNotificationCount)}` : `未 ${formatAttentionCount(unreadNotificationCount)}`,
    ariaLabel: isEnglish
      ? `${openTaskCount} open tasks, ${unreadNotificationCount} unread messages`
      : `${openTaskCount} 项待办，${unreadNotificationCount} 条未读消息`
  }
}

