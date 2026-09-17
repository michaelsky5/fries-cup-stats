import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildSeasonTeamTimeline, buildSeasonOpponentEvidence, applySeasonOpponentAdjustment, SEASON_OPPONENT_POLICY } from '../src/lib/seasonOpponentStrength.js'
import { scoreLeaderboardEntries } from '../src/lib/leaderboardScoring.js'
import { getLeaderboardEntries, sortLeaderboardEntries } from '../src/lib/leaderboardSelectors.js'
import { getSeasonById } from '../src/config/seasons.js'

const match = (id, day, a = 'A', b = 'B', result = 1, extra = {}) => ({
  match_id: id, scheduled_at: `2026-06-${String(day).padStart(2, '0')}T12:00:00Z`,
  status: 'COMPLETE', result_mode: 'NORMAL',
  team_a: { id: a, name: a, score: result === 0.5 ? 1 : result === 1 ? 2 : 0 },
  team_b: { id: b, name: b, score: result === 0.5 ? 1 : result === 0 ? 2 : 0 },
  winner: result === 0.5 ? 'DRAW' : result === 1 ? a : b,
  ...extra
})
const log = (matchId, teamId = 'A', minutes = 20, extra = {}) => ({ matchId, teamId, minutes, ...extra })
const context = (db, id) => buildSeasonTeamTimeline(db).canonical.get(id.toLowerCase())
const history = () => [1, 2, 3].flatMap(day => [match(`B${day}`, day, 'B', 'C'), match(`D${day}`, day, 'D', 'E', 0)])
const schedule = () => ({ matches: [...history(), ...[1, 2, 3].flatMap(n => [match(`S${n}`, 10, 'A', 'B'), match(`W${n}`, 10, 'F', 'D')])] })
const evidenceFor = (db, logs) => buildSeasonOpponentEvidence({ db, logs })
const baseEntry = { seasonRatingStatus: 'FORMAL', eligible: true, seasonOvr: 80, seasonOvrCap: 99 }
const corrected = (evidence, entry = baseEntry) => applySeasonOpponentAdjustment({ ...entry, seasonOpponentEvidence: evidence })

test('series Elo reads prior competition days and gives long and short formats equal weight', () => {
  const db = { matches: [match('FIRST', 1), match('NEXT', 2)] }
  assert.equal(context(db, 'FIRST').teamARating, 1500)
  assert.equal(context(db, 'FIRST').teamAPriorMatches, 0)
  assert.equal(context(db, 'NEXT').teamARating, 1516)
  assert.equal(context(db, 'NEXT').teamBRating, 1484)
  assert.equal(context(db, 'NEXT').teamAPriorMatches, 1)
  const longFormat = structuredClone(db)
  longFormat.matches[0].format = 'FT4'
  longFormat.matches[0].team_a.score = 4
  longFormat.matches[0].team_b.score = 3
  assert.equal(context(longFormat, 'NEXT').teamARating, 1516)
})

test('same-day order and UTC midnight cannot expose another series result', () => {
  const matches = [match('FIRST', 1), match('SAME_DAY', 1, 'A', 'C', 0), match('NEXT', 2)]
  const a = { matches }
  const b = { matches: [...matches].reverse() }
  for (const id of ['FIRST', 'SAME_DAY', 'NEXT']) assert.deepEqual(context(a, id), context(b, id))
  assert.equal(context(a, 'SAME_DAY').teamARating, 1500)
  assert.equal(context(a, 'NEXT').teamAPriorMatches, 2)
  assert.equal(context(a, 'NEXT').teamARating, 1500)
  const localDay = { matches: [match('LATE', 1, 'A', 'B', 1, { scheduled_at: '2026-06-01T17:00:00Z' }), match('EARLY', 2)] }
  assert.equal(context(localDay, 'EARLY').teamARating, 1500)
  assert.equal(context(localDay, 'LATE').date, '2026-06-02')
})

test('future outcomes and published final ranks cannot change past opponent evidence', () => {
  const db = schedule()
  const logs = [1, 2, 3].map(n => log(`S${n}`))
  const before = evidenceFor(db, logs)
  const future = structuredClone(db)
  future.matches.push(match('FUTURE', 20, 'B', 'C', 0))
  future.matches.forEach(m => { m.team_a.current_rank = 99; m.team_b.swiss_rank = 1; m.updated_at = '2099-01-01T00:00:00Z' })
  assert.deepEqual(evidenceFor(future, logs), before)
  const changedCurrentOutcomes = structuredClone(db)
  changedCurrentOutcomes.matches = changedCurrentOutcomes.matches.map(m => m.match_id.startsWith('S') ? match(m.match_id, 10, 'A', 'B', 0) : m)
  assert.deepEqual(evidenceFor(changedCurrentOutcomes, logs), before)
})

test('forfeits, rulings, byes, unfinished, missing and inconsistent results do not rate teams', () => {
  const invalid = [
    { result_mode: 'FORFEIT' }, { result_mode: 'OVERRULED' }, { is_forfeit: true }, { is_bye: true },
    { is_administrative: true }, { status: 'PENDING' }, { scheduled_at: '', updated_at: '2026-06-01T00:00:00Z' },
    { scheduled_date: '2026-02-30' }, { winner: 'UNKNOWN' }, { winner: 'B' },
    { team_a: { id: 'A', score: null }, team_b: { id: 'B', score: null }, winner: '' },
    { team_a: { id: 'A', score: '' }, winner: '' }, { team_a: { id: 'BYE', score: 2 }, winner: 'BYE' },
    { team_b: { id: 'A', score: 0 } }, { team_b: { id: '', score: 0 } }
  ]
  for (const extra of invalid) {
    const db = { matches: [match('BAD', 1, 'A', 'B', 1, extra), match('NEXT', 2)] }
    assert.equal(context(db, 'BAD').eligible, false, JSON.stringify(extra))
    assert.equal(context(db, 'NEXT').teamARating, 1500, JSON.stringify(extra))
    assert.equal(context(db, 'NEXT').teamAPriorMatches, 0, JSON.stringify(extra))
    assert.equal(evidenceFor(db, [log('BAD')]).requestedAdjustment, 0)
  }
  const draw = { matches: [match('DRAW', 1, 'A', 'B', 0.5), match('NEXT', 2)] }
  assert.equal(context(draw, 'NEXT').teamARating, 1500)
  assert.equal(context(draw, 'NEXT').teamAPriorMatches, 1)
})

test('canonical IDs win over stale raw IDs and duplicate aliases never guess an opponent', () => {
  const db = schedule()
  db.matches.find(m => m.match_id === 'S1').raw_match_id = 'OLD-S1'
  const canonical = evidenceFor(db, [log('S1', 'A')])
  assert.deepEqual(evidenceFor(db, [log('S1', 'A', 20, { rawMatchId: 'W1' })]), canonical)
  assert.deepEqual(evidenceFor(db, [log('UNKNOWN', 'A', 20, { rawMatchId: 'OLD-S1' })]), canonical)
  assert.equal(evidenceFor(db, [log('S1', 'F', 20, { rawMatchId: 'W1' })]).matchedMinutes, 0)
  assert.equal(evidenceFor(db, [log('S1', '')]).matchedMinutes, 0)
  const collision = structuredClone(db)
  collision.matches.find(m => m.match_id === 'W1').raw_match_id = 'OLD-S1'
  assert.equal(evidenceFor(collision, [log('OLD-S1', 'A')]).matchedMinutes, 0)
  const duplicate = structuredClone(db)
  duplicate.matches.push(structuredClone(duplicate.matches.find(m => m.match_id === 'S1')))
  assert.equal(context(duplicate, 'S1'), null)
  assert.equal(evidenceFor(duplicate, [log('S1')]).matchedMinutes, 0)
})

test('strong and weak opponents yield symmetric corrections independent of the current result', () => {
  const db = schedule()
  const strong = evidenceFor(db, [1, 2, 3].map(n => log(`S${n}`)))
  const weak = evidenceFor(db, [1, 2, 3].map(n => log(`W${n}`, 'F')))
  assert.ok(strong.requestedAdjustment > 0.5)
  assert.equal(strong.requestedAdjustment, -weak.requestedAdjustment)
  assert.equal(corrected(strong).seasonOvr, 81)
  assert.equal(corrected(weak).seasonOvr, 79)
})

test('hero switches share one match and missing time attenuates, rather than amplifies, strength', () => {
  const db = schedule()
  const whole = evidenceFor(db, [log('S1')])
  const split = evidenceFor(db, [log('S1', 'A', 5), log('S1', 'A', 15)])
  assert.deepEqual(split, whole)
  const withUnknown = evidenceFor(db, [log('S1'), log('UNKNOWN', 'A', 20)])
  assert.equal(withUnknown.status, 'PARTIAL')
  assert.equal(withUnknown.coverage, 0.5)
  assert.ok(Math.abs(withUnknown.requestedAdjustment - whole.requestedAdjustment / 2) < 0.001)
  assert.equal(withUnknown.matchCount, 1)
  assert.equal(withUnknown.sampleWeight, 0.333)
  const mature = evidenceFor(db, [1, 2, 3].map(n => log(`S${n}`)))
  assert.ok(Math.abs(mature.requestedAdjustment - whole.requestedAdjustment * 3) < 0.002)
})

test('new opponents and short opponent histories remain neutral or attenuated', () => {
  const db = { matches: [match('FIRST', 1, 'B', 'C'), match('SECOND', 2, 'A', 'B')] }
  const first = evidenceFor(db, [log('FIRST', 'B')])
  assert.equal(first.status, 'NO_HISTORY')
  assert.equal(first.requestedAdjustment, 0)
  const second = evidenceFor(db, [log('SECOND')])
  assert.equal(second.meetings[0].rating, 1516)
  assert.equal(second.meetings[0].historyWeight, 0.333)
  assert.ok(Math.abs(second.requestedAdjustment - 16 / 3 / 3 / 50) < 0.001)
  assert.equal(buildSeasonOpponentEvidence().status, 'UNAVAILABLE')
  assert.equal(buildSeasonOpponentEvidence({ totalMinutes: 60 }).requestedAdjustment, 0)
})

test('the final adjustment is bounded, symmetrically rounded and respects sample caps and unrated entries', () => {
  for (const [requested, expected] of [[100, 3], [-100, -3], [0.5, 1], [-0.5, -1], [0.49, 0], [-0.49, 0]]) {
    assert.equal(corrected({ requestedAdjustment: requested }).seasonOpponentAdjustment, expected)
  }
  assert.equal(corrected({ requestedAdjustment: 3 }, { ...baseEntry, seasonOvr: 98 }).seasonOvr, 99)
  assert.equal(corrected({ requestedAdjustment: -3 }, { ...baseEntry, seasonOvr: 61 }).seasonOvr, 60)
  const capped = corrected({ requestedAdjustment: 3 }, { ...baseEntry, seasonOvr: 91, seasonOvrCap: 92 })
  assert.equal(capped.seasonOvr, 92)
  assert.equal(capped.seasonOpponentAdjustment, 1)
  const provisional = corrected({ requestedAdjustment: 3 }, { ...baseEntry, seasonRatingStatus: 'PROVISIONAL', eligible: false, seasonOvr: null, provisionalSeasonOvr: 89, seasonOvrCap: 89 })
  assert.equal(provisional.seasonOvr, null)
  assert.equal(provisional.provisionalSeasonOvr, 89)
  assert.equal(provisional.seasonOpponentAdjustment, 0)
  const unrated = corrected({ requestedAdjustment: 3 }, { ...baseEntry, seasonRatingStatus: 'UNRATED', seasonOvr: null })
  assert.equal(unrated.seasonOvrBeforeOpponent, null)
  assert.equal(unrated.seasonOvr, null)
})

test('the scoring adapter follows role logs and historical teams, with neutral aggregate fallback', () => {
  const db = schedule()
  const totals = { elims: 30, assists: 10, deaths: 3, damage: 10000, healing: 10, blocked: 10 }
  db.players = [{ player_id: 'P', team_id: 'F', match_logs: [1, 2, 3].flatMap(n => [
    { matchId: `S${n}`, teamId: 'A', mapOrder: 1, hero: 'Tracer', role: 'DPS', playtimeMinutes: 20, totals },
    { matchId: `W${n}`, teamId: 'F', mapOrder: 2, hero: 'Kiriko', role: 'SUPPORT', playtimeMinutes: 20, totals }
  ]) }]
  const input = { player_id: 'P', team_id: 'F', roleMapsPlayed: 6, roleTimeMins: 60, roleMatchesPlayed: 3, metrics: { per10: {} } }
  const scoreRows = source => scoreLeaderboardEntries(['DPS', 'SUPPORT'].map(role => ({ ...input, role, entryKey: `P:${role}`, most_played_hero: role === 'DPS' ? 'Tracer' : 'Kiriko' })), 30, { db: source, seasonId: 'TEST' })
  const rows = scoreRows(db)
  assert.ok(rows[0].seasonOpponentEvidence.requestedAdjustment > 0)
  assert.ok(rows[1].seasonOpponentEvidence.requestedAdjustment < 0)
  const withoutHistoricalTeams = structuredClone(db)
  withoutHistoricalTeams.players[0].match_logs.forEach(row => delete row.teamId)
  assert.equal(scoreRows(withoutHistoricalTeams)[1].seasonOpponentEvidence.matchedMinutes, 0)
  const aggregate = scoreRows({ ...db, players: [] })
  assert.ok(aggregate.every(row => row.seasonOpponentAdjustment === 0))
})

test('published OVRs retain eligibility, base performance and sorted ranks while exposing auditable adjustments', () => {
  const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const entries = getLeaderboardEntries(db, getSeasonById('FCR26'))
  for (const entry of entries) {
    assert.equal(entry.ratingModelVersion, 'v1.2')
    assert.equal(entry.seasonOpponentEvidence.version, SEASON_OPPONENT_POLICY.version)
    assert.ok(Math.abs(entry.seasonOpponentAdjustment) <= 3, entry.entryKey)
    assert.ok(entry.seasonOpponentEvidence.coverage <= 1, entry.entryKey)
    if (entry.eligible) {
      assert.equal(entry.seasonOvr, entry.seasonOvrBeforeOpponent + entry.seasonOpponentAdjustment)
      assert.ok(entry.seasonOvr <= entry.seasonOvrCap)
    } else assert.equal(entry.overallRank, null)
  }
  const ranked = sortLeaderboardEntries(entries, 'score', 'desc').filter(row => row.eligible)
  assert.deepEqual(ranked.map(row => row.overallRank), ranked.map((_, index) => index + 1))
})
