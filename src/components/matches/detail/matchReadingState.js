// Reading actions preserve the match, event, filters and map disclosure state.
export function getCompactMapSelection(maps, requestedOrder) {
  const index = maps.findIndex(map => map.order === Number(requestedOrder))
  const selectedIndex = index >= 0 ? index : 0
  return { map: maps[selectedIndex], previous: maps[selectedIndex - 1], next: maps[selectedIndex + 1] }
}

export function getMatchStatsViewSearch(search, full) {
  const next = new URLSearchParams(search)
  if (full) next.set('mapStats', 'full')
  else next.delete('mapStats')
  return next
}

export function getMatchAnalysisSearch(search, { findPlayer = false } = {}) {
  const next = new URLSearchParams(search)
  next.set('analysis', '1')
  const view = next.get('pview')
  const comparisonVisible = view === 'compare' || (!['maps', 'summary'].includes(view) && (next.has('compareA') || next.has('compareB')))
  if (findPlayer && comparisonVisible) next.set('pview', 'summary')
  return next
}

export function getMatchMapDataSearch(search, orders, expanded) {
  const next = new URLSearchParams(search)
  const collapsed = new Set((next.get('collapsed') || '').split(',').filter(Boolean))
  for (const order of orders) {
    if (!Number.isInteger(Number(order)) || Number(order) < 1) continue
    if (expanded) collapsed.delete(String(order))
    else collapsed.add(String(order))
  }
  if (collapsed.size) next.set('collapsed', [...collapsed].join(','))
  else next.delete('collapsed')
  return next
}
