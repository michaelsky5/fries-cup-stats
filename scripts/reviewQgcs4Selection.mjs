import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { prepareSnapshot, summarizeEvidence, loadResearchEngine, SNAPSHOT_TIME } from './auditQgcs4Scouting.mjs'
import { buildScoutingOpponentStrengthModel } from '../src/features/scouting/scoutingOpponentStrength.js'
import { SCOUTING_SUBROLE_SELECTION_WEIGHTS } from '../src/features/scouting/scoutingReportModel.js'
import { getHeroDisplayName } from '../src/lib/leaderboardSelectors.js'
import {
  buildQgcs4Selection, getEffectiveHeroCount, scoreQgcs4Factors,
  QGCS4_POSITIONS, QGCS4_SELECTION_WEIGHTS, QGCS4_SELECTION_VERSION
} from '../src/features/scouting/qgcs4SelectionModel.js'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const ARTIFACT_ROOT = resolve(ROOT, 'artifacts/qgcs4-scouting-review-v30')
const round = (value, digits = 4) => Number(value.toFixed(digits))
const hash = value => createHash('sha256').update(value).digest('hex')
const unique = values => [...new Set(values)]

export function createQgcs4SelectionInput(prepared, reference, model = buildScoutingOpponentStrengthModel(prepared.db), { minimumMapMinutes = 3 } = {}) {
  assert.equal(reference.source.season, 'QGCS4')
  const candidates = reference.candidates.map(candidate => {
    const rows = prepared.rows.filter(row => row.playerId === candidate.id && row.position === candidate.position)
    const signal = model.signalsByPlayerSubrole.get(`${candidate.id}:${candidate.position}`)
    assert.ok(signal, `Missing scoped signal for ${candidate.id}`)
    const heroRecords = unique(rows.map(row => row.hero)).map(hero => {
      const heroRows = rows.filter(row => row.hero === hero)
      return { hero, label: getHeroDisplayName(hero, 'zh-CN'),
        ...summarizeEvidence(heroRows), exactMinutes: heroRows.reduce((sum, row) => sum + row.minutes, 0) }
    }).sort((a, b) => b.exactMinutes - a.exactMinutes)
    const scope = summarizeEvidence(rows)
    const analyzed = summarizeEvidence(rows.filter(row => row.minutes >= minimumMapMinutes))
    const clusters = new Map(signal.comparisonClusters.map(cluster => [cluster.matchId, cluster.adjustedScore]))
    const matches = unique(rows.map(row => row.matchId)).map(id => {
      const matchRows = rows.filter(row => row.matchId === id)
      return { id, opponent: matchRows[0].opponent, opponentId: matchRows[0].opponentId,
        stage: matchRows[0].stage, scheduledAt: matchRows[0].scheduledAt,
        mapsUsed: matchRows.map(row => ({ order: row.mapOrder, map: row.mapName, hero: row.hero })),
        ...summarizeEvidence(matchRows), adjustedScore: clusters.get(id) ?? null }
    }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    const totalMinutes = heroRecords.reduce((sum, hero) => sum + hero.exactMinutes, 0)
    return {
      id: candidate.id, name: candidate.name, team: candidate.team, position: candidate.position,
      scope: { maps: scope.maps, minutes: scope.minutes, matches: scope.matches },
      performance: {
        raw: signal.rawScore, adjusted: signal.adjustedScore,
        floor: signal.performanceEnvelope.floor, variation: signal.scoreVariationPct,
        effectiveHeroes: getEffectiveHeroCount(heroRecords.map(hero => ({ minutes: hero.exactMinutes })))
      },
      stages: { earlier: signal.stageContext.earlier, playoffs: signal.stageContext.playoffs },
      evidence: {
        analyzed: { maps: analyzed.maps, minutes: analyzed.minutes, matches: analyzed.matches },
        contextInterval90: [signal.performanceEnvelope.rangeLow90, signal.performanceEnvelope.rangeHigh90],
        contextEstimate: signal.adjustedScore,
        contextIntervalMeaning: 'conditional uncertainty of adjusted performance; not uncertainty of the selection index',
        mainHeroSharePct: Math.round(heroRecords[0].exactMinutes / totalMinutes * 100),
        heroMeasurement: 'recorded hero and whole map duration; exact hero-switch timing unavailable',
        opponentCount: scope.opponents.length, matureContextPct: signal.matureContextPct,
        pressure: signal.pressureTest
      },
      metrics: scope.per10,
      heroes: heroRecords.map(({ exactMinutes, ...hero }) => ({ ...hero, unroundedMinutes: exactMinutes })),
      matches
    }
  })
  return { source: reference.source, referenceIds: reference.candidates.map(candidate => candidate.id), candidates }
}

function rankWithWeights(report, weightsByPosition) {
  return Object.fromEntries(QGCS4_POSITIONS.map(position => [position,
    report.rankings[position].map(candidate => ({ id: candidate.id,
      score: scoreQgcs4Factors(position, candidate.factors, weightsByPosition[position]) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .map((candidate, index) => ({ id: candidate.id, rank: index + 1, score: round(candidate.score, 1) }))
  ]))
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
}

export function weightSensitivity(report, trials = 5000) {
  assert.ok(Number.isInteger(trials) && trials > 0, 'Sensitivity trials must be a positive integer')
  const results = []
  for (const [positionIndex, position] of QGCS4_POSITIONS.entries()) {
    const random = seededRandom(20260831 + positionIndex)
    const rows = report.rankings[position]
    const counts = new Map(rows.map(candidate => [candidate.id, { id: candidate.id, selectedTrials: 0, firstTrials: 0,
      minRank: rows.length, maxRank: 1 }]))
    for (let trial = 0; trial < trials; trial += 1) {
      const entries = Object.entries(QGCS4_SELECTION_WEIGHTS[position]).map(([key, value]) => [key, value * (0.7 + random() * 0.6)])
      const sum = entries.reduce((total, [, value]) => total + value, 0)
      const weights = Object.fromEntries(entries.map(([key, value]) => [key, value / sum]))
      const ranked = rows.map(candidate => ({ id: candidate.id, score: scoreQgcs4Factors(position, candidate.factors, weights) }))
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      for (let start = 0; start < ranked.length;) {
        let end = start + 1
        while (end < ranked.length && Math.abs(ranked[end].score - ranked[start].score) < 1e-9) end += 1
        const size = end - start
        const selectedShare = Math.max(0, Math.min(end, 4) - start) / size
        for (let index = start; index < end; index += 1) {
          const count = counts.get(ranked[index].id)
          count.selectedTrials += selectedShare
          count.firstTrials += start === 0 ? 1 / size : 0
          count.minRank = Math.min(count.minRank, start + 1)
          count.maxRank = Math.max(count.maxRank, end)
        }
        start = end
      }
    }
    results.push(...counts.values())
  }
  return { trials, relativeWeightVariation: 0.3, seed: 20260831, tieHandling: 'fractional credit across exact ties',
    interpretation: 'conditional frequency under one fixed model and cohort; not validation or a success probability',
    candidates: results.map(row => ({ ...row, selectedTrials: round(row.selectedTrials), firstTrials: round(row.firstTrials) })) }
}

function buildScoreTrace(report, reference) {
  const oldById = new Map(reference.candidates.map(candidate => [candidate.id, candidate]))
  return report.candidates.map(candidate => {
    const old = oldById.get(candidate.id)
    const oldSixFactorScore = scoreQgcs4Factors(candidate.position, Object.fromEntries(
      Object.keys(QGCS4_SELECTION_WEIGHTS[candidate.position]).map(key => [key, old.model.factors[key]])
    ))
    const withoutSampleBonus = round(50 + (oldSixFactorScore - 50) * old.model.exposurePct / 100, 1)
    const withoutOuterShrink = round(oldSixFactorScore, 1)
    // Preserve the legacy multiplication/summation order at decimal rounding
    // boundaries rather than reconstructing it from normalized ratios.
    const reconstructedRaw = round(Object.entries(SCOUTING_SUBROLE_SELECTION_WEIGHTS[candidate.position])
      .reduce((sum, [key, weight]) => sum + old.model.factors[key] * weight, 0), 1)
    const reconstructed = round(50 + (reconstructedRaw - 50) * old.model.exposurePct / 100, 1)
    assert.equal(reconstructed, old.model.score, `Legacy score trace mismatch for ${candidate.id}`)
    // Verify that the new input path has not silently changed other factors.
    for (const key of Object.keys(candidate.factors).filter(key => key !== 'stageValidation')) {
      assert.equal(candidate.factors[key], old.model.factors[key], `Unexpected ${key} drift for ${candidate.id}`)
    }
    return { id: candidate.id, oldScore: old.model.score, withoutSampleBonus,
      withoutOuterShrink, rebuiltStage: candidate.score,
      changes: { removeSampleBonus: round(withoutSampleBonus - old.model.score, 1),
        removeOuterShrink: round(withoutOuterShrink - withoutSampleBonus, 1),
        rebuildStage: round(candidate.score - withoutOuterShrink, 1) },
      oldStageFactor: old.model.factors.stageValidation, newStageFactor: candidate.factors.stageValidation }
  })
}

async function collectFingerprints() {
  const visited = new Map()
  async function visit(url) {
    const path = fileURLToPath(url)
    const key = relative(ROOT, path).replaceAll('\\', '/')
    if (visited.has(key)) return
    assert.ok(!key.startsWith('..') && !isAbsolute(key), 'Fingerprint path must stay inside the repository')
    const source = await readFile(url, 'utf8')
    // Git checkout line endings must not change the frozen source identity.
    visited.set(key, hash(source.replace(/\r\n/g, '\n')))
    if (!/\.(?:m?js|jsx)$/.test(path)) return
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
      const dependency = new URL(match[1], url)
      if (/\.(?:m?js|jsx|json)$/.test(dependency.pathname)) await visit(dependency)
    }
  }
  for (const path of [
    '../src/features/scouting/qgcs4SelectionModel.js', '../src/features/scouting/scoutingReportModel.js',
    '../src/features/scouting/scoutingOpponentStrength.js', './auditQgcs4Scouting.mjs', './reviewQgcs4Selection.mjs'
  ]) await visit(new URL(path, import.meta.url))
  return Object.fromEntries([...visited].sort(([a], [b]) => a.localeCompare(b)))
}

export async function reviewQgcs4Selection(source, reference, { refit = true, trials = 5000, progress = () => {} } = {}) {
  assert.equal(source.season.id, 'QGCS4')
  assert.equal(source.meta.ranking_as_of, SNAPSHOT_TIME)
  assert.equal(reference.source.parsedBodySha256, hash(JSON.stringify(source)), 'Frozen source does not match the previous review')
  const prepared = prepareSnapshot(source)
  const input = createQgcs4SelectionInput(prepared, reference)
  const report = buildQgcs4Selection(input)
  const trace = buildScoreTrace(report, reference)
  const sensitivity = weightSensitivity(report, trials)
  const factorOmissions = Object.keys(QGCS4_SELECTION_WEIGHTS.TANK).map(omitted => {
    const weights = Object.fromEntries(QGCS4_POSITIONS.map(position => {
      const source = QGCS4_SELECTION_WEIGHTS[position]
      const sum = 1 - source[omitted]
      return [position, Object.fromEntries(Object.entries(source).map(([key, value]) => [key, key === omitted ? 0 : value / sum]))]
    }))
    return { omitted, ranks: rankWithWeights(report, weights) }
  })
  const refits = []
  if (refit) for (const [index, match] of prepared.db.matches.entries()) {
    if (index % 6 === 0) progress(`selection-refit-${index + 1}-of-${prepared.db.matches.length}`)
    const fold = {
      db: { ...prepared.db, matches: prepared.db.matches.filter(row => row.match_id !== match.match_id),
        players: prepared.db.players.map(player => ({ ...player,
          match_logs: player.match_logs.filter(log => log.matchId !== match.match_id) })) },
      rows: prepared.rows.filter(row => row.matchId !== match.match_id)
    }
    // Rebuild all six factors after event/team/context refitting. Neither old
    // factor values nor the removed match's hero records are reused here.
    const result = buildQgcs4Selection(createQgcs4SelectionInput(fold, reference))
    refits.push({ removedMatch: match.match_id,
      ranks: Object.fromEntries(QGCS4_POSITIONS.map(position => [position, result.rankings[position].map(candidate => ({
        id: candidate.id, rank: candidate.rankInPool, score: candidate.score,
        exactScore: candidate.exactScore, sharedRank: candidate.sharedRankInPool,
        boundaryTie: candidate.exactTieCrossesShortlistBoundary,
        factors: candidate.factors, playoffEligible: candidate.evidence.stage.playoff.eligible,
        changeEligible: candidate.evidence.stage.change.eligible
      }))])) })
  }
  const alternate = await loadResearchEngine({ minimumMapMinutes: 0 })
  const alternateModel = alternate.opponentModel.buildScoutingOpponentStrengthModel(prepared.db)
  const shortMaps = buildQgcs4Selection(createQgcs4SelectionInput(prepared, reference, alternateModel, { minimumMapMinutes: 0 }))
  const previousIds = Object.values(reference.primaryRanks).flatMap(position => position.slice(0, 4)).map(candidate => candidate.id)
  const stability = report.candidates.map(candidate => {
    const folds = refits.map(fold => fold.ranks[candidate.position].find(row => row.id === candidate.id))
    return { id: candidate.id, fullRefits: folds.length,
      // Separate strict retention from a tie straddling the fourth slot. IDs
      // may order the display, but must not decide the evidence assessment.
      selectedRefits: folds.filter(row => row.rank <= 4 && !row.boundaryTie).length,
      boundaryTieRefits: folds.filter(row => row.boundaryTie).length,
      possibleSelectedRefits: folds.filter(row => row.rank <= 4 || row.boundaryTie).length,
      minRank: folds.length ? Math.min(...folds.map(row => row.sharedRank)) : null,
      maxRank: folds.length ? Math.max(...folds.map(row => row.boundaryTie ? Math.max(5, row.rank) : row.rank)) : null,
      minScore: folds.length ? Math.min(...folds.map(row => row.score)) : null,
      maxScore: folds.length ? Math.max(...folds.map(row => row.score)) : null }
  })
  return {
    ...report, auditRevision: 3, input, trace,
    changes: { entered: report.shortlistIds.filter(id => !previousIds.includes(id)),
      exited: previousIds.filter(id => !report.shortlistIds.includes(id)) },
    verification: { weightSensitivity: sensitivity, factorOmissions, fullSelectionRefits: refits, stability,
      includeShortRealMaps: { shortlistIds: shortMaps.shortlistIds, changed: report.shortlistIds.filter(id => !shortMaps.shortlistIds.includes(id)) },
      interpretation: 'sensitivity checks, not an independent-event predictive backtest' },
    reproducibility: { node: process.version, sourceFingerprints: await collectFingerprints() }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const outputIndex = args.indexOf('--output')
  const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : null
  assert.ok(outputIndex < 0 || outputArg, '--output needs a file name')
  const source = JSON.parse(await readFile(resolve(ARTIFACT_ROOT, 'source.json'), 'utf8'))
  const reference = JSON.parse(await readFile(resolve(ARTIFACT_ROOT, 'audit-v1.json'), 'utf8'))
  const report = await reviewQgcs4Selection(source, reference, { refit: !args.includes('--skip-refit'),
    progress: message => process.stderr.write(`${message}\n`) })
  if (outputArg) {
    const path = resolve(ROOT, outputArg)
    const scoped = relative(ARTIFACT_ROOT, path)
    assert.ok(scoped && !scoped.startsWith('..') && !isAbsolute(scoped) && path.endsWith('.json'), 'Output must stay in the review artifact directory')
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
  }
  const identify = ids => ids.map(id => { const candidate = report.candidates.find(row => row.id === id); return `${candidate.name} (${candidate.team})` })
  console.log(JSON.stringify({ modelVersion: QGCS4_SELECTION_VERSION, candidates: report.referenceCount,
    shortlist: Object.fromEntries(QGCS4_POSITIONS.map(position => [position, report.rankings[position].filter(row => row.selected)
      .map(candidate => ({ name: candidate.name, team: candidate.team, score: candidate.score }))])),
    entered: identify(report.changes.entered), exited: identify(report.changes.exited),
    fullSelectionRefits: report.verification.fullSelectionRefits.length, output: outputArg }, null, 2))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}
