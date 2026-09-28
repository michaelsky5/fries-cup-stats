import { groupBy, mean, rounded } from './internalTeamStrengthData.mjs'
import { TEAM_STRENGTH_POLICY } from './internalTeamStrengthEngine.mjs'

const loss = (p, result) => -result * Math.log(Math.max(1e-9, p)) - (1 - result) * Math.log(Math.max(1e-9, 1 - p))
const accuracy = (p, result) => Math.abs(p - 0.5) < 1e-12 ? 0.5 : Number((p > 0.5) === (result === 1))
const quantile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * p)] ?? null
}

export function summarizePredictions(predictions) {
  const rows = predictions.filter(row => row.result !== 0.5)
  return { matches: rows.length, excludedDraws: predictions.length - rows.length,
    models: Object.fromEntries(TEAM_STRENGTH_POLICY.models.map(model => [model, {
      brier: rounded(mean(rows.map(row => (row.probabilities[model] - row.result) ** 2)), 6),
      logLoss: rounded(mean(rows.map(row => loss(row.probabilities[model], row.result))), 6),
      accuracy: rounded(mean(rows.map(row => accuracy(row.probabilities[model], row.result))), 6),
      tiedPredictions: rows.filter(row => Math.abs(row.probabilities[model] - 0.5) < 1e-12).length,
      // Fold to the favored side to avoid dependence on arbitrary A/B ordering.
      calibration: [0.5, 0.6, 0.7, 0.8, 0.9].map((lower, index) => {
        const bin = rows.filter(row => {
          const confidence = Math.max(row.probabilities[model], 1 - row.probabilities[model])
          return confidence >= lower && (index === 4 || confidence < lower + 0.1 - 1e-12)
        })
        return { lower, upper: rounded(lower + 0.1, 1), count: bin.length,
          predicted: rounded(mean(bin.map(row => Math.max(row.probabilities[model], 1 - row.probabilities[model])))),
          observed: rounded(mean(bin.map(row => accuracy(row.probabilities[model], row.result)))) }
      })
    }])) }
}

export function pairedDayBootstrap(predictions, candidate, reference = 'elo', replicates = 1000) {
  const groups = [...groupBy(predictions.filter(row => row.result !== 0.5), row => `${row.seasonId}:${row.date}`).values()]
  let seed = 20260926
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32 }
  const differences = groups.map(rows => ({ n: rows.length, sum: rows.reduce((sum, row) => sum + loss(row.probabilities[candidate], row.result) - loss(row.probabilities[reference], row.result), 0) }))
  if (groups.length < 2) return { days: groups.length, difference: null, interval: null }
  const samples = []
  for (let i = 0; i < replicates; i += 1) {
    let sum = 0, count = 0
    for (let j = 0; j < groups.length; j += 1) { const group = differences[Math.floor(random() * groups.length)]; sum += group.sum; count += group.n }
    samples.push(sum / count)
  }
  return { days: groups.length, difference: rounded(differences.reduce((sum, row) => sum + row.sum, 0) / differences.reduce((sum, row) => sum + row.n, 0), 6),
    interval: [quantile(samples, 0.025), quantile(samples, 0.975)].map(value => rounded(value, 6)),
    interpretation: 'Exploratory paired competition-day bootstrap; repeated teams across days remain dependent. Negative favors the candidate.' }
}

export function evaluateSeasons(seasons) {
  const summaries = seasons.map(season => ({ seasonId: season.seasonId,
    all: summarizePredictions(season.predictions),
    withHistory: summarizePredictions(season.predictions.filter(row => row.priorMatchesA >= 3 && row.priorMatchesB >= 3)),
    comparisons: Object.fromEntries(['glicko', 'roster', 'performance'].map(model => [model, pairedDayBootstrap(season.predictions, model)])) }))
  const development = summaries.filter(season => TEAM_STRENGTH_POLICY.developmentSeasons.includes(season.seasonId))
  if (development.length !== TEAM_STRENGTH_POLICY.developmentSeasons.length) throw new Error('Both development seasons are required before selecting a candidate')
  const developmentScores = Object.fromEntries(TEAM_STRENGTH_POLICY.models.map(model => [model, mean(development.map(season => season.all.models[model].logLoss))]))
  const developmentChoice = [...TEAM_STRENGTH_POLICY.models].sort((a, b) => developmentScores[a] - developmentScores[b])[0]
  const validation = summaries.find(season => season.seasonId === TEAM_STRENGTH_POLICY.validationSeason)
  return { summaries, developmentScores, developmentChoice,
    developmentRegressions: development.filter(season => season.all.models[developmentChoice].logLoss > season.all.models.elo.logLoss).map(season => season.seasonId),
    performanceIncrement: Object.fromEntries(seasons.map(season => [season.seasonId, pairedDayBootstrap(season.predictions, 'performance', 'roster')])),
    validationImprovesOverElo: validation ? validation.all.models[developmentChoice].logLoss < validation.all.models.elo.logLoss : null,
    validationDifference: validation && developmentChoice !== 'elo' ? validation.comparisons[developmentChoice] : null,
    status: 'EXPERIMENTAL', adoptedForPairing: false,
    selectionPolicy: 'Lowest equal-season mean log loss on FCA26 and FCR26. Fixed model order breaks ties. QGCS4 is reported after selection and never used to select or refit coefficients.',
    limitations: [
      'Retrospective reconstruction from current archives; historical data availability and scheduled lineup announcements are not fully archived.',
      'QGCS4 was inspected in previous work and is a historical temporal validation set, not a pristine blind test.',
      'Separate season/component rating pools; no automatic cross-event strength calibration or game-rank inference.',
      'Intervals express model uncertainty; coverage and experimental band boundaries are not externally calibrated.',
      'Actual lineups are observed after a match, so unexpected substitutions cannot improve that match\'s pre-game prediction.',
      'Roster and performance variants are hypotheses. Player skill and team synergy are not separately identified.'
    ] }
}
