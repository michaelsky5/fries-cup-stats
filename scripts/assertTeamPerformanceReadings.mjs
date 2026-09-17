import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildTeamPerformance, getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'
import { buildScoutingBrief } from '../src/features/team-dossier/teamScoutingBrief.js'
import { lineupContexts, memberQuickRead, roleDefaultMetric, seasonRecordFacts, relativeDifference, getRolePeerSamples, rolePercentile } from '../src/features/team-dossier/teamPerformanceReadings.js'

const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const rows = getPerformanceRows(db.matches, 'FCR26-T026')
const report = buildTeamPerformance(rows)

test('AIP prioritises a bounded matchup exception and preserves its exact maps', () => {
  const brief = buildScoutingBrief(report)
  const lead = brief.findings[0]
  assert.equal(lead.opponentId, 'FCR26-T010')
  assert.equal(lead.section, 'opponents')
  assert.equal(lead.records.length, 10)
  assert.equal(new Set(lead.records.map(record => record.match.match_id)).size, 2)
  assert.ok(lead.records.every(record => record.opponentLabel === 'MASK'))
  assert.equal(lead.chart.rows[0].value.toFixed(1), '68.9')
  assert.equal(lead.chart.rows[1].value.toFixed(1), '77.8')
  assert.match(lead.review, /复盘线索/)
  assert.ok(brief.findings.length <= 3)
  assert.ok(!brief.findings.some(finding => finding.id === 'stage-context'))
})

test('one meeting or a stage without that opponent cannot inherit the matchup claim', () => {
  const oneMeeting = buildTeamPerformance(rows.filter(row => row.match.match_id !== 'FCR26-PLAYOFFS-R1-M13'))
  assert.ok(!buildScoutingBrief(oneMeeting).findings.some(finding => finding.opponentId))
  const swiss = buildTeamPerformance(rows.filter(row => row.match.stage === 'SWISS'), [], 'en-US')
  assert.ok(buildScoutingBrief(swiss, [], 'en-US').findings.every(finding => !finding.opponentId && finding.records.every(record => record.match.stage === 'SWISS')))
})

test('missing and zero opposing values do not produce a relative reversal', () => {
  for (const eliminations of [null, 0]) {
    const altered = { ...report, records: report.records.map(record => ({ ...record, opponentStats: { ...record.opponentStats, values: { ...record.opponentStats.values, eliminations } } })) }
    assert.ok(!buildScoutingBrief(altered).findings.some(finding => finding.opponentId))
  }
  assert.equal(relativeDifference(0, 10), -100)
  assert.equal(relativeDifference(10, 0), null)
  assert.equal(relativeDifference(null, 10), null)
})

test('role defaults use distinct measures while missing player appearances remain unknown', () => {
  assert.deepEqual(['TANK', 'DPS', 'SUP'].map(roleDefaultMetric), ['mitigation', 'eliminations', 'healing'])
  const ever = memberQuickRead(report.members.find(member => member.name === 'EVER'), report.records.length)
  assert.equal(ever.appearance, 1)
  assert.equal(ever.measures[0].count, 32)
  const absent = buildTeamPerformance(rows, [{ player_id: 'unrecorded', name: 'No record', role: 'SUP' }]).members.find(member => member.id === 'unrecorded')
  const reading = memberQuickRead(absent, report.records.length)
  assert.equal(reading.appearance, 0)
  assert.ok(reading.measures.every(metric => metric.own === null && metric.opponent === null && metric.difference === null))
})

test('peer percentiles preserve ties, actual zeros and the minimum comparison group', () => {
  const samples = [0, 0, 0, 0, 0].map((value, index) => ({ id: String(index), value }))
  const member = { id: '0', role: 'SUP' }
  assert.equal(rolePercentile({ SUP: { healing: samples } }, member, 'healing').value, 50)
  assert.equal(rolePercentile({ SUP: { healing: samples.slice(0, 4) } }, member, 'healing'), null)
  assert.equal(rolePercentile({ SUP: { healing: samples } }, { ...member, id: 'missing' }, 'healing'), null)
  assert.equal(rolePercentile({ SUP: { deaths: samples.map((sample, i) => ({ ...sample, value: i })) } }, member, 'deaths').value, 10)
})

test('peer populations follow the stage and require enough valid maps and minutes per metric', () => {
  const swiss = getRolePeerSamples(db.matches, 'SWISS')
  const ever = swiss.TANK.mitigation.find(sample => sample.id === 'FCR26-P0001')
  assert.equal(ever.count, 11)
  assert.ok(ever.minutes >= 30)
  assert.ok(Object.values(swiss).flatMap(metrics => Object.values(metrics).flat()).every(sample => sample.count >= 5 && sample.minutes >= 30 && Number.isFinite(sample.value)))
  const oneMatch = getRolePeerSamples(db.matches.filter(match => match.match_id === 'FCR26-SWISS-R1-M08'))
  assert.equal(oneMatch.TANK.mitigation.length, 0)
})

test('lineup context retains ties, exact outcomes and the complete-record denominator', () => {
  const lineups = lineupContexts(report.lineups)
  const top = lineups[0]
  assert.equal(top.share, 3 / 32)
  assert.equal(top.wins, 3)
  assert.equal(top.losses, 0)
  assert.equal(top.commonMaps.length, 3)
  assert.equal(top.commonCount, 1)
  assert.equal(lineups.reduce((sum, lineup) => sum + lineup.records.length, 0), 32)
  assert.ok(lineups.every(lineup => lineup.wins + lineup.losses + lineup.draws === lineup.records.length))
  assert.deepEqual(lineupContexts([]), [])
})

test('season records exclude bye and administrative wins and link the actual winning sequence', () => {
  const facts = seasonRecordFacts(rows)
  assert.equal(facts.longest.length, 6)
  assert.equal(facts.closing.length, 3)
  assert.equal(facts.differential, 18)
  assert.equal(facts.maps.length, 32)
  assert.equal(facts.sweeps.length, 6)
  assert.equal(facts.completeSequences, 10)
  assert.equal(facts.administrative, 1)
  assert.equal(facts.byes, 1)
  assert.ok([...facts.longest, ...facts.closing, ...facts.sweeps].every(row => row.decided && !row.administrative && !row.bye))
})

test('unknown completed results interrupt confirmed runs; all-administrative seasons have no invented metrics', () => {
  const wins = rows.filter(row => row.tone === 'win' && !row.administrative && !row.bye).slice(0, 3)
  const unknown = { ...wins[1], decided: false, tone: 'unknown' }
  const gap = seasonRecordFacts([wins[0], unknown, wins[2]])
  assert.equal(gap.longest.length, 1)
  assert.equal(gap.closing.length, 1)
  assert.equal(seasonRecordFacts([wins[0], unknown]).closingKnown, false)
  const empty = seasonRecordFacts(rows.filter(row => row.bye || row.administrative))
  assert.equal(empty.differential, null)
  assert.equal(empty.played.length, 0)
  assert.equal(empty.sweeps.length, 0)
})
