import { getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { buildWeeklyElimination } from '../weekly-advance/weeklyEliminationModel.js'
import { buildWeeklyOverview } from './weeklyOverviewModel.js'

// A cycle that closed within this window still gets its winner on the home page next to the new cycle.
const RECENT_CLOSE_MS = 14 * 24 * 60 * 60 * 1000
// A scheduled match keeps the "next match" slot for a while after its start time; live data takes over when published.
const STARTED_GRACE_MS = 6 * 60 * 60 * 1000
const time = value => { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : null }
const upper = value => String(value ?? '').trim().toUpperCase()

function nextCycle(cycles, closed, plan) {
  const sequence = Number(closed?.sequence || 0) + 1
  const published = cycles.find(item => Number(item.sequence) === sequence)
  if (published) return { sequence, cycle: published, startsAt: time(published.starts_at), planned: false }
  const planned = (plan?.cycles || []).find(item => Number(item.sequence) === sequence)
  return planned ? { sequence, plan: planned, startsAt: time(`${planned.startsOn}T00:00:00+08:00`), planned: true } : null
}

// This week's confirmation while it is open at `now`, from the public snapshot (票 2.46: the overview
// and the participation guide both read it, signed in or not).
// System keeps CONFIRMATION_OPEN until the next publish; the deadline itself decides here.
export function openWeeklyConfirmation(db, now = Date.now()) {
  const registration = db?.weekly_competition?.registration
  if (!registration) return null
  const opens = time(registration.opens_at)
  const closes = time(registration.closes_at)
  if ((opens !== null && opens > now) || (closes !== null && closes <= now)) return null
  return { registration, closesAt: closes, matchWindowStartsAt: time(registration.match_window_starts_at) }
}

// What the weekly home announces, most urgent first (票 2.16):
// live match > weekly confirmation > next match > a cycle about to start > a cycle that just ended > season registration.
// Only published data and the event plan's dates are used. Plan dates are marked `planned`.
export function buildWeeklyPhases(db, { now = Date.now(), plan = null } = {}) {
  const overview = buildWeeklyOverview(db)
  const { cycles, cycle } = overview
  const matches = overview.weekEntries.flatMap(entry => entry.matches)
  const phases = []

  const live = matches.filter(match => match.state === 'live')
  if (live.length) phases.push({ kind: 'live', match: live[0], count: live.length, cycle })

  const confirmation = openWeeklyConfirmation(db, now)
  if (confirmation) phases.push({ kind: 'confirmation', ...confirmation })

  const upcoming = matches.filter(match => match.state === 'upcoming')
    .map(match => ({ match, at: time(getMatchScheduleValue(match)) }))
    .filter(entry => entry.at !== null && entry.at > now - STARTED_GRACE_MS)
    .sort((a, b) => a.at - b.at)
  if (upcoming.length) phases.push({ kind: 'matchweek', match: upcoming[0].match, startsAt: upcoming[0].at, cycle })

  const cycleStart = time(cycle?.starts_at)
  if (cycle && upper(cycle.status) === 'ACTIVE' && cycleStart !== null && cycleStart > now && !matches.length) {
    phases.push({ kind: 'cycleUpcoming', cycle, startsAt: cycleStart })
  }

  const closed = cycles.filter(item => upper(item.status) === 'CLOSED')
    .sort((a, b) => Number(b.sequence || 0) - Number(a.sequence || 0))[0]
  if (closed) {
    const ended = time(closed.ends_at)
    const succeeded = cycles.some(item => ['ACTIVE', 'PLAYOFFS'].includes(upper(item.status)) && Number(item.sequence || 0) > Number(closed.sequence || 0))
    if (!succeeded || (ended !== null && now - ended < RECENT_CLOSE_MS)) {
      const closedOverview = closed.id === cycle?.id ? overview : buildWeeklyOverview(db, { cycleId: closed.id })
      const placements = buildWeeklyElimination(db, closedOverview)?.placements || []
      if (placements.length === 4) phases.push({ kind: 'cycleClosed', cycle: closed, placements, final: placements[0].match, next: nextCycle(cycles, closed, plan) })
    }
  }

  const seasonRegistration = db?.season?.rules?.registration
  if (seasonRegistration?.enabled === true) {
    const closes = time(seasonRegistration.closesAt)
    if (closes === null || closes > now) phases.push({ kind: 'registration', closesAt: closes })
  }
  return phases
}
