import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { applyRoomPractice, buildRoomPractice, createPracticeSession, createPracticeTransport, createRoomPractice, practiceLesson, PRACTICE_ID, PRACTICE_ROLES, PRACTICE_SCENES } from '../src/features/room-guide/roomPractice.js'
import { getRoomStageIndex } from '../src/features/weekly-competition/weeklyRoomFlow.js'
const copy = JSON.parse(readFileSync(new URL('../src/features/room-guide/roomGuideCopy.json', import.meta.url)))['zh-CN']
const teamId = 'preview-team-A'
const lineup = ['TANK', 'DPS', 'DPS', 'SUP', 'SUP'].map((role, i) => ({ playerId: `${teamId}-p${i}`, role }))

test('real-room practice walks check-in, map, lineups, ban order, bans, pause and result response', () => {
  let state = createRoomPractice()
  const act = (path, body, kind) => { state = applyRoomPractice(state, path, body, kind).state }
  for (let i = 0; i < 5; i++) act('/check-ins', { teamId, playerId: `${teamId}-p${i}`, status: 'PRESENT' })
  assert.equal(state.scene, 'choosing')
  act('/opening', { action: 'SELECT_SETUP', mapName: 'Busan', teamId })
  assert.equal(getRoomStageIndex(buildRoomPractice(state, copy)), 2)
  assert.throws(() => act('/opening', { action: 'SELECT_BAN_ORDER', teamId, banOrder: 'SECOND' }), /phase/)
  act('/commands', { action: 'SET_LINEUP', teamId, lineup })
  assert.equal(state.scene, 'banorder')
  act('/opening', { action: 'SELECT_BAN_ORDER', teamId, banOrder: 'SECOND' })
  assert.throws(() => act('/opening', { action: 'BAN', teamId, hero: 'Ashe' }), /phase/)
  act('/opening', { action: 'BAN', teamId, hero: 'Ana' })
  act('/readiness', { teamId, ready: true }, 'coordination')
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

test('staff controls require preflight, both recovery states, score evidence and reviewed points', () => {
  let state = createRoomPractice('referee')
  const act = (path, body, kind) => { state = applyRoomPractice(state, path, body, kind).state }
  assert.throws(() => act('/commands', { action: 'START' }), /phase/)
  act('/commands', { action: 'VERIFY_PREFLIGHT', roomConfirmed: true, rosterVerified: true, networkTestCompleted: true })
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

test('a substitute must check in before the representative can confirm readiness', () => {
  let state = createRoomPractice('representative', 'ready')
  state.lineup = lineup.map((player, i) => i === 1 ? { ...player, playerId: `${teamId}-p5` } : player)
  assert.equal(buildRoomPractice(state, copy).preparation.sides[0].canConfirm, false)
  assert.throws(() => applyRoomPractice(state, '/readiness', { teamId, ready: true }, 'coordination'), /checkin/)
  state = applyRoomPractice(state, '/check-ins', { teamId, playerId: `${teamId}-p5`, status: 'PRESENT' }).state
  assert.equal(buildRoomPractice(state, copy).preparation.sides[0].canConfirm, true)
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
