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

// A queued notice describes a persisted decision. Only ask for an action when
// that same turn still needs it; opening another panel must not freeze the copy.
export function roomPenaltyPresentation(event, data) {
  const stage = data?.phaseClock?.stage
  const sameMap = data?.map?.order === event.mapOrder
  const open = data?.phase === 'PREPARING' && !data.result && !data.archived && sameMap
  const later = roomPenaltySnapshot(data)?.events.some(item => item.side === event.side && item.count > event.count)
  const lineupPending = !data?.map?.lineupLocks?.[event.side] && data?.map?.[`lineup${event.side}`]?.length !== 5
  const randomLineup = event.outcome === 'RANDOM_MAP' && stage?.kind === 'LINEUP' && lineupPending
    && (!event.mapName || data.map.name === event.mapName) && data.map.selectionMethod === 'TIMEOUT_RANDOM'
  const sameTurn = event.outcome !== 'RANDOM_MAP' && stage?.kind === event.kind
    && (event.kind === 'LINEUP' ? lineupPending : stage.side === event.side)
  const historical = !open || later || stage?.mapOrder !== event.mapOrder || !(sameTurn || randomLineup)
  if (historical) return { historical: true, message: event.kind === 'BAN'
    ? '该轮禁用已记录为超时放弃，不得补禁用。'
    : event.outcome === 'RANDOM_MAP' ? '该次超时已由系统随机选图处理。'
    : event.outcome === 'WARNING' ? '本次超时警告已记录。' : '该图禁用权已取消。' }
  return { historical: false, message: event.outcome === 'RANDOM_MAP'
    ? '本图禁用权已取消，系统已随机选择地图。请按最新地图重新确认首发。'
    : event.kind === 'BAN' ? '本轮禁用已超时，系统已记录放弃本轮禁用权，不得补禁用。'
    : event.kind === 'MAP' ? event.outcome === 'WARNING'
      ? '本次为超时警告。已追加 60 秒，请及时确认地图；本次补时不再追加补交宽限。'
      : '本图禁用权已取消。已追加 60 秒，请及时确认地图；本次补时不再追加补交宽限。'
    : event.outcome === 'WARNING' ? '本次为超时警告。请尽快完成当前环节。'
      : '本图禁用权已取消。请尽快完成当前环节，首发仍须由队伍确认。' }
}
