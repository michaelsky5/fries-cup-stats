import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getAdvancePhases,
  getAdvanceSummary,
  getDefaultAdvancePhase,
  getGroupOverview,
  getGroupStandings
} from '../src/lib/advanceSelectors.js'
import { adaptBackendBracket } from '../src/lib/bracketAdapters.js'
import { getCurrentRoundSummary as getHomeCurrentRoundSummary } from '../src/lib/homeSelectors.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { filterTeams, getRosterRoleLabel, getTeamDirectory } from '../src/lib/rosterSelectors.js'
import { calculateSwissStandings } from '../src/lib/swissEngine.js'
import {
  getCurrentRoundSummary,
  getGroupedMatches,
  getMatchHubData,
  getMatchStatusText,
  getMatchesByRound,
  getRoundBadgeText,
  getRoundText,
  getTeamLogoCandidates,
  isForfeitMatch
} from '../src/lib/matchesSelectors.js'
import { getSeasonById, resolveSeasonFromUrl } from '../src/config/seasons.js'
import { selectNewestDbSnapshot } from '../src/lib/db.js'

const fixturePath = path.resolve('public/data/qgcs4_preseason_public.json')
const db = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
const season = getSeasonById('QGCS4')

assert.equal(season.id, 'QGCS4')
assert.equal(resolveSeasonFromUrl('QGCS4'), 'QGCS4')
assert.equal(db.teams.length, 19)
assert.equal(db.players.length, 116)
assert.equal(db.matches.length, 36)
assert.equal(db.group_standings.length, 4)
assert.equal(season.rules.competitionFormat, 'GROUP')
assert.deepEqual(season.rules.groupStage.administrativeLossScore, [0, 3])
assert.deepEqual(season.rules.groupStage.drawScore, [0, 0])
assert.equal(season.persistPublishedData, true)
assert.notEqual(season.preferDirectData, true)
assert.equal(season.dataUrl, 'https://admin.fries-cup.com/api/public/seasons/QGCS4/publish/latest/data')

const currentSnapshot = { updated_at: '2026-08-26T07:59:50.781Z' }
const staleFallbackSnapshot = { updated_at: '2026-08-23T00:30:00+08:00' }
assert.strictEqual(selectNewestDbSnapshot(currentSnapshot, staleFallbackSnapshot), currentSnapshot)
assert.strictEqual(selectNewestDbSnapshot(staleFallbackSnapshot, currentSnapshot), currentSnapshot)
assert.strictEqual(selectNewestDbSnapshot(currentSnapshot, { teams: [] }), currentSnapshot)
assert.strictEqual(selectNewestDbSnapshot(null, staleFallbackSnapshot), staleFallbackSnapshot)

const expectedTeamLogos = {
  'QGCS4-T01': 'NF.png',
  'QGCS4-T03': 'WHG X SPC.png',
  'QGCS4-T04': 'HUWET.png',
  'QGCS4-T05': 'HCM.jpg',
  'QGCS4-T06': 'SK.png',
  'QGCS4-T09': '5FW.png',
  'QGCS4-T11': 'ENPB.jpg',
  'QGCS4-T12': 'RC.png',
  'QGCS4-T14': 'SPS.png',
  'QGCS4-T15': 'FUM.png',
  'QGCS4-T16': 'SPSV.png',
  'QGCS4-T19': 'NFA.png'
}

for (const [teamId, fileName] of Object.entries(expectedTeamLogos)) {
  const team = db.teams.find(item => item.team_id === teamId)
  const expectedUrl = `/logos/QGCS4/${encodeURIComponent(fileName)}`
  assert.equal(getTeamLogoCandidates(team, season.id)[0], expectedUrl, `${teamId} logo mapping`)
  assert.equal(getTeamLogoCandidates(team, season.id).includes('/logos/QGCS4/OW.png'), true, `${teamId} season logo fallback`)
  assert.equal(getTeamLogoCandidates(team, season.id).at(-1), '/logos/fc_logo.png', `${teamId} global logo fallback`)
  assert.equal(fs.existsSync(path.resolve('public/logos/QGCS4', fileName)), true, `${fileName} exists`)
}

const teamWithoutLogo = db.teams.find(team => team.team_id === 'QGCS4-T02')
assert.deepEqual(getTeamLogoCandidates(teamWithoutLogo, season.id), ['/logos/QGCS4/OW.png', '/logos/fc_logo.png'])
assert.equal(fs.existsSync(path.resolve('public/logos/QGCS4/OW.png')), true, 'QGCS4 OW fallback exists')

const groups = getGroupStandings(db, season)
assert.deepEqual(groups.map(group => group.groupLabel), ['A', 'B', 'C', 'D'])
assert.deepEqual(groups.map(group => group.teamCount), [5, 5, 5, 4])
assert.deepEqual(groups.map(group => group.expectedMatches), [10, 10, 10, 6])
assert.equal(groups.every(group => group.rows[0].status === 'advance_zone'), true)
assert.equal(groups.some(group => group.rows.some(row => row.qualified)), false)

for (const group of groups) {
  const matches = db.matches.filter(match => match.group_label === group.groupLabel)
  const pairs = new Set(matches.map(match => [match.team_a.id, match.team_b.id].sort().join('::')))
  assert.equal(matches.length, group.expectedMatches, `Group ${group.groupLabel} match count`)
  assert.equal(pairs.size, matches.length, `Group ${group.groupLabel} unique pairings`)
}

const matchesByDate = Map.groupBy(db.matches, match => match.scheduled_at.slice(0, 10))
assert.deepEqual([...matchesByDate.values()].map(matches => matches.length), [10, 10, 8, 8])
assert.equal(new Set(matchesByDate.get('2026-08-24').map(match => match.round)).size > 1, true)

assert.deepEqual(getAdvancePhases(season, db), ['groups', 'playoffs', 'final'])
assert.equal(getDefaultAdvancePhase(db, season), 'groups')
assert.equal(getAdvanceSummary(db, season).competitionFormat, 'GROUP')

const overview = getGroupOverview(db, season)
assert.equal(overview.currentDay, 1)
assert.equal(overview.dayCount, 4)
assert.equal(overview.dayMatches, 10)
assert.equal(overview.expectedMatches, 36)

const roundSummary = getCurrentRoundSummary(db.matches)
assert.equal(roundSummary.stage, 'GROUP')
assert.equal(roundSummary.totalMatches, 10)
assert.equal(roundSummary.timeSlotCount, 4)
assert.equal(roundSummary.roundLabel, '小组赛第 1 比赛日')
assert.equal(new Set(roundSummary.matches.map(match => match.scheduled_at.slice(0, 10))).size, 1)
assert.equal(getRoundText(roundSummary.matches[0]), 'A 组小组赛 · 第 1 比赛日')
assert.equal(getRoundBadgeText(roundSummary.matches[0]), 'A组 · D1')

const firstDayGroups = getGroupedMatches(roundSummary.matches, 'date')
assert.equal(firstDayGroups.length, 4)
assert.deepEqual(firstDayGroups.map(group => group.matches.length).sort((a, b) => a - b), [2, 2, 3, 3])

const allRoundMatches = getMatchesByRound(db.matches, 'ALL')
assert.equal(allRoundMatches.length, 10)
assert.equal(new Set(allRoundMatches.map(match => match.scheduled_at.slice(0, 10))).size, 1)

const homeRoundSummary = getHomeCurrentRoundSummary(db)
assert.equal(homeRoundSummary.total, 10)
assert.equal(homeRoundSummary.roundLabel, '小组赛第 1 比赛日')
assert.equal(new Set(homeRoundSummary.matches.map(match => match.scheduled_at.slice(0, 10))).size, 1)

const hub = getMatchHubData(db, season.id)
assert.equal(hub.currentRoundMatches.length, 10)
assert.equal(hub.roundTimeSlots.length, 4)

const teams = getTeamDirectory(db)
assert.deepEqual(Array.from(new Set(teams.map(team => team.groupLabel))).sort(), ['A', 'B', 'C', 'D'])
assert.equal(filterTeams(teams, { group: 'D' }).length, 4)

const openingDossier = getMatchDossier(db, 'QGCS4-GROUP-R1-M01')
const flexPlayer = openingDossier.rosters.teamB.find(player => player.name === '鸢尾')
const namedPlayer = openingDossier.rosters.teamA.find(player => player.name === 'suna')
const battleTagOnlyPlayer = openingDossier.rosters.teamA.find(player => player.name === 'BLILoveLai30#5917')
assert.equal(openingDossier.stageLabel, 'A 组小组赛')
assert.equal(openingDossier.roundLabel, '第 1 比赛日')
assert.equal(flexPlayer?.role, 'FLEX')
assert.equal(flexPlayer?.battleTag, 'Iris#54201')
assert.equal(namedPlayer?.battleTag, 'suna#51965')
assert.equal(battleTagOnlyPlayer?.battleTag, '')
assert.equal(getRosterRoleLabel(flexPlayer?.role), '灵活')
assert.deepEqual(
  openingDossier.rosters.teamA.map(player => [player.name, player.role]),
  [
    ['suna', 'TANK'],
    ['BLILoveLai30#5917', 'TANK'],
    ['鬼影', 'DPS'],
    ['Moon1ightT', 'SUP'],
    ['爱将', 'SUP'],
    ['JUBE', 'SUP'],
    ['小五', 'FLEX']
  ]
)

const inferredForfeitMatch = {
  ...db.matches[0],
  match_id: 'QGCS4-INFERRED-FORFEIT',
  status: 'COMPLETE',
  result_mode: 'NORMAL',
  is_forfeit: false,
  forfeited_by: null,
  team_a: { ...db.matches[0].team_a, score: 3 },
  team_b: { ...db.matches[0].team_b, score: 0 },
  winner: db.matches[0].team_a.id,
  maps: [1, 2, 3].map(mapOrder => ({
    map_order: mapOrder,
    map_name: 'Default Win',
    map_type: 'ADMIN',
    score_a: 1,
    score_b: 0,
    winner: db.matches[0].team_a.id,
    is_administrative: true,
    reason: 'MAP_FORFEIT',
    forfeited_by: db.matches[0].team_b.short,
    notes: `${db.matches[0].team_b.short}全场弃权`,
    player_stats: [],
    team_a_stats: [],
    team_b_stats: []
  }))
}
assert.equal(isForfeitMatch(inferredForfeitMatch), true)
assert.equal(getMatchStatusText(inferredForfeitMatch), '弃权')
const inferredForfeitDossier = getMatchDossier({ ...db, matches: [inferredForfeitMatch] }, inferredForfeitMatch.match_id)
assert.equal(inferredForfeitDossier.state.isForfeit, true)
assert.equal(inferredForfeitDossier.hasMapRecords, false)
assert.equal(isForfeitMatch({
  ...inferredForfeitMatch,
  maps: [
    inferredForfeitMatch.maps[0],
    { ...inferredForfeitMatch.maps[1], is_administrative: false, reason: '', forfeited_by: null }
  ]
}), false)
assert.deepEqual(
  openingDossier.rosters.teamB.map(player => [player.name, player.role]),
  [
    ['冷冰冰', 'TANK'],
    ['黎明', 'DPS'],
    ['小小冬', 'SUP'],
    ['小源', 'SUP'],
    ['抹茶冰沙', 'SUP'],
    ['鸢尾', 'FLEX']
  ]
)

const oneCompletedGroupMatch = {
  ...db,
  matches: db.matches.map((match, index) => index === 0
    ? { ...match, status: 'COMPLETE', winner: match.team_a.id, team_a: { ...match.team_a, score: 3 }, team_b: { ...match.team_b, score: 0 } }
    : match)
}
const swissRows = calculateSwissStandings(oneCompletedGroupMatch)
assert.equal(swissRows.reduce((sum, row) => sum + Number(row.match_wins || 0), 0), 0)

const tiebreakDb = structuredClone(db)
tiebreakDb.group_standings[0].requires_tiebreak = true
tiebreakDb.group_standings[0].teams[0].requires_tiebreak = true
const tiebreakGroups = getGroupStandings(tiebreakDb, season)
assert.equal(tiebreakGroups[0].requiresTiebreak, true)
assert.equal(tiebreakGroups[0].rows[0].status, 'pending_tiebreak')

const bracket = adaptBackendBracket({
  phase: 'playoffs',
  format: 'single_elimination',
  rounds: [
    { label: 'GRAND FINALS', matches: [{ match_id: 'GF' }] },
    { label: 'SEMIFINALS', matches: [{ match_id: 'SF' }] },
    { label: 'THIRD PLACE', matches: [{ match_id: 'THIRD' }] },
    { label: 'QUARTERFINALS', matches: [{ match_id: 'QF' }] }
  ]
}, { phase: 'playoffs', bracketType: 'single_elimination' })
assert.deepEqual(bracket.rounds.map(round => round.label), ['QUARTERFINALS', 'SEMIFINALS', 'THIRD PLACE', 'GRAND FINALS'])

console.log('QGCS4 published fixture and group-stage adapters: OK')
