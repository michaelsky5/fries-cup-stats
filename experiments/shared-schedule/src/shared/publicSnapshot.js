import { resolvePublicMatchIdentities } from '../../../../src/lib/publicMatchIdentity.js'
import { resolvePublishedAdvanceTeams } from '../../../../src/lib/advanceSelectors.js'
import { validateSnapshot } from './model.js'
import { getSeasonName, isWeeklySeason } from './publicSeasons.js'

export function validatePublicSnapshot(raw, season) {
  const actual = raw?.season?.id || raw?.meta?.season_id
  if (actual && actual !== season.id) throw new Error('赛事快照不匹配')
  if (!['teams', 'players', 'matches', 'player_totals'].every(key => Array.isArray(raw?.[key]))) throw new Error('公开赛事快照无法识别')
  if (isWeeklySeason(season)) return validateSnapshot(raw)
  return resolvePublicMatchIdentities(resolvePublishedAdvanceTeams({ ...raw, meta: { ...raw.meta, season_id: season.id, season_code: season.publicCode, season_name: getSeasonName(season), season_kind: season.kind } }, season))
}
