import {
  decodeStaffKey,
  encodeStaffKey,
  normalizeText,
  safeArr,
  splitStaffNames
} from './reviewAssets.js'
import { getReviewIdentityLabel, getReviewIdentityPortfolio } from './reviewIdentity.js'

const STAFF_INDEX_CACHE = new WeakMap()
const TEAM_INDEX_CACHE = new WeakMap()

function isObject(value) {
  return value && typeof value === 'object'
}

function normalizeSearch(value) {
  return normalizeText(String(value ?? '').normalize('NFKC'))
}

function stripHashTag(value) {
  return String(value || '').replace(/#\d+$/g, '').trim()
}

function pickStaffObjectDisplay(value) {
  if (!isObject(value)) return ''

  return String(
    value.display_name ||
    value.displayName ||
    value.nickname ||
    value.nickName ||
    value.public_name ||
    value.publicName ||
    value.name ||
    value.staff_name ||
    value.caster_name ||
    value.commentator_name ||
    value.admin_name ||
    stripHashTag(value.battle_tag || value.battletag || value.battleTag || value.raw || '') ||
    ''
  ).trim()
}

function pickStaffObjectFullTag(value) {
  if (!isObject(value)) return ''

  return String(
    value.battle_tag ||
    value.battletag ||
    value.battleTag ||
    value.raw ||
    value.tag ||
    value.account ||
    value.account_id ||
    value.game_id ||
    ''
  ).trim()
}

function expandStaffNameValue(value) {
  if (Array.isArray(value)) return value.flatMap(expandStaffNameValue)

  if (isObject(value)) {
    const fullTag = pickStaffObjectFullTag(value)
    const display = pickStaffObjectDisplay(value)

    return uniqueNames([
      display,
      fullTag,
      stripHashTag(fullTag),
      value.manager_name,
      value.coach_name,
      value.staff_name,
      value.caster_name,
      value.commentator_name,
      value.admin_name,
      value.name
    ])
  }

  return splitStaffNames(value)
}

function makeStaffNameEntry(value) {
  if (isObject(value) && !Array.isArray(value)) {
    const fields = expandStaffNameValue(value)
    const name = pickStaffObjectDisplay(value) || stripHashTag(pickStaffObjectFullTag(value)) || fields[0] || ''
    return name ? [{ name, fields: uniqueNames([name, ...fields]), avatar: value.avatar || value.avatar_url || '' }] : []
  }

  return expandStaffNameValue(value).map(rawName => {
    const name = stripHashTag(rawName) || rawName
    return { name, fields: uniqueNames([name, rawName]) }
  })
}

function mergeStaffEntries(entries) {
  const output = []

  safeArr(entries).forEach(entry => {
    const name = String(entry?.name || '').trim()
    if (!name) return

    const current = {
      name,
      avatar: entry.avatar || '',
      duties: uniqueNames(entry.duties),
      fields: uniqueNames([
        name,
        ...safeArr(entry.fields)
      ])
    }
    const existing = output.find(item => staffEntriesOverlap(item, current))

    if (!existing) {
      output.push(current)
      return
    }

    existing.fields = uniqueNames([
      ...safeArr(existing.fields),
      name,
      ...current.fields
    ])
    existing.duties = uniqueNames([...existing.duties, ...current.duties])
    existing.avatar ||= current.avatar
  })

  return output
}

function staffEntriesOverlap(a, b) {
  const left = safeArr(a?.fields).map(normalizeSearch).filter(Boolean)
  const right = safeArr(b?.fields).map(normalizeSearch).filter(Boolean)
  if (!left.length || !right.length) return false

  const set = new Set(left)
  return right.some(value => set.has(value))
}

function uniqueNames(list) {
  const seen = new Set()
  const output = []

  safeArr(list).forEach(item => {
    const clean = String(item ?? '').trim()
    if (!clean) return

    const key = normalizeSearch(clean)
    if (!key || seen.has(key)) return

    seen.add(key)
    output.push(clean)
  })

  return output
}

function uniqueByKey(list, getKey) {
  const seen = new Set()

  return safeArr(list).filter(item => {
    const key = normalizeSearch(getKey(item))
    if (!key || seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function routeSegment(value) {
  return encodeURIComponent(String(value ?? '').trim())
}

function matchQuery(fields, q) {
  if (!q) return true
  return safeArr(fields).some(value => normalizeSearch(value).includes(q))
}

function collectBroadcastEntries(match, keys) {
  const broadcast = match?.broadcast || {}

  const roots = [
    broadcast,
    broadcast.staff,
    broadcast.officials,
    match,
    match?.staff,
    match?.officials
  ].filter(Boolean)

  const entries = roots.flatMap(root => {
    return keys.flatMap(key => {
      if (root?.[key] !== undefined) {
        const values = Array.isArray(root[key]) ? root[key] : [root[key]]
        return values.flatMap(makeStaffNameEntry).map(entry => ({ ...entry, duties: [getCreditDuty(key)] }))
      }
      return []
    })
  })
  const isCaster = keys === CASTER_BROADCAST_KEYS
  roots.forEach(root => safeArr(root.crew).forEach(person => {
    const duty = getCreditDuty(person.role)
    if (!duty || (duty === 'CASTER') !== isCaster) return
    entries.push(...makeStaffNameEntry(person).map(entry => ({ ...entry, duties: [duty] })))
  }))
  return mergeStaffEntries(entries)
}

function getCreditDuty(value) {
  const role = String(value || '').toUpperCase()
  if (/CASTER|COMMENTATOR|HOST|解说|主持/.test(role)) return 'CASTER'
  if (/VOICE_REFEREE/.test(role)) return 'VOICE_REFEREE'
  if (/REFEREE|JUDGE|裁判/.test(role)) return 'REFEREE'
  if (/DIRECTOR|PRODUCER|导播/.test(role)) return 'DIRECTOR'
  if (/OBSERVER|^OB$/.test(role)) return 'OB'
  if (/ADMIN|OPERATOR|OFFICIAL|^STAFF$|赛管/.test(role)) return 'ADMIN'
  return ''
}

function collectBroadcastNames(match, keys) {
  return collectBroadcastEntries(match, keys).map(entry => entry.name)
}

const ADMIN_BROADCAST_KEYS = [
  'admin',
  'admins',
  'admin_a',
  'admin_b',
  'referee',
  'referees',
  'voice_referee',
  'voice_referees',
  'judge',
  'judges',
  'director',
  'directors',
  'operator',
  'operators',
  'producer',
  'producers',
  'observer',
  'observers',
  '赛管',
  '裁判',
  '导播'
]

const CASTER_BROADCAST_KEYS = [
  'caster',
  'casters',
  'caster_a',
  'caster_b',
  'commentator',
  'commentators',
  'host',
  'hosts',
  '解说',
  '主持'
]

export function getAdminNamesFromMatch(match) {
  return collectBroadcastNames(match, ADMIN_BROADCAST_KEYS)
}

export function getCasterNamesFromMatch(match) {
  return collectBroadcastNames(match, CASTER_BROADCAST_KEYS)
}

function getTeamLabel(team) {
  return team?.short || team?.team_short_name || team?.name || team?.team_name || ''
}

function getMatchTeams(match) {
  return [
    getTeamLabel(match?.team_a),
    getTeamLabel(match?.team_b)
  ].filter(Boolean)
}

function getBestTeamIdentity(team) {
  return String(
    team?.team_id ||
    team?.id ||
    team?.team_short_name ||
    team?.short ||
    team?.team_name ||
    team?.name ||
    ''
  )
}

function getTeamIdentityValues(team) {
  if (!team) return []

  return [
    team.team_id,
    team.id,
    team.team_short_name,
    team.short,
    team.team_name,
    team.name,
    team.team_club,
    team.club
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== '').map(String)
}

function identitiesOverlap(a, b) {
  const aValues = getTeamIdentityValues(a).map(normalizeSearch)
  const bValues = getTeamIdentityValues(b).map(normalizeSearch)

  if (!aValues.length || !bValues.length) return false

  const aSet = new Set(aValues)
  return bValues.some(value => aSet.has(value))
}

function buildTeamRows(db) {
  if (isObject(db) && TEAM_INDEX_CACHE.has(db)) {
    return TEAM_INDEX_CACHE.get(db)
  }

  const map = new Map()

  const findExistingKey = row => {
    for (const [key, existing] of map.entries()) {
      if (identitiesOverlap(existing, row)) return key
    }

    return ''
  }

  const addRow = row => {
    if (!row || typeof row !== 'object') return

    const identity = getBestTeamIdentity(row)
    if (!identity) return

    const existingKey = findExistingKey(row)
    const key = existingKey || normalizeSearch(identity)

    if (!map.has(key)) {
      map.set(key, {
        ...row,
        __sources: [row]
      })
      return
    }

    const prev = map.get(key)

    map.set(key, {
      ...prev,
      ...row,
      staff: {
        ...(prev.staff || {}),
        ...(row.staff || {})
      },
      __sources: [
        ...safeArr(prev.__sources),
        row
      ]
    })
  }

  safeArr(db?.teams).forEach(addRow)
  safeArr(db?.team_reviews).forEach(addRow)

  const rows = [...map.values()]

  if (isObject(db)) {
    TEAM_INDEX_CACHE.set(db, rows)
  }

  return rows
}

function collectTeamStaffEntries(team, type) {
  const sources = safeArr(team?.__sources).length ? team.__sources : [team]

  const values = sources.flatMap(row => {
    if (!row) return []

    if (type === 'manager') {
      return [
        row?.staff?.managers,
        row?.staff?.manager,
        row?.team_manager,
        row?.team_managers,
        row?.manager,
        row?.managers,
        row?.manager_name,
        row?.manager_names,
        row?.经理
      ]
    }

    return [
      row?.staff?.coaches,
      row?.staff?.coach,
      row?.team_coach,
      row?.team_coaches,
      row?.coach,
      row?.coaches,
      row?.coach_name,
      row?.coach_names,
      row?.教练
    ]
  })

  return mergeStaffEntries(values.flatMap(value => {
    if (Array.isArray(value)) return value.flatMap(makeStaffNameEntry)
    return makeStaffNameEntry(value)
  }))
}

function getTeamRankText(team) {
  const sources = safeArr(team?.__sources).length ? team.__sources : [team]

  for (const row of sources) {
    const text = row?.final_rank_text || row?.rank_text || row?.final_result || ''
    if (text) return text
  }

  return team?.final_rank_text || ''
}

function getTeamRankValue(team) {
  const rank = Number(team?.final_rank ?? team?.current_rank ?? team?.rank ?? 999)

  if (Number.isFinite(rank) && rank > 0) return rank

  const text = String(getTeamRankText(team) || '')

  if (text.includes('冠军') && !text.includes('亚军')) return 1
  if (text.includes('亚军')) return 2
  if (text.includes('季军')) return 3
  if (text.includes('殿军') || text.includes('第4名')) return 4
  if (text.includes('5-8') || text.includes('第5') || text.includes('第6') || text.includes('第7') || text.includes('第8')) return 8
  if (text.includes('9-16') || text.includes('第9') || text.includes('第10') || text.includes('第11') || text.includes('第12') || text.includes('第13') || text.includes('第14') || text.includes('第15') || text.includes('第16')) return 16

  return 999
}

function makeTeamTitle(team) {
  const short = team?.team_short_name || team?.short || ''
  const name = team?.team_name || team?.name || ''

  if (short && name && short !== name) return `${short}｜${name}`
  return short || name || '未知队伍'
}

function makeTeamSubtitle(team, suffix = '队伍赛季回顾') {
  return `${getTeamRankText(team) || '最终成绩已归档'}｜${suffix}`
}

function makeTeamRoute(team, query = '') {
  const id = getBestTeamIdentity(team)
  return `/review/story/team/${routeSegment(id)}${query}`
}

function getStaffEntryRouteKey(entry) {
  const fields = uniqueNames([entry?.name, ...safeArr(entry?.fields)])
  return fields.find(value => /#\d+$/.test(String(value || '').trim())) || fields[0] || ''
}

function makeTeamPerspectiveRoute(team, perspective, entry) {
  const params = new URLSearchParams({ as: perspective })
  const identityKey = getStaffEntryRouteKey(entry)
  if (identityKey) params.set('who', identityKey)
  return makeTeamRoute(team, `?${params.toString()}`)
}

function getPlayerMatchLogCount(player) {
  return safeArr(player?.match_logs || player?.live_match_logs).length
}

function buildPlayerTotalMap(db) {
  const map = new Map()

  safeArr(db?.player_totals).forEach(row => {
    const key = normalizeSearch(row?.player_id)
    if (key) map.set(key, row)
  })

  return map
}

function getPlayerScore(player, totalMap) {
  const total = totalMap.get(normalizeSearch(player?.player_id))
  return Number(total?.raw_time_mins || total?.playtimeMinutes || 0) || getPlayerMatchLogCount(player)
}

function makeUnifiedIdentityResult(db, identityKey) {
  const portfolio = getReviewIdentityPortfolio(db, identityKey)
  if (!portfolio?.isMultiple) return null

  const identityLabels = uniqueNames(portfolio.entries.map(getReviewIdentityLabel))
  const teamLabels = portfolio.teamNames

  return {
    id: `person-${normalizeSearch(portfolio.battleTag)}`,
    label: portfolio.hasMultipleRoles ? '多重身份回顾' : '跨队伍回顾',
    title: portfolio.displayName,
    subtitle: [...teamLabels, ...identityLabels].join('｜'),
    to: `/review/story/person/${encodeStaffKey(portfolio.battleTag)}`
  }
}

function makePlayerResult(db, player) {
  const battleTag = player?.battle_tag || player?.battleTag || player?.battletag || player?.player_name
  const unified = makeUnifiedIdentityResult(db, battleTag)
  if (unified) return unified

  const title = player?.display_name || player?.nickname || player?.player_name || '未知选手'
  const team = player?.team_short_name || player?.team_name || '未知队伍'
  const role = player?.role || 'FLEX'

  return {
    id: `player-${player.player_id}`,
    label: '选手回顾',
    title,
    subtitle: `${team}｜${role}`,
    to: `/review/story/player/${routeSegment(player.player_id)}`
  }
}

function makeTeamResult(team) {
  return {
    id: `team-${getBestTeamIdentity(team)}`,
    label: '队伍回顾',
    title: makeTeamTitle(team),
    subtitle: makeTeamSubtitle(team),
    to: makeTeamRoute(team)
  }
}

function makeManagerResult(db, team, manager) {
  const managerName = manager?.name || manager
  const unified = makeUnifiedIdentityResult(db, getStaffEntryRouteKey(manager))
  if (unified) return unified
  return {
    id: `manager-${getBestTeamIdentity(team)}-${managerName}`,
    label: '经理视角',
    title: managerName,
    subtitle: makeTeamTitle(team),
    to: makeTeamPerspectiveRoute(team, 'manager', manager)
  }
}

function makeCoachResult(db, team, coach) {
  const coachName = coach?.name || coach
  const unified = makeUnifiedIdentityResult(db, getStaffEntryRouteKey(coach))
  if (unified) return unified
  return {
    id: `coach-${getBestTeamIdentity(team)}-${coachName}`,
    label: '教练视角',
    title: coachName,
    subtitle: makeTeamTitle(team),
    to: makeTeamPerspectiveRoute(team, 'coach', coach)
  }
}

function makeManagerCoachResult(db, team, entry) {
  const name = entry?.name || entry
  const unified = makeUnifiedIdentityResult(db, getStaffEntryRouteKey(entry))
  if (unified) return unified
  return {
    id: `manager-coach-${getBestTeamIdentity(team)}-${name}`,
    label: '经理 & 教练',
    title: name,
    subtitle: makeTeamTitle(team),
    to: makeTeamPerspectiveRoute(team, 'manager-coach', entry)
  }
}

function makeStaffResult(identity, staff) {
  return {
    id: `${identity}-${staff.staff_name}`,
    label: identity === 'caster' ? '解说回顾' : '赛管回顾',
    title: staff.staff_name,
    subtitle: identity === 'caster'
      ? `解说 ${staff.match_count} 场比赛`
      : `参与 ${staff.match_count} 场比赛｜赛管 / 裁判 / 导播合并统计`,
    to: `/review/story/staff/${identity}/${encodeStaffKey(staff.staff_name)}`
  }
}

export function buildStaffIndex(db) {
  if (isObject(db) && STAFF_INDEX_CACHE.has(db)) {
    return STAFF_INDEX_CACHE.get(db)
  }

  const adminMap = new Map()
  const casterMap = new Map()

  const ensure = (map, entry, type) => {
    const clean = String(entry?.name || entry || '').trim()
    if (!clean) return null

    const key = normalizeSearch(clean)

    if (!map.has(key)) {
      map.set(key, {
        staff_key: clean,
        staff_name: clean,
        staff_type: type,
        aliases: [],
        duties: new Set(),
        avatar: '',
        matches: [],
        teams_seen: new Map(),
        stages: new Map(),
        partners: new Map()
      })
    }

    const row = map.get(key)
    row.aliases = uniqueNames([...safeArr(row.aliases), ...safeArr(entry?.fields), clean])
    safeArr(entry?.duties).filter(Boolean).forEach(duty => row.duties.add(duty))
    row.avatar ||= entry?.avatar || ''
    return row
  }

  const register = (map, entry, type, match, entriesInSameRole) => {
    const row = ensure(map, entry, type)
    if (!row) return

    row.matches.push(match)

    if (match?.stage) {
      row.stages.set(match.stage, (row.stages.get(match.stage) || 0) + 1)
    }

    getMatchTeams(match).forEach(teamName => {
      row.teams_seen.set(teamName, (row.teams_seen.get(teamName) || 0) + 1)
    })

    entriesInSameRole
      .filter(other => normalizeSearch(other?.name) !== normalizeSearch(entry?.name))
      .forEach(other => {
        row.partners.set(other.name, (row.partners.get(other.name) || 0) + 1)
      })
  }

  safeArr(db?.matches).forEach(match => {
    const admins = collectBroadcastEntries(match, ADMIN_BROADCAST_KEYS)
    const casters = collectBroadcastEntries(match, CASTER_BROADCAST_KEYS)

    admins.forEach(entry => register(adminMap, entry, 'admin', match, admins))
    casters.forEach(entry => register(casterMap, entry, 'caster', match, casters))
  })

  const finalize = row => ({
    ...row,
    duties: [...row.duties],
    match_count: row.matches.length,
    teams_seen: [...row.teams_seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    stages: [...row.stages.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    partners: [...row.partners.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  })

  const index = {
    admins: [...adminMap.values()].map(finalize).sort((a, b) => b.match_count - a.match_count),
    casters: [...casterMap.values()].map(finalize).sort((a, b) => b.match_count - a.match_count)
  }

  if (isObject(db)) {
    STAFF_INDEX_CACHE.set(db, index)
  }

  return index
}

export function getStaffReview(db, staffType, staffKey) {
  const decoded = decodeStaffKey(staffKey)
  const index = buildStaffIndex(db)
  const list = staffType === 'caster' ? index.casters : index.admins

  return list.find(item => [item.staff_name, ...safeArr(item.aliases)].some(value => normalizeSearch(value) === normalizeSearch(decoded))) || null
}

function getDefaultResults(db, identity) {
  if (identity === 'player') {
    const totalMap = buildPlayerTotalMap(db)

    return safeArr(db?.players)
      .filter(player => player?.player_id)
      .sort((a, b) => getPlayerScore(b, totalMap) - getPlayerScore(a, totalMap))
      .slice(0, 16)
      .map(player => makePlayerResult(db, player))
  }

  if (identity === 'teamStaff') {
    return buildTeamRows(db)
      .sort((a, b) => getTeamRankValue(a) - getTeamRankValue(b))
      .slice(0, 16)
      .map(makeTeamResult)
  }

  if (identity === 'admin' || identity === 'caster') {
    const index = buildStaffIndex(db)
    const list = identity === 'caster' ? index.casters : index.admins

    return list
      .slice(0, 16)
      .map(staff => makeStaffResult(identity, staff))
  }

  return []
}

export function getReviewSearchResults(db, identity, query) {
  if (!identity) return []

  const q = normalizeSearch(query)

  if (!q) {
    return uniqueByKey(getDefaultResults(db, identity), item => item.id).slice(0, 40)
  }

  const results = []

  if (identity === 'player') {
    safeArr(db?.players).forEach(player => {
      const fields = [
        player.player_id,
        player.player_name,
        player.nickname,
        player.display_name,
        player.battle_tag,
        player.battletag,
        player.battleTag,
        player.player_tag,
        player.account,
        player.account_id,
        player.game_id,
        player.team_name,
        player.team_short_name,
        player.role,
        player.rank
      ]

      if (matchQuery(fields, q)) {
        results.push(makePlayerResult(db, player))
      }
    })
  }

  if (identity === 'teamStaff') {
    buildTeamRows(db).forEach(team => {
      const managers = collectTeamStaffEntries(team, 'manager')
      const coaches = collectTeamStaffEntries(team, 'coach')

      const teamFields = [
        ...getTeamIdentityValues(team),
        team.team_club,
        team.club,
        getTeamRankText(team),
        team.final_rank,
        team.rank
      ]

      const teamMatched = matchQuery(teamFields, q)
      const matchedManagers = managers.filter(entry => matchQuery(entry.fields, q))
      const matchedCoaches = coaches.filter(entry => matchQuery(entry.fields, q))

      if (teamMatched && !matchedManagers.length && !matchedCoaches.length) {
        results.push(makeTeamResult(team))
      }

      const samePeople = matchedManagers.filter(manager => {
        return matchedCoaches.some(coach => staffEntriesOverlap(manager, coach))
      })

      samePeople.forEach(entry => {
        results.push(makeManagerCoachResult(db, team, entry))
      })

      matchedManagers
        .filter(entry => !samePeople.some(same => staffEntriesOverlap(same, entry)))
        .forEach(entry => {
          results.push(makeManagerResult(db, team, entry))
        })

      matchedCoaches
        .filter(entry => !samePeople.some(same => staffEntriesOverlap(same, entry)))
        .forEach(entry => {
          results.push(makeCoachResult(db, team, entry))
        })

      if (teamMatched && (matchedManagers.length || matchedCoaches.length)) {
        results.push(makeTeamResult(team))
      }
    })
  }

  if (identity === 'admin' || identity === 'caster') {
    const index = buildStaffIndex(db)
    const list = identity === 'caster' ? index.casters : index.admins

    list.forEach(staff => {
      const fields = [
        staff.staff_name,
        staff.staff_key,
        staff.staff_type,
        ...safeArr(staff.aliases)
      ]

      if (matchQuery(fields, q)) {
        results.push(makeStaffResult(identity, staff))
      }
    })
  }

  return uniqueByKey(results, item => item.to || item.id).slice(0, 40)
}

export function getUnifiedReviewSearchResults(db, query) {
  const cleanQuery = String(query || '').trim()
  if (!cleanQuery) return []

  const normalizedQuery = normalizeSearch(cleanQuery)
  const rankResult = item => {
    const title = normalizeSearch(item?.title)
    const subtitle = normalizeSearch(item?.subtitle)
    const firstTitleToken = title.split(/[｜|·/\s]+/).filter(Boolean)[0] || ''
    const firstSubtitleToken = subtitle.split(/[｜|·/\s]+/).filter(Boolean)[0] || ''

    if (title === normalizedQuery) return 0
    if (firstTitleToken === normalizedQuery) return 1
    if (title.startsWith(normalizedQuery)) return 2
    if (firstSubtitleToken === normalizedQuery) return 3
    if (subtitle.startsWith(normalizedQuery)) return 4
    if (title.includes(normalizedQuery)) return 5
    if (subtitle.includes(normalizedQuery)) return 6
    return 7
  }

  const identities = ['player', 'teamStaff', 'admin', 'caster']
  const results = identities.flatMap(identity => {
    return getReviewSearchResults(db, identity, cleanQuery).map(item => ({
      ...item,
      identity
    }))
  })

  return uniqueByKey(results, item => item.to || item.id)
    .map((item, sourceIndex) => ({ item, sourceIndex, rank: rankResult(item) }))
    .sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex)
    .map(entry => entry.item)
    .slice(0, 40)
}
