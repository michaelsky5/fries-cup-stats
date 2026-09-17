export const SMALL_MAP_SAMPLE = 3

export function getDossierMapMatchPath(record) {
  const path = `/matches/${encodeURIComponent(record.match.match_id)}`
  const order = Number(record.mapOrder)
  return Number.isInteger(order) && order > 0 ? `${path}?map=${order}` : path
}

export function getDossierMapAnalysis(mapPool) {
  const maps = mapPool.filter(map => map.maps > 0)
  const samples = maps.reduce((sum, map) => sum + map.maps, 0)
  const wins = maps.reduce((sum, map) => sum + map.wins, 0)
  const maxSamples = Math.max(1, ...maps.map(map => map.maps))
  const tickStep = Math.max(1, Math.ceil(maxSamples / 6))
  const maxX = Math.max(2, Math.ceil(maxSamples / tickStep) * tickStep)
  const groups = new Map()
  for (const map of maps) {
    // Coincident observations stay at their real coordinates; no visual jitter.
    const key = `${map.maps}:${map.wins}`
    if (!groups.has(key)) groups.set(key, { key, samples: map.maps, winRate: map.wins / map.maps, maps: [] })
    groups.get(key).maps.push(map)
  }
  return {
    maps, samples, winRate: samples ? wins / samples : null,
    mostPlayed: [...maps].sort((a, b) => b.maps - a.maps || b.wins - a.wins || a.name.localeCompare(b.name))[0] || null,
    smallSampleCount: maps.filter(map => map.maps < SMALL_MAP_SAMPLE).length,
    groups: [...groups.values()], maxX,
    ticks: Array.from({ length: Math.floor(maxX / tickStep) + 1 }, (_, index) => index * tickStep)
  }
}

export function getDossierMapReading(map, analysis, locale = 'zh-CN') {
  const en = locale === 'en-US'
  if (!map || analysis.winRate === null) return en ? 'The first scored map will start the picture.' : '第一张具名地图的比分发布后，表现图景将在这里展开。'
  if (map.maps < SMALL_MAP_SAMPLE) return en
    ? `Only ${map.maps} recorded map${map.maps === 1 ? '' : 's'}. Read this as a result so far, not an established pattern.`
    : `目前只有 ${map.maps} 份记录。它描述已经发生的赛果，还不足以判断稳定表现。`
  if (map.wins === map.maps) return en
    ? `Won all ${map.maps} recorded maps here. An unbeaten record in this sample, not a prediction of the next match.`
    : `${map.maps} 份记录全部获胜。这是在已有样本中的不败记录，下一场仍需重新证明。`
  const difference = (map.winRate - analysis.winRate) * 100
  if (Math.abs(difference) < .05) return en
    ? `Across ${map.maps} records, the win rate matches the team's overall map record.`
    : `${map.maps} 份记录中的胜率，与本队全部地图记录持平。`
  return en
    ? `${Math.abs(difference).toFixed(1)} percentage points ${difference > 0 ? 'above' : 'below'} the team's overall map win rate, across ${map.maps} records.`
    : `在 ${map.maps} 份记录中，胜率比本队全部地图${difference > 0 ? '高' : '低'} ${Math.abs(difference).toFixed(1)} 个百分点。`
}
