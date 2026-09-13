import { formatOwHeroName, getOwHero, getOwHeroCanonicalKey } from '../../lib/heroes.js'
import { performanceRecordKey } from './teamPerformance.js'

const unique = records => [...new Map(records.map(record => [performanceRecordKey(record), record])).values()]
const byFrequency = (a, b) => b.records.length - a.records.length || a.key.localeCompare(b.key)
const playerMatches = (player, memberId, heroKey) => (!memberId || player.id === memberId)
  && (!heroKey || getOwHeroCanonicalKey(player.hero) === heroKey)

export function reviewResults(records) {
  return {
    wins: records.filter(record => record.mapOutcome === 'win').length,
    losses: records.filter(record => record.mapOutcome === 'loss').length,
    draws: records.filter(record => record.mapOutcome === 'draw').length
  }
}

// Filter the existing record groups. The original stage report and its denominators stay intact.
export function scopeHeroReport(report, records) {
  const scoped = unique(records)
  const keys = new Set(scoped.map(performanceRecordKey))
  const groups = source => source.map(group => ({ ...group, records: unique(group.records).filter(record => keys.has(performanceRecordKey(record))) }))
    .filter(group => group.records.length).sort(byFrequency)
  const bans = Object.fromEntries(['own', 'opponent'].map(side => [side, groups(report.bans[side]).map(group => ({ ...group, maps: group.records.length }))]))
  for (const side of ['own', 'opponent']) bans[`${side}Coverage`] = unique(bans[side].flatMap(group => group.records)).length
  return { records: scoped, lineups: groups(report.lineups), bans }
}

export function repeatedReviewContexts(records) {
  const groups = new Map()
  for (const record of unique(records)) {
    const opponentId = String(record.opponent?.id || record.opponent?.team_id || '')
    const map = record.mapCanonicalName || record.mapName
    if (!opponentId || !map) continue
    const key = JSON.stringify([opponentId, map])
    if (!groups.has(key)) groups.set(key, { key, opponent: record.opponentLabel, map: record.mapName, records: [] })
    groups.get(key).records.push(record)
  }
  return [...groups.values()].filter(group => new Set(group.records.map(record => record.match.match_id)).size > 1)
    .sort(byFrequency).map(group => ({ ...group, ...reviewResults(group.records) }))
}

export function getHeroReview(report, { heroKey, memberId, sample } = {}, locale = 'zh-CN') {
  const member = report.members.find(item => item.id === memberId) || null
  const memberKey = member?.id || ''
  const records = unique(report.records).filter(record => !member || record.own.players.some(player => player.id === member.id))
  const source = scopeHeroReport(report, records)
  const heroes = report.heroes.map(hero => ({ ...hero,
    records: records.filter(record => record.own.players.some(player => playerMatches(player, memberKey, hero.key)))
  })).filter(hero => hero.records.length).map(hero => ({ ...hero, maps: hero.records.length })).sort(byFrequency)
  const key = getOwHeroCanonicalKey(heroKey)
  const recordedHero = [...report.heroes, ...report.bans.own, ...report.bans.opponent].find(hero => hero.key === key)
  // Keep a recognised selection when a new stage or player has no records for it.
  const hero = key && (recordedHero || getOwHero(heroKey)) ? {
    key, hero: recordedHero?.hero || heroKey, label: formatOwHeroName(recordedHero?.hero || heroKey, locale)
  } : null
  const samples = {
    recorded: hero ? records.filter(record => record.own.players.some(player => playerMatches(player, memberKey, hero.key))) : records,
    own: hero ? source.bans.own.find(item => item.key === hero.key)?.records || [] : [],
    opponent: hero ? source.bans.opponent.find(item => item.key === hero.key)?.records || [] : []
  }
  const activeSample = hero && ['own', 'opponent'].includes(sample) ? sample : 'recorded'
  const selectedRecords = hero ? samples[activeSample] : records
  const members = new Map()
  if (hero) for (const record of selectedRecords) for (const player of record.own.players) {
    if (activeSample === 'recorded' && !playerMatches(player, memberKey, hero.key)) continue
    if (!members.has(player.id)) members.set(player.id, {
      id: player.id, name: report.members.find(item => item.id === player.id)?.name || player.name, records: []
    })
    members.get(player.id).records.push(record)
  }
  return {
    member, hero, heroes, sample: activeSample, samples, base: source,
    counts: { recorded: samples.recorded.length,
      own: source.bans.ownCoverage ? samples.own.length : null,
      opponent: source.bans.opponentCoverage ? samples.opponent.length : null },
    report: scopeHeroReport(report, selectedRecords),
    members: [...members.values()].map(item => ({ ...item, records: unique(item.records) }))
      .sort((a, b) => b.records.length - a.records.length || a.id.localeCompare(b.id)),
    repeated: repeatedReviewContexts(selectedRecords), results: reviewResults(selectedRecords)
  }
}

export function getReviewBan(record, side) {
  const sourceSide = side === 'own' ? record.side : record.side === 'team_a' ? 'team_b' : 'team_a'
  const value = String(record.match.maps[record.mapIndex]?.[`${sourceSide}_ban`] ?? '').trim()
  if (/^(none|无|未禁用)$/i.test(value)) return { kind: 'none' }
  if (!value || /^(null|unknown|—|-)$/i.test(value)) return { kind: 'unknown' }
  return { kind: 'named', hero: value }
}
