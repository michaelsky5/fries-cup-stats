import { getGlobalSummary } from '../../../../src/lib/selectors.js'
import { getAllMatches, isFinishedMatch, isLiveMatch, getTeamLabel } from '../../../../src/lib/matchesSelectors.js'
import { getTeamDirectory, getPlayerDirectory, getStaffDirectory } from '../../../../src/lib/rosterSelectors.js'
import { getEventStaffDirectory } from '../../../../src/lib/staffProfiles.js'
import { getAdvanceSummary, getGroupStandings, getSwissStandingsRows, getFinalRanking, getPlayoffBracket, getBreakthroughBracket, isGroupCompetition } from '../../../../src/lib/advanceSelectors.js'
import { getLeaderboardEntries, filterLeaderboardEntries, sortLeaderboardEntries, getRankingMinTimeMins } from '../../../../src/lib/leaderboardSelectors.js'
import { buildMapAtlas } from '../../../../src/features/map-atlas/mapAtlasModel.js'
import { buildHeroFieldGuide } from '../../../../src/features/hero-data/heroDataModel.js'
import { idOf, normalize, playerIdOf } from './centerModel.js'

const cache = new WeakMap()
export function historicalModel(raw, season, following) {
  const teams = getTeamDirectory(raw), players = getPlayerDirectory(raw)
  const matches = getAllMatches(raw)
  const relatedTeams = new Set([...(following.teams || []), ...players.filter(player => following.players.includes(playerIdOf(player))).map(player => player.team_id)])
  return { raw, season, teams, players, matches, summary: getGlobalSummary(raw),
    followedTeams: teams.filter(team => following.teams.includes(team.routeId)), followedPlayers: players.filter(player => following.players.includes(playerIdOf(player))),
    followedMatches: matches.filter(match => [match.team_a, match.team_b].some(team => relatedTeams.has(idOf(team)))),
    unavailableFollows: following.teams.length + following.players.length - teams.filter(team => following.teams.includes(team.routeId)).length - players.filter(player => following.players.includes(playerIdOf(player))).length }
}
export function publicEvidence(raw, season, kind) {
  if (!cache.has(raw)) cache.set(raw, {})
  const entry = cache.get(raw)
  if (entry[kind]) return entry[kind]
  if (kind === 'maps') return entry[kind] = buildMapAtlas(raw)
  if (kind === 'heroes') return entry[kind] = buildHeroFieldGuide(raw)
  if (kind === 'staff') return entry[kind] = [...getEventStaffDirectory(raw), ...getStaffDirectory(raw)]
  if (kind === 'advance') {
    const summary = getAdvanceSummary(raw, season)
    return entry[kind] = { ...summary, groups: isGroupCompetition(season, raw) ? getGroupStandings(raw, season) : [], swiss: isGroupCompetition(season, raw) ? [] : getSwissStandingsRows(raw, season), final: getFinalRanking(raw, { seasonFinished: summary.phaseState.seasonFinished }), playoffs: getPlayoffBracket(raw, season), breakthrough: getBreakthroughBracket(raw, season) }
  }
  if (kind === 'database') return entry[kind] = getLeaderboardEntries(raw, season)
  return null
}
export function filterHistoricalMatches(matches, { query = '', teamId = '', stage = '', round = '', status = 'all', format = '' } = {}) {
  const q = normalize(query)
  return matches.filter(match => (!q || [match.match_id, match.raw_match_id, match.match_display_name, match.round, getTeamLabel(match.team_a), getTeamLabel(match.team_b)].some(value => normalize(value).includes(q))) &&
    (!teamId || [match.team_a, match.team_b].some(team => idOf(team) === teamId)) && (!stage || match.stage === stage) && (!round || match.round === round) && (!format || match.format === format) &&
    (status === 'all' || (status === 'complete' ? isFinishedMatch(match) : status === 'live' ? isLiveMatch(match) : !isFinishedMatch(match) && !isLiveMatch(match))))
}
export function historicalLeaderboard(raw, season, state, following) {
  const entries = filterLeaderboardEntries(publicEvidence(raw, season, 'database'), { tab: state.role === 'all' ? 'overall' : state.role === 'TANK' ? 'tank' : state.role === 'SUPPORT' ? 'support' : 'dps', query: state.query, team: state.teamId || 'ALL', hero: state.hero || 'ALL', following: state.following, showInsufficient: state.showInsufficient, minTimeMins: state.minTime ? getRankingMinTimeMins(season, raw) : 0 }, entry => following.players.includes(entry.player_id))
  return sortLeaderboardEntries(entries, state.metric || 'score', state.direction || 'desc', state.mode || 'per10')
}
