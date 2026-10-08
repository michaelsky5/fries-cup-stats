export const ROOM_ROLE_ORDER = ['DPS', 'DPS', 'TANK', 'SUP', 'SUP']
export const roomRoleCode = role => ({ DPS: 'D', TANK: 'T', SUP: 'S', FLEX: 'F', MANAGER: 'MGR', COACH: 'COA' }[role] || '—')
export const sortRoomLineup = lineup => (Array.isArray(lineup) ? lineup.filter(Boolean) : []).sort((a, b) => ROOM_ROLE_ORDER.indexOf(a.role) - ROOM_ROLE_ORDER.indexOf(b.role))
export const validRoomLineup = lineup => Array.isArray(lineup) && lineup.length === 5 && lineup.every(item => item && typeof item.playerId === 'string' && item.playerId.length > 0) && new Set(lineup.map(item => item.playerId)).size === 5 && ['DPS', 'TANK', 'SUP'].every(role => lineup.filter(item => item.role === role).length === (role === 'TANK' ? 1 : 2))
export function roomLineupTurn(map) {
  if (map?.lineupTurn) return map.lineupTurn
  const first = map?.chooserSide || 'A', second = first === 'A' ? 'B' : 'A'
  return !validRoomLineup(map?.[`lineup${first}`] || []) ? first : !validRoomLineup(map?.[`lineup${second}`] || []) ? second : null
}

export const roomLineupSubmitted = (map, side) => Boolean(map?.lineupLocks?.[side] || validRoomLineup(map?.[`lineup${side}`] || []))
export const canSubmitRoomLineup = (map, side) => !roomLineupSubmitted(map, side)
  && (map?.lineupMode === 'SIMULTANEOUS' || roomLineupTurn(map) === side)
