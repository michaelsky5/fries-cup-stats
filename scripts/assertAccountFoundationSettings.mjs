import assert from 'node:assert/strict'
import {
  accountSettingsError, buildAccountProfilePatch, createAccountProfileForm,
  emailVerificationNotice, validateAccountPassword
} from '../src/features/account-security/accountFoundationSettings.js'
import { fetchAuthConfig } from '../src/features/auth/authService.js'
import {
  fetchAccountProfile, fetchAccountSessions, changeAccountPassword,
  revokeAccountSession, revokeOtherAccountSessions
} from '../src/features/account-security/accountSecurityApi.js'
import { platformRequest } from '../src/features/auth/platformApi.js'

const original = createAccountProfileForm({ displayName: '队长' }, { bio: 'Original bio', nickname: 'Captain', regionCode: 'CN' })
assert.deepEqual(buildAccountProfilePatch(original, original), {})
assert.deepEqual(buildAccountProfilePatch({ ...original, nickname: '  ', displayName: ' 新名字 ' }, original), { displayName: '新名字', nickname: null })
assert.equal(Object.hasOwn(buildAccountProfilePatch({ ...original, nickname: 'New' }, original), 'bio'), false, 'Unedited fields must not overwrite another profile edit')
assert.deepEqual(createAccountProfileForm({}, null), { displayName: '', nickname: '', bio: '', regionCode: '' })

const password = { currentPassword: 'old-password', newPassword: 'new-password', confirmation: 'new-password' }
assert.equal(validateAccountPassword(password), '')
assert.match(validateAccountPassword({ ...password, confirmation: 'different' }), /不一致/)
assert.match(validateAccountPassword({ ...password, newPassword: 'old-password' }), /不同/)
assert.match(validateAccountPassword({ ...password, newPassword: '短' }), /8 位/)
assert.match(validateAccountPassword({ ...password, newPassword: '中'.repeat(25) }), /72/)
assert.equal(validateAccountPassword({ ...password, newPassword: '中'.repeat(24), confirmation: '中'.repeat(24) }), '')

assert.equal(emailVerificationNotice({ status: 'SENT', result: { delivered: false } }).tone, 'error')
assert.equal(emailVerificationNotice({ status: 'UNDELIVERED' }).tone, 'error')
assert.match(emailVerificationNotice({ status: 'SENT', result: { delivered: true } }).text, /交给投递服务/)
assert.equal(emailVerificationNotice({ status: 'VERIFIED' }).tone, 'success')
assert.match(accountSettingsError({ data: { error: 'PASSWORD_INVALID' }, status: 403 }), /当前密码/)
assert.match(accountSettingsError({ status: 401 }), /登录已失效/)
assert.match(accountSettingsError({ data: { error: 'EMAIL_DELIVERY_UNAVAILABLE' }, status: 503 }), /邮件服务暂未开放/)

const previousFetch = globalThis.fetch
let responseBody = {}
let responseStatus = 200
let contentType = 'application/json'
const requests = []
globalThis.fetch = async (url, options) => {
  requests.push({ url, options })
  return new Response(contentType === 'application/json' ? JSON.stringify(responseBody) : responseBody, { status: responseStatus, headers: { 'Content-Type': contentType } })
}
try {
  responseBody = { selfRegistrationEnabled: false, emailVerificationEnabled: false }
  assert.deepEqual(await fetchAuthConfig(), responseBody)
  assert.equal(requests.at(-1).url, '/api/platform/auth/config')
  responseBody = { selfRegistrationEnabled: 'false', emailVerificationEnabled: true }
  await assert.rejects(fetchAuthConfig(), /配置/)

  responseBody = { user: { id: 'A' }, profile: null }
  assert.deepEqual(await fetchAccountProfile(), responseBody)
  responseBody = { profile: {} }
  await assert.rejects(fetchAccountProfile(), /响应不完整/)
  responseBody = { sessions: [{ id: 'current', current: true }, { id: 'other', current: false }] }
  const controller = new AbortController()
  assert.equal((await fetchAccountSessions({ signal: controller.signal })).length, 2)
  assert.equal(requests.at(-1).url, '/api/platform/me/sessions')
  assert.ok(requests.at(-1).options.signal instanceof AbortSignal)
  assert.equal(requests.at(-1).options.credentials, 'include')
  assert.equal(requests.at(-1).options.cache, 'no-store')

  responseBody = { revokedCount: 1, currentSessionRevoked: false }
  await revokeOtherAccountSessions()
  assert.equal(requests.at(-1).options.method, 'POST')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { includeCurrent: false })
  await revokeAccountSession('session/one')
  assert.equal(requests.at(-1).url, '/api/platform/me/sessions/session%2Fone')
  assert.equal(requests.at(-1).options.method, 'DELETE')

  responseBody = { changed: true, allSessionsRevoked: true, loginRequired: true }
  assert.equal((await changeAccountPassword('current-password', 'next-password')).allSessionsRevoked, true)
  assert.equal(requests.at(-1).options.method, 'PATCH')
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { currentPassword: 'current-password', newPassword: 'next-password' })
  responseStatus = 403
  responseBody = { error: 'PASSWORD_INVALID' }
  await assert.rejects(changeAccountPassword('invalid-password', 'next-password'), error => error.status === 403 && error.data.error === 'PASSWORD_INVALID')

  responseStatus = 200
  contentType = 'text/html'
  responseBody = '<!doctype html><html>SPA fallback</html>'
  await assert.rejects(platformRequest('/auth/me'), error => error.data?.error === 'INVALID_API_RESPONSE', 'A website fallback is not a successful account response')
} finally { globalThis.fetch = previousFetch }
console.log('Account settings checks passed: partial profile updates, password bounds, delivery states, session revocation and API contracts.')
