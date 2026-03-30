// src/lib/selectors.js

// 安全的数组转换辅助函数
export const safeArr = v => Array.isArray(v) ? v : []

// 获取全局赛事概览数据
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

// 赛段筛选选项
export function getStageOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.stage).filter(Boolean)))]
}

// 轮次筛选选项
export function getRoundOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.round).filter(Boolean)))]
}

// 赛制筛选选项
export function getFormatOptions(db) {
  return ['ALL', ...Array.from(new Set(safeArr(db?.matches).map(m => m.format).filter(Boolean)))]
}

// 通过 ID 获取单场比赛详情
export function getMatchById(db, matchId) {
  return safeArr(db?.matches).find(m => m.match_id === matchId || m.raw_match_id === matchId) || null
}

// 比赛列表多条件过滤
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

// 获取全联盟排行榜 (已配合后端新版导出逻辑，前端无需再做复杂的 Set 去重计算)
export function getLeaderboardRows(db) {
  // 直接过滤掉纯替补(时间为0)的选手
  const activePlayers = safeArr(db?.player_totals).filter(p => (p.raw_time_mins || 0) > 0)
  
  return activePlayers.map((row, index) => ({
    rank: index + 1,
    ...row
  }))
}

// 排行榜列表多条件过滤
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

// 排行榜自定义排序逻辑（混合类型排序）
export function sortLeaderboard(rows, key, direction = 'desc') {
  const sorted = [...safeArr(rows)]

  sorted.sort((a, b) => {
    const va = a?.[key]
    const vb = b?.[key]

    const numA = Number(va)
    const numB = Number(vb)

    const isNumA = va !== null && va !== '' && va !== undefined && !isNaN(numA)
    const isNumB = vb !== null && vb !== '' && vb !== undefined && !isNaN(numB)

    if (isNumA && isNumB) {
      if (numA < numB) return direction === 'asc' ? -1 : 1
      if (numA > numB) return direction === 'asc' ? 1 : -1
      return 0
    }

    const sa = String(va || '').toLowerCase()
    const sb = String(vb || '').toLowerCase()
    if (sa < sb) return direction === 'asc' ? -1 : 1
    if (sa > sb) return direction === 'asc' ? 1 : -1
    return 0
  })

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }))
}

// 获取全局地图统计数据 (包含各模式分类与选取率)
export function getMapStats(db) {
  const matches = safeArr(db?.matches)
  const mapData = {}
  let totalValidMaps = 0

  matches.forEach(match => {
    if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return

    safeArr(match.maps).forEach(map => {
      const mapName = map.map_name
      const mapType = map.map_type

      if (!mapName || mapType === 'UNKNOWN') return

      totalValidMaps++

      if (!mapData[mapName]) {
        mapData[mapName] = {
          name: mapName,
          type: mapType,
          playedCount: 0
        }
      }
      mapData[mapName].playedCount += 1
    })
  })

  const result = Object.values(mapData)
    .map(m => ({
      ...m,
      pickRate: totalValidMaps > 0 ? Number((m.playedCount / totalValidMaps).toFixed(4)) : 0
    }))
    .sort((a, b) => b.playedCount - a.playedCount)

  const groupedByType = result.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = []
    acc[curr.type].push(curr)
    return acc
  }, {})

  return {
    totalValidMaps,
    flatList: result,
    groupedByType
  }
}

// 获取单张地图的深度数据 (环境/胜率/极值记录)
export function getMapDetail(db, mapName) {
  const matches = safeArr(db?.matches)
  let totalPlays = 0
  let totalTimeSeconds = 0

  const heroCounts = {}
  const teamStats = {}
  
  // 极值记录器
  let records = {
    maxElims: { value: 0, player: '', hero: '', matchId: '' },
    maxDamage: { value: 0, player: '', hero: '', matchId: '' },
    maxHealing: { value: 0, player: '', hero: '', matchId: '' }
  }

  matches.forEach(match => {
    if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return

    const mapData = safeArr(match.maps).find(m => m.map_name === mapName)
    if (!mapData) return

    totalPlays++

    // 计算总时长用于平均值
    const timeParts = String(mapData.match_time || '0:00').split(':')
    const mins = parseInt(timeParts[0], 10) || 0
    const secs = parseInt(timeParts[1], 10) || 0
    totalTimeSeconds += (mins * 60 + secs)

    // 统计战队胜率
    const winnerId = mapData.winner
    const teamAId = match.team_a?.id
    const teamBId = match.team_b?.id

    if (teamAId) {
      if (!teamStats[teamAId]) teamStats[teamAId] = { name: mapData.team_a_name, wins: 0, plays: 0 }
      teamStats[teamAId].plays++
      if (winnerId === teamAId) teamStats[teamAId].wins++
    }
    if (teamBId) {
      if (!teamStats[teamBId]) teamStats[teamBId] = { name: mapData.team_b_name, wins: 0, plays: 0 }
      teamStats[teamBId].plays++
      if (winnerId === teamBId) teamStats[teamBId].wins++
    }

    // 统计英雄出场与选手极值
    const allStats = [...safeArr(mapData.team_a_stats), ...safeArr(mapData.team_b_stats)]
    
    allStats.forEach(stat => {
      if (!stat.heroes_played) return
      
      const hero = stat.heroes_played
      heroCounts[hero] = (heroCounts[hero] || 0) + 1

      const elims = Number(stat.eliminations) || 0
      const dmg = Number(stat.damage) || 0
      const heal = Number(stat.healing) || 0
      
      // 取名字时去重 BattleTag (如 "User#1234" -> "User")
      const cleanName = (stat.player_name || 'Unknown').split('#')[0]

      if (elims > records.maxElims.value) {
        records.maxElims = { value: elims, player: cleanName, hero, matchId: match.match_id }
      }
      if (dmg > records.maxDamage.value) {
        records.maxDamage = { value: dmg, player: cleanName, hero, matchId: match.match_id }
      }
      if (heal > records.maxHealing.value) {
        records.maxHealing = { value: heal, player: cleanName, hero, matchId: match.match_id }
      }
    })
  })

  // 格式化输出数据
  // 英雄选择率 (一局比赛两支队伍最多可能出现 2 次该英雄，故分母为 totalPlays * 2)
  const heroStats = Object.entries(heroCounts)
    .map(([hero, count]) => ({
      hero,
      count,
      pickRate: totalPlays > 0 ? (count / (totalPlays * 2)) : 0 
    }))
    .sort((a, b) => b.count - a.count)

  const teamWinRates = Object.values(teamStats)
    .map(t => ({
      ...t,
      winRate: t.plays > 0 ? (t.wins / t.plays) : 0
    }))
    .sort((a, b) => b.winRate - a.winRate || b.plays - a.plays)

  const avgTimeSeconds = totalPlays > 0 ? Math.round(totalTimeSeconds / totalPlays) : 0
  const avgMins = Math.floor(avgTimeSeconds / 60)
  const avgSecs = String(avgTimeSeconds % 60).padStart(2, '0')

  return {
    mapName,
    totalPlays,
    avgMatchTime: `${avgMins}:${avgSecs}`,
    heroStats,
    teamWinRates,
    records
  }
}

// ✨ 新增/替换：获取瑞士轮战队积分榜 (终极防弹版)
export function getSwissStandings(db) {
  const standings = {}

  // 1. 初始化所有战队的数据桶
  safeArr(db?.teams).forEach(team => {
    standings[team.team_id] = {
      team_id: team.team_id,
      team_name: team.team_name,
      team_short_name: team.team_short_name || team.team_name,
      matches_played: 0,
      match_wins: 0,
      match_losses: 0,
      map_wins: 0,
      map_losses: 0,
      map_diff: 0
    }
  })

  // 2. 筛选出所有瑞士轮的比赛 (支持兼容老旧数据的 ID 匹配)
  const swissMatches = safeArr(db?.matches).filter(m => 
    (m.stage === 'SWISS' || m.stage === 'swiss' || m.match_id?.includes('SWISS')) && 
    (m.status === 'COMPLETE' || m.status === 'COMPLETED')
  )

  // 3. 遍历比赛，累加战绩
  swissMatches.forEach(match => {
    const teamA = match.team_a?.id
    const teamB = match.team_b?.id
    
    if (!teamA || !teamB || !standings[teamA] || !standings[teamB]) return

    standings[teamA].matches_played += 1
    standings[teamB].matches_played += 1

    // 🌟 防弹逻辑：自己遍历地图算小分，不依赖外层可能漏填的 score 字段
    let realMapWinsA = 0
    let realMapWinsB = 0

    safeArr(match.maps).forEach(mapObj => {
      // 通过分数严格判断谁赢了这张图
      const sA = Number(mapObj.score_a || 0)
      const sB = Number(mapObj.score_b || 0)
      
      if (sA > sB || mapObj.winner === teamA) realMapWinsA++
      else if (sB > sA || mapObj.winner === teamB) realMapWinsB++
    })

    // 累加真实小局比分
    standings[teamA].map_wins += realMapWinsA
    standings[teamA].map_losses += realMapWinsB
    standings[teamB].map_wins += realMapWinsB
    standings[teamB].map_losses += realMapWinsA

    // 🌟 防弹逻辑：自己判断大场胜负，只要 A 赢的小局比 B 多，A 就是大场胜者
    if (realMapWinsA > realMapWinsB) {
      standings[teamA].match_wins += 1
      standings[teamB].match_losses += 1
    } else if (realMapWinsB > realMapWinsA) {
      standings[teamB].match_wins += 1
      standings[teamA].match_losses += 1
    }
  })

  // 4. 计算净胜局，并进行严谨的瑞士轮排序
  const result = Object.values(standings).map(t => {
    t.map_diff = t.map_wins - t.map_losses
    return t
  })

  result.sort((a, b) => {
    if (a.match_wins !== b.match_wins) return b.match_wins - a.match_wins // 大分
    if (a.match_losses !== b.match_losses) return a.match_losses - b.match_losses // 负场少优先
    if (a.map_diff !== b.map_diff) return b.map_diff - a.map_diff // 净胜局
    if (a.map_wins !== b.map_wins) return b.map_wins - a.map_wins // 胜局数
    return a.team_name.localeCompare(b.team_name)
  })

  return result.map((t, index) => ({ ...t, rank: index + 1 }))
}