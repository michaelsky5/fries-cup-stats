import { platformRequest } from '../auth/platformApi.js'

const LOCAL_TEST_ROOM_PREFIX = 'FCR26-TEST-ROOM'
const LOCAL_TEST_ROOM_STORAGE_PREFIX = 'fries-cup-match-room-test:'
const LOCAL_TEST_ROOM_EVENT = 'fries-cup:match-room-change'
const LOCAL_TEST_USER_ID = 'local-test-user'
const localTestRoomMemory = new Map()

function clean(value) {
  return String(value ?? '').trim()
}

function encodeId(value) {
  return encodeURIComponent(String(value || '').trim())
}

function isLocalTestRoom(matchId) {
  return clean(matchId).toUpperCase().startsWith(LOCAL_TEST_ROOM_PREFIX)
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function nowIso() {
  return new Date().toISOString()
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function getLocalRoomStorageKey(matchId) {
  return `${LOCAL_TEST_ROOM_STORAGE_PREFIX}${clean(matchId).toUpperCase()}`
}

function makeLocalTestAccess() {
  return {
    canEnter: true,
    canOperate: true,
    canManageAll: true,
    side: '',
    sides: [],
    activeCaptainSides: [],
    label: '本地测试赛管',
    identities: [
      {
        id: 'local-test-referee',
        identityType: 'REFEREE',
        isVerified: true,
        displayName: '本地测试赛管'
      }
    ]
  }
}

function makeLocalTestMap(matchId, mapOrder = 1, patch = {}) {
  const timestamp = nowIso()
  return {
    id: `${clean(matchId)}-map-${mapOrder}`,
    mapOrder,
    status: 'PENDING',
    mapType: '',
    mapName: '',
    pickerSide: mapOrder === 1 ? 'STAFF' : '',
    attackSide: '',
    defenseSide: '',
    scoreA: null,
    scoreB: null,
    winnerSide: '',
    isDraw: false,
    confirmations: [],
    resultConfirmation: {
      status: 'PENDING',
      submittedSides: [],
      locked: false,
      disputed: false
    },
    lineupA: null,
    lineupB: null,
    lineupLocks: { A: false, B: false },
    heroBans: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch
  }
}

function makeLocalTestRoom(matchId) {
  const id = clean(matchId) || `${LOCAL_TEST_ROOM_PREFIX}-01`
  const timestamp = nowIso()
  return {
    room: {
      id: `local-${id}`,
      matchId: id,
      status: 'WAITING',
      currentStep: 'WAITING',
      currentMapOrder: 1,
      targetWins: 2,
      version: 0,
      mapPoolKey: 'publicQualifier',
      state: {
        ready: { A: false, B: false },
        stepStartedAt: timestamp
      },
      participants: [],
      maps: [makeLocalTestMap(id, 1)],
      finalSubmissions: [],
      createdAt: timestamp,
      updatedAt: timestamp
    },
    access: makeLocalTestAccess()
  }
}

function normalizeLocalTestRoom(payload, matchId) {
  const fallback = makeLocalTestRoom(matchId)
  const room = payload?.room || {}
  const access = payload?.access || {}

  return {
    room: {
      ...fallback.room,
      ...room,
      state: {
        ...fallback.room.state,
        ...(room.state || {})
      },
      participants: Array.isArray(room.participants) ? room.participants : fallback.room.participants,
      maps: (Array.isArray(room.maps) && room.maps.length ? room.maps : fallback.room.maps).map(map => ({
        ...map,
        lineupLocks: {
          A: Boolean(map?.lineupLocks?.A),
          B: Boolean(map?.lineupLocks?.B)
        },
        resultConfirmation: {
          status: map?.resultConfirmation?.status || map?.status || 'PENDING',
          submittedSides: Array.isArray(map?.resultConfirmation?.submittedSides)
            ? map.resultConfirmation.submittedSides
            : (map?.confirmations || []).map(item => clean(item?.side).toUpperCase()).filter(side => side === 'A' || side === 'B'),
          locked: Boolean(map?.resultConfirmation?.locked || map?.status === 'COMPLETE' || map?.status === 'DRAW'),
          disputed: Boolean(map?.resultConfirmation?.disputed || map?.status === 'DISPUTED')
        }
      })),
      finalSubmissions: Array.isArray(room.finalSubmissions) ? room.finalSubmissions : fallback.room.finalSubmissions
    },
    access: {
      ...fallback.access,
      ...access,
      identities: Array.isArray(access.identities) && access.identities.length
        ? access.identities
        : fallback.access.identities
    }
  }
}

function writeLocalTestRoom(matchId, payload) {
  const normalized = normalizeLocalTestRoom(payload, matchId)
  localTestRoomMemory.set(getLocalRoomStorageKey(matchId), normalized)
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(getLocalRoomStorageKey(matchId), JSON.stringify(normalized))
      window.dispatchEvent(new CustomEvent(LOCAL_TEST_ROOM_EVENT, {
        detail: { matchId: clean(matchId).toUpperCase() }
      }))
    } catch {
      // Local test rooms are best-effort; storage failures should not block the UI.
    }
  }
  return clone(normalized)
}

function readLocalTestRoom(matchId) {
  const storageKey = getLocalRoomStorageKey(matchId)
  if (canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) return normalizeLocalTestRoom(JSON.parse(raw), matchId)
    } catch {
      // Fall through to a fresh local room.
    }
  }

  if (localTestRoomMemory.has(storageKey)) {
    return normalizeLocalTestRoom(localTestRoomMemory.get(storageKey), matchId)
  }

  return writeLocalTestRoom(matchId, makeLocalTestRoom(matchId))
}

function ensureLocalMap(payload, mapOrder) {
  const order = Number(mapOrder) || 1
  const maps = payload.room.maps || []
  let map = maps.find(item => Number(item.mapOrder) === order)
  if (!map) {
    map = makeLocalTestMap(payload.room.matchId, order)
    payload.room.maps = [...maps, map].sort((a, b) => Number(a.mapOrder) - Number(b.mapOrder))
  }
  return map
}

function touchLocalRoom(payload) {
  payload.room.version = Math.max(0, Number(payload.room.version) || 0) + 1
  payload.room.updatedAt = nowIso()
  return payload
}

export function subscribeMatchRoom(matchId, listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') return () => {}
  const normalizedMatchId = clean(matchId).toUpperCase()
  const storageKey = getLocalRoomStorageKey(matchId)
  const handleStorage = event => {
    if (event.key === storageKey) listener()
  }
  const handleLocalChange = event => {
    if (event.detail?.matchId === normalizedMatchId) listener()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(LOCAL_TEST_ROOM_EVENT, handleLocalChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(LOCAL_TEST_ROOM_EVENT, handleLocalChange)
  }
}

function makeLocalConfirmation(side, scoreA, scoreB, verdict) {
  return {
    side,
    scoreA,
    scoreB,
    winnerSide: verdict.side,
    isDraw: verdict.side === 'DRAW',
    confirmedAt: nowIso(),
    user: {
      id: LOCAL_TEST_USER_ID,
      username: 'Local Test'
    }
  }
}

function getLocalMapVerdict(scoreA, scoreB) {
  if (scoreA === scoreB) return { side: 'DRAW', isDraw: true }
  return { side: scoreA > scoreB ? 'A' : 'B', isDraw: false }
}

function makeLocalRoomError(message, status = 409, code = 'MATCH_ROOM_CONFLICT') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function syncLocalResultConfirmation(map) {
  const submittedSides = [...new Set((map.confirmations || [])
    .map(item => clean(item?.side).toUpperCase())
    .filter(side => side === 'A' || side === 'B'))]
  map.resultConfirmation = {
    status: map.status || 'PENDING',
    submittedSides,
    locked: map.status === 'COMPLETE' || map.status === 'DRAW',
    disputed: map.status === 'DISPUTED'
  }
}

export function fetchMatchRoom(matchId) {
  if (isLocalTestRoom(matchId)) return Promise.resolve(readLocalTestRoom(matchId))
  return platformRequest(`/match-rooms/${encodeId(matchId)}`)
}

export function checkInMatchRoom(matchId, isOnline = true, options = {}) {
  if (isLocalTestRoom(matchId)) {
    const payload = readLocalTestRoom(matchId)
    const now = nowIso()
    const participant = {
      id: 'local-test-referee',
      side: 'STAFF',
      identityType: 'REFEREE',
      displayName: '本地测试赛管',
      targetId: 'local-test-referee',
      isCaptain: false,
      isOnline,
      lastSeenAt: now,
      user: {
        id: LOCAL_TEST_USER_ID,
        username: 'Local Test'
      }
    }
    const exists = payload.room.participants.some(item => item.id === participant.id)
    payload.room.participants = exists
      ? payload.room.participants.map(item => item.id === participant.id ? { ...item, ...participant } : item)
      : [...payload.room.participants, participant]
    touchLocalRoom(payload)
    return Promise.resolve(writeLocalTestRoom(matchId, payload))
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/check-in`, {
    ...options,
    method: 'POST',
    body: { isOnline }
  })
}

export function updateMatchRoomState(matchId, patch) {
  if (isLocalTestRoom(matchId)) {
    const payload = readLocalTestRoom(matchId)
    const previousStep = payload.room.currentStep
    payload.room = {
      ...payload.room,
      ...patch,
      state: {
        ...(payload.room.state || {}),
        ...(patch?.state || {})
      }
    }
    if (patch?.currentStep && patch.currentStep !== previousStep) {
      payload.room.state.stepStartedAt = nowIso()
    }
    touchLocalRoom(payload)
    const nextPayload = writeLocalTestRoom(matchId, payload)
    return Promise.resolve({ room: nextPayload.room, access: nextPayload.access })
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/state`, {
    method: 'PATCH',
    body: patch
  })
}

export function updateMatchRoomMap(matchId, mapOrder, patch) {
  if (isLocalTestRoom(matchId)) {
    const payload = readLocalTestRoom(matchId)
    const map = ensureLocalMap(payload, mapOrder)
    const timestamp = nowIso()
    Object.assign(map, patch, {
      updatedAt: timestamp
    })
    if (patch?.lineupA) {
      map.lineupLocks = { ...(map.lineupLocks || {}), A: patch.lineupA.length === 5 }
    }
    if (patch?.lineupB) {
      map.lineupLocks = { ...(map.lineupLocks || {}), B: patch.lineupB.length === 5 }
    }
    if (patch?.status === 'PICKED') map.mapPickedAt = timestamp
    if (patch?.status === 'LINEUP_LOCKED' || patch?.lineupA || patch?.lineupB) map.lineupLockedAt = timestamp
    if (patch?.status === 'BANNED' || patch?.heroBans) map.heroBanSubmittedAt = timestamp
    if (patch?.status === 'LIVE') map.startedAt = timestamp
    if (patch?.status === 'CONFIRMING') map.resultConfirmStartedAt = timestamp
    touchLocalRoom(payload)
    const nextPayload = writeLocalTestRoom(matchId, payload)
    const nextMap = nextPayload.room.maps.find(item => Number(item.mapOrder) === Number(mapOrder))
    return Promise.resolve({ map: nextMap })
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/maps/${encodeId(mapOrder)}`, {
    method: 'PUT',
    body: patch
  })
}

export function confirmMatchRoomMapResult(matchId, mapOrder, payload) {
  if (isLocalTestRoom(matchId)) {
    const roomPayload = readLocalTestRoom(matchId)
    const map = ensureLocalMap(roomPayload, mapOrder)
    const side = clean(payload?.side).toUpperCase()
    const scoreA = Number(payload?.scoreA)
    const scoreB = Number(payload?.scoreB)
    if (side !== 'A' && side !== 'B') {
      return Promise.reject(makeLocalRoomError('请选择提交方', 400, 'INVALID_SIDE'))
    }
    if (!Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
      return Promise.reject(makeLocalRoomError('地图小分必须为非负整数', 400, 'INVALID_SCORE'))
    }
    if (map.status === 'COMPLETE' || map.status === 'DRAW') {
      return Promise.reject(makeLocalRoomError('本图小分已经确认'))
    }
    if (map.status === 'DISPUTED') {
      return Promise.reject(makeLocalRoomError('小分不一致，等待赛管裁定'))
    }
    if ((map.confirmations || []).some(item => clean(item?.side).toUpperCase() === side)) {
      return Promise.reject(makeLocalRoomError('本队已经提交小分，不能重复修改'))
    }
    const verdict = getLocalMapVerdict(scoreA, scoreB)
    const confirmation = makeLocalConfirmation(side, scoreA, scoreB, verdict)
    map.confirmations = [...(map.confirmations || []), confirmation]

    const confirmationA = map.confirmations.find(item => item.side === 'A')
    const confirmationB = map.confirmations.find(item => item.side === 'B')
    const isMatched = Boolean(
      confirmationA &&
      confirmationB &&
      confirmationA.scoreA === confirmationB.scoreA &&
      confirmationA.scoreB === confirmationB.scoreB
    )
    const isDisputed = Boolean(confirmationA && confirmationB && !isMatched)

    map.scoreA = isMatched ? scoreA : null
    map.scoreB = isMatched ? scoreB : null
    map.winnerSide = isMatched ? verdict.side : ''
    map.isDraw = isMatched ? verdict.isDraw : false
    map.status = isMatched ? (verdict.isDraw ? 'DRAW' : 'COMPLETE') : isDisputed ? 'DISPUTED' : 'CONFIRMING'
    map.resultConfirmedAt = isMatched ? nowIso() : null
    map.updatedAt = nowIso()
    syncLocalResultConfirmation(map)

    touchLocalRoom(roomPayload)
    const nextPayload = writeLocalTestRoom(matchId, roomPayload)
    const nextMap = nextPayload.room.maps.find(item => Number(item.mapOrder) === Number(mapOrder))
    return Promise.resolve({ map: nextMap })
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/maps/${encodeId(mapOrder)}/confirm-result`, {
    method: 'POST',
    body: payload
  })
}

export function resolveMatchRoomMapResult(matchId, mapOrder, payload) {
  if (isLocalTestRoom(matchId)) {
    const roomPayload = readLocalTestRoom(matchId)
    const map = ensureLocalMap(roomPayload, mapOrder)
    const scoreA = Number(payload?.scoreA)
    const scoreB = Number(payload?.scoreB)
    if (map.status !== 'DISPUTED') {
      return Promise.reject(makeLocalRoomError('只有争议中的地图可以裁定'))
    }
    if (!Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
      return Promise.reject(makeLocalRoomError('地图小分必须为非负整数', 400, 'INVALID_SCORE'))
    }
    const verdict = getLocalMapVerdict(scoreA, scoreB)
    map.scoreA = scoreA
    map.scoreB = scoreB
    map.winnerSide = verdict.side
    map.isDraw = verdict.isDraw
    map.status = verdict.isDraw ? 'DRAW' : 'COMPLETE'
    map.resultConfirmedAt = nowIso()
    map.resultResolution = {
      scoreA,
      scoreB,
      winnerSide: verdict.side,
      isDraw: verdict.isDraw,
      note: clean(payload?.note),
      resolvedAt: nowIso(),
      user: { id: LOCAL_TEST_USER_ID, username: 'Local Test' }
    }
    map.updatedAt = nowIso()
    syncLocalResultConfirmation(map)
    touchLocalRoom(roomPayload)
    const nextPayload = writeLocalTestRoom(matchId, roomPayload)
    return Promise.resolve({
      map: nextPayload.room.maps.find(item => Number(item.mapOrder) === Number(mapOrder))
    })
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/maps/${encodeId(mapOrder)}/resolve-result`, {
    method: 'POST',
    body: payload
  })
}

export function transferMatchRoomCaptain(matchId, payload) {
  if (isLocalTestRoom(matchId)) {
    return Promise.reject(makeLocalRoomError('本地赛管测试模式不需要转交队长', 400, 'LOCAL_REFEREE_MODE'))
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/captain-transfer`, {
    method: 'POST',
    body: payload
  })
}

export function submitMatchRoomFinalResult(matchId, payload) {
  if (isLocalTestRoom(matchId)) {
    const roomPayload = readLocalTestRoom(matchId)
    const finalSubmission = {
      id: `${clean(matchId)}-final-${Date.now()}`,
      ...payload,
      status: 'SUBMITTED',
      createdAt: nowIso(),
      user: {
        id: LOCAL_TEST_USER_ID,
        username: 'Local Test'
      }
    }
    roomPayload.room.finalSubmissions = [finalSubmission, ...(roomPayload.room.finalSubmissions || [])]
    roomPayload.room.status = 'COMPLETED'
    roomPayload.room.currentStep = 'MATCH_FINISHED'
    touchLocalRoom(roomPayload)
    writeLocalTestRoom(matchId, roomPayload)
    return Promise.resolve({ finalSubmission })
  }

  return platformRequest(`/match-rooms/${encodeId(matchId)}/final-submissions`, {
    method: 'POST',
    body: payload
  })
}
