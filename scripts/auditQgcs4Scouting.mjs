import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getSeasonById } from '../src/config/seasons.js'
import { resolveHeroSubrole } from '../src/lib/heroSubroleSelectors.js'
import { getHeroDisplayName } from '../src/lib/leaderboardSelectors.js'
import { buildRatingBaselinesFromDb } from '../src/lib/ratingBaselines.js'

// Offline research only: never imported by the app or the public-artifact builder.
export const AUDIT_VERSION = 'qgcs4-review-v30.1'
export const SNAPSHOT_TIME = '2026-08-31T07:12:37.725Z'
export const POSITIONS = ['TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT']
export const PRIMARY_GATE = { maps: 12, minutes: 120, matches: 4 }
const METRICS = ['elim', 'ast', 'dth', 'dmg', 'heal', 'block']
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const MODEL_URL = new URL('../src/features/scouting/scoutingReportModel.js', import.meta.url)
const OPPONENT_URL = new URL('../src/features/scouting/scoutingOpponentStrength.js', import.meta.url)
const round = (value, digits = 2) => Number(Number(value).toFixed(digits))
const unique = values => [...new Set(values)]
const hash = value => createHash('sha256').update(value).digest('hex')
const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function totalsOf(log) {
  const t = log.totals || {}
  return { elim: Number(t.elims || 0), ast: Number(t.assists || 0), dth: Number(t.deaths || 0),
    dmg: Number(t.damage || 0), heal: Number(t.healing || 0), block: Number(t.blocked || 0) }
}

export function summarizeEvidence(rows) {
  const minutes = rows.reduce((sum, row) => sum + row.minutes, 0)
  const totals = Object.fromEntries(METRICS.map(metric => [metric, rows.reduce((sum, row) => sum + row.totals[metric], 0)]))
  return {
    maps: unique(rows.map(row => row.mapKey)).length,
    matches: unique(rows.map(row => row.matchId)).length,
    minutes: round(minutes),
    opponents: unique(rows.map(row => row.opponentId)),
    totals,
    per10: Object.fromEntries(METRICS.map(metric => [metric, minutes > 0 ? round(totals[metric] / minutes * 10) : null]))
  }
}

export function prepareSnapshot(source) {
  assert.equal(source?.season?.id, 'QGCS4', 'This audit must not use another event')
  assert.equal(new Set(source.players.map(p => p.player_id)).size, source.players.length, 'Duplicate player IDs')
  const matchesByAlias = new Map()
  const realMaps = new Map()
  const matches = []
  let adminMaps = 0
  let excludedStatMaps = 0
  for (const match of source.matches) {
    const maps = []
    for (const map of match.maps || []) {
      if (map.is_administrative) adminMaps += 1
      if (map.is_administrative || map.rating_eligible === false || !(map.player_stats || []).length) {
        if ((map.player_stats || []).length) excludedStatMaps += 1
        continue
      }
      assert.equal(match.status, 'COMPLETE', 'Unfinished match contains usable observations')
      const key = `${match.match_id}:${map.map_order}`
      assert.ok(!realMaps.has(key), `Duplicate map ${key}`)
      realMaps.set(key, map)
      maps.push(map)
    }
    if (!maps.length) continue
    const clean = { ...match, maps }
    matches.push(clean)
    for (const alias of [match.match_id, match.raw_match_id]) if (alias) matchesByAlias.set(alias, clean)
  }

  const rows = []
  let ignoredDuplicateLiveRows = 0
  let droppedLogs = 0
  const players = source.players.map(player => {
    const sourceLogs = player.match_logs?.length ? player.match_logs : player.live_match_logs || []
    if (player.match_logs?.length) ignoredDuplicateLiveRows += player.live_match_logs?.length || 0
    const logs = []
    const seen = new Set()
    for (const log of sourceLogs) {
      const match = matchesByAlias.get(log.matchId || log.match_id || log.rawMatchId)
      const minutes = Number(log.playtimeMinutes ?? log.raw_time_mins)
      const mapOrder = Number(log.mapOrder ?? log.map_order)
      const mapKey = `${match?.match_id}:${mapOrder}`
      if (!match || !realMaps.has(mapKey) || !Number.isFinite(minutes) || minutes <= 0) {
        droppedLogs += 1
        continue
      }
      const identity = `${player.player_id}:${mapKey}`
      assert.ok(!seen.has(identity), `Repeated player-map observation ${identity}`)
      seen.add(identity)
      const hero = resolveHeroSubrole(log.hero, { role: log.role || player.role })
      assert.ok(hero.known, `Unknown hero cannot silently fall back: ${log.hero}`)
      const teamId = log.teamId || player.team_id
      const aId = match.team_a.id || match.team_a.team_id
      const bId = match.team_b.id || match.team_b.team_id
      assert.ok(teamId === aId || teamId === bId, `Unresolved team for ${identity}`)
      const opponent = teamId === aId ? match.team_b : match.team_a
      const cleanLog = { ...log, matchId: match.match_id, mapOrder }
      logs.push(cleanLog)
      rows.push({ playerId: player.player_id, name: player.display_name || player.nickname, team: player.team_short_name,
        teamId, broadRole: hero.officialRole === 'DAMAGE' ? 'DPS' : hero.officialRole,
        position: hero.resolvedSubrole, hero: hero.canonicalHeroName, minutes, mapKey, mapOrder,
        mapName: log.mapName, mapType: log.mapType, matchId: match.match_id,
        stage: match.stage, scheduledAt: match.scheduled_at,
        opponentId: opponent.id || opponent.team_id, opponent: opponent.short || opponent.name,
        totals: totalsOf(log) })
    }
    return { ...player, match_logs: logs, live_match_logs: [], historical_match_logs: [] }
  })
  // The legacy opponent model reads season_id; supply the correct alias in this copy only.
  const db = { ...source, season: { ...source.season, season_id: 'QGCS4' }, matches, players }
  const statsRows = matches.reduce((sum, m) => sum + m.maps.reduce((n, map) => n + map.player_stats.length, 0), 0)
  assert.equal(rows.length, statsRows, 'Player logs and real map-stat rows disagree')
  return { db, rows, counts: { registered: source.players.length, played: unique(rows.map(r => r.playerId)).length,
    scheduledMatches: source.matches.length, realMatches: matches.length, realMaps: realMaps.size,
    playoffMatches: matches.filter(m => m.stage === 'PLAYOFFS').length, adminMaps, statRows: statsRows,
    ignoredDuplicateLiveRows, droppedLogs, excludedStatMaps } }
}

function replaceOnce(source, pattern, replacement, label) {
  const count = [...source.matchAll(new RegExp(pattern.source, 'g'))].length
  assert.equal(count, 1, `Research adapter anchor changed: ${label}`)
  return source.replace(pattern, replacement)
}

function absoluteImports(source, baseUrl) {
  return source.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, before, path, after) => (
    before + new URL(path, baseUrl).href + after
  ))
}

const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`

export async function loadResearchEngine({ gate = PRIMARY_GATE, subroleGate = { maps: 10, minutes: 100, matches: 4 }, minimumMapMinutes = 3 } = {}) {
  const [reportSource, opponentSource] = await Promise.all([readFile(MODEL_URL, 'utf8'), readFile(OPPONENT_URL, 'utf8')])
  let opponent = absoluteImports(opponentSource, OPPONENT_URL)
  opponent = replaceOnce(opponent, /minimumMapMinutes: 3,/, `minimumMapMinutes: ${minimumMapMinutes},`, 'short-map threshold')
  const opponentUrl = dataModule(opponent)
  let report = absoluteImports(reportSource, MODEL_URL)
  report = replaceOnce(report, /SCOUTING_SAMPLE_GATE = Object\.freeze\(\{[\s\S]*?\}\)/,
    `SCOUTING_SAMPLE_GATE = Object.freeze(${JSON.stringify(gate)})`, 'sample gate')
  report = replaceOnce(report, /SCOUTING_SUBROLE_EVIDENCE_GATE = Object\.freeze\(\{[\s\S]*?\}\)/,
    `SCOUTING_SUBROLE_EVIDENCE_GATE = Object.freeze(${JSON.stringify(subroleGate)})`, 'subrole sample gate')
  assert.ok(report.includes(OPPONENT_URL.href), 'Opponent import changed')
  report = report.replace(OPPONENT_URL.href, opponentUrl)
  const [model, opponentModel] = await Promise.all([import(dataModule(report)), import(opponentUrl)])
  return { model, opponentModel, fingerprint: { report: hash(reportSource), opponent: hash(opponentSource) } }
}

export function evidenceSeparatedDiagnostic(player, weights) {
  const entries = Object.entries(weights).filter(([key]) => key !== 'sampleDepth')
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  return round(entries.reduce((sum, [key, weight]) => sum + player.selection.factors[key] * weight, 0) / totalWeight)
}

function rankWithinPositions(players, score) {
  return Object.fromEntries(POSITIONS.map(position => [position,
    players.filter(p => p.subrole === position).sort((a, b) => score(b) - score(a) || a.playerId.localeCompare(b.playerId))
      .map((p, index) => ({ id: p.playerId, rank: index + 1, score: round(score(p)) }))
  ]))
}

function positionKey(player) { return `${player.playerId}:${player.subrole}` }

function buildCandidateEvidence(player, rows) {
  const broadRows = rows.filter(row => row.playerId === player.playerId && row.broadRole === player.role)
  const scopedRows = broadRows.filter(row => row.position === player.subrole)
  const analyzedRows = scopedRows.filter(row => row.minutes >= 3)
  const modelSignals = player.performanceSignals.opponentStrength
  const clusterScores = new Map(modelSignals.comparisonClusters.map(c => [c.matchId, c.adjustedScore]))
  const heroes = unique(scopedRows.map(row => row.hero)).map(hero => {
    const heroRows = scopedRows.filter(row => row.hero === hero)
    return { hero, label: getHeroDisplayName(hero, 'zh-CN'), ...summarizeEvidence(heroRows) }
  }).sort((a, b) => b.minutes - a.minutes)
  const matches = unique(scopedRows.map(row => row.matchId)).map(matchId => {
    const matchRows = scopedRows.filter(row => row.matchId === matchId)
    return { id: matchId, stage: matchRows[0].stage, scheduledAt: matchRows[0].scheduledAt,
      opponentId: matchRows[0].opponentId, opponent: matchRows[0].opponent,
      heroes: unique(matchRows.map(row => row.hero)), mapsUsed: matchRows.map(row => ({ order: row.mapOrder, map: row.mapName, hero: row.hero })),
      ...summarizeEvidence(matchRows), adjustedScore: clusterScores.get(matchId) ?? null }
  }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  return { id: player.playerId, name: scopedRows[0].name, team: scopedRows[0].team, position: player.subrole,
    broad: summarizeEvidence(broadRows), scoped: summarizeEvidence(scopedRows), analyzed: summarizeEvidence(analyzedRows),
    roleSharePct: round(scopedRows.reduce((s, r) => s + r.minutes, 0) / broadRows.reduce((s, r) => s + r.minutes, 0) * 100, 1),
    heroMeasurement: 'map-recorded hero; full map duration is not exact time spent on this hero',
    heroes, matches,
    phaseMetrics: { group: summarizeEvidence(scopedRows.filter(r => r.stage !== 'PLAYOFFS')),
      playoffs: summarizeEvidence(scopedRows.filter(r => r.stage === 'PLAYOFFS')) },
    model: { score: player.selection.score, rawScore: player.selection.rawScore,
      factors: player.selection.factors, exposurePct: player.subroleEvidence.confidencePct,
      adjustedPerformance: modelSignals.adjustedScore, rawPerformance: modelSignals.rawScore,
      interval90: [modelSignals.performanceEnvelope.rangeLow90, modelSignals.performanceEnvelope.rangeHigh90],
      intervalMethod: modelSignals.performanceEnvelope.intervalMethod,
      evidence: modelSignals.evidenceQuality, matureContextPct: modelSignals.matureContextPct,
      pressure: modelSignals.pressureTest, stages: modelSignals.stageContext,
      stageValidation: player.performanceSignals.stageValidation,
      sensitivity: player.selection.preferenceSensitivity, conditionalRobustness: player.selection.robustness },
    missing: ['nationality', 'battleTag', 'exact hero switch timing', 'VOD review', 'communication', 'shotcalling'] }
}

export function compareCandidateEvidence(a, b) {
  const commonIds = a.scoped.opponents.filter(id => b.scoped.opponents.includes(id))
  const commonHeroes = a.heroes.filter(ha => ha.maps >= 2 && b.heroes.some(hb => hb.hero === ha.hero && hb.maps >= 2))
  return { a: a.id, b: b.id, names: [a.name, b.name], commonOpponents: commonIds.map(id => ({
    id, name: a.matches.find(m => m.opponentId === id)?.opponent,
    aMatches: a.matches.filter(m => m.opponentId === id).map(m => m.id),
    bMatches: b.matches.filter(m => m.opponentId === id).map(m => m.id)
  })), commonHeroes: commonHeroes.map(h => ({ hero: h.hero, label: h.label,
    a: h, b: b.heroes.find(bh => bh.hero === h.hero) })),
    intervalOverlap: Math.max(a.model.interval90[0], b.model.interval90[0]) <= Math.min(a.model.interval90[1], b.model.interval90[1]),
    inference: 'descriptive comparison only; different opponents, maps and teams are not a controlled experiment' }
}

export async function runQgcs4Audit(source, { refit = true, progress = () => {} } = {}) {
  assert.equal(source.meta.ranking_as_of, SNAPSHOT_TIME, 'This review is pinned to QGCS4 V30')
  const { db, rows, counts } = prepareSnapshot(source)
  const baseline = buildRatingBaselinesFromDb(db, { seasonId: 'QGCS4' })
  assert.equal(baseline.seasonId, 'QGCS4')
  assert.ok(!baseline.baselineFrozen, 'Must not inherit the FCR26 frozen baseline')
  const engine = await loadResearchEngine()
  progress('primary-selection')
  const selection = engine.model.buildScoutingSelectionAudit(db, getSeasonById('QGCS4'))
  const candidates = selection.candidates.map(player => buildCandidateEvidence(player, rows))
  for (const player of candidates) {
    const peers = candidates.filter(peer => peer.position === player.position)
    player.scopedMetricRanks = Object.fromEntries(METRICS.map(metric => [metric, {
      rank: 1 + peers.filter(peer => metric === 'dth'
        ? peer.scoped.per10[metric] < player.scoped.per10[metric]
        : peer.scoped.per10[metric] > player.scoped.per10[metric]).length,
      total: peers.length,
      median: round(median(peers.map(peer => peer.scoped.per10[metric])))
    }]))
    const playoff = player.model.stages.playoffs
    const group = player.model.stages.earlier
    player.phaseEvidence = {
      playoffPerformanceHasRepeatedMatches: playoff.matches >= 2 && playoff.maps >= 6,
      groupToPlayoffTrendHasRepeatedMatches: group.matches >= 2 && playoff.matches >= 2,
      currentStageFactorEligible: player.model.stageValidation.eligible,
      groupMatches: group.matches, playoffMatches: playoff.matches,
      note: 'A missing group-to-playoff comparison must not erase observed playoff performance.'
    }
  }
  const primaryRanks = rankWithinPositions(selection.candidates, p => p.selection.score)
  const separatedRanks = rankWithinPositions(selection.candidates, p => evidenceSeparatedDiagnostic(p,
    engine.model.SCOUTING_SUBROLE_SELECTION_WEIGHTS[p.subrole]))
  const contextRanks = rankWithinPositions(selection.candidates, p => p.performanceSignals.opponentStrength.adjustedScore)
  const scenarios = [{ id: 'primary-12-120-4', gate: PRIMARY_GATE, minimumMapMinutes: 3, ranks: primaryRanks }]
  for (const variant of [
    { id: 'gate-14-140-4', gate: { maps: 14, minutes: 140, matches: 4 } },
    { id: 'gate-16-160-4', gate: { maps: 16, minutes: 160, matches: 4 } },
    { id: 'gate-12-120-3-exploratory', gate: { maps: 12, minutes: 120, matches: 3 }, subroleGate: { maps: 10, minutes: 100, matches: 3 } },
    { id: 'include-short-real-maps', gate: PRIMARY_GATE, minimumMapMinutes: 0 }
  ]) {
    progress(variant.id)
    const alternate = await loadResearchEngine(variant)
    const result = alternate.model.buildScoutingSelectionAudit(db, getSeasonById('QGCS4'))
    scenarios.push({ ...variant, minimumMapMinutes: variant.minimumMapMinutes ?? 3,
      ranks: rankWithinPositions(result.candidates, p => p.selection.score) })
  }

  // Refit event baselines and team/context models, not just one factor. The fixed
  // candidate cohort avoids treating a removed-match gate failure as lost skill.
  const refits = []
  if (refit) for (const [index, removed] of db.matches.entries()) {
    if (index % 8 === 0) progress(`full-refit-${index + 1}-of-${db.matches.length}`)
    const foldDb = { ...db, matches: db.matches.filter(m => m.match_id !== removed.match_id),
      players: db.players.map(p => ({ ...p, match_logs: p.match_logs.filter(l => l.matchId !== removed.match_id) })) }
    const fitted = engine.opponentModel.buildScoutingOpponentStrengthModel(foldDb)
    const scored = selection.candidates.map(p => ({ ...p,
      signal: fitted.signalsByPlayerSubrole.get(positionKey(p)) })).filter(p => p.signal?.matches >= 3)
    refits.push({ removedMatch: removed.match_id, stage: removed.stage,
      ranks: rankWithinPositions(scored, p => p.signal.adjustedScore) })
  }
  const comparisons = [['ONW', 'sa'], ['JUBE', '黄昏'], ['小水', '吉赛尔'], ['suna', 'katsuragi'], ['小五', 'slipknot']]
    .map(([a, b]) => compareCandidateEvidence(candidates.find(p => p.name === a), candidates.find(p => p.name === b)))
  return { auditVersion: AUDIT_VERSION, status: 'RESEARCH_NOT_PUBLISHED', source: {
    season: 'QGCS4', publishVersion: 30, rankingAsOf: SNAPSHOT_TIME,
    url: 'https://admin.fries-cup.com/api/public/seasons/QGCS4/publish/30/data',
    parsedBodySha256: hash(JSON.stringify(source)) }, counts,
    methodology: { primaryGate: PRIMARY_GATE, subroleGate: engine.model.SCOUTING_SUBROLE_EVIDENCE_GATE,
      confidenceTarget: engine.model.SCOUTING_SUBROLE_CONFIDENCE_TARGET,
      sourceFingerprint: engine.fingerprint, baseline: 'QGCS4 runtime only',
      strengthsAndEvidenceSeparated: 'diagnostic alternative, not a validated replacement model',
      stageCaveat: 'missing early-stage comparator is not missing playoff performance',
      refitCaveat: '36 deterministic omission scenarios; frequencies are not win/signing probabilities',
      limitations: ['weights not validated on an independent event', 'sparse cross-group links',
        'hero duration inferred from map record', 'no video or coach observation', 'identity fields unconfirmed'] },
    primaryRanks, separatedRanks, contextRanks, scenarios, refits, candidates, comparisons }
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null }
  const sourcePath = resolve(ROOT, getArg('--source') || 'artifacts/qgcs4-scouting-review-v30/source.json')
  const outputArg = getArg('--output')
  const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  const report = await runQgcs4Audit(source, { refit: !args.includes('--skip-refit'),
    progress: phase => process.stderr.write(`QGCS4 audit: ${phase}\n`) })
  if (outputArg) {
    const output = resolve(ROOT, outputArg)
    const scoped = relative(resolve(ROOT, 'artifacts/qgcs4-scouting-review-v30'), output)
    assert.ok(scoped && !scoped.startsWith('..') && !isAbsolute(scoped) && output.endsWith('.json'), 'Output must stay in the audit artifact directory')
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
  }
  console.log(JSON.stringify({ auditVersion: report.auditVersion, counts: report.counts,
    candidateCount: report.candidates.length, candidatesByPosition: Object.fromEntries(POSITIONS.map(role => [role,
      report.candidates.filter(p => p.position === role).length])), scenarios: report.scenarios.length,
    fullRefits: report.refits.length, output: outputArg || null }))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}
