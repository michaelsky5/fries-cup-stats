import { getMatchLookupIds } from '../../lib/weeklyMatchIdentity.js'
import { pickUiLocale } from '../../lib/uiText.js'
import { buildWeeklyOverview } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyCycleTitle } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyElimination } from './weeklyEliminationModel.js'

const text = value => String(value ?? '').trim()
const idOf = team => text(team?.id || team?.team_id).toLowerCase()
const honorsBySnapshot = new WeakMap()

// 票 2.19: cycle placements from the same published medal bracket the advance page
// draws. Only a complete bracket counts; a standings rank never becomes an honour.
// Newest cycle first, then by placement.
export function getWeeklyCycleHonors(db) {
  if (!db || typeof db !== 'object') return []
  if (honorsBySnapshot.has(db)) return honorsBySnapshot.get(db)
  const cycles = Array.isArray(db.weekly_competition?.cycles) ? db.weekly_competition.cycles : []
  const honors = []
  for (const cycle of cycles) {
    if (!text(cycle?.id)) continue
    let overview, placements = []
    try {
      overview = buildWeeklyOverview(db, { cycleId: cycle.id })
      if (text(overview.cycle?.id) !== text(cycle.id)) continue
      placements = buildWeeklyElimination(db, overview)?.placements || []
    } catch { continue }
    if (placements.length !== 4) continue
    // Every id a public match is known by, so a player's appearances can be placed in this cycle.
    const matchIds = new Set(overview.weekEntries.flatMap(entry => entry.matches.flatMap(getMatchLookupIds)))
    placements.forEach(placement => honors.push({ teamId: idOf(placement.team), team: placement.team, rank: placement.rank, cycle: overview.cycle, matchIds }))
  }
  honors.sort((a, b) => Number(b.cycle.sequence || 0) - Number(a.cycle.sequence || 0) || a.rank - b.rank)
  honorsBySnapshot.set(db, honors)
  return honors
}

export function getTeamCycleHonors(db, team) {
  const id = typeof team === 'object' ? idOf(team) : text(team).toLowerCase()
  return id ? getWeeklyCycleHonors(db).filter(honor => honor.teamId === id) : []
}

// A player shares a team's honour only when the published record shows them
// playing for that team in that cycle.
export function getPlayerCycleHonors(db, appearances = []) {
  return getWeeklyCycleHonors(db).filter(honor => appearances.some(appearance =>
    idOf(appearance.team) === honor.teamId && honor.matchIds.has(text(appearance.matchId))))
}

export function weeklyHonorLabel(honor, locale) {
  const cycle = weeklyCycleTitle(honor.cycle, locale)
  const place = [
    ['优胜者', ' winner', ' 우승', '優勝者'],
    ['亚军', ' runner-up', ' 준우승', '亞軍'],
    ['季军', ' third place', ' 3위', '季軍'],
    ['第四名', ' fourth place', ' 4위', '第四名']
  ][honor.rank - 1]
  return place ? `${cycle}${pickUiLocale(locale, ...place)}` : cycle
}
