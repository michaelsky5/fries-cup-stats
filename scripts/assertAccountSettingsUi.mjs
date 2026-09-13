import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildAccountSettingsView, DEFAULT_NOTIFICATION_PREFERENCES } from '../src/features/account-security/accountSettingsModel.js'

const currentSession = { id: 'current', current: true }
const otherSession = { id: 'other', current: false }
const verifiedIdentity = { id: 'player', identityType: 'PLAYER', isVerified: true }

const reviewView = buildAccountSettingsView({
  security: {
    user: { emailVerified: true },
    sessions: [currentSession, otherSession],
    identityRequests: []
  },
  notificationSettings: { preference: { emailEnabled: false } },
  contactPrivacy: { grants: [{ id: 'grant' }], recentAccesses: [{ id: 'access' }] },
  identities: [verifiedIdentity]
})

assert.equal(reviewView.action.key, 'sessions')
assert.equal(reviewView.action.target, 'sessions')
assert.equal(reviewView.counts.sessions, 2)
assert.equal(reviewView.counts.otherSessions, 1)
assert.equal(reviewView.counts.activeIdentities, 1)
assert.equal(reviewView.counts.privacyGrants, 1)
assert.equal(reviewView.counts.recentAccesses, 1)
assert.equal(reviewView.notificationPreference.emailEnabled, false)
assert.equal(reviewView.notificationPreference.predictionInApp, DEFAULT_NOTIFICATION_PREFERENCES.predictionInApp)
assert.deepEqual(reviewView.readiness.map(item => item.value), ['已验证', '2 个', '已关闭', '1 项', '1 个'])

const verifyView = buildAccountSettingsView({ security: { user: { emailVerified: false }, sessions: [currentSession] } })
assert.equal(verifyView.action.key, 'verify-email')

const emailChangeView = buildAccountSettingsView({
  security: { user: { emailVerified: true }, sessions: [currentSession, otherSession], emailChangeRequest: { id: 'change' } }
})
assert.equal(emailChangeView.action.key, 'email-change')
assert.equal(emailChangeView.action.target, 'credentials')

const pendingIdentityView = buildAccountSettingsView({
  security: { user: { emailVerified: true }, sessions: [currentSession], identityRequests: [{ status: 'PENDING' }] }
})
assert.equal(pendingIdentityView.action.key, 'identity-pending')
assert.equal(pendingIdentityView.counts.pendingIdentityRequests, 1)

const readyView = buildAccountSettingsView({ security: { user: { emailVerified: true }, sessions: [currentSession] } })
assert.equal(readyView.action.key, 'ready')

const source = readFileSync(new URL('../src/features/account-security/AccountSecurityPanel.jsx', import.meta.url), 'utf8')
assert.equal(source.includes('NOTIFICATION DELIVERY'), true)
assert.equal(source.includes('核心赛事待办始终保留站内记录'), true)
assert.equal(source.includes('隐私授权与查看记录'), true)
assert.equal(source.includes('长期身份与申请记录'), true)
assert.equal(source.includes('deactivationForm.confirmation !== \'注销账号\''), true)

const css = readFileSync(new URL('../src/features/account-security/AccountSecurityPanel.module.css', import.meta.url), 'utf8')
assert.equal(css.includes('.primaryAction'), true)
assert.equal(css.includes('.settingsRail'), true)
assert.equal(css.includes('.preferenceRows'), true)
assert.equal(css.includes('scroll-margin-top: 225px'), true)

const mySpace = readFileSync(new URL('../src/pages/me/MySpacePage.jsx', import.meta.url), 'utf8')
assert.equal(mySpace.includes("params.get('section') === 'security'"), true)
assert.equal(mySpace.includes('return <Navigate replace to={`/account'), true)
assert.equal(mySpace.includes('<AccountSecurityPanel seasonId={seasonId} />'), false)

console.log('Account settings UI assertions passed.')
