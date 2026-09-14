export const BRACKET_PHASES = {
  BREAKTHROUGH: 'breakthrough',
  PLAYOFFS: 'playoffs'
}

const safeArr = value => Array.isArray(value) ? value : []

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase()
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getMatchId(match) {
  return normalizeText(match?.match_id || match?.matchId || match?.id || match?.raw_match_id)
}

function getTeamId(team) {
  return normalizeText(team?.team_id || team?.id)
}

function getTeamShort(team) {
  return normalizeText(team?.team_short_name || team?.short || team?.team_id || team?.id || team?.team_name || team?.name || 'TBD')
}

function getTeamName(team) {
  return normalizeText(team?.team_name || team?.name || getTeamShort(team))
}

function normalizeTeam(team) {
  const id = getTeamId(team)
  const short = getTeamShort(team)
  const name = getTeamName(team)

  return {
    id,
    team_id: id,
    short,
    team_short_name: short,
    name,
    team_name: name,
    isTbd: !id && normalizeKey(short) === 'tbd',
    raw: team || null
  }
}

function resolveWinnerId(match) {
  const status = normalizeText(match?.status).toUpperCase()
  if (status && !['COMPLETE', 'COMPLETED', 'FINISHED'].includes(status)) return ''

  const explicit = normalizeText(match?.winnerId || match?.winner_id || match?.winner_team_id)
  if (explicit) return explicit

  const winner = normalizeKey(match?.winner)
  if (!winner) return ''

  const teams = [match?.team_a || match?.teamA, match?.team_b || match?.teamB]
  const winnerTeam = teams.find(team => {
    return [
      team?.team_id,
      team?.id,
      team?.team_short_name,
      team?.short,
      team?.team_name,
      team?.name
    ].map(normalizeKey).some(value => value && value === winner)
  })

  return getTeamId(winnerTeam)
}

function normalizeStatus(status) {
  const raw = normalizeText(status).toUpperCase()
  if (['COMPLETE', 'COMPLETED', 'FINISHED'].includes(raw)) return 'completed'
  if (['LIVE', 'IN_PROGRESS', 'ONGOING'].includes(raw)) return 'active'
  if (['POSTPONED', 'DELAYED'].includes(raw)) return 'postponed'
  if (['CANCELED', 'CANCELLED'].includes(raw)) return 'cancelled'
  if (['TBD', 'TBC', 'PENDING_CONFIRMATION'].includes(raw)) return 'pending'
  return raw ? 'scheduled' : 'pending'
}

function roundOrder(label, index = 0) {
  const text = normalizeText(label).toUpperCase()
  const number = Number(text.match(/\d+/)?.[0] || 0)

  if (/UB|UPPER|WINNER|胜者/.test(text)) {
    if (/QF|QUARTER|八强/.test(text)) return 10 + index
    if (/SF|SEMI|半决/.test(text)) return 30 + index
    if (/FINAL|决赛/.test(text)) return 50 + index
    return 20 + number + index
  }

  if (/LB|LOWER|LOSER|败者/.test(text)) {
    if (/FINAL|决赛/.test(text)) return 70 + index
    if (number === 1) return 20 + index
    if (number === 2) return 40 + index
    if (number === 3) return 60 + index
    if (number) return 60 + number * 5 + index
    return 60 + index
  }

  if (/THIRD|3RD|季军/.test(text)) return 70 + index
  if (/QF|QUARTER|八强/.test(text)) return 10 + index
  if (/SF|SEMI|半决/.test(text)) return 30 + index
  if (/GRAND|总决|FINAL/.test(text)) return 90 + index
  if (/LCQ|BREAKTHROUGH|突围/.test(text)) return 100 + number + index
  if (number) return 100 + number + index
  return 500 + index
}

function normalizeMatch(match, roundLabel, phase) {
  const teamA = normalizeTeam(match?.team_a || match?.teamA || match?.teams?.[0])
  const teamB = normalizeTeam(match?.team_b || match?.teamB || match?.teams?.[1])
  const matchId = getMatchId(match)
  const nextMatchId = normalizeText(match?.nextMatchId || match?.next_match_id || match?.next?.matchId || match?.next?.match_id)
  const nextSlot = normalizeText(match?.nextSlot || match?.next_slot || match?.next?.slot)

  return {
    matchId,
    id: matchId,
    phase,
    teamA,
    teamB,
    scoreA: toNumberOrNull(match?.scoreA ?? match?.team_a?.score ?? match?.teamA?.score ?? match?.teams?.[0]?.score),
    scoreB: toNumberOrNull(match?.scoreB ?? match?.team_b?.score ?? match?.teamB?.score ?? match?.teams?.[1]?.score),
    winnerId: resolveWinnerId(match),
    status: normalizeStatus(match?.status),
    rawStatus: normalizeText(match?.status),
    nextMatchId,
    nextSlot,
    hasConnection: Boolean(nextMatchId),
    stage: normalizeText(match?.stage),
    round: normalizeText(match?.round || roundLabel),
    label: normalizeText(match?.match_display_name || match?.label || match?.name || matchId),
    format: normalizeText(match?.format || match?.series_format || match?.seriesFormat),
    scheduledAt: normalizeText(match?.scheduled_at || match?.scheduledAt || match?.match_date || match?.date),
    raw: match
  }
}

function normalizeRound(round, index, phase) {
  const id = normalizeText(round?.id || round?.roundId || round?.key || round?.label || round?.name || `round-${index + 1}`)
  const label = normalizeText(round?.label || round?.name || round?.round || id)
  const matches = safeArr(round?.matches).map(match => normalizeMatch(match, label, phase))

  return {
    id,
    label,
    order: Number(round?.order) || roundOrder(label, index),
    matches
  }
}

function groupMatchesAsRounds(matches, phase) {
  const groups = new Map()

  safeArr(matches).forEach(match => {
    const label = normalizeText(match?.round || match?.stage || 'ROUND')
    const key = normalizeKey(label) || `round-${groups.size + 1}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label,
        order: roundOrder(label, groups.size),
        matches: []
      })
    }
    groups.get(key).matches.push(normalizeMatch(match, label, phase))
  })

  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(round => ({
      ...round,
      matches: round.matches.sort((a, b) => {
        return normalizeText(a.matchId).localeCompare(normalizeText(b.matchId))
      })
    }))
}

function isBreakthroughMatch(match) {
  const text = `${match?.stage || ''} ${match?.round || ''} ${match?.match_id || ''} ${match?.match_display_name || ''}`.toUpperCase()
  return /LCQ|BREAKTHROUGH|LAST CHANCE|突围|资格赛/.test(text) && !/PLAYOFF/.test(text)
}

function isPlayoffMatch(match) {
  const text = `${match?.stage || ''} ${match?.round || ''} ${match?.match_id || ''} ${match?.match_display_name || ''}`.toUpperCase()
  return /PLAYOFF|GRAND FINAL|GRAND FINALS|UB|LB|季后|胜者|败者|总决/.test(text) && !isBreakthroughMatch(match)
}

function getPhaseBracketSource(db, phase) {
  const candidates = [
    db?.brackets?.[phase],
    db?.bracket?.[phase],
    db?.advance?.brackets?.[phase],
    db?.advance?.[phase]?.bracket,
    db?.meta?.brackets?.[phase],
    db?.season?.brackets?.[phase]
  ]

  return candidates.find(candidate => candidate && typeof candidate === 'object') || null
}

export function adaptBackendBracket(source, options = {}) {
  const phase = options.phase || source?.phase || ''
  const bracketType = normalizeText(options.bracketType || source?.bracketType || source?.bracket_type || source?.format)
  const rounds = safeArr(source?.rounds).length
    ? safeArr(source.rounds).map((round, index) => normalizeRound(round, index, phase))
    : groupMatchesAsRounds(source?.matches, phase)

  return {
    phase,
    bracketType,
    source: source?.source || 'backend',
    hasExplicitConnections: rounds.some(round => round.matches.some(match => match.hasConnection)),
    rounds: rounds
      .filter(round => round.matches.length)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
  }
}

export function adaptBracketFromDb(db, phase, options = {}) {
  const backendSource = getPhaseBracketSource(db, phase)
  if (backendSource) {
    return adaptBackendBracket(backendSource, {
      phase,
      bracketType: options.bracketType || backendSource.bracketType || backendSource.bracket_type
    })
  }

  const matches = safeArr(db?.matches).filter(phase === BRACKET_PHASES.BREAKTHROUGH ? isBreakthroughMatch : isPlayoffMatch)

  return adaptBackendBracket({
    phase,
    bracketType: options.bracketType || '',
    source: 'matches',
    matches
  }, { phase, bracketType: options.bracketType || '' })
}

export function getBracketPhaseMatches(db, phase) {
  return safeArr(db?.matches).filter(phase === BRACKET_PHASES.BREAKTHROUGH ? isBreakthroughMatch : isPlayoffMatch)
}
