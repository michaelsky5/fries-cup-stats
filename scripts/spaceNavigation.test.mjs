import assert from 'node:assert/strict'
import test from 'node:test'
import { SPACE_PRIMARY_IDS, SPACE_NAV_GROUPS, SPACE_UTILITY_NAV, SPACE_MOBILE_MENU_IDS, spaceSectionLabel, resolveSpaceEntry, registrationEntryPolicy } from '../src/features/my-space/spaceNavigation.js'
import { matchRoomDestination, matchListDestination, teamManagementDestination } from '../src/features/my-space/spaceDestinations.js'
import { withAccountCompetition } from '../src/features/my-space/accountCompetitionModel.js'

const params = path => new URL(path, 'https://navigation.test').searchParams
const context = '?competition=WEEKLY&season=PUBLIC&lang=ko&design=signal&team=b&cycle=old&entry=old&week=old&manage=coaches&task=old&token=secret'
const sections = ['overview', 'team', 'matches', 'tasks', 'communications', 'following'].map(id => ({ id }))

test('the primary destinations and names agree on desktop and mobile', () => {
  assert.deepEqual([...SPACE_NAV_GROUPS.slice(0, 3), ...SPACE_UTILITY_NAV].flatMap(group => group.sectionIds), SPACE_PRIMARY_IDS)
  assert.deepEqual(SPACE_MOBILE_MENU_IDS.slice(0, 4), SPACE_PRIMARY_IDS.slice(1))
  assert.equal(spaceSectionLabel('team', 'zh-CN'), '我的队伍')
  assert.equal(spaceSectionLabel('matches', 'en-US'), 'My matches')
  assert.deepEqual(SPACE_NAV_GROUPS.find(group => group.id === 'personal').sectionIds, ['stats', 'events', 'stream'])
})

test('room navigation retains site, competition and team but never form state or tokens', () => {
  const room = matchRoomDestination('match/一', { search: context, competitionId: 'WEEKLY' })
  assert.equal(new URL(room, 'https://navigation.test').pathname, '/me/matches/match%2F%E4%B8%80/room')
  assert.deepEqual(Object.fromEntries(params(room)), { season: 'PUBLIC', lang: 'ko', design: 'signal', competition: 'WEEKLY', team: 'b' })
  const back = matchListDestination('match/一', { search: params(room).toString(), competitionId: 'WEEKLY' })
  assert.equal(params(back).get('weeklyMatch'), 'match/一')
  assert.equal(params(back).get('section'), 'matches')
  for (const key of ['season', 'lang', 'design', 'competition', 'team']) assert.equal(params(back).get(key), params(room).get(key))
})

test('failed room reads can return to their exact competition and match before data arrives', () => {
  const back = params(matchListDestination('pending', { search: context }))
  assert.equal(back.get('competition'), 'WEEKLY')
  assert.equal(back.get('weeklyMatch'), 'pending')
  assert.equal(back.get('lang'), 'ko')
})

test('the authoritative room competition drops another event team without changing the public archive', () => {
  const back = params(matchListDestination('actual', { search: context, competitionId: 'OTHER' }))
  assert.equal(back.get('competition'), 'OTHER')
  assert.equal(back.get('season'), 'PUBLIC')
  assert.equal(back.has('team'), false)
})

test('a legacy room link with only a public archive never invents account membership', () => {
  const back = params(matchListDestination('legacy', { search: '?season=PUBLIC&lang=en' }))
  assert.equal(back.has('competition'), false)
  assert.equal(back.get('season'), 'PUBLIC')
  assert.equal(back.get('weeklyMatch'), 'legacy')
})

test('homepage links use the same team preservation as the room list', () => {
  assert.equal(params(withAccountCompetition('/me/matches/m/room', 'WEEKLY', context)).get('team'), 'b')
  assert.equal(params(withAccountCompetition('/me/matches/m/room', 'OTHER', context)).has('team'), false)
})

test('invalid team and week recovery clears every stale workflow selection', () => {
  assert.deepEqual(Object.fromEntries(params(teamManagementDestination({ search: context, competitionId: 'WEEKLY' }))),
    { season: 'PUBLIC', lang: 'ko', design: 'signal', competition: 'WEEKLY', section: 'team' })
  const destination = params(teamManagementDestination({ search: context, competitionId: 'WEEKLY', teamId: 'a', manage: 'members' }))
  assert.equal(destination.get('team'), 'a')
  assert.equal(destination.get('manage'), 'members')
  assert.equal(destination.has('entry'), false)
})

test('weekly participation bookmarks migrate to history with a visible explanation', () => {
  const resolved = resolveSpaceEntry({ search: `${context}&section=events`, sections, weekly: true })
  assert.equal(resolved.notice, 'PARTICIPATION_RECORDS')
  assert.equal(params(resolved.replacement).get('progress'), 'history')
  assert.equal(params(resolved.replacement).get('competition'), 'WEEKLY')
  assert.equal(params(resolved.replacement).has('manage'), false)
})

test('weekly staff legacy links open assigned matches only when that role and entry exist', () => {
  const resolve = extra => resolveSpaceEntry({ search: '?section=referee&competition=WEEKLY', sections, weekly: true, ...extra })
  assert.equal(resolve({ staffRoles: ['REFEREE'] }).notice, 'STAFF_MATCHES')
  assert.equal(resolve({ staffRoles: ['REFEREE'] }).section, 'matches')
  assert.equal(resolve({ staffRoles: ['CASTER'] }).notice, 'UNAVAILABLE_SECTION')
  assert.equal(resolve({ staffRoles: ['REFEREE'], sections: [{ id: 'overview' }] }).section, 'overview')
})

test('known unavailable and unknown sections are explained and normalized independently', () => {
  const known = resolveSpaceEntry({ search: '?section=stats&lang=en&competition=WEEKLY', sections })
  const unknown = resolveSpaceEntry({ search: '?section=typo&lang=en&competition=WEEKLY', sections })
  assert.equal(known.notice, 'UNAVAILABLE_SECTION')
  assert.equal(unknown.notice, 'UNKNOWN_SECTION')
  assert.equal(params(known.replacement).get('section'), 'overview')
})

test('current deep links are left intact, preserving their task and draft context', () => {
  assert.deepEqual(resolveSpaceEntry({ search: `${context}&section=tasks`, sections }), { section: 'tasks', replacement: '', notice: '' })
  assert.equal(resolveSpaceEntry({ search: '?section=referee', sections: [{ id: 'referee' }], weekly: false }).replacement, '')
})

test('linked players, coaches and staff are not prompted to register another team', () => {
  for (const role of ['PLAYER', 'COACH', 'REFEREE', 'CASTER']) {
    const policy = registrationEntryPolicy({ identities: [{ type: role }], teamContexts: [] })
    assert.equal(policy.visible, false, role)
    assert.equal(policy.onHome, false, role)
    assert.equal(policy.allowCreate, false, role)
  }
})

test('approved managers keep their registration record on the team page, not another home signup', () => {
  const policy = registrationEntryPolicy({ identities: [{ type: 'MANAGER' }] },
    { teams: [{ id: 'a', roles: ['MANAGER'] }, { id: 'b', roles: ['PLAYER'] }], registrations: [{ status: 'APPROVED' }] })
  assert.equal(policy.visible, true)
  assert.equal(policy.onHome, false)
  assert.equal(policy.allowCreate, true)
})

test('first registrations and saved drafts remain discoverable', () => {
  assert.equal(registrationEntryPolicy({ identities: [{ type: 'VIEWER' }] }).onHome, true)
  assert.equal(registrationEntryPolicy({ identities: [{ type: 'MANAGER' }] }).onHome, true)
  const policy = registrationEntryPolicy({ identities: [{ type: 'PLAYER' }] }, { teams: [{ id: 'a', roles: ['PLAYER'] }], registrations: [{ status: 'DRAFT' }] })
  assert.equal(policy.visible, true)
  assert.equal(policy.onHome, true)
  assert.equal(policy.allowCreate, false)
})

test('a manager in A browsing their player team B is not shown A’s signup workflow', () => {
  const competition = { teams: [{ id: 'a', roles: ['MANAGER'] }, { id: 'b', roles: ['PLAYER'] }], registrations: [{ status: 'DRAFT' }] }
  const policy = registrationEntryPolicy({ identities: [{ type: 'MANAGER' }, { type: 'PLAYER' }] }, competition, 'b')
  assert.equal(policy.visible, false)
  assert.equal(policy.onHome, false)
  assert.equal(policy.allowCreate, false)
  assert.equal(registrationEntryPolicy({}, competition, 'a').visible, true)
})
