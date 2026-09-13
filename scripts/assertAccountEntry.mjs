import assert from 'node:assert/strict'
import http from 'node:http'
import { readPasswordResetLocation, isPasswordResetComplete, passwordRecoveryFailure } from '../src/features/auth/passwordRecoveryModel.js'
import { weeklyInvitationFailureKind, weeklyInvitationErrorMessage } from '../src/features/auth/weeklyInvitationModel.js'
import { createAccountReviewFixture } from './lib/accountReviewFixtureServer.mjs'

const token = 'account-review-password-reset-token'
assert.deepEqual(readPasswordResetLocation({ pathname: '/account', search: `?season=FCR2026&passwordResetToken=${token}&lang=en`, hash: '#security' }), { present: true, token, cleanPath: '/account?season=FCR2026&lang=en#security' })
assert.deepEqual(readPasswordResetLocation({ pathname: '/', search: '?lang=zh', hash: `#passwordResetToken=${token}` }), { present: true, token, cleanPath: '/?lang=zh' })
assert.equal(readPasswordResetLocation({ search: `?passwordResetToken=${token}&passwordResetToken=${token}` }).token, '', 'Ambiguous reset links must not pick a credential')
assert.equal(readPasswordResetLocation({ search: '?passwordResetToken=' }).present, true, 'Empty tokens still open a recovery result')
assert.equal(readPasswordResetLocation({ search: '?passwordResetToken=' }).token, '')
assert.equal(readPasswordResetLocation({ search: '?lang=en' }).present, false)
assert.equal(readPasswordResetLocation({ search: `?passwordResetToken=${'x'.repeat(501)}` }).token, '')
assert.equal(isPasswordResetComplete({ accepted: true }), false, 'Request acceptance is not password completion')
assert.equal(isPasswordResetComplete({ reset: true }), false)
assert.equal(isPasswordResetComplete({ reset: true, loginRequired: true }), true)
for (const code of ['PASSWORD_RESET_TOKEN_EXPIRED', 'PASSWORD_RESET_TOKEN_USED', 'PASSWORD_RESET_TOKEN_INVALID']) {
  const zh = passwordRecoveryFailure({ data: { error: code } })
  const en = passwordRecoveryFailure({ data: { error: code } }, 'en-US')
  assert.equal(zh.terminal, true)
  assert.equal(en.terminal, true)
  assert.notEqual(en.body, zh.body)
}
assert.equal(passwordRecoveryFailure({ status: 503, message: token }).terminal, false)
assert(!passwordRecoveryFailure({ status: 503, message: token }).body.includes(token))
assert.match(passwordRecoveryFailure({ status: 429 }, 'en-US').body, /Too many/)
for (const [code, kind] of [['ACCOUNT_LINK_INVITATION_EXPIRED','expired'], ['ACCOUNT_LINK_INVITATION_REVOKED','revoked'], ['ACCOUNT_LINK_INVITATION_ACCEPTED','used'], ['ACCOUNT_LINK_INVITATION_INVALID','unavailable']]) assert.equal(weeklyInvitationFailureKind({data:{error:code}}), kind)
assert.equal(weeklyInvitationFailureKind({status:503}), 'retry')
assert.equal(weeklyInvitationFailureKind(null, false), 'missing')
assert(!weeklyInvitationErrorMessage({message:token},'en-US').includes(token))

const fixtures = new Map(['activation', 'activation-existing', 'activation-expired', 'activation-used', 'activation-revoked', 'activation-unavailable', 'guest', 'recovery-unavailable'].map(id => [id, createAccountReviewFixture(id)]))
const server = http.createServer((req, res) => fixtures.get(req.headers['x-review']).handle(req, res))
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
async function call(scenario, path, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: body ? 'POST' : 'GET', headers: {'x-review':scenario, 'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {}) })
  return {status:response.status,data:await response.json()}
}
try {
  assert.equal((await call('activation-existing','/auth/weekly-account-links/preview',{token})).data.invitation.passwordMode,'CONFIRM')
  assert.equal((await call('activation-expired','/auth/weekly-account-links/preview',{token})).status,410)
  assert.equal((await call('activation-used','/auth/weekly-account-links/preview',{token})).data.error,'ACCOUNT_LINK_INVITATION_ACCEPTED')
  assert.equal((await call('activation-revoked','/auth/weekly-account-links/preview',{token})).data.error,'ACCOUNT_LINK_INVITATION_REVOKED')
  assert.equal((await call('activation-unavailable','/auth/weekly-account-links/preview',{token})).status,503)
  assert.equal((await call('activation-unavailable','/auth/weekly-account-links/preview',{token})).status,503, 'An unavailable fixture must remain reviewable through Strict Mode reads and retry')
  await call('activation','/auth/weekly-account-links/accept',{token,password:'preview-only-pass'})
  assert.equal((await call('activation','/auth/me')).status,401,'Claiming must not silently sign in')
  assert.equal((await call('activation','/auth/weekly-account-links/preview',{token})).data.error,'ACCOUNT_LINK_INVITATION_ACCEPTED')
  assert.equal((await call('recovery-unavailable','/auth/config')).data.emailVerificationEnabled,false)
  for (const email of ['you@example.test','unknown@example.test']) assert.deepEqual((await call('guest','/auth/password-resets',{email})),{status:202,data:{accepted:true}})
  assert.equal((await call('guest','/auth/password-resets/confirm',{token,newPassword:'短'})).status,400)
  await call('guest','/auth/login',{email:'you@example.test',password:'preview-only-pass'})
  const reset = await call('guest','/auth/password-resets/confirm',{token,newPassword:'preview-only-new-password'})
  assert.equal(isPasswordResetComplete(reset.data),true)
  assert.equal((await call('guest','/auth/me')).status,401)
  assert.equal((await call('guest','/auth/password-resets/confirm',{token,newPassword:'preview-only-new-password'})).data.error,'PASSWORD_RESET_TOKEN_USED')
  console.log('Account entry checks passed: token scrubbing, terminal/retry decisions, non-enumerating receipts, invitation session boundary and single-use reset fixture.')
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
