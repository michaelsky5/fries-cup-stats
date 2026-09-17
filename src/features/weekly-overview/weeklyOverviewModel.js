// Public weekly data is projected by System's weeklyPublishSnapshot.js.
// Scores never determine lifecycle or replace the published cycle standings.
const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const upper = value => text(value).toUpperCase()
const PUBLIC_CYCLES = new Set(['ACTIVE', 'PLAYOFFS', 'CLOSED'])
const PUBLIC_WEEKS = new Set(['PUBLISHED', 'IN_PROGRESS', 'RESULT_REVIEW', 'CLOSED'])

export function isWeeklyOverview(db, season) {
  return db?.weekly_competition?.schema_version === 'friescup-weekly-public-v1' || season?.rules?.weeklyCompetition?.enabled === true
}

export function weeklyMatchState(match) {
  const status = upper(match?.status)
  if (['CANCELLED', 'CANCELED', 'VOID'].includes(status)) return 'cancelled'
  if (status === 'POSTPONED') return 'postponed'
  if (match?.is_forfeit || ['FORFEIT', 'ADMIN_COMPLETED'].includes(status)) return 'ruling'
  if (['COMPLETE', 'COMPLETED', 'FINISHED'].includes(status)) return 'complete'
  if (['LIVE', 'IN_PROGRESS'].includes(status)) return 'live'
  if (['RESULT_REVIEW', 'PENDING_REVIEW'].includes(status)) return 'review'
  if (['PENDING', 'SCHEDULED', 'PUBLISHED', 'READY', 'UPCOMING'].includes(status)) return 'upcoming'
  return 'unknown'
}

export function weeklyScore(value) {
  if (value === null || value === undefined || text(value) === '' || typeof value === 'boolean') return '—'
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? String(number) : '—'
}

export function weeklyMapSlots(match) {
  const maps = list(match?.maps)
  const rr5 = upper(match?.format) === 'RR5'
  const count = rr5 ? 5 : maps.length
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1
    const map = maps.find((item, mapIndex) => (Number(item.map_order) > 0 ? Number(item.map_order) : mapIndex + 1) === order)
    const state = !map ? 'pending' : map.is_administrative ? 'ruling'
      : ['LIVE', 'IN_PROGRESS'].includes(upper(map.status)) ? 'live'
        : map.winner || ['COMPLETE', 'COMPLETED'].includes(upper(map.status)) || /[1-9]/.test(text(map.match_time || map.time)) ? 'recorded' : 'pending'
    return { order, map, state }
  })
}

const teamId = team => text(team?.id || team?.team_id)
const matchId = match => text(match?.match_id || match?.id || match?.raw_match_id)
const timeOf = match => Date.parse(match?.scheduled_at) || Number.MAX_SAFE_INTEGER
const weekNumber = week => Number(week?.week_number) || 0

export function buildWeeklyOverview(db, { cycleId, weekId, match: requestedMatch, followedTeamIds = [] } = {}) {
  const snapshot = db?.weekly_competition
  const cycles = snapshot?.schema_version === 'friescup-weekly-public-v1'
    ? list(snapshot.cycles).filter(cycle => PUBLIC_CYCLES.has(upper(cycle.status))) : []
  const newest = [...cycles].sort((a, b) => Number(b.sequence || 0) - Number(a.sequence || 0))
  const cycle = cycles.find(item => text(item.id) === text(cycleId))
    || newest.find(item => ['ACTIVE', 'PLAYOFFS'].includes(upper(item.status))) || newest[0] || null
  const weeks = list(cycle?.weeks).filter(week => PUBLIC_WEEKS.has(upper(week.status))).sort((a, b) => weekNumber(a) - weekNumber(b))
  const week = weeks.find(item => text(item.id) === text(weekId))
    || weeks.find(item => upper(item.status) === 'IN_PROGRESS')
    || weeks.find(item => upper(item.status) === 'RESULT_REVIEW')
    || weeks.find(item => upper(item.status) === 'PUBLISHED') || weeks.at(-1) || null
  const teams = new Map(list(db?.teams).map(team => [teamId(team), team]))
  const publicMatches = new Map()
  list(db?.matches).forEach(match => {
    for (const key of [match.match_id, match.raw_match_id, match.id]) {
      if (key != null) publicMatches.set(text(key), match)
    }
  })
  const getMatches = selectedWeek => {
    const seen = new Set()
    return list(selectedWeek?.match_ids).flatMap(id => {
      const match = publicMatches.get(text(id))
      if (!match || seen.has(matchId(match))) return []
      // A week may only disclose its own matches, even when IDs resolve.
      if (match.cycle_week_id && text(match.cycle_week_id) !== text(selectedWeek.id)) return []
      if (match.cycle_id && text(match.cycle_id) !== text(cycle?.id)) return []
      if (match.is_bye || [match.team_a, match.team_b].some(team => /^(bye|轮空)$/i.test(teamId(team)) || /^(bye|轮空)$/i.test(text(team?.name)))) return []
      seen.add(matchId(match))
      return [{ ...match, id: matchId(match), state: weeklyMatchState(match),
        team_a: { ...teams.get(teamId(match.team_a)), ...match.team_a },
        team_b: { ...teams.get(teamId(match.team_b)), ...match.team_b } }]
    }).sort((a, b) => timeOf(a) - timeOf(b) || a.id.localeCompare(b.id))
  }
  const weekEntries = weeks.map(item => ({ week: item, matches: getMatches(item) }))
  const matches = weekEntries.find(entry => entry.week.id === week?.id)?.matches || []
  const isFollowed = match => [match.team_a, match.team_b].some(team => followedTeamIds.includes(teamId(team)))
  const focus = matches.find(match => match.id === requestedMatch)
    || matches.find(match => match.state === 'live' && isFollowed(match))
    || matches.find(match => match.state === 'live')
    || matches.find(match => match.state === 'review')
    || matches.find(match => match.state === 'upcoming')
    || [...matches].reverse().find(match => ['complete', 'ruling'].includes(match.state)) || matches[0] || null
  const standings = list(cycle?.standings).map(row => ({ ...row, team: teams.get(text(row.team_id)) || row }))
  return { cycles, cycle, weeks, week, weekEntries, matches, focus, standings,
    complete: matches.filter(match => ['complete', 'ruling'].includes(match.state)).length,
    live: matches.filter(match => match.state === 'live').length,
    followedMatches: weekEntries.flatMap(entry => entry.matches).filter(isFollowed),
    isPilot: cycle?.counts_toward_standings === false }
}
