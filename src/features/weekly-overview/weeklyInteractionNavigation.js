export function participationWeekNumber(value, fallback) {
  for (const candidate of [value, fallback]) {
    if (candidate == null || typeof candidate === 'boolean' || String(candidate).trim() === '') continue
    const week = Number(candidate)
    if (Number.isSafeInteger(week) && week > 0) return week
  }
  return null
}

export function weeklyParticipationPath(registration) {
  const params = new URLSearchParams({ section: 'team', competition: 'FCW26', intent: 'weekly-confirmation' })
  const week = participationWeekNumber(registration?.week_number)
  if (week) params.set('participationWeek', String(week))
  return `/me?${params}`
}

export function weeklyOverviewReturnLocation(location, { cycle, week }, match) {
  const params = new URLSearchParams(location.search)
  if (cycle?.id) params.set('cycle', cycle.id)
  if (week?.id) params.set('week', week.id)
  if (match?.id) params.set('match', match.id)
  return { ...location, pathname: '/', search: params.size ? `?${params}` : '', hash: '' }
}
