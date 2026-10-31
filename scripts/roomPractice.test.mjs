import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { applyRoomPractice, buildRoomPractice, createPracticeSession, createPracticeTransport, createRoomPractice, practiceLesson, PRACTICE_ID, PRACTICE_ROLES, PRACTICE_SCENES } from '../src/features/room-guide/roomPractice.js'
import { getRoomStageIndex } from '../src/features/weekly-competition/weeklyRoomFlow.js'
import { GUIDE_FORMATS } from '../src/features/room-guide/roomGuideFormats.js'
import { OW_HEROES } from '../src/lib/heroes.js'
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
  assert.throws(() => act('/commands', { action: 'RECORD_MAP_RESULT', scoreA: -1, scoreB: 2 }), /score/)
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

const advanceMap = state => {
  state = applyRoomPractice(state, '/opening', { action: 'NEXT_MAP' }).state
  if (state.scene === 'choosing') state = applyRoomPractice(state, '/opening', { action: 'SELECT_SETUP', mapName: 'Busan', teamId }).state
  state = applyRoomPractice(state, '/commands', { action: 'SET_LINEUP', teamId, lineup }).state
  state = applyRoomPractice(state, '/opening', { action: 'SELECT_BAN_ORDER', teamId, banOrder: 'FIRST' }).state
  const used = state.completedMaps.map(map => map.banA)
  state = applyRoomPractice(state, '/opening', { action: 'BAN', teamId, hero: OW_HEROES.find(hero => !used.includes(hero.en)).en }).state
  return applyRoomPractice(state, '/commands', { action: 'START' }).state
}

test('normal FT2 and FT3 play ends at the actual win target and still requires report review', () => {
  for (const [format, target] of [['FT2', 2], ['FT3', 3]]) {
    let state = createRoomPractice('admin', 'live', format)
    for (let wins = 1; wins <= target; wins++) {
      state = applyRoomPractice(state, '/commands', { action: 'RECORD_MAP_RESULT', scoreA: 2, scoreB: 1 }).state
      const data = buildRoomPractice(state, copy)
      assert.equal(data.match.format, format); assert.equal(data.series.scoreA, wins)
      assert.equal(data.series.complete, wins === target)
      if (wins < target) state = advanceMap(state)
    }
    assert.equal(state.scene, 'result'); assert.equal(state.reviewed, false)
    let data = buildRoomPractice(state, copy)
    assert.equal(data.result.phase, 'AWAITING_SUBMISSION'); assert.equal(data.result.official, false)
    assert.equal(data.result.administration.canSettle, false)
    assert.throws(() => applyRoomPractice(state, '/opening', { action: 'NEXT_MAP' }), /phase/)
    state = applyRoomPractice(state, 'review-result', {}, 'scene').state
    assert.throws(() => applyRoomPractice(state, '/result-actions', { action: 'SETTLE', pointsA: 9, pointsB: 6, reason: 'wrong cycle points' }), /settle/)
    state = applyRoomPractice(state, '/result-actions', { action: 'SETTLE', pointsA: 0, pointsB: 0, reason: 'No cycle points' }).state
    data = buildRoomPractice(state, copy)
    assert.equal(data.result.countsTowardStandings, false)
    assert.deepEqual(data.result.points.map(item => item.points), [0, 0])
  }
})

test('RR5 continues at 3:0 and finishes after five maps including a draw, with no sixth map', () => {
  let state = createRoomPractice('admin', 'live', 'RR5')
  for (const [index, score] of [[2, 1], [2, 1], [2, 1], [1, 1], [0, 2]].entries()) {
    state = applyRoomPractice(state, '/commands', { action: 'RECORD_MAP_RESULT', scoreA: score[0], scoreB: score[1] }).state
    const data = buildRoomPractice(state, copy)
    assert.equal(data.series.complete, index === 4)
    if (index === 2) { assert.equal(data.series.scoreA, 3); assert.equal(data.opening.access.canNext, true) }
    if (index < 4) state = advanceMap(state)
  }
  const data = buildRoomPractice(state, copy)
  assert.equal(data.series.completedMaps, 5); assert.equal(data.series.drawCount, 1)
  assert.equal(data.series.scoreA, 3); assert.equal(data.series.scoreB, 1)
  assert.equal(data.result.countsTowardStandings, true)
  assert.throws(() => applyRoomPractice(state, '/opening', { action: 'NEXT_MAP' }), /phase/)
})

test('a map forfeit adds exactly one opponent win, preserves played maps and fabricates no statistics', () => {
  for (const [format, scene, expected, finished] of [['FT3', 'forfeit', 2, false], ['FT3', 'forfeit-last', 3, true], ['FT2', 'forfeit', 2, true]]) {
    let state = createRoomPractice('referee', scene, format)
    const previous = structuredClone(state.completedMaps), before = buildRoomPractice(state, copy)
    assert.equal(before.mapForfeit.canRecord, true)
    state = applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Team A is missing players' }).state
    const data = buildRoomPractice(state, copy)
    assert.equal(data.series.scoreA, 1); assert.equal(data.series.scoreB, expected)
    assert.equal(data.series.complete, finished); assert.equal(data.mapForfeit.canRecord, false)
    assert.deepEqual(state.completedMaps.slice(0, -1), previous)
    const map = data.maps.at(-1)
    assert.equal(map.banA, before.map.banA); assert.equal(map.banB, before.map.banB)
    assert.equal(map.name, before.map.name)
    assert.equal(map.administrativeReason, 'MAP_FORFEIT'); assert.equal(map.forfeitedBySide, 'A')
    assert.equal(map.scoreA, null); assert.equal(map.scoreB, null); assert.deepEqual(map.playerStats, [])
    assert.equal(data.canCorrectMapResult, false)
    assert.throws(() => applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Duplicate' }), /phase/)
    if (!finished) {
      assert.equal(practiceLesson(state), 'map-forfeit-review')
      state = advanceMap(state)
      assert.equal(buildRoomPractice(state, copy).mapForfeit.canRecord, true)
      state = applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Still missing players' }).state
      assert.equal(buildRoomPractice(state, copy).series.scoreB, 3)
    }
  }
})

test('map forfeit is unavailable to teams and casters, in RR5 and before actual start', () => {
  for (const role of ['representative', 'manager', 'member', 'caster']) {
    const state = createRoomPractice(role, 'forfeit', 'FT3')
    assert.equal(buildRoomPractice(state, copy).mapForfeit.canRecord, false)
    assert.throws(() => applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Missing players' }), /permission/)
  }
  for (const [format, scene] of [['RR5', 'live'], ['FT3', 'ready'], ['FT2', 'review']]) {
    const state = createRoomPractice('referee', scene, format)
    assert.equal(buildRoomPractice(state, copy).mapForfeit.canRecord, false)
    assert.throws(() => applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'B', reason: 'Missing players' }), /phase/)
  }
})

test('format changes and reset create isolated exercises and all translated tasks are present', () => {
  const copies = JSON.parse(readFileSync(new URL('../src/features/room-guide/roomGuideCopy.json', import.meta.url)))
  for (const format of GUIDE_FORMATS) for (const role of PRACTICE_ROLES) for (const scene of PRACTICE_SCENES) {
    const state = createRoomPractice(role, scene, format), data = buildRoomPractice(state, copy)
    assert.equal(data.match.format, format)
    for (const text of Object.values(copies)) for (const field of ['task', 'help']) assert.ok(text[`room.${field}.${practiceLesson(state)}`])
  }
  const ft = createPracticeSession('referee', 'forfeit', 'FT3'), rr = createPracticeSession('referee', 'live', 'RR5')
  ft.apply('/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'B', reason: 'Not enough players' })
  assert.equal(rr.getSnapshot().completedMaps.length, 0)
  ft.reset(); assert.equal(buildRoomPractice(ft.getSnapshot(), copy).series.scoreA, 1)
})

test('an explicit teaching jump preserves the chosen current map and does not rewrite recorded forfeits', () => {
  let state = createRoomPractice('referee', 'live', 'FT3')
  state.mapName = 'Samoa'
  state = applyRoomPractice(state, 'result', {}, 'scene').state
  assert.equal(buildRoomPractice(state, copy).maps[0].name, 'Samoa')
  state = createRoomPractice('referee', 'forfeit', 'FT3')
  state = applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Not enough players' }).state
  const recorded = structuredClone(state.completedMaps)
  state = applyRoomPractice(state, 'result', {}, 'scene').state
  assert.deepEqual(state.completedMaps.slice(0, recorded.length), recorded)
  assert.equal(state.reviewed, true)
})

test('practice countdown displays the actual next map and chooser without changing its deadline or command version', () => {
  let state = createRoomPractice('referee', 'forfeit', 'FT3')
  state = applyRoomPractice(state, '/rulings', { action: 'MAP_FORFEIT', forfeitedSide: 'A', reason: 'Missing players' }).state
  const before = structuredClone(state.phaseClock), data = buildRoomPractice(state, copy)
  assert.equal(data.phaseClock.stage.mapOrder, 4)
  assert.equal(data.phaseClock.stage.side, data.opening.next.chooserSide)
  assert.equal(data.phaseClock.stage.side, 'A')
  assert.equal(data.phaseClock.deadlineAt, before.deadlineAt)
  assert.equal(data.phaseClock.revision, before.revision)
  assert.deepEqual(state.phaseClock, before)
  state = applyRoomPractice(state, '/opening', { action: 'NEXT_MAP' }).state
  assert.equal(buildRoomPractice(state, copy).phaseClock.deadlineAt, before.deadlineAt)
  const opened = buildRoomPractice(state, copy).phaseClock
  state = applyRoomPractice(state, '/clock', { action: 'SET_ENABLED', enabled: false, expectedRevision: opened.revision, stageKey: opened.stage.key }).state
  assert.equal(buildRoomPractice(state, copy).phaseClock.enabled, false)
  assert.equal(buildRoomPractice(state, copy).phaseClock.stage.mapOrder, 4)
})

test('a valid B map win is not mislabeled as the scripted score-correction exercise', () => {
  let state = createRoomPractice('referee', 'live', 'FT3')
  state = applyRoomPractice(state, '/commands', { action: 'RECORD_MAP_RESULT', scoreA: 1, scoreB: 2 }).state
  assert.equal(practiceLesson(state), 'review')
  assert.equal(buildRoomPractice(state, copy).opening.next.chooserSide, 'A')
  assert.equal(practiceLesson(createRoomPractice('referee', 'review', 'FT3')), 'correction')
})
