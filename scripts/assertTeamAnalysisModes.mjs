import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildTeamPerformance, getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'
import { buildScoutingBrief } from '../src/features/team-dossier/teamScoutingBrief.js'
import { getAnalysisReading, getAnalysisMember, getAnalysisTeamPath, getFindingDestination, getFindingMatches } from '../src/features/team-dossier/teamAnalysisReading.js'

const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const rows = getPerformanceRows(db.matches, 'FCR26-T026')
const report = buildTeamPerformance(rows)
const read = query => getAnalysisReading(new URLSearchParams(query))

test('new visitors and member links start with a quick read; malformed mode values fail safely', () => {
  for (const query of ['', 'member=FCR26-P0001&analysisStage=SWISS', 'analysisView=invalid&analysisTopic=invalid']) {
    assert.deepEqual(read(query), { view: 'brief', topic: 'team' })
  }
})

test('existing evidence links open the relevant full topic', () => {
  const links = [
    ['teamOpponent=FCR26-T010', 'opponents'],
    ['teamEvidence=performance-opponent-FCR26-T010', 'opponents'],
    ['memberMetric=healing&member=FCR26-P0003', 'members'],
    ['teamEvidence=scouting-roster-profile', 'members'],
    ['performanceHero=Kiriko', 'heroes'],
    ['banSide=against', 'heroes'],
    ['teamMap=Ilios&mapEvidence=open', 'maps'],
    ['chapter=maps', 'maps'],
    ['combatMetric=deaths&combatView=outcome', 'team'],
    ['trendMetric=eliminations', 'team'],
    ['tab=stats', 'team']
  ]
  for (const [query, topic] of links) assert.deepEqual(read(query), { view: 'full', topic }, query)
})

test('explicit reading and topic choices override retained filters across view changes', () => {
  const query = new URLSearchParams('analysisView=brief&analysisTopic=members&teamOpponent=FCR26-T010&teamMap=Ilios&member=FCR26-P0003&memberMetric=healing&analysisStage=SWISS')
  assert.deepEqual(getAnalysisReading(query), { view: 'brief', topic: 'members' })
  query.set('analysisView', 'full')
  assert.deepEqual(getAnalysisReading(query), { view: 'full', topic: 'members' })
  assert.equal(query.get('member'), 'FCR26-P0003')
  query.delete('teamOpponent')
  query.delete('teamMap')
  assert.deepEqual(getAnalysisReading(query), { view: 'full', topic: 'members' })
})

test('findings enter an exact topic and comparison context instead of a generic report', () => {
  assert.deepEqual(getFindingDestination({ section: 'opponents', opponentId: 'MASK' }), {
    query: { analysisView: 'full', analysisTopic: 'opponents', teamOpponent: 'MASK' },
    evidence: 'performance-opponent-MASK', target: 'performance-opponents'
  })
  assert.deepEqual(getFindingDestination({ section: 'combat', metric: 'deaths', mode: 'outcome' }), {
    query: { analysisView: 'full', analysisTopic: 'team', combatMetric: 'deaths', combatView: 'outcome' },
    evidence: 'combat-evidence', target: 'performance-combat'
  })
  assert.deepEqual(getFindingDestination({ section: 'trend' }), {
    query: { analysisView: 'full', analysisTopic: 'team', trendMetric: 'eliminations' },
    evidence: null, target: 'performance-trend'
  })
  assert.equal(getFindingDestination({ section: 'maps', mapName: 'Ilios' }).query.teamMap, 'Ilios')
})

test('both modes resolve the same member including registered members with no appearances', () => {
  const withAbsent = buildTeamPerformance(rows, [{ player_id: 'unrecorded', name: 'No record', role: 'SUP' }])
  assert.equal(getAnalysisMember(withAbsent, new URLSearchParams('member=unrecorded')).maps, 0)
  assert.equal(getAnalysisMember(report, new URLSearchParams('member=FCR26-P0003')).id, 'FCR26-P0003')
  assert.equal(getAnalysisMember(report, new URLSearchParams('performanceMember=FCR26-P0002')).id, 'FCR26-P0002')
  assert.ok(getAnalysisMember(report, new URLSearchParams('member=invalid')).maps > 0)
  assert.equal(getAnalysisMember({ members: [] }, new URLSearchParams()), null)
})

test('cross-team links retain only the relevant context for a benchmark or opponent overview', () => {
  const params = new URLSearchParams('analysisStage=SWISS&combatMetric=eliminations&member=P1&teamOpponent=MASK&teamEvidence=combat-evidence')
  const overview = new URL(getAnalysisTeamPath('MASK', params), 'https://example.test')
  assert.equal(overview.pathname, '/teams/MASK/analysis')
  assert.deepEqual(Object.fromEntries(overview.searchParams), { analysisView: 'brief', analysisStage: 'SWISS' })
  const benchmark = new URL(getAnalysisTeamPath('HC', params, { comparison: true }), 'https://example.test')
  assert.deepEqual(Object.fromEntries(benchmark.searchParams), { analysisView: 'full', analysisStage: 'SWISS', analysisTopic: 'team', combatView: 'field', combatMetric: 'eliminations' })
  assert.equal(new URL(getAnalysisTeamPath('MASK', new URLSearchParams()), 'https://example.test').search, '?analysisView=brief')
})

test('quick read merges the overall edge into its matchup exception without duplicate findings', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const brief = buildScoutingBrief(report, [], locale)
    const lead = brief.findings[0]
    assert.equal(lead.opponentId, 'FCR26-T010')
    assert.match(lead.summary, /26\.3%/)
    assert.match(lead.summary, /18\.3%/)
    assert.match(lead.summary, /11\.5%/)
    assert.equal(lead.records.length, 10)
    assert.ok(!brief.findings.some(finding => ['combat-balance', 'higher-eliminations'].includes(finding.id)))
    assert.ok(brief.findings.length <= 3)
  }
})

test('review match shortcuts correspond to the actual bounded finding, excluding awarded results', () => {
  const lead = buildScoutingBrief(report).findings[0]
  const matches = getFindingMatches(report, lead)
  assert.deepEqual(matches.map(row => row.match.match_id), ['FCR26-PLAYOFFS-R1-M07', 'FCR26-PLAYOFFS-R1-M13'])
  assert.ok(matches.every(row => !row.administrative && !row.bye))
  assert.deepEqual(getFindingMatches(report, { ...lead, opponentId: undefined }), [])
  const broad = { opponentId: 'many', records: report.records }
  const shortcuts = getFindingMatches(report, broad)
  assert.equal(shortcuts.length, 2)
  assert.equal(shortcuts[0], report.played[0])
  assert.equal(shortcuts[1], report.played.at(-1))
})

test('changing stage removes out-of-scope findings; awarded-only histories do not create analysis', () => {
  const swiss = buildTeamPerformance(rows.filter(row => row.match.stage === 'SWISS'))
  const brief = buildScoutingBrief(swiss)
  assert.ok(brief.findings.every(finding => !finding.opponentId && finding.records.every(record => record.match.stage === 'SWISS')))
  const awarded = buildTeamPerformance(rows.filter(row => row.administrative || row.bye))
  assert.deepEqual(buildScoutingBrief(awarded).findings, [])
})
