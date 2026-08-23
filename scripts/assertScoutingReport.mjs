import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { getSeasonById } from '../src/config/seasons.js'
import {
  SCOUTING_CORE_SUBROLE_SLOT_PLAN,
  SCOUTING_DECISION_PROFILE,
  SCOUTING_DEPLOYMENT_WEIGHTS,
  SCOUTING_MODEL_VERSION,
  SCOUTING_PAIRWISE_BOOTSTRAP,
  SCOUTING_PLAYER_NATIONALITIES,
  SCOUTING_PREFERENCE_SENSITIVITY,
  SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN,
  SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS,
  SCOUTING_SAMPLE_GATE,
  SCOUTING_SELECTION_WEIGHTS,
  SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS,
  SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS,
  SCOUTING_SUBROLE_SELECTION_WEIGHTS,
  SCOUTING_SUBROLE_CONFIDENCE_TARGET,
  SCOUTING_SUBROLE_EVIDENCE_GATE,
  SCOUTING_SUBROLE_SLOT_PLAN,
  SCOUTING_V1_SELECTED_PLAYERS,
  buildScoutingReportModel,
  buildScoutingSelectionAudit
} from '../src/features/scouting/scoutingReportModel.js'
import { getScoutingAnalystNote } from '../src/features/scouting/scoutingAnalystNotes.js'
import { SCOUTING_PRO_REFERENCE_VERSION } from '../src/features/scouting/scoutingProfessionalReference.js'
import {
  SCOUTING_ARTIFACT_SCHEMA_VERSION,
  SCOUTING_REPORT_VERSION,
  createScoutingArtifacts
} from '../src/features/scouting/scoutingArtifactModel.js'

const dataPath = new URL('../public/data/fcr2026_local_public.json', import.meta.url)
const db = JSON.parse(await readFile(dataPath, 'utf8'))
const season = getSeasonById('FCR26')
const report = buildScoutingReportModel(db, season)
const selectionAudit = buildScoutingSelectionAudit(db, season)
const artifacts = createScoutingArtifacts(report, db.meta)

assert.equal(report.modelVersion, SCOUTING_MODEL_VERSION)
assert.deepEqual(report.sampleGate, SCOUTING_SAMPLE_GATE)
assert.deepEqual(report.subroleEvidenceGate, SCOUTING_SUBROLE_EVIDENCE_GATE)
assert.deepEqual(report.subroleConfidenceTarget, SCOUTING_SUBROLE_CONFIDENCE_TARGET)
assert.equal(report.qualifiedPool.length, 34)
assert.equal(selectionAudit.candidates.length, 34)
assert.equal(report.selectedCount, 25)
assert.equal(report.targetCount, 25)
assert.equal(report.coreTargetCount, 20)
assert.equal(report.priorityCount, 15)
assert.equal(report.extendedCount, 5)
assert.equal(report.watchCount, 5)
assert.equal(report.watchTargetCount, 5)
assert.equal(report.priorityTargetCount, 15)
assert.equal(SCOUTING_SELECTION_WEIGHTS.performance, 0.25)
assert.equal(SCOUTING_SELECTION_WEIGHTS.opponentAdjusted, 0.2)
assert.equal(SCOUTING_SELECTION_WEIGHTS.stageValidation, 0.1)
assert.equal(SCOUTING_DEPLOYMENT_WEIGHTS.baselineReliability.floor, 0.6)
assert.equal(SCOUTING_DEPLOYMENT_WEIGHTS.pressureReadiness.strongOpponent, 0.55)
assert.equal(SCOUTING_DEPLOYMENT_WEIGHTS.contextPortability.heroBreadth, 0.45)
assert.deepEqual(Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS), [
  'BALANCED', 'RELIABLE_CORE', 'PRESSURE_MATCH', 'FLEXIBLE_POOL'
])
assert.ok(Object.values(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS).every(weights => (
  Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < Number.EPSILON
)))
assert.equal(SCOUTING_PREFERENCE_SENSITIVITY.trials, 5000)
assert.equal(SCOUTING_PREFERENCE_SENSITIVITY.weightVariationPct, 30)
assert.equal(SCOUTING_PAIRWISE_BOOTSTRAP.trials, 5000)
assert.equal(SCOUTING_PAIRWISE_BOOTSTRAP.minimumMatches, 3)
assert.deepEqual(SCOUTING_DECISION_PROFILE.axisIds, [
  'adjustedPerformance',
  'competitiveFloor',
  'consistency',
  'pressureReadiness',
  'contextPortability'
])
assert.deepEqual(Object.keys(SCOUTING_SUBROLE_SELECTION_WEIGHTS), [
  'TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT'
])
assert.ok(Object.values(SCOUTING_SUBROLE_SELECTION_WEIGHTS).every(weights => (
  Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9
)))
assert.ok(Object.values(SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS).every(profile => (
  Object.values(profile).every(weights => Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9)
)))
assert.ok(Object.values(SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS).every(profile => (
  Object.values(profile).every(weights => Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9)
)))

assert.equal(selectionAudit.opponentStrength.observationCount, 2850)
assert.equal(selectionAudit.opponentStrength.eligibleMatchCount, 113)
assert.deepEqual(Object.keys(selectionAudit.opponentStrength.subroleModels), [
  'TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT'
])
assert.ok(Object.values(selectionAudit.opponentStrength.subroleModels).every(model => (
  model.observations > 0 &&
  model.completeLineupObservations > 0 &&
  model.heroContexts > 0 &&
  model.lineupAnchorContexts > 0 &&
  model.partnerContexts > 0 &&
  Number.isFinite(model.opponentCoefficientPer100) &&
  Number.isFinite(model.ownTeamCoefficientPer100)
)))

assert.equal(SCOUTING_ARTIFACT_SCHEMA_VERSION, 'scouting-report-v2')
assert.equal(SCOUTING_REPORT_VERSION, 'FCR26 Scouting v2.3')
assert.equal(artifacts.index.meta.modelVersion, SCOUTING_MODEL_VERSION)
assert.ok(Buffer.byteLength(JSON.stringify(artifacts.index)) < 180_000)
assert.equal(Object.keys(artifacts.details).length, 25)
assert.ok(Object.values(artifacts.details).every(detail => Buffer.byteLength(JSON.stringify(detail)) < 23_000))
assert.equal(report.pairwiseComparisons.length, 50)
assert.equal(artifacts.index.pairwiseBootstrap.trials, 5000)
assert.equal(artifacts.index.pairwiseBootstrap.comparisons.length, 50)
assert.equal(report.validationAudit.verdict, 'HOLD_WEIGHTS')
assert.equal(report.validationAudit.rankingImpact, false)
assert.equal(report.validationAudit.temporal.eligiblePlayers, 34)
assert.equal(report.validationAudit.temporal.averageTopThreeRetentionPct, 40)
assert.equal(report.validationAudit.temporal.status, 'REVIEW')
assert.equal(report.validationAudit.pairwise.comparisons, 50)
assert.equal(report.validationAudit.pairwise.concordancePct, 74)
assert.equal(report.validationAudit.pairwise.status, 'ALIGNED')
assert.equal(
  report.validationAudit.pairwise.subroles.find(item => item.subrole === 'MAIN_SUPPORT')?.concordancePct,
  60
)
assert.equal(report.validationAudit.teamContribution.status, 'SHADOW_ONLY')
assert.equal(report.validationAudit.teamContribution.externalShapeReferenceAvailable, true)
assert.equal(report.validationAudit.teamContribution.externalShapeReference.version, SCOUTING_PRO_REFERENCE_VERSION)
assert.equal(report.validationAudit.teamContribution.externalShapeReference.strengthEquivalent, false)
assert.equal(report.validationAudit.teamContribution.externalReplicationAvailable, false)
assert.equal(report.validationAudit.teamContribution.externalReplicationReason, 'NO_CROSS_TIER_CALIBRATION_BRIDGE')
assert.equal(report.validationAudit.promotionGate.passed, false)
assert.deepEqual(artifacts.index.validationAudit, report.validationAudit)
assert.equal(report.professionalReference.version, SCOUTING_PRO_REFERENCE_VERSION)
assert.equal(report.professionalReference.status, 'SHADOW_ONLY')
assert.equal(report.professionalReference.rankingImpact, false)
assert.equal(report.professionalReference.strengthEquivalent, false)
assert.equal(report.professionalReference.crossTierCalibration, 'UNAVAILABLE')
assert.deepEqual(artifacts.index.professionalReference, report.professionalReference)
assert.ok(report.pairwiseComparisons.every(comparison => (
  comparison.playerAWinProbabilityPct >= 0 &&
  comparison.playerAWinProbabilityPct <= 100 &&
  comparison.deltaLow90 <= comparison.deltaHigh90
)))
assert.ok(artifacts.index.players.every(player => !Object.hasOwn(player.identity, 'battleTag')))
assert.ok(Object.values(artifacts.details).every(player => Object.hasOwn(player.identity, 'battleTag')))
const detailBattleTags = Object.values(artifacts.details).map(player => player.identity.battleTag)
assert.ok(detailBattleTags.every(battleTag => typeof battleTag === 'string' && battleTag.trim().length > 0))
assert.equal(new Set(detailBattleTags).size, detailBattleTags.length)
assert.ok(Object.values(artifacts.details).every(player => (
  player.performanceSignals.professionalReference?.version === SCOUTING_PRO_REFERENCE_VERSION &&
  player.performanceSignals.professionalReference?.status === 'SHADOW_ONLY' &&
  player.performanceSignals.professionalReference?.rankingImpact === false &&
  player.performanceSignals.professionalReference?.strengthEquivalent === false &&
  player.performanceSignals.professionalReference?.metrics?.length >= 4
)))
assert.ok(artifacts.index.players.every(player => {
  const signals = player.performanceSignals.opponentStrength
  return Number.isFinite(signals.rawScore) &&
    Number.isFinite(signals.adjustedScore) &&
    Number.isFinite(signals.adjustment) &&
    Number.isFinite(signals.performanceEnvelope?.rangeLow90) &&
    Number.isFinite(signals.performanceEnvelope?.rangeHigh90)
}))
assert.ok(artifacts.index.players.every(player => {
  const playbook = player.performanceSignals.opponentStrength?.deploymentPlaybook
  return playbook?.primaryUse?.hero &&
    playbook.primaryUse?.mapType &&
    playbook.primaryUse?.confidencePct >= 45
}))
assert.ok(artifacts.index.players.every(player => (
  Object.keys(player.identity).sort().join(',') === [
    'displayName', 'initials', 'nationality', 'playerId', 'registeredRole', 'teamFull', 'teamRouteId', 'teamShort'
  ].sort().join(',')
)))
assert.ok(Object.values(artifacts.details).every(player => (
  Object.keys(player.identity).sort().join(',') === [
    'battleTag', 'displayName', 'initials', 'nationality', 'playerId', 'registeredRole', 'teamFull', 'teamRouteId', 'teamShort'
  ].sort().join(',')
)))
assert.ok(artifacts.index.qualifiedPool
  .filter(player => !player.selected)
  .every(player => !Object.hasOwn(player, 'playerId') && !Object.hasOwn(player, 'name') && !Object.hasOwn(player, 'team')))
assert.ok(Object.values(artifacts.details).every(player => player.recentMatches.every(match => !Object.hasOwn(match, 'match'))))

const roleCounts = report.qualifiedPool.reduce((counts, player) => {
  counts[player.role] = (counts[player.role] || 0) + 1
  return counts
}, {})
assert.deepEqual(roleCounts, { TANK: 6, DPS: 14, SUPPORT: 14 })

const subrolePoolCounts = report.qualifiedPool.reduce((counts, player) => {
  counts[player.subrole] = (counts[player.subrole] || 0) + 1
  return counts
}, {})
assert.deepEqual(subrolePoolCounts, {
  TANK: 6,
  HITSCAN: 6,
  FLEX_DPS: 8,
  MAIN_SUPPORT: 8,
  FLEX_SUPPORT: 6
})

const selectedSubroleCounts = report.players.reduce((counts, player) => {
  counts[player.subrole] = (counts[player.subrole] || 0) + 1
  return counts
}, {})
assert.deepEqual(selectedSubroleCounts, SCOUTING_SUBROLE_SLOT_PLAN)
assert.deepEqual(report.priorityPlayers.reduce((counts, player) => {
  counts[player.subrole] = (counts[player.subrole] || 0) + 1
  return counts
}, {}), SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN)
assert.deepEqual(Object.fromEntries(Object.keys(SCOUTING_CORE_SUBROLE_SLOT_PLAN).map(subrole => [
  subrole,
  report.players.filter(player => player.subrole === subrole && player.highSampleSubroleRank <= 4).length
])), SCOUTING_CORE_SUBROLE_SLOT_PLAN)
assert.ok(report.extendedPlayers.every(player => player.highSampleSubroleRank === 4))
assert.ok(report.watchPlayers.every(player => player.highSampleSubroleRank === 5))

const modelSelectedIds = selectionAudit.candidates
  .filter(player => player.selection.selectedByModel)
  .map(player => player.playerId)
  .sort()
assert.deepEqual(report.players.map(player => player.playerId).sort(), modelSelectedIds)

const previousSelectedIds = new Set(SCOUTING_V1_SELECTED_PLAYERS.map(player => player.playerId))
const currentSelectedIds = new Set(report.players.map(player => player.playerId))
const retainedFromV1 = [...currentSelectedIds].filter(playerId => previousSelectedIds.has(playerId))
const addedInV2 = [...currentSelectedIds].filter(playerId => !previousSelectedIds.has(playerId))
const removedFromV1 = [...previousSelectedIds].filter(playerId => !currentSelectedIds.has(playerId))
assert.equal(retainedFromV1.length, 19)
assert.equal(addedInV2.length, 6)
assert.deepEqual(removedFromV1, ['FCR26-P0117'])

for (const player of report.players) {
  const poolEntry = report.qualifiedPool.find(candidate => candidate.playerId === player.playerId)
  const opponent = player.performanceSignals.opponentStrength
  const evidence = player.subroleEvidence

  assert.ok(
    Object.hasOwn(SCOUTING_PLAYER_NATIONALITIES, player.playerId),
    `${player.playerId} must have an explicit nationality`
  )
  assert.ok(poolEntry, `${player.playerId} must be part of the high-sample pool`)
  assert.ok(poolEntry.maps >= SCOUTING_SAMPLE_GATE.maps)
  assert.ok(poolEntry.minutes >= SCOUTING_SAMPLE_GATE.minutes)
  assert.ok(poolEntry.matches >= SCOUTING_SAMPLE_GATE.matches)
  assert.ok(evidence.maps >= SCOUTING_SUBROLE_EVIDENCE_GATE.maps)
  assert.ok(evidence.minutes >= SCOUTING_SUBROLE_EVIDENCE_GATE.minutes)
  assert.ok(evidence.matches >= SCOUTING_SUBROLE_EVIDENCE_GATE.matches)
  assert.ok(evidence.confidencePct >= 1 && evidence.confidencePct <= 100)
  assert.ok(['FULL', 'PARTIAL'].includes(evidence.grade))
  assert.equal(opponent.subrole, player.subrole)
  assert.equal(opponent.maps, evidence.maps)
  assert.equal(opponent.minutes, evidence.minutes)
  assert.equal(opponent.matches, evidence.matches)
  assert.equal(player.subroleProfile.primary, player.subrole)
  assert.equal(player.subroleProfile.knownSharePct, 100)
  assert.ok(player.subroleProfile.primarySharePct >= 50)
  assert.ok(player.selection.score > 0)
  assert.ok(player.selection.rawScore > 0)
  assert.equal(player.selection.subroleConfidencePct, evidence.confidencePct)
  assert.equal(
    player.selection.score,
    Number((50 + ((player.selection.rawScore - 50) * (evidence.confidencePct / 100))).toFixed(1))
  )
  assert.ok(player.highSampleRoleRank >= 1 && player.highSampleRoleRank <= player.highSampleRoleTotal)
  assert.ok(player.highSampleSubroleRank >= 1 && player.highSampleSubroleRank <= player.highSampleSubroleTotal)
  assert.equal(
    player.tier,
    player.highSampleSubroleRank <= 3 ? 'PRIORITY' : player.highSampleSubroleRank === 4 ? 'EXTENDED' : 'WATCH'
  )
  assert.equal(player.selection.preferenceSensitivity.trials, 5000)
  assert.equal(player.selection.preferenceSensitivity.weightVariationPct, 30)
  assert.equal(player.selection.preferenceSensitivity.weightProfile, player.subrole)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top1Pct >= 0)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top1Pct <= 100)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top3Pct >= 0)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top3Pct <= 100)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top5Pct >= 0)
  assert.ok(player.selection.preferenceSensitivity.rankProbability.top5Pct <= 100)
  assert.ok(player.selection.preferenceSensitivity.relevantPct >= 0)
  assert.ok(player.selection.preferenceSensitivity.relevantPct <= 100)
  assert.ok(['STABLE', 'WATCH', 'BOUNDARY'].includes(player.selection.preferenceSensitivity.status))
  if (player.tier === 'WATCH') assert.equal(player.selection.preferenceSensitivity.target, 'CORE_ENTRY')
  assert.ok(['STABLE', 'SENSITIVE', 'FRAGILE'].includes(player.selection.robustness.status))
  assert.equal(player.selection.robustness.baseRank, player.highSampleSubroleRank)
  assert.ok(player.selection.robustness.removeWeakestOpponent.rank >= 1)
  assert.ok(player.selection.robustness.leaveOneMatchOut.rank >= 1)
  assert.ok(Number.isFinite(player.selection.robustness.removeWeakestOpponent.score))
  assert.ok(Number.isFinite(player.selection.robustness.leaveOneMatchOut.score))
  assert.ok(player.selection.robustness.leaveOneMatchOut.trials >= 2)
  assert.ok(player.strengths.length >= 1)
  assert.ok(player.strengths.every(strength => (
    strength.benchmarkScope === 'subrole' &&
    strength.subroleRank >= 1 &&
    strength.subroleRank <= strength.subroleTotal
  )))
  assert.ok(player.risks.length >= 1)
  assert.equal(player.trend.metricId, 'impact')
  assert.equal(player.trend.rows.length, 10)
  assert.ok(player.performanceSignals.consistency.percentile >= 1)
  assert.ok(player.performanceSignals.consistency.percentile <= 100)
  assert.equal(player.performanceSignals.form.recentMaps, 5)
  assert.equal(player.performanceSignals.form.previousMaps, 5)
  assert.ok(player.performanceSignals.heroPool.effectiveHeroes > 0)
  assert.ok(opponent.rawPercentile >= 1 && opponent.rawPercentile <= 100)
  assert.ok(opponent.adjustedPercentile >= 1 && opponent.adjustedPercentile <= 100)
  assert.equal(opponent.heroLineupContext?.method, 'shrunken-hero-lineup-neutralization-v1')
  assert.ok(opponent.heroLineupContext?.coveragePct >= 0 && opponent.heroLineupContext?.coveragePct <= 100)
  assert.ok(opponent.heroLineupContext?.completeMaps >= 1)
  assert.ok(opponent.heroLineupContext?.ownHeroContexts >= 1)
  assert.ok(opponent.heroLineupContext?.lineupAnchorContexts >= 1)
  assert.ok(opponent.heroLineupContext?.partnerContexts >= 1)
  assert.ok(Number.isFinite(opponent.heroLineupContext?.heroNeutralScore))
  assert.ok(Number.isFinite(opponent.heroLineupContext?.lineupNeutralScore))
  assert.ok(Number.isFinite(opponent.heroLineupContext?.combinedAdjustment))
  assert.ok(Number.isFinite(opponent.heroLineupContext?.appliedAdjustment))
  assert.equal(opponent.heroLineupContext?.appliedWeightPct, 10)
  assert.equal(opponent.teamContribution?.method, 'same-map-team-share-shadow-v1')
  assert.equal(opponent.teamContribution?.rankingImpact, false)
  assert.ok(opponent.teamContribution?.coveragePct >= 0 && opponent.teamContribution?.coveragePct <= 100)
  assert.ok(Object.values(opponent.teamContribution?.metrics || {}).every(metric => (
    metric.sharePct === null || (metric.sharePct >= 0 && metric.sharePct <= 100)
  )))
  assert.equal(opponent.deploymentPlaybook?.method, 'shrunk-context-fit-v1')
  assert.equal(opponent.deploymentPlaybook?.caveat, 'same-map-association-not-causal')
  assert.ok(opponent.deploymentPlaybook?.eligibleHeroMapCells >= 1)
  assert.ok(opponent.deploymentPlaybook?.coveragePct >= 0 && opponent.deploymentPlaybook?.coveragePct <= 100)
  assert.ok(opponent.deploymentPlaybook?.heroMapCells.every(cell => (
    cell.eligible &&
    cell.maps >= opponent.deploymentPlaybook.sampleGate.heroMap.minMaps &&
    cell.matches >= opponent.deploymentPlaybook.sampleGate.heroMap.minMatches &&
    cell.minutes >= opponent.deploymentPlaybook.sampleGate.heroMap.minMinutes &&
    cell.confidencePct >= opponent.deploymentPlaybook.sampleGate.heroMap.minConfidencePct &&
    ['PRIMARY', 'STABLE', 'CONDITIONAL'].includes(cell.status)
  )))
  assert.ok(opponent.deploymentPlaybook?.recommendations.primaryUse)
  assert.ok(opponent.performanceEnvelope)
  assert.ok(opponent.performanceEnvelope.floorPercentile >= 1)
  assert.ok(opponent.performanceEnvelope.typicalPercentile >= 1)
  assert.ok(opponent.performanceEnvelope.ceilingPercentile >= 1)
  assert.ok(opponent.performanceEnvelope.rangeLow90 < opponent.performanceEnvelope.rangeHigh90)
  assert.ok(['MATCH_CLUSTERED', 'MAP_FALLBACK'].includes(opponent.performanceEnvelope.intervalMethod))
  assert.ok(opponent.performanceEnvelope.effectiveMatches >= 1)
  assert.ok(['A', 'B', 'C'].includes(opponent.evidenceQuality?.grade))
  assert.equal(opponent.evidenceQuality?.subroleExposurePct, evidence.confidencePct)
  assert.ok(player.performanceSignals.stageValidation.percentile >= 1)
  assert.ok(player.performanceSignals.stageValidation.percentile <= 100)
  assert.ok(player.performanceSignals.deploymentProfile.baselineReliability >= 1)
  assert.ok(player.performanceSignals.deploymentProfile.pressureReadiness >= 1)
  assert.ok(player.performanceSignals.deploymentProfile.contextPortability >= 1)
  assert.equal(player.performanceSignals.decisionProfile.method, SCOUTING_DECISION_PROFILE.method)
  assert.equal(player.performanceSignals.decisionProfile.scale, SCOUTING_DECISION_PROFILE.scale)
  assert.equal(player.performanceSignals.decisionProfile.benchmark, 50)
  assert.equal(player.performanceSignals.decisionProfile.weightProfile, player.subrole)
  assert.equal(player.performanceSignals.decisionProfile.roleComparisonOnly, true)
  assert.equal(player.performanceSignals.decisionProfile.axes.length, 5)
  assert.deepEqual(player.performanceSignals.decisionProfile.axes.map(axis => axis.id), SCOUTING_DECISION_PROFILE.axisIds)
  assert.ok(player.performanceSignals.decisionProfile.axes.every(axis => axis.value >= 1 && axis.value <= 100))
  assert.ok(!player.performanceSignals.decisionProfile.axes.some(axis => axis.id === 'evidenceConfidence'))
  assert.equal(player.performanceSignals.temporalValidation.method, 'chronological-match-holdout-v1')
  assert.equal(player.performanceSignals.temporalValidation.rankingImpact, false)
  assert.ok(['IMPROVED', 'STABLE', 'DECLINED', 'INSUFFICIENT'].includes(player.performanceSignals.temporalValidation.status))
  assert.deepEqual(Object.keys(player.performanceSignals.recruitmentScenarios.fits), Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS))
  assert.ok(Object.values(player.performanceSignals.recruitmentScenarios.fits).every(fit => (
    fit.score >= 1 && fit.score <= 100 && fit.rank >= 1 && fit.rank <= fit.total
  )))

  for (const locale of ['zh-CN', 'en-US', 'ko-KR']) {
    const note = getScoutingAnalystNote(player.playerId, locale, player)
    assert.ok(note?.archetype)
    assert.ok(note?.managerSummary)
    assert.ok(note?.verdict)
    assert.ok(note?.tacticalHypothesis)
    assert.equal(note?.vodQuestions.length, 3)
    assert.equal(new Set(note.vodQuestions).size, 3)
    assert.equal(note.version, 'current-evidence-analyst-note-v2')
    assert.ok(note.managerSummary.includes(`#${player.selection.subroleSelectionRank}/${player.highSampleSubroleTotal}`))
    assert.ok(!/P\d+/.test(note.managerSummary))
    assert.ok(note.managerSummary.length < note.verdict.length)
    assert.ok(note.verdict.includes(String(player.selection.score)))
    assert.ok(note.verdict.includes(`#${player.selection.subroleSelectionRank}/${player.highSampleSubroleTotal}`))
    assert.ok(note.verdict.includes(String(player.performanceSignals.opponentStrength.evidenceQuality.confidencePct)))
    assert.ok(note.tacticalHypothesis.includes(`${player.performanceSignals.deploymentProfile.baselineReliability}/100`))
    assert.ok(note.tacticalHypothesis.includes(`${player.performanceSignals.deploymentProfile.pressureReadiness}/100`))
    assert.ok(note.tacticalHypothesis.includes(`${player.performanceSignals.deploymentProfile.contextPortability}/100`))
    assert.ok(!note.verdict.includes('V2.4'))
    assert.ok(![
      '证据限定型位置候选',
      'Evidence-scoped role candidate',
      '근거 범위형 역할 후보'
    ].includes(note.archetype))
    assert.deepEqual(note.evidenceBasis, {
      selectionScore: player.selection.score,
      tier: player.tier,
      subroleRank: player.selection.subroleSelectionRank,
      subroleTotal: player.highSampleSubroleTotal,
      adjustedPercentile: player.performanceSignals.opponentStrength.adjustedPercentile,
      floorPercentile: player.performanceSignals.opponentStrength.performanceEnvelope.floorPercentile,
      evidenceGrade: player.performanceSignals.opponentStrength.evidenceQuality.grade,
      evidenceConfidencePct: player.performanceSignals.opponentStrength.evidenceQuality.confidencePct,
      subroleConfidencePct: player.subroleEvidence.confidencePct,
      schedulePercentile: player.performanceSignals.opponentStrength.schedulePercentile,
      stageAdjustedDeltaPct: player.performanceSignals.stageValidation.adjustedDeltaPct
    })
  }
}

for (const subrole of Object.keys(SCOUTING_SUBROLE_SLOT_PLAN)) {
  for (const scenario of Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS)) {
    assert.deepEqual(
      report.players
        .filter(player => player.subrole === subrole)
        .map(player => player.performanceSignals.recruitmentScenarios.fits[scenario].shortlistRank)
        .sort((a, b) => a - b),
      [1, 2, 3, 4, 5]
    )
    assert.ok(report.players
      .filter(player => player.subrole === subrole)
      .every(player => player.performanceSignals.recruitmentScenarios.fits[scenario].total === subrolePoolCounts[subrole]))
  }
}

assert.ok(Object.values(report.marketCoverage).every(market => market.complete))

const dani = report.players.find(player => player.playerId === 'FCR26-P0002')
assert.equal(dani?.identity?.battleTag, 'Dani2ois#5696')
assert.equal(dani?.teamPlacement?.rank, 1)
assert.equal(dani?.tier, 'PRIORITY')

const kalpas = report.players.find(player => player.playerId === 'FCR26-P0098')
assert.equal(kalpas?.identity?.battleTag, '永劫轮舞#51251')

const koreanPlayerIds = new Set(['FCR26-P0102', 'FCR26-P0103'])
assert.ok([...koreanPlayerIds].every(playerId => (
  report.players.find(player => player.playerId === playerId)?.identity?.nationality === 'KR' &&
  SCOUTING_PLAYER_NATIONALITIES[playerId] === 'KR'
)))
assert.ok(report.players
  .filter(player => !koreanPlayerIds.has(player.playerId))
  .every(player => player.identity?.nationality === 'CN-MAINLAND'))
assert.ok(!report.players.some(player => player.playerId === 'FCR26-P0117'))

const shortlist = report.players.map(player => ({
  id: player.playerId,
  name: player.identity.displayName,
  subrole: player.subrole,
  tier: player.tier,
  rank: `${player.highSampleSubroleRank}/${player.highSampleSubroleTotal}`,
  selectionScore: player.selection.score,
  rawSelectionScore: player.selection.rawScore,
  subroleEvidence: `${player.subroleEvidence.maps} maps / ${player.subroleEvidence.confidencePct}%`,
  coreRetentionOrEntry: player.selection.preferenceSensitivity.relevantPct
}))

console.log(JSON.stringify({
  modelVersion: report.modelVersion,
  qualifiedPool: report.qualifiedPool.length,
  roleCounts,
  subrolePoolCounts,
  v2Changes: {
    retained: retainedFromV1.length,
    added: addedInV2.map(playerId => report.players.find(player => player.playerId === playerId)?.identity?.displayName),
    removed: removedFromV1.map(playerId => selectionAudit.candidates.find(player => player.playerId === playerId)?.identity?.displayName)
  },
  shortlist
}, null, 2))
