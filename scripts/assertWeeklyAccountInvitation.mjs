import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  getWeeklyInvitationWorkspaceHref,
  isPendingWeeklyInvitation,
  readWeeklyInvitationLocation,
  validateWeeklyInvitationPassword,
  weeklyInvitationErrorMessage
} from '../src/features/auth/weeklyInvitationModel.js'
import { acceptWeeklyAccountInvitation, previewWeeklyAccountInvitation } from '../src/features/auth/weeklyInvitationApi.js'

const token = 'synthetic-invitation-token-for-tests'
assert.deepEqual(readWeeklyInvitationLocation({ pathname: '/activate-weekly', hash: `#token=${token}`, search: '?season=FCR2026&token=old-token' }), {
  token, cleanPath: '/activate-weekly?season=FCR2026'
})
assert.equal(readWeeklyInvitationLocation({ search: `?token=${token}` }).token, token)
assert.equal(readWeeklyInvitationLocation({ hash: `#token=${token}&token=${token}` }).token, '')
assert.equal(readWeeklyInvitationLocation({ hash: '#token=short', search: `?token=${token}` }).token, '')
assert.equal(readWeeklyInvitationLocation({ hash: `#token=${'x'.repeat(501)}` }).token, '')
assert.equal(readWeeklyInvitationLocation().token, '')

const pending = { id: 'invitation', status: 'PENDING', passwordMode: 'SET', identityType: 'MANAGER', user: { id: 'account' }, team: { id: 'team', seasonId: 'FCW26' } }
assert.equal(isPendingWeeklyInvitation(pending), true)
for (const change of [{ status: 'ACCEPTED' }, { user: null }, { team: {} }, { passwordMode: 'UNKNOWN' }, { identityType: 'ADMIN' }]) {
  assert.equal(isPendingWeeklyInvitation({ ...pending, ...change }), false)
}
assert.match(validateWeeklyInvitationPassword({ password: 'short', passwordMode: 'SET' }), /至少/)
assert.match(validateWeeklyInvitationPassword({ password: 'test-pass', confirmation: 'not-same', passwordMode: 'SET' }), /不一致/)
assert.equal(validateWeeklyInvitationPassword({ password: 'test-pass', passwordMode: 'CONFIRM' }), '')
assert.equal(validateWeeklyInvitationPassword({ password: '中'.repeat(24), confirmation: '中'.repeat(24), passwordMode: 'SET' }), '')
assert.match(validateWeeklyInvitationPassword({ password: '中'.repeat(25), passwordMode: 'CONFIRM' }), /72/)
assert.match(weeklyInvitationErrorMessage({ data: { error: 'ACCOUNT_LINK_INVITATION_EXPIRED' } }), /过期/)
assert.match(weeklyInvitationErrorMessage({ data: { error: 'ACCOUNT_LINK_INVITATION_REVOKED' } }), /撤销/)
assert.match(weeklyInvitationErrorMessage({ data: { error: 'INVALID_PASSWORD' } }), /密码不正确/)
assert.match(weeklyInvitationErrorMessage({ status: 429 }), /频繁/)
assert.doesNotMatch(weeklyInvitationErrorMessage(new Error(token)), new RegExp(token))

const seasons = [{ id: 'FCR26', publicCode: 'FCR2026' }, { id: 'FCW26', publicCode: 'FCW2026' }]
assert.equal(getWeeklyInvitationWorkspaceHref({ seasonId: 'FCW26', seasons }), '/me?section=team&competition=FCW26&season=FCW2026')
assert.equal(getWeeklyInvitationWorkspaceHref({ seasonId: 'NOT-PUBLISHED', seasons }), '/me?section=team&competition=NOT-PUBLISHED')
assert.equal(getWeeklyInvitationWorkspaceHref({ seasonId: 'https://outside.test', seasons, development: true }), null)
assert.equal(getWeeklyInvitationWorkspaceHref({ seasonId: 'CODEXFLOWTEST', seasons, development: true }), '/me?section=team&competition=CODEXFLOWTEST')

const originalFetch = globalThis.fetch
const calls = []
try {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ invitation: pending, accepted: true }), { headers: { 'content-type': 'application/json' } })
  }
  const controller = new AbortController()
  assert.deepEqual(await previewWeeklyAccountInvitation(token, { signal: controller.signal }), pending)
  await acceptWeeklyAccountInvitation({ token, password: 'test-pass', role: 'ADMIN' })
  assert.equal(calls.length, 2)
  assert.ok(calls.every(call => call.options.method === 'POST' && call.options.credentials === 'include' && call.options.cache === 'no-store'))
  assert.ok(calls.every(call => !call.url.includes(token)))
  assert.ok(calls[0].options.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(calls[0].options.body), { token })
  assert.deepEqual(JSON.parse(calls[1].options.body), { token, password: 'test-pass' })
} finally {
  globalThis.fetch = originalFetch
}

const page = await readFile(new URL('../src/pages/auth/WeeklyAccountActivationPage.jsx', import.meta.url), 'utf8')
const router = await readFile(new URL('../src/app/router.jsx', import.meta.url), 'utf8')
assert.match(router, /path: '\/activate-weekly'/)
assert.ok(router.indexOf("path: '/activate-weekly'") < router.indexOf("path: '/'"))
assert.match(page, /window\.history\.replaceState/)
assert.match(page, /controller\.abort\(\)/)
assert.match(page, /useLocation\(\)/)
assert.match(page, /key=\{`\$\{location\.key\}:\$\{location\.search\}:\$\{location\.hash\}`\}/)
assert.match(page, /submitLock\.current/)
assert.match(page, /signedIn\?\.id !== invitation\.user\.id/)
assert.match(page, /不会转入其他赛季/)
assert.match(page, /aria-label=(?:"登录受邀账号"|\{uiText\("登录受邀账号", locale\)\})/)
assert.doesNotMatch(page, /localStorage|sessionStorage|console\.|navigate\('\/login'/)
console.log('Weekly account invitation checks passed: token privacy, explicit acceptance, password bounds, account match, API contract and safe season routing.')
