import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clearStoredAuth, fetchCurrentUser, loginWithPassword, revokeCurrentSession } from '../src/features/auth/authService.js'
import { platformRequest } from '../src/features/auth/platformApi.js'
import { buildManagerWorkspaceStatus } from '../src/features/my-space/managerWorkspaceModel.js'
import { buildPlayerWorkspaceStatus } from '../src/features/my-space/playerWorkspaceModel.js'

const previousFetch = globalThis.fetch
const previousWindow = globalThis.window
const removed = []
const requests = []
let status = 200
globalThis.window = { localStorage: {
  removeItem: key => removed.push(key),
  getItem: () => assert.fail('cached identity/token must not be read'),
  setItem: () => assert.fail('session tokens must not be stored in JavaScript')
} }
globalThis.fetch = async (url, options) => {
  requests.push({ url, options })
  return new Response(JSON.stringify(status === 200 ? { user: { id: 'account-A', status: 'ACTIVE' }, session: { id: 'session-id' } } : { error: 'UNAVAILABLE' }), {
    status, headers: { 'content-type': 'application/json' }
  })
}
try {
  const auth = await loginWithPassword({ email: 'test@example.test', password: 'synthetic-only' })
  assert.equal(auth.user.id, 'account-A')
  assert.equal(auth.token, undefined, 'successful cookie login must not require a bearer token')
  assert.deepEqual(removed, ['FRIES_CUP_STATS_AUTH_TOKEN', 'FRIES_CUP_STATS_AUTH_USER'])
  assert.equal(requests[0].url, '/api/platform/auth/login')
  assert.equal(requests[0].options.credentials, 'include')
  assert.equal(requests[0].options.cache, 'no-store')
  assert.equal(requests[0].options.headers.Authorization, undefined)
  const controller = new AbortController()
  assert.equal((await fetchCurrentUser({ signal: controller.signal })).id, 'account-A')
  assert.equal(requests.at(-1).url, '/api/platform/auth/me')
  assert.ok(requests.at(-1).options.signal instanceof AbortSignal)
  const body = new FormData()
  body.set('test', 'value')
  await platformRequest('/test-upload', { method: 'POST', body })
  assert.equal(requests.at(-1).options.body, body)
  assert.equal(requests.at(-1).options.headers['Content-Type'], undefined)
  Object.defineProperty(globalThis.window, 'localStorage', { get: () => { throw new Error('Storage blocked') } })
  clearStoredAuth()
  assert.equal((await loginWithPassword({ email: 'test@example.test', password: 'synthetic-only' })).user.id, 'account-A')
  status = 503
  await assert.rejects(revokeCurrentSession(), error => error.status === 503, 'failed cookie logout must remain visible')
} finally {
  globalThis.fetch = previousFetch
  if (previousWindow === undefined) delete globalThis.window
  else globalThis.window = previousWindow
}

const source = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const provider = source('../src/features/auth/AuthProvider.jsx')
assert.doesNotMatch(provider, /authState\.token|auth\.token|persistAuth|setPlatformAccessToken/)
assert.match(provider, /isAuthenticated: Boolean\(authState\.user\?\.id\)/)
assert.match(provider, /fetchCurrentUser\(\{ signal \}\)/)
assert.match(provider, /new BroadcastChannel\('fries-cup:session'\)/)
assert.match(provider, /event\.data === 'SESSION_CHANGED'/)
assert.doesNotMatch(provider, /postMessage\((auth|user|authState)/)
assert.match(provider, /epoch !== sessionEpoch\.current/)
assert.match(provider, /requestId === accountRequest\.current/)
assert.match(provider, /currentUser\?\.id !== userId/)
assert.match(provider, /canReadVerificationRequests === true/)
assert.match(provider, /if \(error\?\.status !== 401\) throw error/)
assert.match(source('../src/features/auth/AuthDialog.jsx'), /navigate\(accountHref\)/)
assert.doesNotMatch(source('../src/features/auth/AuthDialog.jsx'), /<AccountCenter|<FoundationAccountCenter/)
assert.match(source('../src/features/favorites/useFavorites.js'), /canUseCloudFavorites === true/)
assert.match(source('../src/pages/me/MySpacePage.jsx'), /spaceContext\?\.user\?\.id === authUser\?\.id/)
assert.doesNotMatch(source('../src/pages/me/MySpacePage.jsx'), /open=\{active\}/)

const context = { competitionKind: 'WEEKLY', teamContexts: [{ kind: 'WEEKLY_MEMBERSHIP', roles: ['MANAGER', 'PLAYER'], seasonTeam: { id: 'A', shortName: 'A' }, matches: [{ id: 'match-1' }] }] }
const manager = buildManagerWorkspaceStatus(context)
assert.equal(manager.registrationLabel, '周赛队伍已关联')
assert.equal(manager.matchCount, 1)
assert.equal(manager.actionUrl, '/me?section=matches')
assert.equal(buildPlayerWorkspaceStatus(context).key, 'WEEKLY_MEMBERSHIP')
assert.equal(buildPlayerWorkspaceStatus(context).registrationLabel, '周赛队伍已关联')
console.log('Cookie-only login, bootstrap, storage migration, logout errors, identity refresh guards and weekly account context assertions passed.')
