import { demoRoomClock, changeDemoClock } from './roomDemoClock.js'
import { buildWeeklyRoomPreview } from './roomDemoFixture.js'
import { validRoomLineup } from '../weekly-competition/roomLineups.js'
import { OW_HEROES } from '../../lib/heroes.js'
import { guideFormat, practiceSeries } from './roomGuideFormats.js'

export const PRACTICE_ID = 'LOCAL-ROOM-PRACTICE'
export const PRACTICE_ROLES = ['representative', 'manager', 'member', 'referee', 'caster', 'admin']
export const PRACTICE_SCENES = ['checkin', 'choosing', 'lineup', 'banorder', 'banning', 'ready', 'live', 'paused', 'review', 'result', 'forfeit', 'forfeit-last']
const practiceMaps = ['Busan', 'Samoa', 'Lijiang Tower']
const staffRole = role => ['referee', 'admin'].includes(role)
const repRole = role => role === 'representative'
const date = '2026-09-26T12:00:00.000Z'
const heroRole = name => OW_HEROES.find(hero => hero.en === name)?.role
const fail = code => { throw Object.assign(new Error(code), { status: 400 }) }
const starterIds = state => state.lineup?.map(player => player.playerId) || [0, 1, 2, 3, 4].map(i => `preview-team-A-p${i}`)
const present = (state, id) => Object.hasOwn(state.checkIns, id) ? state.checkIns[id] : state.scene !== 'checkin' && /-p[0-4]$/.test(id)
const startersPresent = state => starterIds(state).every(id => present(state, id))

const practiceMap = (state, changes = {}) => ({ order: state.mapOrder, name: state.mapName, status: 'COMPLETE', scoreA: state.scoreA, scoreB: state.scoreB, banA: state.hero, banB: state.botHero, chooserSide: state.chooserSide, ...changes })
const usedBans = (state, side) => new Set(state.completedMaps.map(map => map[`ban${side}`]).filter(Boolean))
function nextPracticeChooser(state) {
  const last = state.completedMaps.at(-1)
  if (last.forfeitedBySide) return last.forfeitedBySide
  return last.scoreA > last.scoreB ? 'B' : last.scoreB > last.scoreA ? 'A' : last.order === 1 ? last.chooserSide || 'A' : state.completedMaps.at(-2)?.chooserSide || 'A'
}
function finishPracticeMap(state, map) {
  state.completedMaps = [...state.completedMaps.filter(item => item.order !== map.order), map]
  state.scene = practiceSeries(state.completedMaps, state.format).complete ? 'result' : 'review'
  state.reviewed = false
}
function fillPracticeSeries(state) {
  const maps = [...state.completedMaps]
  // The remaining maps and review are explicitly scripted by the teaching bar.
  // Keep every recorded map, including administrative results, unchanged.
  while (!practiceSeries(maps, state.format).complete) {
    const order = maps.length + 1, bWins = state.format === 'RR5' && order === 4
    const result = { status: 'COMPLETE', scoreA: bWins ? 0 : 2, scoreB: bWins ? 2 : 1 }
    maps.push(order === state.mapOrder ? practiceMap(state, result) : { order, name: practiceMaps[(order - 1) % practiceMaps.length], ...result })
  }
  state.completedMaps = maps; state.mapOrder = maps.at(-1).order; state.scene = 'result'; state.reviewed = true
}

export function createRoomPractice(role = 'representative', scene, format = 'RR5') {
  role = PRACTICE_ROLES.includes(role) ? role : 'representative'
  format = guideFormat(format)
  scene = PRACTICE_SCENES.includes(scene) ? scene : staffRole(role) ? 'ready' : ['member', 'caster'].includes(role) ? 'live' : 'choosing'
  const exercise = ['forfeit', 'forfeit-last'].includes(scene) && format !== 'RR5' ? scene : ''
  if (['forfeit', 'forfeit-last'].includes(scene)) scene = 'live'
  const state = { role, scene, format, exercise, mapOrder: 1, chooserSide: 'A', botHero: 'Ashe', completedMaps: [], reviewed: scene === 'result', phaseClock: demoRoomClock(scene), mapTimeouts: [], revision: 1, mapName: 'Busan', banOrder: 'FIRST', hero: 'Ana', lineup: null, checkIns: {},
    ready: false, preflight: false, recovered: false, recoveredB: true, pausedOnce: false, representative: false,
    scoreA: scene === 'review' ? 1 : 2, scoreB: scene === 'review' ? 2 : 1, response: '', settled: false, messages: [], requests: [], history: [], event: 'welcome' }
  if (scene === 'review') state.completedMaps = [practiceMap(state)]
  if (exercise) {
    state.completedMaps = [{ order: 1, name: 'Busan', status: 'COMPLETE', scoreA: 2, scoreB: 1, banA: 'Ana', banB: 'Ashe', chooserSide: 'A' }, { order: 2, name: 'Samoa', status: 'COMPLETE', scoreA: 1, scoreB: 2, banA: 'Reinhardt', banB: 'Mercy', chooserSide: 'B' }]
    if (exercise === 'forfeit-last' && format === 'FT3') state.completedMaps.push({ order: 3, name: 'Lijiang Tower', status: 'COMPLETE', scoreA: 1, scoreB: 2, banA: 'Genji', banB: 'Kiriko', chooserSide: 'A' })
    state.mapOrder = state.completedMaps.length + 1
    state.hero = state.mapOrder === 3 ? 'Tracer' : 'Cassidy'; state.botHero = state.mapOrder === 3 ? 'Kiriko' : 'Zenyatta'
  }
  if (scene === 'result') fillPracticeSeries(state)
  return state
}

export function practiceLesson(state) {
  const { role, scene } = state
  if (state.settled || state.response) return 'done'
  if (scene === 'result' && !state.reviewed) return 'submit-result'
  if (scene === 'review' && state.completedMaps.at(-1)?.isAdministrative) return 'map-forfeit-review'
  if (role === 'manager') return state.representative ? 'manager-done' : 'manager'
  if (['member', 'caster'].includes(role) && scene !== 'result') return role
  if (scene === 'review' && state.scoreA === 1 && staffRole(role)) return 'correction'
  if (scene === 'ready' && staffRole(role)) return 'ready'
  if (scene === 'live') return staffRole(role) ? state.exercise ? 'map-forfeit' : 'staff-live' : state.pausedOnce ? 'after-pause' : 'live'
  if (scene === 'paused' && staffRole(role)) return 'staff-paused'
  if (scene === 'result' && role === 'admin') return 'settle'
  if (scene === 'result' && role !== 'representative') return 'read-result'
  return scene
}

export function buildRoomPractice(state, text) {
  const staff = staffRole(state.role), representative = repRole(state.role)
  const stage = state.scene === 'checkin' ? 'choosing' : state.scene
  const data = buildWeeklyRoomPreview(stage, staff ? 'staff' : state.role === 'caster' ? 'caster' : representative ? 'representative' : 'player')
  data.simulation = true
  Object.assign(data.match, { id: PRACTICE_ID, seasonId: 'LOCAL-PRACTICE', weekId: 'LOCAL-PRACTICE-WEEK', seasonName: text['room.season'], weekLabel: text['room.week'] })
  data.match.format = state.format
  data.requiresOpeningDrawRuling = state.mapOrder === 1
  data.actor = { id: `practice-${state.role}`, name: text['room.you'], label: text[`role.${state.role}`] }
  data.revision = data.match.revision = data.draftRevision = state.revision
  data.publicNote = text['room.boundary']
  data.staff = [{ name: text['room.bot-referee'] }]
  data.preparation.brief = { roomName: text['room.lobby'], roomCode: 'DEMO' }
  data.syncedAt = date
  for (const [i, roster] of data.rosters.entries()) {
    const side = i ? 'B' : 'A', team = data.match[`team${side}`]
    team.name = text[`sim.team-${side.toLowerCase()}`]; team.shortName = `DEMO ${side}`
    roster.staff = []
    roster.members.forEach((player, n) => {
      player.name = `${side}${n + 1}`; player.battleTag = `Demo${side}${n + 1}#0000`
      if (player.role === 'FLEX') player.role = 'DPS'
    })
    data.checkIns[team.id] = Object.fromEntries(roster.members.map((member, n) => [member.id, { status: Object.hasOwn(state.checkIns, member.id) ? state.checkIns[member.id] ? 'PRESENT' : 'ABSENT' : (state.scene !== 'checkin' || i) && n < 5 ? 'PRESENT' : 'PENDING' }]))
    const rep = data.representatives.sides[i]
    Object.assign(rep, { name: i ? 'B1' : state.representative ? 'A6' : 'A1', userId: i ? 'b1' : state.representative ? 'a6' : 'a1', battleTag: i ? 'DemoB1#0000' : state.representative ? 'DemoA6#0000' : 'DemoA1#0000', revision: state.revision,
      canAssign: !i && (staff || state.role === 'manager'), requiresReason: staff,
      candidates: roster.members.map((player, n) => ({ userId: `${side.toLowerCase()}${n + 1}`, name: player.name, role: 'PLAYER' })) })
    const saved = state.lineup && !i ? state.lineup : roster.members.slice(0, 5).map(player => ({ playerId: player.id, role: player.role }))
    for (const map of data.maps) if (map[`lineup${side}`].length) map[`lineup${side}`] = saved.map(item => ({ ...roster.members.find(member => member.id === item.playerId), ...item }))
  }
  const afterPick = !['checkin', 'choosing'].includes(state.scene)
  if (afterPick) data.maps[0].name = state.mapName
  if (state.scene === 'review') {
    Object.assign(data.map, { scoreA: state.scoreA, scoreB: state.scoreB })
    data.series.scoreA = state.scoreA > state.scoreB ? 1 : 0; data.series.scoreB = state.scoreB > state.scoreA ? 1 : 0; data.series.drawCount = state.scoreA === state.scoreB ? 1 : 0
    data.opening.next.chooserSide = state.scoreA > state.scoreB ? 'B' : 'A'
    data.opening.next.rightsSource = state.scoreA === state.scoreB ? 'DRAW_RETAINED_CHOOSER' : 'PREVIOUS_MAP_LOSER'
  }
  if (data.opening.setup) Object.assign(data.opening.setup, { name: state.mapName, firstBanSide: state.scene === 'banorder' || state.scene === 'lineup' ? '' : state.banOrder === 'FIRST' ? 'A' : 'B',
    banA: ['banning', 'banorder', 'lineup'].includes(state.scene) ? null : state.hero,
    banB: state.scene === 'banning' && state.banOrder === 'SECOND' ? 'Ashe' : data.map.banB })
  if (data.opening.setup) Object.assign(data.map, { banA: data.opening.setup.banA, banB: data.opening.setup.banB, firstBanSide: data.opening.setup.firstBanSide })
  if (state.scene === 'banning') {
    data.opening.nextSide = 'A'
    data.opening.heroes = data.opening.heroes.map(hero => ({ ...hero, reason: usedBans(state, 'A').has(hero.name) ? text['room.ban-used'] : state.banOrder === 'SECOND' && heroRole(hero.name) === heroRole(state.botHero) ? text['room.ban-blocked'] : '' }))
  }
  data.opening.revision = state.revision
  data.opening.rules.maps = data.opening.rules.maps.filter(map => practiceMaps.includes(map.name))
  Object.assign(data.access, { administrator: state.role === 'admin', canWrite: true, canStart: staff && state.scene === 'ready' && startersPresent(state),
    canPause: staff && state.scene === 'live', canResume: staff && state.scene === 'paused' && state.recovered && state.recoveredB })
  Object.assign(data.opening.access, { canChoose: (staff || representative) && state.scene === 'choosing',
    canChooseBanOrder: (staff || representative) && state.scene === 'banorder', canBan: (staff || representative) && state.scene === 'banning', canNext: staff && state.scene === 'review' })
  if (data.opening.complete) {
    data.map.banA = state.hero; data.map.banB = state.botHero
    data.map.firstBanSide = state.banOrder === 'FIRST' ? 'A' : 'B'
    Object.assign(data.opening.setup, { banA: data.map.banA, banB: data.map.banB, firstBanSide: data.map.firstBanSide })
  }
  data.preparation.sides.forEach((side, i) => { side.ready = !['checkin', 'choosing', 'lineup', 'banorder', 'banning'].includes(state.scene) && Boolean(i || state.ready || staff); side.canConfirm = state.scene === 'ready' && (!staff || !i) && (i || startersPresent(state)); side.reason = !i && !startersPresent(state) ? text['room.error.checkin'] : ''; side.confirmedBy = side.ready ? i ? text['room.bot-opponent'] : text['room.you'] : '' })
  data.preflight = { required: false, canConfirm: staff && state.scene === 'ready', roomConfirmed: state.preflight, rosterVerified: state.preflight, networkTestCompleted: state.preflight }
  data.pause = { at: date, recovered: { A: { ready: state.recovered, by: text['room.you'] }, B: { ready: state.recoveredB, by: text['room.bot-opponent'] } } }
  data.messages = state.messages
  data.requests = state.requests
  data.canRecordMapResult = staff && state.scene === 'live'
  data.canCorrectMapResult = staff && state.scene === 'review' && !state.completedMaps.at(-1)?.isAdministrative
  data.blockers = startersPresent(state) ? [] : [text['room.error.checkin']]
  data.startControl = { canForceStart: staff && state.scene === 'ready' && data.blockers.length > 0, overridable: data.blockers, required: state.scene === 'ready' ? [] : ['请先完成地图、首发与英雄禁用'] }
  const template = data.map, bannedA = new Set(), bannedB = new Set()
  data.maps = state.completedMaps.map(record => {
    const banA = record.banA || OW_HEROES.find(hero => !bannedA.has(hero.en)).en
    const banB = record.banB || OW_HEROES.find(hero => !bannedB.has(hero.en) && hero.role !== heroRole(banA)).en
    bannedA.add(banA); bannedB.add(banB)
    return { ...template, ...record, banA, banB }
  })
  const current = data.maps.find(map => map.order === state.mapOrder)
  if (!current) data.maps.push({ ...template, order: state.mapOrder, name: afterPick ? state.mapName : '', scoreA: null, scoreB: null })
  data.map = current || data.maps.at(-1)
  data.series = practiceSeries(data.maps, state.format)
  data.mapForfeit = { canRecord: staff && state.format !== 'RR5' && ['live', 'paused'].includes(state.scene) && !data.series.complete }
  data.opening.mapOrder = state.mapOrder
  if (data.opening.setup) Object.assign(data.opening.setup, { ...data.map })
  if (state.scene === 'review' && !data.series.complete) {
    data.opening.next = { order: state.mapOrder + 1, chooserSide: nextPracticeChooser(state), rightsSource: data.map.scoreA === data.map.scoreB && !data.map.isAdministrative ? state.mapOrder === 1 ? 'DRAW_RETAINED_CHOOSER' : 'DRAW_TWO_MAPS_BACK' : 'PREVIOUS_MAP_LOSER' }
  }
  if (state.scene === 'result') {
    const countsTowardStandings = state.format === 'RR5'
    data.opening.next = null; data.opening.access.canNext = false
    data.result = { phase: !state.reviewed ? 'AWAITING_SUBMISSION' : state.settled ? 'SETTLED' : state.response === 'DISPUTED' ? 'DISPUTED' : state.response === 'CONFIRMED' || staff ? 'AWAITING_SETTLEMENT' : 'CONFIRMING', official: state.reviewed,
      revision: state.revision, fingerprint: `practice-result-${state.revision}`, confirmationVersion: 1, scoreA: data.series.scoreA, scoreB: data.series.scoreB, countsTowardStandings,
      maps: data.maps, points: state.settled ? [data.match.teamA, data.match.teamB].map((team, i) => ({ teamId: team.id, points: countsTowardStandings ? 5 + data.series[i ? 'scoreB' : 'scoreA'] : 0 })) : [],
      sides: [data.match.teamA, data.match.teamB].map((team, i) => ({ team, status: i || staff ? 'CONFIRMED' : state.response || 'PENDING', canRespond: state.reviewed && !i && representative && !state.settled })),
      administration: { canSettle: state.reviewed && state.role === 'admin' && !state.settled }, handoff: { canPrepare: false, canHandoff: false } }
  }
  if (state.banTimedOut) {
    Object.assign(data.map, { banA: '', banAStatus: 'TIMED_OUT' })
    if (data.opening.setup && data.map.order === 1) Object.assign(data.opening.setup, { banA: '', banAStatus: 'TIMED_OUT' })
  }
  if (state.mapTimeouts?.length >= 2 && afterPick) {
    for (const target of [data.map, data.opening.setup].filter(Boolean)) Object.assign(target, { banA: '', banAStatus: 'TIMED_OUT', banATimeoutReason: 'MAP_SELECTION', firstBanSide: 'B', selectionMethod: state.randomMap ? 'TIMEOUT_RANDOM' : 'TEAM' })
  }
  data.phaseClock = { ...demoRoomClock(state.scene, state.phaseClock), canManage: staff, mapTimeouts: { counts: { A: state.mapTimeouts?.length || 0, B: 0 }, latest: state.mapTimeouts?.at(-1) || null } }
  // The reusable first-map clock keeps its deadline and command version. Display
  // the actual exercise map/chooser, including the map after a forfeit or draw.
  if (data.phaseClock.stage) data.phaseClock.stage = { ...data.phaseClock.stage, mapOrder: state.mapOrder + Number(state.scene === 'review'),
    ...(data.phaseClock.stage.kind === 'MAP' ? { side: state.scene === 'review' ? data.opening.next?.chooserSide : state.chooserSide } : {}) }
  return data
}

// This reducer is the complete local transport. Unknown operations fail closed.
// It never imports an HTTP client, account service, or production room ID.
export function applyRoomPractice(state, path, body = {}, kind = 'room') {
  const next = structuredClone(state), staff = staffRole(state.role), representative = repRole(state.role)
  const scene = state.scene, ownTeam = 'preview-team-A'
  const actor = staff || representative
  let event = '', result = { ok: true }
  if (kind === 'scene' && path === 'timeout' && scene === 'banning' && demoRoomClock(scene, state.phaseClock).status === 'EXPIRED') { next.banTimedOut = true; next.hero = ''; next.scene = 'ready'; event = 'ban-timeout' }
  else if (kind === 'scene' && path === 'timeout' && scene === 'choosing' && demoRoomClock(scene, state.phaseClock).status === 'EXPIRED') {
    next.mapTimeouts ||= []
    const count = next.mapTimeouts.length + 1, at = new Date().toISOString()
    next.mapTimeouts.push({ side: 'A', mapOrder: 1, count, at, deadlineAt: state.phaseClock.deadlineAt, outcome: count === 1 ? 'WARNING' : count === 2 ? 'BAN_FORFEIT' : 'RANDOM_MAP' })
    if (count >= 2) { next.banTimedOut = true; next.hero = ''; next.banOrder = 'SECOND' }
    if (count >= 3) { next.mapName = practiceMaps[Math.floor(Math.random() * practiceMaps.length)]; next.randomMap = true; next.scene = 'lineup' }
    else next.phaseClock = { ...state.phaseClock, revision: state.phaseClock.revision + 1, submissionGrace: null, remainingMs: 60000, deadlineAt: new Date(Date.now() + 60000).toISOString() }
    next.messages.push({ id: `map-timeout-${count}`, channel: 'PUBLIC', kind: 'OPENING_MAP_TIMEOUT', authorName: 'DEMO', roleLabel: 'system', body: count === 1 ? '选图超时：警告，补时 60 秒。' : count === 2 ? '选图再次超时：取消本图禁用，补时 60 秒。' : `选图第三次超时：随机选择 ${next.mapName}，本图禁用权已取消。`, createdAt: at })
    event = 'map-timeout'
  }
  else if (kind === 'scene' && path === 'start' && representative && scene === 'ready' && startersPresent(state)) { next.scene = 'live'; event = 'bot-start' }
  else if (kind === 'scene' && path === 'result' && ['live', 'review'].includes(scene)) { fillPracticeSeries(next); event = 'jump-result' }
  else if (kind === 'scene' && path === 'review-result' && scene === 'result' && !state.reviewed) { next.reviewed = true; event = 'reviewed' }
  else if (kind === 'room' && path === '/rulings') {
    if (!staff) fail('permission')
    if (body.action !== 'MAP_FORFEIT' || state.format === 'RR5' || !['live', 'paused'].includes(scene) || practiceSeries(state.completedMaps, state.format).complete) fail('phase')
    if (!['A', 'B'].includes(body.forfeitedSide) || String(body.reason || '').trim().length < 3) fail('note')
    const forfeitedBySide = body.forfeitedSide
    finishPracticeMap(next, practiceMap(state, { scoreA: null, scoreB: null, isAdministrative: true, administrativeReason: 'MAP_FORFEIT', resultMode: 'FORFEIT', forfeitedBySide, forfeitedSide: forfeitedBySide,
      winnerTeamId: `preview-team-${forfeitedBySide === 'A' ? 'B' : 'A'}`, mapForfeitRuling: { kind: 'MAP_FORFEIT', actorId: `practice-${state.role}`, at: new Date().toISOString(), reason: body.reason.trim() }, playerStats: [] }))
    event = next.scene === 'result' ? 'map-forfeit-complete' : 'map-forfeit'
  }
  else if (kind === 'room' && path === '/clock') {
    if (!staff) fail('permission')
    if (['choosing', 'banning'].includes(scene) && demoRoomClock(scene, state.phaseClock).status === 'EXPIRED') fail('phase')
    try { next.phaseClock = changeDemoClock(demoRoomClock(scene, state.phaseClock), body) } catch { fail('phase') }
    event = 'message'
  } else if (kind === 'room' && path === '/check-ins') {
    if (!actor || ![ownTeam, ...(staff ? ['preview-team-B'] : [])].includes(body.teamId) || !new RegExp(`^${body.teamId}-p[0-6]$`).test(body.playerId)) fail('permission')
    next.checkIns[body.playerId] = body.status === 'PRESENT'
    if (scene === 'checkin' && [0, 1, 2, 3, 4].every(i => next.checkIns[`${ownTeam}-p${i}`])) next.scene = 'choosing'
    event = next.scene === 'choosing' ? 'checkin' : 'signed'
  } else if (kind === 'room' && path === '/representatives') {
    if (!(staff || state.role === 'manager') || body.teamId !== ownTeam || body.userId !== 'a6' || (staff && String(body.reason || '').trim().length < 2)) fail('handover')
    next.representative = true; event = 'handover'
  } else if (kind === 'room' && path === '/opening') {
    if (!actor) fail('permission')
    if (['choosing', 'banning'].includes(scene) && demoRoomClock(scene, state.phaseClock).status === 'EXPIRED') fail('phase')
    if (body.action === 'NEXT_MAP' && scene === 'review' && staff && !practiceSeries(state.completedMaps, state.format).complete) {
      next.chooserSide = nextPracticeChooser(state)
      next.mapOrder++; next.mapName = practiceMaps[(next.mapOrder - 1) % practiceMaps.length]; next.scene = next.chooserSide === 'B' ? 'lineup' : 'choosing'
      next.lineup = null; next.hero = OW_HEROES.find(hero => !usedBans(state, 'A').has(hero.en)).en
      next.botHero = OW_HEROES.find(hero => hero.role === 'damage' && !usedBans(state, 'B').has(hero.en)).en
      next.exercise = ''; next.banTimedOut = false; next.mapTimeouts = []; event = 'next-map'
    }
    else if (body.action === 'SELECT_SETUP' && scene === 'choosing' && practiceMaps.includes(body.mapName) && body.teamId === ownTeam) { next.mapName = body.mapName; next.scene = 'lineup'; event = 'map' }
    else if (body.action === 'SELECT_BAN_ORDER' && scene === 'banorder' && ['FIRST', 'SECOND'].includes(body.banOrder) && body.teamId === ownTeam) { next.banOrder = body.banOrder; next.scene = 'banning'; event = 'order' }
    else if (body.action === 'BAN' && scene === 'banning' && body.teamId === ownTeam && heroRole(body.hero) && !usedBans(state, 'A').has(body.hero) && !(state.banOrder === 'SECOND' && heroRole(body.hero) === heroRole(state.botHero))) {
      next.hero = body.hero
      if (state.banOrder === 'FIRST') next.botHero = OW_HEROES.find(hero => hero.role !== heroRole(body.hero) && !usedBans(state, 'B').has(hero.en)).en
      next.scene = 'ready'; event = 'ban'
    }
    else fail('phase')
  } else if (kind === 'room' && path === '/commands') {
    if (body.action === 'SET_LINEUP' && scene === 'lineup' && actor && body.teamId === ownTeam && validRoomLineup(body.lineup) && body.lineup.every(player => /^preview-team-A-p[0-6]$/.test(player.playerId))) { next.lineup = body.lineup; for (const player of body.lineup) next.checkIns[player.playerId] = true; next.scene = next.banTimedOut ? 'ready' : 'banorder'; event = 'lineup' }
    else if (body.action === 'VERIFY_PREFLIGHT' && staff && scene === 'ready' && body.roomConfirmed && body.rosterVerified && body.networkTestCompleted) { next.preflight = true; event = 'preflight' }
    else if (body.action === 'START' && staff && scene === 'ready' && startersPresent(state)) { next.scene = 'live'; event = 'start' }
    else if (body.action === 'FORCE_START' && staff && scene === 'ready' && !startersPresent(state) && body.actualStartConfirmed === true && String(body.note || '').trim().length >= 2) { next.scene = 'live'; event = 'start' }
    else if (body.action === 'PAUSE' && staff && scene === 'live' && String(body.note || '').trim().length >= 2) { next.scene = 'paused'; event = 'pause' }
    else if (body.action === 'RECOVER' && actor && scene === 'paused' && [ownTeam, ...(staff ? ['preview-team-B'] : [])].includes(body.teamId)) { next[body.teamId === ownTeam ? 'recovered' : 'recoveredB'] = Boolean(body.ready); if (representative && next.recovered && next.recoveredB) { next.scene = 'live'; next.pausedOnce = true } event = 'recover' }
    else if (body.action === 'RESUME' && staff && scene === 'paused' && state.recovered && state.recoveredB) { next.scene = 'live'; next.pausedOnce = true; event = 'resume' }
    else if (['RECORD_MAP_RESULT', 'CORRECT_MAP_RESULT'].includes(body.action) && staff && scene === (body.action === 'RECORD_MAP_RESULT' ? 'live' : 'review')) {
      if (![body.scoreA, body.scoreB].every(value => Number.isInteger(value) && value >= 0 && value <= 100) || (body.action === 'CORRECT_MAP_RESULT' && (String(body.note || '').trim().length < 2 || state.completedMaps.at(-1)?.isAdministrative))) fail('score')
      if (state.mapOrder === 1 && body.scoreA === body.scoreB && (state.role !== 'admin' || String(body.drawRulingReason || '').trim().length < 3)) fail('score')
      next.scoreA = body.scoreA; next.scoreB = body.scoreB; finishPracticeMap(next, practiceMap(next)); event = 'score'
    } else fail('phase')
  } else if ((kind === 'coordination' && path === '/requests') || (kind === 'room' && path === '/messages')) {
    if (String(body.body || '').trim().length < 2) fail('note')
    if (path === '/requests') {
      if (state.role === 'caster' || String(body.title || '').trim().length < 2 || body.teamId !== ownTeam) fail('permission')
      const id = `practice-request-${state.revision}`
      next.requests.push({ id, revision: state.revision, title: body.title, team: { id: ownTeam, name: 'DEMO A' }, status: 'RESOLVED', updatedAt: date, messages: [{ id: id + '-1', author: 'DEMO A', body: body.body, createdAt: date, staff: false }, { id: id + '-2', author: 'DEMO REF', body: '✓', createdAt: date, staff: true }] })
      if (scene === 'live') next.scene = 'paused'
      event = 'bot-pause'; result = { id }
    } else {
      if (body.channel === 'PRODUCTION' && !staff && state.role !== 'caster') fail('permission')
      next.messages.push({ id: `practice-message-${state.revision}`, channel: body.channel, kind: 'CHAT', authorName: 'DEMO', roleLabel: state.role, body: body.body, createdAt: date })
      event = 'message'
    }
  } else if (kind === 'room' && path === '/result-response') {
    if (!representative || scene !== 'result' || !state.reviewed || body.teamId !== ownTeam || !['CONFIRMED', 'DISPUTED'].includes(body.status) || (body.status === 'DISPUTED' && String(body.note || '').trim().length < 2)) fail('phase')
    next.response = body.status; event = 'response'
  } else if (kind === 'room' && path === '/result-actions') {
    const series = practiceSeries(state.completedMaps, state.format)
    if (state.role !== 'admin' || scene !== 'result' || !state.reviewed || body.action !== 'SETTLE' || body.pointsA !== (state.format === 'RR5' ? 5 + series.scoreA : 0) || body.pointsB !== (state.format === 'RR5' ? 5 + series.scoreB : 0) || String(body.reason || '').trim().length < 2) fail('settle')
    next.settled = true; event = 'settled'
  } else fail('unsupported')
  next.phaseClock = demoRoomClock(next.scene, next.phaseClock)
  next.event = event; next.revision++; next.history.push(event)
  return { state: next, result }
}

export function createPracticeTransport(read, apply, errorMessage = code => code) {
  const local = operation => async (...args) => {
    try { return operation(...args) }
    catch (error) { throw Object.assign(new Error(errorMessage(error.message)), { status: 400, practice: true }) }
  }
  return {
    liveRoomWrite: local((matchId, path, body) => { if (matchId !== PRACTICE_ID) fail('permission'); return apply(path, body, 'room') }),
    coordinationWrite: local((path, body) => { if (body.matchId && body.matchId !== PRACTICE_ID) fail('permission'); return apply(path, body, 'coordination') }),
    fetchRoomMessages: local((matchId, channel) => { if (matchId !== PRACTICE_ID) fail('permission'); return { items: read().messages.filter(item => item.channel === channel), hasMore: false } }),
  }
}

export function createPracticeSession(role, scene, format) {
  let state = createRoomPractice(role, scene, format)
  const listeners = new Set()
  const emit = () => listeners.forEach(listener => listener())
  return {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    tick: () => { if (['choosing', 'banning'].includes(state.scene) && demoRoomClock(state.scene, state.phaseClock).status === 'EXPIRED') { state = applyRoomPractice(state, 'timeout', {}, 'scene').state; emit() } },
    reset: () => { state = createRoomPractice(role, scene, format); emit() },
    apply: (path, body, kind) => { const next = applyRoomPractice(state, path, body, kind); state = next.state; emit(); return next.result },
  }
}
