export const ROOM_ROLE_ORDER = ['DPS', 'DPS', 'TANK', 'SUP', 'SUP']
export const roomRoleCode = role => ({ DPS: 'C', TANK: 'T', SUP: 'N' }[role] || '—')
export const sortRoomLineup = lineup => [...lineup].sort((a, b) => ROOM_ROLE_ORDER.indexOf(a.role) - ROOM_ROLE_ORDER.indexOf(b.role))
export const validRoomLineup = lineup => lineup.length === 5 && new Set(lineup.map(item => item.playerId)).size === 5 && ['DPS', 'TANK', 'SUP'].every(role => lineup.filter(item => item.role === role).length === (role === 'TANK' ? 1 : 2))
export function roomLineupTurn(map) {
  if (map?.lineupTurn) return map.lineupTurn
  const first = map?.chooserSide || 'A', second = first === 'A' ? 'B' : 'A'
  return !validRoomLineup(map?.[`lineup${first}`] || []) ? first : !validRoomLineup(map?.[`lineup${second}`] || []) ? second : null
}
