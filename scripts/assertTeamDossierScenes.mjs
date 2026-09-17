import assert from 'node:assert/strict'
import test from 'node:test'
import { getDossierSeasonStory, getDossierViewHref, getDossierGalleryCast, getDossierSceneRows } from '../src/features/team-dossier/teamDossierScenes.js'

const row = (id, round, tone = 'win', opponent = id) => ({ match: { match_id: id, stage: 'PLAYOFFS', round }, decided: true, complete: true, administrative: false, tone, opponent: { id: opponent } })
const champion = { isArchived: true, rank: 1 }
test('an undated bye follows its published round, not the beginning of the season', () => {
  const bye = { ...row('bye', 'Round 6'), bye: true, match: { match_id: 'bye', stage: 'SWISS', round: 'Round 6' } }
  const swiss = [1, 2, 3, 4, 5].map(round => ({ ...row(`R${round}`, `Round ${round}`), match: { match_id: `R${round}`, stage: 'SWISS', round: `Round ${round}` } }))
  const rows = [bye, ...swiss, row('playoffs', 'UB QF')]
  const ordered = getDossierSceneRows(rows)
  assert.deepEqual(ordered.map(item => item.match.match_id), ['R1', 'R2', 'R3', 'R4', 'R5', 'bye', 'playoffs'])
  assert.equal(rows[0], bye)
  assert.equal(bye.match.scheduled_at, undefined)
})
test('a comeback requires a published championship and an actual lower bracket recovery', () => {
  const rows = [row('1', 'UB SF', 'loss', 'MASK'), row('2', 'LB R2'), row('3', 'LB F', 'win', 'MASK'), row('4', 'Grand Final')]
  const story = getDossierSeasonStory(rows, champion)
  assert.equal(story.comeback, true)
  assert.deepEqual(story.milestones.map(item => item.match.match_id), ['1', '3', '4'])
  assert.equal(getDossierSeasonStory(rows, { isArchived: false, rank: 1 }).comeback, false)
  assert.equal(getDossierSeasonStory(rows, { isArchived: true, rank: null }).comeback, false)
})
test('administrative results cannot manufacture a dramatic loss or comeback', () => {
  const loss = { ...row('1', 'UB SF', 'loss'), administrative: true }
  const rows = [loss, row('2', 'LB F'), row('3', 'Grand Final')]
  assert.equal(getDossierSeasonStory(rows, champion).comeback, false)
  assert.equal(getDossierSeasonStory(rows, champion).milestones.some(item => item.administrative), false)
})
test('empty and active seasons keep honest focus without a championship story', () => {
  assert.equal(getDossierSeasonStory([], champion).focus, null)
  const live = { ...row('2', 'UB QF'), decided: false, complete: false, live: true, tone: 'live' }
  const story = getDossierSeasonStory([row('1', 'Round 1'), live], { isArchived: false })
  assert.equal(story.focus, live)
  assert.equal(story.comeback, false)
  assert.match(story.title, /仍在继续/)
})
test('a short season cannot repeat the same match as multiple milestones', () => {
  const single = row('1', 'Grand Final')
  assert.deepEqual(getDossierSeasonStory([single], champion).milestones, [single])
})
test('the general season story includes an available win between opening and closing losses', () => {
  const rows = [row('first', 'Round 1', 'loss'), row('entry', 'UB QF', 'loss'), row('win', 'LB R1'), row('last', 'LB R2', 'loss')]
  const story = getDossierSeasonStory(rows, { isArchived: true, rank: 6 })
  assert.deepEqual(story.milestones.map(item => item.match.match_id), ['first', 'win', 'last'])
  assert.equal(story.comeback, false)
})
test('page switching preserves season, member and match selection, but clears conflicting legacy chapters', () => {
  const gallery = getDossierViewHref('/teams/A/journey', '?season=QGCS4&design=kpr5&lang=en&chapter=maps&teamMatch=M1&member=P1&tab=stats', 'gallery')
  const url = new URL(gallery, 'http://localhost')
  assert.equal(url.pathname, '/teams/A')
  assert.equal(url.searchParams.get('member'), 'P1')
  assert.equal(url.searchParams.get('teamMatch'), 'M1')
  assert.equal(url.searchParams.get('season'), 'QGCS4')
  assert.equal(url.searchParams.has('chapter'), false)
  assert.equal(url.searchParams.has('tab'), false)
  assert.equal(getDossierViewHref('/teams/A', '', 'journey', 'maps'), '/teams/A/journey?chapter=maps')
})
test('gallery cast uses recorded appearances without adding heroes to unrecorded members', () => {
  const roster = ['TANK', 'DPS', 'DPS', 'SUP', 'SUP', 'SUP'].map((role, index) => ({ player_id: `P${index}`, role, maps_played: index < 5 ? 3 : 0, most_played_hero: 'Kiriko' }))
  const original = JSON.stringify(roster)
  assert.equal(getDossierGalleryCast(roster).length, 5)
  assert.equal(getDossierGalleryCast(roster).some(player => player.player_id === 'P5'), false)
  assert.equal(JSON.stringify(roster), original)
})
