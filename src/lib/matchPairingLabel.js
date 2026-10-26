import { getTeamLabel, safeArr } from './matchesSelectors.js'
import { resolvePublicMatchIdentity } from './publicMatchIdentity.js'
import { getMatchLookupIds } from './weeklyMatchIdentity.js'

const lookupKey = value => String(value ?? '').trim().toLowerCase()

// 票 2.44: the browser tab names the pairing, like the page heading; callers add where it sits.
// The layout loads this on every page, so it stays out of matchDetailSelectors (weekly landing budget).
export function getMatchPairingLabel(db, matchId) {
  const target = lookupKey(matchId)
  const found = safeArr(db?.matches).find(match => getMatchLookupIds(match).some(id => lookupKey(id) === target)) || null
  const match = resolvePublicMatchIdentity(found, db?.teams, db?.weekly_competition)
  if (!match) return null
  return { match, pairing: `${getTeamLabel(match.team_a)} vs ${getTeamLabel(match.team_b)}` }
}
