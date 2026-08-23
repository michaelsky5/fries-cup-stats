export const SCOUTING_ARTIFACT_SCHEMA_VERSION = 'scouting-report-v2'
export const SCOUTING_REPORT_VERSION = 'FCR26 Scouting v2.4'

function compactIdentity(identity, { includeBattleTag = false } = {}) {
  return {
    playerId: identity?.playerId,
    displayName: identity?.displayName,
    ...(includeBattleTag ? { battleTag: identity?.battleTag || '' } : {}),
    initials: identity?.initials,
    nationality: identity?.nationality || '',
    teamShort: identity?.teamShort,
    teamFull: identity?.teamFull,
    teamRouteId: identity?.teamRouteId,
    registeredRole: identity?.registeredRole
  }
}

function compactHeroPool(heroPool) {
  return (heroPool || []).slice(0, 6).map(hero => ({
    hero: hero.hero,
    maps: hero.maps,
    timeMins: hero.timeMins,
    timeLabel: hero.timeLabel,
    usagePct: hero.usagePct,
    usageLabel: hero.usageLabel
  }))
}

function compactStageValidation(stageValidation) {
  if (!stageValidation) return null
  const compactStage = stage => stage ? {
    maps: stage.maps,
    matches: stage.matches,
    minutes: stage.minutes,
    rawScore: stage.rawScore,
    adjustedScore: stage.adjustedScore,
    envelope: stage.envelope
  } : null

  return {
    percentile: stageValidation.percentile,
    playoffPerformancePercentile: stageValidation.playoffPerformancePercentile,
    resiliencePercentile: stageValidation.resiliencePercentile,
    confidencePct: stageValidation.confidencePct,
    eligible: stageValidation.eligible,
    playoffs: compactStage(stageValidation.playoffs),
    earlier: compactStage(stageValidation.earlier),
    adjustedDeltaPct: stageValidation.adjustedDeltaPct
  }
}

function compactHeroLineupContext(context) {
  if (!context) return null
  return {
    coveragePct: context.coveragePct,
    completeMaps: context.completeMaps,
    ownHeroContexts: context.ownHeroContexts,
    lineupAnchorContexts: context.lineupAnchorContexts,
    partnerContexts: context.partnerContexts,
    combinedAdjustment: context.combinedAdjustment,
    appliedWeightPct: context.appliedWeightPct
  }
}

function compactDeploymentPlaybook(playbook) {
  if (!playbook) return null
  const primaryUse = playbook.recommendations?.primaryUse
  return {
    primaryUse: primaryUse ? {
      hero: primaryUse.hero,
      mapType: primaryUse.mapType,
      retentionPct: primaryUse.retentionPct,
      confidencePct: primaryUse.confidencePct
    } : null
  }
}

function compactDeploymentContextDetail(context) {
  if (!context) return null
  return {
    key: context.key,
    hero: context.hero,
    mapType: context.mapType,
    maps: context.maps,
    matches: context.matches,
    minutes: context.minutes,
    retentionPct: context.retentionPct,
    confidencePct: context.confidencePct,
    evidenceGrade: context.evidenceGrade,
    percentile: context.percentile,
    status: context.status,
    eligible: context.eligible
  }
}

function compactDeploymentPlaybookDetail(playbook) {
  if (!playbook) return null
  return {
    method: playbook.method,
    caveat: playbook.caveat,
    baselineScore: playbook.baselineScore,
    sampleGate: playbook.sampleGate,
    observedHeroMapCells: playbook.observedHeroMapCells,
    eligibleHeroMapCells: playbook.eligibleHeroMapCells,
    coveragePct: playbook.coveragePct,
    eligibleHeroes: playbook.eligibleHeroes,
    eligibleMapTypes: playbook.eligibleMapTypes,
    heroMapCells: (playbook.heroMapCells || []).map(compactDeploymentContextDetail),
    heroContexts: (playbook.heroContexts || []).map(context => ({
      hero: context.hero,
      maps: context.maps,
      matches: context.matches,
      minutes: context.minutes
    })),
    lineupAnchors: (playbook.lineupAnchors || []).map(compactDeploymentContextDetail),
    partnerContexts: (playbook.partnerContexts || []).map(compactDeploymentContextDetail),
    recommendations: {
      primaryUse: compactDeploymentContextDetail(playbook.recommendations?.primaryUse),
      secondaryUse: compactDeploymentContextDetail(playbook.recommendations?.secondaryUse),
      watchContext: compactDeploymentContextDetail(playbook.recommendations?.watchContext),
      bestAnchor: compactDeploymentContextDetail(playbook.recommendations?.bestAnchor),
      bestPartner: compactDeploymentContextDetail(playbook.recommendations?.bestPartner)
    }
  }
}

function compactOpponentStrengthSummary(opponentStrength) {
  if (!opponentStrength) return null
  return {
    subrole: opponentStrength.subrole,
    maps: opponentStrength.maps,
    minutes: opponentStrength.minutes,
    matches: opponentStrength.matches,
    schedulePercentile: opponentStrength.schedulePercentile,
    scheduleRating: opponentStrength.scheduleRating,
    averageExpectedWinPct: opponentStrength.averageExpectedWinPct,
    matureContextPct: opponentStrength.matureContextPct,
    rawPercentile: opponentStrength.rawPercentile,
    rawScore: opponentStrength.rawScore,
    adjustedPercentile: opponentStrength.adjustedPercentile,
    adjustedScore: opponentStrength.adjustedScore,
    adjustment: opponentStrength.adjustment,
    heroLineupContext: compactHeroLineupContext(opponentStrength.heroLineupContext),
    performanceEnvelope: opponentStrength.performanceEnvelope ? {
      floor: opponentStrength.performanceEnvelope.floor,
      median: opponentStrength.performanceEnvelope.median,
      ceiling: opponentStrength.performanceEnvelope.ceiling,
      mean: opponentStrength.performanceEnvelope.mean,
      effectiveMaps: opponentStrength.performanceEnvelope.effectiveMaps,
      effectiveMatches: opponentStrength.performanceEnvelope.effectiveMatches,
      intervalMethod: opponentStrength.performanceEnvelope.intervalMethod,
      rangeLow90: opponentStrength.performanceEnvelope.rangeLow90,
      rangeHigh90: opponentStrength.performanceEnvelope.rangeHigh90,
      floorPercentile: opponentStrength.performanceEnvelope.floorPercentile,
      typicalPercentile: opponentStrength.performanceEnvelope.typicalPercentile,
      ceilingPercentile: opponentStrength.performanceEnvelope.ceilingPercentile
    } : null,
    pressureTest: opponentStrength.pressureTest ? {
      percentile: opponentStrength.pressureTest.percentile,
      retentionPct: opponentStrength.pressureTest.retentionPct
    } : null,
    deploymentPlaybook: compactDeploymentPlaybook(opponentStrength.deploymentPlaybook),
    evidenceQuality: opponentStrength.evidenceQuality
  }
}

function compactOpponentStrengthDetail(opponentStrength) {
  if (!opponentStrength) return null
  return {
    subrole: opponentStrength.subrole,
    maps: opponentStrength.maps,
    minutes: opponentStrength.minutes,
    matches: opponentStrength.matches,
    schedulePercentile: opponentStrength.schedulePercentile,
    rawPercentile: opponentStrength.rawPercentile,
    scheduleRating: opponentStrength.scheduleRating,
    averageExpectedWinPct: opponentStrength.averageExpectedWinPct,
    matureContextPct: opponentStrength.matureContextPct,
    rawScore: opponentStrength.rawScore,
    adjustedScore: opponentStrength.adjustedScore,
    adjustment: opponentStrength.adjustment,
    adjustedPercentile: opponentStrength.adjustedPercentile,
    heroLineupContext: opponentStrength.heroLineupContext,
    teamContribution: opponentStrength.teamContribution || null,
    performanceEnvelope: opponentStrength.performanceEnvelope,
    pressureTest: opponentStrength.pressureTest,
    mapResultContext: opponentStrength.mapResultContext,
    adjustedMapTypes: {
      groups: opponentStrength.adjustedMapTypes?.groups || [],
      strongest: opponentStrength.adjustedMapTypes?.strongest || null,
      weakest: opponentStrength.adjustedMapTypes?.weakest || null
    },
    adjustedHeroContexts: opponentStrength.adjustedHeroContexts || { groups: [] },
    deploymentPlaybook: compactDeploymentPlaybookDetail(opponentStrength.deploymentPlaybook),
    opponentTiers: opponentStrength.opponentTiers || [],
    evidenceQuality: opponentStrength.evidenceQuality,
    strongestOpponents: opponentStrength.strongestOpponents || []
  }
}

function compactPerformanceSignalsSummary(signals) {
  return {
    opponentStrength: compactOpponentStrengthSummary(signals?.opponentStrength),
    stageValidation: compactStageValidation(signals?.stageValidation),
    deploymentProfile: signals?.deploymentProfile || null,
    recruitmentScenarios: signals?.recruitmentScenarios || { inputs: {}, fits: {} }
  }
}

function compactPerformanceSignalsDetail(signals) {
  return {
    focusMetricId: signals?.focusMetricId,
    consistency: signals?.consistency,
    form: signals?.form,
    heroPool: signals?.heroPool,
    stageValidation: compactStageValidation(signals?.stageValidation),
    opponentStrength: compactOpponentStrengthDetail(signals?.opponentStrength),
    deploymentProfile: signals?.deploymentProfile || null,
    decisionProfile: signals?.decisionProfile || null,
    temporalValidation: signals?.temporalValidation || null,
    professionalReference: signals?.professionalReference || null,
    recruitmentScenarios: signals?.recruitmentScenarios || { inputs: {}, fits: {} }
  }
}

function compactTrend(trend) {
  return {
    metricId: trend?.metricId,
    rows: (trend?.rows || []).map(row => ({
      order: row.order,
      mapName: row.mapName,
      hero: row.hero,
      value: row.value
    }))
  }
}

function compactRecentMatches(recentMatches) {
  return (recentMatches || []).slice(0, 4).map(match => ({
    matchId: match.matchId,
    rawMatchId: match.rawMatchId,
    displayName: match.displayName,
    date: match.date,
    dateLabel: match.dateLabel,
    opponent: match.opponent,
    side: match.side,
    scoreLabel: match.scoreLabel,
    result: match.result,
    role: match.role,
    primaryHero: match.primaryHero,
    heroLabel: match.heroLabel,
    mapsPlayed: match.mapsPlayed
  }))
}

export function createScoutingPlayerSummary(player) {
  return {
    playerId: player.playerId,
    identity: compactIdentity(player.identity),
    teamPlacement: player.teamPlacement,
    role: player.role,
    subrole: player.subrole,
    subroleProfile: player.subroleProfile,
    subroleEvidence: player.subroleEvidence,
    summary: player.summary,
    heroPool: compactHeroPool(player.subroleHeroPool || player.heroPool).slice(0, 1),
    matchCount: player.matchCount,
    sampleDepth: player.sampleDepth,
    subroleSampleDepth: player.subroleSampleDepth,
    strengths: (player.strengths || []).slice(0, 2),
    risks: (player.risks || []).slice(0, 1),
    selection: player.selection,
    tier: player.tier,
    highSampleRoleRank: player.highSampleRoleRank,
    highSampleRoleTotal: player.highSampleRoleTotal,
    highSampleSubroleRank: player.highSampleSubroleRank,
    highSampleSubroleTotal: player.highSampleSubroleTotal,
    performanceSignals: compactPerformanceSignalsSummary(player.performanceSignals)
  }
}

export function createScoutingPlayerDetail(player) {
  return {
    ...createScoutingPlayerSummary(player),
    identity: compactIdentity(player.identity, { includeBattleTag: true }),
    heroPool: compactHeroPool(player.subroleHeroPool || player.heroPool),
    roleMetrics: player.roleMetrics || [],
    trend: compactTrend(player.trend),
    recentMatches: compactRecentMatches(player.recentMatches),
    strengths: player.strengths || [],
    risks: player.risks || [],
    performanceSignals: compactPerformanceSignalsDetail(player.performanceSignals)
  }
}

function compactQualifiedPlayer(player) {
  const benchmark = {
    role: player.role,
    subrole: player.subrole,
    ovr: player.ovr,
    sampleDepth: player.sampleDepth,
    selectionScore: player.selectionScore,
    selected: player.selected
  }

  if (!player.selected) return benchmark

  return {
    playerId: player.playerId,
    name: player.name,
    team: player.team,
    ...benchmark
  }
}

export function createScoutingArtifacts(model, sourceMeta = {}) {
  const players = model.players.map(createScoutingPlayerSummary)
  const details = Object.fromEntries(model.players.map(player => [
    player.playerId,
    createScoutingPlayerDetail(player)
  ]))

  return {
    index: {
      meta: {
        schemaVersion: SCOUTING_ARTIFACT_SCHEMA_VERSION,
        reportVersion: SCOUTING_REPORT_VERSION,
        modelVersion: model.modelVersion,
        seasonId: 'FCR26',
        dataAsOf: sourceMeta.ranking_as_of || sourceMeta.review_ready_at || '',
        rankingStage: sourceMeta.ranking_stage || 'PLAYOFFS'
      },
      sampleGate: model.sampleGate,
      subroleEvidenceGate: model.subroleEvidenceGate,
      subroleConfidenceTarget: model.subroleConfidenceTarget,
      selectionWeights: model.selectionWeights,
      deploymentWeights: model.deploymentWeights,
      recruitmentScenarioWeights: model.recruitmentScenarioWeights,
      professionalReference: model.professionalReference,
      pairwiseBootstrap: {
        method: model.pairwiseComparisons?.[0]?.method || 'independent-match-cluster-bootstrap-v1',
        trials: model.pairwiseComparisons?.[0]?.trials || 0,
        comparisons: (model.pairwiseComparisons || []).map(comparison => ({
          playerAId: comparison.playerAId,
          playerBId: comparison.playerBId,
          playerAWinProbabilityPct: comparison.playerAWinProbabilityPct,
          deltaLow90: comparison.deltaLow90,
          deltaHigh90: comparison.deltaHigh90
        }))
      },
      validationAudit: model.validationAudit,
      marketCoverage: model.marketCoverage,
      qualifiedPool: model.qualifiedPool.map(compactQualifiedPlayer),
      players,
      selectedCount: model.selectedCount,
      priorityCount: model.priorityCount,
      extendedCount: model.extendedCount,
      watchCount: model.watchCount,
      targetCount: model.targetCount,
      coreTargetCount: model.coreTargetCount,
      watchTargetCount: model.watchTargetCount,
      priorityTargetCount: model.priorityTargetCount
    },
    details
  }
}
