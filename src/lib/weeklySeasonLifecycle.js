// A published week is only part of an ongoing weekly season.
// Completing its fixtures (or closing one cycle) does not archive the season.
export function getExplicitWeeklyCompletion(db, season) {
  const weekly = db?.weekly_competition?.schema_version === 'friescup-weekly-public-v1'
    || db?.season?.rules?.weeklyCompetition?.enabled === true
    || season?.rules?.weeklyCompetition?.enabled === true
  if (!weekly) return null
  const lifecycle = String(db?.season?.status || db?.meta?.season_status || season?.lifecycle || '').toUpperCase()
  return ['ARCHIVED', 'COMPLETED'].includes(lifecycle)
}
