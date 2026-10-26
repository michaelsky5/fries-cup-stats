import { getRoomStageIndex, getRoomStageLabel } from './weeklyRoomFlow.js'

// 票 2.64: background alerts. Pure helpers so the decision of when to alert is testable without a browser.
// While the room tab is hidden and alerts are on, the room keeps reading at this interval (3 s in the foreground).
export const ROOM_BACKGROUND_POLL_MS = 10000

const mapOrder = data => data.map?.order || data.opening?.mapOrder || 1

// The step everyone in the room sees on the stage rail: map, rail stage, waiting for the real start, paused.
function roomStage(data) {
  const index = getRoomStageIndex(data), paused = data.phase === 'PAUSED'
  const name = paused ? '技术暂停' : getRoomStageLabel(data, index)
  return { key: [index === 6 ? 'result' : mapOrder(data), index, name].join('|'), order: index === 6 ? null : mapOrder(data), name }
}

// A step only this account's team can take now. Referees and staff hear the stage alerts only, because
// they may act for both teams at every step.
function roomTurn(data) {
  const access = data.access || {}
  if (access.staff || data.phase === 'ARCHIVED' || data.result) return null
  const sides = new Set((data.preparation?.sides || []).filter(side => (access.representativeTeams || []).includes(side.team?.id)).map(side => side.key))
  if (!sides.size) return null
  const order = mapOrder(data), opening = data.opening, rights = opening?.access || {}
  const agreement = data.captainAgreements?.result
  if (data.phase === 'LIVE' && agreement?.status === 'PENDING' && agreement.canConfirm) return { key: `${order}|agreement`, name: '核对本图比分' }
  if (data.phase !== 'PREPARING' || !opening || opening.complete) return null
  if (opening.phase === 'PLAYING') {
    const round = opening.rounds?.at(-1)
    const waiting = round?.sides?.some(side => sides.has(side.side) && !side.submitted && (rights.playTeams || []).length)
    return waiting ? { key: `${order}|play|${round.id}`, name: '首图先手权' } : null
  }
  if (['NOT_STARTED', 'CONFIRMING_FIRST_PICK'].includes(opening.phase) && rights.canConfirmFirstPick) {
    const votes = opening.firstPick?.confirmations || []
    return [...sides].some(side => !votes.find(vote => vote.side === side)?.chooserSide) ? { key: `${order}|first-pick`, name: '确认首图选择权' } : null
  }
  if (opening.phase === 'CHOOSING') return rights.canChoose ? { key: `${order}|map`, name: '地图选择' } : null
  if (opening.phase !== 'BANNING') return null
  if (getRoomStageIndex(data) === 2) return [...sides].some(side => !data.map?.lineupLocks?.[side]) ? { key: `${order}|lineup`, name: '首发确认' } : null
  if (!opening.setup?.firstBanSide) return rights.canChooseBanOrder ? { key: `${order}|ban-order`, name: '禁用顺序' } : null
  return rights.canBan && sides.has(opening.nextSide) ? { key: `${order}|ban|${opening.nextSide}`, name: '英雄禁用' } : null
}

export function roomAlertState(data) {
  if (!data?.match) return null
  return { stage: roomStage(data), turn: roomTurn(data) }
}

// Compares two consecutive snapshots. The first snapshot never alerts; a new turn for this account wins over the
// stage change that usually comes with it.
export function nextRoomAlert(previous, current) {
  if (!previous || !current) return null
  if (current.turn && current.turn.key !== previous.turn?.key) return { kind: 'turn', name: current.turn.name, order: current.stage.order }
  if (current.stage.key !== previous.stage.key) return { kind: 'stage', name: current.stage.name, order: current.stage.order }
  return null
}
