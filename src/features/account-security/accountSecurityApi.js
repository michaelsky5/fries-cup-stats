import { platformRequest } from '../auth/platformApi.js'

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

export async function fetchAccountSecurity() {
  return platformRequest('/me/security')
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
  return platformRequest('/me/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword }
  })
}

export async function requestAccountEmailChange(newEmail, password) {
  return platformRequest('/me/email-change-requests', {
    method: 'POST',
    body: { newEmail, password }
  })
}

export async function requestAccountEmailAppeal(newEmail, password, reason) {
  return platformRequest('/me/email-appeals', {
    method: 'POST',
    body: { newEmail, password, reason }
  })
}

export async function deactivateAccount(password, confirmation, reason) {
  return platformRequest('/me/deactivate', {
    method: 'POST',
    body: { password, confirmation, reason: reason || null }
  })
}
