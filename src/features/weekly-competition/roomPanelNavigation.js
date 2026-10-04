const PANELS = new Set(['teams', 'info', 'more', 'communication', 'records', 'forfeit', 'preparation'])

export function getRoomPanel(state, matchId) {
  const panel = state?.roomPanel
  return panel?.matchId === matchId && PANELS.has(panel.key) ? panel : null
}

export function getRoomPanelNavigation(location, matchId, key) {
  const current = getRoomPanel(location.state, matchId)
  if (!key) {
    // Opening a panel adds one history entry, so Back dismisses it before leaving the room.
    if (!current) return null
    if (current.originKey) return { to: -1 }
    const { roomPanel: _panel, ...state } = location.state || {}
    return { to: { pathname: location.pathname, search: location.search, hash: location.hash }, options: { replace: true, state } }
  }
  if (!PANELS.has(key) || current?.key === key) return null
  return {
    to: { pathname: location.pathname, search: location.search, hash: location.hash },
    options: { replace: Boolean(current), preventScrollReset: true,
      state: { ...location.state, roomPanel: { key, matchId, originKey: current?.originKey || location.key } } }
  }
}
