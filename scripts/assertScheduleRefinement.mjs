import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { getMatchHubData } from '../src/lib/matchesSelectors.js'
import { getScheduleHighlightFact, getScheduleHighlights } from '../src/features/match-schedule/scheduleHighlights.js'
import { getExactScheduleTeam, getScheduleSearchTeams, getScheduleTeamCandidates } from '../src/features/match-schedule/scheduleTeamSearch.js'

function series(sequence, extra = {}) {
  return {
    match_id: 'sample', stage: 'PLAYOFFS', round: 'LB Final', status: 'COMPLETED', format: 'FT3',
    team_a: { id: 'A', short: 'AAA', name: 'Team Alpha', score: sequence.filter(side => side === 'A').length },
    team_b: { id: 'B', short: 'BBB', name: 'Team Beta', score: sequence.filter(side => side === 'B').length },
    maps: sequence.map(side => ({ map_name: 'Ilios', map_type: 'CONTROL', score_a: side === 'B' ? 0 : 2, score_b: side === 'A' ? 0 : 2, winner: side === 'DRAW' ? 'DRAW' : side })),
    ...extra
  }
}
const picked = selection => [selection.primary, ...selection.focus, ...selection.records].filter(Boolean).map(item => item.match)

test('comebacks use the eventual winner’s perspective and verified map sequence', () => {
  const a = getScheduleHighlightFact(series(['B', 'B', 'A', 'A', 'A']))
  assert.equal(a.label, '从 0:2 到 3:2')
  assert.equal(a.winnerSide, 'A')
  assert.match(a.detail, /^AAA 从 0:2/)
  const b = getScheduleHighlightFact(series(['A', 'A', 'B', 'B', 'B']), 'en-US')
  assert.equal(b.label, 'From 0:2 to 3:2')
  assert.equal(b.winnerSide, 'B')
  assert.match(b.detail, /^BBB came back/)
})

test('a deciding map needs the full published format and excludes draws', () => {
  const match = series(['A', 'A', 'B', 'B', 'A'])
  assert.equal(getScheduleHighlightFact(match).kind, 'decider')
  assert.equal(getScheduleHighlightFact({ ...match, format: 'BO5' }, 'en-US').label, 'All 5 maps')
  assert.equal(getScheduleHighlightFact({ ...match, format: '' }).kind, 'result')
  assert.equal(getScheduleHighlightFact(series(['A', 'DRAW', 'A', 'B', 'B', 'A'])).kind, 'result')
})

test('a finished flag cannot turn an impossible series or extra post-win maps into a story', () => {
  assert.equal(getScheduleHighlightFact(series(['B', 'A', 'A'])).kind, 'result')
  assert.equal(getScheduleHighlightFact(series(['A', 'A', 'A', 'B', 'B'])).kind, 'result')
  assert.equal(getScheduleHighlightFact(series(['B', 'B', 'A', 'A', 'A', 'A'])).kind, 'result')
})

test('missing or conflicting map evidence falls back to the ordinary published result', () => {
  const original = series(['B', 'B', 'A', 'A', 'A'])
  for (const edit of [
    match => { match.maps = [] },
    match => { match.maps.pop() },
    match => { match.maps[0].score_a = '' },
    match => { match.maps[0].score_b = null },
    match => { match.maps[0].winner = 'A' },
    match => { match.maps[0].winner = 'UNKNOWN' },
    match => { match.maps[0].is_administrative = true },
    match => { match.team_a.score = '' },
    match => { match.status = 'PENDING' }
  ]) {
    const match = structuredClone(original)
    edit(match)
    assert.equal(getScheduleHighlightFact(match).kind, 'result')
    assert.equal(getScheduleHighlightFact(match).progress.length, 0)
  }
})

test('awarded results are labelled as such and never presented as a comeback', () => {
  for (const extra of [{ is_forfeit: true }, { status: 'FORFEIT' }, { status: 'WALKOVER' }, { result_mode: 'ADMINISTRATIVE' }]) {
    const fact = getScheduleHighlightFact(series(['B', 'B', 'A', 'A', 'A'], extra))
    assert.equal(fact.kind, 'awarded')
    assert.equal(fact.progress.length, 0)
    assert.doesNotMatch(fact.detail, /逆转|追至|拿下/)
  }
})

test('FCR2026 highlights keep the final and cover Swiss and LCQ through real results', async () => {
  const db = JSON.parse(await readFile(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const hub = getMatchHubData(db, 'FCR2026', {})
  const selection = getScheduleHighlights(hub.matches, hub.keyArchiveMatches, db.season)
  assert.equal(selection.primary.match.match_id, 'FCR26-PLAYOFFS-R1-M14')
  assert.deepEqual(selection.focus.map(item => item.match.stage), ['SWISS', 'LCQ'])
  const ecnu = selection.focus.find(item => item.match.match_id === 'FCR26-LCQ-M14')
  assert.equal(ecnu.fact.label, '从 0:2 到 3:2')
  assert.match(ecnu.fact.detail, /^ECNU /)
  assert.equal(new Set(picked(selection).map(match => match.match_id)).size, 8)
})

test('explicit selections keep their priority, ignore blanks and cannot pull in pending or bye fixtures', () => {
  const matches = Array.from({ length: 10 }, (_, index) => series(['B', 'A', 'B', 'A', 'A'], { match_id: 'm' + index, stage: index === 9 ? 'SWISS' : 'PLAYOFFS' }))
  const pending = series([], { match_id: 'pending', status: 'PENDING' })
  const bye = series([], { match_id: 'bye', team_b: { id: 'bye', name: 'BYE', score: 0 } })
  const manual = matches.slice(0, 8).map(match => match.match_id)
  const selection = getScheduleHighlights([...matches, pending, bye], [matches[9]], { featuredMatchIds: ['', null, 'pending', 'bye', ...manual] })
  assert.equal(selection.primary.match.match_id, 'm0')
  assert.deepEqual(picked(selection).map(match => match.match_id).sort(), manual.sort())
  const blank = getScheduleHighlights(matches, [matches[9]], { featuredMatchIds: ['', null] })
  assert.equal(blank.primary.match.match_id, 'm9')
  assert.deepEqual(getScheduleHighlights([pending, bye]), { primary: null, focus: [], records: [] })
})

test('team candidates keep identities separate and count unique non-bye matches', () => {
  const nf = { id: 'nf', short: 'NF', name: 'Night Fury' }
  const nfa = { id: 'nfa', short: 'NFA', name: 'Night Fury Academy' }
  const other = { id: 'other', short: 'OP', name: 'Opponent' }
  const match = { match_id: 'one', team_a: nf, team_b: nfa }
  const teams = getScheduleSearchTeams([match, structuredClone(match), { match_id: 'two', team_a: nf, team_b: other }, { match_id: 'three', team_a: nf, team_b: { id: 'bye', name: 'BYE' } }])
  const candidates = getScheduleTeamCandidates(teams, ' ｎｆ ')
  assert.deepEqual(candidates.map(team => [team.id, team.matchCount]), [['nf', 2], ['nfa', 1]])
  assert.equal(getExactScheduleTeam(teams, 'NF').id, 'nf')
  assert.equal(getExactScheduleTeam(teams, 'Night Fury Academy').id, 'nfa')
  assert.equal(getExactScheduleTeam(teams, 'Night'), null)
  assert.deepEqual(getScheduleTeamCandidates(teams, ''), [])
  assert.deepEqual(getScheduleTeamCandidates(teams, 'not-found'), [])
})

test('duplicate names require an explicit identity selection and cannot auto-pick on Enter', () => {
  const teams = [{ id: 'a', short: 'SAME', full: 'Same name', matchCount: 1 }, { id: 'b', short: 'SAME', full: 'Same name', matchCount: 5 }]
  assert.equal(getExactScheduleTeam(teams, 'same'), null)
  assert.equal(getScheduleTeamCandidates(teams, 'same')[0].id, 'b')
  assert.equal(getScheduleTeamCandidates(teams, 'same', 1).length, 1)
})
