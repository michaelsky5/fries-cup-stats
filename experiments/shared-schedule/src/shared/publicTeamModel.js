import { getTeamDirectory, getPlayerDirectory, getTeamRosterPlayers } from '../../../../src/lib/rosterSelectors.js'
import { getTeamMatchRows } from '../generated/canonicalTeamModel.js'
import { getDossierMatch, buildDossierSummary, getDossierJourneyStages } from '../../../../src/features/team-dossier/teamDossierPresentation.js'
import { getTeamResearch } from '../../../../src/features/team-dossier/teamDossierResearch.js'
import { buildTeamPerformance } from '../../../../src/features/team-dossier/teamPerformance.js'

export function publicTeamModel(raw, id, stage = '') {
  const team = getTeamDirectory(raw).find(item => item.routeId === id)
  if (!team) return null
  const directory = new Map(getPlayerDirectory(raw).map(item => [item.player_id, item]))
  const roster = getTeamRosterPlayers(raw, team).map(item => directory.get(item.player_id) || item)
  const allRows = getTeamMatchRows(raw.matches, team).map(row => getDossierMatch(row))
  const rows = stage ? allRows.filter(row => row.match.stage === stage) : allRows
  return { team, roster, rows, allRows, summary: buildDossierSummary(rows), stages: getDossierJourneyStages(allRows), research: getTeamResearch(rows, roster), report: buildTeamPerformance(rows, roster) }
}
