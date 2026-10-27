import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativeAccountClient } from '../src/account/nativeAccountClient.js'

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
function fixture(seed) {
  let clock = 1800000000000, code = 0
  const requests = [], stored = new Map(), queue = []
  if (seed) stored.set('fc:wechat-session:v1:https://admin.fries-cup.com/api/mini/v1', seed)
  const data = (id = 'existing-user', mode = 'VIEWER') => ({
    status: 'AUTHENTICATED', accessToken: 'synthetic.' + id + '.credential00000000000000', tokenType: 'Bearer',
    session: { id: 'session-' + id, expiresAt: new Date(clock + 600000).toISOString() },
    user: { id, displayName: '账号 ' + id, emailVerified: true, effectiveMode: mode }
  })
  const client = createNativeAccountClient({
    request(options) { requests.push(options); const next = queue.shift(); assert(next, options.url); return typeof next === 'function' ? next(options) : Promise.resolve(next) },
    login: () => Promise.resolve({ code: 'fresh-code-' + ++code }),
    storage: { get: key => stored.get(key), set: (key, value) => stored.set(key, value), remove: key => stored.delete(key) },
    now: () => clock, timeoutMs: 60
  })
  const response = (value, statusCode = 200, header = {}) => ({ data: value, statusCode, header })
  const enqueue = (value, status = 200, header) => queue.push(response(value, status, header))
  const authenticate = async (id, mode) => { enqueue(data(id, mode)); await client.beginLogin() }
  return { client, requests, stored, queue, data, enqueue, response, authenticate, advance: ms => { clock += ms }, ticket: () => ({ status: 'BINDING_REQUIRED', bindingTicket: 'short-lived-ticket-000000000000', expiresAt: new Date(clock + 300000).toISOString() }) }
}

test('web QR approval uses only the native Bearer and never the public scene as an account credential', async () => {
  const f = fixture(), id = 'Synthetic_0123456789AB'
  await f.authenticate('first')
  f.enqueue({ status: 'SCANNED' })
  await f.client.webLogin('scan', id)
  const request = f.requests.at(-1)
  assert.equal(request.url, 'https://admin.fries-cup.com/api/mini/v1/web-login/' + id + '/scan')
  assert.equal(request.method, 'POST')
  assert.equal(request.header.Authorization, 'Bearer ' + f.data('first').accessToken)
  assert.equal(Object.hasOwn(request.header, 'Cookie'), false)
  assert.deepEqual(request.data, {})
  const before = f.requests.length
  await assert.rejects(f.client.webLogin('confirm', '../other-account'), { code: 'INVALID_ROUTE' })
  assert.equal(f.requests.length, before)
})
test('an unbound phone may report its binding state or deny, but cannot confirm a web login', async () => {
  const f = fixture(), id = 'Synthetic_0123456789AB', ticket = f.ticket()
  f.enqueue(ticket); await f.client.beginLogin()
  f.enqueue({ status: 'BINDING' }); await f.client.webLogin('scan', id)
  assert.deepEqual(f.requests.at(-1).data, { bindingTicket: ticket.bindingTicket })
  assert.equal(Object.hasOwn(f.requests.at(-1).header, 'Authorization'), false)
  const before = f.requests.length
  await assert.rejects(f.client.webLogin('confirm', id), { code: 'UNAUTHORIZED' })
  assert.equal(f.requests.length, before)
})
test('an account switch invalidates an in-flight QR review without exposing the old review', async () => {
  const f = fixture(), id = 'Synthetic_0123456789AB', pending = deferred()
  await f.authenticate('first')
  f.queue.push(() => pending.promise)
  const reading = f.client.webLogin('scan', id)
  f.enqueue(null, 204); await f.client.logout()
  pending.resolve(f.response({ status: 'SCANNED', browser: 'old-account-review' }))
  await assert.rejects(reading, { code: 'STALE_REQUEST' })
  assert.equal(f.client.snapshot().user, null)
})

test('first binding uses a fresh WeChat code and persists only the completed scoped session', async () => {
  const f = fixture()
  f.enqueue(f.ticket())
  await f.client.beginLogin()
  assert.equal(f.stored.size, 0)
  assert.equal(f.client.snapshot().status, 'BINDING_REQUIRED')
  assert(!JSON.stringify(f.client.snapshot()).includes('ticket'))
  f.enqueue({ error: 'INVALID_CREDENTIALS' }, 401)
  await assert.rejects(f.client.bind('old@example.test', 'wrong-password'), { code: 'INVALID_CREDENTIALS' })
  assert.equal(f.client.snapshot().status, 'BINDING_REQUIRED')
  f.enqueue(f.data())
  await f.client.bind(' old@example.test ', 'current-password')
  assert.equal(f.client.snapshot().user.id, 'existing-user')
  const value = [...f.stored.values()][0]
  assert.equal(value.accessToken, f.data().accessToken)
  assert(!JSON.stringify(value).includes('password'))
  assert(!JSON.stringify(value).includes('ticket'))
  assert(f.requests.every(item => item.url.startsWith('https://admin.fries-cup.com/api/mini/v1/')))
  assert(f.requests.every(item => !item.url.includes('password') && !item.header.Cookie))
  f.enqueue(f.data())
  await f.client.beginLogin()
  assert.deepEqual(f.requests.filter(item => item.url.endsWith('/login')).map(item => item.data.code), ['fresh-code-1', 'fresh-code-2'])
})

test('a committed bind response cannot resurrect a session after logout', async () => {
  const f = fixture(), late = deferred()
  f.enqueue(f.ticket())
  await f.client.beginLogin()
  f.queue.push(() => late.promise)
  const pending = f.client.bind('old@example.test', 'password')
  await f.client.logout()
  late.resolve(f.response(f.data()))
  await assert.rejects(pending, { code: 'STALE_REQUEST' })
  assert.equal(f.client.snapshot().status, 'SIGNED_OUT')
  assert.equal(f.stored.size, 0)
})

test('network and 503 failures preserve the current session; only a current 401 clears it', async () => {
  const f = fixture()
  await f.authenticate()
  for (const [status, code] of [[503, 'AUTH_SERVICE_UNAVAILABLE'], [403, 'PERMISSION_DENIED']]) {
    f.enqueue({ error: code }, status)
    await assert.rejects(f.client.read('/participation', { force: true }), { status })
    assert.equal(f.client.snapshot().status, 'AUTHENTICATED')
  }
  f.queue.push(() => Promise.reject(new Error('secret-original-transport-message')))
  await assert.rejects(f.client.read('/participation'), error => error.code === 'CONNECTION_UNAVAILABLE' && !error.message.includes('secret'))
  assert.equal(f.stored.size, 1)
  f.enqueue({ error: 'UNAUTHORIZED' }, 401)
  await assert.rejects(f.client.read('/participation'), { status: 401 })
  assert.equal(f.client.snapshot().status, 'SIGNED_OUT')
  assert.equal(f.stored.size, 0)
})

test('late success and late 401 from an old account cannot overwrite or clear a new account', async () => {
  for (const status of [200, 401]) {
    const f = fixture(), late = deferred()
    await f.authenticate('one')
    f.queue.push(() => late.promise)
    const previous = f.client.read('/participation')
    await f.authenticate('two')
    late.resolve(f.response(status === 200 ? { teams: ['old-private-team'] } : { error: 'UNAUTHORIZED' }, status))
    await assert.rejects(previous, { code: 'STALE_REQUEST' })
    assert.equal(f.client.snapshot().user.id, 'two')
    assert.equal([...f.stored.values()][0].user.id, 'two')
  }
})

test('private data caches expire, separate seasons and modes, and never outlive a session', async () => {
  const f = fixture()
  await f.authenticate()
  f.enqueue({ teams: ['one'] })
  assert.deepEqual(await f.client.read('/participation', { season: 'S1' }), { teams: ['one'] })
  assert.deepEqual(await f.client.read('/participation', { season: 'S1' }), { teams: ['one'] })
  f.enqueue({ teams: ['two'] })
  assert.deepEqual(await f.client.read('/participation', { season: 'S2' }), { teams: ['two'] })
  f.advance(30001)
  f.enqueue({ teams: ['fresh'] })
  assert.deepEqual(await f.client.read('/participation', { season: 'S1' }), { teams: ['fresh'] })
  f.enqueue({ ...f.data().session, ...{ user: f.data('existing-user', 'PLAYER').user }, session: f.data().session })
  await f.client.restore()
  f.enqueue({ teams: ['player-only'] })
  assert.deepEqual(await f.client.read('/participation', { season: 'S1' }), { teams: ['player-only'] })
  f.advance(601000)
  await assert.rejects(f.client.read('/participation', { season: 'S1' }), { code: 'UNAUTHORIZED' })
})

test('pending native callbacks have a deadline and never expose raw failures', async () => {
  const f = fixture()
  f.queue.push(() => undefined)
  await assert.rejects(f.client.beginLogin(), { code: 'REQUEST_TIMEOUT' })
  assert.equal(f.client.snapshot().status, 'SIGNED_OUT')
})

test('expired binding proof and Retry-After give an explicit recovery without storing secrets', async () => {
  const f = fixture()
  f.enqueue(f.ticket())
  await f.client.beginLogin()
  f.enqueue({ error: 'RATE_LIMITED' }, 429, { 'Retry-After': '30' })
  await assert.rejects(f.client.bind('old@example.test', 'password'), { status: 429, retryAfterMs: 30000 })
  f.advance(300001)
  await assert.rejects(f.client.bind('old@example.test', 'password'), { code: 'BINDING_TICKET_INVALID' })
  assert.equal(f.stored.size, 0)
})

test('native private reads have an explicit route allowlist', async () => {
  const f = fixture()
  await f.authenticate()
  for (const path of ['/admin/users', '/me/../../users', '/me#private']) {
    await assert.rejects(f.client.read(path), { code: 'INVALID_ROUTE' })
  }
  assert.equal(f.requests.length, 1)
})

test('persisted identity stays hidden until its native session is verified again', async () => {
  const seed = fixture().data()
  const f = fixture(seed)
  assert.deepEqual(f.client.snapshot(), { status: 'RESTORING', user: null })
  f.enqueue({ user: seed.user, session: seed.session })
  await f.client.restore()
  assert.equal(f.client.snapshot().user.id, seed.user.id)
  const expired = fixture({ ...seed, session: { ...seed.session, expiresAt: '2020-01-01T00:00:00Z' } })
  assert.equal(expired.client.snapshot().status, 'SIGNED_OUT')
  assert.equal(expired.stored.size, 0)
})

test('weekly writes use explicit PUT routes and carry revisions without retrying an uncertain result', async () => {
  const f = fixture()
  await f.authenticate()
  f.enqueue({ participation: { revision: 2 } })
  const body = { entryId: 'entry-one', status: 'CONFIRMED', revision: 1 }
  assert.deepEqual(await f.client.write('/weekly/weeks/week-one/participation', body), { participation: { revision: 2 } })
  assert.equal(f.requests.at(-1).method, 'PUT')
  assert.deepEqual(f.requests.at(-1).data, body)
  f.queue.push(() => Promise.reject(new Error('synthetic disconnection after commit')))
  const count = f.requests.length
  await assert.rejects(f.client.write('/weekly/participations/participation-one/roster', { revision: 0 }), { code: 'CONNECTION_UNAVAILABLE', outcomeUnknown: true })
  assert.equal(f.requests.length, count + 1)
  assert.equal(f.client.snapshot().status, 'AUTHENTICATED')
  for (const route of ['/admin/users', '/weekly/weeks/../../users', '/weekly/weeks/w/participation?userId=x']) {
    await assert.rejects(f.client.write(route, {}), { code: 'INVALID_ROUTE' })
  }
})

test('a stale private write cannot invalidate or populate another account cache', async () => {
  const f = fixture(), late = deferred()
  await f.authenticate('one')
  f.queue.push(() => late.promise)
  const write = f.client.write('/weekly/weeks/week-one/participation', { revision: 0 })
  await f.authenticate('two')
  f.enqueue({ teams: ['new-owner'] })
  await f.client.read('/participation')
  late.resolve(f.response({ participation: { revision: 1 } }))
  await assert.rejects(write, { code: 'STALE_REQUEST' })
  assert.deepEqual(await f.client.read('/participation'), { teams: ['new-owner'] })
})
