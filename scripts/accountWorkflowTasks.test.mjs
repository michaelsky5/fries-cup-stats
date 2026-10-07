import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildWeeklyPreparation, getWeeklyEnrollmentCycles } from '../src/features/weekly-competition/weeklyPreparationModel.js'
import { buildAccountActivity, getAccountActivityAccess } from '../src/features/account-ui/accountActivityModel.js'
import { fetchAccountAttentionContext } from '../src/features/my-space/accountAttentionApi.js'
import { getTaskWorkflow, identityTypeLabel } from '../src/features/tasks/taskNotificationModel.js'

const seasonId = 'FCW26', userId = 'manager'
function workspace() {
  const team = { id: 'team-a', name: 'Alpha' }
  return { userId, season: { id: seasonId, status: 'ACTIVE' }, accessMode: 'WRITE',
    teams: [{ team, role: 'MANAGER', accessMode: 'WRITE' }],
    cycles: [{ id: 'cycle-a', name: 'October', status: 'REGISTRATION', enrollmentOpen: true, eligibleTeams: [team], entries: [] }] }
}
test('an eligible team receives one cycle enrollment task before an entry exists', () => {
  const data = workspace()
  const result = buildWeeklyPreparation(data, { seasonId, userId, readOnly: false })
  assert.equal(result.plans.length, 0)
  assert.equal(result.tasks.length, 1)
  assert.equal(getTaskWorkflow(result.tasks[0]).key, 'preparation')
  assert.match(result.tasks[0].actionUrl, /cycle=cycle-a&team=team-a#weekly-enrollment$/)
  data.cycles[0].entries = [{ id: 'entry', seasonTeamId: 'team-a', status: 'ACTIVE', accessMode: 'WRITE', weeks: [] }]
  assert.equal(buildWeeklyPreparation(data, { seasonId, userId, readOnly: false }).tasks.some(row => row.taskType === 'WEEKLY_CYCLE_ENROLLMENT'), false)
})
test('closed, archived, read-only and player access never prompt enrollment', () => {
  for (const change of [data => { data.season.status = 'ARCHIVED' }, data => { data.cycles[0].enrollmentOpen = false },
    data => { data.cycles[0].status = 'CLOSED' }, data => { data.teams[0].role = 'PLAYER' }, data => { data.accessMode = 'READ_ONLY' },
    data => { data.teams[0].accessMode = 'READ_ONLY' }]) {
    const data = workspace(); change(data)
    assert.equal(buildWeeklyPreparation(data, { seasonId, userId, readOnly: false }).tasks.length, 0)
  }
  assert.equal(buildWeeklyPreparation(workspace(), { seasonId, userId }).tasks.length, 0)
  assert.equal(buildWeeklyPreparation(workspace(), { seasonId, userId: 'other', readOnly: false }).tasks.length, 0)
})
test('registration tasks load with communications hidden, including standard competitions', async () => {
  const task = { id: 'join', userId, seasonId, status: 'OPEN', sourceType: 'JOIN_APPLICATION_REVIEW', sourceId: 'application', title: 'Review' }
  const calls = []
  const data = { launch: { seasonId, allowed: true, features: { teamOperations: 'WRITE' } },
    context: { seasonId, user: { id: userId }, competitionKind: 'STANDARD', identities: [] }, tasks: { tasks: [task] } }
  const loaders = Object.fromEntries(Object.keys(data).map(name => [name, async () => { calls.push(name); return data[name] }]))
  const result = await fetchAccountAttentionContext(seasonId, userId, { loaders })
  assert.equal(result.overview.openTaskCount, 1)
  assert.deepEqual(calls, ['launch', 'context', 'tasks'])
  assert.equal(getAccountActivityAccess(data.context, data.launch).genericTasks, true)
})
test('administrator tasks are visible without participant identities or communication access', () => {
  assert.equal(getAccountActivityAccess({ sections: { tasks: true } }, { features: {} }).genericTasks, true)
  assert.equal(identityTypeLabel('ADMIN'), '赛事管理员')
  for (const type of ['TEAM_ADDITION_REVIEW', 'PARTICIPATION_INVITATION', 'PARTICIPATION_ACKNOWLEDGEMENT']) assert.equal(getTaskWorkflow({ sourceType: type }).key, 'registration')
})
test('limited pre-approval access loads only personal tasks without enabling participation workflows', async () => {
  const calls = []
  const data = { launch: { seasonId, allowed: false, taskCenterAllowed: true, features: { teamOperations: 'WRITE', weeklyCompetition: 'WRITE', matchRoom: 'WRITE' } },
    context: { seasonId, user: { id: userId }, competitionKind: 'WEEKLY', sections: { tasks: true }, identities: [] },
    tasks: { tasks: [{ id: 'own-application', userId, seasonId, status: 'OPEN', sourceType: 'JOIN_APPLICATION_SUPPLEMENT', sourceId: 'owned' }] } }
  const loaders = Object.fromEntries(Object.keys(data).map(name => [name, async () => { calls.push(name); return data[name] }]))
  const result = await fetchAccountAttentionContext(seasonId, userId, { loaders })
  assert.equal(result.overview.openTaskCount, 1)
  assert.deepEqual(calls, ['launch', 'context', 'tasks'])
  const access = getAccountActivityAccess(data.context, data.launch)
  for (const key of ['weeklyPreparation', 'weeklyRooms', 'ownershipTransfers']) assert.equal(access[key], false)
})
test('projected tasks and enrollment share the same pending queue and deduplicate by source', () => {
  const task = { id: 'join', status: 'OPEN', sourceType: 'JOIN_APPLICATION_REVIEW', sourceId: 'application' }
  const activity = buildAccountActivity({ tasks: { status: 'ready', data: { tasks: [task, { ...task, id: 'duplicate' }, { id: 'history', status: 'COMPLETED' }] } },
    preparation: { status: 'ready', data: workspace() } }, { seasonId, userId, preparationReadOnly: false })
  assert.equal(activity.taskView.openTasks.length, 2)
  assert.equal(activity.taskView.historyTasks.length, 1)
})

test('enrollment display and pending tasks share eligibility and entry exclusions', () => {
  const data = workspace()
  data.cycles[0].eligibleTeams.push({ id: 'unauthorized', name: 'Other' })
  const cycles = getWeeklyEnrollmentCycles(data, { seasonId, userId, readOnly: false })
  assert.deepEqual(cycles[0].eligibleTeams.map(team => team.id), ['team-a'])
  assert.equal(buildWeeklyPreparation(data, { seasonId, userId, readOnly: false }).tasks.length, 1)
  data.cycles[0].entries = [{ seasonTeamId: 'team-a' }]
  assert.deepEqual(getWeeklyEnrollmentCycles(data, { seasonId, userId, readOnly: false }), [])
})
test('the live team workspace mounts the enrollment action and exports its existing endpoint adapter', () => {
  const page = readFileSync(new URL('../src/features/weekly-competition/WeeklyCompetitionWorkspace.jsx', import.meta.url), 'utf8')
  const api = readFileSync(new URL('../src/features/weekly-competition/weeklyCompetitionApi.js', import.meta.url), 'utf8')
  assert.match(page, /import WeeklyCycleEnrollment/)
  assert.match(page, /<WeeklyCycleEnrollment[^>]+onEnrolled=\{handleEnrolled\}/)
  assert.match(api, /export async function enrollMyWeeklyCycle/)
  assert.match(api, /weekly-cycles\/\$\{encodeURIComponent\(cycleId\)\}\/enrollment/)
})
