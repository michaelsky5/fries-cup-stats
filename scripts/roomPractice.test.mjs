import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { applyRoomPractice, buildRoomPractice, createPracticeSession, createPracticeTransport, createRoomPractice, practiceLesson, PRACTICE_ID, PRACTICE_ROLES, PRACTICE_SCENES } from '../src/features/room-guide/roomPractice.js'
import { getRoomStageIndex } from '../src/features/weekly-competition/weeklyRoomFlow.js'
const copy = JSON.parse(readFileSync(new URL('../src/features/room-guide/roomGuideCopy.json', import.meta.url)))['zh-CN']
const teamId = 'preview-team-A'
const lineup = ['TANK', 'DPS', 'DPS', 'SUP', 'SUP'].map((role, i) => ({ playerId: `${teamId}-p${i}`, role }))

test('real-room practice walks map, lineups, ban order, bans, pause and result response', () => {
  let state = createRoomPractice()
  const act = (path, body, kind) => { state = applyRoomPractice(state, path, body, kind).state }
  assert.equal(state.scene, 'choosing')
  act('/opening', { action: 'SELECT_SETUP', mapName: 'Busan', teamId })
  assert.equal(getRoomStageIndex(buildRoomPractice(state, copy)), 2)
  assert.throws(() => act('/opening', { action: 'SELECT_BAN_ORDER', teamId, banOrder: 'SECOND' }), /phase/)
  act('/commands', { action: 'SET_LINEUP', teamId, lineup })
  assert.equal(state.scene, 'banorder')
  act('/opening', { action: 'SELECT_BAN_ORDER', teamId, banOrder: 'SECOND' })
  assert.throws(() => act('/opening', { action: 'BAN', teamId, hero: 'Ashe' }), /phase/)
  act('/opening', { action: 'BAN', teamId, hero: 'Ana' })
  act('start', {}, 'scene')
  assert.equal(state.scene, 'live')
  act('/requests', { teamId, title: 'A2 disconnected', body: 'Please pause for reconnection.' }, 'coordination')
  assert.equal(state.scene, 'paused')
  act('/commands', { action: 'RECOVER', teamId, ready: true })
  assert.equal(state.scene, 'live'); assert.equal(state.pausedOnce, true)
  act('result', {}, 'scene')
  const data = buildRoomPractice(state, copy)
  assert.equal(data.series.completedMaps, 5); assert.equal(data.result.scoreA, 4)
  assert.equal(new Set(data.maps.map(map => map.banA)).size, 5)
  assert.equal(new Set(data.maps.map(map => map.banB)).size, 5)
  act('/result-response', { teamId, status: 'CONFIRMED' })
  assert.equal(state.response, 'CONFIRMED')
})

test('staff controls record actual start, require both recovery states, score evidence and reviewed points', () => {
  let state = createRoomPractice('referee')
  const act = (path, body, kind) => { state = applyRoomPractice(state, path, body, kind).state }
  assert.equal(buildRoomPractice(state, copy).access.canStart, true)
  act('/commands', { action: 'START' })
  act('/commands', { action: 'PAUSE', note: 'Network problem' })
  assert.throws(() => act('/commands', { action: 'RESUME' }), /phase/)
  act('/commands', { action: 'RECOVER', teamId, ready: true })
  act('/commands', { action: 'RESUME' })
  assert.throws(() => act('/commands', { action: 'RECORD_MAP_RESULT', scoreA: 1, scoreB: 2 }), /score/)
  act('/commands', { action: 'RECORD_MAP_RESULT', scoreA: 2, scoreB: 1 })
  assert.equal(state.scene, 'review')
  state = createRoomPractice('admin', 'result')
  assert.throws(() => act('/result-actions', { action: 'SETTLE', pointsA: 4, pointsB: 1, reason: 'Result' }), /settle/)
  act('/result-actions', { action: 'SETTLE', pointsA: 9, pointsB: 6, reason: 'Five participation points plus map wins' })
  assert.equal(buildRoomPractice(state, copy).result.phase, 'SETTLED')
})

test('lineup confirmation includes substitutes but a later absence blocks actual start', () => {
  let state = createRoomPractice('referee', 'lineup')
  const selected = lineup.map((player, i) => i === 1 ? { ...player, playerId: teamId + '-p5' } : player)
  state = applyRoomPractice(state, '/commands', { action: 'SET_LINEUP', teamId, lineup: selected }).state
  assert.equal(state.checkIns[teamId + '-p5'], true)
  state.scene = 'ready'
  state = applyRoomPractice(state, '/check-ins', { teamId, playerId: teamId + '-p5', status: 'ABSENT' }).state
  assert.equal(buildRoomPractice(state, copy).access.canStart, false)
  assert.throws(() => applyRoomPractice(state, '/commands', { action: 'START' }), /phase/)
})

test('practice is local, isolated by session, and rejects real match IDs and unsupported writes', async () => {
  const session = createPracticeSession('member'), other = createPracticeSession('member')
  const transport = createPracticeTransport(session.getSnapshot, session.apply)
  const before = session.getSnapshot()
  await assert.rejects(transport.liveRoomWrite('real-match-id', '/messages', { body: 'test' }), /permission/)
  await assert.rejects(transport.coordinationWrite('/readiness', { matchId: 'real-match-id' }), /permission/)
  await assert.rejects(transport.liveRoomWrite(PRACTICE_ID, '/broadcast-link', {}), /unsupported/)
  await assert.rejects(transport.liveRoomWrite(PRACTICE_ID, '/opening', { action: 'SELECT_SETUP', mapName: 'Busan', teamId }), /permission/)
  assert.strictEqual(session.getSnapshot(), before)
  await transport.liveRoomWrite(PRACTICE_ID, '/messages', { channel: 'PUBLIC', body: 'Local practice only' })
  assert.equal((await transport.fetchRoomMessages(PRACTICE_ID, 'PUBLIC')).items.length, 1)
  assert.equal(other.getSnapshot().messages.length, 0)
  session.reset(); assert.equal(session.getSnapshot().messages.length, 0)
  const source = readFileSync(new URL('../src/features/room-guide/roomPractice.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /platformRequest|fetch\(|localStorage|sessionStorage/)
})

test('all role and scene payloads keep synthetic identity and the production room shape', () => {
  for (const role of PRACTICE_ROLES) for (const scene of PRACTICE_SCENES) {
    const state = createRoomPractice(role, scene), data = buildRoomPractice(state, copy)
    assert.ok(copy[`room.task.${practiceLesson(state)}`]); assert.ok(copy[`room.help.${practiceLesson(state)}`])
    assert.equal(data.match.id, PRACTICE_ID)
    assert.ok(data.simulation)
    assert.equal(data.rosters.length, 2)
    assert.equal(data.map.order, scene === 'result' ? 5 : 1)
    assert.equal(data.opening.access.canChooseBanOrder, ['referee','admin','representative'].includes(role) && scene === 'banorder')
    assert.ok(Number.isInteger(getRoomStageIndex(data)))
  }
})


test('practice selection timeouts warn, forfeit Ban and randomize once before allowing lineups', () => {
  let state = createRoomPractice('representative', 'choosing')
  for (let count = 1; count <= 3; count++) {
    state.phaseClock.deadlineAt = new Date(Date.now() - 1).toISOString()
    assert.throws(() => applyRoomPractice(state, '/opening', { action: 'SELECT_SETUP', teamId, mapName: 'Busan' }), /phase/)
    state = applyRoomPractice(state, 'timeout', {}, 'scene').state
    const data = buildRoomPractice(state, copy)
    assert.equal(data.phaseClock.mapTimeouts.counts.A, count)
    if (count < 3) { assert.equal(state.scene, 'choosing'); assert.ok(data.phaseClock.remainingMs > 59000) }
    else { assert.equal(state.scene, 'lineup'); assert.ok(['Busan', 'Samoa', 'Lijiang Tower'].includes(state.mapName)); assert.equal(data.map.selectionMethod, 'TIMEOUT_RANDOM') }
    if (count >= 2) assert.equal(data.map.banAStatus, 'TIMED_OUT')
  }
  const selected = state.mapName
  assert.throws(() => applyRoomPractice(state, 'timeout', {}, 'scene'))
  state = applyRoomPractice(state, '/commands', { action: 'SET_LINEUP', teamId, lineup }).state
  const data = buildRoomPractice(state, copy)
  assert.equal(state.scene, 'ready'); assert.equal(data.map.name, selected)
  assert.equal(data.map.banA, ''); assert.equal(data.map.banATimeoutReason, 'MAP_SELECTION'); assert.equal(data.map.firstBanSide, 'B')
  assert.equal(data.opening.complete, true)
})

test('practice selection timeout is inactive while the referee disables the clock', () => {
  const state = createRoomPractice('referee', 'choosing')
  state.phaseClock.enabled = false; state.phaseClock.deadlineAt = null; state.phaseClock.remainingMs = 0
  assert.throws(() => applyRoomPractice(state, 'timeout', {}, 'scene'))
  assert.equal(applyRoomPractice(state, '/opening', { action: 'SELECT_SETUP', teamId, mapName: 'Busan' }).state.scene, 'lineup')
})
