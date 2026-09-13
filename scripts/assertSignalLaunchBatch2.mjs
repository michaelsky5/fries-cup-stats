import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { getTeamSeasonPresentation } from '../src/lib/teamSeasonPresentation.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getBroadcastInfo, BROADCAST_REPLAY_ARCHIVE_URL } from '../src/lib/broadcastSelectors.js'
import { getSeasonById } from '../src/config/seasons.js'
import { filterMatches } from '../src/lib/matchesSelectors.js'

const season = { id: 'TEST', rules: { competitionFormat: 'GROUP', groupStage: { expectedMatches: 0 }, advance: { playoffs: { matchCount: 0 } } } }
const teams = ['A', 'B', 'C', 'D'].map(team_id => ({ team_id, team_short_name: team_id }))
const final = {
  match_id: 'TEST-FINAL', stage: 'PLAYOFFS', round: 'GRAND FINALS', status: 'COMPLETE', format: 'FT4',
  team_a: { id: 'A', short: 'A', score: 4 }, team_b: { id: 'B', short: 'B', score: 0 },
  maps: [{ map_order: 1, map_name: 'Ilios', map_type: 'CONTROL', score_a: 2, score_b: 0, team_a_stats: [], team_b_stats: [] }]
}
const db = { teams, matches: [final], players: [] }
const present = (team, input = {}) => getTeamSeasonPresentation({ db, season, team, ...input })

test('team dossier links use exact identity while typed search remains flexible', () => {
  const matches = [
    { ...final, match_id: 'NF-A', team_a: { id: 'T-NF', short: 'NF', name: 'Nova Fury' } },
    { ...final, match_id: 'NF-B', team_b: { team_id: 'T-NF', team_short_name: 'NF' } },
    { ...final, match_id: 'NFA-A', team_a: { id: 'T-NFA', short: 'NFA', name: 'Nova Fury Academy' } }
  ]
  assert.deepEqual(filterMatches(matches, { team: 'NF', teamId: 'T-NF' }).map(row => row.match_id), ['NF-A', 'NF-B'])
  assert.equal(filterMatches(matches, { team: 'NF' }).length, 3)
  assert.deepEqual(filterMatches(matches, { team: 'Nova' }).map(row => row.match_id), ['NF-A', 'NFA-A'])
  assert.equal(filterMatches(matches, { team: 'NF', teamId: 'missing' }).length, 0)
})

test('archived standings use published places and never qualification-zone wording', () => {
  const rankedDb = { ...db, teams: teams.map((team, i) => ({ ...team, final_rank: i + 1 })) }
  const champion = present(rankedDb.teams[0], { db: rankedDb })
  assert.equal(champion.label, '冠军')
  assert.equal(champion.heading, '最终名次')
  assert.equal(champion.code, 'FINAL STANDING')
  assert.equal(champion.zone, '最终第 1 名')
  assert.equal(present(rankedDb.teams[3], { db: rankedDb }).label, '第 4 名')
  assert.equal(present(rankedDb.teams[0], { db: rankedDb, locale: 'en-US' }).label, 'Champion')
})

test('a completed final resolves its two teams even when only another final place was published', () => {
  const partial = { ...db, teams: teams.map(team => team.team_id === 'D' ? { ...team, final_rank: 4 } : team) }
  assert.equal(present(teams[0], { db: partial }).rank, 1)
  assert.equal(present(teams[1], { db: partial }).rank, 2)
  assert.equal(present(teams[2], { db: partial }).rank, null)
  assert.equal(present(teams[2], { db: partial }).label, '未发布')
  assert.equal(present(partial.teams[3], { db: partial }).rank, 4)
})

test('incomplete group ranks cannot be silently converted into a final ranking', () => {
  const grouped = { ...db, teams: teams.map(team => ({ ...team, current_rank: 1 })) }
  assert.equal(present(grouped.teams[2], { db: grouped }).rank, null)
})

test('active events retain qualification and tiebreak states despite old final-rank fields', () => {
  const active = { ...db, matches: [final, { ...final, match_id: 'NEXT', status: 'PENDING' }] }
  const input = { db: active, groupCompetition: true, standing: { groupLabel: 'A', rank: 1, matchesPlayed: 3, qualified: true } }
  const view = present({ ...teams[0], final_rank: 1 }, input)
  assert.equal(view.isArchived, false)
  assert.equal(view.code, 'CURRENT STANDING')
  assert.equal(view.label, 'A 组第 1 名')
  assert.equal(view.zone, '已晋级')
  assert.equal(present(teams[0], { ...input, standing: { ...input.standing, requiresTiebreak: true } }).zone, '待加赛')
})

test('score-only maps remain readable without presenting missing player data as zeros', () => {
  const dossier = getMatchDossier(db, final.match_id)
  assert.equal(dossier.mapRecords.length, 1)
  assert.equal(dossier.mapRecords[0].scoreA, '2')
  assert.equal(dossier.mapRecords[0].hasStats, false)
  assert.equal(dossier.statsMapCount, 0)
  assert.equal(dossier.hasCompletePlayerStats, false)
  assert.equal(dossier.formatLabel, 'FT4')
  assert.equal(dossier.seriesPath[0].complete, true)
  assert.equal(getMatchDossier({ ...db, matches: [{ ...final, is_forfeit: true }] }, final.match_id).hasMapRecords, false)
  assert.equal(getMatchDossier({ ...db, matches: [{ ...final, is_forfeit: true }] }, final.match_id).mapCountLabel, '—')
  const pending = getMatchDossier({ ...db, matches: [{ ...final, status: 'PENDING' }] }, final.match_id)
  assert.equal(pending.mapRecords.length, 1)
  assert.equal(pending.mapRecords[0].scoreA, '—')
  assert.equal(pending.mapRecords[0].hasResult, false)
  assert.equal(pending.seriesPath[0].complete, false)
})

test('match replay links distinguish a direct recording from the tournament archive', () => {
  const match = { ...final, broadcast: { is_broadcast: true } }
  assert.equal(getBroadcastInfo(match).streamLinks[0].kind, 'archive')
  assert.equal(getBroadcastInfo(match).streamUrl, BROADCAST_REPLAY_ARCHIVE_URL)
  const direct = getBroadcastInfo({ ...match, replay_url: 'https://www.bilibili.com/video/BVtest' })
  assert.equal(direct.streamLinks[0].kind, 'replay')
  assert.equal(direct.streamLinks[0].label, '本场录像')
  assert.equal(getBroadcastInfo({ ...match, replay_url: 'javascript:alert(1)' }).streamLinks[0].kind, 'archive')
  assert.equal(getBroadcastInfo({ ...match, status: 'LIVE', broadcast: { is_broadcast: true, stream_url: 'https://live.bilibili.com/123' } }).streamUrl, 'https://live.bilibili.com/123')
})

test('broadcast names and BattleTags collapse aliases without merging distinct accounts', () => {
  const info = getBroadcastInfo({ ...final, broadcast: {
    casters: [{ name: '丧命', battle_tag: '丧命#51163' }], caster_a: '丧命', caster_b: '丧命#51163',
    referees: [{ name: '同名', battle_tag: '同名#111' }, { name: '同名', battle_tag: '同名#222' }]
  } })
  assert.equal(info.casters.length, 1)
  assert.equal(info.referees.length, 2)
})

test('the existing FCR26 archive keeps its champion and all grand-final maps', () => {
  const fixture = JSON.parse(fs.readFileSync('public/data/fcr2026_local_public.json', 'utf8'))
  const team = fixture.teams.find(row => row.team_id === 'FCR26-T026')
  assert.ok(team)
  const state = getTeamSeasonPresentation({ db: fixture, season: getSeasonById('FCR2026'), team })
  assert.equal(state.label, '冠军')
  const dossier = getMatchDossier(fixture, 'FCR26-PLAYOFFS-R1-M14')
  assert.equal(dossier.mapRecords.length, 4)
  assert.equal(dossier.statsMapCount, 4)
  assert.equal(dossier.hasCompletePlayerStats, true)
})
