import assert from 'node:assert/strict'
import test from 'node:test'
import { getMatchLogDedupKey, getPlayerMatchLogs } from '../src/lib/playerMatchLogs.js'
import { collectRatingLogRowsFromPlayers, buildRatingBaselinesFromPlayerLogs } from '../src/lib/ratingBaselines.js'
import { getLeaderboardEntries } from '../src/lib/leaderboardSelectors.js'

const log = (overrides = {}) => ({ matchId: 'FCA26-SWISS-R1-M01', rawMatchId: 'FCA26-IMPORTED-OLD',
  mapOrder: 1, mapName: 'Busan', mapType: 'Control', teamId: 'A', hero: 'Cassidy', role: 'DPS',
  stage: 'SWISS', source: 'WORKBENCH', rowTime: '', playtimeMinutes: 10,
  totals: { elims: 6, assists: 2, deaths: 3, damage: 8000, healing: 0, blocked: 0 }, ...overrides })
const player = logs => ({ player_id: 'P1', role: 'DPS', team_id: 'A', match_logs: logs })
const collect = logs => collectRatingLogRowsFromPlayers([player(logs)], { seasonId: 'FCA26' })

test('canonical copies with different import metadata count once without mutating logs', () => {
  const original = log()
  const copy = log({ rawMatchId: original.matchId, stage: 'QUALIFIERS', source: 'IMPORT', teamName: 'Renamed team' })
  const input = structuredClone([original, copy])
  const result = collect(input)
  assert.equal(result.rows.length, 1)
  assert.equal(result.cleaning.dedupeRemoved, 1)
  assert.equal(result.rows[0].playtimeMinutes, 10)
  assert.deepEqual(input, [original, copy])
})

test('different canonical matches do not collapse when an import ID is reused', () => {
  assert.equal(collect([log(), log({ matchId: 'FCA26-SWISS-R2-M01' })]).rows.length, 2)
  const p = player([log()])
  assert.equal(collectRatingLogRowsFromPlayers([p, { ...p, player_id: 'P2' }]).rows.length, 2)
})

test('a distinct hero, role, team, map, duration, time segment or statistic is retained', () => {
  const variants = [
    { hero: 'Tracer' }, { role: 'SUPPORT' }, { teamId: 'B' }, { mapOrder: 2 },
    { mapName: 'Ilios' }, { mapType: 'Escort' }, { playtimeMinutes: 5 }, { rowTime: '05:00' },
    { totals: { ...log().totals, damage: 8001 } }
  ]
  for (const variant of variants) assert.equal(collect([log(), log(variant)]).rows.length, 2, JSON.stringify(variant))
})

test('raw-only IDs retain source/stage scope and do not borrow canonical identity', () => {
  const raw = log({ matchId: '', rawMatchId: 'OLD-M1' })
  assert.equal(collect([raw, structuredClone(raw)]).rows.length, 1)
  assert.equal(collect([raw, { ...raw, rawMatchId: 'OLD-M2' }, { ...raw, source: 'OTHER' }, { ...raw, stage: 'PLAYOFFS' }]).rows.length, 4)
  assert.equal(collect([raw, { ...raw, matchId: 'OLD-M1', rawMatchId: '' }]).rows.length, 2)
})

test('unknown match/map identity is preserved, and named maps are distinct without orders', () => {
  const missingMatch = log({ matchId: '', rawMatchId: '' })
  const missingMap = log({ mapOrder: '', mapName: '' })
  for (const row of [missingMatch, missingMap]) {
    assert.equal(getMatchLogDedupKey(row), null)
    assert.equal(collect([row, structuredClone(row)]).rows.length, 2)
  }
  assert.equal(collect([log({ mapOrder: '' }), log({ mapOrder: '', mapName: 'Ilios' })]).rows.length, 2)
})

test('published match logs stay authoritative and live logs are only a fallback', () => {
  const p = { ...player([log()]), live_match_logs: [log(), log({ matchId: 'M2' })] }
  assert.equal(getPlayerMatchLogs(p).logs.length, 1)
  assert.equal(getPlayerMatchLogs({ ...p, match_logs: [] }).logs.length, 2)
  assert.equal(collectRatingLogRowsFromPlayers([p]).cleaning.skippedLiveMatchLogsBecauseMatchLogsExist, 2)
})

test('nonuniform duplicate copies do not alter runtime hero baselines', () => {
  const originals = Array.from({ length: 24 }, (_, index) => ({ ...player([
    log({ totals: { ...log().totals, damage: 1000 + index * 600 } })
  ]), player_id: `P${index}` }))
  const duplicated = originals.map((p, index) => ({ ...p, match_logs: index % 3 === 0
    ? [...p.match_logs, { ...p.match_logs[0], rawMatchId: p.match_logs[0].matchId }] : p.match_logs }))
  const options = { seasonId: 'FCA26', useFrozenBaselines: false }
  const clean = buildRatingBaselinesFromPlayerLogs(originals, options)
  const fixed = buildRatingBaselinesFromPlayerLogs(duplicated, options)
  assert.deepEqual(fixed.byHero.Cassidy, clean.byHero.Cassidy)
  assert.equal(fixed.logs.length, 24)
})

function inflatedDb() {
  const logs = [1, 2, 3].map(round => log({ matchId: `M${round}`, rawMatchId: `OLD-${round}` }))
  const p = player(logs.flatMap(row => [row, { ...row, rawMatchId: row.matchId }]))
  return { players: [p], matches: [], player_totals: [{ player_id: p.player_id, role: 'DPS', team_id: 'A',
    role_breakdown: { DPS: { raw_time_mins: 60, maps_played: 6, total_elim: 36, total_ast: 12,
      total_dth: 18, total_dmg: 48000, total_heal: 0, total_block: 0, most_played_hero: 'Cassidy' } } }] }
}

test('old inflated totals are repaired before eligibility and displayed metrics are calculated', () => {
  const db = inflatedDb()
  const copy = structuredClone(db)
  const [entry] = getLeaderboardEntries(db, { id: 'FCA26' })
  assert.equal(entry.roleMapsPlayed, 3)
  assert.equal(entry.roleTimeMins, 30)
  assert.equal(entry.ratingModelSourceMinutes, 30)
  assert.equal(entry.total_elim, 18)
  assert.equal(entry.total_dmg, 24000)
  assert.equal(entry.seasonRatingStatus, 'PROVISIONAL')
  assert.equal(entry.eligible, false)
  assert.deepEqual(db, copy, 'cached or published input must remain immutable')
})

test('a clean but partial log export does not overwrite its published summary', () => {
  const db = inflatedDb()
  db.players[0].match_logs = [log()]
  const [entry] = getLeaderboardEntries(db, { id: 'FCA26' })
  assert.equal(entry.roleTimeMins, 60)
  assert.equal(entry.roleMapsPlayed, 6)
  assert.equal(entry.total_elim, 36)
})

test('log-only entries do not append a second copy from live logs', () => {
  const p = player([log()])
  p.live_match_logs = [log()]
  const [entry] = getLeaderboardEntries({ players: [p], matches: [] }, { id: 'FCA26' })
  assert.equal(entry.roleTimeMins, 10)
  assert.equal(entry.total_elim, 6)
  assert.equal(entry.roleMapsPlayed, 1)
})
