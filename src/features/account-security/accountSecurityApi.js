import { platformRequest } from '../auth/platformApi.js'
import { assertNewPassword } from '../auth/passwordPolicy.js'

export async function fetchAccountProfile(options = {}) {
  const data = await platformRequest('/me/profile', options)
  if (!data?.user?.id) throw new Error('账号资料响应不完整，请重新读取。')
  return { user: data.user, profile: data.profile || null }
}

export async function fetchAccountSessions(options = {}) {
  const data = await platformRequest('/me/sessions', options)
  if (!Array.isArray(data?.sessions)) throw new Error('登录设备响应不完整，请重新读取。')
  return data.sessions
}


export async function revokeAccountSession(sessionId) {
  return platformRequest(`/me/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
}

export async function revokeOtherAccountSessions() {
  return platformRequest('/me/sessions/revoke-all', {
    method: 'POST',
    body: { includeCurrent: false }
  })
}

export async function changeAccountPassword(currentPassword, newPassword) {
  assertNewPassword(newPassword)
  return platformRequest('/me/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword }
  })
}
