export function updateAdvanceReadingSearch(search, patch) {
  const next = new URLSearchParams(search)
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') next.delete(key)
    else next.set(key, String(value))
  }
  return next
}

export function resolveAdvanceTeam(requested, ids, fallback = '') {
  return ids.includes(requested) ? requested : ids.includes(fallback) ? fallback : ids[0] || ''
}

export function playoffRouteOutcome({ won, lost, round, status }) {
  if (won) return round === 'grandFinal' ? 'champion' : 'win'
  if (lost) {
    if (round === 'grandFinal') return 'runner-up'
    if (String(round || '').startsWith('lower')) return 'out'
    return String(round || '').startsWith('upper') ? 'drop' : 'loss'
  }
  return ['active', 'live', 'ongoing', 'in_progress'].includes(String(status || '').toLowerCase()) ? 'live' : 'pending'
}

export function publishedPlayoffWinnerId(match) {
  if (!['completed', 'finished', 'final'].includes(String(match?.status || '').toLowerCase())) return ''
  return String(match?.winner?.team_id || match?.winner?.id || match?.winnerId || '')
}
