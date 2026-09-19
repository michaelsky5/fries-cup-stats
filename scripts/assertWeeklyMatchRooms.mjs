import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildWeeklyResponse,
  buildWeeklyRoomJourney,
  isWeeklyResponseReceipt,
  weeklyMatchPhase,
  selectWeeklyRoom,
  sortWeeklyRooms,
  weeklyResponseAccess,
  weeklyRoomError,
  weeklyRoomScore,
  weeklyRoomStatus
} from '../src/features/weekly-competition/weeklyMatchRoomModel.js'

const writable = { readOnly: false }
const makeRoom = () => ({
  id: 'weekly-match-a', revision: 3, resultFingerprint: 'current-result', ready: true,
  status: 'COMPLETE', confirmationState: 'PENDING', teamAId: 'team-a', teamBId: 'team-b',
  teamA: { id: 'team-a', shortName: 'A' }, teamB: { id: 'team-b', shortName: 'B' },
  scoreA: 2, scoreB: 0,
  cycle: { status: 'ACTIVE' }, week: { status: 'RESULT_REVIEW' },
  myTeams: [{
    team: { id: 'team-a', shortName: 'A' }, role: 'LEADER', accessMode: 'WRITE', canRespond: true,
    confirmation: { status: 'PENDING', revision: 3, isCurrent: true }
  }],
  otherTeamResponses: [{ confirmingTeam: { id: 'team-b' }, status: 'PENDING' }]
})

const room = makeRoom()
assert.equal(weeklyResponseAccess(room, room.myTeams[0], writable).allowed, true)
assert.equal(weeklyResponseAccess(room, room.myTeams[0]).allowed, false, 'missing write policy must fail closed')
assert.deepEqual(buildWeeklyResponse(room, 'team-a', 'CONFIRMED', '', writable), {
  input: { confirmingTeamId: 'team-a', status: 'CONFIRMED', note: '', expectedRevision: 3 }
})
assert.deepEqual(buildWeeklyResponse(room, 'team-a', 'DISPUTED', '  第 2 局计分有误  ', writable), {
  input: { confirmingTeamId: 'team-a', status: 'DISPUTED', note: '第 2 局计分有误', expectedRevision: 3 }
})
assert.ok(buildWeeklyResponse(room, 'team-b', 'CONFIRMED', '', writable).error, 'opponent is not a response target')
assert.ok(buildWeeklyResponse(room, 'unknown', 'CONFIRMED', '', writable).error)
assert.ok(buildWeeklyResponse(room, 'team-a', 'FINALIZED', '', writable).error)
assert.ok(buildWeeklyResponse(room, 'team-a', 'DISPUTED', ' ', writable).error)
assert.ok(buildWeeklyResponse(room, 'team-a', 'DISPUTED', 'a', writable).error)
assert.ok(buildWeeklyResponse(room, 'team-a', 'DISPUTED', 'a'.repeat(2001), writable).error)
assert.ok(buildWeeklyResponse(room, 'team-a', 'CONFIRMED', '', { readOnly: true }).error)

for (const mutate of [
  item => { item.myTeams[0].role = 'PLAYER' },
  item => { item.myTeams[0].role = 'COACH' },
  item => { item.myTeams[0].accessMode = 'READ_ONLY' },
  item => { item.myTeams[0].canRespond = false },
  item => { delete item.myTeams[0].canRespond },
  item => { item.myTeams[0].team.id = 'other-season-team' },
  item => { item.myTeams[0].confirmation = null },
  item => { item.myTeams[0].confirmation.revision = 2 },
  item => { item.myTeams[0].confirmation.isCurrent = false },
  item => { delete item.myTeams[0].confirmation.isCurrent },
  item => { item.myTeams[0].confirmation.status = 'EXPIRED' },
  item => { item.confirmationState = 'STALE' },
  item => { item.confirmationState = 'FINALIZED' },
  item => { item.confirmationState = 'OVERRIDDEN' },
  item => { item.myTeams[0].confirmation.status = 'FINALIZED' },
  item => { item.ready = false },
  item => { item.week.status = 'CLOSED' },
  item => { item.week.status = 'CANCELLED' },
  item => { item.week.status = 'PAIRING' },
  item => { item.cycle.status = 'CLOSED' },
  item => { item.cycle.status = 'CANCELLED' },
  item => { item.status = 'CANCELLED' }
]) {
  const blocked = makeRoom()
  mutate(blocked)
  assert.equal(weeklyResponseAccess(blocked, blocked.myTeams[0], writable).allowed, false, mutate.toString())
  assert.ok(buildWeeklyResponse(blocked, blocked.myTeams[0].team.id, 'CONFIRMED', '', writable).error)
}

for (const status of ['CONFIRMED', 'DISPUTED']) {
  const responsive = makeRoom()
  responsive.myTeams[0].confirmation.status = status
  assert.equal(weeklyResponseAccess(responsive, responsive.myTeams[0], writable).allowed, true)
}
const manager = makeRoom()
manager.myTeams[0].role = 'MANAGER'
assert.equal(weeklyResponseAccess(manager, manager.myTeams[0], writable).allowed, true)

assert.equal(weeklyRoomScore(room), '2 : 0', 'zero is a real score')
assert.equal(weeklyRoomScore({ scoreA: null, scoreB: null }), '— : —')
assert.equal(weeklyRoomScore({ scoreA: '2', scoreB: '0' }), '— : —')
assert.equal(weeklyRoomStatus({ ready: false }).label, '赛果待审核')
assert.equal(weeklyRoomStatus({ ready: true }).label, '等待开启确认')
assert.equal(weeklyRoomStatus({ confirmationState: 'DISPUTED' }).tone, 'red')
assert.equal(weeklyRoomStatus({ confirmationState: 'CONFIRMED' }).label, '双方已确认')
assert.match(weeklyRoomStatus({ confirmationState: 'CONFIRMED' }).detail, /不会自动增加积分/)
assert.equal(weeklyRoomStatus({ confirmationState: 'STALE' }).label, '赛果已更新')
assert.match(weeklyRoomStatus({ confirmationState: 'PENDING' }, { readOnly: true }).detail, /当前账号仅可查看/)
assert.doesNotMatch(weeklyRoomStatus({ confirmationState: 'PENDING' }, { readOnly: true }).detail, /代表本队确认/)

const scheduled = { ...makeRoom(), ready: false, status: 'PENDING', confirmationState: 'NOT_OPEN', scheduledAt: '2026-09-07T12:00:00Z' }
assert.equal(weeklyMatchPhase(scheduled), 'scheduled')
assert.equal(weeklyRoomStatus(scheduled).label, '等待开赛')
assert.doesNotMatch(buildWeeklyRoomJourney(scheduled).stages.map(stage => stage.label).join(' '), /等待审核|结算/)
assert.equal(buildWeeklyRoomJourney({ ...scheduled, status:'IN_PROGRESS' }).phase, 'live')
assert.equal(weeklyRoomStatus({ ...scheduled, scheduledAt:null }).label, '比赛时间待定')
assert.equal(buildWeeklyRoomJourney({ ...scheduled, status:'CANCELLED' }).preMatch, false)
assert.equal(buildWeeklyRoomJourney({ ...scheduled, cycle:{status:'CLOSED'} }).terminal, true)
const waitingOpponent = makeRoom()
waitingOpponent.myTeams[0].confirmation.status = 'CONFIRMED'
assert.match(weeklyRoomStatus(waitingOpponent).label, /等待对手/)
assert.doesNotMatch(weeklyRoomStatus(waitingOpponent).detail, /代表本队确认/)
waitingOpponent.myTeams[0].confirmation.isCurrent = false
assert.doesNotMatch(weeklyRoomStatus(waitingOpponent).label, /本队已确认/)
const pendingReceipt = { matchId:room.id, fingerprint:room.resultFingerprint, input:buildWeeklyResponse(room, 'team-a', 'CONFIRMED', '', writable).input }
const receipt = { id:'receipt', matchId:room.id, confirmingTeamId:'team-a', revision:3, resultFingerprint:'current-result', status:'CONFIRMED', isCurrent:true, note:'' }
assert.equal(isWeeklyResponseReceipt(receipt, pendingReceipt), true)
assert.equal(isWeeklyResponseReceipt(null, pendingReceipt), false)
for (const changed of [{matchId:'other-match'},{confirmingTeamId:'team-b'},{revision:2},{isCurrent:false},{resultFingerprint:'old'},{status:'DISPUTED'},{note:'different'}]) {
  assert.equal(isWeeklyResponseReceipt({...receipt,...changed},pendingReceipt), false)
}
assert.equal(buildWeeklyRoomJourney({ ...room, confirmationState:'CONFIRMED' }).stages[2].label, '等待管理员结算')
assert.equal(buildWeeklyRoomJourney({ ...room, confirmationState:'FINALIZED' }).stages[2].state, 'done')
assert.match(weeklyRoomError({name:'TimeoutError'}), /超时/)

const unsorted = [{ ...room, id: 'final', confirmationState: 'FINALIZED' }, room, { ...room, id: 'dispute', confirmationState: 'DISPUTED' }]
const sorted = sortWeeklyRooms(unsorted)
assert.deepEqual(sorted.map(item => item.id), ['dispute', 'weekly-match-a', 'final'])
assert.equal(unsorted[0].id, 'final', 'sorting must not mutate server snapshots')
assert.equal(selectWeeklyRoom(sorted, '').id, 'dispute')
assert.equal(selectWeeklyRoom(sorted, 'final').id, 'final')
assert.equal(selectWeeklyRoom(sorted, 'other-team-match'), null, 'foreign deep links must not silently select a different match')
assert.equal(selectWeeklyRoom([], ''), null)
assert.match(weeklyRoomError({ data: { error: 'WEEKLY_RESULT_REVISION_CONFLICT' } }), /本次操作未保存/)
assert.match(weeklyRoomError({ status: 401 }), /重新登录/)

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const apiSource = read('../src/features/weekly-competition/weeklyMatchRoomsApi.js')
const workspaceSource = read('../src/features/weekly-competition/WeeklyMatchRoomsWorkspace.jsx')
const dialogSource = read('../src/features/weekly-competition/WeeklyMatchResponseDialog.jsx')
const mySpaceSource = read('../src/pages/me/MySpacePage.jsx')
const liveRoomSource = read('../src/features/weekly-competition/WeeklyLiveRoomPage.jsx')
const roomRulesSource = read('../src/features/weekly-competition/RoomRulesPanel.jsx')
assert.match(apiSource, /\/me\/weekly-match-rooms\?seasonId=/)
assert.match(apiSource, /\/me\/weekly-match-rooms\/\$\{encodeURIComponent\(matchId\)\}\/confirmation/)
assert.match(apiSource, /method: 'PUT'/)
assert.doesNotMatch(apiSource, /localStorage|FCR26-TEST-ROOM|source: 'ADMIN'/)
assert.match(workspaceSource, /data\?\.season\?\.id !== seasonId/)
assert.match(workspaceSource, /id !== requestId\.current/)
assert.match(workspaceSource, /requestController\.current\?\.abort\(\)/)
assert.match(workspaceSource, /WEEKLY_COMPETITION_DISABLED/)
assert.match(workspaceSource, /if \(unsupported\) return children/)
assert.match(workspaceSource, /submitLock\.current/)
assert.match(workspaceSource, /latest\.revision !== pending\.input\.expectedRevision/)
assert.match(workspaceSource, /currentWorkspace\?\.season\?\.status === 'ARCHIVED'/)
assert.doesNotMatch(workspaceSource, /response\?\.note|response\.note|response\.actor|actedBy/)
assert.match(dialogSource, /dialog\.showModal\(\)/)
assert.match(dialogSource, /aria-labelledby=\{titleId\}/)
assert.match(dialogSource, /pending\.input\.expectedRevision/)
assert.match(liveRoomSource, /\/check-ins/)
assert.match(liveRoomSource, /签到/)
assert.match(liveRoomSource, /缺席/)
assert.match(liveRoomSource, /最终开赛确认由赛管完成/)
assert.match(liveRoomSource, /checkInSummary/)
assert.match(roomRulesSource, /实际游戏 1V1/)
assert.match(roomRulesSource, /图一固定为占领要点/)
assert.match(read('../src/features/weekly-competition/WeeklyLiveRoomPage.module.css'), /checkInRow/)
const sectionKeys = ['overview', 'tasks', 'events', 'matches', 'team', 'referee', 'caster', 'stats', 'following', 'communications', 'security']
const sectionSource = mySpaceSource.match(/export function buildSpaceSections\([\s\S]*?\n\}/)?.[0]
assert.ok(sectionSource, 'My Space section builder exists')
const buildSections = new Function('SPACE_SECTION_DEFINITIONS', 'hasAccountFeatureAccess', `${sectionSource.replace('export ', '')}; return buildSpaceSections`)(
  Object.fromEntries(sectionKeys.map(id => [id, { id }])), (launch, key) => launch.features[key] && launch.features[key] !== 'HIDDEN'
)
const matchSection = options => buildSections({ weekly: true, ...options }).some(section => section.id === 'matches')
assert.equal(matchSection({ manager: true }), true)
assert.equal(matchSection({ weeklyRooms: true, launch: { features: { matchRoom: 'READ_ONLY' } } }), true, 'Assigned staff can discover their matches')
assert.equal(matchSection({ weeklyRooms: true, launch: { features: { matchRoom: 'HIDDEN' } } }), false, 'Discovery respects launch feature visibility')
assert.equal(matchSection({ caster: true, weeklyRooms: false }), false, 'A caster identity alone does not grant match discovery')
assert.match(mySpaceSource, /hasAccountFeatureAccess\(accountLaunch, 'matchRoom', 'WRITE'\)/)
assert.match(mySpaceSource, /<WeeklyMatchRoomsWorkspace key=\{`\$\{seasonId\}:\$\{authUser\?\.id \|\| ''\}`\}/)
assert.match(mySpaceSource, /readOnly=\{!canWriteMatchRooms\}/)

console.log('Weekly match-room payload, role/state gates, privacy, deep links, and account integration checks passed.')

assert.equal(buildSections({ registration: true, launch: { features: { teamOperations: 'WRITE' } } }).some(section => section.id === 'team'), true, 'a new registrant can discover the canonical entry without a verified team identity')
assert.equal(buildSections({ registration: true, launch: { features: { teamOperations: 'HIDDEN' } } }).some(section => section.id === 'team'), false)
