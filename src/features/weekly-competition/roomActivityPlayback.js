// New operations may be announced while reading, but never replace a held item.
// Retain the newest pending operation until playback resumes in the same room.
export function observeRoomActivity(previous, { scope, ids, held }) {
  if (previous?.scope !== scope) return { state: { scope, ids: new Set(ids), pendingId: null }, activeId: ids[0] || '', announcedId: '' }
  const fresh = ids.find(id => !previous.ids.has(id))
  const pendingId = fresh || (ids.includes(previous.pendingId) ? previous.pendingId : null)
  const activeId = !held && pendingId ? pendingId : null
  return {
    state: { scope, ids: new Set(ids), pendingId: held ? pendingId : null },
    activeId,
    announcedId: fresh || null,
  }
}
