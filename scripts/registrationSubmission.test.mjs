import assert from 'node:assert/strict'
import test from 'node:test'
import { registrationSubmissionState } from '../src/features/event-registration/registrationSubmissionModel.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'

const confirmed = count => Array.from({ length: count }, (_, index) => ({ id: `player-${index}`, status: 'CONFIRMED', confirmedAt: '2026-10-25T00:00:00Z', eligibility: { rulesAccepted: true, declaredAt: '2026-10-25T00:00:00Z', rulesVersion: 'WEEKLY_V3_0' } }))
const view = changes => registrationSubmissionState({ members: confirmed(5), rosterMin: 5, rosterMax: 7, pendingApplications: 0, eligibilityRequired: true, rulesVersion: 'WEEKLY_V3_0', ...changes })

test('one confirmed player remains at roster preparation and explains the missing four', () => {
  const state = view({ members: confirmed(1) })
  assert.equal(state.ready, false)
  assert.deepEqual(state.issues.map(issue => [issue.id, issue.values]), [['roster-short', [4, 5]]])
})

test('unconfirmed players and pending or returned requests remain separate actionable items', () => {
  const state = view({ members: [...confirmed(4), { status: 'INVITED' }], pendingApplications: 2 })
  assert.equal(state.ready, false)
  assert.deepEqual(state.issues.map(issue => [issue.id, issue.values]), [['consent', [1]], ['applications', [2]]])
})

test('unknown join status prevents premature submission and points to retry', () => {
  assert.equal(view({ pendingApplications: null }).ready, false)
  assert.equal(view({ pendingApplications: null }).issues[0].id, 'applications-loading')
  assert.equal(view({ pendingApplications: null, checkApplications: false }).ready, true)
})

test('full valid rosters become ready while overfull rosters remain blocked', () => {
  assert.equal(view({ members: confirmed(5) }).ready, true)
  assert.equal(view({ members: confirmed(7) }).ready, true)
  const state = view({ members: confirmed(8) })
  assert.equal(state.ready, false)
  assert.deepEqual(state.issues[0].values, [7, 1])
})

test('rules that changed after personal confirmation need a new personal declaration', () => {
  const members = confirmed(5)
  members[0].eligibility.rulesVersion = 'WEEKLY_V2_0'
  members[1].eligibility = null
  const state = view({ members })
  assert.equal(state.ready, false)
  assert.deepEqual(state.issues.map(issue => [issue.id, issue.values]), [['eligibility', [2]]])
})

test('all outstanding-item messages translate without losing counts', async () => {
  const messages = [
    ...view({ members: confirmed(1), pendingApplications: null }).issues,
    ...view({ members: [...confirmed(7), { status: 'INVITED' }], pendingApplications: 2 }).issues,
    ...view({ members: confirmed(5).map(member => ({ ...member, eligibility: null })) }).issues
  ]
  for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
    await ensureUiLocale(locale)
    for (const issue of messages) {
      const translated = translateUiText(issue.message, locale, issue.values)
      assert.notEqual(translated, translateUiText(issue.message, 'zh-CN', issue.values))
      if (locale !== 'zh-TW') assert.doesNotMatch(translated, /[\u4e00-\u9fff]/)
      for (const count of issue.values) assert.ok(translated.includes(String(count)))
    }
  }
})
