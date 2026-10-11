import { roomDecisionSnapshot } from './roomDecisionEvents.js'
import { roomOperationEvents } from './roomPersonnelEvents.js'

// Highlight only confirmed public changes, including corrections within one map.
export function getRoomLineupHighlights(data, snapshot = roomDecisionSnapshot(data)) {
  const highlights = { A: {}, B: {} }
  if (!snapshot.lineups) return highlights
  for (const side of ['A', 'B']) {
    const current = new Map(snapshot.lineups[side].players.map(player => [player.playerId, player]))
    const changes = [snapshot.lineups[side].changes, ...roomOperationEvents(data)
      .filter(event => event.kind === 'LINEUP_CHANGE' && event.mapOrder === snapshot.map.order && event.side === side)
      .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0))]
    for (const change of changes) {
      for (const player of change.removed) if (!current.has(player.playerId)) highlights[side][player.playerId] = { kind: 'OUT' }
      for (const player of change.added) if (current.has(player.playerId)) highlights[side][player.playerId] = { kind: 'IN' }
      for (const player of change.roles) if (['DPS', 'TANK', 'SUP'].includes(player.previousRole) && player.previousRole !== player.role && current.get(player.playerId)?.role === player.role && highlights[side][player.playerId]?.kind !== 'IN') {
        highlights[side][player.playerId] = { kind: 'ROLE', previousRole: player.previousRole, role: player.role }
      }
    }
  }
  return highlights
}
