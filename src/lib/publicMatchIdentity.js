import { getPublishedTeamLogo } from './teamLogoResolver.js'

const teamId = team => String(team?.id || team?.team_id || team?.teamId || '').trim().toLowerCase()
const teamDirectory = teams => new Map((Array.isArray(teams) ? teams : []).map(team => [teamId(team), team]))

function resolveTeam(reference, directory) {
  if (!reference || getPublishedTeamLogo(reference)) return reference
  const id = teamId(reference)
  const logo = id && getPublishedTeamLogo(directory.get(id))
  // Join only by published identity. Names can repeat between teams and seasons.
  // Copy only the logo; registration totals must never become match scores.
  return logo ? { ...reference, team_logo: logo } : reference
}

export function resolvePublicMatchIdentity(match, teams) {
  if (!match) return match
  const directory = teams instanceof Map ? teams : teamDirectory(teams)
  const teamA = resolveTeam(match.team_a, directory)
  const teamB = resolveTeam(match.team_b, directory)
  const weekly = match.cycle_week_id && (!match.stage || String(match.stage).toUpperCase() === 'OTHER')
  if (!weekly && teamA === match.team_a && teamB === match.team_b) return match
  return { ...match, team_a: teamA, team_b: teamB,
    ...(weekly ? { stage: 'WEEKLY', raw_stage: match.raw_stage ?? match.stage } : {}) }
}

export function resolvePublicMatchIdentities(db) {
  if (!Array.isArray(db?.matches)) return db
  const directory = teamDirectory(db.teams)
  const matches = db.matches.map(match => resolvePublicMatchIdentity(match, directory))
  return matches.some((match, index) => match !== db.matches[index]) ? { ...db, matches } : db
}
