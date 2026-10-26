import { getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { buildWeeklyElimination } from '../weekly-advance/weeklyEliminationModel.js'
import { buildWeeklyOverview } from './weeklyOverviewModel.js'

// A cycle that closed within this window still gets its winner on the home page next to the new cycle.
const RECENT_CLOSE_MS = 14 * 24 * 60 * 60 * 1000
// A scheduled match keeps the "next match" slot for a while after its start time; live data takes over when published.
const STARTED_GRACE_MS = 6 * 60 * 60 * 1000
const time = value => { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : null }
const upper = value => String(value ?? '').trim().toUpperCase()

// 票 2.66: a published cycle's starts_at is when it opens; its first matches come from week 1's published match window.
function nextCycle(cycles, closed, plan, registration = null) {
  const sequence = Number(closed?.sequence || 0) + 1
  const published = cycles.find(item => Number(item.sequence) === sequence)
  const firstWeek = published && registration?.cycle_id === published.id && Number(registration.week_number) === 1
  if (published) return { sequence, cycle: published, startsAt: time(published.starts_at), firstMatchAt: firstWeek ? time(registration.match_window_starts_at) : null, planned: false }
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

// The week's match window once its confirmation has closed (票 2.66): before the first match and while the window
// runs, from the same published registration fields. Without a published end the window is only shown until it starts.
export function weeklyMatchWindow(db, now = Date.now()) {
  const registration = db?.weekly_competition?.registration
  if (!registration) return null
  const closes = time(registration.closes_at)
  const starts = time(registration.match_window_starts_at)
  const ends = time(registration.match_window_ends_at)
  if (closes === null || closes > now || starts === null) return null
  if (ends === null ? starts <= now : ends <= now) return null
  return { registration, closesAt: closes, startsAt: starts, endsAt: ends, started: starts <= now }
}

// What the weekly home announces, most urgent first (票 2.16):
// live match > weekly confirmation > next match > this week's match window (票 2.66) > a cycle about to start >
// a cycle that just ended > season registration.
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

  // Published pairings say more than the window, so the window only shows while none are out.
  const matchWindow = !live.length && !upcoming.length ? weeklyMatchWindow(db, now) : null
  if (matchWindow) phases.push({ kind: 'weekAhead', ...matchWindow })

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
      if (placements.length === 4) phases.push({ kind: 'cycleClosed', cycle: closed, placements, final: placements[0].match, next: nextCycle(cycles, closed, plan, db?.weekly_competition?.registration) })
    }
  }

  const seasonRegistration = db?.season?.rules?.registration
  if (seasonRegistration?.enabled === true) {
    const closes = time(seasonRegistration.closesAt)
    if (closes === null || closes > now) phases.push({ kind: 'registration', closesAt: closes })
  }
  return phases
}

// 票 2.66: the reader's own step on the weekly card, from the same account data as the status bar. Signed out or not
// yet known: null (the card offers the public choices). `team` is a formal team with nothing open for this account.
export function weeklyAccountStep(account) {
  if (!account?.signedIn) return null
  const next = account.nextAction
  if (['confirm', 'submit'].includes(next?.kind) && next.to) return { kind: next.kind, to: next.to }
  if (next?.kind === 'register') return { kind: 'register' }
  if (['enroll', 'room'].includes(next?.kind)) return { kind: next.kind }
  return account.hasTeam ? { kind: 'team' } : null
}

// Lines beside the main card (票 2.66): the registration line is left out where it would repeat — for someone already
// busy with a team, and under the confirmation card, which carries first registration itself (the line stays there only
// when registration has its own deadline to show). The main card itself is never dropped.
export function keepWeeklyPhaseRow(main, phase, account) {
  if (phase.kind !== 'registration') return true
  if (['team', 'confirm', 'submit', 'enroll', 'room'].includes(weeklyAccountStep(account)?.kind)) return false
  return !(main?.kind === 'confirmation' && !phase.closesAt)
}
