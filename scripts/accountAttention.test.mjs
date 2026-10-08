import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchAccountAttentionContext } from '../src/features/my-space/accountAttentionApi.js'
import { buildAccountAttention } from '../src/features/my-space/accountAttentionModel.js'
import { buildAccountActivity, getAccountActivityAccess } from '../src/features/account-ui/accountActivityModel.js'
import { buildSpaceOverview } from '../src/features/account-ui/spaceOverviewModel.js'

const now = Date.parse('2026-09-06T12:00:00Z')
const seasonId = 'season-a'
const userId = 'user-a'
function fixture() {
  const team = { id: 'team-a', shortName: 'Alpha' }
  const week = { id: 'week-a', status: 'CONFIRMATION_OPEN', confirmationOpensAt: '2026-09-06T10:00:00Z', confirmationDeadlineAt: '2026-09-06T14:00:00Z' }
  const entry = { id: 'entry-a', status: 'ACTIVE', seasonTeamId: team.id, team, accessMode: 'WRITE', coreSelections: [{ status: 'LOCKED', members: [{ playerId: 'a' }] }], weeks: [{ week, participation: { id: 'participation-a', status: 'CONFIRMED', rosters: [{ status: 'DRAFT', members: [{ playerId: 'a' }] }] } }] }
  const data = {
    launch: { seasonId, allowed: true, features: { communications: 'READ_ONLY', weeklyCompetition: 'WRITE', matchRoom: 'WRITE' } },
    context: { seasonId, user: { id: userId }, competitionKind: 'WEEKLY', primaryIdentityType: 'MANAGER', identities: [{ type: 'MANAGER' }], overview: { openTaskCount: 0, unreadNotificationCount: 3 } },
    tasks: { tasks: [] },
    preparation: { userId, season: { id: seasonId, status: 'ACTIVE' }, accessMode: 'WRITE', teams: [{ team, role: 'MANAGER', accessMode: 'WRITE' }], cycles: [{ id: 'cycle-a', status: 'ACTIVE', rules: { rosterContinuityMode: 'FIXED_CORE' }, entries: [entry] }] },
    rooms: { season: { id: seasonId, status: 'ACTIVE' }, accessMode: 'WRITE', featureAccess: 'WRITE', teams: [{ team }], rooms: [{ id: 'result-a', status: 'COMPLETE', revision: 1, ready: true, confirmationState: 'PENDING', teamAId: team.id, teamBId: 'team-b', week: { status: 'RESULT_REVIEW' }, myTeams: [{ team, role: 'MANAGER', accessMode: 'WRITE', canRespond: true, confirmation: { status: 'PENDING', isCurrent: true, revision: 1 } }] }] }
  }
  const calls = []
  const loaders = Object.fromEntries(Object.keys(data).map(key => [key, async (id, options) => { calls.push({ key, id, options }); return data[key] }]))
  return { data, loaders, calls, entry }
}
const count = async f => fetchAccountAttentionContext(seasonId, userId, { loaders: f.loaders, now })

test('navigation and home both count a draft roster and pending result', async () => {
  const f = fixture()
  const context = await count(f)
  const access = getAccountActivityAccess(f.data.context, f.data.launch)
  const activity = buildAccountActivity(Object.fromEntries(['tasks', 'preparation', 'rooms'].map(key => [key, { status: 'ready', data: f.data[key] }])), { ...access, seasonId, userId, now })
  assert.equal(context.overview.openTaskCount, 2)
  assert.equal(buildSpaceOverview(f.data.context, { now, activity }).taskCount, 2)
  assert.equal(context.overview.taskSyncStatus, 'ready')
  assert.equal(buildAccountAttention(context).taskBadge, '待 2')
  assert.deepEqual(f.calls.map(call => call.key), ['launch', 'context', 'tasks', 'preparation', 'rooms'])
  assert.equal(f.calls.every(call => call.id === seasonId && !call.options.method), true, 'counting only reads the selected account competition')
})

test('a submitted roster leaves the result task visible', async () => {
  const f = fixture()
  f.entry.weeks[0].participation.rosters[0].status = 'SUBMITTED'
  assert.equal((await count(f)).overview.openTaskCount, 1)
  f.data.rooms.rooms[0].myTeams[0].confirmation.status = 'CONFIRMED'
  assert.equal((await count(f)).overview.openTaskCount, 0)
})

test('readiness and result confirmation are separate tasks', async () => {
  const f = fixture()
  f.data.rooms.rooms.push({ id: 'next-a', status: 'PENDING', myTeams: [{ team: f.entry.team, accessMode: 'WRITE', preparation: { canConfirm: true, ready: false } }] })
  assert.equal((await count(f)).overview.openTaskCount, 3)
  f.data.rooms.rooms[1].myTeams[0].preparation.ready = true
  assert.equal((await count(f)).overview.openTaskCount, 2)
})

test('the same source task from the server and derived queue counts once', async () => {
  const f = fixture()
  const access = getAccountActivityAccess(f.data.context, f.data.launch)
  const activity = buildAccountActivity({ preparation: { status: 'ready', data: f.data.preparation } }, { ...access, seasonId, userId, now })
  f.data.tasks.tasks = [{ ...activity.taskView.openTasks[0], id: 'server-copy', userId, seasonId }]
  assert.equal((await count(f)).overview.openTaskCount, 2)
})

test('a failed preparation source preserves the known result and marks the count incomplete', async () => {
  const f = fixture()
  f.loaders.preparation = async () => { throw new Error('503') }
  const attention = buildAccountAttention(await count(f))
  assert.equal(attention.openTaskCount, 1)
  assert.equal(attention.taskBadge, '待 1+')
  assert.equal(attention.visible, true)
  assert.equal(attention.taskSyncStatus, 'error')
  assert.match(attention.ariaLabel, /至少 1 项待办.*同步失败/)
})

test('all failed sources show an unknown count instead of no tasks', async () => {
  const f = fixture()
  for (const key of ['tasks', 'preparation', 'rooms']) f.loaders[key] = async () => { throw new Error('offline') }
  const attention = buildAccountAttention(await count(f))
  assert.equal(attention.taskBadge, '待 !')
  assert.equal(attention.showTaskBadge, true)
  assert.match(attention.ariaLabel, /数量暂时未知/)
})

test('closed and hidden features do not fetch task sources', async () => {
  const f = fixture()
  f.data.launch.allowed = false
  assert.equal(await count(f), null)
  assert.deepEqual(f.calls.map(call => call.key), ['launch'])
  f.data.launch.allowed = true
  f.data.launch.features = {}
  f.calls.length = 0
  assert.equal((await count(f)).overview.openTaskCount, 0)
  assert.deepEqual(f.calls.map(call => call.key), ['launch', 'context'])
})

test('read-only participants and archived seasons have no writable derived tasks', async () => {
  const f = fixture()
  f.data.launch.features.weeklyCompetition = 'READ_ONLY'
  f.data.launch.features.matchRoom = 'READ_ONLY'
  assert.equal((await count(f)).overview.openTaskCount, 0)
  f.data.launch.features.weeklyCompetition = 'WRITE'
  f.data.launch.features.matchRoom = 'WRITE'
  f.data.preparation.teams[0].role = 'PLAYER'
  f.data.rooms.rooms[0].myTeams[0].accessMode = 'READ_ONLY'
  assert.equal((await count(f)).overview.openTaskCount, 0)
  f.data.preparation.teams[0].role = 'MANAGER'
  f.data.preparation.season.status = 'ARCHIVED'
  f.data.rooms.season.status = 'ARCHIVED'
  assert.equal((await count(f)).overview.openTaskCount, 0)
})

test('a coach-only account reads the team workspace without receiving team-management tasks or permissions', async () => {
  const f = fixture()
  f.data.context.primaryIdentityType = 'COACH'
  f.data.context.identities = [{ identityType: 'COACH', status: 'ACTIVE' }]
  f.data.context.sections = { weeklyRooms: true }
  f.data.context.teamContexts = [{ roles: ['COACH'], capabilities: { canManageTeam: false, canEnterMatchRoom: true } }]
  f.data.preparation.teams[0].role = 'COACH'; f.data.preparation.teams[0].accessMode = 'READ_ONLY'
  f.data.rooms.rooms[0].myTeams[0].role = 'COACH'; f.data.rooms.rooms[0].myTeams[0].accessMode = 'READ_ONLY'
  const access = getAccountActivityAccess(f.data.context, f.data.launch)
  assert.equal(access.canViewWeeklyCompetition, true)
  assert.equal(access.weeklyPreparation, true)
  assert.equal(access.preparationReadOnly, true)
  assert.equal(access.canViewWeeklyMatchRooms, true)
  assert.equal((await count(f)).overview.openTaskCount, 0)
  assert(f.calls.some(call => call.key === 'preparation'), 'the real account loading path fetches the coach workspace')
  assert.equal(getAccountActivityAccess(f.data.context, { ...f.data.launch, allowed: false }).canViewWeeklyCompetition, false)
  assert.equal(getAccountActivityAccess(f.data.context, { ...f.data.launch, features: {} }).canViewWeeklyCompetition, false)
  f.data.context.identities.push({ type: 'MANAGER' })
  assert.equal(getAccountActivityAccess(f.data.context, f.data.launch).preparationReadOnly, false, 'a separate manager identity retains its existing per-team access checks')
})

test('context from another account or competition is rejected before reading tasks', async () => {
  for (const kind of ['account', 'competition', 'launch']) {
    const f = fixture()
    if (kind === 'account') f.data.context.user.id = 'user-b'
    if (kind === 'competition') f.data.context.seasonId = 'season-b'
    if (kind === 'launch') f.data.launch.seasonId = 'season-b'
    await assert.rejects(count(f), /不一致/)
    assert.equal(f.calls.some(call => ['tasks', 'preparation', 'rooms'].includes(call.key)), false)
  }
})

test('foreign source data cannot inflate the count', async () => {
  const f = fixture()
  f.data.preparation.userId = 'user-b'
  f.data.tasks.tasks = [{ id: 'foreign', userId: 'user-b', status: 'OPEN' }]
  let context = await count(f)
  assert.equal(context.overview.openTaskCount, 1)
  assert.equal(context.overview.taskSyncStatus, 'error')
  f.data.rooms.userId = 'user-b'
  context = await count(f)
  assert.equal(buildAccountAttention(context).taskBadge, '待 !')
})

test('an aborted account request cannot publish its late count', async () => {
  const f = fixture()
  const controller = new AbortController()
  f.loaders.rooms = async () => { controller.abort(); return f.data.rooms }
  await assert.rejects(fetchAccountAttentionContext(seasonId, userId, { loaders: f.loaders, now, signal: controller.signal }), { name: 'AbortError' })
})

test('all four locales distinguish known, syncing and unknown counts', () => {
  const expected = { 'zh-CN': '2 项待办，3 条未读消息', 'zh-TW': '2 項待辦，3 條未讀訊息', 'en-US': '2 open tasks, 3 unread messages', 'ko-KR': '할 일 2개, 읽지 않은 메시지 3개' }
  for (const [locale, label] of Object.entries(expected)) {
    assert.equal(buildAccountAttention({ overview: { openTaskCount: 2, unreadNotificationCount: 3 } }, locale).ariaLabel, label)
    const pending = buildAccountAttention({ overview: { taskSyncStatus: 'loading' } }, locale)
    const error = buildAccountAttention({ overview: { taskSyncStatus: 'error' } }, locale)
    assert.equal(pending.showTaskBadge, true)
    assert.equal(error.showTaskBadge, true)
    assert.notEqual(pending.ariaLabel, error.ariaLabel)
    assert.notEqual(error.ariaLabel, buildAccountAttention(null, locale).ariaLabel)
  }
  assert.equal(buildAccountAttention({ overview: { openTaskCount: 120, taskSyncStatus: 'error' } }).taskBadge, '待 99+')
  assert.equal(buildAccountAttention(null).visible, false)
})
