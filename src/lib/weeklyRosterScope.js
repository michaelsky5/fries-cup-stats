import { isPlayerCurrentlyOnTeam } from './rosterStage.js'
const idOf=player=>String(player.player_id || player.id || player.identity?.playerId || '')
export function weeklyRosterScopes(db,teamId) {
  return (db?.weekly_competition?.cycles || []).flatMap(cycle=>(cycle.weeks || []).filter(week=>(week.rosters || []).some(roster=>String(roster.team_id)===String(teamId))).map(week=>({id:week.id,label:cycle.name+' · '+week.label,playerIds:week.rosters.find(row=>String(row.team_id)===String(teamId)).player_ids})))
}
export function filterWeeklyRoster(players,scope,scopes=[]) {
  if (scope==='history') return players
  if (scope==='current') return players.filter(isPlayerCurrentlyOnTeam)
  const selected=scopes.find(item=>item.id===scope)
  return selected ? players.filter(player=>selected.playerIds.includes(idOf(player))) : []
}
