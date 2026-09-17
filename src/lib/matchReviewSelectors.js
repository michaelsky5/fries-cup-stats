import { getMapPlayerMatchRating, getMatchPlayerRating } from './matchRatingDisplay.js'

export const REVIEW_METRICS = [
  { key: 'eliminations', zh: '消灭', en: 'ELIM' },
  { key: 'assists', zh: '助攻', en: 'AST' },
  { key: 'deaths', zh: '阵亡', en: 'DTH' },
  { key: 'damage', zh: '伤害', en: 'DMG' },
  { key: 'healing', zh: '治疗', en: 'HEAL' },
  { key: 'mitigation', zh: '阻挡', en: 'MIT' }
]
const ROLE_ORDER = { TANK: 0, DPS: 1, SUPPORT: 2 }
const identity = value => String(value || '').trim().toLowerCase()

export function getReviewBanOrder(map, side) {
  const source = map?.raw || map || {}
  if (source.heroBansEnabled === false || source.is_administrative || !['A', 'B'].includes(side)) return null
  const first = String(source.first_ban_side ?? source.bans?.firstBanSide ?? '').trim().toUpperCase()
  return ['A', 'B'].includes(first) ? (first === side ? 1 : 2) : null
}

export function getReviewMapRating(entry, participants = []) {
  if (entry?.mapRating != null && entry.mapRating !== '' && Number.isFinite(Number(entry.mapRating))) return Number(entry.mapRating)
  return entry?.roleScore != null && entry.roleScore !== '' ? getMapPlayerMatchRating(entry.roleScore, participants) : null
}

// A team award uses this map's displayed rating. Preserve ties instead of
// choosing a winner from source order, and never turn missing values into zero.
export function getReviewTeamMvpKeys(rows) {
  const eligible = rows.filter(row => row.rating != null && row.rating !== '' && Number.isFinite(Number(row.rating)) && Number(row.rating) > 0)
  const highest = Math.max(0, ...eligible.map(row => Number(Number(row.rating).toFixed(1))))
  return new Set(eligible.filter(row => Number(Number(row.rating).toFixed(1)) === highest).map(row => row.key))
}

export function getReviewFormat(format, en = false) {
  const firstTo = /^FT\s*(\d+)$/i.exec(format || '')
  if (firstTo) return en ? `First to ${firstTo[1]} map wins` : `先赢 ${firstTo[1]} 图获胜`
  const bestOf = /^BO\s*(\d+)$/i.exec(format || '')
  if (bestOf) return en ? `Best of ${bestOf[1]}` : `${bestOf[1]} 图制（BO${bestOf[1]}）`
  return format || '—'
}

export function getMatchReviewProgress(dossier) {
  const format = /^\s*(FT|BO)\s*(\d+)\s*$/i.exec(dossier?.formatLabel || '')
  const target = format ? (format[1].toUpperCase() === 'FT' ? Number(format[2]) : Math.floor(Number(format[2]) / 2) + 1) : 0
  let a = 0
  let b = 0
  let previousOrder = 0
  let known = Boolean(dossier?.state.canShowResults && !dossier?.state.isForfeit)
  return [...(dossier?.mapRecords || [])].sort((left, right) => left.order - right.order).map(map => {
    if (map.order !== previousOrder + 1) known = false
    previousOrder = map.order
    const beforeA = a
    const beforeB = b
    const deciding = known && target > 1 && a === target - 1 && b === target - 1
    if (!map.hasResult || !['A', 'B', 'DRAW'].includes(map.winnerSide)) known = false
    if (map.winnerSide === 'A') a += 1
    if (map.winnerSide === 'B') b += 1
    return { ...map, cumulative: known ? `${a}:${b}` : '—', tied: known && a > 0 && a === b && beforeA !== beforeB, deciding }
  })
}

function findRating(row, entries, team) {
  const aliases = new Set([row.playerId, row.rawName, row.battleTag, row.displayName].map(identity).filter(Boolean))
  return entries.find(entry => entry.role === row.role &&
    (!entry.team_id || !team.id || identity(entry.team_id) === identity(team.id)) &&
    (!row.playerId || !entry.player_id || identity(row.playerId) === identity(entry.player_id)) &&
    [entry.player_id, entry.player_name, entry.battleTag, entry.display_name, entry.nickname].some(value => aliases.has(identity(value))))
}

// Sum published rows by player AND role. Changing roles must not blend ratings,
// and a player appearing in multiple hero rows on one map still played one map.
export function getMatchReviewPlayers(dossier, mapOrder = null) {
  if (!dossier?.state.canShowResults || dossier.state.isForfeit) return []
  const selectedMap = mapOrder == null ? null : dossier.mapRecords.find(map => map.order === Number(mapOrder))
  if (mapOrder != null && !selectedMap) return []
  const maps = selectedMap ? [selectedMap] : dossier.mapRecords
  const ratingEntries = (selectedMap ? selectedMap.rating : dossier.rating)?.entries || []
  const participants = ratingEntries.map(entry => entry.roleScore).filter(value => value != null && Number.isFinite(Number(value)))
  const groups = new Map()
  maps.forEach(map => ['A', 'B'].forEach(side => {
    ;(map[`team${side}Stats`] || []).forEach(row => {
      const playerKey = identity(row.playerId || row.battleTag || row.rawName || row.displayName) || `${map.order}-${row.originalIndex}`
      const key = `${side}:${playerKey}:${row.role}`
      if (!groups.has(key)) groups.set(key, { ...row, key, identityKey: `${side}:${playerKey}`, side, maps: new Set(), heroMaps: new Map(), ...Object.fromEntries(REVIEW_METRICS.map(metric => [metric.key, 0])) })
      const group = groups.get(key)
      group.maps.add(map.order)
      if (row.hero && !['—', '-'].includes(row.hero)) {
        if (!group.heroMaps.has(row.hero)) group.heroMaps.set(row.hero, new Set())
        group.heroMaps.get(row.hero).add(map.order)
      }
      REVIEW_METRICS.forEach(metric => { group[metric.key] += Number(row[metric.key]) || 0 })
    })
  }))
  return [...groups.values()].map(row => {
    const entry = findRating(row, ratingEntries, dossier[`team${row.side}`])
    let rating = null
    if (entry) {
      if (selectedMap) rating = getReviewMapRating(entry, participants)
      else rating = getMatchPlayerRating(entry)
    }
    const { heroMaps, ...player } = row
    const heroUsage = [...heroMaps].map(([hero, orders]) => ({ hero, maps: [...orders].sort((a, b) => a - b) }))
    return { ...player, maps: [...row.maps].sort((a, b) => a - b), heroes: heroUsage.map(item => item.hero), heroUsage, rating, lowSample: entry?.matchAwardEligible === false, ratingEntry: entry }
  }).sort((a, b) => a.side.localeCompare(b.side) || (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.originalIndex - b.originalIndex || a.displayName.localeCompare(b.displayName))
}

export function getMatchReviewTimeline(dossier) {
  return getMatchReviewProgress(dossier).map(map => {
    const players = getMatchReviewPlayers(dossier, map.order)
    return {
      ...map,
      playersByKey: new Map(players.map(player => [player.key, player])),
      teamMvpKeys: Object.fromEntries(['A', 'B'].map(side => [side, map.hasResult ? getReviewTeamMvpKeys(players.filter(player => player.side === side)) : new Set()]))
    }
  })
}

// Keep the original series award and its eligibility decision. A rounded
// table rating or an unfinished series must not create a different winner.
export function getMatchReviewMvp(dossier, players) {
  const entry = dossier?.topRatedPlayer
  if (!dossier?.state.isComplete || dossier.state.isForfeit || !dossier.rating?.supported || !entry || entry.matchAwardEligible === false) return null
  const row = (players || getMatchReviewPlayers(dossier)).find(player => player.ratingEntry === entry)
  return row?.rating != null && Number.isFinite(row.rating) && row.rating > 0 ? row : null
}

export function canCompareReviewPlayers(a, b) {
  return Boolean(a && b && a.side !== b.side && a.role === b.role && ['TANK', 'DPS', 'SUPPORT'].includes(a.role))
}

export function getReviewComparisonSelection(rows, player, currentOpponentKey = '') {
  if (!player || !['A', 'B'].includes(player.side) || !['TANK', 'DPS', 'SUPPORT'].includes(player.role)) return { compareA: '', compareB: '' }
  const candidates = rows.filter(row => canCompareReviewPlayers(player, row))
  const opponent = candidates.find(row => row.key === currentOpponentKey) || (candidates.length === 1 ? candidates[0] : null)
  const otherSide = player.side === 'A' ? 'B' : 'A'
  return { [`compare${player.side}`]: player.key, [`compare${otherSide}`]: opponent?.key || '' }
}

function summarizeComparisonSample(player, maps) {
  const appearances = maps.flatMap(map => {
    const row = map.playersByKey.get(player.key)
    return row ? [{ map, row }] : []
  })
  const totals = Object.fromEntries(REVIEW_METRICS.map(({ key }) => [key, appearances.length ? appearances.reduce((sum, { row }) => sum + row[key], 0) : null]))
  // Use the recorded role time for every appearance. Never replace missing
  // player time with the duration of the whole series or count hero rows twice.
  const timed = appearances.length > 0 && appearances.every(({ map, row }) => map.hasResult && Number.isFinite(Number(row.ratingEntry?.roleTimeMins)) && Number(row.ratingEntry.roleTimeMins) > 0)
  const minutes = timed ? appearances.reduce((sum, { row }) => sum + Number(row.ratingEntry.roleTimeMins), 0) : null
  const heroMaps = new Map()
  appearances.forEach(({ map, row }) => row.heroes.forEach(hero => {
    if (!heroMaps.has(hero)) heroMaps.set(hero, [])
    heroMaps.get(hero).push(map.order)
  }))
  return {
    ...player,
    maps: appearances.map(({ map }) => map.order),
    heroUsage: [...heroMaps].map(([hero, orders]) => ({ hero, maps: orders })),
    heroes: [...heroMaps.keys()],
    totals,
    minutes,
    per10: minutes == null ? null : Object.fromEntries(REVIEW_METRICS.map(({ key }) => [key, totals[key] / minutes * 10]))
  }
}

export function getReviewPlayerComparison(a, b, timeline, scope = 'common') {
  if (!canCompareReviewPlayers(a, b)) return null
  const commonMaps = timeline.filter(map => map.playersByKey.has(a.key) && map.playersByKey.has(b.key))
  const maps = scope === 'all' ? timeline : commonMaps
  const sampleA = summarizeComparisonSample(a, maps)
  const sampleB = summarizeComparisonSample(b, maps)
  return { a: sampleA, b: sampleB, commonOrders: commonMaps.map(map => map.order), canUsePer10: sampleA.per10 != null && sampleB.per10 != null }
}
