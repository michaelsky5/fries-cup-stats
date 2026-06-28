import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeSeasonId } from '../src/features/favorites/normalizeSeasonId.js'
import { resolveHeroSubrole } from '../src/lib/heroSubroleSelectors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(ROOT_DIR, 'reports')

const DEFAULT_INPUTS = [
  'data/fca-history.json',
  'data/FCA26.json',
  'src/data/fca-history.json',
  'src/data/FCA26.json',
  'public/data/fca-history.json',
  'public/data/FCA26.json'
]

const METRICS = [
  { id: 'elimsPer10', totalKey: 'elims', label: 'Elims', names: ['elims', 'eliminations', 'total_elim', 'elim'] },
  { id: 'assistsPer10', totalKey: 'assists', label: 'Assists', names: ['assists', 'asts', 'total_ast', 'ast'] },
  { id: 'deathsPer10', totalKey: 'deaths', label: 'Deaths', names: ['deaths', 'dths', 'total_dth', 'dth'] },
  { id: 'damagePer10', totalKey: 'damage', label: 'Damage', names: ['damage', 'total_dmg', 'dmg'] },
  { id: 'healingPer10', totalKey: 'healing', label: 'Healing', names: ['healing', 'heal', 'total_heal'] },
  { id: 'blockedPer10', totalKey: 'blocked', label: 'Blocked', names: ['blocked', 'block', 'mitigation', 'total_block'] }
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

function safeArr(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '')
    .toLowerCase()
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

function formatNumber(value, digits = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  if (Math.abs(number) >= 1000) return Math.round(number).toLocaleString('en-US')
  return Number.isInteger(number) ? String(number) : number.toFixed(digits)
}

function formatMinutes(value) {
  return formatNumber(value, 1)
}

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--input') {
      args.input = argv[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--input=')) {
      args.input = arg.slice('--input='.length)
    }
  }
  return args
}

function resolveInputPath(inputArg) {
  if (inputArg) {
    const explicitPath = path.resolve(ROOT_DIR, inputArg)
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`Input file not found: ${explicitPath}`)
    }
    return explicitPath
  }

  const found = DEFAULT_INPUTS
    .map(candidate => path.join(ROOT_DIR, candidate))
    .find(candidate => fs.existsSync(candidate))

  if (!found) {
    const searched = DEFAULT_INPUTS.map(candidate => `  - ${candidate}`).join('\n')
    throw new Error(`No FCA input file found. Pass --input path/to/fca-history.json or create one of:\n${searched}`)
  }

  return found
}

async function readJson(filePath) {
  const text = await fsp.readFile(filePath, 'utf8')
  return JSON.parse(text)
}

function getCollectionCount(db, key, metaKey) {
  const metaValue = toFiniteNumber(db?.meta?.[metaKey], NaN)
  if (Number.isFinite(metaValue)) return metaValue
  return safeArr(db?.[key]).length
}

function getMeta(db) {
  return {
    team_count: getCollectionCount(db, 'teams', 'team_count'),
    player_count: getCollectionCount(db, 'players', 'player_count'),
    match_count: getCollectionCount(db, 'matches', 'match_count'),
    map_count: getCollectionCount(db, 'maps', 'map_count')
  }
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
  const parts = [
    playerId,
    getLogField(log, ['matchId', 'match_id', 'matchID']) || '',
    getLogField(log, ['rawMatchId', 'raw_match_id', 'rawMatchID']) || '',
    getLogField(log, ['mapOrder', 'map_order', 'gameNumber']) || '',
    hero,
    role,
    playtimeMinutes,
    ...METRICS.map(metric => totals[metric.totalKey])
  ]

  return parts.map(value => cleanText(value).toLowerCase()).join('|')
}

function getSelectedLogs(player) {
  const matchLogs = safeArr(player?.match_logs)
  const liveMatchLogs = safeArr(player?.live_match_logs)

  if (matchLogs.length) {
    return {
      source: 'match_logs',
      logs: matchLogs,
      skippedLiveLogs: liveMatchLogs.length
    }
  }

  if (liveMatchLogs.length) {
    return {
      source: 'live_match_logs',
      logs: liveMatchLogs,
      skippedLiveLogs: 0
    }
  }

  return {
    source: 'none',
    logs: [],
    skippedLiveLogs: 0
  }
}

function createCoverageBucket() {
  return {
    sampleLogs: 0,
    players: new Set(),
    teams: new Set(),
    roles: new Set(),
    totalPlaytimeMinutes: 0
  }
}

function addCoverage(map, key, row) {
  const safeKey = cleanText(key) || 'UNKNOWN'
  if (!map.has(safeKey)) map.set(safeKey, createCoverageBucket())
  const bucket = map.get(safeKey)
  bucket.sampleLogs += 1
  bucket.totalPlaytimeMinutes += row.playtimeMinutes
  if (row.playerId) bucket.players.add(row.playerId)
  if (row.teamId) bucket.teams.add(row.teamId)
  if (row.role) bucket.roles.add(row.role)
}

function finalizeCoverageMap(map) {
  return Array.from(map.entries())
    .map(([name, bucket]) => ({
      name,
      sampleLogs: bucket.sampleLogs,
      uniquePlayers: bucket.players.size,
      uniqueTeams: bucket.teams.size,
      roles: [...bucket.roles].sort(),
      totalPlaytimeMinutes: round(bucket.totalPlaytimeMinutes)
    }))
    .sort((a, b) => b.sampleLogs - a.sampleLogs || a.name.localeCompare(b.name))
}

function collectValidLogs(db, seasonId) {
  const cleaning = {
    playersTotal: safeArr(db?.players).length,
    playersUsingMatchLogs: 0,
    playersUsingLiveMatchLogs: 0,
    playersWithoutLogs: 0,
    skippedLiveMatchLogsBecauseMatchLogsExist: 0,
    rawSelectedLogs: 0,
    filteredPlaytimeNonPositive: 0,
    filteredHeroEmpty: 0,
    filteredTotalsAllZero: 0,
    dedupeRemoved: 0
  }

  const validLogs = []
  const seen = new Set()
  const unknownHeroes = new Map()
  const fallbackHeroes = new Map()
  const aliasHits = new Map()

  safeArr(db?.players).forEach((player, playerIndex) => {
    const playerId = getPlayerId(player, playerIndex)
    const playerTeamId = getPlayerTeamId(player)
    const selected = getSelectedLogs(player)

    if (selected.source === 'match_logs') cleaning.playersUsingMatchLogs += 1
    if (selected.source === 'live_match_logs') cleaning.playersUsingLiveMatchLogs += 1
    if (selected.source === 'none') cleaning.playersWithoutLogs += 1
    cleaning.skippedLiveMatchLogsBecauseMatchLogsExist += selected.skippedLiveLogs
    cleaning.rawSelectedLogs += selected.logs.length

    selected.logs.forEach((log, logIndex) => {
      const playtimeMinutes = toFiniteNumber(log?.playtimeMinutes ?? log?.raw_time_mins ?? log?.timeMins, 0)
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

      const row = {
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
        resolution
      }

      if (!resolution.known) addCoverage(unknownHeroes, hero, row)
      if (resolution.usedFallback) addCoverage(fallbackHeroes, hero, row)
      if (resolution.aliasMatched) {
        const aliasKey = `${hero} -> ${resolution.canonicalHeroName}`
        addCoverage(aliasHits, aliasKey, row)
      }

      validLogs.push(row)
    })
  })

  cleaning.filteredLogs = cleaning.filteredPlaytimeNonPositive +
    cleaning.filteredHeroEmpty +
    cleaning.filteredTotalsAllZero
  cleaning.removedLogs = cleaning.filteredLogs + cleaning.dedupeRemoved
  cleaning.validLogs = validLogs.length

  return {
    validLogs,
    cleaning,
    coverageMaps: {
      unknownHeroes,
      fallbackHeroes,
      aliasHits
    }
  }
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
  METRICS.forEach(metric => {
    acc.metricValues[metric.id].push(row.per10[metric.id])
  })
}

function aggregate(validLogs, getGroup) {
  const groups = new Map()

  validLogs.forEach(row => {
    const group = getGroup(row)
    if (!group?.key) return
    if (!groups.has(group.key)) groups.set(group.key, createAccumulator(group.key, group.label || group.key, group.type))
    addRow(groups.get(group.key), row)
  })

  return Array.from(groups.values()).map(finalizeAccumulator)
    .sort((a, b) => b.sampleLogs - a.sampleLogs || a.key.localeCompare(b.key))
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

function baselineByKey(items) {
  return items.reduce((acc, item) => {
    acc[item.key] = item
    return acc
  }, {})
}

function getRawMetric(item, metricId, stat = 'p50') {
  return item?.metrics?.[metricId]?.rawPercentiles?.[stat] ?? null
}

function getWinMetric(item, metricId, stat = 'p50') {
  return item?.metrics?.[metricId]?.winsorizedPercentiles?.[stat] ?? null
}

function findByName(items, name) {
  const key = normalizeKey(name)
  return items.find(item => normalizeKey(item.key) === key || normalizeKey(item.label) === key)
}

function ratioText(value, baseline) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(baseline)) || Number(baseline) === 0) return 'n/a'
  return `${(Number(value) / Number(baseline)).toFixed(2)}x`
}

function metricTriple(item, metricId) {
  const raw = item?.metrics?.[metricId]?.rawPercentiles || EMPTY_STATS
  const win = item?.metrics?.[metricId]?.winsorizedPercentiles || EMPTY_STATS
  return {
    raw: [raw.p50, raw.p75, raw.p90],
    winsorized: [win.p50, win.p75, win.p90]
  }
}

function formatMetricTriple(item, metricId) {
  const triple = metricTriple(item, metricId)
  const raw = triple.raw.map(value => formatNumber(value, 1)).join(' / ')
  const win = triple.winsorized.map(value => formatNumber(value, 1)).join(' / ')
  return `raw ${raw}; win ${win}`
}

function selectedMetricRows(items, names, metrics) {
  return names.map(name => {
    const item = findByName(items, name)
    return {
      name,
      sampleLogs: item?.sampleLogs || 0,
      totalMinutes: item?.totalPlaytimeMinutes || 0,
      metrics: metrics.reduce((acc, metricId) => {
        acc[metricId] = {
          p50: getRawMetric(item, metricId, 'p50'),
          p75: getRawMetric(item, metricId, 'p75'),
          p90: getRawMetric(item, metricId, 'p90')
        }
        return acc
      }, {})
    }
  })
}

function buildCalibration(heroBaselines, profileBaselines, subroleBaselines) {
  const profileByKey = baselineByKey(profileBaselines)
  const subroleByKey = baselineByKey(subroleBaselines)
  const heroByKey = baselineByKey(heroBaselines)

  const tankProfiles = [
    'dive_tank',
    'disrupt_tank',
    'brawl_tank',
    'poke_tank',
    'anchor_tank',
    'tempo_tank',
    'pick_tank'
  ].map(profile => ({
    profile,
    sampleLogs: profileByKey[profile]?.sampleLogs || 0,
    totalPlaytimeMinutes: profileByKey[profile]?.totalPlaytimeMinutes || 0,
    blockedP50: getRawMetric(profileByKey[profile], 'blockedPer10', 'p50'),
    blockedP75: getRawMetric(profileByKey[profile], 'blockedPer10', 'p75'),
    blockedP90: getRawMetric(profileByKey[profile], 'blockedPer10', 'p90')
  }))

  const symmetra = heroByKey.Symmetra
  const barrierFlex = profileByKey.barrier_utility_flex
  const flexDps = subroleByKey.FLEX_DPS

  const mainSupportRows = selectedMetricRows(
    heroBaselines,
    ['Lúcio', 'Mercy', 'Brigitte', 'Lifeweaver', 'Juno', 'Mizuki'],
    ['healingPer10', 'assistsPer10', 'deathsPer10', 'blockedPer10']
  )

  const flexSupportRows = selectedMetricRows(
    heroBaselines,
    ['Kiriko', 'Ana', 'Baptiste', 'Illari', 'Moira', 'Zenyatta'],
    ['healingPer10', 'damagePer10', 'elimsPer10', 'assistsPer10']
  )

  const dpsRows = [
    { name: 'HITSCAN', item: subroleByKey.HITSCAN },
    { name: 'FLEX_DPS', item: subroleByKey.FLEX_DPS },
    { name: 'flanker_flex', item: profileByKey.flanker_flex },
    { name: 'projectile_flex', item: profileByKey.projectile_flex },
    { name: 'brawl_flex', item: profileByKey.brawl_flex },
    { name: 'utility_flex', item: profileByKey.utility_flex }
  ].map(({ name, item }) => ({
    name,
    sampleLogs: item?.sampleLogs || 0,
    totalPlaytimeMinutes: item?.totalPlaytimeMinutes || 0,
    damageP50: getRawMetric(item, 'damagePer10', 'p50'),
    elimsP50: getRawMetric(item, 'elimsPer10', 'p50'),
    deathsP50: getRawMetric(item, 'deathsPer10', 'p50')
  }))

  const notes = []
  if (symmetra && flexDps) {
    notes.push(`Symmetra blockedPer10 P50 is ${formatNumber(getRawMetric(symmetra, 'blockedPer10', 'p50'), 1)} vs FLEX_DPS ${formatNumber(getRawMetric(flexDps, 'blockedPer10', 'p50'), 1)} (${ratioText(getRawMetric(symmetra, 'blockedPer10', 'p50'), getRawMetric(flexDps, 'blockedPer10', 'p50'))}).`)
  }
  const lucio = findByName(heroBaselines, 'Lúcio')
  const flexSupport = subroleByKey.FLEX_SUPPORT
  if (lucio && flexSupport) {
    notes.push(`Lúcio healingPer10 P50 is ${formatNumber(getRawMetric(lucio, 'healingPer10', 'p50'), 1)} vs FLEX_SUPPORT ${formatNumber(getRawMetric(flexSupport, 'healingPer10', 'p50'), 1)}; assists/block should be checked before rewarding raw healing.`)
  }
  const diveTank = profileByKey.dive_tank
  const disruptTank = profileByKey.disrupt_tank
  const anchorTank = profileByKey.anchor_tank
  if (diveTank && anchorTank) {
    notes.push(`dive_tank blockedPer10 P50 is ${formatNumber(getRawMetric(diveTank, 'blockedPer10', 'p50'), 1)} vs anchor_tank ${formatNumber(getRawMetric(anchorTank, 'blockedPer10', 'p50'), 1)}, so tank blocked should stay profile-sensitive.`)
  }
  if (disruptTank && anchorTank) {
    notes.push(`disrupt_tank blockedPer10 P50 is ${formatNumber(getRawMetric(disruptTank, 'blockedPer10', 'p50'), 1)} vs anchor_tank ${formatNumber(getRawMetric(anchorTank, 'blockedPer10', 'p50'), 1)}, which is a warning against overusing blocked for disrupt tanks.`)
  }
  const damageFlexSupport = profileByKey.damage_flex_support
  if (damageFlexSupport && flexSupport) {
    notes.push(`damage_flex_support damagePer10 P50 is ${formatNumber(getRawMetric(damageFlexSupport, 'damagePer10', 'p50'), 1)} vs FLEX_SUPPORT ${formatNumber(getRawMetric(flexSupport, 'damagePer10', 'p50'), 1)}.`)
  }
  const volumeFlexSupport = profileByKey.volume_flex_support
  if (volumeFlexSupport && flexSupport) {
    notes.push(`volume_flex_support healingPer10 P50 is ${formatNumber(getRawMetric(volumeFlexSupport, 'healingPer10', 'p50'), 1)} vs FLEX_SUPPORT ${formatNumber(getRawMetric(flexSupport, 'healingPer10', 'p50'), 1)}.`)
  }

  return {
    tankBlockedByProfile: tankProfiles,
    symmetraBlockedCheck: {
      symmetra: {
        sampleLogs: symmetra?.sampleLogs || 0,
        blockedP50: getRawMetric(symmetra, 'blockedPer10', 'p50'),
        blockedP75: getRawMetric(symmetra, 'blockedPer10', 'p75'),
        blockedP90: getRawMetric(symmetra, 'blockedPer10', 'p90')
      },
      barrierUtilityFlex: {
        sampleLogs: barrierFlex?.sampleLogs || 0,
        blockedP50: getRawMetric(barrierFlex, 'blockedPer10', 'p50'),
        blockedP75: getRawMetric(barrierFlex, 'blockedPer10', 'p75'),
        blockedP90: getRawMetric(barrierFlex, 'blockedPer10', 'p90')
      },
      flexDps: {
        sampleLogs: flexDps?.sampleLogs || 0,
        blockedP50: getRawMetric(flexDps, 'blockedPer10', 'p50'),
        blockedP75: getRawMetric(flexDps, 'blockedPer10', 'p75'),
        blockedP90: getRawMetric(flexDps, 'blockedPer10', 'p90')
      }
    },
    mainSupportCheck: mainSupportRows,
    flexSupportCheck: flexSupportRows,
    dpsProfileCheck: dpsRows,
    candidateWeightNotes: notes
  }
}

function escapeCell(value) {
  return cleanText(value).replace(/\|/g, '\\|')
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_No data._\n'
  const headerRow = `| ${headers.map(escapeCell).join(' | ')} |`
  const divider = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map(row => `| ${row.map(value => escapeCell(value)).join(' | ')} |`)
  return [headerRow, divider, ...body].join('\n') + '\n'
}

function baselineTableRows(items, labelKey) {
  return items.map(item => [
    item[labelKey] || item.label || item.key,
    item.officialRoles.join(', ') || '-',
    item.subroles.join(', ') || '-',
    item.scoringProfiles.join(', ') || '-',
    item.sampleLogs,
    formatMinutes(item.totalPlaytimeMinutes),
    formatMetricTriple(item, 'elimsPer10'),
    formatMetricTriple(item, 'assistsPer10'),
    formatMetricTriple(item, 'deathsPer10'),
    formatMetricTriple(item, 'damagePer10'),
    formatMetricTriple(item, 'healingPer10'),
    formatMetricTriple(item, 'blockedPer10')
  ])
}

function getLowSampleHeroes(heroBaselines) {
  return heroBaselines
    .filter(item => item.sampleLogs < 5)
    .map(item => ({
      hero: item.key,
      sampleLogs: item.sampleLogs,
      totalPlaytimeMinutes: item.totalPlaytimeMinutes,
      sampleStatus: item.sampleStatus
    }))
    .sort((a, b) => a.sampleLogs - b.sampleLogs || a.hero.localeCompare(b.hero))
}

function buildMarkdown(report) {
  const lines = []
  const coverage = report.coverage
  const calibration = report.calibration
  const heroHeaders = [
    'Hero',
    'Official Role',
    'Subrole',
    'Scoring Profile',
    'Sample Logs',
    'Total Minutes',
    'Elims P50/P75/P90',
    'Assists P50/P75/P90',
    'Deaths P50/P75/P90',
    'Damage P50/P75/P90',
    'Healing P50/P75/P90',
    'Blocked P50/P75/P90'
  ]

  lines.push('# FCA Hero Profile Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Input: ${report.inputFile}`)
  lines.push(`Season: ${report.seasonId}`)
  lines.push('')
  lines.push('Metric cells show raw P50/P75/P90 and winsorized P50/P75/P90. Winsorized values clamp each group metric above p95 only when that group metric has at least 5 samples.')
  lines.push('')

  lines.push('## Overview')
  lines.push('')
  lines.push(`- team_count: ${report.overview.rawMeta.team_count}`)
  lines.push(`- player_count: ${report.overview.rawMeta.player_count}`)
  lines.push(`- match_count: ${report.overview.rawMeta.match_count}`)
  lines.push(`- map_count: ${report.overview.rawMeta.map_count}`)
  lines.push(`- valid logs: ${report.overview.validLogs}`)
  lines.push(`- filtered logs: ${report.overview.filteredLogs}`)
  lines.push(`- dedupe removed: ${report.overview.dedupeRemoved}`)
  lines.push(`- total valid playtime minutes: ${formatMinutes(report.overview.totalValidPlaytimeMinutes)}`)
  lines.push(`- recognized heroes: ${report.overview.recognizedHeroCount}`)
  lines.push(`- UNKNOWN heroes: ${report.overview.unknownHeroCount}`)
  lines.push('')

  lines.push('## Data Cleaning Summary')
  lines.push('')
  lines.push(markdownTable(
    ['Rule', 'Count'],
    [
      ['Selected source logs', report.cleaning.rawSelectedLogs],
      ['Players using match_logs', report.cleaning.playersUsingMatchLogs],
      ['Players using live_match_logs fallback', report.cleaning.playersUsingLiveMatchLogs],
      ['Skipped live_match_logs because match_logs existed', report.cleaning.skippedLiveMatchLogsBecauseMatchLogsExist],
      ['Filtered playtimeMinutes <= 0', report.cleaning.filteredPlaytimeNonPositive],
      ['Filtered hero empty', report.cleaning.filteredHeroEmpty],
      ['Filtered totals all 0', report.cleaning.filteredTotalsAllZero],
      ['Dedupe removed', report.cleaning.dedupeRemoved],
      ['Valid logs', report.cleaning.validLogs]
    ]
  ))

  lines.push('## Hero Baselines')
  lines.push('')
  lines.push(markdownTable(heroHeaders, baselineTableRows(report.baselines.heroes, 'key')))

  lines.push('## Scoring Profile Baselines')
  lines.push('')
  lines.push(markdownTable(
    ['Scoring Profile', ...heroHeaders.slice(1)],
    baselineTableRows(report.baselines.scoringProfiles, 'key')
  ))

  lines.push('## Subrole Baselines')
  lines.push('')
  lines.push(markdownTable(
    ['Subrole', ...heroHeaders.slice(1)],
    baselineTableRows(report.baselines.subroles, 'key')
  ))

  lines.push('## Coverage / Unknowns')
  lines.push('')
  lines.push('### Unrecognized Hero Names')
  lines.push('')
  lines.push(markdownTable(
    ['Hero', 'Sample Logs', 'Unique Players', 'Unique Teams', 'Roles', 'Total Minutes'],
    coverage.unknownHeroes.map(item => [
      item.name,
      item.sampleLogs,
      item.uniquePlayers,
      item.uniqueTeams,
      item.roles.join(', ') || '-',
      formatMinutes(item.totalPlaytimeMinutes)
    ])
  ))
  lines.push('### Fallback Hero Names')
  lines.push('')
  lines.push(markdownTable(
    ['Hero', 'Sample Logs', 'Unique Players', 'Unique Teams', 'Roles', 'Total Minutes'],
    coverage.fallbackHeroes.map(item => [
      item.name,
      item.sampleLogs,
      item.uniquePlayers,
      item.uniqueTeams,
      item.roles.join(', ') || '-',
      formatMinutes(item.totalPlaytimeMinutes)
    ])
  ))
  lines.push('### Alias Hits')
  lines.push('')
  lines.push(markdownTable(
    ['Alias -> Canonical', 'Sample Logs', 'Unique Players', 'Unique Teams', 'Roles', 'Total Minutes'],
    coverage.aliasHits.map(item => [
      item.name,
      item.sampleLogs,
      item.uniquePlayers,
      item.uniqueTeams,
      item.roles.join(', ') || '-',
      formatMinutes(item.totalPlaytimeMinutes)
    ])
  ))
  lines.push('### Low Sample Heroes')
  lines.push('')
  lines.push(markdownTable(
    ['Hero', 'Sample Logs', 'Total Minutes', 'Sample Status'],
    coverage.lowSampleHeroes.map(item => [
      item.hero,
      item.sampleLogs,
      formatMinutes(item.totalPlaytimeMinutes),
      item.sampleStatus
    ])
  ))

  lines.push('## Calibration Checks')
  lines.push('')
  lines.push('### A. Tank Blocked By Profile')
  lines.push('')
  lines.push(markdownTable(
    ['Profile', 'Sample Logs', 'Total Minutes', 'Blocked P50', 'Blocked P75', 'Blocked P90'],
    calibration.tankBlockedByProfile.map(item => [
      item.profile,
      item.sampleLogs,
      formatMinutes(item.totalPlaytimeMinutes),
      formatNumber(item.blockedP50, 1),
      formatNumber(item.blockedP75, 1),
      formatNumber(item.blockedP90, 1)
    ])
  ))

  lines.push('### B. Symmetra Blocked Check')
  lines.push('')
  lines.push(markdownTable(
    ['Scope', 'Sample Logs', 'Blocked P50', 'Blocked P75', 'Blocked P90'],
    [
      ['Symmetra', calibration.symmetraBlockedCheck.symmetra.sampleLogs, formatNumber(calibration.symmetraBlockedCheck.symmetra.blockedP50, 1), formatNumber(calibration.symmetraBlockedCheck.symmetra.blockedP75, 1), formatNumber(calibration.symmetraBlockedCheck.symmetra.blockedP90, 1)],
      ['barrier_utility_flex', calibration.symmetraBlockedCheck.barrierUtilityFlex.sampleLogs, formatNumber(calibration.symmetraBlockedCheck.barrierUtilityFlex.blockedP50, 1), formatNumber(calibration.symmetraBlockedCheck.barrierUtilityFlex.blockedP75, 1), formatNumber(calibration.symmetraBlockedCheck.barrierUtilityFlex.blockedP90, 1)],
      ['FLEX_DPS', calibration.symmetraBlockedCheck.flexDps.sampleLogs, formatNumber(calibration.symmetraBlockedCheck.flexDps.blockedP50, 1), formatNumber(calibration.symmetraBlockedCheck.flexDps.blockedP75, 1), formatNumber(calibration.symmetraBlockedCheck.flexDps.blockedP90, 1)]
    ]
  ))

  lines.push('### C. Main Support Check')
  lines.push('')
  lines.push(markdownTable(
    ['Hero', 'Sample Logs', 'Healing P50', 'Assists P50', 'Deaths P50', 'Blocked P50'],
    calibration.mainSupportCheck.map(item => [
      item.name,
      item.sampleLogs,
      formatNumber(item.metrics.healingPer10.p50, 1),
      formatNumber(item.metrics.assistsPer10.p50, 1),
      formatNumber(item.metrics.deathsPer10.p50, 1),
      formatNumber(item.metrics.blockedPer10.p50, 1)
    ])
  ))

  lines.push('### D. Flex Support Check')
  lines.push('')
  lines.push(markdownTable(
    ['Hero', 'Sample Logs', 'Healing P50', 'Damage P50', 'Elims P50', 'Assists P50'],
    calibration.flexSupportCheck.map(item => [
      item.name,
      item.sampleLogs,
      formatNumber(item.metrics.healingPer10.p50, 1),
      formatNumber(item.metrics.damagePer10.p50, 1),
      formatNumber(item.metrics.elimsPer10.p50, 1),
      formatNumber(item.metrics.assistsPer10.p50, 1)
    ])
  ))

  lines.push('### E. DPS Profile Check')
  lines.push('')
  lines.push(markdownTable(
    ['Scope', 'Sample Logs', 'Total Minutes', 'Damage P50', 'Elims P50', 'Deaths P50'],
    calibration.dpsProfileCheck.map(item => [
      item.name,
      item.sampleLogs,
      formatMinutes(item.totalPlaytimeMinutes),
      formatNumber(item.damageP50, 1),
      formatNumber(item.elimsP50, 1),
      formatNumber(item.deathsP50, 1)
    ])
  ))

  lines.push('## Candidate Weight Notes')
  lines.push('')
  if (calibration.candidateWeightNotes.length) {
    calibration.candidateWeightNotes.forEach(note => lines.push(`- ${note}`))
  } else {
    lines.push('- No candidate notes were generated because the relevant samples were missing.')
  }
  lines.push('- These are data observations only. They are not final scoring weights, OVR, map ratings, or player rankings.')
  lines.push('')

  return lines.join('\n')
}

async function writeJson(filePath, value) {
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function buildOutputs(inputFile, db, validLogs, cleaning, coverageMaps) {
  const rawMeta = getMeta(db)
  const totalValidPlaytimeMinutes = validLogs.reduce((sum, row) => sum + row.playtimeMinutes, 0)
  const recognizedHeroes = new Set(validLogs.filter(row => row.resolution.known).map(row => row.resolution.canonicalHeroName))
  const unknownHeroes = finalizeCoverageMap(coverageMaps.unknownHeroes)
  const fallbackHeroes = finalizeCoverageMap(coverageMaps.fallbackHeroes)
  const aliasHits = finalizeCoverageMap(coverageMaps.aliasHits)

  const heroBaselines = aggregate(validLogs, row => ({
    key: row.resolution.canonicalHeroName,
    label: row.resolution.canonicalHeroName,
    type: 'hero'
  }))
  const profileBaselines = aggregate(validLogs, row => ({
    key: row.resolution.scoringProfile,
    label: row.resolution.scoringProfile,
    type: 'scoringProfile'
  }))
  const subroleBaselines = aggregate(validLogs, row => ({
    key: row.resolution.resolvedSubrole,
    label: row.resolution.resolvedSubrole,
    type: 'subrole'
  }))
  const lowSampleHeroes = getLowSampleHeroes(heroBaselines)
  const calibration = buildCalibration(heroBaselines, profileBaselines, subroleBaselines)
  const generatedAt = new Date().toISOString()
  const seasonId = normalizeSeasonId('FCA26') || 'FCA2026'

  const overview = {
    rawMeta,
    validLogs: validLogs.length,
    filteredLogs: cleaning.filteredLogs,
    removedLogs: cleaning.removedLogs,
    dedupeRemoved: cleaning.dedupeRemoved,
    totalValidPlaytimeMinutes: round(totalValidPlaytimeMinutes),
    recognizedHeroCount: recognizedHeroes.size,
    unknownHeroCount: unknownHeroes.length
  }

  const coverage = {
    unknownHeroes,
    fallbackHeroes,
    aliasHits,
    lowSampleHeroes
  }

  return {
    generatedAt,
    inputFile,
    seasonId,
    metrics: METRICS.map(metric => metric.id),
    overview,
    cleaning,
    coverage,
    baselines: {
      heroes: heroBaselines,
      scoringProfiles: profileBaselines,
      subroles: subroleBaselines
    },
    calibration
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = resolveInputPath(args.input)
  const db = await readJson(inputPath)
  const seasonId = normalizeSeasonId('FCA26') || 'FCA2026'
  const { validLogs, cleaning, coverageMaps } = collectValidLogs(db, seasonId)
  const report = buildOutputs(inputPath, db, validLogs, cleaning, coverageMaps)

  await fsp.mkdir(REPORT_DIR, { recursive: true })

  const files = {
    markdown: path.join(REPORT_DIR, 'fca-hero-profile-report.md'),
    reportJson: path.join(REPORT_DIR, 'fca-hero-profile-report.json'),
    heroBaselines: path.join(REPORT_DIR, 'fca-hero-baselines.json'),
    profileBaselines: path.join(REPORT_DIR, 'fca-profile-baselines.json'),
    subroleBaselines: path.join(REPORT_DIR, 'fca-subrole-baselines.json')
  }

  await fsp.writeFile(files.markdown, buildMarkdown(report), 'utf8')
  await writeJson(files.reportJson, report)
  await writeJson(files.heroBaselines, {
    generatedAt: report.generatedAt,
    inputFile: report.inputFile,
    seasonId: report.seasonId,
    metrics: report.metrics,
    heroes: report.baselines.heroes,
    byHero: baselineByKey(report.baselines.heroes)
  })
  await writeJson(files.profileBaselines, {
    generatedAt: report.generatedAt,
    inputFile: report.inputFile,
    seasonId: report.seasonId,
    metrics: report.metrics,
    scoringProfiles: report.baselines.scoringProfiles,
    byScoringProfile: baselineByKey(report.baselines.scoringProfiles)
  })
  await writeJson(files.subroleBaselines, {
    generatedAt: report.generatedAt,
    inputFile: report.inputFile,
    seasonId: report.seasonId,
    metrics: report.metrics,
    subroles: report.baselines.subroles,
    bySubrole: baselineByKey(report.baselines.subroles)
  })

  const topHeroes = report.baselines.heroes
    .slice(0, 10)
    .map(hero => `${hero.key} (${hero.sampleLogs})`)

  console.log(JSON.stringify({
    inputFile: report.inputFile,
    validLogs: report.cleaning.validLogs,
    filteredLogs: report.cleaning.filteredLogs,
    dedupeRemoved: report.cleaning.dedupeRemoved,
    totalValidPlaytimeMinutes: report.overview.totalValidPlaytimeMinutes,
    unknownHeroes: report.coverage.unknownHeroes.map(item => item.name),
    fallbackHeroes: report.coverage.fallbackHeroes.map(item => item.name),
    topHeroes,
    reports: Object.values(files).map(file => path.relative(ROOT_DIR, file))
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
