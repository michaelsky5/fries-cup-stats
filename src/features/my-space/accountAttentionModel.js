import { normalizeLocale } from '../../lib/locales.js'

const COPY = {
  'zh-CN': { task: '待', unread: '未', count: (tasks, unread) => `${tasks} 项待办，${unread} 条未读消息`, partial: (tasks, unread, state) => `至少 ${tasks} 项待办，其他待办${state === 'error' ? '同步失败' : '正在同步'}；${unread} 条未读消息`, unknown: (unread, state) => `待办${state === 'error' ? '同步失败，数量暂时未知' : '正在同步，数量尚未确认'}；${unread} 条未读消息` },
  'zh-TW': { task: '待', unread: '未', count: (tasks, unread) => `${tasks} 項待辦，${unread} 條未讀訊息`, partial: (tasks, unread, state) => `至少 ${tasks} 項待辦，其他待辦${state === 'error' ? '同步失敗' : '正在同步'}；${unread} 條未讀訊息`, unknown: (unread, state) => `待辦${state === 'error' ? '同步失敗，數量暫時未知' : '正在同步，數量尚未確認'}；${unread} 條未讀訊息` },
  'en-US': { task: 'TASK', unread: 'NEW', count: (tasks, unread) => `${tasks} open tasks, ${unread} unread messages`, partial: (tasks, unread, state) => `At least ${tasks} open tasks; other tasks ${state === 'error' ? 'failed to sync' : 'are syncing'}; ${unread} unread messages`, unknown: (unread, state) => `Tasks ${state === 'error' ? 'failed to sync; count unknown' : 'are syncing; count unconfirmed'}; ${unread} unread messages` },
  'ko-KR': { task: '할 일', unread: '새 메시지', count: (tasks, unread) => `할 일 ${tasks}개, 읽지 않은 메시지 ${unread}개`, partial: (tasks, unread, state) => `할 일 최소 ${tasks}개, 나머지 할 일 ${state === 'error' ? '동기화 실패' : '동기화 중'}; 읽지 않은 메시지 ${unread}개`, unknown: (unread, state) => `할 일 ${state === 'error' ? '동기화 실패, 개수 확인 불가' : '동기화 중, 개수 미확인'}; 읽지 않은 메시지 ${unread}개` }
}

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
  const copy = COPY[normalizeLocale(locale)] || COPY['zh-CN']
  const taskSyncStatus = ['loading', 'error'].includes(context?.overview?.taskSyncStatus) ? context.overview.taskSyncStatus : 'ready'
  const incomplete = taskSyncStatus !== 'ready'
  const count = formatAttentionCount(openTaskCount)
  const taskCountText = incomplete ? openTaskCount ? `${count}${openTaskCount > 99 ? '' : '+'}` : taskSyncStatus === 'error' ? '!' : '…' : count

  return {
    openTaskCount,
    unreadNotificationCount,
    taskSyncStatus,
    showTaskBadge: openTaskCount > 0 || incomplete,
    visible: openTaskCount > 0 || unreadNotificationCount > 0 || incomplete,
    taskBadge: `${copy.task} ${taskCountText}`,
    unreadBadge: `${copy.unread} ${formatAttentionCount(unreadNotificationCount)}`,
    ariaLabel: incomplete
      ? openTaskCount ? copy.partial(openTaskCount, unreadNotificationCount, taskSyncStatus) : copy.unknown(unreadNotificationCount, taskSyncStatus)
      : copy.count(openTaskCount, unreadNotificationCount)
  }
}

