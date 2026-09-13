import { memberMatchup, performanceRecordKey, getPerformanceRows, enrichPerformanceRecords, PERFORMANCE_METRICS } from './teamPerformance.js'
import { getArchiveMapRecords } from './teamArchiveContent.js'
import { getTeamResearch } from './teamDossierResearch.js'

export const roleMetrics = role => ({ TANK: ['mitigation', 'damage', 'deaths'], DPS: ['eliminations', 'damage', 'deaths'], SUP: ['healing', 'assists', 'deaths'] })[role] || ['damage', 'eliminations', 'deaths']
export const roleDefaultMetric = role => roleMetrics(role)[0]
export const relativeDifference = (own, other) => Number.isFinite(own) && Number.isFinite(other) && other > 0 ? (own / other - 1) * 100 : null

export const ROLE_MIN_MAPS = 5
export const ROLE_MIN_MINUTES = 30

export function getRolePeerSamples(matches, stage = 'all', locale = 'zh-CN') {
  const scoped = matches.filter(match => stage === 'all' || match.stage === stage)
  const ids = [...new Set(scoped.flatMap(match => [match.team_a?.id, match.team_b?.id]).filter(Boolean))]
  const players = new Map()
  for (const id of ids) {
    const records = enrichPerformanceRecords(getArchiveMapRecords(getPerformanceRows(scoped, id, locale), locale))
    for (const record of records) for (const player of record.own.players) {
      if (player.role === 'UNKNOWN' || !(player.minutes > 0)) continue
      const key = `${player.id}|${player.role}`
      if (!players.has(key)) players.set(key, { id: player.id, role: player.role, entries: new Map() })
      players.get(key).entries.set(performanceRecordKey(record), player)
    }
  }
  return Object.fromEntries(['TANK', 'DPS', 'SUP'].map(role => [role, Object.fromEntries(PERFORMANCE_METRICS.map(metric => [metric.id,
    [...players.values()].filter(player => player.role === role).flatMap(player => {
      const entries = [...player.entries.values()].filter(entry => Number.isFinite(entry.values[metric.id]))
      const minutes = entries.reduce((sum, entry) => sum + entry.minutes, 0)
      if (entries.length < ROLE_MIN_MAPS || minutes < ROLE_MIN_MINUTES) return []
      return [{ id: player.id, count: entries.length, minutes, value: entries.reduce((sum, entry) => sum + entry.values[metric.id], 0) * 10 / minutes }]
    })
  ]))]))
}

export function rolePercentile(field, member, metric) {
  const samples = field?.[member.role]?.[metric] || []
  const own = samples.find(sample => sample.id === member.id)
  if (!own || samples.length < 5) return null
  const tolerance = Math.max(1, Math.abs(own.value)) * 1e-9
  const less = samples.filter(sample => sample.value < own.value - tolerance).length
  const ties = samples.filter(sample => Math.abs(sample.value - own.value) <= tolerance).length
  return { value: (less + ties / 2) / samples.length * 100, count: samples.length, own }
}

export function memberQuickRead(member, mapCount) {
  return {
    appearance: mapCount > 0 ? member.maps / mapCount : null,
    measures: roleMetrics(member.role).map(id => {
      const matchup = memberMatchup(member, id)
      return { id, ...matchup, difference: relativeDifference(matchup.own, matchup.opponent) }
    })
  }
}

export function lineupContexts(lineups) {
  const total = lineups.reduce((sum, lineup) => sum + lineup.records.length, 0)
  return lineups.map(lineup => {
    const records = [...new Map(lineup.records.map(record => [performanceRecordKey(record), record])).values()]
    const maps = new Map()
    for (const record of records) maps.set(record.mapName, (maps.get(record.mapName) || 0) + 1)
    const ordered = [...maps].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const common = ordered.filter(([, count]) => count === ordered[0]?.[1])
    return { ...lineup, records, share: total ? records.length / total : null,
      wins: records.filter(record => record.mapOutcome === 'win').length,
      losses: records.filter(record => record.mapOutcome === 'loss').length,
      draws: records.filter(record => record.mapOutcome === 'draw').length,
      commonMaps: common.map(([name]) => name), commonCount: common[0]?.[1] || 0 }
  })
}

export function seasonRecordFacts(rows, locale = 'zh-CN') {
  const unique = [...new Map(rows.map(row => [row.match.match_id, row])).values()]
  // Preserve the journey's chronological order; an unknown completed score interrupts a confirmed run.
  const completed = unique.filter(row => row.complete && !row.bye && !row.administrative && !row.cancelled)
  let run = [], longest = []
  for (const row of completed) {
    run = row.tone === 'win' ? [...run, row] : []
    if (run.length > longest.length) longest = run
  }
  const played = completed.filter(row => row.decided)
  const maps = getArchiveMapRecords(unique, locale)
  const research = getTeamResearch(unique, [], locale)
  const wins = maps.filter(record => record.mapOutcome === 'win').length
  const losses = maps.filter(record => record.mapOutcome === 'loss').length
  return { longest, closing: run, closingKnown: completed.length > 0 && completed.at(-1).decided,
    played, maps, wins, losses, draws: maps.filter(record => record.mapOutcome === 'draw').length,
    differential: maps.length ? wins - losses : null,
    sweeps: research.sweeps.map(item => item.row), completeSequences: research.completeSequences.length,
    byes: unique.filter(row => row.bye).length,
    administrative: unique.filter(row => row.complete && row.administrative && !row.bye).length }
}
