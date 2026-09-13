import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { buildWeeklyOverview } from '../weekly-overview/weeklyOverviewModel.js'

export const WEEKLY_SCHEDULE_STATUSES = ['all', 'live', 'upcoming', 'final', 'review', 'changed', 'unknown']
const text = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()
const category = state => ['complete', 'ruling'].includes(state) ? 'final' : ['postponed', 'cancelled'].includes(state) ? 'changed' : state
const idOf = team => String(team?.id || team?.team_id || '')

export function weeklyMatchDay(match) {
  const schedule = formatMatchSchedule(match)
  if (!schedule.hasSchedule) return 'tbd'
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(getMatchScheduleValue(match)))
}

export function buildWeeklySchedule(db, { cycleId, weekId, query = '', teamId = '', status = 'all', followedOnly = false, followedTeamIds = [] } = {}) {
  const overview = buildWeeklyOverview(db, { cycleId, weekId, followedTeamIds })
  const selectedWeekId = weekId === 'all' ? 'all' : overview.week?.id || ''
  const scope = overview.weekEntries.filter(entry => selectedWeekId === 'all' || entry.week.id === selectedWeekId)
  const terms = text(query).split(/\s+/).filter(Boolean)
  const follows = new Set(followedTeamIds.map(text))
  const isFollowed = match => [match.team_a, match.team_b].some(team => follows.has(text(idOf(team))))
  const teamOptions = [...new Map(scope.flatMap(entry => entry.matches).flatMap(match => [match.team_a, match.team_b]).map(team => [idOf(team), team])).values()]
    .filter(team => idOf(team)).sort((a, b) => String(a.short || a.name).localeCompare(String(b.short || b.name)))
  const matchesSearch = match => {
    const teams = [match.team_a, match.team_b]
    const haystack = text(teams.flatMap(team => [team?.name, team?.short, team?.team_name, team?.team_short_name]).join(' '))
    return terms.every(term => haystack.includes(term)) && (!teamId || teams.some(team => idOf(team) === teamId)) && (!followedOnly || isFollowed(match))
  }
  const candidates = scope.flatMap(entry => entry.matches).filter(matchesSearch)
  const counts = Object.fromEntries(WEEKLY_SCHEDULE_STATUSES.map(key => [key, key === 'all' ? candidates.length : candidates.filter(match => category(match.state) === key).length]))
  const activeStatus = WEEKLY_SCHEDULE_STATUSES.includes(status) ? status : 'all'
  const entries = scope.map(entry => {
    const matches = entry.matches.filter(match => matchesSearch(match) && (activeStatus === 'all' || category(match.state) === activeStatus))
    const days = new Map()
    matches.forEach(match => {
      const day = weeklyMatchDay(match)
      if (!days.has(day)) days.set(day, [])
      days.get(day).push({ ...match, followed: isFollowed(match) })
    })
    return { week: entry.week, matches, days: [...days].sort(([a], [b]) => a === 'tbd' ? 1 : b === 'tbd' ? -1 : a.localeCompare(b)).map(([day, rows]) => ({ day, matches: rows })) }
  }).filter(entry => entry.matches.length)
  return { ...overview, selectedWeekId, entries, counts, activeStatus, teamOptions,
    total: scope.reduce((sum, entry) => sum + entry.matches.length, 0),
    resultCount: entries.reduce((sum, entry) => sum + entry.matches.length, 0),
    hasFilters: Boolean(terms.length || teamId || followedOnly || activeStatus !== 'all') }
}

export function resetWeeklyScheduleSearch(search) {
  const params = new URLSearchParams(search)
  for (const key of ['query', 'team', 'teamId', 'status', 'followed', 'following', 'tab', 'view', 'focus']) params.delete(key)
  return params
}
