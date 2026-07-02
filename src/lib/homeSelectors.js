import { calculateSwissStandings } from './swissEngine.js'
import { getOwHeroCanonicalKey, getOwHeroCanonicalName } from './heroes.js'

export const safeArr = value => Array.isArray(value) ? value : []

const COMPLETE_STATUSES = new Set(['COMPLETE', 'COMPLETED'])
const LIVE_STATUSES = new Set(['IN_PROGRESS', 'LIVE'])

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase()
}

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function isComplete(match) {
  return COMPLETE_STATUSES.has(String(match?.status || '').toUpperCase())
}

function isLive(match) {
  return LIVE_STATUSES.has(String(match?.status || '').toUpperCase())
}

function getMatchTime(match) {
  const candidates = [
    match?.scheduled_at,
    match?.match_date,
    match?.date,
    match?.scheduled_date && match?.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : ''
  ]
  const value = candidates.find(Boolean)
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

function getScore(match, side) {
  const team = side === 'A' ? match?.team_a : match?.team_b
  const value = team?.score
  return value === '' || value === undefined || value === null ? '-' : String(value)
}

function teamName(team) {
  return team?.team_short_name || team?.short || team?.team_name || team?.name || 'TBD'
}

function teamFullName(team) {
  return team?.team_name || team?.name || teamName(team)
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

function matchContainsTeam(match, team) {
  const identities = new Set(teamIdentityValues(team))
  if (!identities.size) return false
  return [
    ...teamIdentityValues(match?.team_a),
    ...teamIdentityValues(match?.team_b)
  ].some(value => identities.has(value))
}

function getOpponent(match, team) {
  const identities = new Set(teamIdentityValues(team))
  const aMatches = teamIdentityValues(match?.team_a).some(value => identities.has(value))
  const bMatches = teamIdentityValues(match?.team_b).some(value => identities.has(value))
  if (aMatches) return match?.team_b
  if (bMatches) return match?.team_a
  return null
}

function getWinnerSide(match) {
  const winner = normalizeKey(match?.winner)
  const aValues = teamIdentityValues(match?.team_a)
  const bValues = teamIdentityValues(match?.team_b)

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

function getTeamResult(match, team) {
  const winner = getWinnerTeam(match)
  if (!winner) return 'pending'
  const favoriteKeys = new Set(teamIdentityValues(team))
  return teamIdentityValues(winner).some(value => favoriteKeys.has(value)) ? 'win' : 'loss'
}

function getCompletedMaps(match) {
  return safeArr(match?.maps).filter(map => {
    const hasName = normalizeText(map?.map_name) && String(map?.map_type || '').toUpperCase() !== 'UNKNOWN'
    const hasScore = normalizeText(map?.score_a) || normalizeText(map?.score_b)
    const hasCode = normalizeText(map?.lobby_code)
    const hasStats = [...safeArr(map?.team_a_stats), ...safeArr(map?.team_b_stats)]
      .some(row => toNumber(row?.eliminations) > 0 || toNumber(row?.damage) > 0 || normalizeText(row?.heroes_played))
    return hasName || hasScore || hasCode || hasStats
  })
}

function getLobbyCodes(match) {
  return getCompletedMaps(match)
    .map(map => normalizeText(map?.lobby_code))
    .filter(Boolean)
}

function compareDescByTime(a, b) {
  const timeDelta = getMatchTime(b) - getMatchTime(a)
  if (timeDelta !== 0) return timeDelta
  return String(b?.match_id || '').localeCompare(String(a?.match_id || ''))
}

function compareAscByTime(a, b) {
  const timeDelta = getMatchTime(a) - getMatchTime(b)
  if (timeDelta !== 0) return timeDelta
  return String(a?.match_id || '').localeCompare(String(b?.match_id || ''))
}

function getExpectedSwissMatchCount(db, season) {
  const rules = getRules(season, db)
  const swiss = rules?.advance?.swiss || {}
  const swissStage = rules?.swissStage || {}
  const expectedRounds = toNumber(swiss.rounds ?? swissStage.maxRounds ?? rules?.swiss?.round_count, 0)
  const teamCount = safeArr(db?.teams).length
  const matchesPerRound = toNumber(
    swiss.matchesPerRound ?? swissStage.matchesPerRound,
    teamCount > 1 ? Math.ceil(teamCount / 2) : 0
  )

  return expectedRounds > 0 && matchesPerRound > 0 ? expectedRounds * matchesPerRound : 0
}

function isSeasonCompleteByPublishedMatches(db, season, completedCount, matchCount) {
  if (!matchCount || completedCount !== matchCount) return false

  const expectedSwissMatches = getExpectedSwissMatchCount(db, season)
  return !expectedSwissMatches || matchCount >= expectedSwissMatches
}

export function getSeasonStatus(db, season = null) {
  const matches = safeArr(db?.matches)
  const completed = matches.filter(isComplete)
  const live = matches.filter(isLive)
  const upcoming = matches.filter(match => !isComplete(match) && !isLive(match))
  const progress = matches.length ? Math.round((completed.length / matches.length) * 100) : 0
  const isFinished = isSeasonCompleteByPublishedMatches(db, season, completed.length, matches.length)

  let phase = 'pending'
  let label = '等待赛程'
  if (isFinished) {
    phase = 'complete'
    label = '赛季已完结'
  } else if (live.length) {
    phase = 'live'
    label = '比赛进行中'
  } else if (completed.length) {
    phase = 'active'
    label = '赛季进行中'
  } else if (upcoming.length) {
    phase = 'scheduled'
    label = '赛程已发布'
  }

  return {
    phase,
    label,
    isFinished: phase === 'complete',
    isActive: ['live', 'active', 'scheduled'].includes(phase),
    totalMatches: matches.length,
    completedMatches: completed.length,
    liveMatches: live.length,
    upcomingMatches: upcoming.length,
    progress
  }
}

export function getHomeSummary(db) {
  const matches = safeArr(db?.matches)
  const maps = matches.reduce((sum, match) => sum + getCompletedMaps(match).length, 0)
  return {
    teams: safeArr(db?.teams).length,
    players: safeArr(db?.players).length,
    matches: matches.length,
    maps,
    completed: matches.filter(isComplete).length,
    live: matches.filter(isLive).length,
    upcoming: matches.filter(match => !isComplete(match) && !isLive(match)).length
  }
}

export function getRecentResults(db, limit = 5) {
  return safeArr(db?.matches)
    .filter(isComplete)
    .sort(compareDescByTime)
    .slice(0, limit)
    .map(match => ({
      ...match,
      scoreText: `${getScore(match, 'A')} : ${getScore(match, 'B')}`,
      winnerTeam: getWinnerTeam(match),
      lobbyCodes: getLobbyCodes(match)
    }))
}

export function getUpcomingMatches(db, limit = 5) {
  return safeArr(db?.matches)
    .filter(match => !isComplete(match))
    .sort(compareAscByTime)
    .slice(0, limit)
}

export function getThisWeekMatches(db, limit = 6, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const startTime = start.getTime()
  const endTime = end.getTime()

  return safeArr(db?.matches)
    .filter(match => {
      const time = getMatchTime(match)
      return time >= startTime && time < endTime
    })
    .sort(compareAscByTime)
    .slice(0, limit)
}

export function getAdvanceSnapshot(db, limit = 8, season = null) {
  const standings = calculateSwissStandings(db)
  const matches = safeArr(db?.matches)
  const completedMatches = matches.filter(isComplete)
  const rules = {
    ...(season?.rules || {}),
    ...(db?.meta?.rules && typeof db.meta.rules === 'object' ? db.meta.rules : {}),
    ...(db?.season?.rules && typeof db.season.rules === 'object' ? db.season.rules : {})
  }
  const maxRounds = toNumber(rules?.swissStage?.maxRounds, 6)
  const totalSlots = toNumber(rules?.advancement?.totalSlots, 8)
  const directAdvanceWins = toNumber(rules?.advancement?.directAdvanceWins, 5)
  const lcqSurvivalWins = toNumber(rules?.advancement?.lcqSurvivalWins, 3)

  if (!completedMatches.length) {
    return {
      phase: 'not_started',
      hasStarted: false,
      title: '瑞士轮尚未开始',
      overview: {
        teamCount: safeArr(db?.teams).length,
        expectedRounds: maxRounds,
        advancementSlots: totalSlots,
        currentStatus: matches.length ? '赛程已发布' : '赛程待发布'
      },
      standings: [],
      zones: {
        direct: [],
        contest: [],
        danger: [],
        eliminated: []
      },
      rules: [
        `预计进行 ${maxRounds} 轮瑞士轮`,
        `晋级名额 ${totalSlots} 个`,
        `${directAdvanceWins} 胜进入直通区`,
        `${lcqSurvivalWins} 胜进入竞争区`
      ]
    }
  }

  const direct = standings.filter(team => toNumber(team.match_wins) >= directAdvanceWins)
  const contest = standings.filter(team => {
    const wins = toNumber(team.match_wins)
    return wins >= lcqSurvivalWins && wins < directAdvanceWins
  })
  const danger = standings.filter(team => {
    const wins = toNumber(team.match_wins)
    const losses = toNumber(team.match_losses)
    return wins < lcqSurvivalWins && losses >= lcqSurvivalWins
  })
  const eliminated = standings.filter(team => toNumber(team.match_losses) > lcqSurvivalWins)

  return {
    phase: 'swiss_active',
    hasStarted: true,
    title: '瑞士轮晋级形势',
    overview: {
      teamCount: safeArr(db?.teams).length,
      expectedRounds: maxRounds,
      advancementSlots: totalSlots,
      currentStatus: '战绩更新中'
    },
    standings: standings.slice(0, limit),
    zones: {
      direct,
      contest,
      danger,
      eliminated
    },
    rules: [
      '先比较瑞士轮胜负场',
      '同战绩比较 Buchholz',
      '两队同分时比较直接交手',
      '仍无法区分时比较对手胜率'
    ]
  }
}

export function getFavoriteTeamDashboard(db, favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites.favoriteTeamIds).map(normalizeKey))
  if (!favoriteKeys.size) return []

  const standingsByIdentity = new Map()
  calculateSwissStandings(db).forEach(row => {
    teamIdentityValues(row).forEach(value => standingsByIdentity.set(value, row))
  })

  return safeArr(db?.teams)
    .filter(team => teamIdentityValues(team).some(value => favoriteKeys.has(value)))
    .map(team => {
      const matches = safeArr(db?.matches).filter(match => matchContainsTeam(match, team))
      const nextMatch = matches.filter(match => !isComplete(match)).sort(compareAscByTime)[0] || null
      const latestResult = matches.filter(isComplete).sort(compareDescByTime)[0] || null
      const standing = teamIdentityValues(team).map(value => standingsByIdentity.get(value)).find(Boolean) || null

      return {
        team,
        standing,
        nextMatch,
        nextOpponent: nextMatch ? getOpponent(nextMatch, team) : null,
        latestResult,
        latestOpponent: latestResult ? getOpponent(latestResult, team) : null,
        latestResultType: latestResult ? getTeamResult(latestResult, team) : '',
        matchesPlayed: matches.filter(isComplete).length
      }
    })
}

export function getFavoritePlayerDashboard(db, favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites.favoritePlayerIds).map(normalizeKey))
  if (!favoriteKeys.size) return []

  const totalsById = new Map(safeArr(db?.player_totals).map(row => [normalizeKey(row?.player_id), row]))

  return safeArr(db?.players)
    .filter(player => favoriteKeys.has(normalizeKey(player?.player_id)))
    .map(player => ({
      ...player,
      total: totalsById.get(normalizeKey(player?.player_id)) || null
    }))
}

export function getDataPulse(db) {
  const playerTotals = safeArr(db?.player_totals).filter(player => toNumber(player?.raw_time_mins) > 0)
  const completedMatches = safeArr(db?.matches).filter(isComplete)
  const heroCounts = new Map()
  const mapCounts = new Map()
  let codeCount = 0

  completedMatches.forEach(match => {
    getCompletedMaps(match).forEach(map => {
      const mapName = normalizeText(map?.map_name)
      if (mapName) mapCounts.set(mapName, (mapCounts.get(mapName) || 0) + 1)
      if (normalizeText(map?.lobby_code)) codeCount += 1

      const stats = [...safeArr(map?.team_a_stats), ...safeArr(map?.team_b_stats)]
      stats.forEach(row => {
        const rawHero = normalizeText(row?.heroes_played)
        const heroKey = getOwHeroCanonicalKey(rawHero)
        if (heroKey) {
          const current = heroCounts.get(heroKey) || { name: getOwHeroCanonicalName(rawHero), count: 0 }
          current.count += 1
          heroCounts.set(heroKey, current)
        }
      })
    })
  })

  const topBy = (key) => [...playerTotals].sort((a, b) => toNumber(b?.[key]) - toNumber(a?.[key]))[0] || null
  const topEntry = map => [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null

  const topHero = topEntry(new Map([...heroCounts.entries()].map(([key, value]) => [key, value.count])))
  const topMap = topEntry(mapCounts)

  return {
    topDamage: topBy('avg_dmg'),
    topHealing: topBy('avg_heal'),
    topBlock: topBy('avg_block'),
    topElim: topBy('avg_elim'),
    topHero: topHero ? { name: heroCounts.get(topHero[0])?.name || topHero[0], count: topHero[1] } : null,
    topMap: topMap ? { name: topMap[0], count: topMap[1] } : null,
    codeCount
  }
}

export function getArchiveHighlights(db) {
  const completedMatches = safeArr(db?.matches).filter(isComplete).sort(compareDescByTime)
  const playoffMatches = completedMatches.filter(match => {
    const stage = String(match?.stage || '').toUpperCase()
    const round = String(match?.round || '').toUpperCase()
    const id = String(match?.match_id || '').toUpperCase()
    return stage.includes('PLAYOFF') || round.includes('FINAL') || id.includes('PLAYOFF') || id.includes('GF')
  })
  const finalMatch = playoffMatches.find(match => String(match?.round || '').toUpperCase().includes('GRAND')) ||
    playoffMatches[0] ||
    completedMatches[0] ||
    null

  const rankedTeams = safeArr(db?.teams)
    .filter(team => toNumber(team?.final_rank, 0) > 0)
    .sort((a, b) => toNumber(a.final_rank, 999) - toNumber(b.final_rank, 999))

  const champion = rankedTeams[0] || getWinnerTeam(finalMatch)
  const runnerUp = rankedTeams[1] || getLoserTeam(finalMatch)

  const classicMatches = completedMatches
    .map(match => ({
      ...match,
      lobbyCodes: getLobbyCodes(match),
      mapCount: getCompletedMaps(match).length,
      winnerTeam: getWinnerTeam(match),
      scoreText: `${getScore(match, 'A')} : ${getScore(match, 'B')}`
    }))
    .filter(match => match.lobbyCodes.length || match.mapCount >= 4)
    .slice(0, 4)

  const pulse = getDataPulse(db)
  const dataKings = [
    pulse.topElim ? { key: 'elim', label: '击杀火力', player: pulse.topElim, value: Number(pulse.topElim.avg_elim || 0).toFixed(1), unit: 'ELIM /10' } : null,
    pulse.topDamage ? { key: 'damage', label: '伤害压制', player: pulse.topDamage, value: Number(pulse.topDamage.avg_dmg || 0).toFixed(0), unit: 'DMG /10' } : null,
    pulse.topHealing ? { key: 'healing', label: '支援续航', player: pulse.topHealing, value: Number(pulse.topHealing.avg_heal || 0).toFixed(0), unit: 'HEAL /10' } : null,
    pulse.topBlock ? { key: 'block', label: '前排屏障', player: pulse.topBlock, value: Number(pulse.topBlock.avg_block || 0).toFixed(0), unit: 'MIT /10' } : null
  ].filter(Boolean)

  return {
    champion,
    runnerUp,
    finalMatch,
    finalRanking: rankedTeams.slice(0, 8),
    classicMatches,
    dataKings
  }
}

export function formatTeamName(team) {
  return teamName(team)
}

export function formatTeamFullName(team) {
  return teamFullName(team)
}

export function formatMatchTitle(match) {
  return match?.match_display_name || `${teamName(match?.team_a)} VS ${teamName(match?.team_b)}`
}

export function formatMatchScore(match) {
  return `${getScore(match, 'A')} : ${getScore(match, 'B')}`
}

export function formatMatchDate(match, fallback = '时间待定') {
  const time = getMatchTime(match)
  if (!time) return fallback
  const date = new Date(time)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function getShortDateTime(match, fallback = '时间待定') {
  if (match?.scheduled_date && match?.scheduled_time) {
    return `${String(match.scheduled_date).slice(5)} ${match.scheduled_time}`
  }

  const time = getMatchTime(match)
  if (!time) return fallback
  const date = new Date(time)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function getDateSlotKey(match) {
  return getShortDateTime(match)
}

function getRoundNumber(value) {
  return normalizeText(value).match(/\d+/)?.[0] || ''
}

function getRoundKey(value) {
  const text = normalizeText(value).toLowerCase()
  const number = getRoundNumber(text)
  return number ? `round-${number}` : text
}

function getReadableRound(match) {
  const stage = normalizeText(match?.stage)
  const round = normalizeText(match?.round || match?.stage)
  const number = getRoundNumber(round)

  if ((stage.toUpperCase() === 'SWISS' || /^ROUND/i.test(round)) && number) {
    return `瑞士轮第 ${number} 轮`
  }

  return round || stage || '赛程待发布'
}

function getSeasonDisplayName(season, db) {
  const code = normalizeText(season?.publicCode || db?.season?.publicCode || db?.meta?.publicCode)
  if (code.startsWith('FCR')) return '2026 薯条杯常规赛'
  if (code.startsWith('FCA')) return '2026 薯条杯学院赛'
  return season?.name?.zh || db?.season?.name || '薯条杯赛事'
}

function getSeasonDisplayCode(season, db) {
  return normalizeText(season?.publicCode || db?.season?.publicCode || db?.meta?.publicCode || season?.id || 'FCR2026')
}

function getRules(season, db) {
  return {
    ...(season?.rules || {}),
    ...(db?.meta?.rules && typeof db.meta.rules === 'object' ? db.meta.rules : {}),
    ...(db?.season?.rules && typeof db.season.rules === 'object' ? db.season.rules : {})
  }
}

function getAdvancementSlots(season, db) {
  return toNumber(getRules(season, db)?.advancement?.totalSlots, 8)
}

function matchIdList(match) {
  return [
    match?.match_id,
    match?.id,
    match?.raw_match_id,
    match?.match_display_name
  ].map(normalizeText).filter(Boolean)
}

function getManualFeaturedIds(season, db) {
  return safeArr(
    season?.featuredMatchIds ||
    season?.featured_match_ids ||
    db?.meta?.featured_match_ids ||
    db?.season?.featured_match_ids ||
    db?.featured_match_ids
  ).map(normalizeText).filter(Boolean)
}

function matchHasFavoriteTeam(match, favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites?.favoriteTeamIds).map(normalizeKey))
  if (!favoriteKeys.size) return false
  return [
    ...teamIdentityValues(match?.team_a),
    ...teamIdentityValues(match?.team_b)
  ].some(value => favoriteKeys.has(value))
}

function standingsByTeamIdentity(db) {
  const map = new Map()
  calculateSwissStandings(db).forEach(row => {
    teamIdentityValues(row).forEach(value => map.set(value, row))
  })
  return map
}

function getStandingForTeam(team, standingsMap) {
  return teamIdentityValues(team).map(value => standingsMap.get(value)).find(Boolean) || null
}

function getCurrentImportanceScore(match, standingsMap, advancementSlots) {
  const standingA = getStandingForTeam(match?.team_a, standingsMap)
  const standingB = getStandingForTeam(match?.team_b, standingsMap)
  const hasRanks = standingA?.rank && standingB?.rank
  if (!hasRanks) return 0

  const rankA = toNumber(standingA.rank, 999)
  const rankB = toNumber(standingB.rank, 999)
  const rankDelta = Math.abs(rankA - rankB)
  const nearCutLine = Math.min(
    Math.abs(rankA - advancementSlots),
    Math.abs(rankB - advancementSlots)
  )
  const winsDelta = Math.abs(toNumber(standingA.match_wins) - toNumber(standingB.match_wins))
  const lossesDelta = Math.abs(toNumber(standingA.match_losses) - toNumber(standingB.match_losses))

  return Math.max(0, 60 - rankDelta * 4) +
    Math.max(0, 44 - nearCutLine * 8) +
    Math.max(0, 18 - (winsDelta + lossesDelta) * 5)
}

function sortByScheduleAsc(matches) {
  return safeArr(matches).slice().sort(compareAscByTime)
}

function sortByScheduleDesc(matches) {
  return safeArr(matches).slice().sort(compareDescByTime)
}

function pickDiverseMatches(matches, limit, scorer = () => 0) {
  const rows = sortByScheduleAsc(matches)
  const slots = new Map()

  rows.forEach(match => {
    const key = getDateSlotKey(match)
    if (!slots.has(key)) slots.set(key, [])
    slots.get(key).push(match)
  })

  const selected = []
  const seen = new Set()
  const byScore = list => list.slice().sort((a, b) => {
    const scoreDelta = scorer(b) - scorer(a)
    if (scoreDelta !== 0) return scoreDelta
    return compareAscByTime(a, b)
  })

  Array.from(slots.values()).forEach(slotRows => {
    if (selected.length >= limit) return
    const match = byScore(slotRows)[0]
    const id = match?.match_id || match?.id
    if (!id || seen.has(id)) return
    selected.push(match)
    seen.add(id)
  })

  byScore(rows).forEach(match => {
    if (selected.length >= limit) return
    const id = match?.match_id || match?.id
    if (!id || seen.has(id)) return
    selected.push(match)
    seen.add(id)
  })

  return selected.slice(0, limit)
}

function findMatchesByIds(matches, ids) {
  return ids
    .map(id => safeArr(matches).find(match => matchIdList(match).some(value => normalizeKey(value) === normalizeKey(id))))
    .filter(Boolean)
}

export function getCurrentRoundSummary(db) {
  const matches = sortByScheduleAsc(db?.matches)
  const focusMatch = matches.find(match => isLive(match) || !isComplete(match)) ||
    sortByScheduleDesc(matches).find(isComplete) ||
    matches[0] ||
    null
  const focusKey = getRoundKey(focusMatch?.round || focusMatch?.stage)
  const roundMatches = focusKey
    ? matches.filter(match => getRoundKey(match?.round || match?.stage) === focusKey)
    : matches
  const completed = roundMatches.filter(isComplete).length
  const live = roundMatches.filter(isLive).length
  const upcoming = roundMatches.length - completed - live
  const nextMatch = roundMatches.find(match => isLive(match) || !isComplete(match)) || roundMatches[0] || null

  return {
    round: focusMatch?.round || focusMatch?.stage || '',
    roundLabel: getReadableRound(focusMatch),
    matches: roundMatches,
    total: roundMatches.length,
    completed,
    live,
    upcoming,
    nextMatch,
    nextStartLabel: getShortDateTime(nextMatch),
    progressLabel: `${completed} / ${roundMatches.length || matches.length || 0}`
  }
}

export function getOverviewStatus(db, season = null) {
  const summary = getHomeSummary(db)
  const seasonStatus = getSeasonStatus(db, season)
  const round = getCurrentRoundSummary(db)
  const nextMatch = getUpcomingMatches(db, 1)[0] || round.nextMatch
  const rules = getRules(season, db)
  const expectedRounds = toNumber(rules?.swissStage?.maxRounds, 6)
  const advancementSlots = getAdvancementSlots(season, db)
  const variant = seasonStatus.isFinished
    ? 'archive'
    : seasonStatus.liveMatches || seasonStatus.completedMatches
      ? 'active'
      : summary.matches
        ? 'scheduled'
        : 'preseason'
  const statusText = seasonStatus.isFinished
    ? '赛季已归档'
    : seasonStatus.liveMatches
      ? '比赛进行中'
      : seasonStatus.completedMatches
        ? '赛事进行中'
        : summary.matches
          ? '赛程已发布'
          : '赛程待发布'

  return {
    variant,
    eventCode: getSeasonDisplayCode(season, db),
    seasonName: getSeasonDisplayName(season, db),
    statusText,
    currentStage: round.total ? round.roundLabel : `瑞士轮 · 预计 ${expectedRounds} 轮`,
    nextStartLabel: nextMatch ? getShortDateTime(nextMatch) : '待定',
    roundProgressLabel: round.progressLabel,
    seasonScaleLabel: `${summary.teams} 队 / ${summary.players} 选手`,
    advancementLabel: `前 ${advancementSlots}`,
    totalMatches: summary.matches,
    completedMatches: summary.completed,
    upcomingMatches: summary.upcoming,
    mapCount: summary.maps,
    expectedRounds,
    advancementSlots,
    round
  }
}

export function getFeaturedCurrentMatches(db, options = {}) {
  const limit = toNumber(options.limit, 3)
  const round = options.round || getCurrentRoundSummary(db)
  const candidates = round.matches.length ? round.matches : safeArr(db?.matches)
  const manualMatches = findMatchesByIds(candidates, getManualFeaturedIds(options.season, db))
  const withoutFavorites = candidates.filter(match => !matchHasFavoriteTeam(match, options.favorites))
  const base = withoutFavorites.length >= limit ? withoutFavorites : candidates
  const standingsMap = standingsByTeamIdentity(db)
  const hasStandings = [...standingsMap.values()].some(row => toNumber(row?.matches_played) > 0)
  const slots = getAdvancementSlots(options.season, db)
  const now = options.now instanceof Date ? options.now.getTime() : Date.now()
  const scorer = match => {
    const time = getMatchTime(match)
    const timeScore = time ? Math.max(0, 40 - Math.abs(time - now) / 3600000) : 0
    return (hasStandings ? getCurrentImportanceScore(match, standingsMap, slots) : 0) + timeScore
  }
  const autoMatches = pickDiverseMatches(base, limit, scorer)
  const seen = new Set()

  return [...manualMatches, ...autoMatches, ...sortByScheduleAsc(base)].filter(match => {
    const id = match?.match_id || match?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, limit)
}

export function getRoundTimeSlots(db, options = {}) {
  const round = options.round || getCurrentRoundSummary(db)
  const standingsMap = standingsByTeamIdentity(db)
  const slots = new Map()

  round.matches.forEach(match => {
    const key = getDateSlotKey(match)
    if (!slots.has(key)) slots.set(key, [])
    slots.get(key).push(match)
  })

  return Array.from(slots.entries()).map(([timeLabel, matches]) => {
    const sortedMatches = sortByScheduleAsc(matches)
    const previewLimit = Math.min(3, sortedMatches.length)
    const previewMatches = pickDiverseMatches(
      sortedMatches,
      previewLimit,
      match => getCurrentImportanceScore(match, standingsMap, getAdvancementSlots(options.season, db))
    )

    return {
      key: timeLabel,
      timeLabel,
      matchCount: sortedMatches.length,
      matches: sortedMatches,
      previewMatches
    }
  })
}

export function getFollowingOverview(db, favorites = {}) {
  const favoriteTeamIds = safeArr(favorites?.favoriteTeamIds).map(String)
  const favoritePlayerIds = safeArr(favorites?.favoritePlayerIds).map(String)
  const primaryTeamId = normalizeText(favorites?.primaryTeamId || favoriteTeamIds[0])
  const favoriteKeys = new Set(favoriteTeamIds.map(normalizeKey))
  const primaryKeys = new Set([primaryTeamId].map(normalizeKey).filter(Boolean))
  const teams = safeArr(db?.teams)
    .filter(team => teamIdentityValues(team).some(value => favoriteKeys.has(value)))
    .sort((a, b) => {
      const aPrimary = teamIdentityValues(a).some(value => primaryKeys.has(value))
      const bPrimary = teamIdentityValues(b).some(value => primaryKeys.has(value))
      if (aPrimary === bPrimary) return teamName(a).localeCompare(teamName(b))
      return aPrimary ? -1 : 1
    })
  const primaryTeam = teams[0] || null
  const round = getCurrentRoundSummary(db)
  const allMatches = sortByScheduleAsc(db?.matches)
  const currentRoundMatch = primaryTeam
    ? round.matches.find(match => matchContainsTeam(match, primaryTeam)) || null
    : null
  const nextMatch = primaryTeam
    ? allMatches.find(match => !isComplete(match) && matchContainsTeam(match, primaryTeam)) || null
    : null
  const displayMatch = currentRoundMatch || null
  const opponent = displayMatch && primaryTeam ? getOpponent(displayMatch, primaryTeam) : null

  return {
    hasFavorites: Boolean(favoriteTeamIds.length || favoritePlayerIds.length),
    primaryTeam,
    displayMatch,
    nextMatch,
    opponent,
    isPrimaryInCurrentRound: Boolean(currentRoundMatch),
    favoriteTeamCount: favoriteTeamIds.length,
    extraTeamCount: Math.max(0, favoriteTeamIds.length - (primaryTeam ? 1 : 0)),
    favoritePlayerCount: favoritePlayerIds.length,
    teams
  }
}

export function getLatestResultSnapshot(db, limit = 3) {
  const matches = getRecentResults(db, limit)
  const summary = getHomeSummary(db)

  return {
    hasResults: matches.length > 0,
    matches,
    completed: summary.completed,
    total: summary.matches
  }
}

export function getOverviewResources(db, season = null) {
  const status = getOverviewStatus(db, season)

  return [
    {
      key: 'rules',
      title: '赛制规则',
      label: 'FORMAT',
      text: `${status.expectedRounds} 轮瑞士轮、晋级规则和同分规则。`,
      to: '/advance',
      primary: true
    },
    {
      key: 'roster',
      title: '参赛阵容',
      label: 'ROSTER',
      text: `${status.seasonScaleLabel}，查看队伍与选手资料。`,
      to: '/teams'
    },
    {
      key: 'database',
      title: '数据排行',
      label: 'STATS',
      text: '选手、队伍和英雄数据将在赛果确认后更新。',
      to: '/leaderboard'
    },
    {
      key: 'heroes-maps',
      title: '英雄与地图',
      label: 'HEROES / MAPS',
      text: '查看英雄使用、地图选择和比赛记录。',
      to: '/heroes'
    }
  ]
}

function getScoreDiff(match) {
  const scoreA = toNumber(match?.team_a?.score, NaN)
  const scoreB = toNumber(match?.team_b?.score, NaN)
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return 99
  return Math.abs(scoreA - scoreB)
}

function getArchiveStageScore(match) {
  const text = `${match?.stage || ''} ${match?.round || ''} ${match?.match_display_name || ''} ${match?.match_id || ''}`.toUpperCase()
  let score = 0
  if (/GRAND|FINAL|GF|总决赛/.test(text)) score += 1000
  if (/SEMI|半决赛/.test(text)) score += 520
  if (/WINNER|UPPER|UB|胜者/.test(text)) score += 500
  if (/LOSER|LOWER|LB|败者/.test(text)) score += 470
  if (/PLAYOFF|季后/.test(text)) score += 360
  if (getScoreDiff(match) <= 1) score += 130
  if (getScoreDiff(match) === 2) score += 60
  score += Math.min(60, getCompletedMaps(match).length * 10)
  return score
}

export function getArchiveFeaturedMatches(db, season = null, limit = 5) {
  const finished = getRecentResults(db, safeArr(db?.matches).length)
  const manualMatches = findMatchesByIds(finished, getManualFeaturedIds(season, db))
  const finalMatch = finished
    .filter(match => /GRAND|FINAL|GF|总决赛/i.test(`${match?.round || ''} ${match?.match_display_name || ''} ${match?.match_id || ''}`))
    .sort((a, b) => getArchiveStageScore(b) - getArchiveStageScore(a) || compareDescByTime(a, b))[0] || null
  const champion = getWinnerTeam(finalMatch)
  const championKeys = new Set(teamIdentityValues(champion))
  const championMatches = championKeys.size
    ? finished.filter(match => [
      ...teamIdentityValues(match?.team_a),
      ...teamIdentityValues(match?.team_b)
    ].some(value => championKeys.has(value)))
    : []
  const scored = finished
    .slice()
    .sort((a, b) => getArchiveStageScore(b) - getArchiveStageScore(a) || compareDescByTime(a, b))
  const merged = [
    ...manualMatches,
    finalMatch,
    ...championMatches,
    ...scored
  ].filter(Boolean)
  const seen = new Set()

  return merged.filter(match => {
    const id = match?.match_id || match?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, limit)
}
