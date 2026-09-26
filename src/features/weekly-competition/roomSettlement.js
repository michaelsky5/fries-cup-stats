// Only prefill an audited RR5 result. The server validates the calculation again on settlement.
export function roomSettlementProposal({ match, result }) {
  if (!result?.official) return null
  if (result.countsTowardStandings === false) return { pointsA: 0, pointsB: 0, reason: '本周期不计正式积分，双方零分结算并保留战绩。' }
  if (result.forfeit && [result.forfeit.pointsA, result.forfeit.pointsB].every(Number.isInteger)) {
    return { pointsA: result.forfeit.pointsA, pointsB: result.forfeit.pointsB, reason: '按已审核 RR5 弃权裁定逐图计算积分。' }
  }
  if (match?.format !== 'RR5' || result.maps?.length !== 5 || ![result.scoreA, result.scoreB].every(value => Number.isInteger(value) && value >= 0 && value <= 5) || result.scoreA + result.scoreB > 5) return null
  const pointsA = 5 + result.scoreA, pointsB = 5 + result.scoreB
  return { pointsA, pointsB, reason: `RR5 五图参赛分 5 + 小局胜场分：${pointsA} / ${pointsB}。` }
}
