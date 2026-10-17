import { buildWeeklyOverview, weeklyMapSlots } from '../weekly-overview/weeklyOverviewModel.js'
import { buildWeeklyAwards } from './weeklyAwards.js'
import { collectWeeklyNewsContext } from './weeklyEditorial.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const roles = { TANK: 'TANK', DPS: 'DPS', DAMAGE: 'DPS', SUP: 'SUP', SUPPORT: 'SUP' }
const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1)

// This local reading sample can calculate data awards. Publication timing and
// historical standings still require an authoritative issue snapshot.
function buildWeeklyReportData(db, { cycleId, weekId } = {}) {
  const overview = buildWeeklyOverview(db, { cycleId, weekId })
  const { cycle, week } = overview
  if (!cycle || !week || (cycleId && cycle.id !== cycleId) || (weekId && week.id !== weekId)) return null
  const completed = overview.matches.filter(match => ['complete', 'ruling'].includes(match.state))
  const teams = new Map(list(db?.teams).map(team => [text(team.team_id || team.id), team]))
  const players = new Map(list(db?.players).map(player => [text(player.player_id || player.id), player]))
  const maps = [], mapCounts = new Map(), banCounts = new Map(), entrants = new Map()
  const rosterByMatch = new Map(), seenAppearances = new Set(), matchTeams = new Set()
  let namedBans = 0
  for (const match of completed) {
    const roster = new Map()
    rosterByMatch.set(match.id, roster)
    for (const team of [match.team_a, match.team_b]) if (team?.id || team?.team_id) matchTeams.add(text(team.id || team.team_id))
    for (const slot of weeklyMapSlots(match)) {
      const map = slot.map
      if (!map || slot.state !== 'recorded' || map.is_administrative || match.state === 'ruling') continue
      maps.push({ ...map, matchId: match.id, order: slot.order })
      if (map.map_name) increment(mapCounts, `${map.map_type}|${map.map_name}`)
      for (const side of ['a', 'b']) {
        const hero = text(map[`team_${side}_ban`])
        if (hero && !/^(?:none|null|unknown|—|-|未禁用|无)$/i.test(hero)) { increment(banCounts, hero); namedBans++ }
      }
      for (const row of list(map.player_stats)) {
        const id = text(row.player_id), role = roles[text(row.role).toUpperCase()]
        if (!id || !role) continue
        const identity = `${id}|${role}`, appearance = `${match.id}|${slot.order}|${identity}`
        if (seenAppearances.has(appearance)) continue
        seenAppearances.add(appearance)
        const person = players.get(id)
        const teamId = text(row.team_id || person?.team_id)
        const name = text(person?.display_name || person?.nickname || row.player_name || person?.player_name || id).replace(/#\d+$/, '')
        const entry = entrants.get(identity) || { id, role, name, teamId, team: teams.get(teamId), maps: new Set(), heroes: new Set() }
        entry.maps.add(`${match.id}|${slot.order}`)
        text(row.heroes_played).split(/[、,/]/).map(text).filter(Boolean).forEach(hero => entry.heroes.add(hero))
        entrants.set(identity, entry)
        roster.set(identity, { id, role, name, teamId, team: teams.get(teamId) })
      }
    }
  }
  const roster = [...entrants.values()].map(entry => ({ ...entry, maps: entry.maps.size, heroes: [...entry.heroes] }))
  const eligible = { TANK: 0, DPS: 0, SUP: 0 }
  roster.forEach(entry => { if (entry.maps >= 3) eligible[entry.role]++ })
  const mapFrequency = [...mapCounts].map(([key, count]) => { const [type, name] = key.split('|'); return { type, name, count } }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const bans = [...banCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const closeMatch = completed.filter(match => match.state === 'complete' && [match.team_a?.score, match.team_b?.score].every(score => text(score) && Number.isFinite(Number(score))))
    .sort((a, b) => Math.abs(Number(a.team_a.score) - Number(a.team_b.score)) - Math.abs(Number(b.team_a.score) - Number(b.team_b.score)) || a.id.localeCompare(b.id))[0] || null
  const registration = db?.weekly_competition?.registration
  const nextWeek = registration?.cycle_id === cycle.id && Number(registration.week_number) === Number(week.week_number) + 1 ? registration : null
  const report = {
    cycle, week, overview, seasonId: text(db?.season?.id),
    gameVersion: text(week.game_version || cycle.game_version || db?.weekly_competition?.game_version || db?.season?.game_version) || null,
    preview: true, publication: null, issueStandings: null, updates: null,
    completed, pending: overview.matches.filter(match => !['complete', 'ruling', 'cancelled'].includes(match.state)),
    maps, mapFrequency, bans, namedBans, roster, rosterByMatch, eligible, closeMatch, nextWeek,
    playerCount: new Set(roster.map(entry => entry.id)).size, teamCount: matchTeams.size,
    sourceAt: db?.meta?.ranking_as_of || db?.updated_at || null,
    number: String(Number(week.week_number) || 0).padStart(2, '0')
  }
  return report
}

export function buildWeeklyReportPreview(db, options = {}) {
  const report = buildWeeklyReportData(db, options)
  if (!report) return null
  const referenceReports = report.overview.weeks.filter(week => Number(week.week_number) < Number(report.week.week_number))
    .map(week => buildWeeklyReportData(db, { cycleId: report.cycle.id, weekId: week.id })).filter(Boolean)
  report.awards = buildWeeklyAwards(report, list(db?.players), { referenceReports })
  report.newsContext = collectWeeklyNewsContext(report, referenceReports)
  return report
}

export function weeklyReportPath(report) {
  return `/reports/${encodeURIComponent(report.week.id)}?cycle=${encodeURIComponent(report.cycle.id)}`
}

export function listWeeklyReportPreviews(db, cycleId) {
  const overview = buildWeeklyOverview(db, { cycleId })
  if (cycleId && overview.cycle?.id !== cycleId) return []
  return [...overview.weeks].reverse().map(week => buildWeeklyReportPreview(db, { cycleId: overview.cycle.id, weekId: week.id })).filter(Boolean)
}

export function formatReportTime(value, locale = 'zh-CN') {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat(String(locale).startsWith('en') ? 'en-GB' : 'zh-CN', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date) + ' UTC+8'
}
