import { getMatchDossier } from '../../lib/matchDetailSelectors.js'
import { getMatchReviewProgress } from '../../lib/matchReviewSelectors.js'
import { getMatchPhasePresentation } from '../../components/matches/detail/matchPhasePresentation.js'
import { weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'

export function buildFollowingWeeklyMatch(db, match, locale) {
  const dossier = getMatchDossier(db, match.match_id || match.id, { locale })
  const progress = getMatchReviewProgress(dossier)
  const phase = getMatchPhasePresentation(dossier, progress, locale)
  return {
    state: phase.key, label: phase.statusLabel, scoreLabel: phase.scoreTitle,
    caption: phase.caption, rr5: phase.rr5, slots: phase.slots,
    score: ['live', 'review', 'complete', 'ruling', 'forfeit'].includes(phase.key)
      ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'
  }
}

export function followingMatchPath(item, mapOrder) {
  const path = `/matches/${encodeURIComponent(item.id)}`
  const search = new URLSearchParams(item.cycleId ? { cycle: item.cycleId, week: item.weekId } : {})
  if (mapOrder) search.set('map', String(mapOrder))
  return `${path}${search.size ? '?' + search : ''}${mapOrder ? '#map-' + mapOrder : ''}`
}

export function followingScore(item) {
  if (item.presentation) return item.presentation.score
  return ['results', 'live', 'review'].includes(item.group)
    ? item.scoreA != null && item.scoreB != null ? `${item.scoreA} : ${item.scoreB}` : '—' : 'VS'
}
