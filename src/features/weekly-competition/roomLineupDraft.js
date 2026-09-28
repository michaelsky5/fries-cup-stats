export function roomLineupDraftKey(data, side) {
  return ['friescup:lineup', data.actor.id, data.match.id, data.map.lineupContext || data.map.order, side].map(encodeURIComponent).join(':')
}

export function readRoomLineupDraft(key, members, storage) {
  try {
    storage ??= globalThis.sessionStorage
    const value = JSON.parse(storage?.getItem(key) || 'null')
    if (!Array.isArray(value) || value.length > 5 || new Set(value.map(row => row?.playerId)).size !== value.length) return null
    if (value.some(row => !members.some(member => member.id === row?.playerId) || !['DPS', 'TANK', 'SUP', 'FLEX'].includes(row?.role))) return null
    return value.map(({ playerId, role }) => ({ playerId, role }))
  } catch { return null }
}

export function saveRoomLineupDraft(key, selected, storage) {
  try { storage ??= globalThis.sessionStorage; storage?.setItem(key, JSON.stringify(selected)); return Boolean(storage) } catch { return false }
}
export function clearRoomLineupDraft(key, storage) {
  try { (storage ?? globalThis.sessionStorage)?.removeItem(key) } catch { /* Keep the current confirmed server state. */ }
}
