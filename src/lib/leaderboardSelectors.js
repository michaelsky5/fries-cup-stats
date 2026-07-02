import { formatPlayerTime } from './format.js'
import {
  PUBLIC_METRICS,
  ROLE_COLORS,
  ROLE_ORDER,
  ROLE_SCORE_CONFIG,
  compareLeaderboardEntries,
  scoreLeaderboardEntries
} from './leaderboardScoring.js'
import {
  formatOwHeroName,
  formatOwHeroNames,
  getOwHero,
  getOwHeroAssetKey,
  getOwHeroCanonicalKey,
  getOwHeroCanonicalName,
  getOwNameSearchText
} from './heroes.js'

const DEFAULT_MIN_TIME_MINS = 30
const PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [20, 30, 50]
const ROLE_ALIAS = {
  TANK: 'TANK',
  DPS: 'DPS',
  DAMAGE: 'DPS',
  DMG: 'DPS',
  SUP: 'SUPPORT',
  SUPPORT: 'SUPPORT',
  HEALER: 'SUPPORT'
}

const entryCache = new WeakMap()

export const LEADERBOARD_PAGE_SIZE = PAGE_SIZE
export const LEADERBOARD_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS

export const METRIC_MODES = [
  { id: 'per10', label: '每 10 分钟', en: 'PER 10' },
  { id: 'total', label: '总计', en: 'TOTAL' },
  { id: 'perMap', label: '每张地图', en: 'PER MAP' }
]

export const LEADERBOARD_TABS = [
  { id: 'overall', label: '综合榜', en: 'OVERALL', role: 'ALL' },
  { id: 'tank', label: '坦克', en: 'TANK', role: 'TANK' },
  { id: 'dps', label: '输出', en: 'DPS', role: 'DPS' },
  { id: 'support', label: '辅助', en: 'SUPPORT', role: 'SUPPORT' }
]

export const LEADERBOARD_COLUMNS = [
  { id: 'score', label: '综合评分', en: 'SCORE', sortable: true, numeric: true },
  { id: 'team', label: '队伍', en: 'TEAM', sortable: true },
  { id: 'role', label: '职责', en: 'ROLE', sortable: true },
  { id: 'maps', label: '地图数', en: 'MAPS', sortable: true, numeric: true },
  { id: 'time', label: '出场时间', en: 'TIME', sortable: true, numeric: true },
  ...PUBLIC_METRICS.map(metric => ({
    id: metric.id,
    label: metric.label,
    en: metric.short,
    sortable: true,
    numeric: true,
    metricId: metric.id
  }))
]

export const ALWAYS_VISIBLE_COLUMNS = ['rank', 'player']
export const DEFAULT_VISIBLE_COLUMNS = LEADERBOARD_COLUMNS.map(column => column.id)

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeSearchText(value) {
  return normalizeText(value).toLowerCase()
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

function heroMatchesFilter(hero, filterHero) {
  const filterKey = getOwHeroCanonicalKey(filterHero)
  if (!filterKey) return false
  return getOwHeroCanonicalKey(hero) === filterKey
}

export function normalizeLeaderboardRole(role) {
  const key = String(role || '').trim().toUpperCase()
  return ROLE_ALIAS[key] || ''
}

export function getRoleLabel(role) {
  const normalized = normalizeLeaderboardRole(role)
  return ROLE_SCORE_CONFIG[normalized]?.label || normalized || '-'
}

export function getRoleEnLabel(role) {
  const normalized = normalizeLeaderboardRole(role)
  return ROLE_SCORE_CONFIG[normalized]?.en || normalized || '-'
}

export function getRoleColor(role) {
  return ROLE_COLORS[normalizeLeaderboardRole(role)] || '#2a2a2a'
}

export function getRankingMinTimeMins(season, db) {
  const candidates = [
    season?.rankingMinTimeMins,
    season?.rules?.rankingMinTimeMins,
    db?.meta?.rankingMinTimeMins,
    db?.meta?.ranking_min_time_mins,
    db?.meta?.rules?.rankingMinTimeMins,
    db?.meta?.rules?.ranking_min_time_mins,
    db?.season?.rankingMinTimeMins,
    db?.season?.rules?.rankingMinTimeMins
  ]

  const value = candidates.map(candidate => toFiniteNumber(candidate, NaN)).find(Number.isFinite)
  return value && value > 0 ? value : DEFAULT_MIN_TIME_MINS
}

export function getValidMetricMode(value) {
  return METRIC_MODES.some(mode => mode.id === value) ? value : 'per10'
}

export function getValidTab(value, roleValue = '') {
  const role = normalizeLeaderboardRole(roleValue)
  if (role === 'TANK') return 'tank'
  if (role === 'DPS') return 'dps'
  if (role === 'SUPPORT') return 'support'

  const tab = String(value || '').toLowerCase()
  return LEADERBOARD_TABS.some(item => item.id === tab) ? tab : 'overall'
}

export function getTabRole(tab) {
  return LEADERBOARD_TABS.find(item => item.id === tab)?.role || 'ALL'
}

function createTeamResolver(db) {
  const teams = new Map()
  safeArr(db?.teams).forEach(team => {
    const identities = [
      team.team_id,
      team.id,
      team.team_short_name,
      team.short,
      team.team_name,
      team.name
    ].map(normalizeSearchText).filter(Boolean)

    identities.forEach(identity => {
      if (!teams.has(identity)) teams.set(identity, team)
    })
  })

  return value => teams.get(normalizeSearchText(value)) || null
}

function createPlayerResolver(db) {
  const players = new Map()
  safeArr(db?.players).forEach(player => {
    const identities = [
      player.player_id,
      player.id,
      player.display_name,
      player.nickname,
      player.player_name,
      player.battle_tag,
      player.battleTag
    ].map(normalizeSearchText).filter(Boolean)

    identities.forEach(identity => {
      if (!players.has(identity)) players.set(identity, player)
    })
  })

  return value => players.get(normalizeSearchText(value)) || null
}

function getPlayerLogs(player) {
  return [
    ...safeArr(player?.match_logs),
    ...safeArr(player?.live_match_logs)
  ]
}

function getLogStat(log, names) {
  const totals = log?.totals || {}
  for (const name of names) {
    if (totals[name] !== undefined) return toFiniteNumber(totals[name])
    if (log?.[name] !== undefined) return toFiniteNumber(log[name])
  }
  return 0
}

function formatRoleTime(mins) {
  return formatPlayerTime({ raw_time_mins: mins })
}

function buildMetrics(source = {}, roleTimeMins = 0, mapsPlayed = 0) {
  const totals = {
    elim: toFiniteNumber(source.total_elim ?? source.elims ?? source.eliminations),
    ast: toFiniteNumber(source.total_ast ?? source.assists ?? source.asts),
    dth: toFiniteNumber(source.total_dth ?? source.deaths ?? source.dths),
    dmg: toFiniteNumber(source.total_dmg ?? source.damage),
    heal: toFiniteNumber(source.total_heal ?? source.healing),
    block: toFiniteNumber(source.total_block ?? source.blocked ?? source.mitigation)
  }

  const per10 = {}
  const perMap = {}
  const perMin = {}

  PUBLIC_METRICS.forEach(metric => {
    const total = totals[metric.id]
    const exportedAvg = source[metric.avgKey]
    per10[metric.id] = roleTimeMins > 0
      ? total / roleTimeMins * 10
      : toFiniteNumber(exportedAvg)
    perMap[metric.id] = mapsPlayed > 0 ? total / mapsPlayed : 0
    perMin[metric.id] = roleTimeMins > 0 ? total / roleTimeMins : 0
  })

  return { total: totals, per10, perMap, perMin }
}

function hasStatSignal(source = {}) {
  const time = toFiniteNumber(source.raw_time_mins ?? source.playtimeMinutes)
  const maps = toFiniteNumber(source.maps_played ?? source.mapsPlayed)
  if (time > 0 || maps > 0) return true

  return [
    source.total_elim,
    source.elims,
    source.eliminations,
    source.total_ast,
    source.assists,
    source.asts,
    source.total_dth,
    source.deaths,
    source.dths,
    source.total_dmg,
    source.damage,
    source.total_heal,
    source.healing,
    source.total_block,
    source.blocked,
    source.mitigation
  ].some(value => toFiniteNumber(value) > 0)
}

function createEntry(basePlayer, role, source, sourceType) {
  const normalizedRole = normalizeLeaderboardRole(role)
  if (!basePlayer?.player_id || !normalizedRole) return null

  const roleTimeMins = toFiniteNumber(source.raw_time_mins ?? source.playtimeMinutes)
  const mapsPlayed = Math.max(0, Math.round(toFiniteNumber(source.maps_played ?? source.mapsPlayed)))
  const metrics = buildMetrics(source, roleTimeMins, mapsPlayed)
  const topHeroes = uniqueCanonicalHeroes(source.top_3_heroes)
  const mostPlayedHero = getOwHeroCanonicalName(source.most_played_hero || topHeroes[0] || '')
  const teamShortName = basePlayer.team_short_name || basePlayer.team_short || basePlayer.team_id || ''
  const teamName = basePlayer.team_name || basePlayer.team || teamShortName
  const playerName = normalizeText(basePlayer.player_name || basePlayer.battle_tag || basePlayer.battleTag)
  const displayName = normalizeText(basePlayer.nickname || basePlayer.display_name || playerName || basePlayer.player_id)
  const battleTag = normalizeText(basePlayer.battle_tag || basePlayer.battleTag || basePlayer.battletag || playerName)

  return {
    entryKey: `${basePlayer.player_id}:${normalizedRole}`,
    player_id: basePlayer.player_id,
    player_name: playerName,
    battleTag,
    nickname: normalizeText(basePlayer.nickname),
    display_name: displayName,
    team_id: normalizeText(basePlayer.team_id),
    team_name: normalizeText(teamName),
    team_short_name: normalizeText(teamShortName),
    registeredRole: normalizeLeaderboardRole(basePlayer.role),
    allowed_flex: safeArr(basePlayer.allowed_flex).map(normalizeLeaderboardRole).filter(Boolean),
    status: basePlayer.status,
    role: normalizedRole,
    maps_played: mapsPlayed,
    roleMapsPlayed: mapsPlayed,
    raw_time_mins: roleTimeMins,
    roleTimeMins,
    total_time_played: source.total_time_played || formatRoleTime(roleTimeMins),
    most_played_hero: mostPlayedHero,
    top_3_heroes: topHeroes,
    metrics,
    total_elim: metrics.total.elim,
    total_ast: metrics.total.ast,
    total_dth: metrics.total.dth,
    total_dmg: metrics.total.dmg,
    total_heal: metrics.total.heal,
    total_block: metrics.total.block,
    avg_elim: metrics.per10.elim,
    avg_ast: metrics.per10.ast,
    avg_dth: metrics.per10.dth,
    avg_dmg: metrics.per10.dmg,
    avg_heal: metrics.per10.heal,
    avg_block: metrics.per10.block,
    sourceType,
    searchableText: [
      displayName,
      playerName,
      battleTag,
      basePlayer.player_id,
      teamShortName,
      teamName,
      normalizedRole,
      mostPlayedHero,
      formatOwHeroName(mostPlayedHero, 'zh-CN'),
      formatOwHeroName(mostPlayedHero, 'en-US'),
      getOwNameSearchText(mostPlayedHero, 'hero'),
      ...topHeroes,
      ...topHeroes.flatMap(hero => [
        formatOwHeroName(hero, 'zh-CN'),
        formatOwHeroName(hero, 'en-US'),
        getOwNameSearchText(hero, 'hero')
      ])
    ].map(normalizeSearchText).join(' ')
  }
}

function aggregateEntriesFromLogs(player) {
  const grouped = new Map()

  getPlayerLogs(player).forEach(log => {
    const role = normalizeLeaderboardRole(log.role)
    const playtime = toFiniteNumber(log.playtimeMinutes ?? log.raw_time_mins)
    if (!role || playtime <= 0) return

    if (!grouped.has(role)) {
      grouped.set(role, {
        role,
        raw_time_mins: 0,
        maps: new Set(),
        heroMinutes: new Map(),
        total_elim: 0,
        total_ast: 0,
        total_dth: 0,
        total_dmg: 0,
        total_heal: 0,
        total_block: 0
      })
    }

    const current = grouped.get(role)
    current.raw_time_mins += playtime
    current.total_elim += getLogStat(log, ['elims', 'eliminations', 'total_elim'])
    current.total_ast += getLogStat(log, ['assists', 'asts', 'total_ast'])
    current.total_dth += getLogStat(log, ['deaths', 'dths', 'total_dth'])
    current.total_dmg += getLogStat(log, ['damage', 'total_dmg'])
    current.total_heal += getLogStat(log, ['healing', 'heal', 'total_heal'])
    current.total_block += getLogStat(log, ['blocked', 'block', 'total_block'])

    const mapKey = [
      log.matchId || log.match_id || log.rawMatchId || '',
      log.mapOrder || log.map_order || '',
      log.mapName || log.map_name || ''
    ].join(':')
    if (mapKey.replace(/:/g, '')) current.maps.add(mapKey)

    const rawHero = normalizeText(log.hero || log.heroes_played)
    const heroKey = getOwHeroCanonicalKey(rawHero)
    if (heroKey && rawHero !== '-') {
      const hero = getOwHeroCanonicalName(rawHero)
      const currentHero = current.heroMinutes.get(heroKey) || { hero, minutes: 0 }
      currentHero.minutes += playtime
      current.heroMinutes.set(heroKey, currentHero)
    }
  })

  return Array.from(grouped.values()).map(source => {
    const heroes = Array.from(source.heroMinutes.values())
      .sort((a, b) => b.minutes - a.minutes || a.hero.localeCompare(b.hero))
      .map(item => item.hero)

    return {
      ...source,
      maps_played: source.maps.size,
      total_time_played: formatRoleTime(source.raw_time_mins),
      most_played_hero: heroes[0] || '',
      top_3_heroes: heroes.slice(0, 3)
    }
  })
}

function buildRawLeaderboardEntries(db) {
  const resolvePlayer = createPlayerResolver(db)
  const resolveTeam = createTeamResolver(db)
  const entries = []
  const seen = new Set()

  safeArr(db?.player_totals).forEach(total => {
    const directoryPlayer = resolvePlayer(total.player_id) || resolvePlayer(total.player_name)
    const team = resolveTeam(total.team_id) || resolveTeam(total.team_short_name)
    const basePlayer = {
      ...directoryPlayer,
      ...total,
      team_name: total.team_name || team?.team_name || directoryPlayer?.team_name,
      team_short_name: total.team_short_name || team?.team_short_name || directoryPlayer?.team_short_name
    }

    const roleBreakdown = total.role_breakdown && typeof total.role_breakdown === 'object'
      ? total.role_breakdown
      : {}

    const roleSources = Object.entries(roleBreakdown)
      .map(([role, source]) => [normalizeLeaderboardRole(role), source])
      .filter(([role, source]) => role && toFiniteNumber(source?.raw_time_mins) > 0)

    if (roleSources.length) {
      roleSources.forEach(([role, source]) => {
        const entry = createEntry(basePlayer, role, source, 'role_breakdown')
        if (entry && !seen.has(entry.entryKey)) {
          seen.add(entry.entryKey)
          entries.push(entry)
        }
      })
      return
    }

    const logSources = aggregateEntriesFromLogs(basePlayer)
    if (logSources.length) {
      logSources.forEach(source => {
        const entry = createEntry(basePlayer, source.role, source, 'player_logs')
        if (entry && !seen.has(entry.entryKey)) {
          seen.add(entry.entryKey)
          entries.push(entry)
        }
      })
      return
    }

    const fallbackRole = normalizeLeaderboardRole(total.role || directoryPlayer?.role)
    if (fallbackRole && hasStatSignal(total)) {
      const entry = createEntry(basePlayer, fallbackRole, total, 'player_totals_fallback')
      if (entry && !seen.has(entry.entryKey)) {
        seen.add(entry.entryKey)
        entries.push(entry)
      }
    }
  })

  safeArr(db?.players).forEach(player => {
    const playerId = player.player_id
    if (!playerId) return
    const hasEntry = entries.some(entry => entry.player_id === playerId)
    if (hasEntry) return

    const logSources = aggregateEntriesFromLogs(player)
    if (logSources.length) {
      logSources.forEach(source => {
        const entry = createEntry(player, source.role, source, 'player_logs')
        if (entry && !seen.has(entry.entryKey)) {
          seen.add(entry.entryKey)
          entries.push(entry)
        }
      })
      return
    }
  })

  return entries.sort((a, b) => {
    const roleDelta = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    if (roleDelta !== 0) return roleDelta
    return String(a.player_id).localeCompare(String(b.player_id))
  })
}

export function getLeaderboardEntries(db, season) {
  if (!db || typeof db !== 'object') return []
  const minTimeMins = getRankingMinTimeMins(season, db)
  const cached = entryCache.get(db)
  if (cached?.minTimeMins === minTimeMins) return cached.entries

  const rawEntries = buildRawLeaderboardEntries(db)
  const entries = scoreLeaderboardEntries(rawEntries, minTimeMins)
  entryCache.set(db, { minTimeMins, entries })
  return entries
}

export function getLeaderboardRows(db, season) {
  return getLeaderboardEntries(db, season).map(entry => ({
    ...entry,
    rank: entry.overallRank || entry.roleRank || null
  }))
}

export function getLeaderboardSummary(entries, minTimeMins, db) {
  const playerIds = new Set(entries.map(entry => entry.player_id).filter(Boolean))
  const directoryPlayerCount = safeArr(db?.players).length
  const qualified = entries.filter(entry => entry.eligible)
  const qualifiedPlayerIds = new Set(qualified.map(entry => entry.player_id).filter(Boolean))
  const roleCounts = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = qualified.filter(entry => entry.role === role).length
    return acc
  }, {})

  return {
    totalEntries: entries.length,
    qualifiedEntries: qualified.length,
    totalPlayers: Math.max(playerIds.size, directoryPlayerCount),
    qualifiedPlayers: qualifiedPlayerIds.size,
    minTimeMins,
    roleCounts
  }
}

export function getLeaderboardHighlights(entries) {
  const qualified = entries.filter(entry => entry.eligible)
  const overall = [...qualified].sort(compareLeaderboardEntries)
  const roleLeaders = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = overall.find(entry => entry.role === role) || null
    return acc
  }, {})

  return {
    dataMvp: overall[0] || null,
    roleLeaders
  }
}

export function getLeaderboardOptions(entries, db, locale = 'zh-CN') {
  const teams = safeArr(db?.teams)
    .map(team => ({
      value: normalizeText(team.team_id),
      label: normalizeText(team.team_short_name || team.team_name || team.team_id),
      fullLabel: normalizeText(team.team_name || team.team_short_name || team.team_id)
    }))
    .filter(team => team.value)
    .sort((a, b) => a.label.localeCompare(b.label))

  const heroes = uniqueCanonicalHeroes(entries.flatMap(entry => [
    entry.most_played_hero,
    ...safeArr(entry.top_3_heroes)
  ])).sort((a, b) => formatOwHeroName(a, locale).localeCompare(formatOwHeroName(b, locale), locale))

  return { teams, heroes }
}

export function filterLeaderboardEntries(entries, filters, isFavoritePlayer) {
  const {
    tab = 'overall',
    query = '',
    team = 'ALL',
    hero = 'ALL',
    following = false,
    showInsufficient = true,
    minTimeMins = 0
  } = filters
  const tabRole = getTabRole(tab)
  const q = normalizeSearchText(query)
  const minTime = Math.max(0, toFiniteNumber(minTimeMins))

  return entries.filter(entry => {
    if (tabRole !== 'ALL' && entry.role !== tabRole) return false
    if (team !== 'ALL' && entry.team_id !== team) return false
    if (hero !== 'ALL' && !safeArr(entry.top_3_heroes).concat(entry.most_played_hero).some(item => heroMatchesFilter(item, hero))) return false
    if (minTime > 0 && entry.roleTimeMins < minTime) return false
    if (!showInsufficient && !entry.eligible) return false
    if (following && !isFavoritePlayer?.(entry)) return false
    if (q && !entry.searchableText.includes(q)) return false
    return true
  })
}

export function getEntryMetricValue(entry, metricId, mode = 'per10') {
  const validMode = getValidMetricMode(mode)
  return toFiniteNumber(entry?.metrics?.[validMode]?.[metricId])
}

function getSortValue(entry, sortKey, mode) {
  if (sortKey === 'rank') return entry.eligible ? entry.overallRank || entry.roleRank || 999999 : 999999
  if (sortKey === 'score') return toFiniteNumber(entry.roleScore)
  if (sortKey === 'player') return entry.display_name
  if (sortKey === 'team') return entry.team_short_name || entry.team_name
  if (sortKey === 'role') return ROLE_ORDER.indexOf(entry.role)
  if (sortKey === 'maps') return toFiniteNumber(entry.roleMapsPlayed)
  if (sortKey === 'time') return toFiniteNumber(entry.roleTimeMins)
  if (PUBLIC_METRICS.some(metric => metric.id === sortKey)) return getEntryMetricValue(entry, sortKey, mode)
  return entry?.[sortKey]
}

export function sortLeaderboardEntries(entries, sortKey = 'score', direction = 'desc', mode = 'per10') {
  const dir = direction === 'asc' ? 1 : -1

  return [...entries].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1

    const va = getSortValue(a, sortKey, mode)
    const vb = getSortValue(b, sortKey, mode)
    const na = Number(va)
    const nb = Number(vb)
    const numeric = Number.isFinite(na) && Number.isFinite(nb)

    if (numeric && na !== nb) return (na - nb) * dir

    if (!numeric) {
      const textDelta = String(va || '').localeCompare(String(vb || ''))
      if (textDelta !== 0) return textDelta * dir
    }

    return compareLeaderboardEntries(a, b)
  })
}

export function paginateLeaderboardEntries(entries, page = 1, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    page: currentPage,
    pageSize,
    totalPages,
    totalRows: entries.length,
    rows: entries.slice(start, start + pageSize)
  }
}

export function getHeroSlug(heroName) {
  const text = normalizeText(heroName)
  if (!text || text === '-') return ''

  if (getOwHero(text)) return getOwHeroAssetKey(text)

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function getHeroDisplayName(heroName, locale = 'zh-CN') {
  return formatOwHeroName(heroName, locale)
}

export function getHeroDisplayList(heroNames, locale = 'zh-CN', limit = Infinity) {
  return formatOwHeroNames(heroNames, locale, limit)
}

export function getRoleHeroFolder(role) {
  const normalized = normalizeLeaderboardRole(role)
  if (normalized === 'TANK') return 'tank'
  if (normalized === 'SUPPORT') return 'support'
  return 'damage'
}

export function getHeroAvatarSrc(heroName, role) {
  const slug = getHeroSlug(heroName)
  if (!slug) return ''
  return `/heroes/${getRoleHeroFolder(role)}/${slug}.png`
}

export function getPlayerInitials(entry) {
  const source = normalizeText(entry?.display_name || entry?.nickname || entry?.player_name || entry?.player_id || '?')
  return source.slice(0, 2).toUpperCase()
}
