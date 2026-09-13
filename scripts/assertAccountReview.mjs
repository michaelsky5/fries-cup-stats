import assert from 'node:assert/strict'
import http from 'node:http'
import { resolvePastedInvitation } from '../src/features/my-space/accountInvitationEntry.js'
import { ACCOUNT_REVIEW_PAGES } from '../src/pages/dev/accountReviewCatalog.js'
import { createAccountReviewFixture } from './lib/accountReviewFixtureServer.mjs'

const token = 'valid-account-invitation-token'
const origin = 'http://127.0.0.3:3047'
assert.equal(resolvePastedInvitation(`/activate-weekly#token=${token}`, origin), `/activate-weekly#token=${token}`)
assert.equal(resolvePastedInvitation(`https://stats.fries-cup.com/activate-weekly?token=${token}&tracking=discard`, origin), `/activate-weekly#token=${token}`)
assert.equal(resolvePastedInvitation(`https://another-host.test/activate-weekly#token=${token}`, origin), `/activate-weekly#token=${token}`, 'Pasted hosts never become navigation destinations')
for (const invalid of ['javascript:alert(1)', `https://user:password@example.test/activate-weekly#token=${token}`, '/account#token=' + token, '/activate-weekly#token=short', `/activate-weekly#token=${token}&token=second-long-invitation-token`]) assert.equal(resolvePastedInvitation(invalid, origin), '')
assert.equal(new Set(ACCOUNT_REVIEW_PAGES.map(page => page.id)).size, ACCOUNT_REVIEW_PAGES.length)
assert(ACCOUNT_REVIEW_PAGES.every(page => page.href.startsWith('/') && !page.href.startsWith('//')))
assert(!ACCOUNT_REVIEW_PAGES.some(page => /prediction/.test(page.href)))

const fixtures = new Map([['captain', createAccountReviewFixture('preparing')], ['viewer', createAccountReviewFixture('viewer')], ['player', createAccountReviewFixture('player')], ['core', createAccountReviewFixture('core')], ['support', createAccountReviewFixture('support')]])
fixtures.set('verified', createAccountReviewFixture('email-verified'))
fixtures.set('device-failure', createAccountReviewFixture('devices-unavailable'))
fixtures.set('readonly', createAccountReviewFixture('profile-readonly'))
fixtures.set('settings', createAccountReviewFixture('preparing'))
const server = http.createServer((req, res) => fixtures.get(req.headers['x-review']).handle(req, res))
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}/api`
async function call(session, path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'x-review': session, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: response.status, data: await response.json() }
}
try {
  assert.equal((await call('captain', '/me/identities')).data.competitionSeasons.length, 1)
  assert.equal((await call('viewer', '/me/identities')).data.competitionSeasons.length, 0)
  await call('viewer', '/auth/logout', 'POST')
  assert.equal((await call('viewer', '/auth/me')).status, 401)
  assert.equal((await call('captain', '/auth/me')).status, 200, 'One preview must not change another preview identity')
  assert.equal((await call('player', '/me/weekly-competition?seasonId=FCR26')).data.accessMode, 'READ_ONLY')
  assert.equal((await call('core', '/me/weekly-competition?seasonId=FCR26')).data.cycles[0].status, 'REGISTRATION')
  const captainEntry = (await call('captain', '/me/weekly-competition?seasonId=FCR26')).data.cycles[0].entries[0]
  const members = captainEntry.players.map(player => ({ playerId: player.id, plannedStarter: false }))
  const rosterPath = `/me/weekly-participations/${captainEntry.weeks[0].participation.id}/roster`
  const saved = await call('captain', rosterPath, 'PUT', { members, status: 'DRAFT', revision: 1 })
  assert.deepEqual(saved.data.roster.members, members, 'Saving a preview roster must retain the member payload sent by the real page')
  const submitted = await call('captain', rosterPath, 'PUT', { members, status: 'SUBMITTED', revision: saved.data.roster.revision })
  assert.equal(submitted.data.roster.status, 'SUBMITTED')
  const reread = (await call('captain', '/me/weekly-competition?seasonId=FCR26')).data.cycles[0].entries[0].weeks[0].participation.rosters[0]
  assert.deepEqual(reread.members, members, 'Submitted members must survive a fresh workspace read')
  assert.equal(reread.status, 'SUBMITTED')
  assert.equal((await call('support', '/me/weekly-coordination?weekId=preview-week&teamId=preview-team-banana&matchId=preview-weekly-next')).data.requests.length, 2)
  assert.equal((await call('captain', '/unexpected-write', 'POST', { test: true })).status, 404)
  assert.equal((await call('verified', '/auth/me')).data.user.emailVerified, true)
  assert.equal((await call('device-failure', '/me/sessions')).status, 503)
  assert.equal((await call('device-failure', '/me/profile')).status, 200, 'A device failure must not block profile access')
  assert.equal((await call('readonly', '/me/profile', 'PATCH', { displayName: 'should not save' })).status, 403)
  await call('settings', '/me/profile', 'PATCH', { displayName: '资料回读', bio: '保存后核对' })
  assert.equal((await call('settings', '/me/profile')).data.user.displayName, '资料回读')
  assert.equal((await call('settings', '/me/profile')).data.profile.bio, '保存后核对')
  const deviceResult = await call('settings', '/me/sessions/revoke-all', 'POST', { includeCurrent: false })
  assert.equal(deviceResult.data.currentSessionRevoked, false)
  assert.deepEqual((await call('settings', '/me/sessions')).data.sessions.map(session => session.id), ['preview-current'])
  assert.equal((await call('settings', '/auth/me')).status, 200, 'Exiting other sessions must keep the current session signed in')
  await call('settings', '/me/sessions/preview-current', 'DELETE')
  assert.equal((await call('settings', '/auth/me')).status, 401, 'Exiting the current session must leave the account at the login gate')
  console.log(`Account review checks passed: invitation routing, ${ACCOUNT_REVIEW_PAGES.length} entries, isolated identities and fixture states.`)
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
