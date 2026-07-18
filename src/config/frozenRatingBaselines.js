import fcr26SwissFinalV12 from '../data/rating-baselines/fcr26-swiss-final-v1.2.json' with { type: 'json' }
import { normalizeSeasonId } from '../features/favorites/normalizeSeasonId.js'
import { RATING_MODEL_VERSION } from './ratingModelConfig.js'

const FROZEN_RATING_BASELINES = {
  FCR2026: fcr26SwissFinalV12
}

function validateSnapshot(snapshot) {
  if (!snapshot) return null
  if (snapshot.formatVersion !== 1) throw new Error(`Unsupported frozen rating baseline format: ${snapshot.formatVersion}`)
  if (snapshot.ratingModelVersion !== RATING_MODEL_VERSION) {
    throw new Error(
      `Frozen rating baseline ${snapshot.freezeId} uses ${snapshot.ratingModelVersion}, expected ${RATING_MODEL_VERSION}.`
    )
  }
  return snapshot
}

export function getFrozenRatingBaselineSnapshot(seasonId) {
  const canonicalSeasonId = normalizeSeasonId(seasonId)
  return validateSnapshot(FROZEN_RATING_BASELINES[canonicalSeasonId] || null)
}

export function listFrozenRatingBaselineSnapshots() {
  return Object.values(FROZEN_RATING_BASELINES).map(validateSnapshot)
}
