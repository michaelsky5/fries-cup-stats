import assert from 'node:assert/strict'

import {
  getFrozenRatingBaselineSnapshot,
  listFrozenRatingBaselineSnapshots
} from '../src/config/frozenRatingBaselines.js'
import {
  buildRatingBaselinesFromDb,
  buildRatingBaselinesFromPlayerLogs
} from '../src/lib/ratingBaselines.js'
import { attachRatingModelScoreToLeaderboardRows } from '../src/lib/scoringEngineAdapter.js'

const snapshot = getFrozenRatingBaselineSnapshot('FCR26')

assert.ok(snapshot)
assert.equal(snapshot.freezeId, 'FCR26_SWISS_FINAL_RATING_V1_2')
assert.equal(snapshot.ratingModelVersion, 'v1.2')
assert.equal(snapshot.source.publishVersion, 153)
assert.equal(snapshot.source.meaningfulStatRows, 2030)
assert.equal(snapshot.cleaning.validLogs, 2030)
assert.equal(snapshot.heroes.length, 49)
assert.equal(snapshot.scoringProfiles.length, 27)
assert.equal(snapshot.subroles.length, 5)
assert.match(snapshot.source.checksum, /^[a-f0-9]{64}$/)
assert.match(snapshot.source.payloadSha256, /^[a-f0-9]{64}$/)
assert.equal(listFrozenRatingBaselineSnapshots().length, 1)

const runtimePlayers = [{
  player_id: 'FCR26_ASSERT_PLAYER',
  team_id: 'FCR26_ASSERT_TEAM',
  role: 'SUP',
  match_logs: [{
    matchId: 'FCR26-LCQ-ASSERT',
    mapOrder: 1,
    hero: 'Kiriko',
    role: 'SUP',
    playtimeMinutes: 10,
    totals: {
      elims: 8,
      assists: 18,
      deaths: 3,
      damage: 2800,
      healing: 8200,
      blocked: 0
    }
  }]
}]

const frozen = buildRatingBaselinesFromPlayerLogs(runtimePlayers, { seasonId: 'FCR26' })
const dynamic = buildRatingBaselinesFromPlayerLogs(runtimePlayers, {
  seasonId: 'FCR26',
  useFrozenBaselines: false
})

assert.equal(frozen.generatedFrom, 'frozen_swiss_snapshot')
assert.equal(frozen.baselineMode, 'frozen')
assert.equal(frozen.freezeId, snapshot.freezeId)
assert.equal(frozen.logs.length, 1, 'runtime player logs must remain dynamic after the baseline is frozen')
assert.equal(frozen.byHero.Kiriko.sampleLogs, snapshot.heroes.find(hero => hero.key === 'Kiriko').sampleLogs)
assert.equal(dynamic.generatedFrom, 'runtime_db')
assert.equal(dynamic.byHero.Kiriko.sampleLogs, 1)

const dbBaselines = buildRatingBaselinesFromDb({ players: runtimePlayers }, { seasonId: 'FCR2026' })
assert.equal(dbBaselines.freezeId, snapshot.freezeId)

const scored = attachRatingModelScoreToLeaderboardRows({
  entries: [{
    entryKey: 'FCR26_ASSERT_PLAYER:SUPPORT',
    player_id: 'FCR26_ASSERT_PLAYER',
    team_id: 'FCR26_ASSERT_TEAM',
    role: 'SUPPORT',
    roleTimeMins: 10,
    roleMapsPlayed: 1,
    most_played_hero: 'Kiriko',
    metrics: {
      per10: { elim: 8, ast: 18, dth: 3, dmg: 2800, heal: 8200, block: 0 }
    }
  }],
  players: runtimePlayers,
  seasonId: 'FCR26'
})[0]

assert.equal(scored.ratingBaselineMode, 'frozen')
assert.equal(scored.ratingBaselineFreezeId, snapshot.freezeId)
assert.equal(scored.ratingBaselineSourceVersion, 153)

console.log(JSON.stringify({
  freezeId: snapshot.freezeId,
  sourcePublishVersion: snapshot.source.publishVersion,
  sourceUpdatedAt: snapshot.source.updatedAt,
  validSwissLogs: snapshot.cleaning.validLogs,
  runtimeLogsRemainDynamic: frozen.logs.length,
  heroBaselines: snapshot.heroes.length,
  scoringProfiles: snapshot.scoringProfiles.length,
  subroles: snapshot.subroles.length
}, null, 2))
