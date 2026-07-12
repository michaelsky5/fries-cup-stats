const safeArr = value => Array.isArray(value) ? value : []

export const FOUR_DIVISION_LCQ_MATCHES = [
  { number: 1, round: 'playIn', seeds: [13, 20], scheduledAt: '2026-07-18T20:00:00+08:00' },
  { number: 2, round: 'playIn', seeds: [14, 19], scheduledAt: '2026-07-18T20:00:00+08:00' },
  { number: 3, round: 'playIn', seeds: [15, 18], scheduledAt: '2026-07-18T21:00:00+08:00' },
  { number: 4, round: 'playIn', seeds: [16, 17], scheduledAt: '2026-07-18T21:00:00+08:00' },
  { number: 5, round: 'roundOf16', slots: [{ seed: 1 }, { winnerOf: 4 }], scheduledAt: '2026-07-19T20:00:00+08:00' },
  { number: 6, round: 'roundOf16', seeds: [8, 9], scheduledAt: '2026-07-19T20:00:00+08:00' },
  { number: 7, round: 'roundOf16', slots: [{ seed: 4 }, { winnerOf: 1 }], scheduledAt: '2026-07-19T20:00:00+08:00' },
  { number: 8, round: 'roundOf16', seeds: [5, 12], scheduledAt: '2026-07-19T20:00:00+08:00' },
  { number: 9, round: 'roundOf16', slots: [{ seed: 2 }, { winnerOf: 3 }], scheduledAt: '2026-07-19T21:00:00+08:00' },
  { number: 10, round: 'roundOf16', seeds: [7, 10], scheduledAt: '2026-07-19T21:00:00+08:00' },
  { number: 11, round: 'roundOf16', slots: [{ seed: 3 }, { winnerOf: 2 }], scheduledAt: '2026-07-19T21:00:00+08:00' },
  { number: 12, round: 'roundOf16', seeds: [6, 11], scheduledAt: '2026-07-19T21:00:00+08:00' },
  { number: 13, round: 'qualification', slots: [{ winnerOf: 5 }, { winnerOf: 6 }], scheduledAt: '2026-07-25T20:00:00+08:00' },
  { number: 14, round: 'qualification', slots: [{ winnerOf: 7 }, { winnerOf: 8 }], scheduledAt: '2026-07-25T21:30:00+08:00' },
  { number: 15, round: 'qualification', slots: [{ winnerOf: 9 }, { winnerOf: 10 }], scheduledAt: '2026-07-26T20:00:00+08:00' },
  { number: 16, round: 'qualification', slots: [{ winnerOf: 11 }, { winnerOf: 12 }], scheduledAt: '2026-07-26T21:30:00+08:00' }
]

export const FOUR_DIVISION_LCQ_DIVISIONS = [
  { number: 1, seeds: [1, 8, 9, 16, 17], playIn: 4, roundOf16: [5, 6], qualification: 13 },
  { number: 2, seeds: [4, 5, 12, 13, 20], playIn: 1, roundOf16: [7, 8], qualification: 14 },
  { number: 3, seeds: [2, 7, 10, 15, 18], playIn: 3, roundOf16: [9, 10], qualification: 15 },
  { number: 4, seeds: [3, 6, 11, 14, 19], playIn: 2, roundOf16: [11, 12], qualification: 16 }
]

function normalizeText(value) {
  return String(value ?? '').trim()
}

function matchNumber(match) {
  const text = `${match?.match_id || match?.id || ''} ${match?.match_display_name || ''}`
  const explicit = text.match(/(?:LCQ|BREAKTHROUGH)[-_\s/]*(?:MATCH[-_\s]*)?M?0*(\d{1,2})(?!\d)/i)
  if (explicit) return Number(explicit[1])
  return Number(match?.lcq_match_number || match?.bracket_match_number) || 0
}

function normalizeTeam(team) {
  if (!team) return null
  const id = normalizeText(team.team_id || team.id)
  const short = normalizeText(team.team_short_name || team.short || team.team_name || team.name || id)
  const name = normalizeText(team.team_name || team.name || short)
  if (!id && !short) return null
  return { ...team, id, team_id: id, short, team_short_name: short, name, team_name: name }
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
  const winner = normalizeText(match.winner || match.winner_id || match.winner_team_id).toLowerCase()
  const teams = [match.team_a, match.team_b]
  const explicit = teams.find(team => [
    team?.id,
    team?.team_id,
    team?.short,
    team?.team_short_name,
    team?.name,
    team?.team_name
  ].map(value => normalizeText(value).toLowerCase()).includes(winner))
  if (explicit) return normalizeTeam(explicit)

  const scoreA = Number(match?.team_a?.score)
  const scoreB = Number(match?.team_b?.score)
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreA !== scoreB) {
    return normalizeTeam(scoreA > scoreB ? match.team_a : match.team_b)
  }
  return null
}

function getEligibleStandings(standings, participantCount) {
  const rows = safeArr(standings)
  const qualified = rows.filter(row => row.status === 'breakthrough')
  if (qualified.length >= participantCount) return qualified.slice(0, participantCount)

  const fallback = rows.filter(row => row.status !== 'direct' && row.status !== 'eliminated')
  return fallback.slice(0, participantCount)
}

export function buildFourDivisionLcq({ config = {}, matches = [], standings = [], swissFinished = false } = {}) {
  const participantCount = Number(config.participantCount) || 20
  const advanceSlots = Number(config.advanceSlots) || 4
  const actualByNumber = new Map()
  safeArr(matches).forEach(match => {
    const number = matchNumber(match)
    if (number >= 1 && number <= 16) actualByNumber.set(number, match)
  })

  const eligibleStandings = swissFinished ? getEligibleStandings(standings, participantCount) : []
  const teamBySeed = new Map(eligibleStandings.map((row, index) => [index + 1, normalizeTeam(row)]))
  const builtByNumber = new Map()

  const slotsFor = definition => {
    const definitions = definition.slots || safeArr(definition.seeds).map(seed => ({ seed }))
    return definitions.map(slot => {
      if (slot.seed) {
        return { type: 'seed', seed: slot.seed, team: teamBySeed.get(slot.seed) || null }
      }
      const source = builtByNumber.get(slot.winnerOf)
      return { type: 'winner', winnerOf: slot.winnerOf, team: source?.winner || null }
    })
  }

  FOUR_DIVISION_LCQ_MATCHES.forEach(definition => {
    const actual = actualByNumber.get(definition.number)
    const fallbackSlots = slotsFor(definition)
    const actualTeams = actual ? [normalizeTeam(actual.team_a), normalizeTeam(actual.team_b)] : []
    const bestOf = Number(config?.rounds?.[definition.round]?.bestOf) || (definition.round === 'qualification' ? 5 : 3)
    const match = {
      ...definition,
      id: normalizeText(actual?.match_id || actual?.id),
      label: `M${definition.number}`,
      bestOf,
      scheduledAt: normalizeText(actual?.scheduled_at) || definition.scheduledAt,
      status: normalizedStatus(actual),
      slots: fallbackSlots.map((slot, index) => ({ ...slot, team: actualTeams[index] || slot.team })),
      scores: actual ? [actual?.team_a?.score, actual?.team_b?.score] : [null, null],
      winner: winnerTeam(actual),
      raw: actual || null
    }
    builtByNumber.set(definition.number, match)
  })

  const divisions = FOUR_DIVISION_LCQ_DIVISIONS.map(division => ({
    ...division,
    playInMatch: builtByNumber.get(division.playIn),
    roundOf16Matches: division.roundOf16.map(number => builtByNumber.get(number)),
    qualificationMatch: builtByNumber.get(division.qualification)
  }))

  return {
    participantCount,
    advanceSlots,
    bracketLocked: config.bracketLocked !== false,
    rankingsLocked: swissFinished,
    seededTeams: Array.from({ length: participantCount }, (_, index) => ({
      seed: index + 1,
      team: teamBySeed.get(index + 1) || null
    })),
    completedMatches: [...builtByNumber.values()].filter(match => match.status === 'completed').length,
    totalMatches: FOUR_DIVISION_LCQ_MATCHES.length,
    divisions
  }
}
