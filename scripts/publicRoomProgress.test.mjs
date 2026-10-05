import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchPhasePresentation } from '../src/components/matches/detail/matchPhasePresentation.js'
import { validatePublicRoomProgress, presentPublicRoomProgress, readPublicRoomProgress, startRoomProgressPolling } from '../src/components/matches/detail/publicRoomProgress.js'

const matchId = 'raw-FCW26-W3-M3'
const frame = () => ({ schemaVersion: 'friescup-weekly-progress-v1', seasonId: 'FCW26', matchId, updatedAt: '2026-10-04T13:00:00Z', phase: 'PREPARING', stage: 'CHOOSING', activeMapOrder: 3, mapLimit: 5, completedMaps: 2, scoreA: 1, scoreB: 1,
  maps: [{ order: 1, name: 'Samoa', type: 'Control', status: 'COMPLETE', scoreA: 0, scoreB: 2 }, { order: 2, name: 'Aatlis', type: 'Flashpoint', status: 'COMPLETE', scoreA: 3, scoreB: 0 }, { order: 3, name: '', type: '', status: 'PENDING', scoreA: null, scoreB: null }] })

test('public client scopes responses to the current match and rejects invalid placeholder scores', async () => {
  const value = frame()
  assert.throws(() => validatePublicRoomProgress(value, 'OTHER', matchId))
  assert.throws(() => validatePublicRoomProgress(value, 'FCW26', 'OTHER-MATCH'))
  for (const edit of [v => v.maps.push(v.maps[0]), v => v.maps[2].scoreA = 0, v => v.completedMaps = -1, v => v.phase = 'INTERNAL', v => v.updatedAt = 'invalid']) {
    const invalid = frame(); edit(invalid); assert.throws(() => validatePublicRoomProgress(invalid, 'FCW26', matchId))
  }
  let options, url
  const result = await readPublicRoomProgress('FCW26', matchId, { fetchImpl: async (path, init) => { url = path; options = init; return new Response(JSON.stringify({ ...value, sealedLineup: 'PRIVATE' })) } })
  assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store')
  assert.equal(url, '/api/admin-public/seasons/FCW26/matches/raw-FCW26-W3-M3/progress')
  assert.equal(result.sealedLineup, undefined)
  assert.equal(await readPublicRoomProgress('FCW26', matchId, { fetchImpl: async () => new Response('', { status: 404 }) }), null)
  await assert.rejects(readPublicRoomProgress('FCW26', matchId, { fetchImpl: async () => new Response('', { status: 503 }) }))
})

test('room state overlays a stale published snapshot without inventing statistics or a final winner', () => {
  const dossier = getMatchDossier(buildWeeklyOverviewFixture(), 'FCW26-W3-M3', { locale: 'zh-CN' }), before = JSON.stringify(dossier)
  const base = getMatchPhasePresentation(dossier), room = frame(), phase = presentPublicRoomProgress(base, dossier, room, 'zh-CN')
  assert.equal(base.key, 'upcoming'); assert.equal(phase.key, 'live')
  assert.equal(phase.scoreLabel, '1 : 1'); assert.equal(phase.statusLabel, '第 3 图 · 选图')
  assert.equal(phase.slots[0].roomScore, '0 : 2'); assert.equal(phase.slots[2].state, 'preparing')
  assert.equal(phase.slots[2].name, '地图待公布'); assert.equal(phase.slots[3].state, 'pending')
  assert.ok(phase.slots.every(slot => !slot.record)); assert.equal(phase.records.length, 0); assert.equal(phase.canAnalyze, false)
  assert.match(phase.caption, /待审核/); assert.equal(JSON.stringify(dossier), before)
  room.phase = 'PAUSED'; room.stage = 'PAUSED'; room.maps[2].name = 'Midtown'; room.maps[2].status = 'LIVE'
  const paused = presentPublicRoomProgress(base, dossier, room, 'zh-CN')
  assert.equal(paused.slots[2].state, 'paused'); assert.equal(paused.statusLabel, '比赛暂停')
  room.phase = 'REVIEW'; room.stage = 'REVIEW'; room.completedMaps = 3; room.scoreA = 2
  Object.assign(room.maps[2], { status: 'COMPLETE', scoreA: 3, scoreB: 1 })
  const ended = presentPublicRoomProgress(base, dossier, room, 'zh-CN')
  assert.equal(ended.key, 'review'); assert.equal(ended.scoreLabel, '2 : 1'); assert.equal(ended.canAnalyze, false)
})

test('published final results and administrative outcomes remain authoritative', () => {
  const db = buildWeeklyOverviewFixture(), dossier = getMatchDossier(db, 'FCW26-W3-M2', { locale: 'zh-CN' }), base = getMatchPhasePresentation(dossier)
  assert.equal(presentPublicRoomProgress(base, dossier, frame(), 'zh-CN'), base)
  for (const key of ['forfeit', 'ruling', 'cancelled']) assert.equal(presentPublicRoomProgress({ ...base, active: true, key }, dossier, frame(), 'zh-CN').roomProgress, undefined)
})

function clock() {
  let id = 0
  const timers = new Map(), doc = Object.assign(new EventTarget(), { hidden: false }), target = Object.assign(new EventTarget(), { navigator: { onLine: true } })
  return { doc, target, timers, schedule: (fn, delay) => { timers.set(++id, { fn, delay }); return id }, cancel: key => timers.delete(key), next: async delay => { const entry = [...timers].find(([, timer]) => timer.delay === delay); assert.ok(entry, `timer ${delay} missing`); timers.delete(entry[0]); await entry[1].fn() } }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

test('polling retains the last frame on outages, accepts corrections and clears revoked data', async () => {
  const timer = clock(), seen = []; let next = frame(), fail = false
  const stop = startRoomProgressPolling({ ...timer, read: async () => { if (fail) throw new Error('outage'); return next }, onChange: value => seen.push(value) })
  await settle(); assert.equal(seen.at(-1).status, 'connected')
  fail = true; await timer.next(5000); assert.equal(seen.at(-1).status, 'reconnecting'); assert.equal(seen.at(-1).progress.scoreA, 1)
  fail = false; next = { ...next, scoreA: 0 }; await timer.next(15000); assert.equal(seen.at(-1).progress.scoreA, 0)
  next = null; await timer.next(5000); assert.equal(seen.at(-1).status, 'unavailable'); assert.equal(seen.at(-1).progress, null)
  assert.ok([...timer.timers.values()].some(item => item.delay === 30000)); stop(); assert.equal(timer.timers.size, 0)
})

test('hidden or offline pages stop polling and resume promptly with a single request', async () => {
  const timer = clock(), seen = []; let calls = 0
  const stop = startRoomProgressPolling({ ...timer, read: async () => { calls++; return frame() }, onChange: value => seen.push(value) })
  await settle(); assert.equal(calls, 1)
  timer.doc.hidden = true; timer.doc.dispatchEvent(new Event('visibilitychange'))
  assert.equal(timer.timers.size, 0); assert.equal(seen.at(-1).status, 'paused')
  timer.doc.hidden = false; timer.doc.dispatchEvent(new Event('visibilitychange')); await settle(); assert.equal(calls, 2)
  timer.target.navigator.onLine = false; timer.target.dispatchEvent(new Event('offline')); assert.equal(timer.timers.size, 0)
  timer.target.navigator.onLine = true; timer.target.dispatchEvent(new Event('online')); await settle(); assert.equal(calls, 3)
  stop(); timer.target.dispatchEvent(new Event('focus')); await settle(); assert.equal(calls, 3)
})

test('navigation aborts pending reads and rejects late results from the previous match', async () => {
  const timer = clock(), seen = []; let resolve, signal
  const stop = startRoomProgressPolling({ ...timer, read: options => { signal = options.signal; return new Promise(done => { resolve = done }) }, onChange: value => seen.push(value) })
  timer.target.dispatchEvent(new Event('focus'))
  stop(); assert.equal(signal.aborted, true); resolve(frame()); await settle()
  assert.equal(seen.length, 0); assert.equal(timer.timers.size, 0)
})
