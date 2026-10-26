import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { nextRoomAlert, roomAlertState } from '../src/features/weekly-competition/roomAlerts.js'

// 票 2.64: which room changes make a sound. Fixture data is synthetic (local preview only).
const walk = (role, stages) => {
  const alerts = []
  let previous = null
  for (const stage of stages) {
    const current = roomAlertState(buildWeeklyRoomPreview(stage, role))
    alerts.push(nextRoomAlert(previous, current))
    previous = current
  }
  return alerts.map(alert => alert && `${alert.kind}:${alert.order ?? '-'}:${alert.name}`)
}
const flow = ['opening', 'choosing', 'lineup', 'banorder', 'banning', 'ready', 'live', 'paused', 'live', 'review', 'result']

test('a team representative hears "your turn" for each own step and a stage alert otherwise', () => {
  assert.deepEqual(walk('representative', flow), [
    null,
    'turn:1:地图选择', 'turn:1:首发确认', 'turn:1:禁用顺序', 'turn:1:英雄禁用',
    'stage:1:等待实际开赛', 'stage:1:比赛进行', 'stage:1:技术暂停', 'stage:1:比赛进行', 'stage:1:地图结果', 'stage:-:赛果提交',
  ])
})

test('players, casters and referees hear every new stage but never a turn alert', () => {
  for (const role of ['player', 'caster', 'staff']) {
    const alerts = walk(role, flow)
    assert.ok(alerts.every(alert => !alert || alert.startsWith('stage:')), role)
    assert.deepEqual(alerts.slice(1, 4), ['stage:1:地图选择', 'stage:1:首发确认', 'stage:1:英雄禁用'], role)
  }
})

test('the first snapshot and an unchanged room stay silent; a finished own step does not repeat', () => {
  const data = buildWeeklyRoomPreview('lineup', 'representative')
  assert.equal(nextRoomAlert(null, roomAlertState(data)), null)
  assert.equal(nextRoomAlert(roomAlertState(data), roomAlertState(data)), null)
  const submitted = buildWeeklyRoomPreview('lineup', 'representative')
  submitted.map.lineupLocks = { A: true, B: false }
  assert.equal(roomAlertState(submitted).turn, null)
  assert.equal(nextRoomAlert(roomAlertState(data), roomAlertState(submitted)), null)
})

test('the other team choosing a map is a stage change for this team, not its turn', () => {
  const before = roomAlertState(buildWeeklyRoomPreview('opening', 'representative'))
  const theirs = buildWeeklyRoomPreview('choosing', 'representative')
  theirs.opening.access.canChoose = false
  assert.deepEqual(nextRoomAlert(before, roomAlertState(theirs)), { kind: 'stage', name: '地图选择', order: 1 })
})

test('a score waiting for this captain to confirm is a turn alert during the game', () => {
  const live = buildWeeklyRoomPreview('live', 'representative')
  const pending = buildWeeklyRoomPreview('live', 'representative')
  pending.captainAgreements = { result: { status: 'PENDING', canConfirm: true, payload: { scoreA: 2, scoreB: 1 } } }
  assert.deepEqual(nextRoomAlert(roomAlertState(live), roomAlertState(pending)), { kind: 'turn', name: '核对本图比分', order: 1 })
})
