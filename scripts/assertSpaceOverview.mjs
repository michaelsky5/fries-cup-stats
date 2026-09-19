import assert from 'node:assert/strict'
import { buildSpaceOverview, getSpaceOverviewPresentation } from '../src/features/account-ui/spaceOverviewModel.js'

const now = new Date('2026-09-06T12:00:00Z')
const match = { id: 'team-match', status: 'PENDING', scheduledAt: '2026-09-06T12:10:00Z' }
const staffMatch = { id: 'staff-match', status: 'PENDING', scheduledAt: '2026-09-06T12:05:00Z' }
const context = {
  identities: [{ type: 'PLAYER', isPrimary: true }, { type: 'REFEREE' }],
  teamContexts: [{ matches: [match], roles: ['PLAYER'], capabilities: { canEnterMatchRoom: true } }],
  overview: { tasks: [{ id: 'one', identityType: 'PLAYER' }, { id: 'two', identityType: 'REFEREE' }], openTaskCount: 2, nextTeamMatch: match, nextStaffAssignment: { match: staffMatch, assignmentType: 'REFEREE' } }
}
let view = buildSpaceOverview(context, { now })
assert.equal(view.next.match.id, staffMatch.id, 'the earliest role assignment wins, independent of primary identity')
assert.equal(view.next.canEnterRoom, false, 'staff summary alone never invents room authorization')
assert.equal(view.taskCount, 2)
context.overview.nextStaffAssignment = null
view = buildSpaceOverview(context, { now })
assert.equal(view.next.canEnterRoom, false, 'legacy summaries do not expose a retired room')
assert.equal(buildSpaceOverview(context, { now: new Date('2026-09-06T11:00:00Z') }).next.canEnterRoom, false, 'future rooms respect their opening window')
context.teamContexts[0].capabilities.canEnterMatchRoom = false
assert.equal(buildSpaceOverview(context, { now }).next.canEnterRoom, false, 'membership does not imply room access')
view = buildSpaceOverview(context, { now, sections: [{ id: 'overview' }] })
assert.equal(view.taskCount, 0)
assert.deepEqual(view.tasks, [])
assert.equal(view.allowed('communications'), false)
assert.equal(view.next.canEnterRoom, false)
context.overview.nextStaffAssignment = { match: { ...staffMatch, status: 'COMPLETE' } }
assert.equal(buildSpaceOverview(context, { now }).next.match.id, match.id, 'completed staff assignments are not next matches')
context.overview.nextStaffAssignment = { match: { ...staffMatch, scheduledAt: '2026-09-06T13:00:00Z', status: 'IN_PROGRESS' } }
assert.equal(buildSpaceOverview(context, { now }).next.match.id, staffMatch.id, 'an active match takes precedence over future schedules')
assert.equal(buildSpaceOverview({}, { now }).next, null)
const weeklyRoom = { id: 'weekly-result', revision: 1, ready: true, status: 'COMPLETE', confirmationState: 'PENDING', teamAId: 'a', teamBId: 'b', week: { status: 'RESULT_REVIEW' }, myTeams: [{ team: { id: 'a', shortName: 'A' }, role: 'MANAGER', accessMode: 'WRITE', canRespond: true, confirmation: { status: 'PENDING', revision: 1, isCurrent: true } }] }
const weeklyContext = { seasonId: 'weekly-season', overview: {} }
const weekly = { status: 'ready', readOnly: false, workspace: { season: { id: 'weekly-season', status: 'ACTIVE' }, accessMode: 'WRITE', featureAccess: 'WRITE', rooms: [weeklyRoom] } }
const weeklyOptions = { now, sections: [{ id: 'overview' }, { id: 'matches' }], weekly }
assert.equal(buildSpaceOverview(weeklyContext, weeklyOptions).taskCount, 1, 'weekly result actions remain visible when communications are hidden')
assert.equal(buildSpaceOverview(weeklyContext, weeklyOptions).next, null, 'a completed result awaiting confirmation is a task, not the next match')
assert.equal(buildSpaceOverview(weeklyContext, { ...weeklyOptions, weekly: { ...weekly, status: 'loading' } }).taskCount, 0, 'loading never reuses stale weekly actions')
assert.equal(buildSpaceOverview({ ...weeklyContext, seasonId: 'other' }, weeklyOptions).taskCount, 0, 'season changes cannot leak weekly actions')
for (const field of ['readOnly', 'player', 'stale', 'archived', 'hidden']) {
  const options = structuredClone({ now, sections: weeklyOptions.sections, weekly })
  if (field === 'readOnly') options.weekly.readOnly = true
  if (field === 'player') options.weekly.workspace.rooms[0].myTeams[0].role = 'PLAYER'
  if (field === 'stale') options.weekly.workspace.rooms[0].myTeams[0].confirmation.isCurrent = false
  if (field === 'archived') options.weekly.workspace.season.status = 'ARCHIVED'
  if (field === 'hidden') options.sections = [{ id: 'overview' }]
  assert.equal(buildSpaceOverview(weeklyContext, options).taskCount, 0, `${field} cannot expose a result submission task`)
}
weekly.workspace.rooms.push({ ...match, id: 'weekly-next', myTeams: weeklyRoom.myTeams })
assert.equal(buildSpaceOverview(weeklyContext, weeklyOptions).next.actionUrl, '/me?section=matches&weeklyMatch=weekly-next')
const viewerContext = { primaryIdentityType: 'VIEWER', identities: [], teamContexts: [] }
assert.equal(getSpaceOverviewPresentation(viewerContext).followingFirst, true, 'a viewer without tasks or assignments sees following first')
assert.equal(getSpaceOverviewPresentation(viewerContext, { tasksPending: true }).collapseTasks, false, 'unknown task counts cannot be presented as all clear')
assert.equal(getSpaceOverviewPresentation(viewerContext, { taskCount: 1 }).followingFirst, false, 'a real task takes priority even for viewers')
assert.equal(getSpaceOverviewPresentation(viewerContext, { next: { match } }).followingFirst, false, 'a real match remains above public following')
for (const type of ['PLAYER', 'MANAGER', 'REFEREE', 'CASTER']) {
  const presentation = getSpaceOverviewPresentation({ ...viewerContext, identities: [{ type }] })
  assert.equal(presentation.followingFirst, false, `${type} keeps the participation workspace first`)
  assert.equal(presentation.collapseTasks, true, 'confirmed empty tasks use a compact status')
}
console.log('Space overview checks passed: multi-role priority, room authorization, time windows, hidden features and following placement.')

assert.equal(buildSpaceOverview({ ...context, season: { status: 'ARCHIVED' } }, { now }).next, null, 'archived seasons never promise another upcoming match');

const { getOverviewTaskAction } = await import('../src/features/account-ui/spaceOverviewModel.js')
const manualLink = getOverviewTaskAction({ id: 'manual/a', requiresSourceResolution: false, actionUrl: '/me?section=communications' })
assert.equal(new URL(manualLink.url, 'https://local.test').searchParams.get('task'), 'manual/a', 'manual tasks open the selected item, not an unrelated workflow')
assert.equal(getOverviewTaskAction({ taskType: 'SCHEDULE_CONFIRMATION', actionUrl: '/me?section=team', resolvedActionUrl: '/me?section=matches' }).url, '/me?section=matches', 'overview uses the same resolved destination as the task center')
assert.equal(getOverviewTaskAction({ taskType: 'WEEKLY_PREPARATION_ROSTER', actionUrl: '/me?section=team&entry=a&week=w' }).label, '提交出赛名单')
