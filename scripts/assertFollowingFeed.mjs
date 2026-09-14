import assert from 'node:assert/strict'
import { buildFollowingFeed } from '../src/features/following/followingFeedModel.js'
import { getFollowingView, updateFollowingSearch } from '../src/features/following/followingViewModel.js'
assert.equal(updateFollowingSearch('season=FCR2026', { view: 'matches' }).get('followView'), 'matches')
assert.equal(updateFollowingSearch('followView=matches&follow=team%3ABANANA', { view: 'overview', subjectKey: '', state: 'all' }).toString(), '')
import { getFollowingTeamSummaries } from '../src/features/following/followingTeamSummary.js'
import { getMySpaceReturnLabel, getMySpaceSourceLocation } from '../src/lib/mySpaceNavigation.js'
import { createFollowingObservation, followingObservationKey, getFollowingChanges, getSubjectOutlook, isFollowingObservation, reconcileFollowingSubjects } from '../src/features/following/followingObservationModel.js'

const now = Date.parse('2026-09-07T00:00:00Z')
const a = { team_id: 'team-a', team_short_name: 'A', final_rank: 1 }
const b = { team_id: 'team-b', team_short_name: 'B' }
const c = { team_id: 'team-c', team_short_name: 'C' }
const match = (id, status, date, first = b, second = c) => ({ match_id: id, status, scheduled_at: date, team_a: { id: first.team_id, short: first.team_short_name }, team_b: { id: second.team_id, short: second.team_short_name } })
const recent = match('old-team-appearance', 'COMPLETE', '2026-09-06T12:00:00Z', a, c)
recent.raw_match_id = 'raw-one'
const next = match('next', 'SCHEDULED', '2026-09-07T12:00:00Z')
const live = match('live', 'LIVE', '2026-09-06T19:00:00Z')
const db = { teams: [a, b, c], players: [{ player_id: 'p', display_name: 'Player', team_id: b.team_id, match_logs: [{ matchId: recent.match_id, rawMatchId: 'same-raw', mapName: 'Map' }] }],
  matches: [next, live, recent, { ...next }, match('not-played', 'COMPLETE', '2026-09-06T14:00:00Z'), match('cancelled', 'CANCELLED', '2026-09-07T10:00:00Z'), match('elapsed', 'SCHEDULED', '2026-09-06T18:00:00Z'), match('undated', 'PENDING', 'bad-date')] }
const favorites = { favoriteTeamIds: [], favoritePlayerIds: ['p'] }
const options = { now, season: { lifecycle: 'ACTIVE' }, locale: 'en-US' }
const before = structuredClone(db)
let feed = buildFollowingFeed(db, favorites, options)
assert.equal(feed.archived, false)
assert.equal(feed.teams.length, 0)
assert.equal(feed.players.length, 1)
assert.deepEqual(feed.groups.live.map(item => item.id), ['live'], 'live status is authoritative even when its scheduled time is old')
assert.deepEqual(feed.groups.upcoming.map(item => item.id), ['next'], 'player-only following includes their current team schedule and deduplicates the match')
assert.equal(feed.groups.upcoming[0].relations[0].type, 'player-team', 'future team membership does not assert player appearance')
assert.deepEqual(feed.groups.results.map(item => item.id), ['old-team-appearance'], 'historical appearances survive a team change without inventing appearances for the current team')
assert.equal(feed.groups.results[0].relations[0].type, 'appearance')
assert.equal(feed.groups.results[0].scoreA, null, 'unpublished scores never become zero')
assert.deepEqual(feed.groups.pending.map(item => item.id), ['elapsed', 'undated'], 'elapsed and invalid schedules do not become live or upcoming')
assert.deepEqual(feed.groups.cancelled.map(item => item.id), ['cancelled'])
assert.deepEqual(db, before, 'selection does not mutate public records')
feed = buildFollowingFeed(db, { ...favorites, favoriteTeamIds: ['B'], primaryTeamId: 'B' }, options)
assert.equal(feed.groups.upcoming[0].relations.length, 2, 'team and player reasons share one match')
assert.equal(feed.groups.results.some(item => item.id === 'not-played'), true, 'a directly followed team brings its own results')
assert.equal(feed.teams[0].primary, true)
const archive = buildFollowingFeed(db, favorites, { ...options, season: { lifecycle: 'ARCHIVED' } })
assert.equal(archive.archived, true)
assert.equal(archive.groups.upcoming.length + archive.groups.live.length, 0, 'archived seasons do not promise future activity')
assert.equal(buildFollowingFeed({ teams: [], players: [], matches: [] }, {}, { now }).archived, false, 'an empty season is not a completed season')
assert.equal(buildFollowingFeed(null, favorites, options).loaded, false)
assert.equal(buildFollowingFeed({ ...db, players: [{ player_id: 'other' }] }, favorites, options).hasFavorites, false, 'a different season cannot reuse a missing player identity')
const rawDb = structuredClone(db)
rawDb.players[0].match_logs = [{ rawMatchId: 'raw-one', mapName: 'Map' }]
assert.equal(buildFollowingFeed(rawDb, favorites, options).groups.results[0].id, recent.match_id, 'an unambiguous raw-only appearance resolves to its canonical match')
rawDb.matches.push({ ...match('raw-collision', 'COMPLETE', '2026-09-06T13:00:00Z'), raw_match_id: 'raw-one' })
assert.equal(buildFollowingFeed(rawDb, favorites, options).groups.results.length, 0, 'ambiguous raw IDs never invent appearances')
rawDb.players[0].match_logs = [{ matchId: recent.match_id, rawMatchId: 'raw-one', mapName: 'Map' }]
assert.deepEqual(buildFollowingFeed(rawDb, favorites, options).groups.results.map(item => item.id), [recent.match_id], 'canonical IDs take precedence over imported raw IDs')
console.log('Following feed checks passed: player-only schedules, verified appearances, deduplication, state/time boundaries, scores, archive and season isolation.')

const subjectFeed = buildFollowingFeed(db, { favoriteTeamIds: ['B'], favoritePlayerIds: ['p'] }, options)
let view = getFollowingView(subjectFeed, 'follow=player:p&followState=results')
assert.deepEqual(view.entries.map(item => item.id), ['old-team-appearance'], 'player filtering still requires a recorded appearance for past results')
assert.equal(view.counts.all, 6, 'state counts are scoped to the selected player')
assert.equal(view.counts.upcoming, 1)
view = getFollowingView(subjectFeed, 'follow=team:B&followState=results')
assert.deepEqual(view.entries.map(item => item.id), ['not-played'], 'team filtering does not inherit a player appearance for a former team')
assert.equal(view.counts.results, 1)
const collisionFeed = { ...subjectFeed, players: [{ id: 'B', name: 'Same ID' }], matches: [{ id: 'only-player', group: 'results', relations: [{ type: 'appearance', id: 'B' }] }] }
assert.equal(getFollowingView(collisionFeed, 'follow=team:B').entries.length, 0, 'team and player IDs cannot collide across subject types')
assert.equal(getFollowingView(collisionFeed, 'follow=player:B').entries.length, 1)
for (const key of ['player:removed', 'team:other-season', 'unknown:B']) {
  const missing = getFollowingView(subjectFeed, new URLSearchParams({ follow: key }))
  assert.equal(missing.missingSubject, true)
  assert.equal(missing.entries.length, 0, 'missing selections must never silently show unrelated following')
}
assert.equal(getFollowingView(buildFollowingFeed({ teams: [], players: [], matches: [] }, {}, options), 'follow=player:p').missingSubject, true)
for (const limit of ['-6', 'Infinity', 'NaN', '7.5', '9007199254740992']) assert.equal(getFollowingView(subjectFeed, `followLimit=${limit}`).limit, 6)
const search = new URLSearchParams('season=FCR2026&section=following&design=kpr5&lang=en&platformSeason=demo&follow=player:p&followLimit=24')
const changed = updateFollowingSearch(search, { state: 'results' })
assert.equal(changed.get('follow'), 'player:p')
assert.equal(changed.has('followLimit'), false, 'changing a filter resets the expanded count')
for (const key of ['season', 'section', 'design', 'lang', 'platformSeason']) assert.equal(changed.get(key), search.get(key))
assert.equal(search.get('followLimit'), '24', 'query updates never mutate router inputs')
const expanded = updateFollowingSearch(changed, { limit: 12 })
assert.equal(getFollowingView(subjectFeed, expanded.toString()).limit, 12, 'refresh and return can reconstruct expansion from the URL')
assert.equal(getFollowingView(subjectFeed, expanded.toString()).state, 'results')
const reset = updateFollowingSearch(expanded, { subjectKey: '', state: 'all' })
assert.equal(reset.has('follow'), false)
assert.equal(reset.has('followState'), false)
assert.equal(reset.has('followLimit'), false)
assert.equal(getFollowingView(subjectFeed, 'followState=unknown').state, 'all')
assert.equal(getFollowingView(archive, 'followState=upcoming').filters.includes('upcoming'), true, 'an explicitly requested empty category remains visible after archival')

const rankingDb = { teams: [a, { ...b, final_rank: 2 }, c], matches: [recent], players: [] }
const summaries = getFollowingTeamSummaries(rankingDb, { lifecycle: 'ARCHIVED' }, [{ ...a, id: 'A' }, { ...c, id: 'C' }], 'en-US')
assert.equal(summaries.get('A').label, 'Champion')
assert.equal(summaries.get('C').label, 'Unpublished', 'unpublished final standings are never inferred from a partial table')
assert.equal(summaries.get('A').advanceHref, '/advance?phase=final')
assert.equal(getMySpaceReturnLabel('/me?section=following&follow=player:p', 'zh-CN'), '返回我的关注')
assert.equal(getMySpaceReturnLabel('/me?section=overview', 'en-US'), 'Back to my space')
assert.equal(getMySpaceReturnLabel('/following?season=FCR2026', 'en-US'), 'Back to following')
assert.equal(getMySpaceReturnLabel('/me-other'), '')
assert.equal(getMySpaceReturnLabel('//example.com/me'), '')
const guestLocation = { pathname: '/me', search: '?season=FCR2026&lang=en&follow=team%3AB' }
const followingReturn = getMySpaceSourceLocation(guestLocation, 'following')
assert.equal(getMySpaceReturnLabel(`${followingReturn.pathname}${followingReturn.search}`, 'en-US'), 'Back to following', 'the guest entry route identifies the actual following view')
assert.equal(new URLSearchParams(followingReturn.search).get('follow'), 'team:B')
assert.equal(new URLSearchParams(guestLocation.search).has('section'), false)
const overviewReturn = getMySpaceSourceLocation(guestLocation, 'overview')
assert.equal(getMySpaceReturnLabel(`${overviewReturn.pathname}${overviewReturn.search}`, 'en-US'), 'Back to my space', 'home digest links retain the overview as their source')
console.log('Following route checks passed: subject/state filters, identity collisions, unavailable selections, query persistence, standings and return labels.')

const observationOptions = { seasonId: 'event-a', accountId: 'account-a', now, db: { updated_at: '2026-09-07T00:00:00Z' } }
const playerFeed = buildFollowingFeed(db, favorites, options)
const baseline = createFollowingObservation(playerFeed, observationOptions)
assert.equal(isFollowingObservation(baseline, observationOptions), true)
assert.deepEqual(getFollowingChanges(null, baseline).updates, [], 'first visit establishes a baseline, not fake updates')
assert.deepEqual(getFollowingChanges(baseline, baseline).updates, [])
assert.equal(getSubjectOutlook(playerFeed, 'player', 'p').next.id, 'live')
assert.equal(getSubjectOutlook(playerFeed, 'player', 'p').latest.id, 'old-team-appearance', 'latest player result must be a verified appearance')
const laterClock = createFollowingObservation(buildFollowingFeed(db, favorites, { ...options, now: now + 86400000 }), { ...observationOptions, now: now + 86400000 })
assert.deepEqual(getFollowingChanges(baseline, laterClock).updates, [], 'wall-clock passage alone is not an event update')
const changedDb = structuredClone(db)
changedDb.matches = changedDb.matches.filter((item, index, rows) => rows.findIndex(other => other.match_id === item.match_id) === index)
changedDb.matches.find(item => item.match_id === 'next').scheduled_at = '2026-09-08T12:00:00Z'
changedDb.matches.find(item => item.match_id === 'live').status = 'CANCELLED'
const changedFeed = buildFollowingFeed(changedDb, favorites, options)
const changedObservation = createFollowingObservation(changedFeed, { ...observationOptions, db: { updated_at: '2026-09-07T01:00:00Z' } })
const recordChanges = getFollowingChanges(baseline, changedObservation).updates
assert.deepEqual(recordChanges.find(item => item.id === 'next').kinds, ['schedule'])
assert.equal(recordChanges.find(item => item.id === 'live').kinds.includes('status'), true)
const scored = structuredClone(baseline)
scored.records.find(item => item.id === 'old-team-appearance').score = [3, 1]
assert.deepEqual(getFollowingChanges(baseline, scored).updates, [{ id: 'old-team-appearance', kinds: ['score'] }])
const oldSnapshot = { ...changedObservation, sourceTime: baseline.sourceTime - 1 }
assert.equal(getFollowingChanges(baseline, oldSnapshot).olderSnapshot, true)
assert.deepEqual(getFollowingChanges(baseline, oldSnapshot).updates, [], 'older fallback data never overwrites the viewing baseline')
for (const scope of [{ accountId: 'account-b' }, { seasonId: 'event-b' }]) {
  assert.equal(isFollowingObservation(baseline, { ...observationOptions, ...scope }), false)
  assert.deepEqual(getFollowingChanges(baseline, { ...changedObservation, ...scope }).updates, [], 'no account or season carryover')
}
assert.notEqual(followingObservationKey('event-a', 'guest'), followingObservationKey('event-a', 'account-a'))
assert.notEqual(followingObservationKey('a:b', 'c'), followingObservationKey('a', 'b:c'))
for (const invalid of [null, {}, { ...baseline, version: 2 }, { ...baseline, records: [{ id: 'x', subjects: [], status: 'LIVE', time: null, score: ['3', 1] }] }, { ...baseline, seenAt: NaN }]) assert.equal(isFollowingObservation(invalid, observationOptions), false)

const expandedDb = structuredClone(db)
expandedDb.matches.push(match('new-team-old-record', 'COMPLETE', '2026-09-05T00:00:00Z', a, c))
const expandedFavorites = { ...favorites, favoriteTeamIds: ['A'] }
const expandedObservation = createFollowingObservation(buildFollowingFeed(expandedDb, expandedFavorites, options), observationOptions)
const reconciled = reconcileFollowingSubjects(baseline, expandedObservation)
assert.deepEqual(getFollowingChanges(reconciled, expandedObservation).updates, [], 'newly followed teams do not report their historical records as new events')
expandedDb.matches.push(match('published-after-following', 'SCHEDULED', '2026-09-09T00:00:00Z', a, c))
const published = createFollowingObservation(buildFollowingFeed(expandedDb, expandedFavorites, options), observationOptions)
assert.deepEqual(getFollowingChanges(reconciled, published).updates, [{ id: 'published-after-following', kinds: ['added'] }])
const removedAll = createFollowingObservation(buildFollowingFeed(db, {}, options), observationOptions)
const cleared = reconcileFollowingSubjects(reconciled, removedAll)
assert.equal(cleared.records.length, 0)
assert.deepEqual(getFollowingChanges(reconcileFollowingSubjects(cleared, published), published).updates, [], 'refollowing starts a new baseline after all following was removed')
const absentRecord = { ...baseline, records: baseline.records.filter(item => item.id !== 'live') }
assert.deepEqual(getFollowingChanges(baseline, absentRecord).updates, [], 'disappearing from a snapshot is not proof of cancellation')
console.log('Following revisit checks passed: first visit, true record changes, clock and snapshot age, new follows, reset, verified outlook and account isolation.')

const { getFollowingBriefing } = await import('../src/features/following/followingBriefingModel.js')
const briefingGroups = { live: [{ id: 'live' }], upcoming: [{ id: 'next' }], results: [{ id: 'recent' }, { id: 'earlier' }, { id: 'oldest' }], pending: [{ id: 'tbd' }], cancelled: [] }
assert.equal(getFollowingBriefing({ groups: briefingGroups }).lead.id, 'live')
assert.deepEqual(getFollowingBriefing({ groups: briefingGroups }).related.map(item => item.id), ['next', 'recent'])
assert.equal(getFollowingBriefing({ groups: { ...briefingGroups, live: [] } }).lead.id, 'next')
assert.equal(getFollowingBriefing({ archived: true, groups: briefingGroups }).lead.id, 'recent', 'an archived event cannot headline a stale live or upcoming record')
assert.deepEqual(getFollowingBriefing({ archived: true, groups: briefingGroups }).related.map(item => item.id), ['earlier', 'oldest'])
assert.equal(getFollowingBriefing({ groups: { pending: [{ id: 'tbd' }] } }).lead, null, 'an unscheduled record is not promoted to a confirmed next match')
assert.equal(getFollowingBriefing({ groups: { pending: [{ id: 'tbd' }] } }).attention.length, 1)

// The phone collection is a reading choice, independent of the match filter.
const collectionFeed = { ...playerFeed, teams: [{ id: 'A', short: 'A' }] }
assert.equal(getFollowingView(playerFeed, '').collection, 'players', 'player-only following opens the populated collection')
assert.equal(getFollowingView(collectionFeed, '').collection, 'teams')
assert.equal(getFollowingView(collectionFeed, 'followCollection=unknown').collection, 'teams')
const collectionSearch = updateFollowingSearch('season=event-a&lang=en&cycle=cycle-a&followLimit=12', { collection: 'players' })
assert.equal(getFollowingView(collectionFeed, collectionSearch).collection, 'players')
assert.equal(collectionSearch.get('followLimit'), '12', 'changing the collection preserves expanded match records')
const subjectSearch = updateFollowingSearch(collectionSearch, { subjectKey: 'player:p', view: 'matches', state: 'results' })
const collectionReturn = getMySpaceSourceLocation({ pathname: '/me', search: `?${subjectSearch}` }, 'following')
const restoredCollection = getFollowingView(collectionFeed, collectionReturn.search)
assert.equal(restoredCollection.collection, 'players', 'profile and match returns preserve the selected collection')
assert.equal(restoredCollection.subjectKey, 'player:p')
assert.equal(restoredCollection.state, 'results')
assert.equal(new URLSearchParams(collectionReturn.search).get('lang'), 'en')
assert.equal(new URLSearchParams(collectionReturn.search).get('cycle'), 'cycle-a')
assert.equal(getFollowingView(collectionFeed, updateFollowingSearch(subjectSearch, { view: 'overview', subjectKey: '', state: 'all' })).collection, 'players')
console.log('Following mobile reading checks passed: populated defaults, collection switching, match filters and return context.')
