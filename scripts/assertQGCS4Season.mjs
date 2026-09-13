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
import { calculateSwissStandings } from '../src/lib/swissEngine.js'
import { getCurrentRoundSummary, getMatchHubData, getTeamLogoCandidates } from '../src/lib/matchesSelectors.js'
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
assert.equal(season.rules.competitionFormat, 'GROUP')
assert.deepEqual(season.rules.groupStage.administrativeLossScore, [0, 3])
assert.deepEqual(season.rules.groupStage.drawScore, [0, 0])

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
  const candidates = getTeamLogoCandidates(team, season.id)
  assert.equal(candidates[0], expectedUrl, `${teamId} logo mapping`)
  assert.equal(candidates.includes('/logos/QGCS4/OW.png'), true, `${teamId} logo fallback`)
  assert.equal(candidates.at(-1), '/logos/fc_logo.png', `${teamId} global logo fallback`)
  assert.equal(fs.existsSync(path.resolve('public/logos/QGCS4', fileName)), true, `${fileName} exists`)
}

const teamWithoutLogo = db.teams.find(team => team.team_id === 'QGCS4-T02')
assert.equal(getTeamLogoCandidates(teamWithoutLogo, season.id).includes('/logos/QGCS4/OW.png'), true)
assert.equal(fs.existsSync(path.resolve('public/logos/QGCS4/OW.png')), true, 'QGCS4 OW fallback exists')

const officialLogoTeam = {
  ...db.teams.find(team => team.team_id === 'QGCS4-T01'),
  team_logo: 'https://system.example/logo.png'
}
const officialLogoCandidates = getTeamLogoCandidates(officialLogoTeam, season.id)
assert.equal(officialLogoCandidates[0], 'https://system.example/logo.png')
assert.equal(officialLogoCandidates.includes('/logos/QGCS4/NF.png'), true)
assert.equal(officialLogoCandidates.includes('/logos/QGCS4/OW.png'), true)

const groups = getGroupStandings(db, season)
assert.deepEqual(groups.map(group => group.groupLabel), ['A', 'B', 'C', 'D'])
assert.deepEqual(groups.map(group => group.teamCount), [5, 5, 5, 4])
assert.deepEqual(groups.map(group => group.expectedMatches), [10, 10, 10, 6])

for (const group of groups) {
  const matches = db.matches.filter(match => match.group_label === group.groupLabel)
  const pairs = new Set(matches.map(match => [match.team_a.id, match.team_b.id].sort().join('::')))
  assert.equal(matches.length, group.expectedMatches, `Group ${group.groupLabel} match count`)
  assert.equal(pairs.size, matches.length, `Group ${group.groupLabel} unique pairings`)
}

const dayOne = db.matches.filter(match => match.competition_day === 1)
assert.equal(dayOne.length, 9)
assert.deepEqual([...new Set(dayOne.map(match => match.scheduled_time))], ['19:00', '20:00', '21:00', '22:00'])

const hachimiRoseCompass = db.matches.find(match => match.match_id === 'QGCS4-GROUP-B-M32')
assert.equal(hachimiRoseCompass?.scheduled_at, '2026-08-24T19:00:00+08:00')
assert.equal(hachimiRoseCompass?.team_a?.short, 'Hachimi')
assert.equal(hachimiRoseCompass?.team_b?.short, 'RC')

const dayFourLaneThree = db.matches.find(match => match.match_id === 'QGCS4-GROUP-D-M36')
assert.equal(dayFourLaneThree?.scheduled_at, '2026-08-27T22:00:00+08:00')
assert.equal(dayFourLaneThree?.lane, 3)

assert.deepEqual(getAdvancePhases(season, db), ['groups', 'playoffs', 'final'])
assert.equal(getDefaultAdvancePhase(db, season), 'groups')
assert.equal(getAdvanceSummary(db, season).competitionFormat, 'GROUP')

const overview = getGroupOverview(db, season)
assert.equal(overview.currentDay, 1)
assert.equal(overview.dayMatches, 9)
assert.equal(overview.expectedMatches, 36)

const roundSummary = getCurrentRoundSummary(db.matches)
assert.equal(roundSummary.stage, 'GROUP')
assert.equal(roundSummary.totalMatches, 9)
assert.equal(roundSummary.timeSlotCount, 4)
assert.equal(roundSummary.roundLabel, '小组赛第 1 比赛日')

const systemShapedDb = {
  ...db,
  matches: db.matches.map(match => ({
    ...match,
    competition_day: undefined,
    scheduled_date: undefined,
    scheduled_time: undefined,
    round: `GROUP ${match.group_label} / DAY 1`
  }))
}
const systemRoundSummary = getCurrentRoundSummary(systemShapedDb.matches)
assert.equal(systemRoundSummary.totalMatches, 9)
assert.equal(systemRoundSummary.timeSlotCount, 4)
assert.equal(new Set(systemRoundSummary.matches.map(match => match.scheduled_at.slice(0, 10))).size, 1)

const systemOverview = getGroupOverview(systemShapedDb, season)
assert.equal(systemOverview.currentDay, 1)
assert.equal(systemOverview.dayCount, 4)
assert.equal(systemOverview.dayMatches, 9)

const systemHub = getMatchHubData(systemShapedDb, season.id)
assert.equal(systemHub.currentRoundMatches.length, 9)
assert.equal(systemHub.roundTimeSlots.length, 4)

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

console.log('QGCS4 season fixture and group-stage adapters: OK')
