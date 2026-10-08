const record = value => value && typeof value === 'object' && !Array.isArray(value)
const rows = value => Array.isArray(value) && value.every(record)
const id = value => typeof value === 'string' && value.length > 0
const optionalLists = ['staff', 'referees', 'refereeCandidates', 'refereeOverrides', 'casters', 'casterCandidates', 'casterOverrides', 'blockers']

function incomplete() {
  return Object.assign(new Error('比赛房数据不完整，正在重新同步；已保存的比赛记录不会被清除。'), { data: { error: 'ROOM_RESPONSE_INCOMPLETE' } })
}

// Reject incomplete snapshots before rendering; do not invent permissions or a map.
export function normalizeRoomResponse(data, matchId) {
  if (!record(data) || data.match?.id !== matchId || !id(data.actor?.id) ||
    !['PREPARING', 'LIVE', 'PAUSED', 'REVIEW', 'ARCHIVED'].includes(data.phase) ||
    !['A', 'B'].every(side => id(data.match?.[`team${side}`]?.id)) ||
    !record(data.access) || typeof data.access.canWrite !== 'boolean' || typeof data.access.staff !== 'boolean' ||
    !['teamIds', 'representativeTeams'].every(key => Array.isArray(data.access[key]) && data.access[key].every(id)) ||
    !rows(data.rosters) || !rows(data.maps) || !rows(data.messages) || !rows(data.requests) ||
    !record(data.preflight) || !rows(data.preparation?.sides) ||
    !Number.isInteger(data.revision) || !Number.isInteger(data.match.revision)) throw incomplete()
  const validMap = map => record(map) && Number.isInteger(map.order) && map.order > 0 &&
    ['A', 'B'].every(side => map[`lineup${side}`] == null || rows(map[`lineup${side}`]) && map[`lineup${side}`].every(player => id(player.playerId) && ['DPS', 'TANK', 'SUP'].includes(player.role)))
  if (data.map != null && !validMap(data.map) || !data.maps.every(validMap) ||
    !data.rosters.every(roster => id(roster.teamId) && rows(roster.members) && roster.members.every(member => id(member.id)) && (roster.staff == null || rows(roster.staff))) ||
    data.opening != null && (!record(data.opening) || !record(data.opening.access) || !rows(data.opening.heroes) || !rows(data.opening.rules?.maps)) ||
    data.phase === 'PAUSED' && !record(data.pause)) throw incomplete()
  return { ...data, ...Object.fromEntries(optionalLists.map(key => [key, Array.isArray(data[key]) ? data[key].filter(value => value != null) : []])),
    rosters: data.rosters.map(roster => ({ ...roster, staff: roster.staff || [] })),
    personnelChanges: rows(data.personnelChanges) ? data.personnelChanges : [],
    operationHistory: rows(data.operationHistory) ? data.operationHistory : [] }
}

export function roomDiagnostic({ matchId, connection, error, code = connection?.errorCode || 'ROOM_RENDER_ERROR' }) {
  return [`Fries Cup / ${code}`, `Match: ${matchId}`, `State: ${connection?.status || 'render-error'}`, `Time: ${new Date().toISOString()}`, error ? `Message: ${String(error).slice(0, 300)}` : ''].filter(Boolean).join('\n')
}
