import fs from 'node:fs'
import path from 'node:path'
import catalog from '../src/generated/seasons.json' with { type: 'json' }
import { getGlobalSummary } from '../../../src/lib/selectors.js'
import { getMatchDossier } from '../../../src/lib/matchDetailSelectors.js'
import { getPlayerDossier, getPlayerRoleAnalysis } from '../../../src/lib/playerDetailSelectors.js'
import { getLeaderboardEntries, getEntryMetricValue } from '../../../src/lib/leaderboardSelectors.js'
import { getGroupStandings, getSwissStandingsRows, getFinalRanking, getPlayoffBracket, getBreakthroughBracket, getAdvanceSummary, resolvePublishedAdvanceTeams } from '../../../src/lib/advanceSelectors.js'
import { resolvePublicMatchIdentities } from '../../../src/lib/publicMatchIdentity.js'
import { buildMapAtlas } from '../../../src/features/map-atlas/mapAtlasModel.js'
import { buildHeroFieldGuide } from '../../../src/features/hero-data/heroDataModel.js'
import { getStaffProfile, getEventStaffDirectory } from '../../../src/lib/staffProfiles.js'
import { getTeamDirectory, getStaffDirectory } from '../../../src/lib/rosterSelectors.js'
import { buildTeamIndexPreview } from '../../../src/features/team-index/teamIndexModel.js'
import { getPlayerAppearances, getPlayerSeasonJourney } from '../../../src/features/player-dossier/playerDossierPresentation.js'
import { getPlayerArchive } from '../../../src/features/player-dossier/playerArchiveModel.js'
import { buildTournamentStory, buildPlayerStory } from '../../../src/lib/reviewStoryBuilders.js'
import { prepareReviewDb } from '../../../src/lib/reviewSeason.js'

const input = process.argv[2]
const season = catalog.find(item => item.id === (process.argv[3] || 'FCR26'))
const raw = JSON.parse(fs.readFileSync(path.join(input, `${season.id}-public.json`)))
const db = resolvePublicMatchIdentities(resolvePublishedAdvanceTeams({ ...raw, meta: { ...raw.meta, season_id: season.id, season_name: season.name.zh, season_code: season.publicCode } }, season))
const entries = getLeaderboardEntries(db, season)
const dossier = getPlayerDossier(db, db.players[0].player_id, '', season)
const appearances = getPlayerAppearances(db, dossier.basePlayer)
const staff = [...getEventStaffDirectory(db), ...getStaffDirectory(db)]
const preview = buildTeamIndexPreview(db, season, db.teams[0])
const review = prepareReviewDb(db)
const story = buildTournamentStory(review)
const fields = {
  season: season.id, global: getGlobalSummary(db), standings: (season.id === 'QGCS4' ? getGroupStandings(db, season)[0] : getSwissStandingsRows(db, season)[0]),
  final: getFinalRanking(db, { seasonFinished: true })[0], advance: getAdvanceSummary(db, season),
  playoff: getPlayoffBracket(db, season), breakthrough: getBreakthroughBracket(db, season), team: getTeamDirectory(db)[0], teamPreview: preview,
  entry: entries[0], dossier: { ...dossier, rows: undefined, roleEntries: dossier.roleEntries.slice(0, 1) },
  analysis: getPlayerRoleAnalysis(db, dossier.basePlayer, dossier.selectedRoleData.entry, season),
  archive: getPlayerArchive(appearances), journey: getPlayerSeasonJourney(appearances),
  atlas: buildMapAtlas(db).maps[0], hero: buildHeroFieldGuide(db).heroes[0],
  staff: staff[0] && getStaffProfile(db, staff[0].id),
  story, playerStory: buildPlayerStory(review, db.players[0].player_id),
  match: db.matches[0], matchDossier: getMatchDossier(db, db.matches[0].match_id), teamRaw: db.teams[0], playerRaw: db.players[0]
}
function reduce(value, depth = 0) {
  if (depth > 5) return Array.isArray(value) ? `[${value.length}]` : typeof value === 'object' && value ? Object.keys(value) : value
  if (value instanceof Map || value instanceof Set) return { size: value.size }
  if (Array.isArray(value)) return { count: value.length, first: value.length ? reduce(value[0], depth + 1) : null }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reduce(item, depth + 1)]))
  return value
}
const result = reduce(fields)
fs.writeFileSync(path.join(input, `${season.id}-model-shapes.json`), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ season: season.id, entries: entries.length, staff: staff.length, storyKeys: Object.keys(story), sceneKeys: Object.keys(story.scenes?.[0] || {}), fields: Object.keys(result) }))
