import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeeklyPreparation, isWeeklyRecordBeforeEnrollment, resolveWeeklySelection } from '../src/features/weekly-competition/weeklyPreparationModel.js'
import { buildWeeklyRoomJourney, weeklyResponseAccess, weeklyRoomStatus } from '../src/features/weekly-competition/weeklyMatchRoomModel.js'
import { buildAccountActivity } from '../src/features/account-ui/accountActivityModel.js'
import { buildParticipationJourneys } from '../src/features/account-ui/participationJourneyModel.js'
import { taskHistoryDestination } from '../src/features/tasks/taskNotificationModel.js'

const now = Date.parse('2026-10-11T13:22:00Z')
const options = { seasonId: 'FCW26', userId: 'player', readOnly: false, now }
function lateEnrollment() {
  const team = { id: 'ff', shortName: 'FF' }
  const entry = { id: 'entry', team, seasonTeamId: team.id, joinedAt: '2026-10-06T09:23:14Z', status: 'ACTIVE', accessMode: 'READ_ONLY', weeks: [1, 2, 3, 4].map((weekNumber, index) => ({
    week: { id: `week-${weekNumber}`, weekNumber, status: 'PUBLISHED', confirmationDeadlineAt: `2026-${index === 0 ? '09-18' : index === 1 ? '09-25' : index === 2 ? '10-02' : '10-08'}T15:59:59Z`,
      matchWindowStartsAt: ['2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10'][index] + 'T00:00:00Z',
      matchWindowEndsAt: ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'][index] + 'T15:59:59Z' },
    participation: index === 3 ? { id: 'saved', persisted: true, status: 'CONFIRMED', rosters: [{ status: 'LOCKED', members: [] }] }
      : { id: null, persisted: false, status: 'PENDING', rosters: [] }
  })) }
  return { userId: options.userId, season: { id: options.seasonId, status: 'ACTIVE' }, accessMode: 'READ_ONLY', teams: [{ team, role: 'PLAYER', accessMode: 'READ_ONLY' }], cycles: [{ id: 'cycle', name: '第一周期', status: 'ACTIVE', rules: { rosterContinuityMode: 'PREVIOUS_APPEARANCE' }, entries: [entry] }] }
}
function representativeRoom() {
  return { id: 'match', revision: 4, status: 'COMPLETE', ready: true, confirmationState: 'PENDING', responseDueAt: '2026-10-11T04:58:00Z',
    teamAId: 'sps', teamBId: 'ff', teamA: { id: 'sps', shortName: 'SPS' }, teamB: { id: 'ff', shortName: 'FF' }, scoreA: 1, scoreB: 2,
    cycle: { status: 'ACTIVE' }, week: { status: 'PUBLISHED' }, myTeams: [{ team: { id: 'ff', shortName: 'FF' }, role: 'PLAYER', accessMode: 'READ_ONLY',
      isRepresentative: true, responseAccessMode: 'WRITE', canRespond: true, confirmation: { status: 'CONFIRMED', isCurrent: true, revision: 4 } }],
    otherTeamResponses: [{ confirmingTeam: { id: 'sps' }, status: 'PENDING' }] }
}
const roomWorkspace = room => ({ season: { id: 'FCW26', status: 'ACTIVE' }, accessMode: 'WRITE', featureAccess: 'WRITE', rooms: [room] })

test('late enrollment excludes synthetic weeks 1–3 and selects the current week despite PUBLISHED history', () => {
  const workspace = lateEnrollment()
  const prepared = buildWeeklyPreparation(workspace, options)
  assert.deepEqual(prepared.plans.map(plan => plan.week.id), ['week-4'])
  assert.equal(prepared.tasks.length, 0)
  assert.equal(prepared.plans.some(plan => plan.summary === '需要管理员协助'), false)
  assert.equal(resolveWeeklySelection(workspace, {}, now).weekRecord.week.id, 'week-4')
  assert.equal(resolveWeeklySelection(workspace, { weekId: 'week-1' }, now).weekRecord.week.id, 'week-1', 'explicit historical links remain exact')
  assert.equal(resolveWeeklySelection(workspace, { weekId: 'missing' }, now).invalid, true)
})
test('enrollment filtering retains persisted history and does not guess from absent or invalid dates', () => {
  const entry = lateEnrollment().cycles[0].entries[0]
  const record = entry.weeks[0]
  assert.equal(isWeeklyRecordBeforeEnrollment(entry, record), true)
  assert.equal(isWeeklyRecordBeforeEnrollment(entry, { ...record, participation: { ...record.participation, id: 'saved' } }), false)
  assert.equal(isWeeklyRecordBeforeEnrollment({ ...entry, joinedAt: 'invalid' }, record), false)
  assert.equal(isWeeklyRecordBeforeEnrollment(entry, { ...record, week: { ...record.week, matchWindowEndsAt: null } }), false)
  assert.equal(isWeeklyRecordBeforeEnrollment({ ...entry, joinedAt: record.week.matchWindowEndsAt }, record), false)
})
test('a team enrolled earlier still defaults to this week rather than an old PUBLISHED week', () => {
  const workspace = lateEnrollment()
  workspace.cycles[0].entries[0].joinedAt = '2026-09-01T00:00:00Z'
  assert.equal(resolveWeeklySelection(workspace, {}, now).weekRecord.week.id, 'week-4')
  assert.equal(resolveWeeklySelection(workspace, {}, Date.parse('2026-10-12T00:00:00Z')).weekRecord.week.id, 'week-4', 'latest history wins once all match windows end')
})
test('match representative authority is separate from roster management and fails closed on withdrawal', () => {
  const room = representativeRoom()
  const team = room.myTeams[0]
  assert.equal(weeklyResponseAccess(room, team, { readOnly: false }).allowed, true)
  assert.equal(team.accessMode, 'READ_ONLY')
  for (const change of [{ isRepresentative: false }, { responseAccessMode: 'READ_ONLY' }, { canRespond: false }, { confirmation: { ...team.confirmation, revision: 3 } }]) {
    assert.equal(weeklyResponseAccess(room, { ...team, ...change }, { readOnly: false }).allowed, false)
  }
  assert.equal(weeklyResponseAccess(room, team, { readOnly: true }).allowed, false)
})
test('expired response window names the administrator across match status and participation progress', () => {
  const room = representativeRoom()
  assert.match(weeklyRoomStatus(room, { now }).label, /本队已确认.*管理员复核/)
  assert.match(weeklyRoomStatus(room, { now }).detail, /沉默不视为同意/)
  const journey = buildWeeklyRoomJourney(room, { now })
  assert.equal(journey.stages[2].state, 'blocked')
  const progress = buildParticipationJourneys([], roomWorkspace(room), options)[0]
  assert.equal(progress.category, 'blocked')
  assert.match(progress.owner, /管理员/)
  assert.match(weeklyRoomStatus(room, { now: Date.parse(room.responseDueAt) - 1 }).label, /等待对手/)
  assert.match(weeklyRoomStatus(room, { now: Date.parse(room.responseDueAt) }).label, /管理员复核/)
  assert.equal(buildWeeklyRoomJourney({ ...room, confirmationState: 'FINALIZED' }, { now }).responseOverdue, false)
  assert.equal(buildWeeklyRoomJourney({ ...room, confirmationState: 'CONFIRMED' }, { now }).responseOverdue, false)
})
test('a pending representative response is one task when its delivery notice is also present', () => {
  const room = representativeRoom()
  room.myTeams[0].confirmation.status = 'PENDING'
  const activity = buildAccountActivity({ rooms: { status: 'ready', data: roomWorkspace(room) }, tasks: { status: 'ready', data: { tasks: [{ id: 'delivery', status: 'OPEN', sourceType: 'WEEKLY_RESULT', sourceId: room.id }] } } }, { ...options, roomsReadOnly: false })
  assert.equal(activity.taskView.openTasks.length, 1)
  assert.equal(activity.taskView.openTasks[0].identityType, 'PLAYER')
  assert.equal(activity.taskView.openTasks[0].resultContext.revision, 4)
  assert.match(activity.taskView.openTasks[0].body, /响应已超时/)
  assert.equal(buildParticipationJourneys([], roomWorkspace(room), options)[0].category, 'action', 'late response remains possible while administrator review is required')
})
test('history links identify the exact notification and never provide a completion action', () => {
  const url = new URL(taskHistoryDestination({ id: 'revision 1 / delivery', status: 'COMPLETED' }), 'https://local.test')
  assert.equal(url.searchParams.get('task'), 'revision 1 / delivery')
  assert.equal(url.searchParams.get('view'), 'history')
  assert.equal(taskHistoryDestination({ id: 'open', status: 'OPEN' }), '')
})
