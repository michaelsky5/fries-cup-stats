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

function getScopedRoundKey(value, stage) {
  const raw = normalizeText(value)
  const groupDay = getStageKey(stage) === 'group' ? raw.match(/\bDAY\s+(\d+)\b/i)?.[1] : ''
  return groupDay ? `day-${Number(groupDay)}` : getRoundKey(raw)
}

export function getMatchRoundScope(match) {
  const stage = getStageKey(match?.stage)
  const rawRound = normalizeText(match?.round || match?.stage)

  return {
    stage,
    round: getScopedRoundKey(rawRound, stage)
  }
}

export function getMatchRoundScopeKey(match) {
  const scope = getMatchRoundScope(match)
  return [scope.stage, scope.round].filter(Boolean).join('::')
}

export function isMatchInRoundScope(match, scope = {}) {
  const targetStage = getStageKey(scope?.stage)
  const targetRound = getScopedRoundKey(scope?.round, targetStage)
  if (!targetStage && !targetRound) return true

  const candidate = getMatchRoundScope(match)
  if (targetStage && candidate.stage !== targetStage) return false
  if (targetRound && candidate.round !== targetRound) return false
  return true
}
