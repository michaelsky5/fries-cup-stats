import { getDossierMapPool, getDossierStageLabel } from './teamDossierPresentation.js'
import { getDossierPlayerKey } from './teamDossierScenes.js'

// Team emblems retain their own colours; the archive uses the shared FC palette.
export function getArchiveIdentity() {
  return { '--team-ink': 'var(--fc-data-ink)', '--team-tint': 'var(--fc-data-signal)', '--team-paper': 'var(--fc-data-paper-deep)' }
}

export function getArchiveMapRecords(rows, locale = 'zh-CN') {
  const order = new Map(rows.map((row, index) => [row.match.match_id, index]))
  return getDossierMapPool(rows, locale).flatMap(map => map.records.map(record => ({ ...record, mapName: map.displayName, mapCanonicalName: map.name, mapImage: map.imageUrl })))
    .sort((a, b) => order.get(a.match.match_id) - order.get(b.match.match_id) || a.mapIndex - b.mapIndex)
}

export function getArchiveMembers(roster, rows, locale = 'zh-CN') {
  const members = new Map(roster.map(player => [getDossierPlayerKey(player), { player, records: [], stages: new Map(), matches: new Set() }]))
  const records = getArchiveMapRecords(rows, locale)
  for (const record of records) {
    const map = record.match.maps[record.mapIndex]
    const ownStats = map[`${record.side}_stats`]
    const side = record.side === 'team_a' ? 'A' : 'B'
    const stats = Array.isArray(ownStats) ? ownStats : (Array.isArray(map.player_stats) ? map.player_stats : []).filter(player => player.side === side || player.side === record.side)
    const ids = new Set(stats.map(player => String(player.player_id || '')).filter(Boolean))
    for (const id of ids) {
      const member = members.get(id)
      if (!member) continue
      member.records.push(record)
      member.matches.add(record.match.match_id)
      const stage = record.match.stage || 'UNKNOWN'
      member.stages.set(stage, (member.stages.get(stage) || 0) + 1)
    }
  }
  return [...members.values()].map(member => ({
    playerId: getDossierPlayerKey(member.player),
    records: member.records, maps: member.records.length, series: member.matches.size,
    first: member.records[0] || null, latest: member.records.at(-1) || null,
    stages: [...member.stages].map(([key, maps]) => ({ key, maps, label: getDossierStageLabel(key, locale) }))
  }))
}

export function getArchiveJourneyHref(journeyHref, matchId, memberId) {
  const [path, search = ''] = journeyHref.split('?')
  const params = new URLSearchParams(search)
  params.set('chapter', 'season-route')
  params.set('teamMatch', matchId)
  params.delete('journeyView')
  if (memberId) params.set('member', memberId)
  return `${path}?${params}`
}

export function getArchiveStageHref(journeyHref, stage) {
  const [path, search = ''] = journeyHref.split('?')
  const params = new URLSearchParams(search)
  params.set('chapter', 'journey')
  params.set('journeyView', 'records')
  params.set('teamStage', stage)
  params.set('journey', 'all')
  params.delete('result')
  params.delete('teamMatch')
  return `${path}?${params}`
}

export function getArchiveMatchReading(row, rows, locale = 'zh-CN') {
  const en = locale === 'en-US'
  if (row.bye || row.administrative || !row.decided) return row.note || (en ? 'The story continues when a result is published.' : '赛果发布后，这段征程会继续展开。')
  const opponentKey = item => item.opponent?.id || item.opponent?.team_id || item.opponentLabel
  const index = rows.findIndex(item => item.match.match_id === row.match.match_id)
  const previous = opponentKey(row) && index > 0 ? rows.slice(0, index).findLast(item => item.decided && !item.administrative && opponentKey(item) === opponentKey(row)) : null
  if (previous && previous.tone !== row.tone) return en
    ? `Against ${row.opponentLabel} again: ${previous.scoreLabel} last time, ${row.scoreLabel} this time.`
    : `再次交手 ${row.opponentLabel}：上一次 ${previous.scoreLabel}，这一次 ${row.scoreLabel}。`
  const records = getArchiveMapRecords([row], locale)
  const mine = Number(row.match[row.side]?.score)
  const other = Number(row.match[row.side === 'team_a' ? 'team_b' : 'team_a']?.score)
  const wins = records.filter(record => record.mapOutcome === 'win').length
  const losses = records.filter(record => record.mapOutcome === 'loss').length
  if (wins === mine && losses === other && records.length) {
    const firstWin = records.findIndex(record => record.mapOutcome === 'win')
    if (row.tone === 'win' && firstWin > 0 && records.slice(0, firstWin).every(record => record.mapOutcome === 'loss')) return en
      ? `Lost the opening ${firstWin === 1 ? 'map' : `${firstWin} maps`}, then finished the series ${row.scoreLabel}.`
      : `先丢 ${firstWin} 图，随后以 ${row.scoreLabel} 赢下这场比赛。`
    if (row.tone === 'win' && !losses && !records.some(record => record.mapOutcome === 'draw')) return en
      ? `Won all ${wins} recorded maps to close this series.`
      : `连下 ${wins} 图，结束这场对决。`
    return en ? `${wins} map wins, ${losses} map losses. Follow the map sequence below.` : `${wins} 图获胜、${losses} 图失利。沿着逐图记录，重新看这场对决。`
  }
  return en ? `A ${row.scoreLabel} result against ${row.opponentLabel}, in ${row.roundLabel}.` : `${row.roundLabel}，与 ${row.opponentLabel} 的对决以 ${row.scoreLabel} 结束。`
}

export function getArchiveStageAnalysis(rows, locale = 'zh-CN') {
  const stages = new Map()
  for (const record of getArchiveMapRecords(rows, locale)) {
    const key = record.match.stage || 'UNKNOWN'
    if (!stages.has(key)) stages.set(key, { key, label: getDossierStageLabel(key, locale), records: [], wins: 0, losses: 0, draws: 0, opponents: new Set() })
    const stage = stages.get(key)
    stage.records.push(record)
    stage[record.mapOutcome === 'win' ? 'wins' : record.mapOutcome === 'loss' ? 'losses' : 'draws'] += 1
    stage.opponents.add(record.opponent?.id || record.opponentLabel || record.match.match_id)
  }
  return [...stages.values()].map(stage => ({ ...stage, maps: stage.records.length, winRate: stage.wins / stage.records.length, opponentCount: stage.opponents.size }))
}

export function getArchiveDistribution(profiles, metricId) {
  const samples = profiles.filter(profile => profile.available?.[metricId] !== false).map(profile => ({ id: profile.id, name: profile.name, value: profile.values?.[metricId] })).filter(sample => Number.isFinite(sample.value) && sample.value >= 0).sort((a, b) => a.value - b.value)
  const middle = Math.floor(samples.length / 2)
  const median = samples.length ? samples.length % 2 ? samples[middle].value : (samples[middle - 1].value + samples[middle].value) / 2 : null
  return { samples, median, max: Math.max(1, ...samples.map(sample => sample.value)) }
}

export function getArchiveMetricAvailability(activePlayers, metrics) {
  return Object.fromEntries(metrics.map(metric => [metric.id, activePlayers.length > 0 && activePlayers.every(player => [...metric.totalKeys, ...metric.avgKeys].some(key => {
    const value = player[key]
    return value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
  }))]))
}
