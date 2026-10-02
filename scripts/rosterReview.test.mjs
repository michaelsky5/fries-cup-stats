import assert from 'node:assert/strict'
import { test } from 'node:test'
import { currentRosterReview, rosterReviewPresentation } from '../src/features/weekly-competition/rosterReviewPresentation.js'
import { buildWeeklyPreparation } from '../src/features/weekly-competition/weeklyPreparationModel.js'
const roster = { status: 'SUBMITTED', revision: 2, review: { rosterRevision: 2, status: 'PASSED', issues: [] } }
test('missing roster remains a safe empty state', () => {
  assert.equal(currentRosterReview(undefined), null)
  assert.equal(rosterReviewPresentation(undefined, { automatic: true }).title, '提交后自动检查')
})
test('passed checks remain editable until deadline; no administrator wait is invented', () => {
  const state = rosterReviewPresentation(roster, { automatic: true })
  assert.equal(state.title, '自动检查通过')
  assert.match(state.detail, /截止/)
  assert.equal(state.detail.includes('等待管理员'), false)
})
test('dirty or stale versions never display the old passing conclusion', () => {
  assert.equal(rosterReviewPresentation(roster, { dirty: true }).status, 'DRAFT')
  assert.equal(currentRosterReview({ ...roster, revision: 3 }), null)
  assert.equal(rosterReviewPresentation({ ...roster, revision: 3 }, { automatic: true }).title, '等待自动检查')
})
test('manual approvals suppress cleared review issues but never blocking issues', () => {
  const review = { rosterRevision: 2, status: 'PASSED', clearance: { codes: ['LEGACY', 'DUPLICATE'] },
    issues: [{ code: 'LEGACY', severity: 'REVIEW' }, { code: 'DUPLICATE', severity: 'BLOCKER' }] }
  const state = rosterReviewPresentation({ ...roster, review })
  assert.equal(state.title, '人工复核通过')
  assert.deepEqual(state.issues.map(item => item.code), ['DUPLICATE'])
})
test('automatic and administrator locks show their actual source', () => {
  assert.equal(rosterReviewPresentation({ ...roster, status: 'LOCKED', review: { ...roster.review, lockMethod: 'AUTOMATIC' } }).title, '已自动锁定')
  assert.equal(rosterReviewPresentation({ ...roster, status: 'LOCKED' }).title, '管理员已锁定')
})
test('review failure creates a team correction task, while passing or manual review does not', () => {
  const players = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` }))
  const record = { ...roster, members: players.map(player => ({ playerId: player.id })) }
  const week = { id: 'w', weekNumber: 1, status: 'CONFIRMATION_OPEN', confirmationDeadlineAt: '2099-01-01T00:00:00Z' }
  const entry = { id: 'e', status: 'ACTIVE', accessMode: 'WRITE', seasonTeamId: 't', team: { id: 't' }, players,
    weeks: [{ week, participation: { status: 'CONFIRMED', rosters: [record] } }] }
  const workspace = { userId: 'u', season: { id: 's', status: 'ACTIVE' }, accessMode: 'WRITE', teams: [{ team: { id: 't' }, role: 'MANAGER', accessMode: 'WRITE' }],
    cycles: [{ id: 'c', status: 'ACTIVE', rules: { automaticRosterReview: true }, entries: [entry] }] }
  const options = { seasonId: 's', userId: 'u', readOnly: false, now: Date.now() }
  assert.equal(buildWeeklyPreparation(workspace, options).tasks.length, 0)
  record.review.status = 'MANUAL_REVIEW'
  assert.equal(buildWeeklyPreparation(workspace, options).tasks.length, 0)
  record.review.status = 'NEEDS_CHANGES'
  const prepared = buildWeeklyPreparation(workspace, options)
  assert.equal(prepared.tasks.length, 1)
  assert.equal(prepared.tasks[0].taskType, 'WEEKLY_PREPARATION_LINEUP')
})
