import { sortRoomLineup, validRoomLineup } from './roomLineups.js'

const signature = value => JSON.stringify(value)
const lineupsPublic = map => map?.lineupsRevealed === true || (map?.lineupsRevealed == null && map?.lineupMode !== 'SIMULTANEOUS' && ['A', 'B'].every(side => validRoomLineup(map?.[`lineup${side}`] || [])))
const identity = player => player.playerId || player.id
const lineupKey = lineup => lineup.map(player => [identity(player), player.role]).sort(([a], [b]) => a.localeCompare(b))

export function compareRoomLineups(previous, current) {
  if (!validRoomLineup(previous || [])) return { baseline: false, added: [], removed: [], roles: [] }
  const before = new Map(previous.map(player => [identity(player), player]))
  const after = new Map(current.map(player => [identity(player), player]))
  return {
    baseline: true,
    added: current.filter(player => !before.has(identity(player))),
    removed: previous.filter(player => !after.has(identity(player))),
    roles: current.filter(player => before.has(identity(player)) && before.get(identity(player)).role !== player.role)
      .map(player => ({ ...player, previousRole: before.get(identity(player)).role })),
  }
}

// Use only the server's public, confirmed state. Local lineup drafts never enter this snapshot.
export function roomDecisionSnapshot(data) {
  const scope = `${data.match.id}:${data.actor.id}`
  const map = data.map
  if (!map?.name || data.result || data.opening?.mapOrder > map.order) return { scope, map: null, events: [], lineups: null }
  const setup = data.opening?.mapOrder === map.order ? data.opening?.setup : null
  const publicMap = { ...map, ...(setup ? { banA: setup.banA, banB: setup.banB, banAStatus: setup.banAStatus, banBStatus: setup.banBStatus, firstBanSide: setup.firstBanSide } : {}) }
  const context = `${map.order}:${map.lineupContext || ''}`
  const events = [{ kind: 'MAP', key: `${context}:MAP:${signature([map.name, map.chooserSide, map.attackFirstSide])}` }]
  let lineups = null
  if (lineupsPublic(map) && ['A', 'B'].every(side => validRoomLineup(map[`lineup${side}`] || []))) {
    const previous = [...(data.maps || [])].filter(item => item.order < map.order && lineupsPublic(item)).sort((a, b) => b.order - a.order)[0]
    lineups = Object.fromEntries(['A', 'B'].map(side => {
      const roster = data.rosters?.find(item => item.teamId === data.match[`team${side}`].id)
      const enrich = player => ({ ...roster?.members.find(item => item.id === identity(player)), ...player, playerId: identity(player) })
      const current = sortRoomLineup(map[`lineup${side}`].map(enrich))
      return [side, { players: current, changes: compareRoomLineups(previous?.[`lineup${side}`]?.map(enrich), current) }]
    }))
    events.push({ kind: 'LINEUPS', key: `${context}:LINEUPS:${signature(['A', 'B'].map(side => lineupKey(map[`lineup${side}`])))}` })
  }
  if (publicMap.firstBanSide) events.push({ kind: 'BAN_ORDER', key: `${context}:ORDER:${publicMap.firstBanSide}` })
  for (const side of ['A', 'B']) if (publicMap[`ban${side}`]) events.push({ kind: `BAN_${side}`, side, hero: publicMap[`ban${side}`], key: `${context}:BAN_${side}:${publicMap[`ban${side}`]}` })
  for (const side of ['A', 'B']) if (publicMap[`ban${side}Status`] === 'TIMED_OUT') events.push({ kind: 'BAN_TIMEOUT', side, key: `${context}:BAN_${side}:TIMED_OUT` })
  return { scope, map: publicMap, events, lineups }
}

export function changedRoomDecisions(previous, current) {
  if (!previous || previous.scope !== current.scope) return []
  const known = new Set(previous.events.map(event => event.key))
  return current.events.filter(event => !known.has(event.key))
}
