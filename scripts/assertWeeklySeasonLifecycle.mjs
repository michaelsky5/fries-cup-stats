import assert from 'node:assert/strict'
import { getSeasonStatus } from '../src/lib/homeSelectors.js'
import { getMatchHubData } from '../src/lib/matchesSelectors.js'
import { getAdvancePhaseState } from '../src/lib/advanceSelectors.js'
import { getExplicitWeeklyCompletion } from '../src/lib/weeklySeasonLifecycle.js'

const season = { id: 'LOCAL-WEEKLY', lifecycle: 'ACTIVE', rules: { weeklyCompetition: { enabled: true } } }
const db = { season: { status: 'ACTIVE' }, weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [{ status: 'CLOSED' }] }, matches: [{ match_id: 'W1-M1', status: 'COMPLETE', team_a: { id: 'a', score: 3 }, team_b: { id: 'b', score: 2 } }], teams: [] }
const states = snapshot => [getSeasonStatus(snapshot, season).isFinished, getMatchHubData(snapshot, season).isArchive, getAdvancePhaseState(snapshot, season).seasonFinished]
assert.deepEqual(states(db), [false, false, false], 'One completed published week does not end the weekly season')
assert.deepEqual(states({ ...db, season: {} }), [false, false, false], 'Missing season status never infers an archive from a closed cycle')
assert.deepEqual(states({ ...db, season: { status: 'ARCHIVED' } }), [true, true, true], 'Explicit published archive is respected')
assert.equal(getExplicitWeeklyCompletion({ matches: db.matches }, { id: 'OTHER' }), null, 'Other formats retain their existing lifecycle')
console.log('Weekly season lifecycle: completed weeks and cycles remain active until explicit season archival.')
