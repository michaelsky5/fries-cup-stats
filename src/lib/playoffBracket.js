const safeArr = value => Array.isArray(value) ? value : []

export const DOUBLE_ELIMINATION_MATCHES = [
  { number: 1, bracket: 'upper', round: 'upperRound1', slots: [{ seed: 1 }, { seed: 8 }] },
  { number: 2, bracket: 'upper', round: 'upperRound1', slots: [{ seed: 4 }, { seed: 5 }] },
  { number: 3, bracket: 'upper', round: 'upperRound1', slots: [{ seed: 2 }, { seed: 7 }] },
  { number: 4, bracket: 'upper', round: 'upperRound1', slots: [{ seed: 3 }, { seed: 6 }] },
  { number: 5, bracket: 'lower', round: 'lowerRound1', slots: [{ loserOf: 1 }, { loserOf: 2 }] },
  { number: 6, bracket: 'lower', round: 'lowerRound1', slots: [{ loserOf: 3 }, { loserOf: 4 }] },
  { number: 7, bracket: 'upper', round: 'upperSemifinal', slots: [{ winnerOf: 1 }, { winnerOf: 2 }] },
  { number: 8, bracket: 'upper', round: 'upperSemifinal', slots: [{ winnerOf: 3 }, { winnerOf: 4 }] },
  {
    number: 9,
    bracket: 'lower',
    round: 'lowerRound2',
    crossed: true,
    slots: [{ winnerOf: 5 }, { loserOf: 8, crossover: 'lower_to_upper' }]
  },
  {
    number: 10,
    bracket: 'lower',
    round: 'lowerRound2',
    crossed: true,
    slots: [{ winnerOf: 6 }, { loserOf: 7, crossover: 'upper_to_lower' }]
  },
  { number: 11, bracket: 'upper', round: 'upperFinal', slots: [{ winnerOf: 7 }, { winnerOf: 8 }] },
  { number: 12, bracket: 'lower', round: 'lowerRound3', slots: [{ winnerOf: 9 }, { winnerOf: 10 }] },
  { number: 13, bracket: 'lower', round: 'lowerFinal', slots: [{ winnerOf: 12 }, { loserOf: 11 }] },
  { number: 14, bracket: 'final', round: 'grandFinal', slots: [{ winnerOf: 11 }, { winnerOf: 13 }] }
]

export const DOUBLE_ELIMINATION_ROUNDS = [
  { key: 'upperRound1', bracket: 'upper', label: '胜者组首轮', matchNumbers: [1, 2, 3, 4] },
  { key: 'upperSemifinal', bracket: 'upper', label: '胜者组半决赛', matchNumbers: [7, 8] },
  { key: 'upperFinal', bracket: 'upper', label: '胜者组决赛', matchNumbers: [11] },
  { key: 'grandFinal', bracket: 'final', label: '总决赛', matchNumbers: [14] },
  { key: 'lowerRound1', bracket: 'lower', label: '败者组第一轮', matchNumbers: [5, 6] },
  { key: 'lowerRound2', bracket: 'lower', label: '败者组第二轮', matchNumbers: [9, 10] },
  { key: 'lowerRound3', bracket: 'lower', label: '败者组第三轮', matchNumbers: [12] },
  { key: 'lowerFinal', bracket: 'lower', label: '败者组决赛', matchNumbers: [13] }
]

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase()
}

function teamIdentityValues(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalizeKey).filter(Boolean)
}

function comparableTeamIdentityValues(team) {
  return teamIdentityValues(team).filter(value => !['tbd', 'tbc'].includes(value))
}

function isSameTeam(left, right) {
  const rightKeys = new Set(comparableTeamIdentityValues(right))
  return comparableTeamIdentityValues(left).some(value => rightKeys.has(value))
}

function normalizeTeam(team, extras = {}) {
  if (!team) return null
  const id = normalizeText(team.team_id || team.id)
  const short = normalizeText(team.team_short_name || team.short || team.team_name || team.name || id)
  const name = normalizeText(team.team_name || team.name || short)
  if (!id && !short) return null

  const placeholderText = `${id} ${short} ${name}`.toUpperCase()
  const isTbd = Boolean(team.isTbd) || /(?:^|\s)(?:TBD|W-M\d+|L-M\d+)(?:$|\s)/.test(placeholderText)
  return {
    ...team,
    ...extras,
    id,
    team_id: id,
    short,
    team_short_name: short,
    name,
    team_name: name,
    isTbd
  }
}

function seedPlaceholder(seed) {
  return normalizeTeam({
    short: `#${seed}`,
    name: `季后赛 ${seed} 号种子`,
    isTbd: true
  }, { seed })
}

function sourcePlaceholder(slot) {
  const number = slot.winnerOf || slot.loserOf
  const prefix = slot.winnerOf ? 'W' : 'L'
  const result = slot.winnerOf ? '胜者' : '败者'
  return normalizeTeam({
    short: `${prefix}-M${number}`,
    name: `M${number} ${result}`,
    isTbd: true
  }, { sourceMatch: number, sourceResult: slot.winnerOf ? 'winner' : 'loser' })
}

function matchNumber(match) {
  const explicit = Number(match?.playoff_match_number || match?.bracket_match_number)
  if (explicit >= 1 && explicit <= 14) return explicit

  const text = `${match?.match_id || match?.id || ''} ${match?.match_display_name || ''}`
  const numbered = text.match(/(?:^|[-_\s/])M(?:ATCH[-_\s]*)?0*(\d{1,2})(?!\d)/i)
  return numbered ? Number(numbered[1]) : 0
}

function matchTime(match) {
  return normalizeText(
    match?.scheduled_at ||
    match?.scheduledAt ||
    match?.match_date ||
    match?.date ||
    (match?.scheduled_date && match?.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : '')
  )
}

function normalizedStatus(match) {
  const status = normalizeText(match?.status).toUpperCase()
  if (['COMPLETE', 'COMPLETED', 'FINISHED'].includes(status)) return 'completed'
  if (['LIVE', 'IN_PROGRESS', 'ONGOING'].includes(status)) return 'active'
  if (['POSTPONED', 'DELAYED'].includes(status)) return 'postponed'
  if (['CANCELED', 'CANCELLED'].includes(status)) return 'cancelled'
  return match ? 'scheduled' : 'pending'
}

function winnerTeam(match) {
  if (!match) return null
  const status = normalizeText(match.status).toUpperCase()
  if (status && !['COMPLETE', 'COMPLETED', 'FINISHED'].includes(status)) return null

  const winnerKey = normalizeKey(match.winner || match.winner_id || match.winner_team_id)
  const teams = [match.team_a, match.team_b]
  const explicit = teams.find(team => teamIdentityValues(team).includes(winnerKey))
  if (explicit) return normalizeTeam(explicit)

  const scoreA = Number(match?.team_a?.score)
  const scoreB = Number(match?.team_b?.score)
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreA !== scoreB) {
    return normalizeTeam(scoreA > scoreB ? match.team_a : match.team_b)
  }
  return null
}

function loserTeam(match, winner) {
  if (!match || !winner) return null
  const winnerKeys = new Set(teamIdentityValues(winner))
  const loser = [match.team_a, match.team_b].find(team => !teamIdentityValues(team).some(value => winnerKeys.has(value)))
  return normalizeTeam(loser)
}

function getSeededTeams(standings, lcqLayout, swissFinished, participantCount, lockedDirectSeeds) {
  const rows = safeArr(standings)
  const directBySeed = swissFinished
    ? new Map(rows
        .filter(row => row.status === 'direct')
        .slice(0, 4)
        .map((row, index) => [index + 1, normalizeTeam(row)]))
    : new Map(safeArr(lockedDirectSeeds)
        .map(slot => [Number(slot?.seed), normalizeTeam(slot?.team || slot)])
        .filter(([seed, team]) => seed >= 1 && seed <= 4 && team))
  const rowByTeam = new Map()
  rows.forEach(row => teamIdentityValues(row).forEach(value => rowByTeam.set(value, row)))

  const lcqWinners = safeArr(lcqLayout?.divisions)
    .map(division => division?.qualificationMatch?.winner)
    .filter(Boolean)
    .map(team => ({
      team: normalizeTeam(team),
      rank: teamIdentityValues(team).map(value => rowByTeam.get(value)?.rank).find(Boolean) || Number.MAX_SAFE_INTEGER
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(item => item.team)

  return Array.from({ length: participantCount }, (_, index) => {
    const seed = index + 1
    const team = seed <= 4 ? directBySeed.get(seed) : lcqWinners[index - 4]
    return normalizeTeam(team || seedPlaceholder(seed), { seed })
  })
}

function slotTeam(slot, teamBySeed, builtByNumber) {
  if (slot.seed) return teamBySeed.get(slot.seed) || seedPlaceholder(slot.seed)
  const source = builtByNumber.get(slot.winnerOf || slot.loserOf)
  return (slot.winnerOf ? source?.winner : source?.loser) || sourcePlaceholder(slot)
}

function alignActualTeams(fallbackTeams, actualTeams) {
  const usedActualIndexes = new Set()
  const aligned = fallbackTeams.map(fallbackTeam => {
    const actualIndex = actualTeams.findIndex((actualTeam, index) => (
      !usedActualIndexes.has(index) && isSameTeam(actualTeam, fallbackTeam)
    ))

    if (actualIndex < 0) return null
    usedActualIndexes.add(actualIndex)
    const actualTeam = actualTeams[actualIndex]
    return {
      team: actualTeam.isTbd ? fallbackTeam : actualTeam,
      actualIndex
    }
  })

  return aligned.map((entry, index) => {
    if (entry) return entry

    const positionalTeam = actualTeams[index]
    if (positionalTeam && !positionalTeam.isTbd && !usedActualIndexes.has(index)) {
      usedActualIndexes.add(index)
      return { team: positionalTeam, actualIndex: index }
    }

    return { team: fallbackTeams[index], actualIndex: -1 }
  })
}

export function buildFixedDoubleEliminationPlayoff({
  config = {},
  matches = [],
  standings = [],
  lcqLayout = null,
  swissFinished = false,
  lockedDirectSeeds = []
} = {}) {
  const participantCount = Number(config.participantCount) || 8
  const seededTeams = getSeededTeams(standings, lcqLayout, swissFinished, participantCount, lockedDirectSeeds)
  const teamBySeed = new Map(seededTeams.map(team => [team.seed, team]))
  const actualByNumber = new Map()
  safeArr(matches).forEach(match => {
    const number = matchNumber(match)
    if (number >= 1 && number <= 14) actualByNumber.set(number, match)
  })

  const builtByNumber = new Map()
  DOUBLE_ELIMINATION_MATCHES.forEach(definition => {
    const actual = actualByNumber.get(definition.number)
    const fallbackTeams = definition.slots.map(slot => slotTeam(slot, teamBySeed, builtByNumber))
    const actualTeams = actual ? [normalizeTeam(actual.team_a), normalizeTeam(actual.team_b)] : []
    const alignedTeams = alignActualTeams(fallbackTeams, actualTeams)
    const teams = alignedTeams.map(entry => entry.team)
    const actualTeamRows = actual ? [actual.team_a, actual.team_b] : []
    const winner = winnerTeam(actual)
    const scheduledAt = matchTime(actual) || normalizeText(config?.schedule?.[definition.number])
    const match = {
      ...definition,
      id: normalizeText(actual?.match_id || actual?.id),
      matchId: normalizeText(actual?.match_id || actual?.id),
      label: `M${definition.number}`,
      firstTo: definition.round === 'grandFinal'
        ? Number(config?.rounds?.grandFinal?.firstTo) || 4
        : Number(config?.rounds?.standard?.firstTo) || 3,
      scheduledAt,
      status: actual ? normalizedStatus(actual) : scheduledAt ? 'scheduled' : 'pending',
      slots: definition.slots.map((slot, index) => ({ ...slot, team: teams[index] })),
      teamA: teams[0],
      teamB: teams[1],
      scoreA: actualTeamRows[alignedTeams[0].actualIndex]?.score ?? null,
      scoreB: actualTeamRows[alignedTeams[1].actualIndex]?.score ?? null,
      winner,
      loser: loserTeam(actual, winner),
      raw: actual || null
    }
    builtByNumber.set(definition.number, match)
  })

  const rounds = DOUBLE_ELIMINATION_ROUNDS.map(round => ({
    ...round,
    matches: round.matchNumbers.map(number => builtByNumber.get(number))
  }))

  return {
    format: 'fixed_double_elimination',
    participantCount,
    totalMatches: DOUBLE_ELIMINATION_MATCHES.length,
    completedMatches: [...builtByNumber.values()].filter(match => match.status === 'completed').length,
    bracketLocked: config.bracketLocked !== false,
    rankingsLocked: seededTeams.every(team => !team.isTbd),
    lockedSeedCount: seededTeams.filter(team => !team.isTbd).length,
    crossover: config.crossover || 'opposite_half',
    eventWindow: config.eventWindow || {},
    seededTeams,
    upperRounds: rounds.filter(round => round.bracket === 'upper' || round.bracket === 'final'),
    lowerRounds: rounds.filter(round => round.bracket === 'lower'),
    matches: [...builtByNumber.values()]
  }
}
