const ROOM_SIDES = ['A', 'B']

function normalizeSide(value) {
  const side = String(value || '').trim().toUpperCase()
  return ROOM_SIDES.includes(side) ? side : ''
}

export function getMatchRoomReadyState(roomOrState = null) {
  const source = roomOrState?.state || roomOrState || {}
  const ready = source?.ready && typeof source.ready === 'object' ? source.ready : {}
  const sides = {
    A: ready.A === true,
    B: ready.B === true
  }

  return {
    ...sides,
    count: Number(sides.A) + Number(sides.B),
    bothReady: sides.A && sides.B
  }
}

export function setMatchRoomSideReady(roomOrState, sideValue, isReady = true) {
  const side = normalizeSide(sideValue)
  const current = getMatchRoomReadyState(roomOrState)
  if (!side) return { A: current.A, B: current.B }

  return {
    A: side === 'A' ? Boolean(isReady) : current.A,
    B: side === 'B' ? Boolean(isReady) : current.B
  }
}
