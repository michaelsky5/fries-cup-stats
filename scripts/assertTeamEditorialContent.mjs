import assert from 'node:assert/strict'
import test from 'node:test'
import { getDossierMatch, getDossierMapPool } from '../src/features/team-dossier/teamDossierPresentation.js'
import { getTeamSharedAppearances, getTeamReadingFindings, getTeamSeasonChapters } from '../src/features/team-dossier/teamEditorialContent.js'

const map = (overrides = {}) => ({ map_name: 'Ilios', map_type: 'Control', score_a: 2, score_b: 0, ...overrides })
const row = (id, overrides = {}, side = 'team_a') => getDossierMatch({ side, opponent: { id: 'B' }, opponentLabel: 'B', match: { match_id: id, stage: 'SWISS', round: 'Round 1', status: 'COMPLETE', team_a: { id: 'A', score: 1 }, team_b: { id: 'B', score: 0 }, maps: [map()], ...overrides } })
const roster = Array.from({ length: 6 }, (_, i) => ({ player_id: `P${i}` }))
const five = roster.slice(0, 5).map(player => ({ player_id: player.player_id }))

test('shared appearances count exact five-person map records, including real changes in lineup', () => {
  const rows = [row('M1', { maps: [map({ team_a_stats: [...five, five[0]] }), map({ team_a_stats: five })] }), row('M2', { maps: [map({ team_a_stats: [five[0], five[1], five[2], five[3], { player_id: 'P5' }] })] })]
  const result = getTeamSharedAppearances(roster, rows)
  assert.equal(result.completeMaps, 3)
  assert.equal(result.cohort.records.length, 2)
  assert.deepEqual(result.cohort.playerIds, ['P0', 'P1', 'P2', 'P3', 'P4'])
  assert.equal(result.members.find(member => member.playerId === 'P5').maps, 1)
})

test('partial, administrative and opponent-only samples do not become shared team appearances', () => {
  const rows = [row('M1', { maps: [map({ team_a_stats: five.slice(0, 4), team_b_stats: five })] }), row('M2', { is_forfeit: true, maps: [map({ team_a_stats: five })] }), row('M3', { maps: [map({ team_a_stats: roster })] })]
  assert.equal(getTeamSharedAppearances(roster, rows).cohort, null)
  assert.equal(getTeamSharedAppearances([], []).completeMaps, 0)
})

test('findings prioritise recorded volume and keep a low-sample map out of the review selection', () => {
  const maps = [
    { name: 'Main', maps: 7, wins: 6, losses: 1, winRate: 6 / 7, records: [] },
    { name: 'Tiny', maps: 1, wins: 0, losses: 1, winRate: 0, records: [] },
    { name: 'Review', maps: 3, wins: 1, losses: 2, winRate: 1 / 3, records: [] }
  ]
  const result = getTeamReadingFindings(maps)
  assert.equal(result.most.name, 'Main')
  assert.equal(result.review.name, 'Review')
  assert.equal(result.samples, 11)
  assert.deepEqual(result.small.map(item => item.name), ['Tiny'])
  assert.equal(getTeamReadingFindings([]).most, null)
  assert.equal(getTeamReadingFindings([maps[0]]).review, null)
  assert.equal(getTeamReadingFindings([maps[0], { ...maps[0], name: 'Tied' }]).mostTies, 1)
})

test('rematch evidence uses the same map, known opponent and different match with changed result', () => {
  const a = row('M1', { maps: [map({ score_a: 0 })] })
  const b = row('M2')
  const c = { ...row('M3'), opponent: { id: 'C' } }
  const maps = getDossierMapPool([a, b, c])
  // The first score is a draw, so it is not described as a loss.
  assert.equal(getTeamReadingFindings(maps).rematch, null)
  const loss = row('M1', { maps: [map({ score_a: 0, score_b: 2 })] })
  const changed = getTeamReadingFindings(getDossierMapPool([loss, b, c])).rematch
  assert.equal(changed.before.match.match_id, 'M1')
  assert.equal(changed.after.match.match_id, 'M2')
  const unknown = [loss, b].map(item => ({ ...item, opponent: null, opponentLabel: 'TBA' }))
  assert.equal(getTeamReadingFindings(getDossierMapPool(unknown)).rematch, null)
  const sameMatch = row('M1', { maps: [map({ score_a: 0, score_b: 2 }), map()] })
  assert.equal(getTeamReadingFindings(getDossierMapPool([sameMatch])).rematch, null)
})

test('journal follows the actual season with opening, loss, rematch and verified championship', () => {
  const rows = [row('S1'), row('S2'), row('BYE', { team_b: { id: 'BYE', score: 0 } }), row('LOSS', { stage: 'PLAYOFFS', round: 'WB SF', team_a: { score: 2 }, team_b: { score: 3 } }), row('ADMIN', { stage: 'PLAYOFFS', round: 'LB R2', is_forfeit: true }), row('RETURN', { stage: 'PLAYOFFS', round: 'LB F' }), row('FINAL', { stage: 'PLAYOFFS', round: 'Grand Final' })]
  const chapters = getTeamSeasonChapters(rows, { isArchived: true, rank: 1 })
  assert.deepEqual(chapters.map(item => item.kind), ['opening', 'setback', 'return', 'champion'])
  assert.equal(chapters[0].records.length, 2)
  assert.equal(chapters[2].previous.match.match_id, 'LOSS')
  assert.match(chapters[2].reading, /通往总决赛/)
  assert.equal(chapters.at(-1).row.match.match_id, 'FINAL')
  assert.doesNotMatch(chapters.map(item => item.reading).join(' '), /ADMIN|BYE/)
})

test('active, single-match, absent and administrative-only seasons do not invent a title or history', () => {
  const final = row('FINAL', { stage: 'PLAYOFFS', round: 'Grand Final' })
  const active = getTeamSeasonChapters([row('S1'), final], { isArchived: false, rank: 1 }, 'en-US')
  assert.equal(active.at(-1).kind, 'latest')
  assert.doesNotMatch(active.map(item => item.title).join(' '), /title|champion/i)
  assert.equal(getTeamSeasonChapters([row('S1')], { isArchived: true }).length, 1)
  assert.deepEqual(getTeamSeasonChapters([], { isArchived: true }), [])
  assert.deepEqual(getTeamSeasonChapters([row('M1', { is_forfeit: true })], { isArchived: true }), [])
  assert.doesNotMatch(getTeamSeasonChapters([row('S1'), row('M2', { stage: 'PLAYOFFS', round: 'Grand Final', team_a: { score: 0 }, team_b: { score: 1 } })], { isArchived: true, rank: 2 }).map(item => item.title).join(' '), /冠军/)
})

test('a loss inside the opening stage stays inside that chapter, before later stage transitions', () => {
  const loss = { team_a: { score: 0 }, team_b: { score: 1 } }
  const rows = [row('S1'), row('S2', loss), row('S3'), row('LCQ', { stage: 'LCQ' }), row('PLAYOFFS', { stage: 'PLAYOFFS', ...loss }), row('LAST', { stage: 'PLAYOFFS', ...loss })]
  const chapters = getTeamSeasonChapters(rows, { isArchived: true, rank: 6 })
  assert.deepEqual(chapters.map(chapter => chapter.row.match.match_id), ['S3', 'LCQ', 'PLAYOFFS', 'LAST'])
  assert.equal(chapters[0].kind, 'opening')
  assert.equal(chapters[0].records.length, 3)
  assert.match(chapters[0].reading, /2 胜 1 负/)
})
