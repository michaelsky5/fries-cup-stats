// 小程序扫码登录（网页端）：票据和状态的校验、/auth/config 开关，以及请求路径。
import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAuthConfig } from '../src/features/auth/authService.js'
import { createWechatQrTicket, normalizeWechatQrStatus, normalizeWechatQrTicket, readWechatQrTicket } from '../src/features/auth/wechatQrLogin.js'

const NOW = Date.parse('2026-10-27T12:00:00Z')
const ticket = { ticketId: 'Tk_synthetic-0123456789AB', expiresAt: '2026-10-27T12:02:00Z', pollAfterMs: 1500 }

async function withFetch(respond, run) {
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    const { status = 200, json } = respond(url, options)
    return new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } })
  }
  try { return await run(requests) } finally { globalThis.fetch = previousFetch }
}

test('a ticket keeps only a safe id, a future expiry, a bounded poll interval and a WeChat URL Link', () => {
  const value = normalizeWechatQrTicket({ ...ticket, appLink: 'https://wxaurl.cn/synthetic' }, NOW)
  assert.equal(value.ticketId, ticket.ticketId)
  assert.equal(value.pollAfterMs, 1500)
  assert.equal(value.codeUrl, '/api/platform/auth/wechat-qr/Tk_synthetic-0123456789AB/code')
  assert.equal(value.appLink, 'https://wxaurl.cn/synthetic')
  assert.equal(normalizeWechatQrTicket({ ...ticket, pollAfterMs: 50, appLink: 'javascript:alert(1)' }, NOW).pollAfterMs, 2000)
  assert.equal(normalizeWechatQrTicket({ ...ticket, appLink: 'https://example.test/wxaurl.cn' }, NOW).appLink, '')
  assert.throws(() => normalizeWechatQrTicket({ ...ticket, ticketId: '../me' }, NOW))
  assert.throws(() => normalizeWechatQrTicket({ ...ticket, expiresAt: '2026-10-27T11:59:00Z' }, NOW))
})

test('statuses are a closed set and only CONFIRMED carries the user', () => {
  for (const status of ['PENDING', 'SCANNED', 'BINDING', 'DENIED', 'EXPIRED']) assert.deepEqual(normalizeWechatQrStatus({ status, user: { id: 'u' } }), { status, user: null })
  assert.deepEqual(normalizeWechatQrStatus({ status: 'CONFIRMED', user: { id: 'account-A' } }), { status: 'CONFIRMED', user: { id: 'account-A' } })
  assert.throws(() => normalizeWechatQrStatus({ status: 'LOGGED_IN' }))
})

test('the login dialog offers WeChat only when System enables it', async () => {
  const base = { selfRegistrationEnabled: false, emailVerificationEnabled: true }
  await withFetch(() => ({ json: { ...base, wechatQrLogin: { enabled: true } } }), async () => {
    assert.deepEqual((await fetchAuthConfig()).wechatQrLogin, { enabled: true })
  })
  for (const flag of [undefined, { enabled: false }, { enabled: 'true' }, true]) {
    await withFetch(() => ({ json: { ...base, wechatQrLogin: flag } }), async () => {
      assert.equal((await fetchAuthConfig()).wechatQrLogin, undefined)
    })
  }
})

test('ticket creation and polling use the platform proxy with cookies and no cache', async () => {
  const expiresAt = new Date(Date.now() + 120000).toISOString()
  await withFetch((url, options) => options.method === 'POST' ? { status: 201, json: { ...ticket, expiresAt } } : { json: { status: 'SCANNED' } }, async requests => {
    const created = await createWechatQrTicket()
    assert.equal(requests[0].url, '/api/platform/auth/wechat-qr')
    assert.equal(requests[0].options.method, 'POST')
    assert.equal(requests[0].options.credentials, 'include')
    assert.deepEqual(await readWechatQrTicket(created.ticketId), { status: 'SCANNED', user: null })
    assert.equal(requests[1].url, `/api/platform/auth/wechat-qr/${ticket.ticketId}`)
    assert.equal(requests[1].options.cache, 'no-store')
  })
})
