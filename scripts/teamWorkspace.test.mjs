import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveWeeklySelection, buildWeeklyPreparation, weeklyTeamDestination } from '../src/features/weekly-competition/weeklyPreparationModel.js'
import { competitionSwitchSearch, teamWorkspaceSearch, withAccountCompetition } from '../src/features/my-space/accountCompetitionModel.js'

const teamA = { id: 'a', shortName: 'A', name: 'Team A' }
const teamB = { id: 'b', shortName: 'B', name: 'Team B' }
const entry = (team, accessMode) => ({ id: `entry-${team.id}`, seasonTeamId: team.id, team, accessMode, status: 'ACTIVE', players: [], weeks: [{ week: { id: `week-${team.id}`, status: 'CONFIRMATION_OPEN' }, participation: { status: 'PENDING' } }] })
const workspace = {
  userId: 'user', season: { id: 'season', status: 'ACTIVE' }, accessMode: 'WRITE',
  teams: [{ team: teamA, role: 'MANAGER', accessMode: 'WRITE' }, { team: teamB, role: 'PLAYER', accessMode: 'READ_ONLY' }],
  cycles: [{ id: 'cycle-a', status: 'ACTIVE', entries: [entry(teamA, 'WRITE')] }, { id: 'cycle-b', status: 'ACTIVE', entries: [entry(teamB, 'READ_ONLY')] }]
}

test('a manager in A can select B across cycles with their player permission', () => {
  const selected = resolveWeeklySelection(workspace, { teamId: 'b' })
  assert.equal(selected.invalid, false)
  assert.equal(selected.cycle.id, 'cycle-b')
  assert.equal(selected.entry.id, 'entry-b')
  assert.equal(selected.weekRecord.week.id, 'week-b')
  assert.equal(selected.teamAccess.role, 'PLAYER')
  const plans = buildWeeklyPreparation(workspace, { seasonId: 'season', userId: 'user', readOnly: false }).plans
  assert.equal(plans.find(plan => plan.team.id === 'a').writable, true)
  assert.equal(plans.find(plan => plan.team.id === 'b').writable, false)
})

test('mismatched or inaccessible explicit team links never fall back to another team', () => {
  for (const requested of [{ teamId: 'foreign' }, { teamId: 'b', entryId: 'entry-a' }, { teamId: 'b', weekId: 'week-a' }]) {
    assert.equal(resolveWeeklySelection(workspace, requested).invalid, true)
  }
  assert.equal(resolveWeeklySelection(workspace, { teamId: 'b', entryId: 'entry-a' }).entry, null)
  assert.equal(resolveWeeklySelection(workspace, { teamId: 'b', cycleId: 'cycle-a' }).entry, null)
})

test('a linked manager team without a cycle still has a valid coach-management context', () => {
  const noEntry = { ...workspace, teams: [...workspace.teams, { team: { id: 'c', name: 'Team C' }, role: 'MANAGER', accessMode: 'WRITE' }] }
  const selected = resolveWeeklySelection(noEntry, { teamId: 'c' })
  assert.equal(selected.invalid, false)
  assert.equal(selected.teamAccess.team.id, 'c')
  assert.equal(selected.entry, null)
  assert.equal(selected.cycle, null)
})

test('team switching keeps event and language and removes other-team form and task state', () => {
  const params = new URLSearchParams(teamWorkspaceSearch('?season=PUBLIC&competition=WEEKLY&lang=en&design=kpr5&team=a&cycle=cycle-a&entry=entry-a&week=week-a&manage=coaches&step=lineup&task=old&journey=old&token=secret', 'b'))
  assert.deepEqual(Object.fromEntries(params), { season: 'PUBLIC', lang: 'en', design: 'kpr5', competition: 'WEEKLY', section: 'team', team: 'b' })
  const nextEvent = new URLSearchParams(competitionSwitchSearch(`?${params}`, 'OTHER'))
  assert.equal(nextEvent.has('team'), false)
})

test('preparation action links name their team instead of inheriting another team selection', () => {
  assert.equal(new URL(weeklyTeamDestination('cycle-b', 'entry-b', 'week-b', 'roster', 'b'), 'https://test').searchParams.get('team'), 'b')
  const plans = buildWeeklyPreparation(workspace, { seasonId: 'season', userId: 'user', readOnly: false }).plans
  for (const plan of plans) {
    assert.equal(new URL(plan.actionUrl, 'https://test').searchParams.get('team'), plan.team.id)
    for (const stage of plan.stages) assert.equal(new URL(stage.actionUrl, 'https://test').searchParams.get('team'), plan.team.id)
  }
})

test('personal navigation retains the chosen team without contaminating other event or entry links', () => {
  const source = '?competition=WEEKLY&team=b'
  assert.equal(withAccountCompetition('/me?section=team', 'WEEKLY', source), '/me?section=team&competition=WEEKLY&team=b')
  assert.equal(withAccountCompetition('/me?section=team&entry=entry-a', 'WEEKLY', source), '/me?section=team&entry=entry-a&competition=WEEKLY')
  assert.equal(withAccountCompetition('/me?competition=OTHER', 'WEEKLY', source), '/me?competition=OTHER')
  assert.equal(withAccountCompetition('/teams/a', 'WEEKLY', source), '/teams/a')
})
