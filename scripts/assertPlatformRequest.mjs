import assert from 'node:assert/strict'
import { platformRequest, PlatformApiError } from '../src/features/auth/platformApi.js'
import { accountSettingsError } from '../src/features/account-security/accountFoundationSettings.js'

const originalFetch = globalThis.fetch
let requests = []
const pendingFetch = async (url, options) => {
  requests.push({ url, options })
  return new Promise(() => {})
}
const timeoutError = error => error instanceof PlatformApiError && error.data.error === 'REQUEST_TIMEOUT'
try {
  globalThis.fetch = pendingFetch
  await assert.rejects(platformRequest('/auth/me', { timeoutMs: 15 }), error => {
    assert.ok(timeoutError(error))
    assert.equal(error.data.outcomeUnknown, false)
    assert.match(accountSettingsError(error), /读取超时/)
    return true
  })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].options.signal.aborted, true)

  requests = []
  await assert.rejects(platformRequest('/me/weekly-confirmation', { method: 'PUT', body: { status: 'CONFIRMED' }, timeoutMs: 15 }), error => {
    assert.ok(timeoutError(error))
    assert.equal(error.data.outcomeUnknown, true)
    assert.equal(error.status, undefined, 'a write timeout is not proof of server rejection')
    assert.match(accountSettingsError(error), /提交结果尚未确认/)
    return true
  })
  assert.equal(requests.length, 1, 'uncertain writes must never be automatically retried')
  assert.equal(requests[0].options.credentials, 'include')
  assert.equal(requests[0].options.cache, 'no-store')

  globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: () => new Promise(() => {}) })
  await assert.rejects(platformRequest('/me/profile', { timeoutMs: 15 }), timeoutError, 'the response body shares the request deadline')

  requests = []
  globalThis.fetch = pendingFetch
  const controller = new AbortController()
  const reason = new DOMException('User changed account', 'AbortError')
  const request = platformRequest('/me/space-context', { signal: controller.signal })
  controller.abort(reason)
  await assert.rejects(request, error => error === reason)
  assert.equal(requests[0].options.signal.reason, reason, 'caller cancellation must reach fetch')
  await assert.rejects(platformRequest('/me/space-context', { signal: controller.signal }), error => error === reason)
  assert.equal(requests.length, 1, 'an already cancelled request must not be sent')

  let requestSignal
  const successfulController = new AbortController()
  globalThis.fetch = async (_, options) => {
    requestSignal = options.signal
    return new Response(JSON.stringify({ saved: true }), { headers: { 'content-type': 'application/json' } })
  }
  assert.deepEqual(await platformRequest('/me/profile', { signal: successfulController.signal, timeoutMs: 20 }), { saved: true })
  successfulController.abort()
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.equal(requestSignal.aborted, false, 'completed requests must release their deadline and caller listener')

  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'STALE_REVISION', message: 'Refresh before submitting' }), { status: 409, headers: { 'content-type': 'application/json' } })
  await assert.rejects(platformRequest('/me/weekly-confirmation', { method: 'PUT' }), error => error.status === 409 && error.data.error === 'STALE_REVISION')
  globalThis.fetch = async () => new Response('<html>Proxy fallback</html>', { headers: { 'content-type': 'text/html' } })
  await assert.rejects(platformRequest('/auth/me'), error => error.status === 502 && error.data.error === 'INVALID_API_RESPONSE')
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await platformRequest('/auth/logout', { method: 'POST' }), null)
  console.log('Platform request checks passed: bounded reads and bodies, uncertain writes without retries, cancellation, cleanup and error semantics.')
} finally {
  globalThis.fetch = originalFetch
}
