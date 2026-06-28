import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeSeasonId } from '../src/features/favorites/normalizeSeasonId.js'
import { scoreLeaderboardEntriesLegacy } from '../src/lib/leaderboardScoring.js'
import { buildRatingBaselinesFromDb } from '../src/lib/ratingBaselines.js'
import { calculateRawProfileScore, getRatingModelVersion } from '../src/lib/ratingModel.js'

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

const ROLE_ORDER = ['TANK', 'DPS', 'SUPPORT']

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

function normalizeRole(value) {
  const key = cleanText(value).toUpperCase()
  if (key === 'TANK') return 'TANK'
  if (key === 'DPS' || key === 'DAMAGE' || key === 'DMG') return 'DPS'
  if (key === 'SUPPORT' || key === 'SUP' || key === 'HEALER') return 'SUPPORT'
  return ''
}

function roleFromResolution(resolution) {
  if (resolution?.officialRole === 'DAMAGE') return 'DPS'
  return normalizeRole(resolution?.officialRole || resolution?.resolvedSubrole)
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
    if (arg.startsWith('--input=')) args.input = arg.slice('--input='.length)
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
    throw new Error(`No input file found. Pass --input path/to/db.json or create one of:\n${searched}`)
  }
  return found
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, 'utf8'))
}

function createPlayerDirectory(players) {
  const map = new Map()
  safeArr(players).forEach(player => {
    [
      player.player_id,
      player.id,
      player.player_name,
      player.nickname,
      player.display_name,
      player.battle_tag,
      player.battleTag
    ].map(value => cleanText(value).toLowerCase()).filter(Boolean).forEach(key => {
      if (!map.has(key)) map.set(key, player)
    })
  })
  return map
}

function buildLegacyEntry(row, playerDirectory) {
  const player = playerDirectory.get(cleanText(row.playerId).toLowerCase())
  const role = roleFromResolution(row.resolution)
  const totals = row.totals
  const displayName = cleanText(player?.nickname || player?.display_name || player?.player_name || row.playerId)

  return {
    entryKey: row.rowId,
    player_id: row.playerId,
    player_name: cleanText(player?.player_name || row.playerId),
    nickname: cleanText(player?.nickname),
    display_name: displayName,
    battleTag: cleanText(player?.battleTag || player?.battle_tag || player?.player_name),
    team_id: row.teamId,
    team_name: cleanText(player?.team_name || row.teamId),
    team_short_name: cleanText(player?.team_short_name || row.teamId),
    role,
    maps_played: 1,
    roleMapsPlayed: 1,
    raw_time_mins: row.playtimeMinutes,
    roleTimeMins: row.playtimeMinutes,
    total_time_played: `${Math.round(row.playtimeMinutes)}m`,
    most_played_hero: row.resolution.canonicalHeroName,
    top_3_heroes: [row.resolution.canonicalHeroName],
    metrics: {
      total: {
        elim: totals.elims,
        ast: totals.assists,
        dth: totals.deaths,
        dmg: totals.damage,
        heal: totals.healing,
        block: totals.blocked
      },
      per10: {
        elim: row.per10.elimsPer10,
        ast: row.per10.assistsPer10,
        dth: row.per10.deathsPer10,
        dmg: row.per10.damagePer10,
        heal: row.per10.healingPer10,
        block: row.per10.blockedPer10
      },
      perMap: {
        elim: totals.elims,
        ast: totals.assists,
        dth: totals.deaths,
        dmg: totals.damage,
        heal: totals.healing,
        block: totals.blocked
      }
    }
  }
}

function getPer10Stats(row) {
  return {
    elims: row.per10.elimsPer10,
    assists: row.per10.assistsPer10,
    deaths: row.per10.deathsPer10,
    damage: row.per10.damagePer10,
    healing: row.per10.healingPer10,
    blocked: row.per10.blockedPer10
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
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0, p10: null, p25: null, p50: null, p75: null, p90: null, p95: null, mean: null, max: null }
  return {
    count: sorted.length,
    p10: round(percentile(sorted, 0.10)),
    p25: round(percentile(sorted, 0.25)),
    p50: round(percentile(sorted, 0.50)),
    p75: round(percentile(sorted, 0.75)),
    p90: round(percentile(sorted, 0.90)),
    p95: round(percentile(sorted, 0.95)),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    max: round(sorted[sorted.length - 1])
  }
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
    legacyScore: summarizeValues(rows.map(row => row.legacyScore)),
    ratingV1RawScore: summarizeValues(rows.map(row => row.ratingV1RawScore)),
    ratingV1MapRating: summarizeValues(rows.map(row => row.ratingV1MapRating)),
    delta: summarizeValues(rows.map(row => row.delta))
  }
}

function summarizeGroups(rows, keyGetter) {
  return [...groupRows(rows, keyGetter).entries()]
    .map(([key, group]) => summarizeGroupRows(group, key))
    .sort((a, b) => b.sampleLogs - a.sampleLogs || a.key.localeCompare(b.key))
}

function pickRows(rows, sorter, limit = 20) {
  return [...rows].sort(sorter).slice(0, limit)
}

function debugRow(row) {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    nickname: row.nickname,
    team: row.team,
    hero: row.hero,
    subrole: row.subrole,
    scoringProfile: row.scoringProfile,
    map: row.map,
    playtimeMinutes: row.playtimeMinutes,
    legacyScore: row.legacyScore,
    ratingV1RawScore: row.ratingV1RawScore,
    ratingV1MapRating: row.ratingV1MapRating,
    delta: row.delta,
    sampleStatus: row.sampleStatus,
    damagePercentile: row.metricPercentiles?.damage?.percentile,
    survivalPercentile: row.metricPercentiles?.survival?.percentile
  }
}

function metricSummary(rows, metric) {
  return summarizeValues(rows.map(row => row.metricPercentiles?.[metric]?.percentile))
}

function buildSanityChecks(rows) {
  const symmetra = rows.filter(row => row.hero === 'Symmetra')
  const lucio = rows.filter(row => row.hero === 'Lúcio')
  const doomBall = rows.filter(row => ['Doomfist', 'Wrecking Ball'].includes(row.hero))
  const damageFlexSupport = rows.filter(row => row.scoringProfile === 'damage_flex_support')
  const highDamageLowSurvival = rows
    .filter(row => ['HITSCAN', 'FLEX_DPS'].includes(row.subrole) && toFiniteNumber(row.metricPercentiles?.damage?.percentile) >= 80 && toFiniteNumber(row.metricPercentiles?.survival?.percentile) <= 35)
    .slice(0, 12)
  const sierra = rows.filter(row => row.hero === 'Sierra')

  return {
    symmetraBlocked: {
      sampleLogs: symmetra.length,
      blockedPercentile: metricSummary(symmetra, 'blocked'),
      mapRating: summarizeValues(symmetra.map(row => row.ratingV1MapRating)),
      observation: 'Symmetra uses barrier_utility_flex; blocked is recognized but capped by Rating Model v1.'
    },
    lucioTempo: {
      sampleLogs: lucio.length,
      healingPercentile: metricSummary(lucio, 'healing'),
      assistsPercentile: metricSummary(lucio, 'assists'),
      mapRating: summarizeValues(lucio.map(row => row.ratingV1MapRating)),
      observation: 'Lúcio uses tempo_main_support, so low relative healing is balanced by assists/survival/blocked.'
    },
    disruptTank: {
      sampleLogs: doomBall.length,
      blockedPercentile: metricSummary(doomBall, 'blocked'),
      mapRating: summarizeValues(doomBall.map(row => row.ratingV1MapRating)),
      observation: 'Doomfist and Wrecking Ball use disrupt_tank, lowering dependence on blocked.'
    },
    damageFlexSupport: {
      sampleLogs: damageFlexSupport.length,
      damagePercentile: metricSummary(damageFlexSupport, 'damage'),
      elimsPercentile: metricSummary(damageFlexSupport, 'elims'),
      mapRating: summarizeValues(damageFlexSupport.map(row => row.ratingV1MapRating)),
      observation: 'damage_flex_support recognizes Illari/Zenyatta damage and elims.'
    },
    highDamageLowSurvival: {
      debugRows: highDamageLowSurvival.map(debugRow),
      observation: 'High damage with weak survival is not automatically top rated.'
    },
    sierraRecognition: {
      sampleLogs: sierra.length,
      subroles: [...new Set(sierra.map(row => row.subrole))],
      scoringProfiles: [...new Set(sierra.map(row => row.scoringProfile))],
      observation: 'Sierra / 西拉 resolves to HITSCAN / poke_hitscan.'
    }
  }
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_No data._\n'
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(value => cleanText(value).replace(/\|/g, '\\|')).join(' | ')} |`)
  ].join('\n') + '\n'
}

function distributionTable(groups) {
  return markdownTable(
    ['Scope', 'Logs', 'Legacy P50', 'V1 Raw P50', 'Map P50', 'Delta P50', 'Delta P90'],
    groups.map(group => [
      group.key,
      group.sampleLogs,
      formatNumber(group.legacyScore.p50, 1),
      formatNumber(group.ratingV1RawScore.p50, 1),
      formatNumber(group.ratingV1MapRating.p50, 1),
      formatNumber(group.delta.p50, 1),
      formatNumber(group.delta.p90, 1)
    ])
  )
}

function debugTable(rows) {
  return markdownTable(
    ['Player', 'Team', 'Hero', 'Subrole', 'Profile', 'Map', 'Legacy', 'V1 Raw', 'V1 Map', 'Delta', 'Sample'],
    rows.map(row => [
      row.playerId,
      row.team,
      row.hero,
      row.subrole,
      row.scoringProfile,
      row.map,
      formatNumber(row.legacyScore, 1),
      formatNumber(row.ratingV1RawScore, 1),
      formatNumber(row.ratingV1MapRating, 1),
      formatNumber(row.delta, 1),
      row.sampleStatus
    ])
  )
}

function buildMarkdown(report) {
  const lines = []
  lines.push('# Scoring Engine Comparison Report')
  lines.push('')
  lines.push('DEBUG ONLY - NOT OFFICIAL RANKING')
  lines.push('')
  lines.push('## Overview')
  lines.push('')
  lines.push(`- input path: ${report.inputFile}`)
  lines.push(`- valid logs: ${report.overview.validLogs}`)
  lines.push(`- active rating model version: ${report.overview.ratingModelVersion}`)
  lines.push(`- legacy scoring entrypoint: ${report.overview.legacyEntrypoint}`)
  lines.push(`- unknown count: ${report.overview.unknownCount}`)
  lines.push(`- fallback count: ${report.overview.fallbackCount}`)
  lines.push('')
  lines.push('## Overall Distribution')
  lines.push('')
  lines.push(markdownTable(
    ['Metric', 'P10', 'P25', 'P50', 'P75', 'P90', 'P95'],
    [
      ['legacyScore', report.distribution.legacyScore.p10, report.distribution.legacyScore.p25, report.distribution.legacyScore.p50, report.distribution.legacyScore.p75, report.distribution.legacyScore.p90, report.distribution.legacyScore.p95],
      ['ratingV1RawScore', report.distribution.ratingV1RawScore.p10, report.distribution.ratingV1RawScore.p25, report.distribution.ratingV1RawScore.p50, report.distribution.ratingV1RawScore.p75, report.distribution.ratingV1RawScore.p90, report.distribution.ratingV1RawScore.p95],
      ['mapRating', report.distribution.ratingV1MapRating.p10, report.distribution.ratingV1MapRating.p25, report.distribution.ratingV1MapRating.p50, report.distribution.ratingV1MapRating.p75, report.distribution.ratingV1MapRating.p90, report.distribution.ratingV1MapRating.p95],
      ['delta', report.distribution.delta.p10, report.distribution.delta.p25, report.distribution.delta.p50, report.distribution.delta.p75, report.distribution.delta.p90, report.distribution.delta.p95]
    ].map(row => row.map((value, index) => index === 0 ? value : formatNumber(value, 1)))
  ))
  lines.push('## By Subrole')
  lines.push('')
  lines.push(distributionTable(report.bySubrole))
  lines.push('## By Scoring Profile')
  lines.push('')
  lines.push(distributionTable(report.byScoringProfile))
  lines.push('## Top Delta Samples')
  lines.push('')
  lines.push('DEBUG ONLY - NOT OFFICIAL RANKING')
  lines.push('')
  lines.push('### Legacy High / V1 Low')
  lines.push(debugTable(report.topDeltaSamples.legacyHighV1Low))
  lines.push('### Legacy Low / V1 High')
  lines.push(debugTable(report.topDeltaSamples.legacyLowV1High))
  lines.push('### V1 MapRating Highest')
  lines.push(debugTable(report.topDeltaSamples.v1MapRatingHighest))
  lines.push('### V1 MapRating Lowest')
  lines.push(debugTable(report.topDeltaSamples.v1MapRatingLowest))
  lines.push('## Sanity Checks')
  lines.push('')
  lines.push(`- Symmetra blocked: ${report.sanityChecks.symmetraBlocked.observation} map P50 ${formatNumber(report.sanityChecks.symmetraBlocked.mapRating.p50, 1)}.`)
  lines.push(`- Lúcio tempo: ${report.sanityChecks.lucioTempo.observation} map P50 ${formatNumber(report.sanityChecks.lucioTempo.mapRating.p50, 1)}.`)
  lines.push(`- Doomfist / Wrecking Ball: ${report.sanityChecks.disruptTank.observation} map P50 ${formatNumber(report.sanityChecks.disruptTank.mapRating.p50, 1)}.`)
  lines.push(`- damage_flex_support: ${report.sanityChecks.damageFlexSupport.observation} damage P50 ${formatNumber(report.sanityChecks.damageFlexSupport.damagePercentile.p50, 1)}.`)
  lines.push(`- High damage low survival DPS: ${report.sanityChecks.highDamageLowSurvival.observation}`)
  lines.push(`- Sierra / 西拉: ${report.sanityChecks.sierraRecognition.observation} profiles ${report.sanityChecks.sierraRecognition.scoringProfiles.join(', ') || '-'}.`)
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
  const seasonId = normalizeSeasonId(db?.season?.id || db?.meta?.season_id || 'FCA26') || 'FCA2026'
  const baselines = buildRatingBaselinesFromDb(db, { seasonId })
  const playerDirectory = createPlayerDirectory(db.players)
  const legacyRawEntries = baselines.logs.map(row => buildLegacyEntry(row, playerDirectory))
  const legacyScored = scoreLeaderboardEntriesLegacy(legacyRawEntries, 0)
  const legacyByKey = new Map(legacyScored.map(entry => [entry.entryKey, entry]))
  const rows = baselines.logs.map(row => {
    const legacy = legacyByKey.get(row.rowId)
    const { canonicalHeroName, resolvedSubrole, scoringProfile } = row.resolution
    const heroBaseline = baselines.byHero[canonicalHeroName]
    const profileBaseline = baselines.byScoringProfile[scoringProfile]
    const subroleBaseline = baselines.bySubrole[resolvedSubrole]
    const rating = calculateRawProfileScore({
      per10Stats: getPer10Stats(row),
      heroBaseline,
      profileBaseline,
      subroleBaseline,
      scoringProfile,
      sampleStatus: heroBaseline?.sampleStatus
    })
    const player = playerDirectory.get(cleanText(row.playerId).toLowerCase())
    const legacyScore = round(legacy?.roleScore)
    const ratingV1RawScore = rating.rawScore
    return {
      rowId: row.rowId,
      playerId: row.playerId,
      playerName: cleanText(player?.player_name || row.playerId),
      nickname: cleanText(player?.nickname),
      team: cleanText(player?.team_short_name || player?.team_name || row.teamId),
      hero: canonicalHeroName,
      subrole: resolvedSubrole,
      scoringProfile,
      map: `${row.matchId || row.rawMatchId} / ${row.mapOrder || '-'} ${row.mapName || ''}`.trim(),
      playtimeMinutes: round(row.playtimeMinutes),
      legacyScore,
      ratingV1RawScore,
      ratingV1MapRating: rating.mapRating,
      delta: Number.isFinite(Number(ratingV1RawScore)) && Number.isFinite(Number(legacyScore)) ? round(ratingV1RawScore - legacyScore) : null,
      sampleStatus: rating.sampleStatus,
      metricPercentiles: rating.metricPercentiles,
      known: row.resolution.known,
      usedFallback: row.resolution.usedFallback
    }
  })

  const report = {
    generatedAt: new Date().toISOString(),
    inputFile: inputPath,
    overview: {
      validLogs: rows.length,
      ratingModelVersion: getRatingModelVersion(),
      legacyEntrypoint: 'leaderboardScoring.scoreLeaderboardEntriesLegacy',
      unknownCount: rows.filter(row => !row.known).length,
      fallbackCount: rows.filter(row => row.usedFallback).length
    },
    distribution: {
      legacyScore: summarizeValues(rows.map(row => row.legacyScore)),
      ratingV1RawScore: summarizeValues(rows.map(row => row.ratingV1RawScore)),
      ratingV1MapRating: summarizeValues(rows.map(row => row.ratingV1MapRating)),
      delta: summarizeValues(rows.map(row => row.delta))
    },
    bySubrole: summarizeGroups(rows, row => row.subrole),
    byScoringProfile: summarizeGroups(rows, row => row.scoringProfile),
    topDeltaSamples: {
      label: 'DEBUG ONLY - NOT OFFICIAL RANKING',
      legacyHighV1Low: pickRows(rows, (a, b) => toFiniteNumber(a.delta) - toFiniteNumber(b.delta), 20).map(debugRow),
      legacyLowV1High: pickRows(rows, (a, b) => toFiniteNumber(b.delta) - toFiniteNumber(a.delta), 20).map(debugRow),
      v1MapRatingHighest: pickRows(rows, (a, b) => toFiniteNumber(b.ratingV1MapRating) - toFiniteNumber(a.ratingV1MapRating), 20).map(debugRow),
      v1MapRatingLowest: pickRows(rows, (a, b) => toFiniteNumber(a.ratingV1MapRating) - toFiniteNumber(b.ratingV1MapRating), 20).map(debugRow)
    },
    sanityChecks: buildSanityChecks(rows),
    rows
  }

  await fsp.mkdir(REPORT_DIR, { recursive: true })
  const jsonPath = path.join(REPORT_DIR, 'scoring-engine-comparison-report.json')
  const mdPath = path.join(REPORT_DIR, 'scoring-engine-comparison-report.md')
  await writeJson(jsonPath, report)
  await fsp.writeFile(mdPath, buildMarkdown(report), 'utf8')
  console.log(JSON.stringify({
    inputFile: inputPath,
    validLogs: report.overview.validLogs,
    unknownCount: report.overview.unknownCount,
    fallbackCount: report.overview.fallbackCount,
    ratingModelVersion: report.overview.ratingModelVersion,
    reports: [
      path.relative(ROOT_DIR, mdPath),
      path.relative(ROOT_DIR, jsonPath)
    ]
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
