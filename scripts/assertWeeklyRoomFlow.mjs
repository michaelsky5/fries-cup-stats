import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getRoomStageIndex, getRoomOperatingSides } from '../src/features/weekly-competition/weeklyRoomFlow.js'
import { buildWeeklyRoomPreview, PREVIEW_STAGES, PREVIEW_ROLES } from '../src/pages/dev/weeklyRoomPreviewModel.js'

for (const [stage, expected] of Object.entries({ opening: 0, confirming: 0, choosing: 1, lineup: 2, banorder: 3, banning: 3, ready: 3, live: 4, paused: 4, review: 5, result: 6 })) {
  const data = buildWeeklyRoomPreview(stage)
  assert.equal(getRoomStageIndex(data), expected, stage)
}
const data = buildWeeklyRoomPreview('lineup')
data.map.lineupA = Array.from({ length: 5 }, (_, i) => ({ playerId: `a${i}` }))
assert.equal(getRoomStageIndex(data), 2, 'one saved lineup still waits for the opponent before banning')
data.map.lineupB = Array.from({ length: 5 }, (_, i) => ({ playerId: `b${i}` }))
assert.equal(getRoomStageIndex(data), 3, 'both lineups unlock the ban UI within the API BANNING phase')
data.opening.complete = true; data.opening.phase = 'COMPLETE'
assert.equal(getRoomStageIndex(data), 3, 'completed bans remain in the ban panel until actual start')
for (const mode of ['REFEREE', 'TEAM_CAPTAINS']) {
  for (const role of Object.keys(PREVIEW_ROLES)) {
    const room = buildWeeklyRoomPreview('ready', role)
    room.access.operatorMode = mode
    assert.equal(getRoomOperatingSides(room).length, role === 'staff' ? 2 : role === 'representative' ? 1 : 0, `${mode}/${role}`)
  }
}
const mapFive = buildWeeklyRoomPreview('review')
mapFive.map.order = 5; mapFive.match.format = 'FT3'
assert.equal(getRoomStageIndex(mapFive), 5, 'map number alone must not invent series completion')
mapFive.map.order = 2; mapFive.map.lineupA = []; mapFive.map.lineupB = []
mapFive.phase = 'PREPARING'; mapFive.opening.complete = false; mapFive.opening.phase = 'CHOOSING'
assert.equal(getRoomStageIndex(mapFive), 1, 'next map returns to selection instead of retaining the previous result stage')
for (const stage of Object.keys(PREVIEW_STAGES)) for (const role of Object.keys(PREVIEW_ROLES)) {
  const room = buildWeeklyRoomPreview(stage, role)
  assert.equal(room.access.canWrite, false)
  assert.equal(room.match.id, 'LOCAL-WEEKLY-PREVIEW')
}
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const preview = read('../src/pages/dev/WeeklyRoomDesignPreview.jsx')
assert.doesNotMatch(preview, /useWeeklyLiveRoom|platformRequest|liveRoomWrite|fetchRoomMessages/)
assert.match(preview, /messageLoader=\{messageLoader\}/)
const accountPreview = read('../src/pages/dev/AccountDesignPreviewPage.jsx')
assert.doesNotMatch(accountPreview, /EventRegistrationWorkspace/)
const view = read('../src/features/weekly-competition/WeeklyLiveRoomPage.jsx')
assert.match(view, /currentStage === 2/)
assert.match(view, /openingActive && !lineupStage && !inspectingStage/)
assert.doesNotMatch(read('../src/features/weekly-competition/OpeningSelectionPanel.jsx'), /className=\{styles.steps\}/)
console.log('Weekly room stage transitions, role gates, and preview isolation passed.')

const detail = read('../src/pages/matches/MatchDetailPage.jsx')
assert.match(detail, /dossier.roomPath/)
for (const file of ['../src/components/following/FollowingAccountBar.jsx', '../src/features/my-space/IdentitySpacePanels.jsx', '../src/features/account-ui/SpaceOverview.jsx', '../src/pages/matches/MatchDetailPage.jsx']) {
  assert.doesNotMatch(read(file), /`\/matches\/[^`]*\/room`/, `${file} must not link to the retired UI`)
}
const router = read('../src/app/router.jsx')
assert.match(router, /path: '\/matches\/:matchId\/room', loader:/, 'legacy bookmarks redirect instead of loading a second room')
assert.equal((router.match(/import\('..\/features\/weekly-competition\/WeeklyLiveRoomPage.jsx'\)/g) || []).length, 1)
