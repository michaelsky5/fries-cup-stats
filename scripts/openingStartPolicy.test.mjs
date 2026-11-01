import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openingStartRequest, isOpeningStartRequestCurrent, openingStartReason, openingStartText, openingStartTime } from '../src/features/weekly-competition/openingStartPolicy.js'

const fixture = () => ({ opening: { access: { canBegin: true }, startConsent: { context: 'current-room', canBegin: true, bothConfirmed: false,
  sides: [{ teamId: 'a', context: 'current-a', canConfirm: true, rosterReady: true, presentCount: 5 }, { teamId: 'b', context: 'current-b', canConfirm: false, rosterReady: true, presentCount: 5 }] } } })

test('readiness and initiating the flow are distinct requests with different contexts', () => {
  const data = fixture(), own = data.opening.startConsent.sides[0]
  const ready = openingStartRequest(data, own), begin = openingStartRequest(data)
  assert.equal(ready.action, 'SET_START_READY')
  assert.equal(ready.extra.teamId, 'a')
  assert.equal(ready.extra.ready, true)
  assert.equal(ready.extra.startContext, 'current-a')
  assert.equal(begin.action, 'BEGIN')
  assert.equal(begin.extra.startContext, 'current-room')
  assert.equal(isOpeningStartRequestCurrent(data, ready), true)
  assert.equal(isOpeningStartRequestCurrent(data, begin), true)
})

test('refresh, a schedule or roster change, revoked rights and missing attendance block stale dialogs', () => {
  const data = fixture(), begin = openingStartRequest(data), ready = openingStartRequest(data, data.opening.startConsent.sides[0])
  data.opening.startConsent.context = 'changed'
  assert.equal(isOpeningStartRequestCurrent(data, begin), false)
  data.opening.startConsent.sides[0].context = 'changed-a'
  assert.equal(isOpeningStartRequestCurrent(data, ready), false)
  const next = openingStartRequest(data, data.opening.startConsent.sides[0])
  data.opening.startConsent.sides[0].rosterReady = false
  assert.equal(isOpeningStartRequestCurrent(data, next), false)
  data.opening.access.canBegin = false
  assert.equal(isOpeningStartRequestCurrent(data, openingStartRequest(data)), false)
})

test('an older server still gets a confirmation dialog without sending unknown fields', () => {
  const data = { opening: { access: { canBegin: true } } }
  const request = openingStartRequest(data)
  assert.deepEqual(request, { action: 'BEGIN', extra: {} })
  assert.equal(isOpeningStartRequestCurrent(data, request), true)
})

test('late arrival is presented as organizer handling rather than a map penalty or automatic loss', () => {
  assert.equal(openingStartReason({ reason: 'ARRIVAL_OVERDUE' }), 'overdue')
  assert.match(openingStartText('zh-CN', 'overdue'), /不会自动判负/)
  assert.equal(openingStartReason({ reason: 'ARRIVAL_PENDING' }), 'arrival')
  assert.equal(openingStartReason({ reason: 'CONFIRMATIONS_PENDING' }), 'before')
  assert.equal(openingStartReason({ canBegin: true, bothConfirmed: false }), 'unilateral')
  assert.equal(openingStartReason({ canBegin: true, bothConfirmed: true }), 'bothReady')
})

test('all supported locales explain the start and deadlines without missing substitutions', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) {
    for (const [key, args] of [['ready', []], ['readyBody', []], ['beginBody', [120]], ['before', ['21:05']], ['arrived', [5]], ['changed', []], ['overdue', []]]) {
      const copy = openingStartText(locale, key, args)
      assert.ok(copy.length > 0)
      assert.doesNotMatch(copy, /\{\d+\}|undefined/)
    }
    assert.match(openingStartTime('2026-11-01T13:05:00Z', locale), /21:05.*UTC\+8/)
  }
  assert.equal(openingStartTime(null, 'zh-CN'), '—')
})
