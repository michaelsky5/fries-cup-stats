// The API's BANNING phase includes lineup submission before either team's ban.
// The progress rail and the actionable panel must use the same interpretation.
export const ROOM_STAGES = ['先手权确认', '地图选择', '首发确认', '英雄禁用', '准备确认', '比赛进行', '地图结果', '赛果提交']

export function getRoomStageIndex(data) {
  if (data.result || data.series?.complete || data.phase === 'ARCHIVED') return 7
  if (data.phase === 'REVIEW') return 6
  if (['LIVE', 'PAUSED'].includes(data.phase)) return 5
  const opening = data.opening
  if (opening && !opening.complete && opening.phase !== 'BANNING') {
    return opening.phase === 'CHOOSING' ? 1 : 0
  }
  if (opening?.phase === 'BANNING' && !opening.complete) {
    return data.map?.lineupA?.length === 5 && data.map?.lineupB?.length === 5 ? 3 : 2
  }
  return 4
}

export function getRoomOperatingSides(data) {
  return data.preparation.sides.filter(side => data.access.staff || data.access.representativeTeams.includes(side.team.id))
}
