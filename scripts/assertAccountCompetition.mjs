import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { normalizeAccountCompetitions, resolveAccountCompetition, withAccountCompetition, competitionSwitchSearch, readRememberedCompetition, rememberCompetition } from '../src/features/my-space/accountCompetitionModel.js'

const competitions = normalizeAccountCompetitions([
  { id: 'WEEKLY', name: '周赛', teams: [{ id: 'team', roles: ['MANAGER'] }] },
  { id: 'ARCHIVE', name: '往届周赛', status: 'ARCHIVED' }, { id: '../bad' }, { id: 'WEEKLY' }
])
assert.equal(competitions.length, 2)
assert.equal(normalizeAccountCompetitions(undefined), null)
const resolve = options => resolveAccountCompetition({ competitions, ...options })
assert.deepEqual(resolve({}), { id: '', issue: 'CHOOSE' })
assert.equal(resolve({ rememberedId: 'WEEKLY' }).id, 'WEEKLY')
assert.equal(resolve({ rememberedId: 'REMOVED' }).issue, 'CHOOSE')
assert.equal(resolve({ search: '?competition=ARCHIVE', rememberedId: 'WEEKLY' }).id, 'ARCHIVE')
assert.equal(resolve({ search: '?competition=OTHER', rememberedId: 'WEEKLY' }).issue, 'UNAVAILABLE')
for (const search of ['?competition=', '?competition=../bad', '?competition=WEEKLY&competition=ARCHIVE']) {
  assert.equal(resolve({ search }).issue, 'INVALID')
}
assert.deepEqual(resolve({ competitions: [] }), { id: '', issue: 'EMPTY' })
assert.equal(resolve({ competitions: [competitions[0]] }).id, 'WEEKLY')
assert.equal(resolve({ competitions: null, publicSeasonId: 'FCR26' }).id, 'FCR26', 'older APIs keep the public event entry')
assert.equal(resolve({ competitions: null, search: '?competition=WEEKLY' }).id, 'WEEKLY', 'an unpublished event works without a development flag')
const linkedPublicEvents = normalizeAccountCompetitions([{ id: 'FCW26' }, { id: 'FCR26', status: 'ARCHIVED' }])
const currentEvent = options => resolveAccountCompetition({ competitions: linkedPublicEvents, publicSeasonId: 'FCW26', rememberedId: 'FCR26', ...options })
assert.deepEqual(currentEvent({}), { id: 'FCW26', issue: '' }, 'entering My Space inherits the header event instead of a previous account selection')
assert.equal(currentEvent({ publicSeasonId: 'FCR26', rememberedId: 'FCW26' }).id, 'FCR26', 'switching the header opens the same archived participation event')
assert.equal(currentEvent({ search: '?competition=FCR26' }).id, 'FCR26', 'explicit historical links retain their target')
assert.deepEqual(currentEvent({ publicSeasonId: 'FCA26' }), { id: '', issue: 'UNLINKED' }, 'a public selection cannot grant membership or silently choose a different event')
assert.equal(currentEvent({ competitions: [{ id: 'FCR26' }] }).issue, 'UNLINKED', 'even a sole linked event cannot override the selected header event')
assert.equal(currentEvent({ competitions: [] }).issue, 'UNLINKED')
assert.equal(currentEvent({ publicSeasonId: '', rememberedId: 'FCR26' }).id, 'FCR26', 'remembered events remain a fallback when no header event is available')
assert.equal(withAccountCompetition('/account?lang=en#email', 'WEEKLY'), '/account?lang=en&competition=WEEKLY#email')
assert.equal(withAccountCompetition('/me?section=team', 'WEEKLY'), '/me?section=team&competition=WEEKLY')
assert.equal(withAccountCompetition('/me?competition=ARCHIVE', 'WEEKLY'), '/me?competition=ARCHIVE')
assert.equal(withAccountCompetition('/me/matches/m/room', 'WEEKLY'), '/me/matches/m/room?competition=WEEKLY')
for (const path of ['/matches', '/players/p', '/teams/t', '/']) {
  assert.equal(withAccountCompetition(`${path}?competition=WEEKLY&season=FCR2026`, 'WEEKLY'), `${path}?season=FCR2026`, 'public routes must stay in the public archive')
}
assert.equal(withAccountCompetition('https://example.com', 'WEEKLY'), 'https://example.com')
assert.equal(withAccountCompetition('/me', '', '?competition=WEEKLY&token=secret&cycle=other'), '/me?competition=WEEKLY')
const switched = new URLSearchParams(competitionSwitchSearch('?season=FCR2026&competition=OLD&cycle=old&entry=old&week=old&step=roster&match=old&lang=en&design=kpr5', 'WEEKLY'))
assert.deepEqual([...switched.keys()], ['season', 'lang', 'design', 'competition', 'section'])
assert.equal(switched.get('section'), 'overview')
const aligned = new URLSearchParams(competitionSwitchSearch('?season=FCR2026&competition=FCR26&team=old&cycle=old&entry=old&task=old&lang=zh&design=signal', 'FCW26'))
assert.deepEqual(Object.fromEntries(aligned), { season: 'FCW2026', lang: 'zh', design: 'signal', competition: 'FCW26', section: 'overview' }, 'a personal event switch also updates the header and clears previous-event state')
assert.equal(new URLSearchParams(competitionSwitchSearch('?season=FCW2026', 'FCR26')).get('season'), 'FCR2026')
assert.equal(switched.get('season'), 'FCR2026', 'unpublished account events do not select an unrelated public archive')
const memory = new Map()
const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) }
rememberCompetition('user-a', 'WEEKLY', storage)
assert.equal(readRememberedCompetition('user-a', storage), 'WEEKLY')
assert.equal(readRememberedCompetition('user-b', storage), '')
const unavailableStorage = { getItem() { throw new Error('disabled') }, setItem() { throw new Error('disabled') } }
assert.equal(readRememberedCompetition('user-a', unavailableStorage), '')
assert.doesNotThrow(() => rememberCompetition('user-a', 'WEEKLY', unavailableStorage))
const vite = await createServer({ configFile: false, cacheDir: path.join(tmpdir(), 'friescup-account-competition-test'),
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { buildSpaceSections } = await vite.ssrLoadModule('/src/pages/me/MySpacePage.jsx')
  const sections = buildSpaceSections({ player: true, weekly: true, publicStats: false,
    launch: { features: { weeklyCompetition: 'READ_ONLY', matchRoom: 'READ_ONLY' } } }).map(item => item.id)
  assert.equal(sections.includes('team'), true, 'an unpublished weekly player can read preparation and rosters')
  assert.equal(sections.includes('matches'), true)
  assert.equal(sections.includes('stats'), false, 'public player statistics must not point to an unrelated archive')
} finally { await vite.close() }
console.log('Account competition context passed: production routes, explicit selection, removed membership, account isolation, archive boundaries and clean switching.')
