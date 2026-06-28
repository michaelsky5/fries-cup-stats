import { normalizeSeasonId } from '../features/favorites/normalizeSeasonId.js'
import { resolveHeroSubrole } from './heroSubroleSelectors.js'

const METRICS = [
  { id: 'elimsPer10', totalKey: 'elims', names: ['elims', 'eliminations', 'total_elim', 'elim'] },
  { id: 'assistsPer10', totalKey: 'assists', names: ['assists', 'asts', 'total_ast', 'ast'] },
  { id: 'deathsPer10', totalKey: 'deaths', names: ['deaths', 'dths', 'total_dth', 'dth'] },
  { id: 'damagePer10', totalKey: 'damage', names: ['damage', 'total_dmg', 'dmg'] },
  { id: 'healingPer10', totalKey: 'healing', names: ['healing', 'heal', 'total_heal'] },
  { id: 'blockedPer10', totalKey: 'blocked', names: ['blocked', 'block', 'mitigation', 'total_block'] }
]

const PERCENTILES = [
  ['p10', 0.10],
  ['p25', 0.25],
  ['p50', 0.50],
  ['p75', 0.75],
  ['p90', 0.90],
  ['p95', 0.95]
]

const EMPTY_STATS = {
  p10: null,
  p25: null,
  p50: null,
  p75: null,
  p90: null,
  p95: null,
  mean: null,
  max: null
}

const dbBaselineCache = new WeakMap()

function safeArr(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function round(value, digits = 3) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Number(number.toFixed(digits))
}

function getPlayerId(player, index) {
  return cleanText(player?.player_id || player?.id || player?.playerId || `player-${index + 1}`)
}

function getPlayerTeamId(player) {
  return cleanText(player?.team_id || player?.teamId || player?.team_short_name || player?.teamName)
}

function getLogField(log, names) {
  for (const name of names) {
    if (log?.[name] !== undefined) return log[name]
  }
  return undefined
}

function getLogTotal(log, metric) {
  const totals = log?.totals && typeof log.totals === 'object' ? log.totals : {}
  for (const name of metric.names) {
    if (totals[name] !== undefined) return toFiniteNumber(totals[name])
    if (log?.[name] !== undefined) return toFiniteNumber(log[name])
  }
  return 0
}

function getTotals(log) {
  return METRICS.reduce((acc, metric) => {
    acc[metric.totalKey] = getLogTotal(log, metric)
    return acc
  }, {})
}

function totalsAllZero(totals) {
  return METRICS.every(metric => toFiniteNumber(totals[metric.totalKey]) === 0)
}

function getPer10(totals, playtimeMinutes) {
  return METRICS.reduce((acc, metric) => {
    acc[metric.id] = playtimeMinutes > 0
      ? toFiniteNumber(totals[metric.totalKey]) / playtimeMinutes * 10
      : 0
    return acc
  }, {})
}

function dedupeKey(playerId, log, hero, role, playtimeMinutes, totals) {
  return [
    playerId,
    getLogField(log, ['matchId', 'match_id', 'matchID']) || '',
    getLogField(log, ['rawMatchId', 'raw_match_id', 'rawMatchID']) || '',
    getLogField(log, ['mapOrder', 'map_order', 'gameNumber']) || '',
    hero,
    role,
    playtimeMinutes,
    ...METRICS.map(metric => totals[metric.totalKey])
  ].map(value => cleanText(value).toLowerCase()).join('|')
}

function getSelectedLogs(player) {
  const matchLogs = safeArr(player?.match_logs)
  const liveMatchLogs = safeArr(player?.live_match_logs)
  if (matchLogs.length) return { source: 'match_logs', logs: matchLogs, skippedLiveLogs: liveMatchLogs.length }
  if (liveMatchLogs.length) return { source: 'live_match_logs', logs: liveMatchLogs, skippedLiveLogs: 0 }
  return { source: 'none', logs: [], skippedLiveLogs: 0 }
}

export function collectRatingLogRowsFromPlayers(players, options = {}) {
  const seasonId = normalizeSeasonId(options.seasonId || options.season?.id || options.season?.publicCode || '') || ''
  const cleaning = {
    playersTotal: safeArr(players).length,
    playersUsingMatchLogs: 0,
    playersUsingLiveMatchLogs: 0,
    playersWithoutLogs: 0,
    skippedLiveMatchLogsBecauseMatchLogsExist: 0,
    rawSelectedLogs: 0,
    filteredPlaytimeNonPositive: 0,
    filteredHeroEmpty: 0,
    filteredTotalsAllZero: 0,
    dedupeRemoved: 0,
    validLogs: 0
  }
  const seen = new Set()
  const rows = []

  safeArr(players).forEach((player, playerIndex) => {
    const playerId = getPlayerId(player, playerIndex)
    const playerTeamId = getPlayerTeamId(player)
    const selected = getSelectedLogs(player)

    if (selected.source === 'match_logs') cleaning.playersUsingMatchLogs += 1
    if (selected.source === 'live_match_logs') cleaning.playersUsingLiveMatchLogs += 1
    if (selected.source === 'none') cleaning.playersWithoutLogs += 1
    cleaning.skippedLiveMatchLogsBecauseMatchLogsExist += selected.skippedLiveLogs
    cleaning.rawSelectedLogs += selected.logs.length

    selected.logs.forEach((log, logIndex) => {
      const playtimeMinutes = toFiniteNumber(log?.playtimeMinutes ?? log?.raw_time_mins ?? log?.timeMins)
      const hero = cleanText(log?.hero || log?.heroes_played || log?.heroName)
      const role = cleanText(log?.role || log?.officialRole || player?.role)
      const totals = getTotals(log)

      if (playtimeMinutes <= 0) {
        cleaning.filteredPlaytimeNonPositive += 1
        return
      }
      if (!hero) {
        cleaning.filteredHeroEmpty += 1
        return
      }
      if (totalsAllZero(totals)) {
        cleaning.filteredTotalsAllZero += 1
        return
      }

      const key = dedupeKey(playerId, log, hero, role, playtimeMinutes, totals)
      if (seen.has(key)) {
        cleaning.dedupeRemoved += 1
        return
      }
      seen.add(key)

      const teamId = cleanText(log?.teamId || log?.team_id || playerTeamId)
      const resolution = resolveHeroSubrole(hero, {
        seasonId,
        teamId,
        playerId,
        heroName: hero,
        role
      })

      rows.push({
        rowId: `${playerId}:${selected.source}:${logIndex}`,
        source: selected.source,
        playerId,
        teamId,
        matchId: cleanText(log?.matchId || log?.match_id),
        rawMatchId: cleanText(log?.rawMatchId || log?.raw_match_id),
        mapOrder: cleanText(log?.mapOrder || log?.map_order),
        mapName: cleanText(log?.mapName || log?.map_name),
        hero,
        role,
        playtimeMinutes,
        totals,
        per10: getPer10(totals, playtimeMinutes),
        resolution,
        rawLog: log
      })
    })
  })

  cleaning.filteredLogs = cleaning.filteredPlaytimeNonPositive + cleaning.filteredHeroEmpty + cleaning.filteredTotalsAllZero
  cleaning.removedLogs = cleaning.filteredLogs + cleaning.dedupeRemoved
  cleaning.validLogs = rows.length

  return { rows, cleaning }
}

function percentile(sortedValues, pct) {
  if (!sortedValues.length) return null
  const index = (sortedValues.length - 1) * pct
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const ratio = index - lower
  return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio
}

function summarizeValues(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { ...EMPTY_STATS }
  const summary = {}
  PERCENTILES.forEach(([key, pct]) => {
    summary[key] = round(percentile(sorted, pct))
  })
  summary.mean = round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length)
  summary.max = round(sorted[sorted.length - 1])
  return summary
}

function winsorizeValues(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length < 5) return sorted
  const p95 = percentile(sorted, 0.95)
  if (!Number.isFinite(p95)) return sorted
  return sorted.map(value => Math.min(value, p95))
}

function getSampleStatus(sampleLogs, totalPlaytimeMinutes) {
  if (sampleLogs >= 20 && totalPlaytimeMinutes >= 120) return 'OK'
  if (sampleLogs >= 5) return 'LOW_SAMPLE'
  return 'VERY_LOW_SAMPLE'
}

function createAccumulator(key, label, type) {
  return {
    key,
    label,
    type,
    sampleLogs: 0,
    players: new Set(),
    teams: new Set(),
    heroes: new Set(),
    officialRoles: new Set(),
    subroles: new Set(),
    scoringProfiles: new Set(),
    secondarySubroles: new Set(),
    totalPlaytimeMinutes: 0,
    metricValues: METRICS.reduce((acc, metric) => {
      acc[metric.id] = []
      return acc
    }, {})
  }
}

function addRow(acc, row) {
  acc.sampleLogs += 1
  acc.totalPlaytimeMinutes += row.playtimeMinutes
  if (row.playerId) acc.players.add(row.playerId)
  if (row.teamId) acc.teams.add(row.teamId)
  if (row.resolution.canonicalHeroName) acc.heroes.add(row.resolution.canonicalHeroName)
  if (row.resolution.officialRole) acc.officialRoles.add(row.resolution.officialRole)
  if (row.resolution.resolvedSubrole) acc.subroles.add(row.resolution.resolvedSubrole)
  if (row.resolution.scoringProfile) acc.scoringProfiles.add(row.resolution.scoringProfile)
  row.resolution.secondarySubroles.forEach(subrole => acc.secondarySubroles.add(subrole))
  METRICS.forEach(metric => acc.metricValues[metric.id].push(row.per10[metric.id]))
}

function finalizeAccumulator(acc) {
  const metrics = {}
  METRICS.forEach(metric => {
    const rawValues = acc.metricValues[metric.id]
    const winsorizedValues = winsorizeValues(rawValues)
    metrics[metric.id] = {
      rawPercentiles: summarizeValues(rawValues),
      winsorizedPercentiles: summarizeValues(winsorizedValues)
    }
  })

  return {
    key: acc.key,
    label: acc.label,
    type: acc.type,
    sampleLogs: acc.sampleLogs,
    sampleStatus: getSampleStatus(acc.sampleLogs, acc.totalPlaytimeMinutes),
    uniquePlayers: acc.players.size,
    uniqueTeams: acc.teams.size,
    totalPlaytimeMinutes: round(acc.totalPlaytimeMinutes),
    heroes: [...acc.heroes].sort(),
    officialRoles: [...acc.officialRoles].sort(),
    subroles: [...acc.subroles].sort(),
    scoringProfiles: [...acc.scoringProfiles].sort(),
    secondarySubroles: [...acc.secondarySubroles].sort(),
    metrics
  }
}

function aggregate(rows, getGroup) {
  const groups = new Map()
  rows.forEach(row => {
    const group = getGroup(row)
    if (!group?.key) return
    if (!groups.has(group.key)) groups.set(group.key, createAccumulator(group.key, group.label || group.key, group.type))
    addRow(groups.get(group.key), row)
  })
  return [...groups.values()].map(finalizeAccumulator)
    .sort((a, b) => b.sampleLogs - a.sampleLogs || a.key.localeCompare(b.key))
}

function byKey(items) {
  return safeArr(items).reduce((acc, item) => {
    acc[item.key] = item
    return acc
  }, {})
}

function buildFromRows(rows, cleaning, options = {}) {
  const heroes = aggregate(rows, row => ({
    key: row.resolution.canonicalHeroName,
    label: row.resolution.canonicalHeroName,
    type: 'hero'
  }))
  const scoringProfiles = aggregate(rows, row => ({
    key: row.resolution.scoringProfile,
    label: row.resolution.scoringProfile,
    type: 'scoringProfile'
  }))
  const subroles = aggregate(rows, row => ({
    key: row.resolution.resolvedSubrole,
    label: row.resolution.resolvedSubrole,
    type: 'subrole'
  }))

  return {
    seasonId: normalizeSeasonId(options.seasonId || options.season?.id || options.season?.publicCode || ''),
    generatedFrom: 'runtime_db',
    cleaning,
    logs: rows,
    heroes,
    scoringProfiles,
    subroles,
    byHero: byKey(heroes),
    byScoringProfile: byKey(scoringProfiles),
    bySubrole: byKey(subroles)
  }
}

export function buildRatingBaselinesFromPlayerLogs(players, options = {}) {
  const { rows, cleaning } = collectRatingLogRowsFromPlayers(players, options)
  return buildFromRows(rows, cleaning, options)
}

export function buildRatingBaselinesFromDb(db, options = {}) {
  if (!db || typeof db !== 'object') {
    return buildRatingBaselinesFromPlayerLogs([], options)
  }

  const cacheKey = options.seasonId || options.season?.id || options.season?.publicCode || db?.season?.id || db?.meta?.season_id || 'default'
  const cached = dbBaselineCache.get(db)
  if (cached?.cacheKey === cacheKey) return cached.baselines

  const baselines = buildRatingBaselinesFromPlayerLogs(safeArr(db.players), {
    ...options,
    seasonId: options.seasonId || db?.season?.id || db?.meta?.season_id || ''
  })
  dbBaselineCache.set(db, { cacheKey, baselines })
  return baselines
}

export function getRuntimeHeroBaseline({ baselines, canonicalHeroName, heroName }) {
  const resolved = canonicalHeroName ? { canonicalHeroName } : resolveHeroSubrole(heroName || '')
  return baselines?.byHero?.[resolved.canonicalHeroName] || null
}

export function getRuntimeProfileBaseline({ baselines, scoringProfile }) {
  return baselines?.byScoringProfile?.[scoringProfile] || null
}

export function getRuntimeSubroleBaseline({ baselines, subrole }) {
  return baselines?.bySubrole?.[subrole] || null
}
