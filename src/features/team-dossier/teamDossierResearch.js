import { getArchiveMapRecords, getArchiveStageAnalysis } from './teamArchiveContent.js'
import { buildDossierSummary, getDossierMapPool } from './teamDossierPresentation.js'
import { getTeamSharedAppearances } from './teamEditorialContent.js'

const opponentKey = row => String(row.opponent?.id || row.opponent?.team_id || '')
const recordKey = record => `${record.match.match_id}:${record.mapIndex}`

export function getSeriesSequence(row, locale = 'zh-CN') {
  const records = getArchiveMapRecords([row], locale)
  let wins = 0
  let losses = 0
  const sequence = records.map(record => {
    if (record.mapOutcome === 'win') wins += 1
    if (record.mapOutcome === 'loss') losses += 1
    return { ...record, runningScore: `${wins} : ${losses}` }
  })
  const own = Number(row.match[row.side]?.score)
  const other = Number(row.match[row.side === 'team_a' ? 'team_b' : 'team_a']?.score)
  // A missing, unnamed or administrative map must not create an opening-map story.
  const complete = row.decided && !row.administrative && !row.bye && records.length > 0
    && records.length === (row.match.maps || []).length && wins === own && losses === other
  return {
    row, sequence, complete,
    openingLossWin: complete && row.tone === 'win' && records[0].mapOutcome === 'loss',
    oneMapMargin: complete && Math.abs(own - other) === 1 && Math.min(own, other) > 0,
    sweep: complete && row.tone === 'win' && losses === 0 && records.every(record => record.mapOutcome === 'win')
  }
}

export function getMapOpponents(map) {
  const opponents = new Map()
  let unknownLosses = 0
  for (const record of map?.records || []) {
    const key = opponentKey(record)
    if (!key) {
      if (record.mapOutcome === 'loss') unknownLosses += 1
      continue
    }
    if (!opponents.has(key)) opponents.set(key, { id: key, label: record.opponentLabel, wins: 0, losses: 0, draws: 0, records: [] })
    const item = opponents.get(key)
    item.records.push(record)
    item[record.mapOutcome === 'win' ? 'wins' : record.mapOutcome === 'loss' ? 'losses' : 'draws'] += 1
  }
  const groups = [...opponents.values()].sort((a, b) => b.losses - a.losses || b.records.length - a.records.length || a.id.localeCompare(b.id))
  const lossGroups = groups.filter(item => item.losses > 0)
  return {
    groups, unknownLosses,
    concentratedLoss: map?.losses > 0 && !unknownLosses && lossGroups.length === 1 && lossGroups[0].losses === map.losses ? lossGroups[0] : null
  }
}

export function getTeamOpponents(rows, locale = 'zh-CN') {
  const groups = new Map()
  for (const row of rows) {
    const key = opponentKey(row)
    if (!key || !row.decided || row.administrative || row.bye) continue
    if (!groups.has(key)) groups.set(key, { id: key, label: row.opponentLabel, team: row.opponent, rows: [] })
    groups.get(key).rows.push(row)
  }
  return [...groups.values()].map(group => {
    const records = getArchiveMapRecords(group.rows, locale)
    return {
      ...group, summary: buildDossierSummary(group.rows), records,
      mapWins: records.filter(record => record.mapOutcome === 'win').length,
      mapLosses: records.filter(record => record.mapOutcome === 'loss').length,
      mapDraws: records.filter(record => record.mapOutcome === 'draw').length
    }
  }).sort((a, b) => b.rows.length - a.rows.length || b.summary.losses - a.summary.losses || a.label.localeCompare(b.label))
}

export function getTeamRematch(opponents, locale = 'zh-CN') {
  const candidates = []
  for (const opponent of opponents) {
    for (let index = 1; index < opponent.rows.length; index += 1) {
      const before = opponent.rows[index - 1]
      const after = opponent.rows[index]
      candidates.push({ opponent, before, after, changed: ['win', 'loss'].includes(before.tone) && ['win', 'loss'].includes(after.tone) && before.tone !== after.tone })
    }
  }
  const chosen = candidates.sort((a, b) => Number(b.changed) - Number(a.changed) || b.opponent.records.length - a.opponent.records.length)[0]
  if (!chosen) return null
  const before = getSeriesSequence(chosen.before, locale)
  const after = getSeriesSequence(chosen.after, locale)
  const maps = new Map()
  for (const [side, meeting] of [['before', before], ['after', after]]) {
    for (const record of meeting.sequence) {
      if (!maps.has(record.mapCanonicalName)) maps.set(record.mapCanonicalName, { name: record.mapCanonicalName, displayName: record.mapName, image: record.mapImage, before: [], after: [] })
      maps.get(record.mapCanonicalName)[side].push(record)
    }
  }
  return { ...chosen, meetings: [before, after], maps: [...maps.values()] }
}

export function getMemberConnections(member, members) {
  const keys = new Set(member?.records.map(recordKey) || [])
  return members.filter(item => item.playerId !== member?.playerId)
    .map(item => ({ playerId: item.playerId, maps: item.records.filter(record => keys.has(recordKey(record))).length }))
    .filter(item => item.maps > 0)
    .sort((a, b) => b.maps - a.maps || a.playerId.localeCompare(b.playerId))
}

export function getTeamResearch(rows, roster = [], locale = 'zh-CN') {
  const played = rows.filter(row => row.decided && !row.administrative && !row.bye)
  const mapPool = getDossierMapPool(rows, locale)
  const records = getArchiveMapRecords(rows, locale)
  const appearances = getTeamSharedAppearances(roster, rows, locale)
  const opponents = getTeamOpponents(rows, locale)
  const sequences = played.map(row => getSeriesSequence(row, locale))
  return {
    played, mapPool, records, appearances, opponents,
    summary: buildDossierSummary(played),
    stages: getArchiveStageAnalysis(rows, locale),
    rematch: getTeamRematch(opponents, locale),
    sequences,
    completeSequences: sequences.filter(item => item.complete),
    openingLossWins: sequences.filter(item => item.openingLossWin),
    oneMapSeries: sequences.filter(item => item.oneMapMargin),
    sweeps: sequences.filter(item => item.sweep),
    unknownOpponents: played.filter(row => !opponentKey(row)).length
  }
}
