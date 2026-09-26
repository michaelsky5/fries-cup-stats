import { buildWeeklyRoomPreview } from './roomDemoFixture.js'
import { validRoomLineup } from '../weekly-competition/roomLineups.js'
import { OW_HEROES } from '../../lib/heroes.js'

export const PRACTICE_ID = 'LOCAL-ROOM-PRACTICE'
export const PRACTICE_ROLES = ['representative', 'manager', 'member', 'referee', 'caster', 'admin']
export const PRACTICE_SCENES = ['checkin', 'choosing', 'lineup', 'banorder', 'banning', 'ready', 'live', 'paused', 'review', 'result']
const staffRole = role => ['referee', 'admin'].includes(role)
const repRole = role => role === 'representative'
const date = '2026-09-26T12:00:00.000Z'
const heroRole = name => OW_HEROES.find(hero => hero.en === name)?.role
const fail = code => { throw Object.assign(new Error(code), { status: 400 }) }
const starterIds = state => state.lineup?.map(player => player.playerId) || [0, 1, 2, 3, 4].map(i => `preview-team-A-p${i}`)
const present = (state, id) => Object.hasOwn(state.checkIns, id) ? state.checkIns[id] : state.scene !== 'checkin' && /-p[0-4]$/.test(id)
const startersPresent = state => starterIds(state).every(id => present(state, id))

export function createRoomPractice(role = 'representative', scene) {
  role = PRACTICE_ROLES.includes(role) ? role : 'representative'
  scene = PRACTICE_SCENES.includes(scene) ? scene : staffRole(role) ? 'ready' : ['member', 'caster'].includes(role) ? 'live' : 'checkin'
  return { role, scene, revision: 1, mapName: 'Busan', banOrder: 'FIRST', hero: 'Ana', lineup: null, checkIns: {},
    ready: false, preflight: false, recovered: false, recoveredB: true, pausedOnce: false, representative: false,
    scoreA: scene === 'review' ? 1 : 2, scoreB: scene === 'review' ? 2 : 1, response: '', settled: false, messages: [], requests: [], history: [], event: 'welcome' }
}

export function practiceLesson(state) {
  const { role, scene } = state
  if (state.settled || state.response) return 'done'
  if (role === 'manager') return state.representative ? 'manager-done' : 'manager'
  if (['member', 'caster'].includes(role) && scene !== 'result') return role
  if (scene === 'review' && state.scoreA === 1 && staffRole(role)) return 'correction'
  if (scene === 'ready' && staffRole(role)) return 'preflight'
  if (scene === 'live') return staffRole(role) ? 'staff-live' : state.pausedOnce ? 'after-pause' : 'live'
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
    data.series.scoreA = state.scoreA > state.scoreB ? 1 : 0; data.series.scoreB = 1 - data.series.scoreA
    data.opening.next.chooserSide = state.scoreA > state.scoreB ? 'B' : 'A'
  }
  if (data.opening.setup) Object.assign(data.opening.setup, { name: state.mapName, firstBanSide: state.scene === 'banorder' || state.scene === 'lineup' ? '' : state.banOrder === 'FIRST' ? 'A' : 'B',
    banA: ['banning', 'banorder', 'lineup'].includes(state.scene) ? null : state.hero,
    banB: state.scene === 'banning' && state.banOrder === 'SECOND' ? 'Ashe' : data.map.banB })
  if (state.scene === 'banning') {
    data.opening.nextSide = 'A'
    data.opening.heroes = data.opening.heroes.map(hero => ({ ...hero, reason: state.banOrder === 'SECOND' && hero.role === 'DPS' ? text['room.ban-blocked'] : '' }))
  }
  data.opening.revision = state.revision
  data.opening.rules.maps = data.opening.rules.maps.filter(map => ['Busan', 'Samoa', 'Lijiang Tower'].includes(map.name))
  Object.assign(data.access, { administrator: state.role === 'admin', canWrite: true, canStart: staff && state.scene === 'ready' && state.preflight,
    canPause: staff && state.scene === 'live', canResume: staff && state.scene === 'paused' && state.recovered && state.recoveredB })
  Object.assign(data.opening.access, { canChoose: (staff || representative) && state.scene === 'choosing',
    canChooseBanOrder: (staff || representative) && state.scene === 'banorder', canBan: (staff || representative) && state.scene === 'banning', canNext: false })
  if (data.opening.complete) {
    data.map.banA = state.hero; data.map.banB = heroRole(state.hero) === 'damage' ? 'Ana' : 'Ashe'
    data.map.firstBanSide = state.banOrder === 'FIRST' ? 'A' : 'B'
    Object.assign(data.opening.setup, { banA: data.map.banA, banB: data.map.banB, firstBanSide: data.map.firstBanSide })
  }
  data.preparation.sides.forEach((side, i) => { side.ready = !['checkin', 'choosing', 'lineup', 'banorder', 'banning'].includes(state.scene) && Boolean(i || state.ready || staff); side.canConfirm = state.scene === 'ready' && (!staff || !i) && (i || startersPresent(state)); side.reason = !i && !startersPresent(state) ? text['room.error.checkin'] : ''; side.confirmedBy = side.ready ? i ? text['room.bot-opponent'] : text['room.you'] : '' })
  data.preflight = { canConfirm: staff && state.scene === 'ready', roomConfirmed: state.preflight, rosterVerified: state.preflight, networkTestCompleted: state.preflight }
  data.pause = { at: date, recovered: { A: { ready: state.recovered, by: text['room.you'] }, B: { ready: state.recoveredB, by: text['room.bot-opponent'] } } }
  data.messages = state.messages
  data.requests = state.requests
  data.canRecordMapResult = staff && state.scene === 'live'
  data.canCorrectMapResult = staff && state.scene === 'review'
  data.blockers = state.preflight ? [] : data.blockers
  if (state.scene === 'result') {
    // A scripted 4:1 series; unlike a live match, intermediate maps are supplied
    // by the exercise. The coach labels this jump before it happens.
    const bannedA = new Set(), bannedB = new Set()
    data.maps.forEach((map, i) => {
      map.scoreA = i === 3 ? 0 : 2; map.scoreB = i === 3 ? 2 : 1; map.status = 'COMPLETE'
      map.banA = i ? OW_HEROES.find(hero => !bannedA.has(hero.en)).en : state.hero
      map.banB = OW_HEROES.find(hero => !bannedB.has(hero.en) && hero.role !== heroRole(map.banA)).en
      bannedA.add(map.banA); bannedB.add(map.banB)
    })
    data.series = { complete: true, completedMaps: 5, scoreA: 4, scoreB: 1, drawCount: 0 }
    data.result = { phase: state.settled ? 'SETTLED' : state.response === 'DISPUTED' ? 'DISPUTED' : state.response === 'CONFIRMED' || staff ? 'AWAITING_SETTLEMENT' : 'CONFIRMING', official: true,
      revision: state.revision, fingerprint: 'practice-result', confirmationVersion: 1, scoreA: 4, scoreB: 1, countsTowardStandings: true,
      maps: data.maps, points: state.settled ? [{ teamId: data.match.teamA.id, points: 9 }, { teamId: data.match.teamB.id, points: 6 }] : [],
      sides: [data.match.teamA, data.match.teamB].map((team, i) => ({ team, status: i || staff ? 'CONFIRMED' : state.response || 'PENDING', canRespond: !i && representative && !state.settled })),
      administration: { canSettle: state.role === 'admin' && !state.settled }, handoff: null }
  }
  return data
}

// This reducer is the complete local transport. Unknown operations fail closed.
// It never imports an HTTP client, account service, or production room ID.
export function applyRoomPractice(state, path, body = {}, kind = 'room') {
  const next = structuredClone(state), staff = staffRole(state.role), representative = repRole(state.role)
  const scene = state.scene, ownTeam = 'preview-team-A'
  const actor = staff || representative
  let event = '', result = { ok: true }
  if (kind === 'scene' && path === 'result' && ['live', 'review'].includes(scene)) { next.scene = 'result'; event = 'jump-result' }
  else if (kind === 'room' && path === '/check-ins') {
    if (!actor || ![ownTeam, ...(staff ? ['preview-team-B'] : [])].includes(body.teamId) || !new RegExp(`^${body.teamId}-p[0-6]$`).test(body.playerId)) fail('permission')
    next.checkIns[body.playerId] = body.status === 'PRESENT'
    if (scene === 'checkin' && [0, 1, 2, 3, 4].every(i => next.checkIns[`${ownTeam}-p${i}`])) next.scene = 'choosing'
    event = next.scene === 'choosing' ? 'checkin' : 'signed'
  } else if (kind === 'room' && path === '/representatives') {
    if (!(staff || state.role === 'manager') || body.teamId !== ownTeam || body.userId !== 'a6' || (staff && String(body.reason || '').trim().length < 2)) fail('handover')
    next.representative = true; event = 'handover'
  } else if (kind === 'room' && path === '/opening') {
    if (!actor) fail('permission')
    if (body.action === 'SELECT_SETUP' && scene === 'choosing' && ['Busan', 'Samoa', 'Lijiang Tower'].includes(body.mapName) && body.teamId === ownTeam) { next.mapName = body.mapName; next.scene = 'lineup'; event = 'map' }
    else if (body.action === 'SELECT_BAN_ORDER' && scene === 'banorder' && ['FIRST', 'SECOND'].includes(body.banOrder) && body.teamId === ownTeam) { next.banOrder = body.banOrder; next.scene = 'banning'; event = 'order' }
    else if (body.action === 'BAN' && scene === 'banning' && body.teamId === ownTeam && heroRole(body.hero) && !(state.banOrder === 'SECOND' && heroRole(body.hero) === 'damage')) { next.hero = body.hero; next.scene = 'ready'; event = 'ban' }
    else fail('phase')
  } else if (kind === 'room' && path === '/commands') {
    if (body.action === 'SET_LINEUP' && scene === 'lineup' && actor && body.teamId === ownTeam && validRoomLineup(body.lineup) && body.lineup.every(player => /^preview-team-A-p[0-6]$/.test(player.playerId))) { next.lineup = body.lineup; next.scene = 'banorder'; event = 'lineup' }
    else if (body.action === 'VERIFY_PREFLIGHT' && staff && scene === 'ready' && body.roomConfirmed && body.rosterVerified && body.networkTestCompleted) { next.preflight = true; event = 'preflight' }
    else if (body.action === 'START' && staff && scene === 'ready' && state.preflight) { next.scene = 'live'; event = 'start' }
    else if (body.action === 'PAUSE' && staff && scene === 'live' && String(body.note || '').trim().length >= 2) { next.scene = 'paused'; event = 'pause' }
    else if (body.action === 'RECOVER' && actor && scene === 'paused' && [ownTeam, ...(staff ? ['preview-team-B'] : [])].includes(body.teamId)) { next[body.teamId === ownTeam ? 'recovered' : 'recoveredB'] = Boolean(body.ready); if (representative && next.recovered && next.recoveredB) { next.scene = 'live'; next.pausedOnce = true } event = 'recover' }
    else if (body.action === 'RESUME' && staff && scene === 'paused' && state.recovered && state.recoveredB) { next.scene = 'live'; next.pausedOnce = true; event = 'resume' }
    else if (['RECORD_MAP_RESULT', 'CORRECT_MAP_RESULT'].includes(body.action) && staff && scene === (body.action === 'RECORD_MAP_RESULT' ? 'live' : 'review')) {
      if (body.scoreA !== 2 || body.scoreB !== 1 || (body.action === 'CORRECT_MAP_RESULT' && String(body.note || '').trim().length < 2)) fail('score')
      next.scoreA = body.scoreA; next.scoreB = body.scoreB; next.scene = 'review'; event = 'score'
    } else fail('phase')
  } else if (kind === 'coordination' && path === '/readiness') {
    if (!actor || scene !== 'ready' || body.teamId !== ownTeam) fail('phase')
    if (body.ready && !startersPresent(state)) fail('checkin')
    next.ready = Boolean(body.ready)
    if (representative && next.ready) { next.scene = 'live'; event = 'bot-start' } else event = 'ready'
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
    if (!representative || scene !== 'result' || body.teamId !== ownTeam || !['CONFIRMED', 'DISPUTED'].includes(body.status) || (body.status === 'DISPUTED' && String(body.note || '').trim().length < 2)) fail('phase')
    next.response = body.status; event = 'response'
  } else if (kind === 'room' && path === '/result-actions') {
    if (state.role !== 'admin' || scene !== 'result' || body.action !== 'SETTLE' || body.pointsA !== 9 || body.pointsB !== 6 || String(body.reason || '').trim().length < 2) fail('settle')
    next.settled = true; event = 'settled'
  } else fail('unsupported')
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

export function createPracticeSession(role, scene) {
  let state = createRoomPractice(role, scene)
  const listeners = new Set()
  const emit = () => listeners.forEach(listener => listener())
  return {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    reset: () => { state = createRoomPractice(role, scene); emit() },
    apply: (path, body, kind) => { const next = applyRoomPractice(state, path, body, kind); state = next.state; emit(); return next.result },
  }
}
