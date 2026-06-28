import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeSeasonId } from '../src/features/favorites/normalizeSeasonId.js'
import { resolveHeroSubrole } from '../src/lib/heroSubroleSelectors.js'
import {
  calculateRawProfileScore,
  getPer10Stats,
  getRatingModelVersion
} from '../src/lib/ratingModel.js'

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
  { id: 'elims', totalKey: 'elims', names: ['elims', 'eliminations', 'total_elim', 'elim'] },
  { id: 'assists', totalKey: 'assists', names: ['assists', 'asts', 'total_ast', 'ast'] },
  { id: 'deaths', totalKey: 'deaths', names: ['deaths', 'dths', 'total_dth', 'dth'] },
  { id: 'damage', totalKey: 'damage', names: ['damage', 'total_dmg', 'dmg'] },
  { id: 'healing', totalKey: 'healing', names: ['healing', 'heal', 'total_heal'] },
  { id: 'blocked', totalKey: 'blocked', names: ['blocked', 'block', 'mitigation', 'total_block'] }
]

const PERCENTILE_POINTS = [
  ['p10', 0.10],
  ['p25', 0.25],
  ['p50', 0.50],
  ['p75', 0.75],
  ['p90', 0.90],
  ['p95', 0.95]
]

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

function formatNumber(value, digits = 1) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  if (Math.abs(number) >= 1000) return Math.round(number).toLocaleString('en-US')
  return Number.isInteger(number) ? String(number) : number.toFixed(digits)
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
    if (!fs.existsSync(explicitPath)) throw new Error(`Input file not found: ${explicitPath}`)
    return explicitPath
  }

  const found = DEFAULT_INPUTS.map(candidate => path.join(ROOT_DIR, candidate)).find(candidate => fs.existsSync(candidate))
  if (!found) {
    const searched = DEFAULT_INPUTS.map(candidate => `  - ${candidate}`).join('\n')
    throw new Error(`No FCA input file found. Pass --input path/to/fca-history.json or create one of:\n${searched}`)
  }
  return found
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, 'utf8'))
}

async function readRequiredJson(filePath, hint) {
  if (!fs.existsSync(filePath)) throw new Error(`${hint}: ${filePath}`)
  return readJson(filePath)
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
  if (matchLogs.length) return { source: 'match_logs', logs: matchLogs, skippedLiveLogs: liveMatchLogs.length }
  if (liveMatchLogs.length) return { source: 'live_match_logs', logs: liveMatchLogs, skippedLiveLogs: 0 }
  return { source: 'none', logs: [], skippedLiveLogs: 0 }
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
      const resolution = resolveHeroSubrole(hero, { seasonId, teamId, playerId, heroName: hero, role })
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
        log: { ...log, playtimeMinutes, totals },
        resolution
      }

      if (!resolution.known) {
        unknownHeroes.set(hero, (unknownHeroes.get(hero) || 0) + 1)
      }
      if (resolution.usedFallback) {
        fallbackHeroes.set(hero, (fallbackHeroes.get(hero) || 0) + 1)
      }

      validLogs.push(row)
    })
  })

  cleaning.filteredLogs = cleaning.filteredPlaytimeNonPositive + cleaning.filteredHeroEmpty + cleaning.filteredTotalsAllZero
  cleaning.removedLogs = cleaning.filteredLogs + cleaning.dedupeRemoved
  cleaning.validLogs = validLogs.length

  return {
    validLogs,
    cleaning,
    unknownHeroes: Array.from(unknownHeroes.entries()).map(([name, count]) => ({ name, count })),
    fallbackHeroes: Array.from(fallbackHeroes.entries()).map(([name, count]) => ({ name, count }))
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
  const sorted = values.filter(value => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b)
  if (!sorted.length) {
    return { count: 0, p10: null, p25: null, p50: null, p75: null, p90: null, p95: null, mean: null, max: null }
  }

  const summary = { count: sorted.length }
  PERCENTILE_POINTS.forEach(([key, pct]) => {
    summary[key] = round(percentile(sorted, pct))
  })
  summary.mean = round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length)
  summary.max = round(sorted[sorted.length - 1])
  return summary
}

function byKey(items, keyName = 'key') {
  return safeArr(items).reduce((acc, item) => {
    acc[item[keyName]] = item
    return acc
  }, {})
}

function getBaselineMaps(heroFile, profileFile, subroleFile) {
  return {
    hero: byKey(heroFile.heroes),
    profile: byKey(profileFile.scoringProfiles),
    subrole: byKey(subroleFile.subroles)
  }
}

function metricSummary(rows, metric) {
  return summarizeValues(rows.map(row => row.metricPercentiles?.[metric]?.percentile))
}

function groupRows(rows, keyGetter) {
  const groups = new Map()
  rows.forEach(row => {
    const key = keyGetter(row) || 'UNKNOWN'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })
  return groups
}

function summarizeGroupRows(rows, key) {
  return {
    key,
    sampleLogs: rows.length,
    totalPlaytimeMinutes: round(rows.reduce((sum, row) => sum + row.playtimeMinutes, 0)),
    rawScore: summarizeValues(rows.map(row => row.rawScore)),
    mapRating: summarizeValues(rows.map(row => row.mapRating)),
    metrics: {
      elims: metricSummary(rows, 'elims'),
      assists: metricSummary(rows, 'assists'),
      survival: metricSummary(rows, 'survival'),
      damage: metricSummary(rows, 'damage'),
      healing: metricSummary(rows, 'healing'),
      blocked: metricSummary(rows, 'blocked')
    }
  }
}

function summarizeGroups(rows, keyGetter) {
  return Array.from(groupRows(rows, keyGetter).entries())
    .map(([key, group]) => summarizeGroupRows(group, key))
    .sort((a, b) => b.sampleLogs - a.sampleLogs || a.key.localeCompare(b.key))
}

function aggregatePlayerSubrole(rows) {
  return Array.from(groupRows(rows, row => `${row.playerId}:${row.subrole}`).entries())
    .map(([key, group]) => {
      const [playerId, subrole] = key.split(':')
      const totalMinutes = group.reduce((sum, row) => sum + row.playtimeMinutes, 0)
      const weightedScore = totalMinutes > 0
        ? group.reduce((sum, row) => sum + (toFiniteNumber(row.rawScore) * row.playtimeMinutes), 0) / totalMinutes
        : null
      return {
        playerId,
        subrole,
        sampleLogs: group.length,
        totalPlaytimeMinutes: round(totalMinutes),
        previewRawScore: round(weightedScore),
        sampleStatus: group.some(row => row.sampleStatus === 'OK') ? 'OK' : group.some(row => row.sampleStatus === 'LOW_SAMPLE') ? 'LOW_SAMPLE' : 'VERY_LOW_SAMPLE'
      }
    })
    .sort((a, b) => a.subrole.localeCompare(b.subrole) || a.playerId.localeCompare(b.playerId))
}

function pickRows(rows, predicate, sorter, limit = 10) {
  return rows
    .filter(predicate)
    .sort(sorter)
    .slice(0, limit)
    .map(row => ({
      playerId: row.playerId,
      hero: row.canonicalHeroName,
      subrole: row.subrole,
      scoringProfile: row.scoringProfile,
      matchId: row.matchId,
      mapOrder: row.mapOrder,
      mapName: row.mapName,
      playtimeMinutes: round(row.playtimeMinutes),
      rawScore: row.rawScore,
      mapRating: row.mapRating,
      damagePct: row.metricPercentiles.damage?.percentile,
      elimsPct: row.metricPercentiles.elims?.percentile,
      survivalPct: row.metricPercentiles.survival?.percentile,
      deathsPer10: round(row.per10Stats.deaths),
      sampleStatus: row.sampleStatus
    }))
}

function topRowsBySubrole(rows, field) {
  return Array.from(groupRows(rows, row => row.subrole).entries())
    .reduce((acc, [subrole, group]) => {
      acc[subrole] = pickRows(group, () => true, (a, b) => toFiniteNumber(b[field]) - toFiniteNumber(a[field]) || b.playtimeMinutes - a.playtimeMinutes, 10)
      return acc
    }, {})
}

function buildSanityChecks(rows) {
  const symmetraRows = rows.filter(row => row.canonicalHeroName === 'Symmetra')
  const lucioRows = rows.filter(row => row.canonicalHeroName === 'Lúcio')
  const doomBallRows = rows.filter(row => ['Doomfist', 'Wrecking Ball'].includes(row.canonicalHeroName))
  const sigmaDominaRows = rows.filter(row => ['Sigma', 'Domina'].includes(row.canonicalHeroName))
  const damageFlexSupportRows = rows.filter(row => row.scoringProfile === 'damage_flex_support')
  const highDamageHighDeathsRows = pickRows(
    rows,
    row => row.subrole === 'HITSCAN' || row.subrole === 'FLEX_DPS',
    (a, b) => toFiniteNumber(b.metricPercentiles.damage?.percentile) - toFiniteNumber(a.metricPercentiles.damage?.percentile),
    100
  ).filter(row => toFiniteNumber(row.damagePct) >= 80 && toFiniteNumber(row.survivalPct) <= 35).slice(0, 12)

  return {
    symmetraBarrierUtilityFlex: {
      sampleLogs: symmetraRows.length,
      blockedPercentile: metricSummary(symmetraRows, 'blocked'),
      rawScore: summarizeValues(symmetraRows.map(row => row.rawScore)),
      mapRating: summarizeValues(symmetraRows.map(row => row.mapRating)),
      observation: symmetraRows.length
        ? 'Symmetra blocked is represented through barrier_utility_flex, while mapRating remains bounded by the 9.8 cap.'
        : 'No Symmetra rows in this replay sample.'
    },
    lucioTempoMainSupport: {
      sampleLogs: lucioRows.length,
      healingPercentile: metricSummary(lucioRows, 'healing'),
      assistsPercentile: metricSummary(lucioRows, 'assists'),
      survivalPercentile: metricSummary(lucioRows, 'survival'),
      mapRating: summarizeValues(lucioRows.map(row => row.mapRating)),
      observation: lucioRows.length
        ? 'Lúcio is evaluated through tempo_main_support, so assists/survival/blocked keep low healing from burying the rating.'
        : 'No Lúcio rows in this replay sample.'
    },
    tankProfileCheck: {
      doomfistBall: {
        sampleLogs: doomBallRows.length,
        blockedPercentile: metricSummary(doomBallRows, 'blocked'),
        survivalPercentile: metricSummary(doomBallRows, 'survival'),
        mapRating: summarizeValues(doomBallRows.map(row => row.mapRating))
      },
      sigmaDomina: {
        sampleLogs: sigmaDominaRows.length,
        blockedPercentile: metricSummary(sigmaDominaRows, 'blocked'),
        damagePercentile: metricSummary(sigmaDominaRows, 'damage'),
        mapRating: summarizeValues(sigmaDominaRows.map(row => row.mapRating))
      },
      observation: 'disrupt_tank lowers blocked weight, while poke_tank can still recognize blocked/damage without using one shared tank pool only.'
    },
    damageFlexSupport: {
      sampleLogs: damageFlexSupportRows.length,
      elimsPercentile: metricSummary(damageFlexSupportRows, 'elims'),
      damagePercentile: metricSummary(damageFlexSupportRows, 'damage'),
      healingPercentile: metricSummary(damageFlexSupportRows, 'healing'),
      mapRating: summarizeValues(damageFlexSupportRows.map(row => row.mapRating)),
      observation: 'Illari/Zenyatta damage and elims are represented, and damage_flex_support is exempt from the support healing soft cap.'
    },
    highDamageHighDeathsDps: {
      debugRows: highDamageHighDeathsRows,
      observation: 'High damage rows with low survival are surfaced for review so damage alone does not imply top-end rating.'
    }
  }
}

function escapeCell(value) {
  return cleanText(value).replace(/\|/g, '\\|')
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_No data._\n'
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(escapeCell).join(' | ')} |`)
  ].join('\n') + '\n'
}

function distributionRows(groups) {
  return groups.map(group => [
    group.key,
    group.sampleLogs,
    formatNumber(group.totalPlaytimeMinutes, 1),
    formatNumber(group.rawScore.p50, 1),
    formatNumber(group.rawScore.p75, 1),
    formatNumber(group.rawScore.p90, 1),
    formatNumber(group.mapRating.p50, 1),
    formatNumber(group.mapRating.p75, 1),
    formatNumber(group.mapRating.p90, 1)
  ])
}

function debugRowTable(rows) {
  return markdownTable(
    ['Player', 'Hero', 'Profile', 'Match', 'Map', 'RawScore', 'MapRating', 'Damage%', 'Survival%', 'Deaths/10', 'Sample'],
    rows.map(row => [
      row.playerId,
      row.hero,
      row.scoringProfile,
      row.matchId,
      `${row.mapOrder} ${row.mapName}`,
      formatNumber(row.rawScore, 1),
      formatNumber(row.mapRating, 1),
      formatNumber(row.damagePct, 1),
      formatNumber(row.survivalPct, 1),
      formatNumber(row.deathsPer10, 1),
      row.sampleStatus
    ])
  )
}

function buildMarkdown(report) {
  const lines = []
  lines.push('# FCA Rating Model Replay Report')
  lines.push('')
  lines.push('DEBUG ONLY - NOT OFFICIAL RANKING')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Input: ${report.inputFile}`)
  lines.push(`Rating model: ${report.ratingModelVersion}`)
  lines.push('')

  lines.push('## Overview')
  lines.push('')
  lines.push(`- effective logs: ${report.overview.effectiveLogs}`)
  lines.push(`- total minutes: ${formatNumber(report.overview.totalPlaytimeMinutes, 1)}`)
  lines.push(`- unknown heroes: ${report.overview.unknownHeroes.map(item => `${item.name} (${item.count})`).join(', ') || 'None'}`)
  lines.push(`- fallback count: ${report.overview.fallbackCount}`)
  lines.push(`- profile fallback count: ${report.overview.profileFallbackCount}`)
  lines.push('')

  lines.push('## Rating Distribution')
  lines.push('')
  lines.push(markdownTable(
    ['Metric', 'P10', 'P25', 'P50', 'P75', 'P90', 'P95', 'Mean', 'Max'],
    [
      ['rawScore', report.distribution.rawScore.p10, report.distribution.rawScore.p25, report.distribution.rawScore.p50, report.distribution.rawScore.p75, report.distribution.rawScore.p90, report.distribution.rawScore.p95, report.distribution.rawScore.mean, report.distribution.rawScore.max].map(value => typeof value === 'string' ? value : formatNumber(value, 1)),
      ['mapRating', report.distribution.mapRating.p10, report.distribution.mapRating.p25, report.distribution.mapRating.p50, report.distribution.mapRating.p75, report.distribution.mapRating.p90, report.distribution.mapRating.p95, report.distribution.mapRating.mean, report.distribution.mapRating.max].map(value => typeof value === 'string' ? value : formatNumber(value, 1))
    ]
  ))
  lines.push('### By Subrole')
  lines.push('')
  lines.push(markdownTable(
    ['Subrole', 'Logs', 'Minutes', 'Raw P50', 'Raw P75', 'Raw P90', 'Map P50', 'Map P75', 'Map P90'],
    distributionRows(report.distribution.bySubrole)
  ))
  lines.push('### By Scoring Profile')
  lines.push('')
  lines.push(markdownTable(
    ['Profile', 'Logs', 'Minutes', 'Raw P50', 'Raw P75', 'Raw P90', 'Map P50', 'Map P75', 'Map P90'],
    distributionRows(report.distribution.byScoringProfile)
  ))

  lines.push('## Sanity Checks')
  lines.push('')
  lines.push('### A. Symmetra / barrier_utility_flex')
  lines.push('')
  lines.push(`- ${report.sanityChecks.symmetraBarrierUtilityFlex.observation}`)
  lines.push(`- blocked percentile P50/P75/P90: ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.blockedPercentile.p50, 1)} / ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.blockedPercentile.p75, 1)} / ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.blockedPercentile.p90, 1)}`)
  lines.push(`- mapRating P50/P75/P90/max: ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.mapRating.p50, 1)} / ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.mapRating.p75, 1)} / ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.mapRating.p90, 1)} / ${formatNumber(report.sanityChecks.symmetraBarrierUtilityFlex.mapRating.max, 1)}`)
  lines.push('')
  lines.push('### B. Lúcio / tempo_main_support')
  lines.push('')
  lines.push(`- ${report.sanityChecks.lucioTempoMainSupport.observation}`)
  lines.push(`- healing/assists/survival P50: ${formatNumber(report.sanityChecks.lucioTempoMainSupport.healingPercentile.p50, 1)} / ${formatNumber(report.sanityChecks.lucioTempoMainSupport.assistsPercentile.p50, 1)} / ${formatNumber(report.sanityChecks.lucioTempoMainSupport.survivalPercentile.p50, 1)}`)
  lines.push(`- mapRating P50/P75/P90: ${formatNumber(report.sanityChecks.lucioTempoMainSupport.mapRating.p50, 1)} / ${formatNumber(report.sanityChecks.lucioTempoMainSupport.mapRating.p75, 1)} / ${formatNumber(report.sanityChecks.lucioTempoMainSupport.mapRating.p90, 1)}`)
  lines.push('')
  lines.push('### C. dive_tank / disrupt_tank / poke_tank')
  lines.push('')
  lines.push(`- ${report.sanityChecks.tankProfileCheck.observation}`)
  lines.push(`- Doomfist/Ball blocked P50 ${formatNumber(report.sanityChecks.tankProfileCheck.doomfistBall.blockedPercentile.p50, 1)}, mapRating P50 ${formatNumber(report.sanityChecks.tankProfileCheck.doomfistBall.mapRating.p50, 1)}`)
  lines.push(`- Sigma/Domina blocked P50 ${formatNumber(report.sanityChecks.tankProfileCheck.sigmaDomina.blockedPercentile.p50, 1)}, damage P50 ${formatNumber(report.sanityChecks.tankProfileCheck.sigmaDomina.damagePercentile.p50, 1)}, mapRating P50 ${formatNumber(report.sanityChecks.tankProfileCheck.sigmaDomina.mapRating.p50, 1)}`)
  lines.push('')
  lines.push('### D. damage_flex_support')
  lines.push('')
  lines.push(`- ${report.sanityChecks.damageFlexSupport.observation}`)
  lines.push(`- elims/damage/healing P50: ${formatNumber(report.sanityChecks.damageFlexSupport.elimsPercentile.p50, 1)} / ${formatNumber(report.sanityChecks.damageFlexSupport.damagePercentile.p50, 1)} / ${formatNumber(report.sanityChecks.damageFlexSupport.healingPercentile.p50, 1)}`)
  lines.push(`- mapRating P50/P75/P90: ${formatNumber(report.sanityChecks.damageFlexSupport.mapRating.p50, 1)} / ${formatNumber(report.sanityChecks.damageFlexSupport.mapRating.p75, 1)} / ${formatNumber(report.sanityChecks.damageFlexSupport.mapRating.p90, 1)}`)
  lines.push('')
  lines.push('### E. High Damage High Deaths DPS')
  lines.push('')
  lines.push(`- ${report.sanityChecks.highDamageHighDeathsDps.observation}`)
  lines.push(debugRowTable(report.sanityChecks.highDamageHighDeathsDps.debugRows))

  lines.push('## Top Debug Rows')
  lines.push('')
  lines.push('DEBUG ONLY - NOT OFFICIAL RANKING')
  lines.push('')
  Object.entries(report.topDebugRows.rawScoreBySubrole).forEach(([subrole, rows]) => {
    lines.push(`### ${subrole} RawScore Top 10`)
    lines.push('')
    lines.push(debugRowTable(rows))
  })
  Object.entries(report.topDebugRows.mapRatingBySubrole).forEach(([subrole, rows]) => {
    lines.push(`### ${subrole} MapRating Top 10`)
    lines.push('')
    lines.push(debugRowTable(rows))
  })

  lines.push('## Low Sample / Unknowns')
  lines.push('')
  lines.push(`- VERY_LOW_SAMPLE heroes: ${report.coverage.veryLowSampleHeroes.map(item => `${item.key} (${item.sampleLogs})`).join(', ') || 'None'}`)
  lines.push(`- LOW_SAMPLE heroes: ${report.coverage.lowSampleHeroes.map(item => `${item.key} (${item.sampleLogs})`).join(', ') || 'None'}`)
  lines.push(`- UNKNOWN heroes: ${report.overview.unknownHeroes.map(item => `${item.name} (${item.count})`).join(', ') || 'None'}`)
  lines.push(`- fallback profiles: ${report.coverage.fallbackProfiles.map(item => `${item.scoringProfile} -> ${item.effectiveScoringProfile} (${item.count})`).join(', ') || 'None'}`)
  lines.push('')

  return lines.join('\n')
}

async function writeJson(filePath, value) {
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = resolveInputPath(args.input)
  const db = await readJson(inputPath)
  const seasonId = normalizeSeasonId('FCA26') || 'FCA2026'
  const heroBaselineFile = await readRequiredJson(path.join(REPORT_DIR, 'fca-hero-baselines.json'), 'Run npm run analyze:fca-heroes first')
  const profileBaselineFile = await readRequiredJson(path.join(REPORT_DIR, 'fca-profile-baselines.json'), 'Run npm run analyze:fca-heroes first')
  const subroleBaselineFile = await readRequiredJson(path.join(REPORT_DIR, 'fca-subrole-baselines.json'), 'Run npm run analyze:fca-heroes first')
  const baselineMaps = getBaselineMaps(heroBaselineFile, profileBaselineFile, subroleBaselineFile)
  const { validLogs, cleaning, unknownHeroes, fallbackHeroes } = collectValidLogs(db, seasonId)

  const rows = validLogs.map(row => {
    const heroBaseline = baselineMaps.hero[row.resolution.canonicalHeroName]
    const profileBaseline = baselineMaps.profile[row.resolution.scoringProfile]
    const subroleBaseline = baselineMaps.subrole[row.resolution.resolvedSubrole]
    const per10Stats = getPer10Stats(row.log)
    const rating = calculateRawProfileScore({
      per10Stats,
      heroBaseline,
      profileBaseline,
      subroleBaseline,
      scoringProfile: row.resolution.scoringProfile,
      sampleStatus: heroBaseline?.sampleStatus
    })

    return {
      rowId: row.rowId,
      playerId: row.playerId,
      teamId: row.teamId,
      matchId: row.matchId,
      rawMatchId: row.rawMatchId,
      mapOrder: row.mapOrder,
      mapName: row.mapName,
      source: row.source,
      inputHeroName: row.hero,
      canonicalHeroName: row.resolution.canonicalHeroName,
      subrole: row.resolution.resolvedSubrole,
      officialRole: row.resolution.officialRole,
      scoringProfile: row.resolution.scoringProfile,
      effectiveScoringProfile: rating.effectiveScoringProfile,
      profileFallbackUsed: rating.profileFallbackUsed,
      playtimeMinutes: row.playtimeMinutes,
      per10Stats,
      metricPercentiles: rating.metricPercentiles,
      rawScore: rating.rawScore,
      rawScoreBeforeCaps: rating.rawScoreBeforeCaps,
      mapRating: rating.mapRating,
      sampleStatus: rating.sampleStatus,
      usedFallback: row.resolution.usedFallback,
      known: row.resolution.known
    }
  })

  const fallbackProfileCounts = new Map()
  rows.filter(row => row.profileFallbackUsed).forEach(row => {
    const key = `${row.scoringProfile}->${row.effectiveScoringProfile}`
    fallbackProfileCounts.set(key, (fallbackProfileCounts.get(key) || 0) + 1)
  })

  const heroBaselines = safeArr(heroBaselineFile.heroes)
  const report = {
    generatedAt: new Date().toISOString(),
    inputFile: inputPath,
    seasonId,
    ratingModelVersion: getRatingModelVersion(),
    cleaning,
    overview: {
      effectiveLogs: rows.length,
      totalPlaytimeMinutes: round(rows.reduce((sum, row) => sum + row.playtimeMinutes, 0)),
      unknownHeroes,
      fallbackCount: fallbackHeroes.reduce((sum, item) => sum + item.count, 0),
      fallbackHeroes,
      profileFallbackCount: rows.filter(row => row.profileFallbackUsed).length
    },
    distribution: {
      rawScore: summarizeValues(rows.map(row => row.rawScore)),
      mapRating: summarizeValues(rows.map(row => row.mapRating)),
      bySubrole: summarizeGroups(rows, row => row.subrole),
      byScoringProfile: summarizeGroups(rows, row => row.scoringProfile)
    },
    summaries: {
      byHero: summarizeGroups(rows, row => row.canonicalHeroName),
      byScoringProfile: summarizeGroups(rows, row => row.scoringProfile),
      bySubrole: summarizeGroups(rows, row => row.subrole),
      playerSubrolePreview: aggregatePlayerSubrole(rows)
    },
    sanityChecks: buildSanityChecks(rows),
    topDebugRows: {
      label: 'DEBUG ONLY - NOT OFFICIAL RANKING',
      rawScoreBySubrole: topRowsBySubrole(rows, 'rawScore'),
      mapRatingBySubrole: topRowsBySubrole(rows, 'mapRating')
    },
    coverage: {
      lowSampleHeroes: heroBaselines.filter(item => item.sampleStatus === 'LOW_SAMPLE'),
      veryLowSampleHeroes: heroBaselines.filter(item => item.sampleStatus === 'VERY_LOW_SAMPLE'),
      unknownHeroes,
      fallbackHeroes,
      fallbackProfiles: Array.from(fallbackProfileCounts.entries()).map(([key, count]) => {
        const [scoringProfile, effectiveScoringProfile] = key.split('->')
        return { scoringProfile, effectiveScoringProfile, count }
      })
    },
    debugRows: rows
  }

  await fsp.mkdir(REPORT_DIR, { recursive: true })
  const reportJsonPath = path.join(REPORT_DIR, 'fca-rating-replay-report.json')
  const reportMdPath = path.join(REPORT_DIR, 'fca-rating-replay-report.md')
  await writeJson(reportJsonPath, report)
  await fsp.writeFile(reportMdPath, buildMarkdown(report), 'utf8')

  console.log(JSON.stringify({
    inputFile: report.inputFile,
    ratingModelVersion: report.ratingModelVersion,
    effectiveLogs: report.overview.effectiveLogs,
    totalPlaytimeMinutes: report.overview.totalPlaytimeMinutes,
    unknownHeroes: report.overview.unknownHeroes,
    fallbackCount: report.overview.fallbackCount,
    profileFallbackCount: report.overview.profileFallbackCount,
    reports: [
      path.relative(ROOT_DIR, reportMdPath),
      path.relative(ROOT_DIR, reportJsonPath)
    ]
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
