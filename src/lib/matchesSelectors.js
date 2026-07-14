import { getSeasonById, getSeasonRules } from '../config/seasons.js'
import { formatOwMapName } from './heroes.js'

export const safeArr = value => Array.isArray(value) ? value : []

const COMPLETE_STATUSES = new Set(['COMPLETE', 'COMPLETED', 'FINISHED', 'FORFEIT', 'WALKOVER'])
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

function resolveSeason(seasonOrId) {
  if (seasonOrId && typeof seasonOrId === 'object') return seasonOrId
  return getSeasonById(seasonOrId)
}

function getExpectedSwissMatchCount(db, seasonOrId) {
  const season = resolveSeason(seasonOrId)
  const rules = getSeasonRules(season, db)
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

function isSeasonCompleteByPublishedMatches(db, seasonOrId, completedCount, matchCount) {
  if (!matchCount || completedCount !== matchCount) return false

  const expectedSwissMatches = getExpectedSwissMatchCount(db, seasonOrId)
  return !expectedSwissMatches || matchCount >= expectedSwissMatches
}

function getMatchTime(match) {
  const value = match?.scheduled_at ||
    match?.match_date ||
    match?.date ||
    (match?.scheduled_date && match?.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : '')
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
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

function matchTeamValues(match) {
  return [...teamIdentityValues(match?.team_a), ...teamIdentityValues(match?.team_b)]
}

export function isByeMatch(match) {
  return matchTeamValues(match).some(value => value === 'bye')
}

function roundKey(value) {
  const text = normalizeText(value).toLowerCase()
  const number = text.match(/\d+/)?.[0]
  return number ? `round-${number}` : text
}

function matchIdentity(match) {
  return normalizeText(match?.match_id || match?.id || match?.raw_match_id || match?.match_display_name)
}

function uniqueMatches(matches = []) {
  const seen = new Set()

  return safeArr(matches).filter(match => {
    const id = matchIdentity(match)
    const key = id || `${getMatchTime(match)}-${matchTeamValues(match).join('-')}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function isFinishedMatch(match) {
  const status = String(match?.status || '').trim().toUpperCase()
  if (match?.is_forfeit) return true
  if (COMPLETE_STATUSES.has(status)) return true
  if (status) return false
  return Boolean(normalizeText(match?.winner))
}

export function isLiveMatch(match) {
  return LIVE_STATUSES.has(String(match?.status || '').toUpperCase())
}

export function isUpcomingMatch(match) {
  return !isFinishedMatch(match) && !isLiveMatch(match)
}

export function sortMatchesBySchedule(matches = []) {
  return safeArr(matches).slice().sort((a, b) => {
    const timeDelta = getMatchTime(a) - getMatchTime(b)
    if (timeDelta !== 0) return timeDelta
    return String(a?.match_id || '').localeCompare(String(b?.match_id || ''))
  })
}

export function getAllMatches(db) {
  return sortMatchesBySchedule(safeArr(db?.matches))
}

export function getCurrentRoundValue(matches = []) {
  const displayMatches = safeArr(matches).filter(match => !isByeMatch(match))
  const active = sortMatchesBySchedule(displayMatches).find(match => isLiveMatch(match) || isUpcomingMatch(match))
  if (active?.round) return active.round
  const latest = sortMatchesBySchedule(displayMatches).filter(isFinishedMatch).at(-1)
  return latest?.round || displayMatches[0]?.round || ''
}

export function getMatchesByRound(matches = [], round = '') {
  const requested = normalizeText(round)
  const target = requested && requested !== 'ALL' ? roundKey(requested) : roundKey(getCurrentRoundValue(matches))
  if (!target) return sortMatchesBySchedule(matches)
  return sortMatchesBySchedule(matches).filter(match => roundKey(match?.round || match?.stage) === target)
}

export function getUpcomingMatches(matches = []) {
  return sortMatchesBySchedule(matches).filter(match => !isByeMatch(match) && isUpcomingMatch(match))
}

export function getFinishedMatches(matches = []) {
  return safeArr(matches)
    .filter(match => !isByeMatch(match) && isFinishedMatch(match))
    .sort((a, b) => {
      const timeDelta = getMatchTime(b) - getMatchTime(a)
      if (timeDelta !== 0) return timeDelta
      return String(b?.match_id || '').localeCompare(String(a?.match_id || ''))
    })
}

export function getFavoriteMatches(matches = [], favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites?.favoriteTeamIds).map(normalizeKey))
  if (!favoriteKeys.size) return []

  return sortMatchesBySchedule(matches).filter(match => {
    return isFavoriteMatch(match, favorites)
  })
}

export function isFavoriteMatch(match, favorites = {}) {
  const favoriteKeys = new Set(safeArr(favorites?.favoriteTeamIds).map(normalizeKey))
  if (!favoriteKeys.size) return false
  return matchTeamValues(match).some(value => favoriteKeys.has(value))
}

export const getFollowingMatches = getFavoriteMatches

export function getNextMatchForTeam(matches = [], teamId) {
  const target = new Set([normalizeKey(teamId)])
  if (!target.size) return null
  return sortMatchesBySchedule(matches).find(match => {
    if (isByeMatch(match)) return false
    if (!isUpcomingMatch(match) && !isLiveMatch(match)) return false
    return matchTeamValues(match).some(value => target.has(value))
  }) || null
}

export function getMatchesSummary(matches = []) {
  const rows = safeArr(matches)
  const currentRound = getCurrentRoundValue(rows)
  return {
    total: rows.length,
    upcoming: rows.filter(isUpcomingMatch).length,
    live: rows.filter(isLiveMatch).length,
    finished: rows.filter(isFinishedMatch).length,
    round: currentRound,
    roundMatches: currentRound ? getMatchesByRound(rows, currentRound).length : rows.length
  }
}

export function getMatchStatus(match) {
  if (isFinishedMatch(match)) return 'finished'
  if (isLiveMatch(match)) return 'live'
  return 'upcoming'
}

export function getMatchStatusText(match) {
  const raw = String(match?.status || '').toUpperCase()
  if (['TBC', 'TBD', 'PENDING_CONFIRMATION'].includes(raw) || (raw === 'PENDING' && !getMatchTime(match))) return '待确认'
  if (['POSTPONED', 'DELAYED'].includes(raw)) return '延期'
  if (['RESCHEDULED'].includes(raw)) return '已改期'
  if (['CANCELED', 'CANCELLED'].includes(raw)) return '取消'
  if (match?.is_forfeit) return '弃权'
  const status = getMatchStatus(match)
  if (status === 'finished') return '已完成'
  if (status === 'live') return '进行中'
  return '未开始'
}

export function getTeamLabel(team) {
  return team?.team_short_name || team?.short || team?.team_name || team?.name || 'TBD'
}

export function getTeamFullName(team) {
  return team?.team_name || team?.name || getTeamLabel(team)
}

function getTeamSeasonDirectory(team, seasonId) {
  const seasonText = normalizeText(seasonId).toUpperCase()
  const teamText = normalizeText(team?.team_id || team?.id).toUpperCase()

  if (seasonText.startsWith('FCR') || teamText.startsWith('FCR')) return 'FCR'
  if (seasonText.startsWith('FCA') || teamText.startsWith('FCA')) return 'FCA'
  return ''
}

function logoStemCandidates(value) {
  const stem = normalizeText(value)
  if (!stem || stem === 'TBD') return []

  return Array.from(new Set([
    stem,
    stem.replace(/-/g, '.'),
    stem.replace(/\./g, '-'),
    stem.replace(/\s+/g, ''),
    stem.toUpperCase(),
    stem.toLowerCase()
  ].filter(Boolean)))
}

export function getTeamLogoCandidates(team, seasonId) {
  const directory = getTeamSeasonDirectory(team, seasonId)
  if (!directory) return []

  const primaryCandidates = logoStemCandidates(getTeamLabel(team)).map(stem => {
    return `/logos/${directory}/${encodeURIComponent(stem)}.png`
  })

  return Array.from(new Set([
    ...primaryCandidates,
    `/logos/${directory}/OW.png`
  ]))
}

export function getMatchDisplayTeams(match) {
  return {
    teamA: {
      short: getTeamLabel(match?.team_a),
      full: getTeamFullName(match?.team_a)
    },
    teamB: {
      short: getTeamLabel(match?.team_b),
      full: getTeamFullName(match?.team_b)
    }
  }
}

export function getMatchScore(match) {
  const scoreA = match?.team_a?.score
  const scoreB = match?.team_b?.score
  const left = scoreA === '' || scoreA === null || scoreA === undefined ? '-' : scoreA
  const right = scoreB === '' || scoreB === null || scoreB === undefined ? '-' : scoreB
  return `${left} : ${right}`
}

export function getMatchTimeLabel(match) {
  if (match?.scheduled_date && match?.scheduled_time) return `${String(match.scheduled_date).slice(5)} ${match.scheduled_time}`
  const time = getMatchTime(match)
  if (!time) return '时间待定'
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

export function getRoundText(match) {
  const round = normalizeText(match?.round || match?.stage)
  const number = round.match(/\d+/)?.[0]
  if (String(match?.stage || '').toUpperCase() === 'SWISS' && number) return `瑞士轮第 ${number} 轮`
  if (/^ROUND\s*\d+/i.test(round) && number) return `瑞士轮第 ${number} 轮`
  return round || '赛事阶段待定'
}

export function getMapSummary(match, locale = 'zh-CN') {
  const maps = safeArr(match?.maps).filter(map => {
    const hasName = normalizeText(map?.map_name) && String(map?.map_type || '').toUpperCase() !== 'UNKNOWN'
    const hasScore = normalizeText(map?.score_a) || normalizeText(map?.score_b)
    return hasName || hasScore
  })

  if (!maps.length) return ''
  return maps.slice(0, 3).map(map => {
    const name = normalizeText(map?.map_name) || normalizeText(map?.map_type) || 'MAP'
    const scoreA = normalizeText(map?.score_a)
    const scoreB = normalizeText(map?.score_b)
    const displayName = formatOwMapName(name, locale)
    return scoreA || scoreB ? `${displayName} ${scoreA || 0}:${scoreB || 0}` : displayName
  }).join(' / ')
}

export function getFilterOptions(matches = []) {
  const rows = safeArr(matches)
  const unique = getter => ['ALL', ...Array.from(new Set(rows.map(getter).map(normalizeText).filter(Boolean)))]
  return {
    stages: unique(match => match?.stage),
    rounds: unique(match => match?.round),
    formats: unique(match => match?.format)
  }
}

export function getMatchesByStage(matches = [], stage = '') {
  const target = normalizeText(stage)
  if (!target || target === 'ALL') return sortMatchesBySchedule(matches)
  return sortMatchesBySchedule(matches).filter(match => normalizeText(match?.stage) === target)
}

export function getMatchesByDate(matches = []) {
  return getGroupedMatches(matches, 'date')
}

function getDateGroupKey(match) {
  const label = getMatchTimeLabel(match)
  if (label === '时间待定') return '时间待定'
  return label
}

function getRoundDateGroupKey(match) {
  return `${getRoundText(match)} · ${getDateGroupKey(match)}`
}

function getStageGroupKey(match) {
  const round = normalizeText(match?.round)
  const stage = normalizeText(match?.stage)
  if (round) return round
  return stage || '未分组'
}

function getGroupTitle(key, groupBy) {
  const text = normalizeText(key)
  const roundNumber = text.match(/^ROUND\s*(\d+)/i)?.[1]
  if ((groupBy === 'stage' || groupBy === 'stageRound') && roundNumber) return `SWISS ROUND ${roundNumber}`
  return text || '未分组'
}

export function getGroupedMatches(matches = [], groupBy = 'date') {
  const source = groupBy === 'stage' || groupBy === 'stageRound'
    ? safeArr(matches)
    : sortMatchesBySchedule(matches)
  const groups = new Map()

  source.forEach(match => {
    const key = groupBy === 'stage' || groupBy === 'stageRound'
      ? getStageGroupKey(match)
      : groupBy === 'roundDate'
        ? getRoundDateGroupKey(match)
        : getDateGroupKey(match)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(match)
  })

  return [...groups.entries()].map(([key, rows]) => {
    const upper = String(key || '').toUpperCase()
    const isArchiveFocus = upper.includes('GRAND') || upper.includes('FINAL') || upper.includes('PLAYOFF') || upper.includes('LB') || upper.includes('UB')
    const roundDateParts = groupBy === 'roundDate'
      ? String(key || '').split(' · ')
      : []
    const roundDateTitle = roundDateParts.length > 1 ? roundDateParts.at(-1) : ''
    return {
      key,
      title: roundDateTitle || getGroupTitle(key, groupBy),
      subtitle: `${rows.length} 场比赛`,
      matches: groupBy === 'stage' || groupBy === 'stageRound' ? getFinishedMatches(rows) : sortMatchesBySchedule(rows),
      defaultOpen: groupBy === 'stage' || groupBy === 'stageRound' ? isArchiveFocus : true
    }
  })
}

export function getRoundProgress(matches = []) {
  const rows = uniqueMatches(matches).filter(match => !isByeMatch(match))
  const finished = rows.filter(isFinishedMatch).length

  return {
    finished,
    total: rows.length,
    label: `${finished} / ${rows.length}`
  }
}

export function getRoundTimeSlots(matches = []) {
  const groups = new Map()

  sortMatchesBySchedule(uniqueMatches(matches).filter(match => !isByeMatch(match))).forEach(match => {
    const key = getDateGroupKey(match)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(match)
  })

  return [...groups.entries()].map(([key, rows]) => {
    const sortedRows = sortMatchesBySchedule(rows)
    return {
      key,
      title: key,
      startTime: getMatchTime(sortedRows[0]),
      matches: sortedRows,
      matchCount: sortedRows.length,
      upcomingCount: sortedRows.filter(isUpcomingMatch).length,
      liveCount: sortedRows.filter(isLiveMatch).length,
      finishedCount: sortedRows.filter(isFinishedMatch).length
    }
  })
}

export function getTimeSlotMatches(timeSlotsOrMatches = [], slotKey = '') {
  const source = safeArr(timeSlotsOrMatches)
  const slots = source[0]?.matches ? source : getRoundTimeSlots(source)
  const target = normalizeText(slotKey)
  const slot = slots.find(item => normalizeText(item.key) === target) || slots[0]
  return slot ? sortMatchesBySchedule(uniqueMatches(slot.matches)) : []
}

export function getDefaultTimeSlot(timeSlotsOrMatches = [], now = Date.now()) {
  const source = safeArr(timeSlotsOrMatches)
  const slots = source[0]?.matches ? source : getRoundTimeSlots(source)
  if (!slots.length) return null

  const liveSlot = slots.find(slot => slot.liveCount > 0)
  if (liveSlot) return liveSlot

  const unfinishedSlots = slots.filter(slot => slot.finishedCount < slot.matchCount)
  if (!unfinishedSlots.length) return slots[0]

  const futureUnfinishedSlot = unfinishedSlots.find(slot => !slot.startTime || slot.startTime >= now)
  return futureUnfinishedSlot || unfinishedSlots[0]
}

export function getPrioritizedTimeSlotMatches(matches = [], favorites = {}, limit = 4) {
  const sortedRows = sortMatchesBySchedule(uniqueMatches(matches))
  if (!limit || sortedRows.length <= limit) return sortedRows

  const selectedIds = new Set()
  const selectedRows = []
  const addMatch = match => {
    const id = matchIdentity(match)
    if (!id || selectedIds.has(id) || selectedRows.length >= limit) return
    selectedIds.add(id)
    selectedRows.push(match)
  }

  sortedRows.filter(match => isFavoriteMatch(match, favorites)).forEach(addMatch)
  sortedRows.forEach(addMatch)

  return sortedRows.filter(match => selectedIds.has(matchIdentity(match)))
}

export function getFeaturedRoundMatches(matches = [], favorites = {}, round = '', limit = 3) {
  const roundMatches = getMatchesByRound(matches, round || getCurrentRoundValue(matches))
    .filter(match => !isByeMatch(match))
  const activeRows = roundMatches.filter(match => isLiveMatch(match) || isUpcomingMatch(match))
  const sourceRows = activeRows.length ? activeRows : roundMatches
  const selected = []
  const selectedIds = new Set()

  const addMatch = match => {
    const id = matchIdentity(match)
    if (!id || selectedIds.has(id) || selected.length >= limit) return
    selectedIds.add(id)
    selected.push(match)
  }

  sourceRows.filter(match => isFavoriteMatch(match, favorites)).forEach(addMatch)
  getPrioritizedTimeSlotMatches(sourceRows, favorites, limit).forEach(addMatch)
  sourceRows.forEach(addMatch)

  return selected
}

export function getUpcomingRoundMatches(matches = [], round = '') {
  return getMatchesByRound(matches, round).filter(isUpcomingMatch)
}

export function getRecentFinishedMatches(matches = [], round = '', limit = 9) {
  const selected = []
  const selectedIds = new Set()
  const addMatch = match => {
    const id = matchIdentity(match)
    if (!id || selectedIds.has(id) || selected.length >= limit) return
    selectedIds.add(id)
    selected.push(match)
  }

  getFinishedMatches(getMatchesByRound(matches, round)).forEach(addMatch)
  getFinishedMatches(matches).forEach(addMatch)

  return selected
}

export function getPrimaryFollowingNextMatch(matches = [], favorites = {}) {
  return favorites?.primaryTeamId ? getNextMatchForTeam(matches, favorites.primaryTeamId) : null
}

export function getFollowingRoundMatchCount(matches = [], favorites = {}, round = '') {
  return getFavoriteMatches(getMatchesByRound(matches, round), favorites).length
}

export function getCurrentRoundSummary(matches = []) {
  const rows = getAllMatches({ matches }).filter(match => !isByeMatch(match))
  const currentRound = getCurrentRoundValue(rows)
  const roundMatches = getMatchesByRound(rows, currentRound)
  const timeSlots = getRoundTimeSlots(roundMatches)
  const upcomingRoundMatches = getUpcomingRoundMatches(rows, currentRound)
  const nextMatch = upcomingRoundMatches[0] || null
  const firstMatch = roundMatches.find(match => getMatchTime(match)) || roundMatches[0] || null
  const progress = getRoundProgress(roundMatches)

  return {
    round: currentRound,
    roundLabel: normalizeText(currentRound).toUpperCase() || 'ROUND',
    matches: roundMatches,
    totalMatches: roundMatches.length,
    timeSlots,
    timeSlotCount: timeSlots.length,
    firstMatch,
    firstMatchLabel: firstMatch ? getMatchTimeLabel(firstMatch) : '待定',
    nextMatch,
    nextMatchLabel: nextMatch ? getMatchTimeLabel(nextMatch) : '待定',
    progress
  }
}

function resolveFeaturedArgs(seasonOrLimit, limitArg) {
  if (typeof seasonOrLimit === 'number') {
    return { season: null, limit: seasonOrLimit }
  }

  return {
    season: seasonOrLimit && typeof seasonOrLimit === 'object' ? seasonOrLimit : null,
    limit: typeof limitArg === 'number' ? limitArg : 6
  }
}

function getManualFeaturedIds(season) {
  return safeArr(
    season?.featuredMatchIds ||
    season?.featured_matches ||
    season?.matches?.featured ||
    season?.meta?.featured_matches
  ).map(normalizeText).filter(Boolean)
}

function matchIdValues(match) {
  return [
    match?.match_id,
    match?.id,
    match?.match_display_name,
    match?.raw_match_id
  ].map(normalizeText).filter(Boolean)
}

function getChampionKeysFromFinal(finalMatch) {
  if (!finalMatch) return new Set()

  const winner = normalizeKey(finalMatch?.winner)
  const candidates = [
    ...teamIdentityValues(finalMatch?.team_a),
    ...teamIdentityValues(finalMatch?.team_b)
  ]

  if (!winner) return new Set()

  const finalTeams = [finalMatch?.team_a, finalMatch?.team_b]
  const winningTeam = finalTeams.find(team => teamIdentityValues(team).includes(winner)) ||
    finalTeams.find(team => normalizeKey(getTeamLabel(team)) === winner)

  return new Set(winningTeam ? teamIdentityValues(winningTeam) : candidates.filter(value => value === winner))
}

export function getFeaturedMatches(matches = [], seasonOrLimit = {}, limitArg) {
  const { season, limit } = resolveFeaturedArgs(seasonOrLimit, limitArg)
  const finished = getFinishedMatches(matches)
  const manualIds = getManualFeaturedIds(season)
  const manualMatches = manualIds
    .map(id => finished.find(match => matchIdValues(match).some(value => normalizeKey(value) === normalizeKey(id))))
    .filter(Boolean)
  const finals = finished.filter(match => /GRAND|FINAL/i.test(`${match?.round || ''} ${match?.match_display_name || ''}`))
  const playoffs = finished.filter(match => String(match?.stage || '').toUpperCase().includes('PLAYOFF'))
  const championKeys = getChampionKeysFromFinal(finals[0])
  const championMatches = championKeys.size
    ? finished.filter(match => matchTeamValues(match).some(value => championKeys.has(value)))
    : []
  const closeMatches = finished.filter(match => {
    const scoreA = toNumber(match?.team_a?.score, NaN)
    const scoreB = toNumber(match?.team_b?.score, NaN)
    return Number.isFinite(scoreA) && Number.isFinite(scoreB) && Math.abs(scoreA - scoreB) <= 1
  })
  const representativeMatches = finished.filter(match => {
    const scoreA = toNumber(match?.team_a?.score, NaN)
    const scoreB = toNumber(match?.team_b?.score, NaN)
    return Number.isFinite(scoreA) && Number.isFinite(scoreB) && Math.max(scoreA, scoreB) >= 4 && Math.abs(scoreA - scoreB) <= 2
  })
  const merged = [...manualMatches, ...finals, ...playoffs, ...championMatches, ...closeMatches, ...representativeMatches, ...finished]
  const seen = new Set()
  return merged.filter(match => {
    const id = match?.match_id || match?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, limit)
}

export function getKeyArchiveMatches(matches = [], seasonOrLimit = {}, limitArg) {
  return getFeaturedMatches(matches, seasonOrLimit, limitArg)
}

export function getMatchHubData(db, seasonId, favorites = {}) {
  const allMatches = getAllMatches(db)
  const matches = allMatches.filter(match => !isByeMatch(match))
  const summary = getMatchesSummary(matches)
  const currentRoundSummary = getCurrentRoundSummary(matches)
  const currentRoundMatches = currentRoundSummary.matches
  const activeRoundMatches = currentRoundMatches.filter(match => isLiveMatch(match) || isUpcomingMatch(match))
  const roundTimeSlots = getRoundTimeSlots(activeRoundMatches).map(slot => ({
    ...slot,
    defaultMatches: getPrioritizedTimeSlotMatches(slot.matches, favorites, 4)
  }))
  const defaultTimeSlot = getDefaultTimeSlot(roundTimeSlots)
  const followingMatches = getFollowingMatches(matches, favorites)
  const upcomingMatches = getUpcomingMatches(matches)
  const finishedMatches = getFinishedMatches(matches)
  const upcomingRoundMatches = getUpcomingRoundMatches(matches, summary.round)
  const recentFinishedMatches = getRecentFinishedMatches(matches, summary.round, 9)
  const primaryFollowingNextMatch = getPrimaryFollowingNextMatch(matches, favorites)
  const followingRoundMatchCount = getFollowingRoundMatchCount(matches, favorites, summary.round)
  const isArchive = isSeasonCompleteByPublishedMatches(
    db,
    seasonId,
    allMatches.filter(isFinishedMatch).length,
    allMatches.length
  )

  return {
    seasonId,
    isArchive,
    matches,
    summary,
    currentRound: summary.round,
    currentRoundSummary: {
      ...currentRoundSummary,
      timeSlots: roundTimeSlots,
      defaultTimeSlot
    },
    currentRoundMatches,
    activeRoundMatches,
    roundTimeSlots,
    defaultTimeSlot,
    roundProgress: currentRoundSummary.progress,
    followingMatches,
    primaryFollowingNextMatch,
    followingRoundMatchCount,
    upcomingMatches,
    upcomingRoundMatches,
    finishedMatches,
    recentFinishedMatches,
    featuredMatches: isArchive
      ? getFeaturedMatches(matches, db?.season || db?.meta, 8)
      : getFeaturedRoundMatches(matches, favorites, summary.round, 3),
    keyArchiveMatches: getKeyArchiveMatches(matches, db?.season || db?.meta, 8),
    stageGroups: getGroupedMatches(finishedMatches, 'stage'),
    dateGroups: getGroupedMatches(matches, 'date')
  }
}

export function filterMatches(matches = [], filters = {}) {
  const status = normalizeKey(filters.status)
  const stage = normalizeText(filters.stage)
  const round = normalizeText(filters.round)
  const format = normalizeText(filters.format)
  const team = normalizeKey(filters.team || filters.query)

  return safeArr(matches).filter(match => {
    if (isByeMatch(match)) return false
    if (stage && stage !== 'ALL' && normalizeText(match?.stage) !== stage) return false
    if (round && round !== 'ALL' && roundKey(match?.round || match?.stage) !== roundKey(round)) return false
    if (format && format !== 'ALL' && normalizeText(match?.format) !== format) return false
    if (status && status !== 'all') {
      const matchStatus = getMatchStatus(match)
      if (['finished', 'complete', 'completed'].includes(status) && matchStatus !== 'finished') return false
      if (['upcoming', 'pending'].includes(status) && matchStatus !== 'upcoming') return false
      if (['live', 'in_progress'].includes(status) && matchStatus !== 'live') return false
    }
    if (team) {
      const searchable = [
        match?.match_id,
        match?.match_display_name,
        match?.stage,
        match?.round,
        match?.format,
        ...matchTeamValues(match)
      ].map(normalizeKey)
      if (!searchable.some(value => value.includes(team))) return false
    }
    return true
  })
}

export function getTabMatches(matches = [], tab = 'all', favorites = {}, round = '') {
  if (tab === 'round') return getMatchesByRound(matches, round)
  if (tab === 'following') return getFavoriteMatches(matches, favorites)
  if (tab === 'upcoming') return getUpcomingMatches(matches)
  if (tab === 'finished') return getFinishedMatches(matches)
  return sortMatchesBySchedule(matches)
}
