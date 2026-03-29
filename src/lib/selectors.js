export const safeArr = v => Array.isArray(v) ? v : []

export function getGlobalSummary(db) {
  const matches = safeArr(db?.matches)
  const players = safeArr(db?.players)
  const teams = safeArr(db?.teams)
  const totalMaps = matches.reduce((sum, m) => sum + safeArr(m.maps).length, 0)
  const completed = matches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED').length
  const inProgress = matches.filter(m => m.status === 'IN_PROGRESS').length
  const pending = matches.filter(m => !['COMPLETE', 'COMPLETED', 'IN_PROGRESS'].includes(m.status)).length

  return {
    updatedAt: db?.updated_at || '',
    teamCount: teams.length,
    playerCount: players.length,
    matchCount: matches.length,
    mapCount: totalMaps,
    completed,
    inProgress,
    pending
  }
}

export function getStageOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.stage).filter(Boolean)))]
}

export function getRoundOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.round).filter(Boolean)))]
}

export function getFormatOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.format).filter(Boolean)))]
}

export function getMatchById(db, matchId) {
  return safeArr(db?.matches).find(m => m.match_id === matchId || m.raw_match_id === matchId) || null
}

export function filterMatches(matches, filters) {
  const { stage = 'ALL', round = 'ALL', status = 'ALL', format = 'ALL', query = '' } = filters
  const q = query.trim().toLowerCase()

  return safeArr(matches).filter(match => {
    if (stage !== 'ALL' && match.stage !== stage) return false
    if (round !== 'ALL' && match.round !== round) return false
    if (status !== 'ALL' && match.status !== status) return false
    if (format !== 'ALL' && match.format !== format) return false

    if (!q) return true

    return [
      match.match_id,
      match.raw_match_id,
      match.match_display_name,
      match.team_a?.name,
      match.team_a?.short,
      match.team_b?.name,
      match.team_b?.short,
      match.stage,
      match.round
    ].some(v => String(v || '').toLowerCase().includes(q))
  })
}

export function getLeaderboardRows(db) {
  return safeArr(db?.player_totals).map((row, index) => ({
    rank: index + 1,
    ...row
  }))
}

export function filterLeaderboard(rows, filters) {
  const { role = 'ALL', team = 'ALL', minTime = 0, query = '' } = filters
  const q = query.trim().toLowerCase()

  return safeArr(rows).filter(row => {
    if (role !== 'ALL' && row.role !== role) return false
    if (team !== 'ALL' && row.team_id !== team) return false
    if ((row.raw_time_mins || 0) < minTime) return false

    if (!q) return true

    return [
      row.player_name,
      row.display_name,
      row.nickname,
      row.team_name,
      row.team_short_name,
      row.most_played_hero
    ].some(v => String(v || '').toLowerCase().includes(q))
  })
}

export function sortLeaderboard(rows, key, direction = 'desc') {
  const sorted = [...safeArr(rows)]

  sorted.sort((a, b) => {
    const va = a?.[key]
    const vb = b?.[key]

    // 1. 尝试转换为数字
    const numA = Number(va)
    const numB = Number(vb)

    // 2. 严谨判断：是否为真实的有效数字
    // (排除 null、undefined、纯空格字符串被误转为 0 的情况，以及 NaN)
    const isNumA = va !== null && va !== '' && va !== undefined && !isNaN(numA)
    const isNumB = vb !== null && vb !== '' && vb !== undefined && !isNaN(numB)

    // 3. 如果两边都是有效数字，执行【数值排序】
    if (isNumA && isNumB) {
      if (numA < numB) return direction === 'asc' ? -1 : 1
      if (numA > numB) return direction === 'asc' ? 1 : -1
      return 0
    }

    // 4. 否则，执行【字符串字典序排序】（适用于名称、角色等文本）
    const sa = String(va || '').toLowerCase()
    const sb = String(vb || '').toLowerCase()
    if (sa < sb) return direction === 'asc' ? -1 : 1
    if (sa > sb) return direction === 'asc' ? 1 : -1
    return 0
  })

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }))
}