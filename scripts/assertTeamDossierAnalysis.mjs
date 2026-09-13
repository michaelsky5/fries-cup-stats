import assert from 'node:assert/strict'
import test from 'node:test'
import { getDossierMapAnalysis, getDossierMapMatchPath, getDossierMapReading } from '../src/features/team-dossier/teamDossierAnalysis.js'
import { getDossierView, getDossierViewHref } from '../src/features/team-dossier/teamDossierScenes.js'
import { getDossierMatch, getDossierMapPool } from '../src/features/team-dossier/teamDossierPresentation.js'

const map = (name, maps, wins, draws = 0) => ({ name, displayName: name, maps, wins, losses: maps - wins - draws, draws, winRate: wins / maps })

test('the reference line weights map records, rather than averaging map percentages', () => {
  const maps = [map('A', 9, 9), map('B', 1, 0)]
  const analysis = getDossierMapAnalysis(maps)
  assert.equal(analysis.samples, 10)
  assert.equal(analysis.winRate, .9)
  assert.equal(analysis.mostPlayed.name, 'A')
  assert.equal(analysis.smallSampleCount, 1)
  assert.equal(maps[0].maps, 9)
})

test('coincident maps share a coordinate without hiding names or changing their data', () => {
  const maps = [map('A', 1, 1), map('B', 1, 1), map('C', 2, 2), map('D', 2, 1)]
  const analysis = getDossierMapAnalysis(maps)
  assert.equal(analysis.groups.length, 3)
  assert.deepEqual(analysis.groups[0].maps.map(item => item.name), ['A', 'B'])
  assert.equal(analysis.groups[0].samples, 1)
  assert.equal(analysis.groups[0].winRate, 1)
  assert.deepEqual(analysis.groups.flatMap(group => group.maps), maps)
  assert.ok(analysis.ticks.every(Number.isInteger))
  assert.ok(analysis.maxX >= 2)
})

test('empty and single-record seasons have finite axes and no invented baseline or advantage', () => {
  const empty = getDossierMapAnalysis([])
  assert.equal(empty.winRate, null)
  assert.equal(empty.mostPlayed, null)
  assert.deepEqual(empty.groups, [])
  assert.ok(empty.maxX > 0)
  assert.match(getDossierMapReading(null, empty), /发布后/)
  const single = map('A', 1, 1)
  const analysis = getDossierMapAnalysis([single])
  assert.match(getDossierMapReading(single, analysis), /还不足以/)
  assert.match(getDossierMapReading(single, analysis, 'en-US'), /not an established pattern/)
})

test('draws are in the win-rate denominator and a zero percent result is not missing data', () => {
  const maps = [map('A', 3, 0, 2), map('B', 3, 2)]
  const analysis = getDossierMapAnalysis(maps)
  assert.equal(analysis.winRate, 2 / 6)
  assert.equal(analysis.groups[0].winRate, 0)
  assert.match(getDossierMapReading(maps[0], analysis), /低 33.3/)
})

test('unbeaten copy is used only with repeated wins, and comparisons are in percentage points', () => {
  const maps = [map('A', 7, 6), map('B', 5, 5), map('C', 20, 14)]
  const analysis = getDossierMapAnalysis(maps)
  assert.match(getDossierMapReading(maps[0], analysis), /高 7.6 个百分点/)
  assert.match(getDossierMapReading(maps[1], analysis), /5 份记录全部获胜/)
  assert.match(getDossierMapReading(maps[2], analysis, 'en-US'), /8.1 percentage points below/)
})

test('evidence outcomes are from the map and selected side, even when the series result differs', () => {
  const row = getDossierMatch({ side: 'team_b', match: {
    match_id: 'M1', status: 'COMPLETE', team_a: { id: 'A', score: 3 }, team_b: { id: 'B', score: 1 },
    maps: [
      { map_name: 'Ilios', map_type: 'Control', score_a: 0, score_b: 2 },
      { map_name: 'Ilios', map_type: 'Control', score_a: 2, score_b: 0 },
      { map_name: 'Ilios', map_type: 'Control', score_a: 0, score_b: 0 },
      { map_name: 'Oasis', map_type: 'Control', score_a: 0, score_b: null },
      { map_name: 'Oasis', map_type: 'Control', score_a: 0, score_b: 2, is_administrative: true }
    ]
  } })
  assert.equal(row.tone, 'loss')
  const pool = getDossierMapPool([row])
  assert.equal(pool.length, 1)
  assert.deepEqual(pool[0].records.map(record => record.mapOutcome), ['win', 'loss', 'draw'])
  assert.deepEqual(pool[0].records.map(record => record.mapOrder), [1, 2, 3])
  assert.equal(pool[0].winRate, 1 / 3)
  assert.equal(getDossierMapAnalysis(getDossierMapPool([{ ...row, administrative: true }])).samples, 0)
})

test('all three archive pages switch without nesting paths and preserve evidence and member selection', () => {
  for (const from of ['', '/journey', '/analysis/']) {
    for (const view of ['gallery', 'journey', 'analysis']) {
      const href = getDossierViewHref(`/teams/A${from}`, '?season=FCR2026&design=kpr5&lang=en&teamMap=Ilios&mapEvidence=open&member=P1&teamMatch=M1&chapter=records&tab=stats', view)
      const url = new URL(href, 'http://localhost')
      assert.equal(url.pathname, `/teams/A${view === 'gallery' ? '' : `/${view}`}`)
      assert.equal(getDossierView(url.pathname, url.search), view)
      for (const [key, value] of Object.entries({ season: 'FCR2026', design: 'kpr5', lang: 'en', teamMap: 'Ilios', mapEvidence: 'open', member: 'P1', teamMatch: 'M1' })) assert.equal(url.searchParams.get(key), value)
      assert.equal(url.searchParams.has('chapter'), false)
      assert.equal(url.searchParams.has('tab'), false)
    }
  }
})

test('legacy map and combat links open analysis, while match and roster links keep their pages', () => {
  assert.equal(getDossierView('/teams/A', '?chapter=maps'), 'analysis')
  assert.equal(getDossierView('/teams/A/journey', '?chapter=records'), 'analysis')
  assert.equal(getDossierView('/teams/A', '?tab=stats'), 'analysis')
  assert.equal(getDossierView('/teams/A', '?tab=matches'), 'journey')
  assert.equal(getDossierView('/teams/A', '?chapter=roster'), 'gallery')
})

test('map evidence opens the corresponding map chapter using the existing match URL contract', () => {
  assert.equal(getDossierMapMatchPath({ match: { match_id: 'M / 1' }, mapOrder: 3 }), '/matches/M%20%2F%201?map=3')
  assert.equal(getDossierMapMatchPath({ match: { match_id: 'M1' }, mapOrder: undefined }), '/matches/M1')
  assert.equal(getDossierMapMatchPath({ match: { match_id: 'M1' }, mapOrder: 0 }), '/matches/M1')
})
