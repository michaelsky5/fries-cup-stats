import fs from 'node:fs'
import path from 'node:path'
import { SEASONS } from '../src/shared/publicSeasons.js'
import { validatePublicSnapshot } from '../src/shared/publicSnapshot.js'
import { historicalModel, publicEvidence, filterHistoricalMatches, historicalLeaderboard } from '../src/shared/historicalModel.js'
import { emptyFollowing } from '../src/shared/followingStore.js'
import { getPlayerDossier } from '../../../src/lib/playerDetailSelectors.js'
import { getMatchDossier } from '../../../src/lib/matchDetailSelectors.js'
import { getReviewReadiness } from '../../../src/lib/reviewReadiness.js'
import { buildTournamentStory, buildPlayerStory, buildStaffStory, buildTeamStory } from '../../../src/lib/reviewStoryBuilders.js'
import { prepareReviewDb } from '../../../src/lib/reviewSeason.js'
import assert from 'node:assert/strict'

const input = process.argv[2], output = process.argv[3]
const report = SEASONS.map(season => {
  const raw = validatePublicSnapshot(JSON.parse(fs.readFileSync(path.join(input, `${season.id}-public.json`))), season)
  const model = historicalModel(raw, season, emptyFollowing(season.id))
  const atlas = publicEvidence(raw, season, 'maps'), heroes = publicEvidence(raw, season, 'heroes'), staff = publicEvidence(raw, season, 'staff')
  const matches = model.matches
  assert.equal(matches.length, raw.matches.length)
  const dossier = getMatchDossier(raw, matches.at(-1).match_id)
  assert.ok(dossier.mapRecords.length > 0)
  const player = getPlayerDossier(raw, raw.players[0].player_id, '', season)
  assert.ok(player?.identity.displayName)
  const query = model.teams[0].team_short_name || model.teams[0].shortName
  assert.ok(filterHistoricalMatches(matches, { query }).length > 0)
  const rankings = historicalLeaderboard(raw, season, { role: 'DPS', metric: 'dmg', mode: 'per10', showInsufficient: true }, emptyFollowing(season.id))
  assert.ok(rankings.every(entry => entry.role === 'DPS'))
  const ready = getReviewReadiness(season, raw).available
  const result = { id: season.id, teams: raw.teams.length, players: raw.players.length, matches: matches.length, atlasRecords: atlas.totalRecords, maps: atlas.maps.length, heroes: heroes.heroes.length, heroSamples: heroes.samples, staff: staff.length, dossierMaps: dossier.mapRecords.length, rankingRows: rankings.length, reviewReady: ready }
  if (season.id !== 'FCW26') {
    const advance = publicEvidence(raw, season, 'advance')
    result.phases = advance.phaseState.phases
    result.finalTeams = advance.final.length
    result.groups = advance.groups.length
    assert.ok(advance.final.length > 0)
    if (ready) {
      const db = prepareReviewDb(raw)
      result.tournamentScenes = buildTournamentStory(db).length
      result.playerScenes = buildPlayerStory(db, raw.players[0].player_id).length
      result.teamScenes = buildTeamStory(db, raw.teams[0].team_id).length
      const eventStaff = staff.find(item => ['admin', 'caster'].includes(item.role))
      result.staffScenes = eventStaff ? buildStaffStory(db, eventStaff.role, eventStaff.id.split(':').slice(2).join(':')).length : 0
      assert.ok(result.tournamentScenes && result.playerScenes && result.teamScenes)
    }
  }
  return result
})
fs.writeFileSync(path.join(output, 'public-parity-models.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
