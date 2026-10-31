// Non-counting matches settle at zero. RR5 points still follow the audited maps.
export function roomSettlementProposal({ match, result }) {
  if (!result?.official) return null
  if (result.countsTowardStandings === false) return { pointsA: 0, pointsB: 0, reason: '本场不增加赛段积分，双方零分结算并保留赛果。' }
  if (result.forfeit && [result.forfeit.pointsA, result.forfeit.pointsB].every(Number.isInteger)) {
    return { pointsA: result.forfeit.pointsA, pointsB: result.forfeit.pointsB, reason: '按已审核 RR5 弃权裁定逐图计算积分。' }
  }
  if (match?.format !== 'RR5' || result.maps?.length !== 5 || ![result.scoreA, result.scoreB].every(value => Number.isInteger(value) && value >= 0 && value <= 5) || result.scoreA + result.scoreB > 5) return null
  const forfeits = result.maps.filter(map => map.isAdministrative && map.administrativeReason === 'MAP_FORFEIT')
  if (forfeits.some(map => !['A', 'B'].includes(map.forfeitedBySide))) return null
  const pointsA = 5 + result.scoreA - forfeits.filter(map => map.forfeitedBySide === 'A').length
  const pointsB = 5 + result.scoreB - forfeits.filter(map => map.forfeitedBySide === 'B').length
  return { pointsA, pointsB, reason: forfeits.length ? `RR5 实赛保留参赛分与胜场分，弃权图不给弃权方参赛分：${pointsA} / ${pointsB}。` : `RR5 五图参赛分 5 + 小局胜场分：${pointsA} / ${pointsB}。` }
}
