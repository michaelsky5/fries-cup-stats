import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RATING_MODEL_VERSION } from '../src/config/ratingModelConfig.js'
import { buildRatingBaselinesFromPlayerLogs } from '../src/lib/ratingBaselines.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'data', 'rating-baselines', 'fcr26-swiss-final-v1.2.json')
const API_BASE = 'https://admin.fries-cup.com'
const SEASON_ID = 'FCR26'
const FREEZE_ID = 'FCR26_SWISS_FINAL_RATING_V1_2'
const FETCH_TIMEOUT_MS = 30000
const CHECK_MODE = process.argv.includes('--check')

function getArgumentValue(name) {
  const prefix = `${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length) || ''
}

const SOURCE_META_FILE = getArgumentValue('--meta-file')
const SOURCE_DATA_FILE = getArgumentValue('--data-file')

const SCORE_TARGETS = {
  CONTROL: 2,
  FLASHPOINT: 3,
  PUSH: 1
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function clean(value) {
  return String(value ?? '').trim()
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchText(url, attempts = 4) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(attempt * 750)
    }
  }
  throw new Error(`Unable to fetch ${url}: ${lastError?.message || lastError}`)
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url))
}

function isAdministrativeMap(map) {
  if (map?.is_administrative === true) return true
  const type = clean(map?.map_type || map?.mapType).toUpperCase().replace(/[\s-]+/g, '_')
  return [
    'PENALTY',
    'ADMIN',
    'ADMINISTRATIVE',
    'WALKOVER',
    'DEFAULT_WIN',
    'FORFEIT',
    'FORFEIT_WIN',
    'FF'
  ].includes(type)
}

function isPositiveDuration(value) {
  const match = clean(value).match(/^(\d{1,2}):([0-5]\d)$/)
  return Boolean(match && (Number(match[1]) > 0 || Number(match[2]) > 0))
}

function isValidMapScore(map) {
  const target = SCORE_TARGETS[clean(map?.map_type).toUpperCase()]
  if (!target) return true
  const scoreA = Number(map?.score_a)
  const scoreB = Number(map?.score_b)
  return Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA !== scoreB &&
    Math.max(scoreA, scoreB) === target && Math.min(scoreA, scoreB) >= 0 && Math.min(scoreA, scoreB) < target
}

function statFingerprint(map) {
  const rows = [
    ...safeArray(map?.team_a_stats),
    ...safeArray(map?.team_b_stats)
  ].filter(row => row?.player_id && row?.heroes_played)
  if (rows.length !== 10) return ''
  return JSON.stringify(rows.map(row => [
    row.side,
    row.team_id,
    row.player_id,
    row.role,
    row.heroes_played,
    row.eliminations,
    row.assists,
    row.deaths,
    row.damage,
    row.healing,
    row.mitigation
  ]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
}

function auditSwissData(db) {
  const swissMatches = safeArray(db?.matches).filter(match => clean(match?.stage).toUpperCase() === 'SWISS')
  const issues = []
  const fingerprints = new Map()
  let playedMapCount = 0
  let meaningfulStatRows = 0

  if (swissMatches.length !== 107) issues.push(`Expected 107 Swiss matches, found ${swissMatches.length}.`)

  swissMatches.forEach(match => {
    if (match?.status !== 'COMPLETE') issues.push(`${match?.match_id}: Swiss match is not complete.`)

    safeArray(match?.maps).forEach(map => {
      if (isAdministrativeMap(map)) return
      const mapRef = `${match?.match_id}#${map?.map_order}`
      const teamA = safeArray(map?.team_a_stats)
      const teamB = safeArray(map?.team_b_stats)
      const rows = [...teamA, ...teamB]
      if (!rows.length) return

      playedMapCount += 1
      meaningfulStatRows += rows.filter(row => row?.player_id && row?.heroes_played).length

      if (!isPositiveDuration(map?.match_time)) issues.push(`${mapRef}: played map duration is empty or 00:00.`)
      if (!isValidMapScore(map)) issues.push(`${mapRef}: invalid ${map?.map_type} score ${map?.score_a}:${map?.score_b}.`)
      if (teamA.length !== 5 || teamB.length !== 5) issues.push(`${mapRef}: expected 5 rows per side, found ${teamA.length}/${teamB.length}.`)

      ;[['A', teamA], ['B', teamB]].forEach(([side, sideRows]) => {
        const playerIds = sideRows.map(row => clean(row?.player_id)).filter(Boolean)
        if (new Set(playerIds).size !== playerIds.length) issues.push(`${mapRef}:${side}: duplicate player id.`)
        const roleCounts = { TANK: 0, DPS: 0, SUP: 0 }
        sideRows.forEach(row => {
          if (roleCounts[row?.role] !== undefined) roleCounts[row.role] += 1
          if (!row?.player_id || !row?.heroes_played) issues.push(`${mapRef}:${side}: player or hero is missing.`)
        })
        if (roleCounts.TANK !== 1 || roleCounts.DPS !== 2 || roleCounts.SUP !== 2) {
          issues.push(`${mapRef}:${side}: invalid role composition ${JSON.stringify(roleCounts)}.`)
        }
      })

      const fingerprint = statFingerprint(map)
      if (fingerprint) {
        const previous = fingerprints.get(fingerprint)
        if (previous) issues.push(`${mapRef}: exact ten-player stat duplicate of ${previous}.`)
        else fingerprints.set(fingerprint, mapRef)
      }
    })
  })

  if (issues.length) {
    throw new Error(`Swiss baseline freeze audit failed:\n- ${issues.join('\n- ')}`)
  }

  return { swissMatches, playedMapCount, meaningfulStatRows }
}

function getMatchReferences(match) {
  return [match?.match_id, match?.raw_match_id, match?.id].map(clean).filter(Boolean)
}

function logBelongsToSwiss(log, swissMatchIds) {
  return [log?.matchId, log?.match_id, log?.rawMatchId, log?.raw_match_id]
    .map(clean)
    .some(id => id && swissMatchIds.has(id))
}

function scopePlayersToSwiss(players, swissMatches) {
  const swissMatchIds = new Set(swissMatches.flatMap(getMatchReferences))
  return safeArray(players).map(player => ({
    ...player,
    match_logs: safeArray(player?.match_logs).filter(log => logBelongsToSwiss(log, swissMatchIds)),
    live_match_logs: safeArray(player?.live_match_logs).filter(log => logBelongsToSwiss(log, swissMatchIds))
  }))
}

function toFrozenSnapshot({ db, baselines, publishVersion, dataUrl, frozenAt, payloadSha256, audit }) {
  return {
    formatVersion: 1,
    freezeId: FREEZE_ID,
    seasonId: SEASON_ID,
    stageScope: 'SWISS',
    ratingModelVersion: RATING_MODEL_VERSION,
    frozenAt,
    policy: {
      frozenDistributions: true,
      runtimePlayerLogsRemainDynamic: true,
      futureStagesExcludedFromBaseline: ['LCQ', 'PLAYOFFS', 'FINAL']
    },
    source: {
      publishVersion: publishVersion.version,
      publishId: publishVersion.id,
      publishedAt: publishVersion.publishedAt,
      updatedAt: db.updated_at,
      dataUrl,
      checksum: publishVersion.checksum,
      checksumAlgorithm: publishVersion.contract?.checksumAlgorithm || 'sha256-json-stringify',
      payloadSha256,
      swissMatchCount: audit.swissMatches.length,
      playedMapCount: audit.playedMapCount,
      meaningfulStatRows: audit.meaningfulStatRows,
      playerCount: safeArray(db.players).length,
      teamCount: safeArray(db.teams).length
    },
    cleaning: baselines.cleaning,
    heroes: baselines.heroes,
    scoringProfiles: baselines.scoringProfiles,
    subroles: baselines.subroles
  }
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function loadSource(existing) {
  if (SOURCE_DATA_FILE) {
    const dataText = await fs.readFile(path.resolve(SOURCE_DATA_FILE), 'utf8')
    if (CHECK_MODE) {
      if (!existing) throw new Error(`Frozen snapshot does not exist: ${OUTPUT_PATH}`)
      return {
        db: JSON.parse(dataText),
        dataText,
        dataUrl: existing.source.dataUrl,
        publishVersion: {
          version: existing.source.publishVersion,
          id: existing.source.publishId,
          publishedAt: existing.source.publishedAt,
          checksum: existing.source.checksum,
          contract: { checksumAlgorithm: existing.source.checksumAlgorithm }
        }
      }
    }

    if (!SOURCE_META_FILE) throw new Error('--meta-file is required when generating from --data-file.')
    const meta = JSON.parse(await fs.readFile(path.resolve(SOURCE_META_FILE), 'utf8'))
    const publishVersion = meta?.publishVersion
    if (!publishVersion?.version || !publishVersion?.dataUrl) throw new Error('Source metadata is incomplete.')
    return {
      db: JSON.parse(dataText),
      dataText,
      dataUrl: new URL(publishVersion.dataUrl, API_BASE).toString(),
      publishVersion
    }
  }

  if (CHECK_MODE) {
    if (!existing) throw new Error(`Frozen snapshot does not exist: ${OUTPUT_PATH}`)
    const dataUrl = existing.source?.dataUrl
    if (!dataUrl) throw new Error('Frozen snapshot is missing source.dataUrl.')
    const dataText = await fetchText(dataUrl)
    return {
      db: JSON.parse(dataText),
      dataText,
      dataUrl,
      publishVersion: {
        version: existing.source.publishVersion,
        id: existing.source.publishId,
        publishedAt: existing.source.publishedAt,
        checksum: existing.source.checksum,
        contract: { checksumAlgorithm: existing.source.checksumAlgorithm }
      }
    }
  }

  const meta = await fetchJson(`${API_BASE}/api/public/seasons/${SEASON_ID}/publish/latest`)
  const publishVersion = meta?.publishVersion
  if (!publishVersion?.version || !publishVersion?.dataUrl) throw new Error('Latest publish metadata is incomplete.')
  const dataUrl = new URL(publishVersion.dataUrl, API_BASE).toString()
  const dataText = await fetchText(dataUrl)
  return { db: JSON.parse(dataText), dataText, dataUrl, publishVersion }
}

async function main() {
  const existing = await readExistingSnapshot()
  const source = await loadSource(existing)
  const audit = auditSwissData(source.db)
  const scopedPlayers = scopePlayersToSwiss(source.db.players, audit.swissMatches)
  const baselines = buildRatingBaselinesFromPlayerLogs(scopedPlayers, {
    seasonId: SEASON_ID,
    useFrozenBaselines: false
  })

  if (baselines.logs.length !== audit.meaningfulStatRows) {
    throw new Error(`Expected ${audit.meaningfulStatRows} valid Swiss logs, built ${baselines.logs.length}.`)
  }

  const snapshot = toFrozenSnapshot({
    db: source.db,
    baselines,
    publishVersion: source.publishVersion,
    dataUrl: source.dataUrl,
    frozenAt: existing?.frozenAt || new Date().toISOString(),
    // The public view can change transport bytes as time-sensitive, non-rating fields expire.
    // Reproducibility is enforced by the fully serialized scoped baseline below.
    payloadSha256: CHECK_MODE && existing?.source?.payloadSha256
      ? existing.source.payloadSha256
      : sha256(source.dataText),
    audit
  })
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`

  if (CHECK_MODE) {
    const current = await fs.readFile(OUTPUT_PATH, 'utf8')
    const normalizedCurrent = current.replace(/\r\n?/g, '\n')
    if (normalizedCurrent !== serialized) throw new Error('Frozen baseline snapshot is not reproducible from its pinned source.')
    console.log(`Frozen baseline verified: ${snapshot.freezeId} / publish ${snapshot.source.publishVersion}`)
    return
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, serialized, 'utf8')
  console.log(JSON.stringify({
    output: path.relative(ROOT_DIR, OUTPUT_PATH),
    freezeId: snapshot.freezeId,
    publishVersion: snapshot.source.publishVersion,
    updatedAt: snapshot.source.updatedAt,
    validLogs: snapshot.cleaning.validLogs,
    heroes: snapshot.heroes.length,
    scoringProfiles: snapshot.scoringProfiles.length,
    subroles: snapshot.subroles.length,
    payloadSha256: snapshot.source.payloadSha256
  }, null, 2))
}

await main()
