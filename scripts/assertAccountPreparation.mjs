import assert from 'node:assert/strict'
import { buildWeeklyPreparation, resolveWeeklySelection, weeklyConfirmationWindow, weeklyTeamDestination } from '../src/features/weekly-competition/weeklyPreparationModel.js'
import { buildWeeklyResultTasks, mergeAccountTasks } from '../src/features/account-ui/accountActivityModel.js'

const readyTaskWorkspace = { season: { id: 'LOCAL', status: 'ACTIVE' }, accessMode: 'WRITE', featureAccess: 'WRITE', rooms: [{ id: 'local-match', status: 'PENDING', myTeams: [{ team: { id: 'local-team', shortName: '本队' }, accessMode: 'WRITE', preparation: { canConfirm: true, ready: false } }] }] }
assert.equal(buildWeeklyResultTasks(readyTaskWorkspace, { seasonId: 'LOCAL', readOnly: false })[0].taskType, 'WEEKLY_TEAM_READINESS')
assert.equal(buildWeeklyResultTasks(readyTaskWorkspace, { seasonId: 'LOCAL', readOnly: true }).length, 0)
readyTaskWorkspace.rooms[0].myTeams[0].preparation.ready = true
assert.equal(buildWeeklyResultTasks(readyTaskWorkspace, { seasonId: 'LOCAL', readOnly: false }).length, 0, 'confirmed readiness removes the task')
readyTaskWorkspace.rooms[0].myTeams[0].preparation = { ready: false, stale: true, canConfirm: true }
assert.match(buildWeeklyResultTasks(readyTaskWorkspace, { seasonId: 'LOCAL', readOnly: false })[0].body, /重新核对/)
delete readyTaskWorkspace.rooms[0].myTeams[0].preparation
assert.equal(buildWeeklyResultTasks(readyTaskWorkspace, { seasonId: 'LOCAL', readOnly: false }).length, 0, 'unknown coordination must not invent a task')
import { buildSpaceOverview } from '../src/features/account-ui/spaceOverviewModel.js'
import { buildParticipationJourneys, getParticipationView, getWeeklyRosterCheck } from '../src/features/account-ui/participationJourneyModel.js'
import { requiresParticipationAccess, requiresPublicSnapshot } from '../src/features/my-space/personalSpacePolicy.js'

const now = Date.parse('2026-09-06T12:00:00Z')
const options = { seasonId: 'season-a', userId: 'user-a', readOnly: false, now }
function fixture() {
  const team = { id: 'team-a', name: 'Alpha' }
  const week = { id: 'week-4', weekNumber: 4, label: '第 4 周', status: 'CONFIRMATION_OPEN', confirmationOpensAt: '2026-09-06T10:00:00Z', confirmationDeadlineAt: '2026-09-06T14:00:00Z' }
  const participation = { id: 'participation-a', status: 'CONFIRMED', rosters: [{ status: 'DRAFT', members: [{ playerId: 'a' }] }] }
  const entry = { id: 'entry-a', status: 'ACTIVE', seasonTeamId: team.id, team, accessMode: 'WRITE', coreSelections: [{ status: 'LOCKED', members: [{ playerId: 'a' }] }], weeks: [{ week, participation }] }
  const cycle = { rules: { rosterContinuityMode: 'FIXED_CORE' }, id: 'cycle-a', name: '九月周期', status: 'ACTIVE', entries: [entry] }
  const workspace = { userId: 'user-a', season: { id: 'season-a', status: 'ACTIVE' }, accessMode: 'WRITE', teams: [{ team, role: 'MANAGER', accessMode: 'WRITE' }], cycles: [cycle] }
  return { workspace, cycle, entry, week, participation }
}

assert.equal(buildWeeklyPreparation(null, options).tasks.length, 0)
assert.deepEqual(buildWeeklyResultTasks(null), [])
assert.equal(weeklyConfirmationWindow(fixture().week, now), 'open')
assert.equal(weeklyConfirmationWindow(fixture().week, Date.parse('2026-09-06T09:59:00Z')), 'upcoming')
assert.equal(weeklyConfirmationWindow(fixture().week, Date.parse('2026-09-06T14:00:00Z')), 'open')
assert.equal(weeklyConfirmationWindow(fixture().week, Date.parse('2026-09-06T14:00:00.001Z')), 'closed')
assert.equal(weeklyConfirmationWindow({ ...fixture().week, confirmationDeadlineAt: 'invalid' }, now), 'unknown')
assert.equal(weeklyConfirmationWindow({ ...fixture().week, status: 'CANCELLED' }, now), 'closed')

let data = fixture()
let prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.plans[0].next.key, 'roster')
assert.equal(prepared.tasks.length, 1, 'a saved draft still requires submission')
assert.equal(prepared.tasks[0].requiresSourceResolution, true, 'derived progress cannot be manually checked off')
assert.equal(prepared.tasks[0].status, 'OPEN')
assert.equal(prepared.plans[0].stages[2].label, '草稿待提交')
assert.equal(buildWeeklyPreparation(data.workspace, { ...options, userId: 'user-b' }).plans.length, 0, 'no previous-user progress')
assert.equal(buildWeeklyPreparation(data.workspace, { ...options, seasonId: 'season-b' }).tasks.length, 0, 'no cross-season tasks')
data.participation.rosters[0].status = 'SUBMITTED'
prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.tasks.length, 0, 'successful submission resolves the preparation task')
assert.equal(prepared.plans[0].stages[2].state, 'waiting', 'submitted is not locked or approved')
data.participation.rosters[0].status = 'LOCKED'
assert.equal(buildWeeklyPreparation(data.workspace, options).plans[0].stages[2].state, 'done')
assert.equal(buildWeeklyPreparation(data.workspace, options).plans[0].readyForSchedule, true)
assert.match(buildWeeklyPreparation(data.workspace, options).plans[0].guidance.detail, /赛程/)

for (const kind of ['read-only-feature', 'read-only-entry', 'player', 'archived', 'closed-cycle', 'withdrawn-entry', 'deadline', 'future']) {
  data = fixture()
  const opts = { ...options }
  if (kind === 'read-only-feature') opts.readOnly = true
  if (kind === 'read-only-entry') data.entry.accessMode = 'READ_ONLY'
  if (kind === 'player') data.workspace.teams[0].role = 'PLAYER'
  if (kind === 'archived') data.workspace.season.status = 'ARCHIVED'
  if (kind === 'closed-cycle') data.cycle.status = 'CLOSED'
  if (kind === 'withdrawn-entry') data.entry.status = 'WITHDRAWN'
  if (kind === 'deadline') opts.now = Date.parse('2026-09-07T12:00:00Z')
  if (kind === 'future') opts.now = Date.parse('2026-09-06T09:00:00Z')
  assert.equal(buildWeeklyPreparation(data.workspace, opts).tasks.length, 0, `${kind} cannot invent an actionable submission`)
}
data = fixture()
data.participation.status = 'PENDING'
assert.equal(buildWeeklyPreparation(data.workspace, options).tasks[0].taskType, 'WEEKLY_PREPARATION_PARTICIPATION')
assert.equal(buildWeeklyPreparation(data.workspace, options).tasks.length, 1, 'roster task waits for participation confirmation')
for (const status of ['DECLINED', 'WITHDRAWN']) {
  data.participation.status = status
  assert.equal(buildWeeklyPreparation(data.workspace, options).tasks.length, 0, 'an explicit opt-out is not an unanswered invitation')
  assert.equal(buildWeeklyPreparation(data.workspace, options).plans[0].stages[2].state, 'quiet')
  assert.equal(buildWeeklyPreparation(data.workspace, options).plans[0].readyForSchedule, false)
  assert.match(buildWeeklyPreparation(data.workspace, options).plans[0].guidance.detail, /无需提交名单/)
}

data = fixture()
data.week.status = 'CANCELLED'
data.participation.rosters[0].status = 'SUBMITTED'
prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.tasks.length, 0)
assert.equal(prepared.plans[0].readyForSchedule, false)
assert.match(prepared.plans[0].guidance.detail, /已取消/)
assert.doesNotMatch(prepared.plans[0].stages[2].label, /等待/)
assert.doesNotMatch(prepared.plans[0].stages[2].detail, /等待/)

data = fixture()
data.entry.weeks = []
prepared = buildWeeklyPreparation(data.workspace, options)
assert.match(prepared.plans[0].guidance.detail, /周次公布后/)
assert.equal(prepared.plans[0].stages[1].label, '周次尚未公布')
assert.equal(prepared.tasks.length, 0)

data = fixture()
data.workspace.teams[0].role = 'PLAYER'
prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.plans[0].summary, '等待队长或经理提交名单')
assert.match(prepared.plans[0].guidance.detail, /队长或经理/)
data.participation.rosters[0].status = 'SUBMITTED'
assert.match(buildWeeklyPreparation(data.workspace, options).plans[0].guidance.detail, /无需重复提交/)

data = fixture()
data.participation.status = 'PENDING'
prepared = buildWeeklyPreparation(data.workspace, { ...options, now: Date.parse('2026-09-07T12:00:00Z') })
assert.match(prepared.plans[0].guidance.detail, /确认期已结束/)
assert.equal(prepared.plans[0].stages[2].label, '本周未提交')
assert.doesNotMatch(prepared.plans[0].stages[2].detail, /继续准备/)
data.participation.status = 'DECLINED'
prepared = buildWeeklyPreparation(data.workspace, { ...options, now: Date.parse('2026-09-06T09:00:00Z') })
assert.match(prepared.plans[0].guidance.detail, /尚未开放/)
assert.doesNotMatch(prepared.plans[0].guidance.detail, /已结束/)

data = fixture()
data.cycle.status = 'REGISTRATION'
data.entry.coreSelections = []
data.entry.weeks.push({ ...structuredClone(data.entry.weeks[0]), week: { ...data.week, id: 'week-5', weekNumber: 5 } })
prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.tasks.length, 1, 'core is a single cycle task, even with multiple open weeks')
assert.match(prepared.tasks[0].id, /weekly-core/)
assert.equal(prepared.plans.every(plan => plan.stages[2].state === 'waiting'), true, 'submission waits for the locked core')

data = fixture()
const second = structuredClone(data.entry)
Object.assign(second, { id: 'entry-b', seasonTeamId: 'team-b', team: { id: 'team-b', name: 'Bravo' } })
second.weeks[0].week.id = 'week-b'
data.cycle.entries.push(second)
data.workspace.teams.push({ team: second.team, role: 'MANAGER', accessMode: 'WRITE' })
prepared = buildWeeklyPreparation(data.workspace, options)
assert.equal(prepared.tasks.length, 2)
const url = new URL(weeklyTeamDestination('cycle-a', 'entry-b', 'week-b', 'roster'), 'http://local')
const selected = resolveWeeklySelection(data.workspace, { cycleId: url.searchParams.get('cycle'), entryId: url.searchParams.get('entry'), weekId: url.searchParams.get('week') }, now)
assert.equal(selected.entry.id, 'entry-b')
assert.equal(selected.weekRecord.week.id, 'week-b')
assert.equal(url.hash, '#weekly-roster')
assert.equal(resolveWeeklySelection(data.workspace, { entryId: 'entry-a', weekId: 'week-b' }, now).invalid, true)
assert.equal(resolveWeeklySelection(data.workspace, { cycleId: 'removed-cycle' }, now).invalid, true)
assert.equal(resolveWeeklySelection(data.workspace, { entryId: 'removed-entry' }, now).entry, null)

const room = { id: 'result', status: 'COMPLETE', revision: 1, ready: true, confirmationState: 'PENDING', teamAId: 'team-a', teamBId: 'team-b', week: { status: 'RESULT_REVIEW' }, myTeams: ['a', 'b'].map(id => ({ team: { id: `team-${id}`, name: id }, role: 'MANAGER', accessMode: 'WRITE', canRespond: true, confirmation: { status: 'PENDING', isCurrent: true, revision: 1 } })) }
const resultWorkspace = { season: data.workspace.season, accessMode: 'WRITE', featureAccess: 'WRITE', rooms: [room] }
const results = buildWeeklyResultTasks(resultWorkspace, options)
assert.equal(results.length, 2)
assert.equal(mergeAccountTasks([], results).openTasks.length, 2, 'same room URL does not collapse two team responses')
assert.equal(mergeAccountTasks([results[0]], results).openTasks.length, 2, 'same source response is only counted once')
assert.equal(mergeAccountTasks([{ ...results[0], id: 'past-response', status: 'COMPLETED' }], results).openTasks.length, 2, 'an older history entry does not suppress a newly opened response')
room.myTeams[0].confirmation.status = 'CONFIRMED'
assert.equal(buildWeeklyResultTasks(resultWorkspace, options).length, 1)
room.myTeams[1].confirmation.isCurrent = false
assert.equal(buildWeeklyResultTasks(resultWorkspace, options).length, 0, 'stale result revisions never create tasks')

const generic = { id: 'staff', status: 'OPEN', taskType: 'REFEREE_CONFIRMATION', identityType: 'REFEREE', priority: 'URGENT', dueAt: '2026-09-06T12:10:00Z' }
const taskView = mergeAccountTasks([generic], [...prepared.tasks, ...results], { now, identityType: 'MANAGER' })
const homepage = buildSpaceOverview({ seasonId: options.seasonId }, { now, activity: { taskView } })
assert.deepEqual(homepage.tasks.map(task => task.id), taskView.openTasks.map(task => task.id), 'home and task center share the exact priority queue')
assert.equal(homepage.tasks[0].id, 'staff', 'an urgent staff task can outrank the primary manager role')
assert.equal(homepage.taskCount, taskView.openTasks.length)
console.log('Account preparation checks passed: drafts, confirmation, permissions, deadlines, scoped links, result revisions and one shared queue.')

// Submission removes a to-do but retains the same participation record and handoff.
data = fixture()
const preparationJourney = opts => buildParticipationJourneys(buildWeeklyPreparation(data.workspace, opts || options).plans, null, options)[0]
const journeyId = preparationJourney().id
assert.equal(preparationJourney().category, 'action')
data.participation.rosters[0].status = 'SUBMITTED'
assert.equal(preparationJourney().id, journeyId)
assert.equal(preparationJourney().category, 'waiting')
assert.match(preparationJourney().owner, /管理员/)
assert.match(preparationJourney().detail, /无需重复提交/)
data.participation.rosters[0].status = 'LOCKED'
assert.equal(preparationJourney().id, journeyId)
assert.equal(preparationJourney().category, 'active')
data.week.status = 'CLOSED'
assert.equal(preparationJourney().category, 'history')
assert.equal(preparationJourney().readyForSchedule, false)
data = fixture()
data.participation.status = 'DECLINED'
assert.equal(preparationJourney().category, 'history')
data = fixture()
assert.equal(preparationJourney({ ...options, readOnly: true }).category, 'waiting')
assert.doesNotMatch(preparationJourney({ ...options, readOnly: true }).actionLabel, /^继续/)
assert.equal(preparationJourney({ ...options, now: now + 86400000 }).category, 'blocked')

const responseRoom = structuredClone(room)
responseRoom.myTeams.forEach(team => Object.assign(team.confirmation, { status: 'PENDING', isCurrent: true }))
const responseWorkspace = { ...resultWorkspace, rooms: [responseRoom] }
const roomJourneys = (opts = options) => buildParticipationJourneys([], responseWorkspace, opts)
assert.equal(roomJourneys().filter(item => item.category === 'action').length, 2, 'one response per represented team')
const roomJourneyIds = roomJourneys().map(item => item.id).sort()
responseRoom.myTeams[0].confirmation.status = 'CONFIRMED'
assert.equal(roomJourneys().filter(item => item.category === 'action').length, 1)
assert.equal(roomJourneys().filter(item => item.category === 'waiting').length, 1)
assert.deepEqual(roomJourneys().map(item => item.id).sort(), roomJourneyIds)
assert.equal(roomJourneys({ ...options, readOnly: true }).every(item => item.category !== 'action'), true)
responseRoom.confirmationState = 'DISPUTED'
assert.equal(roomJourneys().filter(item => item.category === 'action').length, 1, 'an existing dispute does not hide another team response explicitly allowed by the service')
responseRoom.myTeams[1].confirmation.status = 'DISPUTED'
assert.equal(roomJourneys().every(item => item.category === 'blocked'), true)
responseRoom.confirmationState = 'STALE'
assert.equal(roomJourneys().every(item => item.category === 'blocked'), true)
responseRoom.confirmationState = 'FINALIZED'
assert.equal(roomJourneys().every(item => item.category === 'history'), true)
assert.equal(roomJourneys({ ...options, seasonId: 'another-season' }).length, 0)
const journeyItems = [preparationJourney(), ...roomJourneys()]
assert.equal(getParticipationView(journeyItems, new URLSearchParams({ journey: journeyId })).selected.id, journeyId)
assert.equal(getParticipationView(journeyItems, new URLSearchParams({ journey: 'removed' })).unavailable, true)
assert.equal(getParticipationView(journeyItems, new URLSearchParams({ journey: journeyId, progress: 'history' })).unavailable, true, 'never silently select an unrelated record after a status change')
assert.equal(getParticipationView(journeyItems, new URLSearchParams('progress=unknown')).filter, 'all')

const { summarizeParticipation } = await import('../src/features/account-ui/participationJourneyModel.js')
const activeJourneys = [0, 1, 2, 3].map(i => ({ id: `current-${i}`, category: i === 3 ? 'waiting' : 'action' }))
const mixedJourneys = [{ id: 'older', category: 'history' }, ...activeJourneys]
assert.deepEqual(summarizeParticipation(mixedJourneys).current.map(item => item.id), ['current-0', 'current-1', 'current-2'], 'history cannot displace current participation on the homepage')
assert.equal(summarizeParticipation(mixedJourneys).remaining, 1)
assert.equal(summarizeParticipation(mixedJourneys).counts.history, 1)
assert.equal(getParticipationView(mixedJourneys, new URLSearchParams('progress=current')).visible.length, 4)
assert.equal(getParticipationView(mixedJourneys, new URLSearchParams('journey=older')).selected.id, 'older', 'old direct progress links can still open history')
assert.equal(getParticipationView(mixedJourneys, new URLSearchParams('journey=older&progress=current')).unavailable, true, 'an explicit current filter never silently selects another record')
assert.equal(summarizeParticipation([{ id: 'closed', category: 'history' }]).current.length, 0)
const { withParticipationActionContext } = await import('../src/features/account-ui/participationJourneyModel.js')
const actionHref = new URL(withParticipationActionContext('/me?section=team&cycle=c&entry=e&week=w&step=roster#weekly-roster', '?competition=private-weekly&lang=en&season=FCR2026&task=old&weeklyMatch=other&step=participation'), 'https://local.test')
assert.equal(actionHref.searchParams.get('step'), 'roster', 'anchor is not part of the step parameter')
assert.equal(actionHref.hash, '#weekly-roster')
assert.equal(actionHref.searchParams.get('competition'), 'private-weekly')
assert.equal(actionHref.searchParams.get('lang'), 'en')
assert.equal(actionHref.searchParams.has('task'), false)
assert.equal(actionHref.searchParams.has('weeklyMatch'), false)

const rosterRules = { rosterContinuityMode: 'FIXED_CORE', rosterMin: 5, rosterMax: 7, minimumCoreInWeeklyRoster: 3 }
const rosterPlayers = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }))
const coreIds = new Set(['0', '1', '2'])
assert.equal(getWeeklyRosterCheck(['0', '1', '2', '3', '4'], coreIds, rosterRules, rosterPlayers).canSubmit, true)
assert.equal(getWeeklyRosterCheck(['0', '1', '2', '3', '3'], coreIds, rosterRules, rosterPlayers).canSubmit, false, 'duplicate members do not meet minimum size')
assert.equal(getWeeklyRosterCheck(['1', '2', '3', '4', '5'], coreIds, rosterRules, rosterPlayers).canSubmit, false, 'five players still need three locked core players')
assert.equal(getWeeklyRosterCheck(['0', '1', '2', '3', 'removed'], coreIds, rosterRules, rosterPlayers).canSubmit, false)
assert.equal(getWeeklyRosterCheck(rosterPlayers.map(player => player.id), coreIds, rosterRules, rosterPlayers).canSubmit, false)
assert.equal(requiresParticipationAccess('following'), false, 'personal following remains available outside the participation rollout')
for (const section of ['overview', 'tasks', 'team', 'matches', 'communications', null]) {
  assert.equal(requiresPublicSnapshot({ pathname: '/me', section, isAuthenticated: true }), false, 'public snapshot loading must not block authenticated account tasks')
}
for (const section of ['following', 'stats']) {
  assert.equal(requiresPublicSnapshot({ pathname: '/me', section, isAuthenticated: true }), true, 'public-data views still require a snapshot')
}
assert.equal(requiresPublicSnapshot({ pathname: '/me', section: 'overview', isAuthenticated: false }), true, 'guest following needs public data')
assert.equal(requiresPublicSnapshot({ pathname: '/matches', isAuthenticated: true }), true, 'public match pages retain their own data boundary')
for (const section of ['overview', 'tasks', 'team', 'matches', 'referee', 'caster', 'unknown']) assert.equal(requiresParticipationAccess(section), true)
console.log('Participation continuity checks passed: stable records, handoff, read-only access, scoped response history, selection recovery and roster preflight.')

const continuityRules = { ...rosterRules, rosterContinuityMode: 'PREVIOUS_APPEARANCE', previousAppearancePlayerIds: ['0', '1', '2', '3', '4'], previousAppearanceRequired: 3 }
assert.equal(getWeeklyRosterCheck(['0', '1', '2', '5', '6'], new Set(), continuityRules, rosterPlayers).canSubmit, true)
assert.equal(getWeeklyRosterCheck(['0', '1', '5', '6', '7'], coreIds, continuityRules, rosterPlayers).canSubmit, false)
const currentRules = fixture()
currentRules.cycle.rules.rosterContinuityMode = 'PREVIOUS_APPEARANCE'
assert.deepEqual(buildWeeklyPreparation(currentRules.workspace, options).plans[0].stages.map(stage => stage.key), ['participation', 'roster'])
