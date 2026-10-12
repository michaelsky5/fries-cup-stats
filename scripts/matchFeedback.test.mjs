import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMatchFeedbackPayload, getMatchFeedbackContext, isFeedbackOutcomeUnknown, isMatchingFeedback } from '../src/features/match-feedback/matchFeedbackModel.js'
import { createUserFeedback } from '../src/features/auth/userDataApi.js'
import { getMatchReviewMvpUnavailableReason } from '../src/lib/matchReviewSelectors.js'

const dossier = { internalId: 'FCW26-SWISS-R1-M12', displayCode: 'FCW26-C01-W04-REG-M05', title: 'SPS vs FF',
  match: { raw_match_id: 'FCW26-OTHER-6EFFE40D' }, mapRecords: [{ order: 3, name: '香巴里寺院' }] }
const form = { mapOrder: '3', issueType: 'PLAYER_STATS', description: '  第三图的治疗量有误，请核对战报。  ' }

test('feedback targets the System match and retains readable public match and map identities', () => {
  const payload = buildMatchFeedbackPayload(dossier, 'FCW26', form)
  assert.equal(payload.targetType, 'MATCH')
  assert.equal(payload.targetId, 'FCW26-OTHER-6EFFE40D')
  assert.match(payload.description, /^第三图的治疗量有误，请核对战报。\n\n/)
  assert.match(payload.description, /FCW26-C01-W04-REG-M05/)
  assert.match(payload.description, /地图：3 · 香巴里寺院/)
  assert.match(payload.description, /\/matches\/FCW26-SWISS-R1-M12\?season=FCW26&map=3/)
  assert.ok(payload.description.length <= 1000)
  assert.ok(!Object.hasOwn(payload, 'userId'))
  assert.deepEqual(buildMatchFeedbackPayload(dossier, 'fcw2026', form), payload)
})

test('whole-match and archive reports do not invent map or raw identities', () => {
  const payload = buildMatchFeedbackPayload({ ...dossier, match: {} }, 'FCR26', { ...form, mapOrder: '' })
  assert.equal(payload.targetId, dossier.internalId)
  assert.ok(!payload.description.includes('地图：'))
  assert.ok(!payload.description.includes('原始 ID：'))
  assert.match(payload.description, /season=FCR26$/)
})

test('feedback validates backend limits without truncating correction evidence', () => {
  const { maximumDescriptionLength } = getMatchFeedbackContext(dossier, 'FCW26', '3')
  assert.equal(buildMatchFeedbackPayload(dossier, 'FCW26', { ...form, description: '字'.repeat(maximumDescriptionLength) }).description.length, 1000)
  for (const invalid of [{ ...form, description: '错误' }, { ...form, description: '字'.repeat(maximumDescriptionLength + 1) },
    { ...form, mapOrder: '2' }, { ...form, issueType: 'unknown' }]) assert.throws(() => buildMatchFeedbackPayload(dossier, 'FCW26', invalid))
  assert.throws(() => buildMatchFeedbackPayload(dossier, '../private', form))
  assert.throws(() => buildMatchFeedbackPayload({ ...dossier, internalId: '' }, 'FCW26', form))
})

test('reconciliation requires the saved report to match every submitted field', () => {
  const payload = buildMatchFeedbackPayload(dossier, 'FCW26', form)
  const saved = { ...payload, id: 'report-id', status: 'OPEN' }
  assert.equal(isMatchingFeedback(saved, payload), true)
  assert.equal(isMatchingFeedback({ ...saved, targetId: 'other' }, payload), false)
  assert.equal(isMatchingFeedback({ ...saved, description: 'other' }, payload), false)
  assert.equal(isMatchingFeedback({ ...saved, id: '' }, payload), false)
  assert.equal(isMatchingFeedback(null, payload), false)
})

test('unknown write outcomes require a read check; rejected submissions remain retryable', () => {
  for (const error of [new TypeError('network lost'), { status: 503 }, { data: { outcomeUnknown: true } },
    { status: 502, data: { error: 'INVALID_API_RESPONSE' } }]) assert.equal(isFeedbackOutcomeUnknown(error), true)
  for (const status of [400, 401, 403, 429]) assert.equal(isFeedbackOutcomeUnknown({ status }), false)
})

test('feedback uses the existing cookie-authenticated API and trusts only its returned report', async () => {
  const fetchBefore = globalThis.fetch
  const payload = buildMatchFeedbackPayload(dossier, 'FCW26', form)
  const saved = { ...payload, id: 'mock-feedback', status: 'OPEN' }
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify({ feedback: saved }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    assert.deepEqual(await createUserFeedback(payload), saved)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].url, '/api/platform/me/feedback')
    assert.equal(requests[0].options.method, 'POST')
    assert.equal(requests[0].options.credentials, 'include')
    assert.deepEqual(JSON.parse(requests[0].options.body), payload)
  } finally { globalThis.fetch = fetchBefore }
})

test('MVP missing-state distinguishes complete unrated statistics, missing records, and appearance gates', () => {
  const complete = { state: { isComplete: true }, rating: { supported: false, ratingModelVersion: 'v1.5.0', entries: [] }, hasCompletePlayerStats: true }
  assert.equal(getMatchReviewMvpUnavailableReason(complete), 'REFERENCE_UNAVAILABLE')
  assert.equal(getMatchReviewMvpUnavailableReason({ ...complete, hasCompletePlayerStats: false }), 'STATS_UNAVAILABLE')
  assert.equal(getMatchReviewMvpUnavailableReason({ ...complete, rating: { supported: true } }), 'NO_ELIGIBLE_PLAYER')
  assert.equal(getMatchReviewMvpUnavailableReason({ ...complete, state: { isComplete: false } }), null)
  assert.equal(getMatchReviewMvpUnavailableReason({ ...complete, state: { isComplete: true, isForfeit: true } }), null)
})
