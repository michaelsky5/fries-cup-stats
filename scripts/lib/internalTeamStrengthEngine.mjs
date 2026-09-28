import { clamp, groupBy, mean, rounded } from './internalTeamStrengthData.mjs'

// Registered before running the real-data comparison. These are prototype
// policies, not parameters tuned against the QGCS4 validation outcomes.
export const TEAM_STRENGTH_POLICY = Object.freeze({
  version: 'internal-team-strength-v0.1', initialRating: 1500, initialRd: 350, minimumRd: 50,
  eloK: 32, rdDriftPerSqrtDay: 5, minimumRosterCoverage: 0.8, rosterChangeThreshold: 0.8,
  supportedMatches: 6, supportedOpponents: 3, supportedStableMatches: 3, supportedRd: 200,
  performancePrior: 4, performanceDecay: 0.8, heroBaselineRows: 10, roleBaselineRows: 20,
  zLimit: 2, logMetricSdFloor: 0.2, coefficientRidge: 8, minimumFitRows: 20,
  intervalMultiplier: 1.96, intervalMeaning: 'Approximate model-based interval; empirical coverage has not been validated.',
  developmentSeasons: ['FCA26', 'FCR26'], validationSeason: 'QGCS4',
  models: ['elo', 'glicko', 'roster', 'performance']
})
export const MODEL_LABELS = { elo: '基础 Elo', glicko: 'Glicko', roster: 'Glicko + 阵容', performance: 'Glicko + 阵容 + 表现' }
const Q = Math.log(10) / 400
export const sigmoid = value => 1 / (1 + Math.exp(-clamp(value, -30, 30)))
export const logit = probability => Math.log(clamp(probability, 1e-9, 1 - 1e-9) / (1 - clamp(probability, 1e-9, 1 - 1e-9)))
export const glickoG = rd => 1 / Math.sqrt(1 + 3 * Q ** 2 * rd ** 2 / Math.PI ** 2)
export const expectedScore = (a, b, uncertainty = true) => sigmoid(Q * (a.rating - b.rating) * (uncertainty ? glickoG(Math.hypot(a.rd, b.rd)) : 1))

export function updateGlicko(prior, meetings, policy = TEAM_STRENGTH_POLICY) {
  let information = 0, score = 0
  for (const meeting of meetings) {
    const g = glickoG(meeting.opponent.rd)
    const expected = sigmoid(Q * g * (prior.rating - meeting.opponent.rating))
    information += Q ** 2 * g ** 2 * expected * (1 - expected)
    score += g * (meeting.result - expected)
  }
  const variance = 1 / (1 / prior.rd ** 2 + information)
  return { rating: prior.rating + Q * variance * score, rd: Math.max(policy.minimumRd, Math.sqrt(variance)) }
}

export function rosterRetention(before, after) {
  if (!before || !after) return null
  const total = Object.values(before).reduce((sum, weight) => sum + weight, 0)
  return total ? clamp(Object.entries(before).reduce((sum, [id, weight]) => sum + Math.min(weight, after[id] || 0), 0) / total, 0, 1) : null
}

export function adjustForRoster(prior, retention, policy = TEAM_STRENGTH_POLICY) {
  if (retention == null) return { rating: prior.rating, rd: prior.rd }
  return { rating: policy.initialRating + retention * (prior.rating - policy.initialRating),
    rd: Math.min(policy.initialRd, Math.sqrt(retention ** 2 * prior.rd ** 2 + (1 - retention ** 2) * policy.initialRd ** 2)) }
}

export function ageRating(state, date, policy = TEAM_STRENGTH_POLICY) {
  const days = state.lastDate ? Math.max(0, (Date.parse(date) - Date.parse(state.lastDate)) / 86400000) : 0
  return { ...state, rd: Math.min(policy.initialRd, Math.sqrt(state.rd ** 2 + days * policy.rdDriftPerSqrtDay ** 2)) }
}

function addMetric(baselines, id, metric, value) {
  const k = `${id}:${metric}`
  const before = baselines.get(k) || { n: 0, sum: 0, sumSquares: 0 }
  baselines.set(k, { n: before.n + 1, sum: before.sum + value, sumSquares: before.sumSquares + value ** 2 })
}

function learnMaps(baselines, matches) {
  for (const map of matches.flatMap(match => match.maps).filter(map => map.performanceEligible)) for (const row of map.rows) {
    for (const [metric, value] of Object.entries(row.metrics)) {
      addMetric(baselines, `hero:${row.hero}:${row.role}`, metric, value)
      addMetric(baselines, `role:${row.role}`, metric, value)
    }
  }
}

function normalizedRow(row, baselines, policy) {
  const scores = []
  for (const [metric, value] of Object.entries(row.metrics || {})) {
    let baseline = baselines.get(`hero:${row.hero}:${row.role}:${metric}`)
    let minimum = policy.heroBaselineRows
    if (!baseline || baseline.n < minimum) { baseline = baselines.get(`role:${row.role}:${metric}`); minimum = policy.roleBaselineRows }
    if (!baseline || baseline.n < minimum) continue
    const average = baseline.sum / baseline.n
    const sd = Math.sqrt(Math.max(0, baseline.sumSquares / baseline.n - average ** 2))
    // Constant metrics contain no discriminating information.
    if (sd < 1e-6) continue
    scores.push(clamp((value - average) / Math.max(sd, policy.logMetricSdFloor), -policy.zLimit, policy.zLimit) * (metric === 'deaths' ? -1 : 1))
  }
  return scores.length >= 2 ? mean(scores) : null
}

export function performanceGap(match, baselines, policy = TEAM_STRENGTH_POLICY) {
  const gaps = []
  for (const map of match.maps.filter(map => map.performanceEligible)) {
    const scores = map.rows.map(row => ({ team: row.teamId, score: normalizedRow(row, baselines, policy) }))
    if (scores.some(row => row.score == null)) continue
    const a = mean(scores.filter(row => row.team === match.teamA).map(row => row.score))
    const b = mean(scores.filter(row => row.team === match.teamB).map(row => row.score))
    gaps.push(clamp((a - b) / (2 * policy.zLimit), -1, 1))
  }
  return { value: mean(gaps), maps: gaps.length }
}

export function fitPerformanceCoefficients(rows, policy = TEAM_STRENGTH_POLICY) {
  const stats = rows.filter(row => row.gap != null)
  const slope = stats.length < policy.minimumFitRows ? 0 : clamp(stats.reduce((sum, row) => sum + row.strengthDifference * row.gap, 0) /
    (policy.coefficientRidge + stats.reduce((sum, row) => sum + row.strengthDifference ** 2, 0)), -1, 1)
  const forecasts = rows.filter(row => row.result !== 0.5 && row.featureAvailable)
  let beta = 0
  if (forecasts.length >= policy.minimumFitRows) for (let step = 0; step < 30; step += 1) {
    let gradient = policy.coefficientRidge * beta, curvature = policy.coefficientRidge
    for (const row of forecasts) {
      const p = sigmoid(row.offset + beta * row.feature)
      gradient += (p - row.result) * row.feature
      curvature += p * (1 - p) * row.feature ** 2
    }
    const next = clamp(beta - gradient / curvature, -2, 2)
    if (Math.abs(next - beta) < 1e-9) { beta = next; break }
    beta = next
  }
  return { slope, beta, performanceRows: stats.length, forecastRows: forecasts.length,
    latestTrainingDate: rows.map(row => row.date).sort().at(-1) || null }
}

function initialState(policy) {
  return { rating: policy.initialRating, rd: policy.initialRd, lastDate: null, matches: 0, wins: 0, losses: 0, draws: 0,
    opponents: [], roster: null, rosterDate: null, stableMatches: 0, rosterChanges: 0,
    coverageSum: 0, performanceSum: 0, performanceWeight: 0, lastRetention: null }
}
const featureFor = (state, policy) => state.performanceSum / (policy.performancePrior + state.performanceWeight)

function combinedRoster(meetings, teamId, policy) {
  const covered = meetings.filter(meeting => meeting.match.rosterCoverage >= policy.minimumRosterCoverage && meeting.match.rosters[teamId])
  // A partially observed day must not silently redefine the team's full roster.
  if (covered.length !== meetings.length) return null
  const weights = {}
  for (const meeting of covered) for (const [id, weight] of Object.entries(meeting.match.rosters[teamId])) weights[id] = (weights[id] || 0) + weight / covered.length
  return weights
}

export function runTeamStrengthSeason(data, { policy = TEAM_STRENGTH_POLICY, coefficientHistory = [], frozenCoefficients = null } = {}) {
  const states = Object.fromEntries(['elo', 'glicko', 'roster'].map(model => [model, new Map(data.teams.map(team => [team.id, initialState(policy)]))]))
  const baselines = new Map(), predictions = [], history = [], trainingRows = [...coefficientHistory], folds = []
  for (const [date, matches] of groupBy(data.matches, match => match.date)) {
    const coefficients = frozenCoefficients || fitPerformanceCoefficients(trainingRows, policy)
    if (coefficients.latestTrainingDate && coefficients.latestTrainingDate >= date) throw new Error(`Future coefficient training at ${date}`)
    const priors = Object.fromEntries(Object.entries(states).map(([model, teams]) => [model, new Map([...teams].map(([id, state]) => [id, ageRating(state, date, policy)]))]))
    const dayRows = [], meetings = new Map(), dayPredictions = []
    for (const match of matches) {
      const probabilities = Object.fromEntries(['elo', 'glicko', 'roster'].map(model => [model, expectedScore(priors[model].get(match.teamA), priors[model].get(match.teamB), model !== 'elo')]))
      const a = priors.roster.get(match.teamA), b = priors.roster.get(match.teamB)
      const featureAvailable = a.performanceWeight > 0 && b.performanceWeight > 0
      const feature = featureAvailable ? featureFor(a, policy) - featureFor(b, policy) : 0
      probabilities.performance = sigmoid(logit(probabilities.roster) + coefficients.beta * feature)
      const gap = performanceGap(match, baselines, policy)
      const strengthDifference = (a.rating - b.rating) / 400
      const residual = gap.value == null ? null : clamp(gap.value - coefficients.slope * strengthDifference, -1, 1)
      const prediction = { seasonId: data.seasonId, date, matchId: match.matchId, teamA: match.teamA, teamB: match.teamB, result: match.result,
        scoreA: match.scoreA, scoreB: match.scoreB, probabilities, priorMatchesA: a.matches, priorMatchesB: b.matches,
        priorRosterDateA: a.rosterDate, priorRosterDateB: b.rosterDate,
        priorRatings: Object.fromEntries(['elo', 'glicko', 'roster'].map(model => [model, { a: priors[model].get(match.teamA).rating, b: priors[model].get(match.teamB).rating }])),
        performance: { feature, featureAvailable, coefficients, observedGap: gap.value, observedResidual: residual, scoredMaps: gap.maps } }
      predictions.push(prediction); dayPredictions.push(prediction)
      dayRows.push({ date, seasonId: data.seasonId, matchId: match.matchId, result: match.result, offset: logit(probabilities.roster), feature, featureAvailable,
        gap: gap.value, strengthDifference })
      for (const [teamId, opponentId, result, sign] of [[match.teamA, match.teamB, match.result, 1], [match.teamB, match.teamA, 1 - match.result, -1]]) {
        if (!meetings.has(teamId)) meetings.set(teamId, [])
        meetings.get(teamId).push({ match, opponentId, result, residual: residual == null ? null : sign * residual })
      }
    }
    // Predictions for the entire day have been recorded before observing any
    // outcome, lineup or metric from this day. Every opponent uses a prior copy.
    for (const [teamId, games] of meetings) {
      const observedRoster = combinedRoster(games, teamId, policy)
      for (const model of ['elo', 'glicko', 'roster']) {
        const prior = priors[model].get(teamId)
        const retention = rosterRetention(prior.roster, observedRoster)
        const adjusted = model === 'roster' ? adjustForRoster(prior, retention, policy) : { rating: prior.rating, rd: prior.rd }
        const update = model === 'elo'
          ? { rating: prior.rating + policy.eloK * games.reduce((sum, game) => sum + game.result - expectedScore(prior, priors.elo.get(game.opponentId), false), 0), rd: prior.rd }
          : updateGlicko(adjusted, games.map(game => ({ opponent: priors[model].get(game.opponentId), result: game.result })), policy)
        const changed = retention != null && retention < policy.rosterChangeThreshold - 1e-9
        const newState = { ...prior, ...update, lastDate: date, matches: prior.matches + games.length,
          wins: prior.wins + games.filter(game => game.result === 1).length, losses: prior.losses + games.filter(game => game.result === 0).length, draws: prior.draws + games.filter(game => game.result === 0.5).length,
          opponents: [...new Set([...prior.opponents, ...games.map(game => game.opponentId)])].sort(),
          roster: observedRoster || prior.roster, rosterDate: observedRoster ? date : prior.rosterDate,
          stableMatches: !observedRoster ? 0 : changed ? games.length : prior.stableMatches + games.length,
          rosterChanges: prior.rosterChanges + Number(changed), lastRetention: retention,
          coverageSum: prior.coverageSum + games.reduce((sum, game) => sum + game.match.rosterCoverage, 0) }
        if (model === 'roster') {
          const retain = retention ?? 1
          const residuals = games.map(game => game.residual).filter(value => value != null)
          const decay = policy.performanceDecay ** games.length
          newState.performanceSum = prior.performanceSum * decay * retain + residuals.reduce((sum, value) => sum + value, 0)
          newState.performanceWeight = prior.performanceWeight * decay + residuals.length
        }
        states[model].set(teamId, newState)
        history.push({ seasonId: data.seasonId, date, teamId, model, matchIds: games.map(game => game.match.matchId),
          ratingBefore: prior.rating, ratingAfterRoster: adjusted.rating, ratingAfter: update.rating,
          rosterDelta: adjusted.rating - prior.rating, resultDelta: update.rating - adjusted.rating, delta: update.rating - prior.rating,
          rdBefore: prior.rd, rdAfter: update.rd, retention, rosterObserved: Boolean(observedRoster),
          opponents: games.map(game => ({ id: game.opponentId, rating: priors[model].get(game.opponentId).rating, result: game.result })),
          performanceFeature: featureFor(newState, policy), matches: newState.matches })
      }
    }
    learnMaps(baselines, matches)
    if (!frozenCoefficients) trainingRows.push(...dayRows)
    folds.push({ date, predictions: dayPredictions.length, latestPriorDate: data.matches.filter(match => match.date < date).at(-1)?.date || null,
      coefficients, coefficientMode: frozenCoefficients ? 'FROZEN_DEVELOPMENT' : 'PAST_DAYS_ONLY' })
  }
  const asOf = data.matches.at(-1)?.date || null
  const components = new Map(data.components.flatMap((members, index) => members.map(id => [id, `${data.seasonId}:component-${index + 1}`])))
  const ratings = data.teams.map(team => {
    const models = Object.fromEntries(['elo', 'glicko', 'roster'].map(model => [model, ageRating(states[model].get(team.id), asOf, policy)]))
    const state = models.roster
    const reasons = []
    if (state.matches < policy.supportedMatches) reasons.push('正常比赛少于 6 场')
    if (state.opponents.length < policy.supportedOpponents) reasons.push('不同对手少于 3 支')
    if (state.stableMatches < policy.supportedStableMatches) reasons.push('最近阵容连续可核对比赛少于 3 场')
    if (state.rd > policy.supportedRd) reasons.push('模型不确定度较高')
    if (!state.matches || state.coverageSum / state.matches < policy.minimumRosterCoverage) reasons.push('历史阵容覆盖不足')
    const status = !state.matches ? 'UNRATED' : reasons.length ? 'PROVISIONAL' : 'SUPPORTED'
    const interval = [state.rating - policy.intervalMultiplier * state.rd, state.rating + policy.intervalMultiplier * state.rd]
    const band = rating => rating >= 1700 ? 'A' : rating >= 1500 ? 'B' : rating >= 1300 ? 'C' : 'D'
    return { ...team, scope: components.get(team.id), status, reasons, asOf,
      rating: state.matches ? rounded(state.rating, 1) : null, rd: state.matches ? rounded(state.rd, 1) : null,
      interval: state.matches ? interval.map(value => rounded(value, 1)) : null,
      band: status === 'SUPPORTED' ? band(state.rating) : null, possibleBands: state.matches ? [...new Set([band(interval[0]), band(interval[1])])] : [],
      matches: state.matches, wins: state.wins, losses: state.losses, draws: state.draws, opponents: state.opponents.length,
      rosterChanges: state.rosterChanges, stableMatches: state.stableMatches, rosterDate: state.rosterDate, roster: state.roster,
      rosterCoverage: state.matches ? rounded(state.coverageSum / state.matches) : 0,
      performanceFeature: rounded(featureFor(state, policy)), performanceWeight: rounded(state.performanceWeight),
      models: Object.fromEntries(Object.entries(models).map(([model, value]) => [model, { rating: rounded(value.rating, 4), rd: rounded(value.rd, 4) }])) }
  }).sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || a.id.localeCompare(b.id))
  return { seasonId: data.seasonId, asOf, audit: data.audit, components: data.components, ratings, predictions, history, folds,
    trainingRows: frozenCoefficients ? [] : trainingRows.slice(coefficientHistory.length), finalCoefficients: frozenCoefficients || fitPerformanceCoefficients(trainingRows, policy) }
}
