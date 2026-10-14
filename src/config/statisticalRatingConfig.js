export const STATISTICAL_RATING_VERSION = 'v1.5.0'
export const STATISTICAL_RATING_SEASONS = Object.freeze(['FCW26'])
export const STAT_KEYS = Object.freeze(['elims', 'assists', 'deaths', 'damage', 'healing', 'blocked'])
export const EVIDENCE_SCHEMA_VERSION = 'hero-rating-evidence-v1'

// Season totals are retrospective. Published map/match scoring keeps its cutoff.
export const STATISTICAL_RATING_SEASON_REFERENCE = Object.freeze({
  version: 'v1.5-season-2026.10.14',
  cutoff: 'CURRENT_PUBLISHED_SEASON_SAME_VERSION_ENTIRE_MATCH_HELD_OUT',
  scope: 'SEASON_OVR_AND_PLAYER_DOSSIER'
})

// A fixed reference membership for the three published cold-start matches.
// Only map/match presentation uses this fixed set; season references are separate.
export const STATISTICAL_RATING_BACKFILL = Object.freeze({
  version: 'v1.5-backfill-2026.10.14',
  seasonId: 'FCW26',
  throughDay: '2026-10-11',
  targetMatchIds: Object.freeze(['FCW26-SWISS-R1-M01', 'FCW26-SWISS-R1-M02', 'FCW26-SWISS-R1-M12']),
  referenceMatchIds: Object.freeze([
    'FCW26-SWISS-R1-M03', 'FCW26-SWISS-R1-M04', 'FCW26-SWISS-R1-M05', 'FCW26-SWISS-R1-M06',
    'FCW26-SWISS-R1-M07', 'FCW26-SWISS-R1-M08', 'FCW26-SWISS-R1-M09', 'FCW26-SWISS-R1-M10',
    'FCW26-SWISS-R1-M13', 'FCW26-SWISS-R1-M14', 'FCW26-SWISS-R1-M15'
  ])
})

// These are engineering gates and interpretation rules, not measured accuracy.
export const STATISTICAL_RATING_POLICY = Object.freeze({
  formula: 'CONTINUOUS_WEIGHTED_MID_DISTRIBUTION',
  parentFormula: 'rating-v1.5-shadow.5/continuous-midrank',
  maturity: Object.freeze({ logs: 20, minutes: 120, matches: 5, players: 5, days: 2 }),
  targetReliability: Object.freeze({ minimumSeconds: 60, basis: 'PROVISIONAL_ENGINEERING_FLOOR' }),
  timezoneOffsetHours: 8,
  firstSeason5Day: '2026-10-07',
  transitionDays: Object.freeze(['2026-10-06']),
  maximumDirectHeroShare: 0.5,
  minimumSourceMatches: 5,
  referenceWeighting: 'EQUAL_MATCH_DURATION_WITHIN_MATCH',
  referenceCutoff: 'STRICTLY_EARLIER_DAYS_ENTIRE_MATCH_HELD_OUT',
  supportMinimumAction: 'REVIEW_ONLY',
  accuracyValidated: false
})
