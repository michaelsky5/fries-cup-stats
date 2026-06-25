function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function toFiniteNumber(value, fallback = NaN) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getParticipantScore(participant) {
  if (typeof participant === 'number') return toFiniteNumber(participant)
  return toFiniteNumber(
    participant?.rawImpactScore ??
    participant?.rawPts ??
    participant?.roleScore ??
    participant?.score
  )
}

export function getMapPlayerMatchRating(rawScore, mapParticipants = []) {
  const score = toFiniteNumber(rawScore)
  const scores = safeArr(mapParticipants)
    .map(getParticipantScore)
    .filter(Number.isFinite)

  if (!Number.isFinite(score) || scores.length < 2) return null

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min

  if (range <= 0.001) return 7.0

  const belowCount = scores.filter(candidate => candidate < score).length
  const percentile = clamp(belowCount / Math.max(1, scores.length - 1), 0, 1)
  const normalized = clamp((score - min) / range, 0, 1)
  const blendedPosition = clamp((percentile * 0.72) + (normalized * 0.28), 0, 1)

  let rating = 5.8 + (3.1 * blendedPosition)

  const sorted = [...new Set(scores)].sort((a, b) => b - a)
  const secondBest = sorted[1] ?? sorted[0]
  if (Math.abs(score - max) <= 0.001 && sorted.length > 1) {
    const dominance = clamp((max - secondBest) / range, 0, 1)
    if (dominance > 0.18) rating += Math.min(0.9, (dominance - 0.18) * 1.5)
  }

  return Number(clamp(rating, 5.6, 9.8).toFixed(1))
}

export function formatMapPlayerMatchRating(value, fallback = '-') {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : fallback
}
