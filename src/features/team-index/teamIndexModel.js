import { getGroupStandings, getSwissStandingsRows, isGroupCompetition } from '../../lib/advanceSelectors.js'
import { getMatchArchiveStages } from '../../lib/matchArchiveStages.js'
import { getTeamRosterPlayers, getPlayerDisplayIdentity, normalizeRosterRole } from '../../lib/rosterSelectors.js'
import { getTeamSeasonPresentation } from '../../lib/teamSeasonPresentation.js'
import { getPlayerRosterChange } from '../../lib/rosterStage.js'

const key = value => String(value || '').trim().toLowerCase()
const ids = team => [team?.team_id, team?.teamId, team?.id].map(key).filter(Boolean)
const names = team => [team?.team_short_name, team?.teamShortName, team?.shortName, team?.short, team?.team_name, team?.teamName, team?.fullName, team?.name].map(key).filter(Boolean)

export function matchesIndexTeam(left, right) {
  const leftIds = ids(left)
  const rightIds = ids(right)
  // Published IDs take priority over reused team names.
  if (leftIds.length && rightIds.length) return leftIds.some(id => rightIds.includes(id))
  const leftKeys = [...leftIds, ...names(left), key(left?.routeId)].filter(Boolean)
  const rightKeys = [...rightIds, ...names(right), key(right?.routeId)].filter(Boolean)
  return leftKeys.some(value => rightKeys.includes(value))
}

export function buildTeamIndexPreview(db, season, team, locale = 'zh-CN') {
  if (!team) return null
  const matches = (db?.matches || []).filter(match => matchesIndexTeam(team, match.team_a) || matchesIndexTeam(team, match.team_b))
  const groupCompetition = isGroupCompetition(season, db)
  const standings = groupCompetition ? getGroupStandings(db, season).flatMap(group => group.rows) : getSwissStandingsRows(db, season)
  const standing = standings.find(row => matchesIndexTeam(team, row))
  return {
    roster: getTeamRosterPlayers(db, team).map(player => ({ ...player, identity: getPlayerDisplayIdentity(player), role: normalizeRosterRole(player.role), rosterChange: getPlayerRosterChange(player) })),
    stages: getMatchArchiveStages(matches),
    scheduleCount: matches.length,
    standing: getTeamSeasonPresentation({ db, season, team, standing, groupCompetition, locale })
  }
}
