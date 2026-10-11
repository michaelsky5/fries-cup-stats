import { getArchiveMapRecords } from './teamArchiveContent.js'
import { buildDossierSummary, getDossierMatch, getDossierStageLabel } from './teamDossierPresentation.js'
import { getDossierPlayerKey, getDossierPlayerName } from './teamDossierScenes.js'
import { formatOwHeroName, getOwHeroCanonicalKey, getOwHeroRole } from '../../lib/heroes.js'

export const PERFORMANCE_METRICS = [
  { id: 'damage', zh: '伤害', en: 'Damage', noteZh: '记录到的伤害量', noteEn: 'Recorded damage output' },
  {
    id: 'eliminations',
    zh: '消灭',
    en: 'Eliminations',
    noteZh: '选手消灭数之和，同一目标可能重复计数',
    noteEn: 'Player totals; one target may count for several players'
  },
  { id: 'deaths', zh: '死亡', en: 'Deaths', noteZh: '记录到的死亡次数', noteEn: 'Recorded deaths' },
  {
    id: 'healing',
    zh: '治疗',
    en: 'Healing',
    noteZh: '治疗量受英雄与受到的伤害影响',
    noteEn: 'Depends on heroes and damage received'
  },
  {
    id: 'mitigation',
    zh: '减伤',
    en: 'Mitigation',
    noteZh: '减伤量受英雄技能影响',
    noteEn: 'Depends on hero abilities'
  },
  { id: 'assists', zh: '助攻', en: 'Assists', noteZh: '选手助攻数之和', noteEn: 'Sum of player assists' }
]
const list = (value) => (Array.isArray(value) ? value : [])
const text = (value) => String(value ?? '').trim()
const number = (value) =>
  value !== null &&
  value !== undefined &&
  text(value) !== '' &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0
    ? Number(value)
    : null
const otherSide = (side) => (side === 'team_a' ? 'team_b' : 'team_a')
export const performanceRecordKey = (record) => `${record.match.match_id}:${record.mapIndex}`
const role = (value) =>
  ({ TANK: 'TANK', DAMAGE: 'DPS', DPS: 'DPS', SUPPORT: 'SUP', SUP: 'SUP' })[text(value).toUpperCase()] ||
  'UNKNOWN'

export function performanceMinutes(value) {
  const parts = text(value).split(':')
  if (![2, 3].includes(parts.length) || parts.some((part) => !/^\d+(?:\.\d+)?$/.test(part))) return null
  const values = parts.map(Number)
  if (values.at(-1) >= 60 || (values.length === 3 && values[1] >= 60)) return null
  const minutes =
    values.length === 3 ? values[0] * 60 + values[1] + values[2] / 60 : values[0] + values[1] / 60
  return minutes >= 0 ? minutes : null
}

function sidePlayers(record, side) {
  const map = record.match.maps[record.mapIndex]
  const teamId = text(record.match[side]?.id || record.match[side]?.team_id)
  const tag = side === 'team_a' ? 'A' : 'B'
  const own = list(map[`${side}_stats`])
  const source = own.length
    ? own
    : list(map.player_stats).filter(
        (player) => player.side === tag || player.side === side || (teamId && text(player.team_id) === teamId)
      )
  const seen = new Set()
  // A conflicting repeated identity is not another player or a complete lineup.
  let duplicate = false
  const players = source.flatMap((player) => {
    const id = text(player.player_id)
    if (!id) return []
    if (seen.has(id)) {
      duplicate = true
      return []
    }
    seen.add(id)
    const minutes = text(player.time)
      ? performanceMinutes(player.time)
      : (performanceMinutes(map.match_time) ?? performanceMinutes(map.time))
    return [
      {
        id,
        name: text(player.player_name).split('#')[0] || id,
        role: role(player.role || getOwHeroRole(player.heroes_played)),
        hero: text(player.heroes_played),
        minutes,
        values: Object.fromEntries(
          PERFORMANCE_METRICS.map((metric) => [metric.id, number(player[metric.id])])
        )
      }
    ]
  })
  const complete = !duplicate && source.length === 5 && players.length === 5
  const minutes =
    complete && players.every((player) => player.minutes > 0)
      ? players.reduce((sum, player) => sum + player.minutes, 0) / 5
      : null
  const values = Object.fromEntries(
    PERFORMANCE_METRICS.map((metric) => [
      metric.id,
      complete && minutes !== null && players.every((player) => player.values[metric.id] !== null)
        ? players.reduce((sum, player) => sum + player.values[metric.id], 0)
        : null
    ])
  )
  return { players, complete, minutes, values }
}

export function enrichPerformanceRecords(records) {
  const seen = new Set()
  return records
    .filter((record) => {
      const key = performanceRecordKey(record)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((record) => ({
      ...record,
      own: sidePlayers(record, record.side),
      opponentStats: sidePlayers(record, otherSide(record.side))
    }))
}

export function aggregatePerformance(records, side = 'own') {
  return Object.fromEntries(
    PERFORMANCE_METRICS.map((metric) => {
      const usable = records.filter(
        (record) =>
          record[side]?.values[metric.id] !== null &&
          record[side]?.values[metric.id] !== undefined &&
          record[side].minutes > 0
      )
      const minutes = usable.reduce((sum, record) => sum + record[side].minutes, 0)
      const total = usable.reduce((sum, record) => sum + record[side].values[metric.id], 0)
      return [
        metric.id,
        {
          value: minutes > 0 ? (total * 10) / minutes : null,
          total,
          minutes,
          count: usable.length,
          records: usable
        }
      ]
    })
  )
}

export function pairedPerformance(records) {
  return Object.fromEntries(
    PERFORMANCE_METRICS.map((metric) => {
      const paired = records.filter(
        (record) => record.own.values[metric.id] !== null && record.opponentStats.values[metric.id] !== null
      )
      return [
        metric.id,
        {
          own: aggregatePerformance(paired)[metric.id],
          opponent: aggregatePerformance(paired, 'opponentStats')[metric.id]
        }
      ]
    })
  )
}

export function memberMatchup(member, metricId) {
  const entries = member.entries
    .filter(
      (entry) =>
        entry.minutes > 0 &&
        entry.values[metricId] !== null &&
        entry.role !== 'UNKNOWN' &&
        entry.record.opponentStats.complete
    )
    .map((entry) => ({
      entry,
      opponents: entry.record.opponentStats.players.filter((player) => player.role === entry.role)
    }))
    .filter(
      ({ opponents }) =>
        opponents.length > 0 &&
        opponents.every((player) => player.minutes > 0 && player.values[metricId] !== null)
    )
  const ownTime = entries.reduce((sum, { entry }) => sum + entry.minutes, 0)
  const opponentTime = entries.reduce(
    (sum, { opponents }) => sum + opponents.reduce((n, player) => n + player.minutes, 0),
    0
  )
  return {
    count: entries.length,
    records: entries.map(({ entry }) => entry.record),
    own: ownTime
      ? (entries.reduce((sum, { entry }) => sum + entry.values[metricId], 0) * 10) / ownTime
      : null,
    opponent: opponentTime
      ? (entries.reduce(
          (sum, { opponents }) => sum + opponents.reduce((n, player) => n + player.values[metricId], 0),
          0
        ) *
          10) /
        opponentTime
      : null
  }
}

export function getPerformanceRows(matches, teamId, locale = 'zh-CN') {
  return list(matches)
    .filter((match) => [match.team_a?.id, match.team_b?.id].map(text).includes(text(teamId)))
    .sort(
      (a, b) =>
        text(a.scheduled_at).localeCompare(text(b.scheduled_at)) ||
        text(a.match_id).localeCompare(text(b.match_id))
    )
    .map((match) => {
      const side = text(match.team_a?.id) === text(teamId) ? 'team_a' : 'team_b'
      const opponent = match[otherSide(side)]
      return getDossierMatch(
        { match, side, opponent, opponentLabel: opponent?.short || opponent?.name || '' },
        locale
      )
    })
}

export function getPerformanceField(matches, stage = 'all', locale = 'zh-CN') {
  const scoped = list(matches).filter((match) => stage === 'all' || match.stage === stage)
  const teams = new Map()
  for (const match of scoped)
    for (const side of ['team_a', 'team_b']) {
      const team = match[side]
      if (team?.id && !teams.has(text(team.id)))
        teams.set(text(team.id), { id: text(team.id), name: team.short || team.name || team.id })
    }
  const profiles = [...teams.values()].map((team) => {
    const rows = getPerformanceRows(scoped, team.id, locale)
    const records = enrichPerformanceRecords(getArchiveMapRecords(rows, locale))
    return { ...team, metrics: aggregatePerformance(records) }
  })
  return Object.fromEntries(
    PERFORMANCE_METRICS.map((metric) => {
      const samples = profiles
        .filter((profile) => profile.metrics[metric.id].value !== null)
        .map((profile) => ({ id: profile.id, name: profile.name, ...profile.metrics[metric.id] }))
        .sort((a, b) => a.value - b.value)
      const middle = Math.floor(samples.length / 2)
      const median = samples.length
        ? samples.length % 2
          ? samples[middle].value
          : (samples[middle - 1].value + samples[middle].value) / 2
        : null
      return [metric.id, { samples, median }]
    })
  )
}

function countHeroes(entries, locale) {
  const groups = new Map()
  for (const { hero, record } of entries) {
    const key = getOwHeroCanonicalKey(hero)
    if (!key) continue
    if (!groups.has(key))
      groups.set(key, {
        key,
        hero,
        label: formatOwHeroName(hero, locale),
        role: role(getOwHeroRole(hero)),
        records: []
      })
    const group = groups.get(key)
    if (!group.records.some((item) => performanceRecordKey(item) === performanceRecordKey(record)))
      group.records.push(record)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, maps: group.records.length }))
    .sort((a, b) => b.maps - a.maps || a.key.localeCompare(b.key))
}

function memberProfiles(records, roster, locale) {
  const members = new Map(
    roster.map((player) => [
      getDossierPlayerKey(player),
      {
        id: getDossierPlayerKey(player),
        name: getDossierPlayerName(player),
        role: role(player.role),
        registered: true,
        entries: []
      }
    ])
  )
  for (const record of records)
    for (const player of record.own.players) {
      if (!members.has(player.id))
        members.set(player.id, {
          id: player.id,
          name: player.name,
          role: player.role,
          registered: false,
          entries: []
        })
      members.get(player.id).entries.push({ ...player, record })
    }
  return [...members.values()]
    .map((member) => {
      const metrics = Object.fromEntries(
        PERFORMANCE_METRICS.map((metric) => {
          const entries = member.entries.filter(
            (entry) => entry.minutes > 0 && entry.values[metric.id] !== null
          )
          const minutes = entries.reduce((sum, entry) => sum + entry.minutes, 0)
          const total = entries.reduce((sum, entry) => sum + entry.values[metric.id], 0)
          return [
            metric.id,
            { value: minutes ? (total * 10) / minutes : null, total, count: entries.length, minutes }
          ]
        })
      )
      return {
        ...member,
        metrics,
        maps: member.entries.length,
        series: new Set(member.entries.map((entry) => entry.record.match.match_id)).size,
        roles: [...new Set(member.entries.map((entry) => entry.role))],
        heroes: countHeroes(member.entries, locale)
      }
    })
    .sort(
      (a, b) =>
        ['TANK', 'DPS', 'SUP', 'UNKNOWN'].indexOf(a.role) -
          ['TANK', 'DPS', 'SUP', 'UNKNOWN'].indexOf(b.role) ||
        b.maps - a.maps ||
        a.name.localeCompare(b.name)
    )
}

export function buildTeamPerformance(rows, roster = [], locale = 'zh-CN') {
  const played = rows.filter((row) => row.decided && !row.bye && !row.administrative)
  const records = enrichPerformanceRecords(getArchiveMapRecords(rows, locale))
  const metrics = aggregatePerformance(records)
  const members = memberProfiles(records, roster, locale)
  const heroEntries = records.flatMap((record) =>
    record.own.players.map((player) => ({ hero: player.hero, record }))
  )
  const lineups = new Map()
  const cohorts = new Map()
  for (const record of records.filter((record) => record.own.complete)) {
    const ids = record.own.players.map((player) => player.id).sort()
    const cohortKey = ids.join('|')
    if (!cohorts.has(cohortKey)) cohorts.set(cohortKey, { ids, records: [] })
    cohorts.get(cohortKey).records.push(record)
    if (!record.own.players.every((player) => player.hero)) continue
    const heroes = record.own.players
      .map((player) => player.hero)
      .sort((a, b) => getOwHeroCanonicalKey(a).localeCompare(getOwHeroCanonicalKey(b)))
    const key = heroes.map(getOwHeroCanonicalKey).join('|')
    if (!lineups.has(key)) lineups.set(key, { key, heroes, records: [] })
    lineups.get(key).records.push(record)
  }
  const bans = { own: [], opponent: [], ownCoverage: 0, opponentCoverage: 0 }
  for (const record of records) {
    const map = record.match.maps[record.mapIndex]
    for (const [key, side] of [
      ['own', record.side],
      ['opponent', otherSide(record.side)]
    ]) {
      const hero = text(map[`${side}_ban`])
      if (!hero || /^(none|null|unknown|无|未禁用|—|-)$/i.test(hero)) continue
      bans[key].push({ hero, record })
      bans[`${key}Coverage`] += 1
    }
  }
  const series = played.map((row) => {
    const mapRecords = records.filter((record) => record.match.match_id === row.match.match_id)
    return {
      row,
      records: mapRecords,
      metrics: aggregatePerformance(mapRecords),
      paired: pairedPerformance(mapRecords)
    }
  })
  const stages = [...new Set(rows.map((row) => row.match.stage || 'UNKNOWN'))]
    .map((key) => {
      const stageRows = played.filter((row) => (row.match.stage || 'UNKNOWN') === key)
      const stageRecords = records.filter((record) => (record.match.stage || 'UNKNOWN') === key)
      return {
        key,
        label: getDossierStageLabel(key, locale),
        summary: buildDossierSummary(stageRows),
        records: stageRecords,
        metrics: aggregatePerformance(stageRecords),
        paired: pairedPerformance(stageRecords)
      }
    })
    .filter((stage) => stage.records.length || stage.summary.decided)
  const groups = new Map()
  for (const row of played) {
    const id = text(row.opponent?.id || row.opponent?.team_id)
    if (!id) continue
    if (!groups.has(id)) groups.set(id, { id, name: row.opponentLabel, team: row.opponent, rows: [] })
    groups.get(id).rows.push(row)
  }
  const opponents = [...groups.values()]
    .map((opponent) => {
      const ids = new Set(opponent.rows.map((row) => row.match.match_id))
      const opponentRecords = records.filter((record) => ids.has(record.match.match_id))
      return {
        ...opponent,
        records: opponentRecords,
        summary: buildDossierSummary(opponent.rows),
        paired: pairedPerformance(opponentRecords)
      }
    })
    .sort(
      (a, b) =>
        b.rows.length - a.rows.length || b.records.length - a.records.length || a.name.localeCompare(b.name)
    )
  return {
    records,
    played,
    metrics,
    members,
    series,
    stages,
    opponents,
    summary: buildDossierSummary(played),
    paired: pairedPerformance(records),
    wins: aggregatePerformance(records.filter((record) => record.mapOutcome === 'win')),
    losses: aggregatePerformance(records.filter((record) => record.mapOutcome === 'loss')),
    mapWins: records.filter((record) => record.mapOutcome === 'win').length,
    mapLosses: records.filter((record) => record.mapOutcome === 'loss').length,
    heroes: countHeroes(heroEntries, locale),
    heroCoverage: new Set(
      heroEntries.filter((entry) => entry.hero).map((entry) => performanceRecordKey(entry.record))
    ).size,
    lineups: [...lineups.values()].sort(
      (a, b) => b.records.length - a.records.length || a.key.localeCompare(b.key)
    ),
    cohorts: [...cohorts.values()].sort(
      (a, b) => b.records.length - a.records.length || a.ids.join().localeCompare(b.ids.join())
    ),
    bans: { ...bans, own: countHeroes(bans.own, locale), opponent: countHeroes(bans.opponent, locale) },
    administrative: rows.filter((row) => row.complete && row.administrative && !row.bye).length,
    byes: rows.filter((row) => row.bye).length,
    incompleteTeams: records.filter((record) => !record.own.complete || !record.opponentStats.complete).length
  }
}
