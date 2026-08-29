import { safeArr } from './selectors.js'
import {
  getEntryMetricValue,
  getLeaderboardRows,
  getRankingMinTimeMins,
  getRoleEnLabel,
  getRoleLabel,
  normalizeLeaderboardRole
} from './leaderboardSelectors.js'
import { PUBLIC_METRICS, ROLE_ORDER } from './leaderboardScoring.js'
import { getOwHeroCanonicalKey, getOwHeroCanonicalName } from './heroes.js'

const ROLE_RADAR_DIMENSIONS = {
  TANK: [
    { id: 'elim', label: '消灭', type: 'metric', metricId: 'elim' },
    { id: 'ast', label: '助攻', type: 'metric', metricId: 'ast' },
    { id: 'survival', label: '生存', type: 'metric', metricId: 'dth' },
    { id: 'dmg', label: '伤害', type: 'metric', metricId: 'dmg' },
    { id: 'block', label: '阻挡', type: 'metric', metricId: 'block' },
    { id: 'heroPool', label: '英雄池', type: 'heroPool' }
  ],
  DPS: [
    { id: 'elim', label: '消灭', type: 'metric', metricId: 'elim' },
    { id: 'ast', label: '助攻', type: 'metric', metricId: 'ast' },
    { id: 'survival', label: '生存', type: 'metric', metricId: 'dth' },
    { id: 'dmg', label: '伤害', type: 'metric', metricId: 'dmg' },
    { id: 'stability', label: '出场稳定', type: 'stability' },
    { id: 'heroPool', label: '英雄池', type: 'heroPool' }
  ],
  SUPPORT: [
    { id: 'elim', label: '消灭', type: 'metric', metricId: 'elim' },
    { id: 'ast', label: '助攻', type: 'metric', metricId: 'ast' },
    { id: 'survival', label: '生存', type: 'metric', metricId: 'dth' },
    { id: 'dmg', label: '伤害', type: 'metric', metricId: 'dmg' },
    { id: 'heal', label: '治疗', type: 'metric', metricId: 'heal' },
    { id: 'heroPool', label: '英雄池', type: 'heroPool' }
  ]
}

export const PLAYER_CORE_METRICS = PUBLIC_METRICS
export const PLAYER_METRIC_MODES = [
  { id: 'per10', label: '每 10 分钟', en: 'PER 10' },
  { id: 'total', label: '总计', en: 'TOTAL' },
  { id: 'perMap', label: '每张地图', en: 'PER MAP' }
]

export const PLAYER_MAP_METRICS = [
  { id: 'elim', label: '消灭', dataKey: 'elim' },
  { id: 'ast', label: '助攻', dataKey: 'ast' },
  { id: 'dth', label: '阵亡', dataKey: 'dth' },
  { id: 'dmg', label: '伤害', dataKey: 'dmg' },
  { id: 'heal', label: '治疗', dataKey: 'heal' },
  { id: 'block', label: '阻挡', dataKey: 'block' }
]

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function uniqueCanonicalHeroes(values) {
  const seen = new Set()

  return safeArr(values).reduce((acc, value) => {
    const key = getOwHeroCanonicalKey(value)
    if (!key || seen.has(key)) return acc
    seen.add(key)
    acc.push(getOwHeroCanonicalName(value))
    return acc
  }, [])
}

function formatNumber(value, digits = 1) {
  const number = toNumber(value, NaN)
  if (!Number.isFinite(number)) return '—'
  if (Math.abs(number) >= 1000) return Math.round(number).toLocaleString('zh-CN')
  return Number.isInteger(number) ? String(number) : number.toFixed(digits)
}

export function formatPlayerRoleTime(rawTimeMins, fallbackText = '') {
  if (fallbackText && fallbackText !== '0m') return fallbackText
  const mins = Math.round(toNumber(rawTimeMins))
  if (mins <= 0) return '—'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function getPlayerDisplayName(player) {
  return normalize(player?.nickname || player?.display_name || player?.player_name || player?.battleTag || player?.player_id) || 'UNKNOWN'
}

export function getPlayerBattleTag(player) {
  const primary = getPlayerDisplayName(player)
  const secondary = normalize(player?.battleTag || player?.battle_tag || player?.battletag || player?.player_name)
  return secondary && secondary !== primary ? secondary : ''
}

export function getPlayerInitials(player) {
  const text = getPlayerDisplayName(player)
  const ascii = text.match(/[A-Za-z0-9]/g)
  if (ascii?.length) return ascii.slice(0, 2).join('').toUpperCase()
  return Array.from(text).slice(0, 2).join('') || 'FC'
}

function playerIdentityMatches(player, playerId) {
  const target = normalizeKey(playerId)
  return [
    player?.player_id,
    player?.id,
    player?.battleTag,
    player?.battle_tag,
    player?.player_name,
    player?.display_name,
    player?.nickname
  ].some(value => normalizeKey(value) === target)
}

function findBasePlayer(db, playerId, rows = []) {
  return safeArr(db?.players).find(player => playerIdentityMatches(player, playerId)) ||
    safeArr(db?.player_totals).find(player => playerIdentityMatches(player, playerId)) ||
    rows.find(row => playerIdentityMatches(row, playerId)) ||
    null
}

function findTeam(db, value) {
  const key = normalizeKey(value)
  if (!key) return null
  return safeArr(db?.teams).find(team => [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].some(identity => normalizeKey(identity) === key)) || null
}

function getTeamForPlayer(db, player) {
  return findTeam(db, player?.team_id) ||
    findTeam(db, player?.team_short_name) ||
    findTeam(db, player?.team_name) ||
    null
}

function teamRouteId(team, fallback = '') {
  return normalize(team?.team_id || team?.id || team?.team_short_name || team?.short || fallback)
}

function teamShort(team, fallback = '') {
  return normalize(team?.team_short_name || team?.short || team?.team_id || team?.id || fallback) || '—'
}

function teamFull(team, fallback = '') {
  return normalize(team?.team_name || team?.name || teamShort(team, fallback)) || '—'
}

function getStatFromLog(log, names) {
  const totals = log?.totals || {}
  for (const name of names) {
    if (totals[name] !== undefined) return toNumber(totals[name])
    if (log?.[name] !== undefined) return toNumber(log[name])
  }
  return 0
}

function getLogMetricTotals(log) {
  return {
    elim: getStatFromLog(log, ['elims', 'eliminations', 'total_elim']),
    ast: getStatFromLog(log, ['assists', 'asts', 'total_ast']),
    dth: getStatFromLog(log, ['deaths', 'dths', 'total_dth']),
    dmg: getStatFromLog(log, ['damage', 'total_dmg']),
    heal: getStatFromLog(log, ['healing', 'heal', 'total_heal']),
    block: getStatFromLog(log, ['blocked', 'block', 'mitigation', 'total_block'])
  }
}

function getPlayerLogs(basePlayer) {
  const logs = [
    ...safeArr(basePlayer?.match_logs),
    ...safeArr(basePlayer?.live_match_logs),
    ...safeArr(basePlayer?.historical_match_logs)
  ]

  const seen = new Set()
  return logs.filter(log => {
    const role = normalizeLeaderboardRole(log?.role)
    const key = [
      log?.matchId || log?.match_id || log?.rawMatchId || log?.raw_match_id || '',
      log?.mapOrder || log?.map_order || '',
      log?.mapName || log?.map_name || '',
      getOwHeroCanonicalKey(log?.hero || log?.heroes_played || '') || log?.hero || log?.heroes_played || '',
      role,
      log?.teamId || log?.team_id || ''
    ].map(normalizeKey).join('|')

    if (!key.replace(/\|/g, '')) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getRoleLogs(basePlayer, role) {
  const targetRole = normalizeLeaderboardRole(role)
  return getPlayerLogs(basePlayer)
    .filter(log => normalizeLeaderboardRole(log?.role) === targetRole && toNumber(log?.playtimeMinutes ?? log?.raw_time_mins) > 0)
}

function getMatchDate(match, log) {
  const raw = match?.scheduled_at || match?.scheduledAt || log?.scheduledAt || log?.date || ''
  const date = raw ? new Date(raw) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  }).format(date).replace(/\//g, '-')
}

function matchIdentity(match) {
  return [
    match?.match_id,
    match?.raw_match_id,
    match?.id
  ].map(normalizeKey).filter(Boolean)
}

function findMatch(db, logOrId) {
  const ids = Array.isArray(logOrId)
    ? logOrId.map(normalizeKey)
    : [
      logOrId?.matchId,
      logOrId?.match_id,
      logOrId?.rawMatchId,
      logOrId?.raw_match_id,
      logOrId
    ].map(normalizeKey).filter(Boolean)

  return safeArr(db?.matches).find(match => matchIdentity(match).some(id => ids.includes(id))) || null
}

function teamValues(team) {
  return [
    team?.id,
    team?.team_id,
    team?.short,
    team?.team_short_name,
    team?.name,
    team?.team_name
  ].map(normalizeKey).filter(Boolean)
}

function getOpponentForLog(db, match, log, basePlayer) {
  const playerTeamValues = [
    log?.teamId,
    log?.team_id,
    basePlayer?.team_id,
    basePlayer?.team_short_name,
    basePlayer?.team_name
  ].map(normalizeKey).filter(Boolean)

  const aValues = teamValues(match?.team_a)
  const bValues = teamValues(match?.team_b)
  const isA = playerTeamValues.some(value => aValues.includes(value))
  const isB = playerTeamValues.some(value => bValues.includes(value))

  if (isA) return { team: match?.team_b, side: 'A' }
  if (isB) return { team: match?.team_a, side: 'B' }
  return { team: null, side: '' }
}

function getMatchScoreLabel(match) {
  const status = normalize(match?.status).toUpperCase()
  const isDone = status === 'COMPLETE' || status === 'COMPLETED'
  const a = match?.team_a?.score
  const b = match?.team_b?.score
  if (!isDone || a === '' || b === '' || a === undefined || b === undefined) return '—'
  return `${a} : ${b}`
}

function createEmptyRoleEntry(basePlayer, role) {
  const normalizedRole = normalizeLeaderboardRole(role)
  const teamShortName = normalize(basePlayer?.team_short_name || basePlayer?.team_id)
  const displayName = getPlayerDisplayName(basePlayer)
  return {
    entryKey: `${basePlayer?.player_id || basePlayer?.id || displayName}:${normalizedRole}`,
    player_id: basePlayer?.player_id || basePlayer?.id || '',
    player_name: normalize(basePlayer?.player_name || basePlayer?.battle_tag || basePlayer?.battleTag),
    battleTag: normalize(basePlayer?.battleTag || basePlayer?.battle_tag || basePlayer?.battletag || basePlayer?.player_name),
    nickname: normalize(basePlayer?.nickname),
    display_name: displayName,
    team_id: normalize(basePlayer?.team_id),
    team_name: normalize(basePlayer?.team_name || basePlayer?.team),
    team_short_name: teamShortName,
    registeredRole: normalizeLeaderboardRole(basePlayer?.role),
    role: normalizedRole,
    maps_played: 0,
    roleMapsPlayed: 0,
    raw_time_mins: 0,
    roleTimeMins: 0,
    total_time_played: '0m',
    most_played_hero: '',
    top_3_heroes: [],
    metrics: {
      total: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 },
      per10: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 },
      perMap: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 }
    },
    eligible: false,
    eligibilityReason: 'insufficient_sample',
    roleScore: null,
    roleRank: null,
    overallRank: null,
    normalizedMetrics: {}
  }
}

function getRoleOptions(basePlayer, entries) {
  const playedRoles = entries
    .map(entry => normalizeLeaderboardRole(entry.role))
    .filter(Boolean)
  const registeredRole = normalizeLeaderboardRole(basePlayer?.role)
  const roles = unique([...playedRoles, registeredRole])
  return ROLE_ORDER.filter(role => roles.includes(role))
}

function getMetricPercentile(entry, roleRows, metricId) {
  if (!entry || toNumber(entry.roleTimeMins ?? entry.raw_time_mins) <= 0) return null
  const metric = PUBLIC_METRICS.find(item => item.id === metricId)
  const rows = roleRows
    .filter(row => toNumber(row.roleTimeMins ?? row.raw_time_mins) > 0)
    .map(row => ({
      row,
      value: getEntryMetricValue(row, metricId, 'per10')
    }))
    .filter(item => Number.isFinite(item.value))

  if (!rows.length) return null

  rows.sort((a, b) => {
    const delta = metric?.direction === 'negative'
      ? a.value - b.value
      : b.value - a.value
    if (delta !== 0) return delta
    return String(a.row.entryKey || a.row.player_id).localeCompare(String(b.row.entryKey || b.row.player_id))
  })

  const rank = rows.findIndex(item => item.row.entryKey === entry.entryKey) + 1
  if (rank <= 0) return null
  if (rows.length === 1) return 100
  return Math.round(((rows.length - rank) / (rows.length - 1)) * 100)
}

function getNumericPercentile(entry, roleRows, getter, higherIsBetter = true) {
  if (!entry || toNumber(entry.roleTimeMins ?? entry.raw_time_mins) <= 0) return null
  const rows = roleRows
    .filter(row => toNumber(row.roleTimeMins ?? row.raw_time_mins) > 0)
    .map(row => ({ row, value: toNumber(getter(row), NaN) }))
    .filter(item => Number.isFinite(item.value))
  if (!rows.length) return null

  rows.sort((a, b) => {
    const delta = higherIsBetter ? b.value - a.value : a.value - b.value
    if (delta !== 0) return delta
    return String(a.row.entryKey || a.row.player_id).localeCompare(String(b.row.entryKey || b.row.player_id))
  })
  const rank = rows.findIndex(item => item.row.entryKey === entry.entryKey) + 1
  if (rank <= 0) return null
  if (rows.length === 1) return 100
  return Math.round(((rows.length - rank) / (rows.length - 1)) * 100)
}

function getRoleAverage(roleRows, metricId, mode = 'per10') {
  const values = roleRows
    .filter(row => toNumber(row.roleTimeMins ?? row.raw_time_mins) > 0)
    .map(row => getEntryMetricValue(row, metricId, mode))
    .filter(value => Number.isFinite(value))
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function getPlayerHeroPool(basePlayer, entry) {
  const role = normalizeLeaderboardRole(entry?.role)
  const logs = getRoleLogs(basePlayer, role)
  const grouped = new Map()
  let totalMinutes = 0

  logs.forEach(log => {
    const rawHero = normalize(log?.hero || log?.heroes_played || '未记录')
    const heroKey = getOwHeroCanonicalKey(rawHero)
    const hero = getOwHeroCanonicalName(rawHero)
    const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
    if (!heroKey || rawHero === '-') return
    totalMinutes += minutes
    if (!grouped.has(heroKey)) {
      grouped.set(heroKey, {
        hero,
        minutes: 0,
        maps: new Set(),
        totals: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 }
      })
    }

    const item = grouped.get(heroKey)
    const totals = getLogMetricTotals(log)
    item.minutes += minutes
    Object.keys(item.totals).forEach(key => {
      item.totals[key] += totals[key]
    })
    item.maps.add(`${log?.matchId || log?.rawMatchId || ''}:${log?.mapOrder || log?.mapName || ''}`)
  })

  let heroes = Array.from(grouped.values()).map(item => {
    const coreMetric = getRolePrimaryMetric(role, item.totals)
    return {
      hero: item.hero,
      minutes: item.minutes,
      timeLabel: formatPlayerRoleTime(item.minutes),
      usagePct: totalMinutes > 0 ? item.minutes / totalMinutes : 0,
      usageLabel: totalMinutes > 0 ? `${Math.round((item.minutes / totalMinutes) * 100)}%` : '—',
      maps: item.maps.size,
      coreMetric
    }
  })

  if (!heroes.length) {
    heroes = uniqueCanonicalHeroes(entry?.top_3_heroes)
      .map((hero, index) => ({
        hero,
        minutes: index === 0 ? toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins) : 0,
        timeLabel: index === 0 ? formatPlayerRoleTime(entry?.roleTimeMins ?? entry?.raw_time_mins) : '—',
        usagePct: index === 0 && toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins) > 0 ? 1 : 0,
        usageLabel: index === 0 && toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins) > 0 ? '100%' : '—',
        maps: index === 0 ? toNumber(entry?.roleMapsPlayed ?? entry?.maps_played) : 0,
        coreMetric: getRolePrimaryMetric(role, entry?.metrics?.total)
      }))
  }

  return heroes.sort((a, b) => b.minutes - a.minutes || a.hero.localeCompare(b.hero, 'zh-Hans-CN'))
}

export function getRolePrimaryMetric(role, totals = {}) {
  const normalizedRole = normalizeLeaderboardRole(role)
  if (normalizedRole === 'TANK') {
    const block = toNumber(totals.block ?? totals.total_block)
    if (block > 0) return { label: '阻挡', value: formatNumber(block, 0), key: 'block' }
    return { label: '阵亡', value: formatNumber(totals.dth ?? totals.total_dth, 0), key: 'dth' }
  }
  if (normalizedRole === 'SUPPORT') {
    const heal = toNumber(totals.heal ?? totals.total_heal)
    if (heal > 0) return { label: '治疗', value: formatNumber(heal, 0), key: 'heal' }
    return { label: '助攻', value: formatNumber(totals.ast ?? totals.total_ast, 0), key: 'ast' }
  }
  const elim = toNumber(totals.elim ?? totals.total_elim)
  if (elim > 0) return { label: '消灭', value: formatNumber(elim, 0), key: 'elim' }
  return { label: '伤害', value: formatNumber(totals.dmg ?? totals.total_dmg, 0), key: 'dmg' }
}

function getRoleSample(rows, entry) {
  const role = normalizeLeaderboardRole(entry?.role)
  const roleRows = rows.filter(row => normalizeLeaderboardRole(row.role) === role)
  const qualifiedRows = roleRows.filter(row => row.eligible)
  const rank = entry?.eligible ? entry?.roleRank || null : null
  const scorePercentile = rank && qualifiedRows.length > 1
    ? Math.round(((qualifiedRows.length - rank) / (qualifiedRows.length - 1)) * 100)
    : rank ? 100 : null

  const metricPercentiles = PUBLIC_METRICS.reduce((acc, metric) => {
    acc[metric.id] = getMetricPercentile(entry, roleRows, metric.id)
    return acc
  }, {})

  const averages = PUBLIC_METRICS.reduce((acc, metric) => {
    acc[metric.id] = {
      per10: getRoleAverage(roleRows, metric.id, 'per10'),
      total: getRoleAverage(roleRows, metric.id, 'total'),
      perMap: getRoleAverage(roleRows, metric.id, 'perMap')
    }
    return acc
  }, {})

  return {
    role,
    roleLabel: getRoleLabel(role),
    roleEn: getRoleEnLabel(role),
    rows: roleRows,
    sampleSize: roleRows.length,
    qualifiedSize: qualifiedRows.length,
    rank,
    scorePercentile,
    metricPercentiles,
    averages
  }
}

function buildCoreStats(entry, sample, mode = 'per10') {
  const safeMode = PLAYER_METRIC_MODES.some(item => item.id === mode) ? mode : 'per10'
  return PUBLIC_METRICS.map(metric => ({
    id: metric.id,
    label: metric.label,
    short: metric.short,
    direction: metric.direction,
    value: getEntryMetricValue(entry, metric.id, safeMode),
    valueLabel: formatNumber(getEntryMetricValue(entry, metric.id, safeMode), metric.id === 'dmg' || metric.id === 'heal' || metric.id === 'block' ? 0 : 1),
    average: sample?.averages?.[metric.id]?.[safeMode] || 0,
    averageLabel: formatNumber(sample?.averages?.[metric.id]?.[safeMode], metric.id === 'dmg' || metric.id === 'heal' || metric.id === 'block' ? 0 : 1),
    percentile: sample?.metricPercentiles?.[metric.id] ?? null
  }))
}

function getRadarData(entry, sample, heroPool) {
  const role = normalizeLeaderboardRole(entry?.role)
  const dimensions = ROLE_RADAR_DIMENSIONS[role] || ROLE_RADAR_DIMENSIONS.DPS
  const heroPoolCount = heroPool.length || safeArr(entry?.top_3_heroes).length
  const heroPoolPct = getNumericPercentile(entry, sample.rows, row => safeArr(row.top_3_heroes).length || (row.most_played_hero ? 1 : 0))
  const stabilityPct = getNumericPercentile(entry, sample.rows, row => toNumber(row.roleMapsPlayed ?? row.maps_played))

  return dimensions.map(dimension => {
    let percentile = null
    let rawPlayer = ''
    let rawAvg = ''

    if (dimension.type === 'metric') {
      percentile = sample.metricPercentiles[dimension.metricId]
      rawPlayer = formatNumber(getEntryMetricValue(entry, dimension.metricId, 'per10'), 1)
      rawAvg = formatNumber(sample.averages[dimension.metricId]?.per10, 1)
    } else if (dimension.type === 'heroPool') {
      percentile = heroPoolPct
      rawPlayer = `${heroPoolCount} 名英雄`
      rawAvg = '同职责中位'
    } else if (dimension.type === 'stability') {
      percentile = stabilityPct
      rawPlayer = `${toNumber(entry?.roleMapsPlayed ?? entry?.maps_played)} 张地图`
      rawAvg = '同职责中位'
    }

    return {
      subject: dimension.label,
      Player: percentile ?? 0,
      Avg: percentile === null ? 0 : 50,
      percentile,
      rawPlayer,
      rawAvg,
      available: percentile !== null
    }
  })
}

function getRoleSummary(entry, sample, heroPool) {
  const primaryHero = heroPool[0]?.hero || entry?.most_played_hero || safeArr(entry?.top_3_heroes)[0] || ''
  const seasonOvr = Number.isFinite(Number(entry?.seasonOvr)) ? Math.round(Number(entry.seasonOvr)) : null
  const score = Number.isFinite(Number(entry?.roleScore)) ? Number(entry.roleScore) : null
  const rawScore = Number.isFinite(Number(entry?.rawRoleScore ?? entry?.rawScore))
    ? Number(entry.rawRoleScore ?? entry.rawScore)
    : score

  return {
    role: normalizeLeaderboardRole(entry?.role),
    roleLabel: getRoleLabel(entry?.role),
    roleEn: getRoleEnLabel(entry?.role),
    maps: toNumber(entry?.roleMapsPlayed ?? entry?.maps_played),
    timeMins: toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins),
    timeLabel: formatPlayerRoleTime(entry?.roleTimeMins ?? entry?.raw_time_mins, entry?.total_time_played),
    primaryHero,
    score,
    rawScore,
    seasonOvr,
    scoreLabel: seasonOvr !== null ? String(seasonOvr) : '—',
    scoreUnit: 'OVR',
    scoreMetaLabel: score !== null ? `Score ${score.toFixed(1)}` : '',
    rank: sample.rank,
    rankTotal: sample.qualifiedSize,
    rankLabel: sample.rank ? `第 ${sample.rank} / ${sample.qualifiedSize}` : '—',
    scorePercentile: sample.scorePercentile,
    scorePercentileLabel: sample.scorePercentile !== null ? `前 ${Math.max(1, 100 - sample.scorePercentile)}%` : '样本不足',
    eligible: Boolean(entry?.eligible),
    eligibilityReason: entry?.eligibilityReason || 'insufficient_sample',
    sampleSize: sample.sampleSize,
    qualifiedSize: sample.qualifiedSize
  }
}

function getLatestMatches(db, basePlayer, entry) {
  const role = normalizeLeaderboardRole(entry?.role)
  const logs = getRoleLogs(basePlayer, role)
  const grouped = new Map()

  logs.forEach((log, index) => {
    const match = findMatch(db, log)
    const key = normalize(log?.matchId || log?.match_id || match?.match_id || log?.rawMatchId || log?.raw_match_id || `log-${index}`)
    if (!grouped.has(key)) {
      const date = getMatchDate(match, log)
      const opponentInfo = getOpponentForLog(db, match, log, basePlayer)
      grouped.set(key, {
        match,
        matchId: match?.match_id || log?.matchId || log?.rawMatchId || key,
        rawMatchId: match?.raw_match_id || log?.rawMatchId || '',
        displayName: match?.match_display_name || log?.matchDisplayName || key,
        date,
        dateLabel: formatDate(date),
        opponent: opponentInfo.team ? {
          short: teamShort(opponentInfo.team),
          full: teamFull(opponentInfo.team),
          routeId: teamRouteId(opponentInfo.team)
        } : {
          short: '—',
          full: '—',
          routeId: ''
        },
        scoreLabel: getMatchScoreLabel(match),
        role,
        heroes: new Map(),
        maps: new Set(),
        minutes: 0,
        totals: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 },
        sortValue: date ? date.getTime() : index
      })
    }

    const current = grouped.get(key)
    const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
    const rawHero = normalize(log?.hero || log?.heroes_played || '')
    const heroKey = getOwHeroCanonicalKey(rawHero)
    const hero = getOwHeroCanonicalName(rawHero)
    const totals = getLogMetricTotals(log)
    current.minutes += minutes
    current.maps.add(`${log?.mapOrder || ''}:${log?.mapName || ''}`)
    Object.keys(current.totals).forEach(metricId => {
      current.totals[metricId] += totals[metricId]
    })
    if (heroKey && rawHero !== '-') {
      const currentHero = current.heroes.get(heroKey) || { hero, minutes: 0 }
      currentHero.minutes += minutes
      current.heroes.set(heroKey, currentHero)
    }
  })

  return Array.from(grouped.values())
    .map(item => {
      const heroes = Array.from(item.heroes.values()).sort((a, b) => b.minutes - a.minutes).map(hero => hero.hero)
      return {
        ...item,
        primaryHero: heroes[0] || '—',
        heroLabel: heroes.slice(0, 2).join(' / ') || '—',
        mapsPlayed: item.maps.size,
        coreMetric: getRolePrimaryMetric(role, item.totals)
      }
    })
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 5)
}

function getMapPerformance(db, basePlayer, entry, metricId = 'dmg') {
  const role = normalizeLeaderboardRole(entry?.role)
  const metric = PLAYER_MAP_METRICS.find(item => item.id === metricId) || PLAYER_MAP_METRICS[0]
  const logs = getRoleLogs(basePlayer, role)

  const rows = logs.map((log, index) => {
    const match = findMatch(db, log)
    const date = getMatchDate(match, log)
    const opponentInfo = getOpponentForLog(db, match, log, basePlayer)
    const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
    const totals = getLogMetricTotals(log)
    const total = totals[metric.dataKey]
    const per10 = minutes > 0 ? total / minutes * 10 : 0
    return {
      key: `${log?.matchId || log?.rawMatchId || 'match'}-${log?.mapOrder || index}-${metric.id}`,
      matchId: match?.match_id || log?.matchId || log?.rawMatchId || '',
      mapName: normalize(log?.mapName || log?.map_name || `Map ${log?.mapOrder || index + 1}`),
      opponent: opponentInfo.team ? teamShort(opponentInfo.team) : '—',
      dateLabel: formatDate(date),
      role,
      hero: getOwHeroCanonicalName(log?.hero || log?.heroes_played || '—'),
      minutes,
      value: per10,
      valueLabel: formatNumber(per10, metric.id === 'dmg' || metric.id === 'heal' || metric.id === 'block' ? 0 : 1),
      sortValue: date ? date.getTime() + toNumber(log?.mapOrder) : index
    }
  })

  return rows
    .sort((a, b) => a.sortValue - b.sortValue)
    .slice(-10)
    .map((row, index, list) => ({
      ...row,
      order: index + 1,
      maxValue: Math.max(...list.map(item => item.value), 1)
    }))
}

function getAchievements(entry, sample, heroPool) {
  if (!entry || toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins) <= 0) return []
  const achievements = []
  if (entry.eligible && sample.scorePercentile !== null && sample.scorePercentile >= 90) {
    achievements.push({
      label: '同职责 OVR 前 10%',
      value: entry.seasonOvr ? `OVR ${Math.round(Number(entry.seasonOvr))}` : ''
    })
  }

  PUBLIC_METRICS.forEach(metric => {
    const percentile = sample.metricPercentiles[metric.id]
    if (percentile !== null && percentile >= 85) {
      achievements.push({
        label: `${metric.label} 同职责前 ${Math.max(1, 100 - percentile)}%`,
        value: `P${percentile}`
      })
    }
  })

  if (heroPool[0]?.usagePct >= 0.55) {
    achievements.push({
      label: `${heroPool[0].hero} 使用占比 ${heroPool[0].usageLabel}`,
      value: '主力英雄'
    })
  }

  return achievements.slice(0, 5)
}

function getScoutingNotes(entry, sample, heroPool) {
  if (!entry || toNumber(entry?.roleTimeMins ?? entry?.raw_time_mins) <= 0 || !entry.eligible) return []

  const metricPool = PUBLIC_METRICS
    .map(metric => ({ metric, percentile: sample.metricPercentiles[metric.id] }))
    .filter(item => item.percentile !== null)
    .sort((a, b) => b.percentile - a.percentile)

  const strongest = metricPool[0]
  const weakest = [...metricPool].sort((a, b) => a.percentile - b.percentile)[0]
  const notes = []

  if (strongest && strongest.percentile >= 60) {
    notes.push({
      type: '优势',
      text: `${getRoleLabel(entry.role)} ${strongest.metric.label}处于同职责 P${strongest.percentile}。`
    })
  }

  if (weakest && weakest.percentile <= 40) {
    notes.push({
      type: '风险',
      text: `${weakest.metric.label}低于同职责中位水平，需要结合阵容和地图语境复盘。`
    })
  }

  const topHero = heroPool[0]
  if (topHero) {
    notes.push({
      type: '使用倾向',
      text: topHero.usagePct >= 0.55
        ? `英雄池集中在 ${topHero.hero}，使用占比 ${topHero.usageLabel}。`
        : `当前职责记录了 ${heroPool.length} 名英雄，英雄池分布较分散。`
    })
  }

  return notes.slice(0, 3)
}

export function getPlayerDossier(db, playerId, roleParam = '', season) {
  const rows = getLeaderboardRows(db, season)
  const playerRows = rows.filter(row => playerIdentityMatches(row, playerId))
  const basePlayer = findBasePlayer(db, playerId, playerRows)
  if (!basePlayer) return null

  const team = getTeamForPlayer(db, basePlayer)
  const roles = getRoleOptions(basePlayer, playerRows)
  const safeRoles = roles.length ? roles : [normalizeLeaderboardRole(basePlayer.role) || 'DPS']
  const normalizedRoleParam = normalizeLeaderboardRole(roleParam)
  const defaultView = safeRoles.length === 1 ? safeRoles[0] : 'overview'
  const selectedView = normalizedRoleParam && safeRoles.includes(normalizedRoleParam) ? normalizedRoleParam : defaultView
  const minTimeMins = getRankingMinTimeMins(season, db)

  const roleEntries = safeRoles.map(role => {
    const entry = playerRows.find(row => normalizeLeaderboardRole(row.role) === role) || createEmptyRoleEntry(basePlayer, role)
    const heroPool = getPlayerHeroPool(basePlayer, entry)
    const sample = getRoleSample(rows, entry)
    const summary = getRoleSummary(entry, sample, heroPool)
    return {
      role,
      entry,
      sample,
      heroPool,
      summary,
      radarData: getRadarData(entry, sample, heroPool),
      coreStats: buildCoreStats(entry, sample, 'per10'),
      achievements: getAchievements(entry, sample, heroPool),
      recentMatches: getLatestMatches(db, basePlayer, entry),
      mapPerformance: getMapPerformance(db, basePlayer, entry, 'dmg'),
      scoutingNotes: getScoutingNotes(entry, sample, heroPool)
    }
  })

  const selectedRoleData = roleEntries.find(item => item.role === selectedView) || roleEntries[0]
  const identitySource = selectedRoleData?.entry || basePlayer

  return {
    basePlayer,
    identity: {
      playerId: normalize(basePlayer.player_id || identitySource.player_id || playerId),
      displayName: getPlayerDisplayName(identitySource),
      battleTag: getPlayerBattleTag(identitySource),
      initials: getPlayerInitials(identitySource),
      teamShort: teamShort(team, identitySource.team_short_name || identitySource.team_id),
      teamFull: teamFull(team, identitySource.team_name),
      teamRouteId: teamRouteId(team, identitySource.team_id || identitySource.team_short_name),
      teamLogo: normalize(team?.team_logo || team?.teamLogo || team?.logo_url || team?.logoUrl || team?.logo),
      registeredRole: normalizeLeaderboardRole(basePlayer.role)
    },
    roles: safeRoles,
    roleEntries,
    selectedView,
    selectedRoleData,
    isOverview: selectedView === 'overview',
    minTimeMins,
    rows
  }
}

export function getPlayerRoleAnalysis(db, basePlayer, entry, season, metricMode = 'per10', mapMetric = 'dmg') {
  const rows = getLeaderboardRows(db, season)
  const heroPool = getPlayerHeroPool(basePlayer, entry)
  const sample = getRoleSample(rows, entry)
  return {
    entry,
    heroPool,
    sample,
    summary: getRoleSummary(entry, sample, heroPool),
    radarData: getRadarData(entry, sample, heroPool),
    coreStats: buildCoreStats(entry, sample, metricMode),
    achievements: getAchievements(entry, sample, heroPool),
    recentMatches: getLatestMatches(db, basePlayer, entry),
    mapPerformance: getMapPerformance(db, basePlayer, entry, mapMetric),
    scoutingNotes: getScoutingNotes(entry, sample, heroPool)
  }
}
