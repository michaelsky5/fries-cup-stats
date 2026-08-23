export const SCOUTING_PRO_REFERENCE_VERSION = 'owcs-role-shape-shadow-v1'

const DATASETS = Object.freeze({
  RECENT: Object.freeze({
    id: 'OWCS_2026_STAGE_2',
    label: 'OWCS 2026 Stage 2',
    dateFrom: '2026-06-01',
    dateTo: '2026-07-05',
    matches: 170,
    playerMapObservations: 6175,
    weighting: 'EQUAL_MAP',
    sourceStatus: 'COMMUNITY_PUBLIC_SNAPSHOT',
    sampleBySubrole: Object.freeze({ TANK: 18, HITSCAN: 17, FLEX_DPS: 19, MAIN_SUPPORT: 13, FLEX_SUPPORT: 17 })
  }),
  ELITE: Object.freeze({
    id: 'OWCS_2026_CHAMPIONS_CLASH',
    label: 'OWCS 2026 Champions Clash',
    dateFrom: '2026-05-22',
    dateTo: '2026-05-24',
    matches: 14,
    playerMapObservations: 480,
    weighting: 'DURATION_WEIGHTED_MAP',
    sourceStatus: 'COMMUNITY_PUBLIC_SNAPSHOT',
    sampleBySubrole: Object.freeze({ TANK: 9, HITSCAN: 4, FLEX_DPS: 6, MAIN_SUPPORT: 4, FLEX_SUPPORT: 6 })
  })
})

const band = (q1, median, q3) => Object.freeze({ q1, median, q3 })

// Same-map team-share distributions from the read-only 2026 OWCS pilot.
// Values are percentages of recorded team totals, not cross-tier skill scores.
const REFERENCE_BANDS = Object.freeze({
  TANK: Object.freeze({
    dmg: Object.freeze({ recent: band(26.8, 28.4, 29.1), elite: band(24.2, 26.4, 28.3) }),
    elim: Object.freeze({ recent: band(23.1, 23.8, 24.1), elite: band(23.4, 24.2, 25.0) }),
    dth: Object.freeze({ recent: band(16.5, 18.3, 19.3), elite: band(16.8, 17.5, 19.2) }),
    ast: Object.freeze({ recent: band(12.8, 15.1, 18.3), elite: band(12.0, 14.0, 16.8) }),
    heal: Object.freeze({ recent: band(3.7, 5.6, 6.6), elite: band(3.4, 6.2, 8.5) }),
    block: Object.freeze({ recent: band(75.5, 78.9, 82.0), elite: band(76.0, 78.7, 79.0) })
  }),
  HITSCAN: Object.freeze({
    dmg: Object.freeze({ recent: band(26.3, 27.6, 28.9), elite: band(30.5, 32.6, 33.1) }),
    elim: Object.freeze({ recent: band(22.6, 23.4, 24.4), elite: band(23.8, 24.6, 24.8) }),
    dth: Object.freeze({ recent: band(21.2, 22.0, 23.9), elite: band(22.5, 23.6, 24.7) }),
    ast: Object.freeze({ recent: band(2.7, 3.4, 4.5), elite: band(1.3, 1.9, 2.9) })
  }),
  FLEX_DPS: Object.freeze({
    elim: Object.freeze({ recent: band(22.0, 22.4, 23.4), elite: band(22.0, 22.8, 23.7) }),
    dmg: Object.freeze({ recent: band(21.3, 22.3, 22.9), elite: band(21.2, 21.7, 22.2) }),
    dth: Object.freeze({ recent: band(19.5, 21.0, 22.2), elite: band(19.0, 20.3, 21.4) }),
    ast: Object.freeze({ recent: band(4.2, 5.3, 6.1), elite: band(2.7, 4.3, 6.2) })
  }),
  MAIN_SUPPORT: Object.freeze({
    heal: Object.freeze({ recent: band(35.3, 37.1, 39.9), elite: band(34.7, 36.0, 37.2) }),
    ast: Object.freeze({ recent: band(32.7, 33.4, 35.9), elite: band(33.8, 33.9, 34.6) }),
    dth: Object.freeze({ recent: band(17.4, 18.2, 19.3), elite: band(18.7, 19.8, 20.6) }),
    elim: Object.freeze({ recent: band(15.2, 16.4, 17.8), elite: band(15.9, 16.5, 16.8) }),
    dmg: Object.freeze({ recent: band(8.9, 10.4, 11.7), elite: band(8.5, 9.3, 10.1) })
  }),
  FLEX_SUPPORT: Object.freeze({
    heal: Object.freeze({ recent: band(50.7, 54.0, 56.5), elite: band(53.4, 54.8, 57.1) }),
    ast: Object.freeze({ recent: band(39.0, 40.5, 42.3), elite: band(39.9, 41.3, 44.2) }),
    dth: Object.freeze({ recent: band(16.9, 18.4, 20.3), elite: band(17.1, 18.3, 19.4) }),
    dmg: Object.freeze({ recent: band(10.3, 11.1, 11.6), elite: band(10.7, 11.2, 11.9) }),
    elim: Object.freeze({ recent: band(12.4, 13.1, 13.8), elite: band(13.3, 13.5, 13.6) })
  })
})

const METRIC_ORDER = Object.freeze({
  TANK: ['dmg', 'elim', 'dth', 'ast', 'block'],
  HITSCAN: ['dmg', 'elim', 'dth', 'ast'],
  FLEX_DPS: ['elim', 'dmg', 'dth', 'ast'],
  MAIN_SUPPORT: ['heal', 'ast', 'dth', 'elim', 'dmg'],
  FLEX_SUPPORT: ['heal', 'ast', 'dth', 'dmg', 'elim']
})

const NEGATIVE_DIRECTION_METRICS = new Set(['dth'])

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits))
}

function classifyReferencePosition(value, reference) {
  if (value < reference.q1) return 'BELOW_RANGE'
  if (value > reference.q3) return 'ABOVE_RANGE'
  return 'IN_RANGE'
}

function getFavorableScore(value, reference, direction) {
  const spread = Math.max(0.5, reference.q3 - reference.q1)
  const raw = (value - reference.median) / spread
  return round(direction === 'negative' ? -raw : raw)
}

function getSignal(score) {
  if (score >= 0.35) return 'POSITIVE_SIGNAL'
  if (score <= -0.35) return 'WATCH_SIGNAL'
  return 'REFERENCE_RANGE'
}

function buildDatasetRead(value, reference, direction) {
  const score = getFavorableScore(value, reference, direction)
  return {
    q1: reference.q1,
    median: reference.median,
    q3: reference.q3,
    position: classifyReferencePosition(value, reference),
    favorableScore: score,
    signal: getSignal(score)
  }
}
export function getScoutingProfessionalReferenceMeta() {
  return {
    version: SCOUTING_PRO_REFERENCE_VERSION,
    status: 'SHADOW_ONLY',
    rankingImpact: false,
    strengthEquivalent: false,
    crossTierCalibration: 'UNAVAILABLE',
    roleClassification: 'conservative-hero-anchor-v1',
    candidateMethod: 'same-map-team-share-shadow-v1',
    datasets: DATASETS,
    sources: [
      'https://antkingow.github.io/owcstats-site/assets/data/matches_index.json',
      'https://antkingow.github.io/owcstats-site/assets/data/player_stats.json',
      'https://napori0929.github.io/owcs-stats/data/hero_usage_by_player.csv'
    ]
  }
}

export function buildScoutingProfessionalReference(player) {
  const subrole = player?.subrole
  const roleBands = REFERENCE_BANDS[subrole]
  const contribution = player?.performanceSignals?.opponentStrength?.teamContribution
  if (!roleBands || !contribution?.metrics) return null

  const metrics = (METRIC_ORDER[subrole] || Object.keys(roleBands)).map(metricId => {
    const sharePct = Number(contribution.metrics?.[metricId]?.sharePct)
    const references = roleBands[metricId]
    if (!Number.isFinite(sharePct) || !references) return null
    const direction = NEGATIVE_DIRECTION_METRICS.has(metricId) ? 'negative' : 'positive'
    const recent = buildDatasetRead(sharePct, references.recent, direction)
    const elite = buildDatasetRead(sharePct, references.elite, direction)
    return {
      metricId,
      direction,
      sharePct: round(sharePct, 1),
      recent,
      elite,
      consensusSignal: recent.signal === elite.signal ? recent.signal : 'MIXED_SIGNAL',
      consensusScore: round((recent.favorableScore + elite.favorableScore) / 2)
    }
  }).filter(Boolean)

  if (metrics.length < 3) return null
  const ranked = [...metrics].sort((a, b) => b.consensusScore - a.consensusScore)
  const favorable = ranked.filter(row => row.consensusScore >= 0.2)
  const watch = [...ranked].reverse().find(row => row.consensusScore <= -0.2) || null
  const sameDirection = metrics.filter(row => row.consensusSignal !== 'MIXED_SIGNAL').length

  return {
    version: SCOUTING_PRO_REFERENCE_VERSION,
    status: 'SHADOW_ONLY',
    rankingImpact: false,
    strengthEquivalent: false,
    crossTierStatus: 'UNVERIFIED',
    coveragePct: contribution.coveragePct || 0,
    metricCount: metrics.length,
    directionalAgreementPct: Math.round((sameDirection / metrics.length) * 100),
    signatureMetricIds: (favorable.length ? favorable : ranked).slice(0, 2).map(row => row.metricId),
    watchMetricId: watch?.metricId || null,
    metrics
  }
}
