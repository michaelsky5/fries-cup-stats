import { getSeasonRules } from '../config/seasons.js'
import { calculateSwissStandings } from './swissEngine.js'
import { BRACKET_PHASES, adaptBracketFromDb, getBracketPhaseMatches } from './bracketAdapters.js'

export const ADVANCE_PHASES = ['swiss', 'breakthrough', 'playoffs', 'final']

const safeArr = value => Array.isArray(value) ? value : []
const COMPLETE_STATUSES = new Set(['COMPLETE', 'COMPLETED', 'FINISHED'])
const LIVE_STATUSES = new Set(['LIVE', 'IN_PROGRESS', 'ONGOING'])

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase()
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getMatchTime(match) {
  const raw = match?.scheduled_at ||
    match?.match_date ||
    match?.date ||
    (match?.scheduled_date && match?.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : '')
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

function compareAscByTime(a, b) {
  const timeDelta = getMatchTime(a) - getMatchTime(b)
  if (timeDelta !== 0) return timeDelta
  return normalizeText(a?.match_id || a?.id).localeCompare(normalizeText(b?.match_id || b?.id))
}

function isComplete(match) {
  return COMPLETE_STATUSES.has(normalizeText(match?.status).toUpperCase()) || Boolean(normalizeText(match?.winner))
}

function isLive(match) {
  return LIVE_STATUSES.has(normalizeText(match?.status).toUpperCase())
}

function isSwissMatch(match) {
  const text = `${match?.stage || ''} ${match?.round || ''} ${match?.match_id || ''} ${match?.match_display_name || ''}`.toUpperCase()
  if (/LCQ|BREAKTHROUGH|PLAYOFF|GRAND|UB|LB|突围|季后|总决/.test(text)) return false
  return /SWISS|ROUND|瑞士/.test(text)
}

function getRoundNumber(value) {
  return normalizeText(value).match(/\d+/)?.[0] || ''
}

function getRoundKey(value) {
  const text = normalizeText(value).toLowerCase()
  const number = getRoundNumber(text)
  return number ? `round-${number}` : text
}

function getTeamIdentityValues(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalizeKey).filter(Boolean)
}

function teamMatchesFavorite(team, favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites?.favoriteTeamIds).map(normalizeKey))
  if (!favoriteKeys.size) return false
  return getTeamIdentityValues(team).some(value => favoriteKeys.has(value))
}

function teamMatchesPrimary(team, favorites = {}) {
  const primary = normalizeKey(favorites?.primaryTeamId)
  if (!primary) return false
  return getTeamIdentityValues(team).some(value => value === primary)
}

function matchContainsFavorite(match, favorites = {}) {
  return teamMatchesFavorite(match?.team_a, favorites) || teamMatchesFavorite(match?.team_b, favorites)
}

function matchTeamRank(match, standingsByTeam) {
  const teamRanks = [match?.team_a, match?.team_b]
    .map(team => getTeamIdentityValues(team).map(value => standingsByTeam.get(value)).find(Boolean))
    .filter(Boolean)
    .map(row => toNumber(row.rank, 999))

  if (teamRanks.length < 2) return 999
  return Math.abs(teamRanks[0] - teamRanks[1])
}

function getRules(season, db) {
  return getSeasonRules(season, db)
}

export function getSwissRules(season, db) {
  const rules = getRules(season, db)
  const swiss = rules?.advance?.swiss || {}
  const advancement = rules?.advancement || {}
  const swissStage = rules?.swissStage || {}
  const maxRounds = toNumber(swiss.rounds ?? swissStage.maxRounds ?? rules?.swiss?.round_count, 6)
  const totalSlots = toNumber(swiss.totalSlots ?? advancement.totalSlots, 8)
  const directAdvanceWins = toNumber(swiss.directAdvanceWins ?? advancement.directAdvanceWins, 5)
  const lcqSurvivalWins = toNumber(swiss.breakthroughWins ?? advancement.lcqSurvivalWins, 3)
  const directSlots = swiss.directSlots ?? null
  const breakthroughSlots = swiss.breakthroughSlots ?? null

  return {
    maxRounds,
    matchesPerRound: toNumber(swiss.matchesPerRound, Math.ceil(safeArr(db?.teams).length / 2)),
    totalSlots,
    directAdvanceWins,
    lcqSurvivalWins,
    directSlots,
    breakthroughSlots,
    eliminatedLosses: toNumber(swiss.eliminatedLosses, maxRounds - lcqSurvivalWins + 1),
    tiebreakers: safeArr(swiss.tiebreakers || swissStage.tiebreakers || rules?.tiebreakers)
  }
}

function getExpectedSwissMatchCount(db, season) {
  const rules = getSwissRules(season, db)
  return rules.maxRounds > 0 && rules.matchesPerRound > 0
    ? rules.maxRounds * rules.matchesPerRound
    : 0
}

function isSeasonCompleteByPublishedMatches(db, season, completedCount, matchCount) {
  if (!matchCount || completedCount !== matchCount) return false

  const expectedSwissMatches = getExpectedSwissMatchCount(db, season)
  return !expectedSwissMatches || matchCount >= expectedSwissMatches
}

export function getSwissMatches(db) {
  return safeArr(db?.matches).filter(isSwissMatch).sort(compareAscByTime)
}

export function getAdvancePhaseState(db, season) {
  const matches = safeArr(db?.matches)
  const swissMatches = getSwissMatches(db)
  const breakthroughMatches = getBracketPhaseMatches(db, BRACKET_PHASES.BREAKTHROUGH)
  const playoffMatches = getBracketPhaseMatches(db, BRACKET_PHASES.PLAYOFFS)
  const completed = matches.filter(isComplete)
  const live = matches.filter(isLive)
  const swissCompleted = swissMatches.filter(isComplete)
  const breakthroughCompleted = breakthroughMatches.filter(isComplete)
  const playoffCompleted = playoffMatches.filter(isComplete)
  const rules = getSwissRules(season, db)
  const swissRoundCount = new Set(swissMatches.map(match => getRoundKey(match.round || match.stage)).filter(Boolean)).size
  const swissStarted = swissCompleted.length > 0 || swissMatches.some(isLive)
  const swissFinished = Boolean(
    swissMatches.length &&
    swissCompleted.length === swissMatches.length &&
    swissRoundCount >= rules.maxRounds
  )
  const breakthroughStarted = breakthroughCompleted.length > 0 || breakthroughMatches.some(isLive)
  const breakthroughFinished = Boolean(breakthroughMatches.length && breakthroughCompleted.length === breakthroughMatches.length)
  const playoffsStarted = playoffCompleted.length > 0 || playoffMatches.some(isLive)
  const playoffsFinished = Boolean(playoffMatches.length && playoffCompleted.length === playoffMatches.length)
  const seasonFinished = isSeasonCompleteByPublishedMatches(db, season, completed.length, matches.length)

  return {
    phases: ADVANCE_PHASES,
    seasonFinished,
    seasonStarted: completed.length > 0 || live.length > 0,
    swissStarted,
    swissFinished,
    breakthroughStarted,
    breakthroughFinished,
    playoffsStarted,
    playoffsFinished,
    counts: {
      matches: matches.length,
      completed: completed.length,
      live: live.length,
      swiss: swissMatches.length,
      swissCompleted: swissCompleted.length,
      breakthrough: breakthroughMatches.length,
      breakthroughCompleted: breakthroughCompleted.length,
      playoffs: playoffMatches.length,
      playoffCompleted: playoffCompleted.length
    }
  }
}

export function getDefaultAdvancePhase(db, season) {
  const state = getAdvancePhaseState(db, season)

  if (state.seasonFinished) return 'final'
  if (!state.swissStarted || !state.swissFinished) return 'swiss'
  if (!state.breakthroughStarted || !state.breakthroughFinished) return 'breakthrough'
  if (state.playoffsStarted && !state.playoffsFinished) return 'playoffs'
  if (state.playoffsFinished) return 'final'
  return 'playoffs'
}

export function isValidAdvancePhase(phase, season, db) {
  const phases = safeArr(getRules(season, db)?.advance?.phases)
  const allowed = phases.length ? phases : ADVANCE_PHASES
  return allowed.includes(phase)
}

export function getAdvanceStageRail(db, season, activePhase) {
  const defaultPhase = getDefaultAdvancePhase(db, season)
  const phaseOrder = new Map(ADVANCE_PHASES.map((phase, index) => [phase, index]))
  const currentIndex = phaseOrder.get(defaultPhase) ?? 0
  const selectedIndex = phaseOrder.get(activePhase) ?? currentIndex
  const phaseState = getAdvancePhaseState(db, season)
  const pendingBreakthroughRules = !phaseState.breakthroughStarted && !phaseState.breakthroughFinished

  return ADVANCE_PHASES.map((phase, index) => {
    let status = 'upcoming'
    if (index < currentIndex) status = 'completed'
    if (index === currentIndex) status = 'current'
    if (phase === 'breakthrough' && pendingBreakthroughRules && currentIndex <= index) status = 'pending'

    return {
      phase,
      index: index + 1,
      status,
      selected: index === selectedIndex,
      isActualCurrent: phase === defaultPhase
    }
  })
}

export function getSwissOverview(db, season) {
  const swissMatches = getSwissMatches(db)
  const completed = swissMatches.filter(isComplete)
  const live = swissMatches.filter(isLive)
  const upcoming = swissMatches.filter(match => !isComplete(match) && !isLive(match))
  const rules = getSwissRules(season, db)
  const currentMatch = swissMatches.find(match => isLive(match) || !isComplete(match)) ||
    completed.at(-1) ||
    swissMatches[0] ||
    null
  const currentRoundKey = getRoundKey(currentMatch?.round || currentMatch?.stage)
  const roundMatches = currentRoundKey
    ? swissMatches.filter(match => getRoundKey(match?.round || match?.stage) === currentRoundKey)
    : swissMatches
  const roundCompleted = roundMatches.filter(isComplete).length
  const roundNumber = toNumber(getRoundNumber(currentMatch?.round || currentMatch?.stage), completed.length ? rules.maxRounds : 1)
  const nextMatch = upcoming[0] || null
  const phaseState = getAdvancePhaseState(db, season)

  return {
    seasonFinished: phaseState.seasonFinished,
    swissFinished: phaseState.swissFinished,
    hasStarted: completed.length > 0 || live.length > 0,
    teamCount: safeArr(db?.teams).length,
    rounds: rules.maxRounds,
    currentRound: Math.min(rules.maxRounds, Math.max(1, roundNumber)),
    currentRoundLabel: currentMatch?.round || (rules.maxRounds ? `ROUND ${Math.min(rules.maxRounds, Math.max(1, roundNumber))}` : 'ROUND'),
    matchesPerRound: rules.matchesPerRound,
    totalMatches: swissMatches.length,
    completedMatches: completed.length,
    liveMatches: live.length,
    upcomingMatches: upcoming.length,
    roundTotal: roundMatches.length,
    roundCompleted,
    roundProgressLabel: `${roundCompleted} / ${roundMatches.length || rules.matchesPerRound || 0}`,
    nextMatch,
    nextStart: nextMatch ? formatShortDateTime(nextMatch) : '',
    rules
  }
}

export function getSwissTeamStatus(row, season, db) {
  const rules = getSwissRules(season, db)
  const wins = toNumber(row?.match_wins)
  const losses = toNumber(row?.match_losses)

  if (wins >= rules.directAdvanceWins) return 'direct'
  if (wins >= rules.lcqSurvivalWins) return 'breakthrough'
  if (losses >= rules.eliminatedLosses) return 'eliminated'
  if (losses === rules.eliminatedLosses - 1) return 'danger'
  return 'contending'
}

export function getSwissStandingsRows(db, season, favorites = {}) {
  const rows = calculateSwissStandings(db)

  return rows.map(row => {
    const status = getSwissTeamStatus(row, season, db)
    return {
      ...row,
      status,
      recordLabel: `${toNumber(row.match_wins)}-${toNumber(row.match_losses)}`,
      mapRecordLabel: `${toNumber(row.map_wins)}-${toNumber(row.map_losses)}`,
      mapDiffLabel: toNumber(row.map_diff) > 0 ? `+${toNumber(row.map_diff)}` : String(toNumber(row.map_diff)),
      opponentWinRateLabel: `${(toNumber(row.opponent_win_rate) * 100).toFixed(1)}%`,
      isFavorite: teamMatchesFavorite(row, favorites),
      isPrimaryFavorite: teamMatchesPrimary(row, favorites)
    }
  })
}

export function getSwissZoneCounts(db, season, favorites = {}) {
  const rows = getSwissStandingsRows(db, season, favorites)
  const zones = [
    { key: 'direct', tone: 'direct', rows: [] },
    { key: 'breakthrough', tone: 'breakthrough', rows: [] },
    { key: 'contending', tone: 'contending', rows: [] },
    { key: 'danger', tone: 'danger', rows: [] },
    { key: 'eliminated', tone: 'eliminated', rows: [] }
  ]
  const zoneMap = new Map(zones.map(zone => [zone.key, zone]))

  rows.forEach(row => {
    zoneMap.get(row.status)?.rows.push(row)
  })

  return zones.map(zone => ({
    ...zone,
    count: zone.rows.length
  }))
}

export function getSwissTiebreakers(season, db) {
  const configured = getSwissRules(season, db).tiebreakers
  const fallback = [
    'match_wins',
    'buchholz',
    'head_to_head',
    'opponent_win_rate',
    'tournament_ruling'
  ]

  return (configured.length ? configured : fallback).map((rule, index) => ({
    key: normalizeText(rule),
    index: index + 1
  }))
}

export function getSwissKeyMatches(db, season, favorites = {}, limit = 3) {
  const overview = getSwissOverview(db, season)
  const roundMatches = overview.currentRoundLabel
    ? getSwissMatches(db).filter(match => getRoundKey(match?.round || match?.stage) === getRoundKey(overview.currentRoundLabel))
    : getSwissMatches(db)
  const unfinished = roundMatches.filter(match => !isComplete(match))
  const standings = getSwissStandingsRows(db, season, favorites)
  const standingsByTeam = new Map()

  standings.forEach(row => {
    getTeamIdentityValues(row).forEach(value => standingsByTeam.set(value, row))
  })

  const hasRankData = standings.some(row => toNumber(row.matches_played) > 0)
  const now = Date.now()
  const scored = unfinished.map(match => {
    const time = getMatchTime(match)
    const timeScore = time ? Math.max(0, 36 - Math.abs(time - now) / 3600000) : 0
    const favoriteScore = matchContainsFavorite(match, favorites) ? 120 : 0
    const rankScore = hasRankData ? Math.max(0, 80 - matchTeamRank(match, standingsByTeam) * 5) : 0
    return {
      match,
      score: favoriteScore + rankScore + timeScore
    }
  })

  if (!hasRankData) {
    return scored
      .filter(item => item.score > 0 || getMatchTime(item.match))
      .sort((a, b) => b.score - a.score || compareAscByTime(a.match, b.match))
      .slice(0, limit)
      .map(item => item.match)
  }

  return scored
    .sort((a, b) => b.score - a.score || compareAscByTime(a.match, b.match))
    .slice(0, limit)
    .map(item => item.match)
}

function getConfiguredPhase(season, db, phase) {
  return getRules(season, db)?.advance?.[phase] || {}
}

export function getBreakthroughState(db, season) {
  const config = getConfiguredPhase(season, db, 'breakthrough')
  const bracket = adaptBracketFromDb(db, BRACKET_PHASES.BREAKTHROUGH, {
    bracketType: config.format || 'single_elimination'
  })
  const matches = getBracketPhaseMatches(db, BRACKET_PHASES.BREAKTHROUGH)
  const completed = matches.filter(isComplete)
  const status = config.status === 'pending_rules' || (!matches.length && !bracket.rounds.length)
    ? 'pending_rules'
    : matches.some(isLive)
      ? 'active'
      : matches.length && completed.length === matches.length
        ? 'completed'
        : 'ready'

  return {
    status,
    format: config.format || (bracket.rounds.length ? 'single_elimination' : null),
    bracketSource: config.bracketSource || 'backend',
    bracket,
    matches,
    completedMatches: completed.length
  }
}

export function getBreakthroughBracket(db, season) {
  return getBreakthroughState(db, season).bracket
}

export function getPlayoffBracket(db, season) {
  const config = getConfiguredPhase(season, db, 'playoffs')
  return adaptBracketFromDb(db, BRACKET_PHASES.PLAYOFFS, {
    bracketType: config.format || 'double_elimination'
  })
}

export function getBracketRounds(bracket) {
  return safeArr(bracket?.rounds)
}

export function getBracketMatchNodes(bracket) {
  return getBracketRounds(bracket).flatMap(round => safeArr(round.matches))
}

export function getFinalRanking(db) {
  return safeArr(db?.teams)
    .filter(team => toNumber(team?.final_rank, 0) > 0)
    .sort((a, b) => toNumber(a.final_rank, 999) - toNumber(b.final_rank, 999))
}

function getWinnerSide(match) {
  const winner = normalizeKey(match?.winner)
  const aValues = getTeamIdentityValues(match?.team_a)
  const bValues = getTeamIdentityValues(match?.team_b)
  if (winner && aValues.includes(winner)) return 'A'
  if (winner && bValues.includes(winner)) return 'B'

  const scoreA = toNumber(match?.team_a?.score, NaN)
  const scoreB = toNumber(match?.team_b?.score, NaN)
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
    if (scoreA > scoreB) return 'A'
    if (scoreB > scoreA) return 'B'
  }

  return ''
}

function getWinnerTeam(match) {
  const side = getWinnerSide(match)
  if (side === 'A') return match?.team_a
  if (side === 'B') return match?.team_b
  return null
}

function getLoserTeam(match) {
  const side = getWinnerSide(match)
  if (side === 'A') return match?.team_b
  if (side === 'B') return match?.team_a
  return null
}

function getGrandFinalMatch(db) {
  return getBracketPhaseMatches(db, BRACKET_PHASES.PLAYOFFS)
    .filter(match => /GRAND|总决|FINAL/.test(`${match?.round || ''} ${match?.match_display_name || ''}`.toUpperCase()))
    .sort(compareAscByTime)
    .at(-1) || null
}

export function getChampion(db) {
  const ranked = getFinalRanking(db)
  if (ranked[0]) return ranked[0]
  return getWinnerTeam(getGrandFinalMatch(db))
}

export function getChampionPath(db) {
  const champion = getChampion(db)
  const championKeys = new Set(getTeamIdentityValues(champion))
  if (!championKeys.size) return []

  return getBracketPhaseMatches(db, BRACKET_PHASES.PLAYOFFS)
    .filter(match => {
      return [...getTeamIdentityValues(match?.team_a), ...getTeamIdentityValues(match?.team_b)]
        .some(value => championKeys.has(value))
    })
    .sort((a, b) => comparePlayoffRound(a, b) || compareAscByTime(a, b))
    .map(match => {
      const isA = getTeamIdentityValues(match?.team_a).some(value => championKeys.has(value))
      const opponent = isA ? match?.team_b : match?.team_a
      const championScore = isA ? match?.team_a?.score : match?.team_b?.score
      const opponentScore = isA ? match?.team_b?.score : match?.team_a?.score
      return {
        match,
        matchId: match?.match_id || match?.id,
        stage: match?.round || match?.stage || '',
        opponent,
        scoreLabel: `${scoreText(championScore)} : ${scoreText(opponentScore)}`,
        status: isComplete(match) ? 'completed' : isLive(match) ? 'active' : 'scheduled',
        won: getTeamIdentityValues(getWinnerTeam(match)).some(value => championKeys.has(value))
      }
    })
}

function scoreText(value) {
  return value === '' || value === null || value === undefined ? '—' : String(value)
}

function comparePlayoffRound(a, b) {
  return playoffRoundOrder(a) - playoffRoundOrder(b)
}

function playoffRoundOrder(match) {
  const text = `${match?.round || ''} ${match?.match_display_name || ''}`.toUpperCase()
  const number = toNumber(text.match(/\d+/)?.[0], 0)
  if (/UB/.test(text) && /QF/.test(text)) return 10
  if (/LB/.test(text) && /R1/.test(text)) return 20
  if (/UB/.test(text) && /SF/.test(text)) return 30
  if (/LB/.test(text) && /R2/.test(text)) return 40
  if (/UB/.test(text) && /FINAL/.test(text)) return 50
  if (/LB/.test(text) && /R3/.test(text)) return 60
  if (/LB/.test(text) && /FINAL/.test(text)) return 70
  if (/GRAND/.test(text)) return 80
  return 100 + number
}

export function getFinalResult(db) {
  const champion = getChampion(db)
  const grandFinal = getGrandFinalMatch(db)

  return {
    champion,
    runnerUp: getLoserTeam(grandFinal),
    grandFinal,
    scoreLabel: grandFinal ? `${scoreText(grandFinal?.team_a?.score)} : ${scoreText(grandFinal?.team_b?.score)}` : '',
    finalRanking: getFinalRanking(db),
    championPath: getChampionPath(db)
  }
}

export function getAdvanceSummary(db, season) {
  const phaseState = getAdvancePhaseState(db, season)
  const overview = getSwissOverview(db, season)
  const finalResult = getFinalResult(db)
  const defaultPhase = getDefaultAdvancePhase(db, season)
  const nextPhase = defaultPhase === 'swiss'
    ? 'breakthrough'
    : defaultPhase === 'breakthrough'
      ? 'playoffs'
      : defaultPhase === 'playoffs'
        ? 'final'
        : ''

  return {
    phase: defaultPhase,
    phaseState,
    currentStageLabel: defaultPhase,
    roundLabel: overview.currentRound ? `${overview.currentRound} / ${overview.rounds}` : '',
    roundProgressLabel: overview.roundProgressLabel,
    nextPhase,
    champion: finalResult.champion,
    grandFinal: finalResult.grandFinal,
    grandFinalScore: finalResult.grandFinal ? `${teamShort(finalResult.grandFinal.team_a)} ${scoreText(finalResult.grandFinal.team_a?.score)} : ${scoreText(finalResult.grandFinal.team_b?.score)} ${teamShort(finalResult.grandFinal.team_b)}` : ''
  }
}

export function formatShortDateTime(match) {
  if (!match) return ''
  if (match.scheduled_date && match.scheduled_time) return `${String(match.scheduled_date).slice(5)} ${match.scheduled_time}`
  const time = getMatchTime(match)
  if (!time) return ''
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

export function teamShort(team) {
  return normalizeText(team?.team_short_name || team?.short || team?.team_id || team?.id || team?.team_name || team?.name || 'TBD')
}

export function teamFull(team) {
  return normalizeText(team?.team_name || team?.name || teamShort(team))
}

export function getMatchStatusLabelKey(status) {
  const raw = normalizeText(status).toLowerCase()
  if (raw === 'completed') return 'advance.matchStatus.completed'
  if (raw === 'active') return 'advance.matchStatus.active'
  if (raw === 'postponed') return 'advance.matchStatus.postponed'
  if (raw === 'cancelled') return 'advance.matchStatus.cancelled'
  return 'advance.matchStatus.scheduled'
}
