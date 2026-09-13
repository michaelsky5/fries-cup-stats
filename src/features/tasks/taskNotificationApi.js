import { platformRequest } from '../auth/platformApi.js'

export async function fetchTaskCenter(seasonId, options = {}) {
  const season = encodeURIComponent(seasonId)
  const taskData = await platformRequest(`/me/tasks?seasonId=${season}&status=ALL`, options)
  if (!Array.isArray(taskData?.tasks)) throw new Error('任务列表尚未完整同步。')
  return {
    tasks: taskData?.tasks || []
  }
}

export async function fetchNotificationSummary(seasonId) {
  return platformRequest(`/me/notification-summary?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function completeManualTask(taskId) {
  const data = await platformRequest(`/me/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST'
  })
  return data?.task || null
}
