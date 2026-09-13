import { platformRequest } from './platformApi.js'

const TOKEN_STORAGE_KEY = 'FRIES_CUP_STATS_AUTH_TOKEN'
const USER_STORAGE_KEY = 'FRIES_CUP_STATS_AUTH_USER'

export async function fetchAuthConfig(options = {}) {
  const data = await platformRequest('/auth/config', options)
  if (typeof data?.selfRegistrationEnabled !== 'boolean' || typeof data?.emailVerificationEnabled !== 'boolean') {
    throw new Error('账号服务配置暂时不可用，请稍后重试。')
  }
  return { selfRegistrationEnabled: data.selfRegistrationEnabled, emailVerificationEnabled: data.emailVerificationEnabled }
}

export function clearStoredAuth() {
  // One-time migration only. The HttpOnly session cookie is managed by System;
  // neither a token nor a cached user is an authentication source in Stats.
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // Storage restrictions must not prevent cookie-based sign-in.
  }
}

export async function loginWithPassword({ email, password }) {
  const auth = await platformRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  })

  clearStoredAuth()
  return auth
}

export async function registerWithPassword({ email, password, username, displayName, regionCode, qqContact, discordContact }) {
  const auth = await platformRequest('/auth/register', {
    method: 'POST',
    body: { email, password, username, displayName, regionCode, qqContact, discordContact }
  })

  clearStoredAuth()
  return auth
}

export async function fetchCurrentUser(options = {}) {
  const data = await platformRequest('/auth/me', options)
  return data.user
}

export async function requestEmailVerification() {
  const data = await platformRequest('/auth/email-verifications', {
    method: 'POST'
  })
  return data?.emailVerification || null
}

export async function confirmEmailVerification(token) {
  return platformRequest('/auth/email-verifications/confirm', {
    method: 'POST',
    body: { token }
  })
}

export async function confirmEmailChange(token) {
  return platformRequest('/auth/email-change-confirmations', {
    method: 'POST',
    body: { token }
  })
}

export async function confirmEmailAppeal(token) {
  return platformRequest('/auth/email-appeals/confirm', {
    method: 'POST',
    body: { token }
  })
}

export async function requestPasswordReset(email) {
  return platformRequest('/auth/password-resets', {
    method: 'POST',
    body: { email }
  })
}

export async function confirmPasswordReset(token, newPassword) {
  return platformRequest('/auth/password-resets/confirm', {
    method: 'POST',
    body: { token, newPassword }
  })
}

export async function revokeCurrentSession() {
  return platformRequest('/auth/logout', { method: 'POST' })
}
