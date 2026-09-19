import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { prepareSnapshot, summarizeEvidence, evidenceSeparatedDiagnostic, SNAPSHOT_TIME } from './auditQgcs4Scouting.mjs'
import { withSeason } from '../src/config/seasons.js'

const sourceUrl = new URL('../artifacts/qgcs4-scouting-review-v30/source.json', import.meta.url)
const auditUrl = new URL('../artifacts/qgcs4-scouting-review-v30/audit-v1.json', import.meta.url)
const source = JSON.parse(await readFile(sourceUrl, 'utf8'))
const originalJson = JSON.stringify(source)
const { db, rows, counts } = prepareSnapshot(source)
assert.equal(JSON.stringify(source), originalJson, 'Preparing the audit mutated the source')
assert.equal(db.season.season_id, 'QGCS4')
assert.equal(source.season.season_id, undefined, 'The season alias leaked into the input')
assert.equal(source.meta.ranking_as_of, SNAPSHOT_TIME)
assert.equal(rows.length, 1240)
assert.equal(counts.ignoredDuplicateLiveRows, 1240)
assert.equal(counts.realMaps, 124)
assert.equal(counts.realMatches, 36)
assert.equal(counts.playoffMatches, 7)
assert.equal(counts.adminMaps, 26)
assert.equal(counts.droppedLogs, 0)
assert.equal(counts.excludedStatMaps, 0)
assert.ok(db.matches.every(match => match.maps.every(map => !map.is_administrative)))
assert.ok(!db.matches.some(match => match.round === '3RD PLACE'))
const partial = db.matches.find(match => match.match_id === 'QGCS4-GROUP-R3-M01')
assert.equal(partial.maps.length, 2, 'The partial forfeit leaked into team-strength evidence')
assert.equal(source.matches.find(match => match.match_id === partial.match_id).maps.length, 3)
assert.ok(db.players.every(player => player.live_match_logs.length === 0))

const weighted = summarizeEvidence([
  { mapKey: 'a:1', matchId: 'a', opponentId: 'x', minutes: 1, totals: { elim: 0, ast: 0, dth: 0, dmg: 100, heal: 0, block: 0 } },
  { mapKey: 'b:1', matchId: 'b', opponentId: 'y', minutes: 9, totals: { elim: 0, ast: 0, dth: 0, dmg: 180, heal: 0, block: 0 } }
])
assert.equal(weighted.per10.dmg, 280, 'Per-10 rates must use total exposure, not average map rates')
assert.equal(weighted.maps, 2)
assert.equal(weighted.matches, 2)
assert.deepEqual(weighted.opponents, ['x', 'y'])
assert.equal(summarizeEvidence([]).per10.dmg, null, 'Missing evidence must not be zero performance')
assert.equal(evidenceSeparatedDiagnostic({ selection: { factors: { performance: 80, sampleDepth: 10 } } },
  { performance: 0.9, sampleDepth: 0.1 }), 80)

const wrongSeason = { ...source, season: { ...source.season, id: 'FCR26' } }
assert.throws(() => prepareSnapshot(wrongSeason), /another event/)
const duplicated = structuredClone(source)
const active = duplicated.players.find(player => player.match_logs.length)
active.match_logs.push({ ...active.match_logs[0] })
assert.throws(() => prepareSnapshot(duplicated), /Repeated player-map/)
const unknown = structuredClone(source)
unknown.players.find(player => player.match_logs.length).match_logs[0].hero = 'UNKNOWN_AUDIT_HERO'
assert.throws(() => prepareSnapshot(unknown), /Unknown hero/)

const audit = JSON.parse(await readFile(auditUrl, 'utf8'))
assert.equal(audit.status, 'RESEARCH_NOT_PUBLISHED')
assert.equal(audit.source.parsedBodySha256, createHash('sha256').update(originalJson).digest('hex'))
assert.equal(audit.candidates.length, 43)
assert.equal(audit.refits.length, 36)
assert.equal(audit.scenarios.length, 5)
assert.equal(audit.scenarios.find(s => s.id === 'gate-12-120-3-exploratory').ranks.TANK.length, 10)
assert.ok(audit.refits.every(fold => Object.values(fold.ranks).flat().length === 43), 'Refit comparisons changed the fixed cohort')
const shortlist = Object.values(audit.primaryRanks).flatMap(position => position.slice(0, 4))
assert.equal(shortlist.length, 20)
assert.equal(new Set(shortlist.map(p => p.id)).size, 20)
const identity = new Map(audit.candidates.map(p => [p.name, p]))
const jube = identity.get('JUBE')
assert.equal(jube.model.stages.playoffs.matches, 3)
assert.equal(jube.model.stages.playoffs.maps, 11)
assert.equal(jube.phaseEvidence.playoffPerformanceHasRepeatedMatches, true)
assert.equal(jube.phaseEvidence.groupToPlayoffTrendHasRepeatedMatches, false)
assert.equal(jube.phaseEvidence.currentStageFactorEligible, false)
assert.equal(audit.comparisons.find(c => c.names[0] === 'JUBE').commonOpponents.length, 0)
assert.equal(audit.comparisons.find(c => c.names[0] === 'ONW').commonOpponents.length, 1)
const mixed = identity.get('小狗')
assert.equal(mixed.broad.maps, 19)
assert.equal(mixed.scoped.maps, 13)
assert.notEqual(mixed.broad.per10.heal, mixed.scoped.per10.heal, 'Other support responsibilities leaked into scoped metrics')
for (const candidate of audit.candidates) {
  assert.ok(candidate.missing.includes('nationality'))
  assert.ok(candidate.missing.includes('battleTag'))
  assert.ok(candidate.heroMeasurement.includes('not exact time'))
  assert.equal(candidate.matches.reduce((sum, match) => sum + match.maps, 0), candidate.scoped.maps)
  assert.ok(candidate.matches.every(match => match.id.startsWith('QGCS4-')))
}
// Catch stale artifacts and cross-player / cross-season evidence links in the
// hand-written review, rather than checking only the analytical JSON.
for (const [key, filename] of [['report', 'scoutingReportModel.js'], ['opponent', 'scoutingOpponentStrength.js']]) {
  const code = await readFile(new URL(`../src/features/scouting/${filename}`, import.meta.url), 'utf8')
  assert.equal(audit.methodology.sourceFingerprint[key], createHash('sha256').update(code.replace(/\r\n/g, '\n')).digest('hex'),
    `The ${key} engine changed after the frozen review was computed`)
}
const document = await readFile(new URL('../docs/scouting/qgcs4-review-v30.md', import.meta.url), 'utf8')
assert.ok(document.includes(audit.source.parsedBodySha256))
const cards = document.split(/^### /m).slice(1).map(block => {
  const heading = block.match(/^(.+?) · (.+?)（(核心候选|内部对照)）\r?\n/)
  return heading ? { name: heading[1], team: heading[2], status: heading[3], body: block.split(/^## /m)[0] } : null
}).filter(Boolean)
assert.equal(cards.filter(card => card.status === '核心候选').length, 20)
assert.equal(cards.filter(card => card.status === '内部对照').length, 5)
assert.equal(new Set(cards.map(card => card.name)).size, 25)
const coreIds = cards.filter(card => card.status === '核心候选').map(card => identity.get(card.name).id).sort()
assert.deepEqual(coreIds, shortlist.map(player => player.id).sort())
for (const card of cards) {
  const candidate = identity.get(card.name)
  assert.ok(candidate, `Unknown player in review: ${card.name}`)
  assert.equal(card.team, candidate.team)
  assert.ok(card.body.includes(`本位置 ${candidate.scoped.maps} 图／`))
  const evidence = [...card.body.matchAll(/\[([^\]]+ · 图 ([\d、]+))\]\((https:\/\/stats\.fries-cup\.com\/matches\/[^)]+)\)/g)]
  assert.equal(evidence.length, 2, `${card.name} must have two explicit match references`)
  for (const [, label, orders, href] of evidence) {
    const url = new URL(href)
    const matchId = url.pathname.split('/').at(-1)
    assert.equal(url.pathname + url.search, withSeason(`/matches/${matchId}`, 'QGCS4'))
    const match = candidate.matches.find(item => item.id === matchId)
    assert.ok(match, `${card.name} has no scoped evidence in ${matchId}`)
    assert.ok(label.includes(`对 ${match.opponent} ·`))
    assert.deepEqual(orders.split('、').map(Number), match.mapsUsed.map(map => map.order).sort((a, b) => a - b))
  }
}
console.log('QGCS4 offline review checks passed: source isolation, 43 candidates, 20 core + 5 comparison cards, 50 match references, 36 full refits, scoped metrics and evidence boundaries.')
