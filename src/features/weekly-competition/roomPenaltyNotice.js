export function roomPenaltySnapshot(data) {
  if (!data) return null
  const own = ['A', 'B'].filter(side => data.access.teamIds?.includes(data.match[`team${side}`]?.id) && data.access.representativeTeams?.includes(data.match[`team${side}`]?.id))
  const scope = `${data.match.id}:${data.actor.id}:${own.join('')}:${Boolean(data.result || data.archived)}`
  if (data.result || data.archived) return { scope, events: [] }
  // The latest map event also supports an older server during a rolling update.
  const penalties = data.phaseClock?.timeoutPenalties ?? (data.phaseClock?.mapTimeouts?.latest ? [{ ...data.phaseClock.mapTimeouts.latest, kind: 'MAP' }] : [])
  const events = penalties.filter(event => own.includes(event.side) && ['WARNING', 'BAN_FORFEIT', 'RANDOM_MAP'].includes(event.outcome))
    .map(event => ({ ...event, key: `${event.kind}:${event.mapOrder}:${event.side}:${event.count}:${event.at}` }))
  const map = data.map
  const setup = data.opening?.mapOrder === map?.order ? data.opening.setup : null
  if (map?.name && !(data.opening?.mapOrder > map.order)) for (const side of own) {
    const source = setup || map
    if (source[`ban${side}Status`] !== 'TIMED_OUT' || source[`ban${side}TimeoutReason`] === 'MAP_SELECTION') continue
    events.push({ kind: 'BAN', outcome: 'BAN_TIMEOUT', side, mapOrder: map.order, key: `BAN:${map.order}:${side}:${source[`ban${side}TimeoutAt`] || ''}` })
  }
  return { scope, events }
}

// Initial snapshots and role/match changes establish a baseline, never replay history.
// Remember all observed keys so temporarily missing records cannot retrigger a popup.
export function observeRoomPenalties(previous, snapshot) {
  if (!snapshot) return { scope: '', seen: new Set(), added: [], reset: true }
  const reset = !previous || previous.scope !== snapshot.scope
  const seen = new Set(reset ? [] : previous.seen)
  const added = []
  for (const event of snapshot.events) {
    if (!reset && !seen.has(event.key)) added.push(event)
    seen.add(event.key)
  }
  return { scope: snapshot.scope, seen, added, reset }
}
