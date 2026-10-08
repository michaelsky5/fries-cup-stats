import { compareRoomLineups, roomDecisionSnapshot } from './roomDecisionEvents.js'
import { validRoomLineup } from './roomLineups.js'
const publicLineups = map => map && (map.lineupsRevealed === true || map.lineupsRevealed == null && map.lineupMode !== 'SIMULTANEOUS') && ['A', 'B'].every(side => validRoomLineup(map[`lineup${side}`]))

export function publicRoomLineupChanges(data) {
  const maps = (data.maps || []).filter(publicLineups).sort((a, b) => a.order - b.order)
  return maps.flatMap((map, index) => !index ? [] : ['A', 'B'].flatMap(side => {
    const roster = data.rosters?.find(item => item.teamId === data.match[`team${side}`].id)
    const enrich = player => ({ ...roster?.members?.find(member => member.id === player.playerId), ...player })
    const changes = compareRoomLineups(maps[index - 1][`lineup${side}`].map(enrich), map[`lineup${side}`].map(enrich))
    return changes.added.length || changes.removed.length || changes.roles.length ? [{ id: `lineup-${map.order}-${side}`, kind: 'LINEUP', side, mapOrder: map.order, ...changes }] : []
  })).reverse()
}

export function roomPersonnelEvents(data) {
  return (data.personnelChanges || []).filter(event => event && ['REPRESENTATIVE_ASSIGNED', 'REFEREE_CHANGED', 'EDITOR_HANDOFF'].includes(event.kind) && typeof event.body === 'string')
}

export function roomOperationEvents(data) {
  const players = list => Array.isArray(list) && list.every(player => player && typeof player.playerId === 'string' && ['DPS', 'TANK', 'SUP'].includes(player.role))
  return (data.operationHistory || []).filter(event => event && typeof event.id === 'string' && Number.isInteger(event.mapOrder) && event.mapOrder > 0 &&
    (['LIVE', 'LINEUPS'].includes(event.kind) || event.kind === 'LINEUP_CHANGE' && ['A', 'B'].includes(event.side) && ['added', 'removed', 'roles'].every(key => players(event[key]))))
}

// Saved public starts and lineup changes survive later map states and refreshes.
// Map/Ban/score summaries still follow the current confirmed state after corrections.
export function roomImportantEvents(data) {
  const history = roomOperationEvents(data)
  const recorded = (kind, mapOrder, side) => history.some(event => event.kind === kind && event.mapOrder === mapOrder && (!side || event.side === side))
  const maps = (data.maps || []).filter(map => map?.name).sort((a, b) => b.order - a.order)
  const decisions = maps.flatMap(map => {
    const snapshot = roomDecisionSnapshot({ ...data, map, result: null, opening: data.opening?.mapOrder === map.order ? data.opening : null })
    const events = snapshot.events.filter(event => event.kind !== 'BAN_ORDER' && (event.kind !== 'LINEUPS' || !recorded('LINEUPS', map.order))).map(event => ({ ...event, id: event.key, mapOrder: map.order, map: { name: snapshot.map.name, type: snapshot.map.type } }))
    if ((map.startedAt || map.status === 'LIVE') && !recorded('LIVE', map.order)) events.push({ id: `${map.order}:LIVE`, kind: 'LIVE', mapOrder: map.order, createdAt: map.startedAt || undefined })
    if (map.status === 'COMPLETE' && Number.isFinite(map.scoreA) && Number.isFinite(map.scoreB)) events.push({ id: `${map.order}:RESULT:${map.scoreA}:${map.scoreB}`, kind: 'RESULT', mapOrder: map.order, scoreA: map.scoreA, scoreB: map.scoreB })
    return events.reverse()
  })
  const changes = publicRoomLineupChanges(data).filter(event => !recorded('LINEUP_CHANGE', event.mapOrder, event.side)).map(event => ({ ...event, id: event.id + ':' + JSON.stringify([event.added.map(player => player.playerId), event.removed.map(player => player.playerId), event.roles.map(player => [player.playerId, player.role])]), kind: 'LINEUP_CHANGE' }))
  const personnel = roomPersonnelEvents(data)
  const saved = [...personnel, ...history].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  return [...saved, ...changes, ...decisions]
}
