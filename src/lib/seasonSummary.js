import { getExplicitWeeklyCompletion } from './weeklySeasonLifecycle.js'

const safeArr = value => Array.isArray(value) ? value : []
const normalizeText = value => String(value || '').trim()
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const isComplete = match => ['COMPLETE', 'COMPLETED'].includes(String(match?.status || '').toUpperCase())
const isLive = match => ['IN_PROGRESS', 'LIVE'].includes(String(match?.status || '').toUpperCase())

export function getPublicationRules(season, db) {
  return {
    ...(season?.rules || {}),
    ...(db?.meta?.rules && typeof db.meta.rules === 'object' ? db.meta.rules : {}),
    ...(db?.season?.rules && typeof db.season.rules === 'object' ? db.season.rules : {})
  }
}

export function getGlobalSummary(db) {
  const matches = safeArr(db?.matches)
  const players = safeArr(db?.players)
  const teams = safeArr(db?.teams)
  const totalMaps = matches.reduce((sum, m) => sum + safeArr(m.maps).length, 0)
  const completed = matches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED').length
  const inProgress = matches.filter(m => m.status === 'IN_PROGRESS').length
  const pending = matches.filter(m => !['COMPLETE', 'COMPLETED', 'IN_PROGRESS'].includes(m.status)).length

  return {
    updatedAt: db?.updated_at || db?.updatedAt || db?.meta?.updated_at || db?.meta?.ranking_as_of || '',
    teamCount: teams.length,
    playerCount: players.length,
    matchCount: matches.length,
    mapCount: totalMaps,
    completed,
    inProgress,
    pending
  }
}

function getExpectedSwissMatchCount(db, season) {
  const rules = getPublicationRules(season, db)
  if (normalizeText(rules?.competitionFormat || db?.season?.competition_format).toUpperCase() === 'GROUP') {
    return toNumber(rules?.groupStage?.expectedMatches ?? rules?.advance?.groups?.matchCount, 0) +
      toNumber(rules?.advance?.playoffs?.matchCount, 0)
  }
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
  const weeklyFinished = getExplicitWeeklyCompletion(db, season)
  if (weeklyFinished !== null) return weeklyFinished
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

