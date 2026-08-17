function normalizeText(value) {
  return String(value || '').trim()
}

export function getStageKey(value) {
  return normalizeText(value).toLowerCase()
}

export function getRoundKey(value) {
  const text = normalizeText(value).toLowerCase()
  if (!text) return ''

  return text
    .replace(/\bupper\s+bracket\b/g, 'ub')
    .replace(/\blower\s+bracket\b/g, 'lb')
    .replace(/\bround\b/g, 'r')
    .replace(/([a-z])(?=\d)/g, '$1 ')
    .replace(/(\d)(?=[a-z])/g, '$1 ')
    .replace(/\d+/g, number => String(Number(number)))
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function getMatchRoundScope(match) {
  return {
    stage: getStageKey(match?.stage),
    round: getRoundKey(match?.round || match?.stage)
  }
}

export function getMatchRoundScopeKey(match) {
  const scope = getMatchRoundScope(match)
  return [scope.stage, scope.round].filter(Boolean).join('::')
}

export function isMatchInRoundScope(match, scope = {}) {
  const targetStage = getStageKey(scope?.stage)
  const targetRound = getRoundKey(scope?.round)
  if (!targetStage && !targetRound) return true

  const candidate = getMatchRoundScope(match)
  if (targetStage && candidate.stage !== targetStage) return false
  if (targetRound && candidate.round !== targetRound) return false
  return true
}
