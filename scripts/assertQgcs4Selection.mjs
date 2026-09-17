import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import {
  buildQgcs4Selection, buildQgcs4StageEvidence, empiricalPercentile, getEffectiveHeroCount,
  getQgcs4PositionView, scoreQgcs4Factors, QGCS4_POSITIONS, QGCS4_SELECTION_WEIGHTS, QGCS4_SELECTION_POLICY
} from '../src/features/scouting/qgcs4SelectionModel.js'
import { createQgcs4SelectionInput, reviewQgcs4Selection, weightSensitivity } from './reviewQgcs4Selection.mjs'
import { prepareSnapshot } from './auditQgcs4Scouting.mjs'
import { withSeason } from '../src/config/seasons.js'

let cases = 0
function check(label, run) {
  run()
  cases += 1
  console.log(`PASS ${label}`)
}
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`)
const phase = (score, matches = 3, maps = 11) => ({ adjustedScore: score, matches, maps })
const absent = () => ({ adjustedScore: null, matches: 0, maps: 0 })
function fixture(index, { position = 'FLEX_SUPPORT', group = phase(50), playoffs = phase(50) } = {}) {
  return { id: `QGCS4-TEST-${index}`, name: `Fixture ${index}`, team: 'TEST', position,
    performance: { raw: 60, adjusted: 60, floor: 40, variation: 20, effectiveHeroes: 2 },
    stages: { earlier: group, playoffs }, scope: { maps: 15, matches: 4, minutes: 150 },
    evidence: { mainHeroSharePct: 60 }, metrics: {}, heroes: [], matches: [] }
}
function inputOf(candidates) {
  return { source: { season: 'QGCS4', publishVersion: 30 }, referenceIds: candidates.map(candidate => candidate.id), candidates }
}

check('six normalized factors with no sample bonus or outer exposure shrink', () => {
  for (const position of QGCS4_POSITIONS) {
    const weights = QGCS4_SELECTION_WEIGHTS[position]
    assert.equal(Object.keys(weights).length, 6)
    assert.equal(weights.sampleDepth, undefined)
    close(Object.values(weights).reduce((sum, value) => sum + value, 0), 1)
    assert.ok(Object.isFrozen(weights))
  }
  assert.equal(QGCS4_SELECTION_POLICY.outerExposureShrink, false)
})

check('changing exposure metadata alone cannot change performance scores', () => {
  const original = inputOf([fixture(1), fixture(2), fixture(3)])
  const changed = structuredClone(original)
  changed.candidates[0].scope = { maps: 30, matches: 8, minutes: 300 }
  changed.candidates[0].evidence.legacyExposurePct = 100
  assert.deepEqual(buildQgcs4Selection(original).candidates.map(row => row.score), buildQgcs4Selection(changed).candidates.map(row => row.score))
})

check('JUBE-shaped case keeps playoff performance without inventing a stage trend', () => {
  const peers = [fixture(1, { group: phase(50, 1, 2), playoffs: phase(65) }),
    fixture(2, { playoffs: phase(50) }), fixture(3, { playoffs: phase(40) })]
  const result = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(result.playoff.status, 'COMPARABLE')
  assert.equal(result.playoff.value, 65)
  assert.equal(result.change.status, 'LIMITED_SAMPLE')
  assert.equal(result.change.value, null)
  assert.equal(result.change.percentile, null)
  assert.equal(result.change.centeredContribution, 0)
  assert.ok(result.playoff.centeredContribution > 0 && result.factor > 50)
  const missingEarlier = structuredClone(peers)
  missingEarlier[0].stages.earlier = absent()
  const after = buildQgcs4StageEvidence(missingEarlier[0], missingEarlier)
  close(after.playoff.centeredContribution, result.playoff.centeredContribution)
  close(after.factor, result.factor)
})

check('many maps in one playoff series are not repeated-match evidence', () => {
  const peers = [fixture(1, { playoffs: phase(90, 1, 20) }), fixture(2), fixture(3), fixture(4)]
  const stage = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(stage.playoff.observed, true)
  assert.equal(stage.playoff.eligible, false)
  assert.equal(stage.playoff.value, 90)
  assert.equal(stage.playoff.percentile, null)
  assert.equal(stage.factor, 50)
})

check('missing playoffs remain null; a measured zero is still an observation', () => {
  const peers = [fixture(1, { playoffs: absent() }), fixture(2), fixture(3), fixture(4)]
  const stage = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(stage.playoff.status, 'NOT_OBSERVED')
  assert.equal(stage.playoff.value, null)
  assert.equal(stage.factor, 50)
  peers[0].stages.playoffs = phase(0)
  assert.equal(buildQgcs4StageEvidence(peers[0], peers).playoff.observed, true)
})

check('a two-person playoff reference does not produce a precise relative score', () => {
  const peers = [fixture(1, { playoffs: phase(90) }), fixture(2, { playoffs: phase(40) })]
  const stage = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(stage.playoff.status, 'LIMITED_REFERENCE')
  assert.equal(stage.playoff.eligible, true)
  assert.equal(stage.playoff.percentile, null)
  assert.equal(stage.factor, 50)
})

check('stage midranks are neutral for ties and decrease below the median', () => {
  close(empiricalPercentile([10, 10, 10], 10, { midrank: true }), 50)
  const tied = [fixture(1), fixture(2), fixture(3)]
  assert.ok(tied.every(candidate => buildQgcs4StageEvidence(candidate, tied).factor === 50))
  const varied = [fixture(1, { playoffs: phase(40) }), fixture(2, { playoffs: phase(50) }), fixture(3, { playoffs: phase(60) })]
  assert.ok(buildQgcs4StageEvidence(varied[0], varied).factor < 50)
  assert.ok(buildQgcs4StageEvidence(varied[2], varied).factor > 50)
})

check('phase change is an index-point difference, not a percentage growth claim', () => {
  const peers = [fixture(1, { group: phase(40), playoffs: phase(60) }),
    fixture(2, { group: phase(80), playoffs: phase(90) }), fixture(3)]
  const stage = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(stage.change.value, 20)
  assert.equal(stage.change.status, 'COMPARABLE')
  assert.ok(stage.change.centeredContribution > 0)
})

check('stage change needs multiple earlier maps as well as multiple series', () => {
  const peers = [fixture(1, { group: phase(40, 2, 2), playoffs: phase(60) }), fixture(2), fixture(3)]
  const stage = buildQgcs4StageEvidence(peers[0], peers)
  assert.equal(stage.playoff.eligible, true)
  assert.equal(stage.change.eligible, false)
  assert.equal(stage.change.value, null)
})

check('score contributions are bounded and sum to the exact index', () => {
  const candidates = [fixture(1), fixture(2), fixture(3)]
  const result = buildQgcs4Selection(inputOf(candidates))
  for (const candidate of result.candidates) {
    assert.ok(candidate.score >= 0 && candidate.score <= 100)
    close(candidate.contributions.reduce((sum, item) => sum + item.points, 0), candidate.exactScore, 0.00001)
  }
  const factors = Object.fromEntries(Object.keys(QGCS4_SELECTION_WEIGHTS.TANK).map(key => [key, 50]))
  close(scoreQgcs4Factors('TANK', factors), 50)
  assert.throws(() => scoreQgcs4Factors('TANK', { ...factors, performance: NaN }), /Invalid factor/)
})

check('effective hero count uses normalized recorded exposure', () => {
  close(getEffectiveHeroCount([{ minutes: 10 }, { minutes: 10 }]), 2)
  close(getEffectiveHeroCount([{ minutes: 100 }]), 1)
  assert.throws(() => getEffectiveHeroCount([{ minutes: 0 }]), /Invalid hero exposure/)
})

check('the fixed cohort is enforced and inputs are not mutated', () => {
  const input = inputOf([fixture(1), fixture(2), fixture(3), fixture(4), fixture(5)])
  const snapshot = JSON.stringify(input)
  const report = buildQgcs4Selection(input)
  assert.equal(JSON.stringify(input), snapshot)
  const view = getQgcs4PositionView(report, 'FLEX_SUPPORT', { shortlistedOnly: true })
  assert.equal(view.poolSize, 5)
  assert.equal(view.candidates.length, 4)
  assert.deepEqual(view.candidates.map(row => row.score), report.rankings.FLEX_SUPPORT.slice(0, 4).map(row => row.score))
  assert.throws(() => buildQgcs4Selection({ ...input, candidates: input.candidates.slice(0, 4) }), /Reference pool changed/)
  assert.deepEqual(buildQgcs4Selection({ ...input, candidates: [...input.candidates].reverse() }).shortlistIds, report.shortlistIds)
})

check('cross-event, duplicate, missing and inconsistent data fail closed', () => {
  const input = inputOf([fixture(1), fixture(2), fixture(3)])
  assert.throws(() => buildQgcs4Selection({ ...input, source: { season: 'FCR26' } }), /another event/)
  assert.throws(() => buildQgcs4Selection({ ...input, candidates: [input.candidates[0], input.candidates[0]] }), /Duplicate/)
  for (const invalid of [null, undefined, NaN, '60']) {
    const copy = structuredClone(input)
    copy.candidates[0].performance.adjusted = invalid
    assert.throws(() => buildQgcs4Selection(copy), /Missing adjusted/)
  }
  const copy = structuredClone(input)
  copy.candidates[0].stages.playoffs = { maps: 0, matches: 0, adjustedScore: 0 }
  assert.throws(() => buildQgcs4Selection(copy), /must stay null/)
})

check('exact ties are shared in sensitivity results, not awarded by player ID', () => {
  const report = buildQgcs4Selection(inputOf(Array.from({ length: 5 }, (_, i) => fixture(i))))
  const sensitivity = weightSensitivity(report, 25)
  for (const row of sensitivity.candidates) {
    close(row.firstTrials, 5)
    close(row.selectedTrials, 20)
    assert.equal(row.minRank, 1)
    assert.equal(row.maxRank, 5)
  }
  assert.ok(report.candidates.every(row => row.exactTieCrossesShortlistBoundary && row.sharedRankInPool === 1))
  assert.throws(() => weightSensitivity(report, 0), /positive integer/)
})

const source = JSON.parse(await readFile(new URL('../artifacts/qgcs4-scouting-review-v30/source.json', import.meta.url), 'utf8'))
const reference = JSON.parse(await readFile(new URL('../artifacts/qgcs4-scouting-review-v30/audit-v1.json', import.meta.url), 'utf8'))
const sourceBefore = JSON.stringify(source)
const input = createQgcs4SelectionInput(prepareSnapshot(source), reference)
const real = buildQgcs4Selection(input)
check('V30 has 43 distinct candidates and exactly four model slots per position', () => {
  assert.equal(real.referenceCount, 43)
  assert.equal(real.shortlistIds.length, 20)
  assert.equal(new Set(real.shortlistIds).size, 20)
  for (const position of QGCS4_POSITIONS) assert.equal(real.rankings[position].filter(row => row.selected).length, 4)
  assert.equal(JSON.stringify(source), sourceBefore)
})

check('real JUBE retains 11 playoff maps while the trend remains unknown', () => {
  const candidate = real.candidates.find(row => row.name === 'JUBE')
  assert.equal(candidate.evidence.stage.playoff.maps, 11)
  assert.equal(candidate.evidence.stage.playoff.matches, 3)
  assert.equal(candidate.evidence.stage.playoff.status, 'COMPARABLE')
  assert.equal(candidate.evidence.stage.change.earlierMatches, 1)
  assert.equal(candidate.evidence.stage.change.value, null)
  assert.ok(candidate.evidence.stage.playoff.centeredContribution > 0)
})

check('real hitscan stage reference is limited, not silently ranked from two players', () => {
  const candidate = real.candidates.find(row => row.name === 'Yunzb')
  assert.equal(candidate.evidence.stage.playoff.referenceCount, 2)
  assert.equal(candidate.evidence.stage.playoff.status, 'LIMITED_REFERENCE')
  assert.equal(candidate.evidence.stage.playoff.value, 59.2)
  assert.equal(candidate.evidence.stage.playoff.percentile, null)
})

check('cross-role maps, administrative results and unknown identity fields stay out', () => {
  assert.equal(real.candidates.find(row => row.name === '小狗').evidence.scope.maps, 13)
  assert.equal(real.candidates.find(row => row.name === 'Yunzb').metrics.dth, 5.43)
  assert.ok(real.candidates.every(row => !row.matches.some(match => match.id === 'QGCS4-PLAYOFFS-R1-M07')))
  assert.ok(real.candidates.every(row => row.missing.includes('battleTag') && row.missing.includes('nationality')))
})

const full = await reviewQgcs4Selection(source, reference, { trials: 50 })
check('36 refits recompute all six factors with the same candidate cohort', () => {
  const folds = full.verification.fullSelectionRefits
  assert.equal(folds.length, 36)
  for (const fold of folds) {
    const rows = Object.values(fold.ranks).flat()
    assert.equal(rows.length, 43)
    assert.deepEqual(rows.map(row => row.id).sort(), [...real.referenceIds].sort())
    for (const row of rows) assert.ok(Number.isFinite(row.score))
  }
  for (const key of Object.keys(QGCS4_SELECTION_WEIGHTS.TANK)) {
    assert.ok(folds.some(fold => Object.values(fold.ranks).flat().some(row => {
      const original = real.candidates.find(candidate => candidate.id === row.id)
      return row.factors[key] !== original.factors[key]
    })), `No refit changed ${key}; was it reused instead of recomputed?`)
  }
  const jube = real.candidates.find(candidate => candidate.name === 'JUBE')
  assert.ok(folds.every(fold => fold.ranks.FLEX_SUPPORT.find(row => row.id === jube.id).changeEligible === false))
})

check('score changes are attributable and factor/sensitivity results are complete', () => {
  assert.equal(full.trace.length, 43)
  for (const trace of full.trace) close(trace.oldScore + Object.values(trace.changes).reduce((sum, value) => sum + value, 0), trace.rebuiltStage)
  assert.equal(full.verification.factorOmissions.length, 6)
  assert.equal(full.verification.weightSensitivity.candidates.length, 43)
  assert.equal(full.verification.includeShortRealMaps.shortlistIds.length, 20)
  assert.deepEqual(weightSensitivity(real, 50), weightSensitivity(real, 50))
})

check('an exact tie at the fourth refit slot is reported separately from retention', () => {
  const player = real.candidates.find(row => row.name === '小歪')
  const fold = full.verification.fullSelectionRefits.find(row => row.removedMatch === 'QGCS4-GROUP-R1-M05')
  const row = fold.ranks.FLEX_DPS.find(row => row.id === player.id)
  assert.equal(row.sharedRank, 4)
  assert.equal(row.boundaryTie, true)
  const summary = full.verification.stability.find(row => row.id === player.id)
  assert.equal(summary.boundaryTieRefits, 1)
  assert.equal(summary.possibleSelectedRefits, summary.selectedRefits + 1)
})

check('the existing FCR26 engines are unchanged', () => {
  for (const [key, filename] of [['report', 'scoutingReportModel.js'], ['opponent', 'scoutingOpponentStrength.js']]) {
    assert.equal(full.reproducibility.sourceFingerprints[`src/features/scouting/${filename}`], reference.methodology.sourceFingerprint[key])
  }
})

if (process.argv.includes('--artifact')) {
  const artifact = JSON.parse(await readFile(new URL('../artifacts/qgcs4-scouting-review-v30/selection-v0.1-r3.json', import.meta.url), 'utf8'))
  check('saved selection matches the current code and full deterministic refits', () => {
    assert.deepEqual(artifact.candidates, full.candidates)
    assert.deepEqual(artifact.verification.fullSelectionRefits, full.verification.fullSelectionRefits)
    assert.deepEqual(artifact.reproducibility.sourceFingerprints, full.reproducibility.sourceFingerprints)
    assert.equal(artifact.verification.weightSensitivity.trials, 5000)
    assert.equal(artifact.source.parsedBodySha256, createHash('sha256').update(sourceBefore).digest('hex'))
  })
}

const document = await readFile(new URL('../docs/scouting/qgcs4-selection-v0.1.md', import.meta.url), 'utf8')
check('the review has the same 20 candidates, scoped samples and 40 valid match references', () => {
  const cards = document.split(/^### /m).slice(1).map(block => {
    const heading = block.match(/^(.+?) · (.+?)\r?\n/)
    return heading ? { name: heading[1], team: heading[2], body: block.split(/^## /m)[0] } : null
  }).filter(Boolean)
  assert.equal(cards.length, 20)
  const byName = new Map(real.candidates.map(candidate => [candidate.name, candidate]))
  assert.deepEqual(cards.map(card => byName.get(card.name).id).sort(), [...real.shortlistIds].sort())
  for (const card of cards) {
    const candidate = byName.get(card.name)
    assert.equal(card.team, candidate.team)
    const scope = candidate.evidence.scope
    assert.ok(card.body.includes(`本位置 ${scope.maps} 图／${scope.minutes.toFixed(1)} 分钟／${scope.matches} 场`))
    const links = [...card.body.matchAll(/\[([^\]]+ · 图 ([\d、]+))\]\((https:\/\/stats\.fries-cup\.com\/matches\/[^)]+)\)/g)]
    assert.equal(links.length, 2)
    for (const [, label, orders, href] of links) {
      const url = new URL(href)
      const matchId = url.pathname.split('/').at(-1)
      assert.equal(url.pathname + url.search, withSeason(`/matches/${matchId}`, 'QGCS4'))
      const match = candidate.matches.find(row => row.id === matchId)
      assert.ok(match && label.includes(`对 ${match.opponent} ·`))
      assert.deepEqual(orders.split('、').map(Number), match.mapsUsed.map(map => map.order).sort((a, b) => a - b))
    }
  }
})

check('the 14 consistently retained names in the summary agree with the refits', () => {
  const labels = { TANK: '坦克', HITSCAN: '长枪', FLEX_DPS: '自由人', MAIN_SUPPORT: '群辅', FLEX_SUPPORT: '枪辅' }
  const stable = full.verification.stability.filter(row => row.selectedRefits === 36 && full.shortlistIds.includes(row.id))
  assert.equal(stable.length, 14)
  for (const [position, label] of Object.entries(labels)) {
    const expected = stable.filter(row => full.candidates.find(candidate => candidate.id === row.id).position === position)
      .map(row => full.candidates.find(candidate => candidate.id === row.id).name).sort()
    const summary = document.split(/\r?\n/).find(line => line.startsWith(`| ${label} |`))
    assert.deepEqual(summary.split('|')[2].trim().split('、').sort(), expected)
  }
})

console.log(`QGCS4 selection checks passed: ${cases} cases, 43 candidates, 20 slots, 36 full selection refits.`)
