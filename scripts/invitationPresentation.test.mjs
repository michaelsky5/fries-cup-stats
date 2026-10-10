import assert from 'node:assert/strict'
import test from 'node:test'
import { coachInvitationPresentation, partitionCoachInvitations } from '../src/features/weekly-competition/coachInvitationPresentation.js'
import { scheduleProposalTiming } from '../src/features/schedule-negotiation/scheduleProposalTiming.js'

const expiresAt = '2026-10-09T08:00:00.500Z'
const acceptedAt = '2026-10-08T07:30:00.000Z'
const now = Date.parse('2026-10-10T08:00:00.000Z')

test('an accepted current coach link shows its confirmation, never the old deadline', () => {
  const view = coachInvitationPresentation({ status: 'ACCEPTED', isCurrentBinding: true, expiresAt, acceptedAt }, now)
  assert.equal(view.currentBinding, true)
  assert.equal(view.status, 'ACCEPTED')
  assert.equal(view.label, '已确认绑定')
  assert.equal(view.timingLabel, '绑定确认时间：')
  assert.equal(view.timestamp, acceptedAt)
})

test('accepted invitation history does not claim a current binding after removal or replacement', () => {
  for (const isCurrentBinding of [false, undefined]) {
    const view = coachInvitationPresentation({ status: 'ACCEPTED', isCurrentBinding, expiresAt, acceptedAt }, now)
    assert.equal(view.currentBinding, false)
    assert.equal(view.label, '邀请已接受')
    assert.equal(view.timingLabel, '邀请确认时间：')
    assert.equal(view.timestamp, acceptedAt)
  }
})

test('missing or invalid confirmation dates never fall back to the old expiry', () => {
  for (const date of [undefined, null, '', 'invalid']) {
    const view = coachInvitationPresentation({ status: 'ACCEPTED', isCurrentBinding: true, expiresAt, acceptedAt: date }, now)
    assert.equal(view.timestamp, null)
    assert.equal(view.currentBinding, true)
  }
})

test('pending invitations expire at the exact millisecond boundary', () => {
  const invitation = { status: 'PENDING', expiresAt: new Date(expiresAt) }
  assert.equal(coachInvitationPresentation(invitation, Date.parse(expiresAt) - 1).status, 'PENDING')
  assert.equal(coachInvitationPresentation(invitation, Date.parse(expiresAt)).status, 'EXPIRED')
  const expired = coachInvitationPresentation(invitation, now)
  assert.equal(expired.currentBinding, false)
  assert.equal(expired.label, '邀请已过期')
  assert.equal(expired.timingLabel, '邀请过期时间：')
})

test('revocation is displayed as an invitation event, not as a live deadline', () => {
  const view = coachInvitationPresentation({ status: 'REVOKED', expiresAt, revokedAt: acceptedAt }, now)
  assert.equal(view.timestamp, acceptedAt)
  assert.equal(view.currentBinding, false)
  assert.equal(view.timingLabel, '邀请撤销时间：')
})

test('a coach rebound to the same account only displays the latest confirmation as current', () => {
  const old = { id: 'old', target: { id: 'coach' }, status: 'ACCEPTED', isCurrentBinding: true, acceptedAt, expiresAt }
  const latest = { ...old, id: 'latest', acceptedAt: '2026-10-09T07:30:00.000Z' }
  const removed = { ...old, id: 'removed', target: { id: 'removed-coach' }, isCurrentBinding: false }
  const pending = { id: 'pending', target: { id: 'pending-coach' }, status: 'PENDING', expiresAt: '2026-10-17T08:00:00.000Z' }
  for (const records of [[old, latest, removed, pending], [latest, old, removed, pending]]) {
    const groups = partitionCoachInvitations(records, now)
    assert.deepEqual(groups.current.map(record => record.invitation.id), ['latest', 'pending'])
    assert.deepEqual(groups.history.map(record => record.invitation.id), ['old', 'removed'])
    assert(groups.history.every(record => !record.presentation.currentBinding && record.presentation.label === '邀请已接受'))
  }
})

test('a missing confirmation date stays unrecorded when selecting the latest binding', () => {
  const old = { id: 'old', target: { id: 'coach' }, status: 'ACCEPTED', isCurrentBinding: true, acceptedAt, expiresAt }
  const latest = { ...old, id: 'latest', acceptedAt: null, createdAt: '2026-10-09T07:30:00.000Z' }
  const groups = partitionCoachInvitations([old, latest], now)
  assert.equal(groups.current[0].invitation.id, 'latest')
  assert.equal(groups.current[0].presentation.timestamp, null)
  assert.equal(groups.current[0].presentation.currentBinding, true)
  assert.equal(groups.history[0].presentation.currentBinding, false)
})

test('confirmed schedules display their confirmation timestamp', () => {
  assert.deepEqual(scheduleProposalTiming({ status: 'CONFIRMED', expiresAt, confirmedAt: acceptedAt }), {
    label: '赛程确认时间：', timestamp: acceptedAt
  })
  assert.equal(scheduleProposalTiming({ status: 'CONFIRMED', expiresAt }).timestamp, null)
})

test('only an open negotiation displays a confirmation deadline', () => {
  assert.deepEqual(scheduleProposalTiming({ status: 'OPEN', expiresAt }), { label: '协商确认截止时间：', timestamp: expiresAt })
  for (const status of ['PENDING_ADMIN', 'AGREED', 'REJECTED', 'EXPIRED', 'SUPERSEDED']) {
    assert.deepEqual(scheduleProposalTiming({ status, expiresAt, createdAt: acceptedAt }), { label: '提案发起时间：', timestamp: acceptedAt })
  }
})
