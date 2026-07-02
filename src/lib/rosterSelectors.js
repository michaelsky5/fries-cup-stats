import { getHeroAvatarSrc, getPlayerInitials, normalizeLeaderboardRole } from './leaderboardSelectors.js'
import { formatOwHeroName, getOwHeroCanonicalKey, getOwHeroCanonicalName, getOwNameSearchText } from './heroes.js'

export const safeArr = value => Array.isArray(value) ? value : []

export const TEAM_PAGE_SIZES = [12, 24, 'all']
export const PLAYER_PAGE_SIZES = [24, 48]
export const STAFF_PAGE_SIZES = [20, 40]

const ROLE_ORDER = ['TANK', 'DPS', 'SUP', 'FLEX']
const STAFF_ROLE_ORDER = ['manager', 'coach']

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function compareText(a, b) {
  return normalize(a).localeCompare(normalize(b), 'zh-Hans-CN', { numeric: true })
}

function identityMatches(value, candidates) {
  const key = normalizeKey(value)
  if (!key) return false
  return safeArr(candidates).some(candidate => normalizeKey(candidate) === key)
}

function heroIdentityMatches(value, candidates) {
  const key = getOwHeroCanonicalKey(value)
  if (!key) return false
  return safeArr(candidates).some(candidate => getOwHeroCanonicalKey(candidate) === key)
}

function isFavorite(favoriteIds, candidates) {
  return safeArr(favoriteIds).some(id => identityMatches(id, candidates))
}

function includesQuery(query, values) {
  if (!query) return true
  return safeArr(values).some(value => normalizeKey(value).includes(query))
}

function normalizeRoleForHero(role) {
  const normalized = normalizeLeaderboardRole(role)
  if (normalized === 'SUPPORT') return 'SUPPORT'
  if (normalized === 'TANK') return 'TANK'
  if (normalized === 'DPS') return 'DPS'
  return ''
}

export function normalizeRosterRole(role) {
  const normalized = normalizeLeaderboardRole(role)
  if (normalized === 'SUPPORT') return 'SUP'
  if (normalized === 'TANK') return 'TANK'
  if (normalized === 'DPS') return 'DPS'
  return 'FLEX'
}

function getRoleRank(role) {
  const index = ROLE_ORDER.indexOf(normalizeRosterRole(role))
  return index >= 0 ? index : ROLE_ORDER.length
}

export function getTeamRouteId(team) {
  return normalize(team?.team_id || team?.id || team?.routeId || team?.team_short_name || team?.short || team?.name)
}

export function getTeamShortName(team) {
  return normalize(team?.team_short_name || team?.shortName || team?.short || team?.team_id || team?.id || team?.name || '-')
}

export function getTeamFullName(team) {
  return normalize(team?.team_name || team?.fullName || team?.name || getTeamShortName(team))
}

function getTeamIdentities(team) {
  return [
    team?.team_id,
    team?.id,
    team?.routeId,
    team?.team_short_name,
    team?.shortName,
    team?.short,
    team?.team_name,
    team?.fullName,
    team?.name
  ].map(normalize).filter(Boolean)
}

function getPlayerIdentities(player) {
  return [
    player?.player_id,
    player?.id,
    player?.identity?.playerId,
    player?.player_name,
    player?.battleTag,
    player?.battle_tag,
    player?.display_name,
    player?.nickname
  ].map(normalize).filter(Boolean)
}

function buildTeamLookup(db) {
  const map = new Map()
  safeArr(db?.teams).forEach(team => {
    getTeamIdentities(team).forEach(identity => {
      const key = normalizeKey(identity)
      if (key && !map.has(key)) map.set(key, team)
    })
  })
  return value => map.get(normalizeKey(value)) || null
}

function buildTotalsLookup(db) {
  const map = new Map()
  safeArr(db?.player_totals).forEach(total => {
    getPlayerIdentities(total).forEach(identity => {
      const key = normalizeKey(identity)
      if (key && !map.has(key)) map.set(key, total)
    })
  })
  return value => map.get(normalizeKey(value)) || null
}

export function formatStaffPerson(person) {
  if (!person) return ''
  if (typeof person === 'string') return normalize(person).split('#')[0]
  return normalize(person.nickname || person.display_name || person.name || person.battle_tag || person.battleTag || person.raw).split('#')[0]
}

function getStaffBattleTag(person) {
  if (!person) return ''
  if (typeof person === 'string') return normalize(person)
  return normalize(person.battle_tag || person.battleTag || person.raw || person.player_name || '')
}

function normalizeStaffList(value) {
  return safeArr(value)
    .map(item => {
      if (!item) return null
      if (typeof item === 'string') {
        const raw = normalize(item)
        return { display_name: raw.split('#')[0], battle_tag: raw, raw }
      }
      return item
    })
    .filter(Boolean)
}

export function normalizeStaffIdentity(person) {
  const name = formatStaffPerson(person)
  const battleTag = getStaffBattleTag(person)
  const keySource = battleTag || name

  return {
    name,
    battleTag,
    key: normalizeKey(keySource).replace(/\s+/g, '')
  }
}

export function getTeamStaff(team) {
  const managers = normalizeStaffList(team?.staff?.managers?.length ? team.staff.managers : team?.team_manager ? [team.team_manager] : [])
  const coaches = normalizeStaffList(team?.staff?.coaches?.length ? team.staff.coaches : team?.team_coach ? [team.team_coach] : [])

  return {
    managers,
    coaches,
    managerLabel: managers.map(formatStaffPerson).filter(Boolean).join('、'),
    coachLabel: coaches.map(formatStaffPerson).filter(Boolean).join('、')
  }
}

export function getTeamRosterPlayers(db, team) {
  const teamIds = new Set(getTeamIdentities(team).map(normalizeKey))
  const explicitIds = new Set(safeArr(team?.player_ids).map(normalizeKey))

  return safeArr(db?.players).filter(player => {
    if (explicitIds.size && explicitIds.has(normalizeKey(player.player_id))) return true
    return [player.team_id, player.team_short_name, player.team_name].some(value => teamIds.has(normalizeKey(value)))
  })
}

export function getTeamRosterSize(db, team) {
  const explicit = safeArr(team?.player_ids).length
  if (explicit) return explicit
  return getTeamRosterPlayers(db, team).length
}

export function getTeamDirectory(db, favorites = {}) {
  const favoriteTeamIds = safeArr(favorites?.favoriteTeamIds)

  return safeArr(db?.teams).map(team => {
    const routeId = getTeamRouteId(team)
    const shortName = getTeamShortName(team)
    const fullName = getTeamFullName(team)
    const staff = getTeamStaff(team)
    const rosterPlayers = getTeamRosterPlayers(db, team)

    return {
      ...team,
      routeId,
      shortName,
      fullName,
      club: normalize(team.team_club || team.club),
      rosterSize: safeArr(team?.player_ids).length || rosterPlayers.length,
      roleCounts: getRoleCounts(rosterPlayers),
      staff,
      isFavorite: isFavorite(favoriteTeamIds, getTeamIdentities(team))
    }
  })
}

export function filterTeams(teams, filters = {}) {
  const query = normalizeKey(filters.query ?? filters.q)
  const filter = filters.filter || 'all'

  return safeArr(teams).filter(team => {
    if (filter === 'following' && !team.isFavorite) return false
    if (filter === 'roster5' && team.rosterSize !== 5) return false
    if (filter === 'roster6' && team.rosterSize !== 6) return false
    if (filter === 'roster7' && team.rosterSize !== 7) return false
    if (filter === 'hasCoach' && !team.staff.coaches.length) return false
    if (filter === 'noCoach' && team.staff.coaches.length) return false

    return includesQuery(query, [
      team.shortName,
      team.fullName,
      team.club,
      team.staff.managerLabel,
      team.staff.coachLabel,
      ...team.staff.managers.flatMap(person => [formatStaffPerson(person), getStaffBattleTag(person)]),
      ...team.staff.coaches.flatMap(person => [formatStaffPerson(person), getStaffBattleTag(person)])
    ])
  })
}

function compareFavorite(a, b) {
  return Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite))
}

export function sortTeams(teams, sort = 'default') {
  return [...safeArr(teams)].sort((a, b) => {
    const favoriteDelta = compareFavorite(a, b)
    if (favoriteDelta) return favoriteDelta
    if (sort === 'short') return compareText(a.shortName, b.shortName)
    if (sort === 'roster') return b.rosterSize - a.rosterSize || compareText(a.shortName, b.shortName)
    if (sort === 'coach') return Number(Boolean(b.staff.coaches.length)) - Number(Boolean(a.staff.coaches.length)) || compareText(a.shortName, b.shortName)
    return compareText(a.shortName, b.shortName)
  })
}

export function getPlayerDisplayIdentity(player) {
  const primary = normalize(player?.nickname || player?.display_name || player?.player_name || player?.player_id || 'Unknown')
  const secondary = normalize(player?.battleTag || player?.battle_tag || player?.player_name)

  return {
    primary,
    secondary: secondary && normalizeKey(secondary) !== normalizeKey(primary) ? secondary : '',
    playerId: normalize(player?.player_id || player?.id)
  }
}

function getRoleBreakdown(player, role) {
  const normalized = normalizeRoleForHero(role)
  if (!normalized || normalized === 'ALL') return null
  const breakdown = player?.role_breakdown && typeof player.role_breakdown === 'object' ? player.role_breakdown : {}
  return breakdown[normalized] || breakdown[normalizeRosterRole(normalized)] || null
}

function getHeroesFromSource(source, limit = 3) {
  const heroes = [
    source?.most_played_hero,
    ...safeArr(source?.top_3_heroes)
  ]
  const seen = new Set()

  return heroes
    .map(normalize)
    .filter(hero => {
      const key = getOwHeroCanonicalKey(hero)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(getOwHeroCanonicalName)
    .slice(0, limit)
}

function hasReliableStats(source) {
  return toNumber(source?.maps_played) > 0 || toNumber(source?.raw_time_mins) > 0 || toNumber(source?.roleTimeMins) > 0
}

export function getPlayerAvatarSource(player, options = {}) {
  const requestedRole = normalizeRoleForHero(options.role)
  const roleSource = requestedRole ? getRoleBreakdown(player, requestedRole) : null
  const fallbackRole = normalizeRoleForHero(player?.role || player?.registeredRole)
  const heroSource = roleSource && hasReliableStats(roleSource) ? roleSource : player
  const heroRole = roleSource && hasReliableStats(roleSource) ? requestedRole : fallbackRole
  const heroNames = getHeroesFromSource(heroSource)
  const heroName = heroNames[0] || ''
  const candidates = heroName ? [getHeroAvatarSrc(heroName, heroRole)].filter(Boolean) : []

  return {
    type: candidates.length ? 'hero' : 'initials',
    heroName,
    heroNames,
    candidates,
    initials: getPlayerInitials(player)
  }
}

export function getPlayerDirectory(db, favorites = {}, options = {}) {
  const resolveTeam = buildTeamLookup(db)
  const resolveTotal = buildTotalsLookup(db)
  const favoritePlayerIds = safeArr(favorites?.favoritePlayerIds)

  return safeArr(db?.players).map(player => {
    const total = resolveTotal(player.player_id) || {}
    const merged = { ...player, ...total }
    const team = resolveTeam(merged.team_id) || resolveTeam(merged.team_short_name) || resolveTeam(merged.team_name) || {}
    const identity = getPlayerDisplayIdentity(merged)
    const teamShortName = normalize(merged.team_short_name || team.team_short_name || team.short || merged.team_id || '-')
    const teamFullName = normalize(merged.team_name || team.team_name || team.name || teamShortName)
    const avatar = getPlayerAvatarSource(merged, options)
    const heroNames = avatar.heroNames || []
    const flexRoles = safeArr(merged.allowed_flex).map(normalizeRosterRole).filter(role => role && role !== normalizeRosterRole(merged.role))

    return {
      ...merged,
      identity,
      avatar,
      heroNames,
      role: normalizeRosterRole(merged.role),
      flexRoles,
      teamShortName,
      teamFullName,
      teamRouteId: normalize(team.team_id || team.id || merged.team_id || teamShortName),
      hasStats: hasReliableStats(merged),
      isFavorite: isFavorite(favoritePlayerIds, getPlayerIdentities(merged))
    }
  })
}

export function filterPlayers(players, filters = {}) {
  const query = normalizeKey(filters.query ?? filters.q)
  const role = normalizeRosterRole(filters.role)
  const team = normalize(filters.team || 'ALL')
  const following = filters.following || 'all'
  const hero = normalize(filters.hero || 'ALL')

  return safeArr(players).filter(player => {
    if (filters.role && filters.role !== 'ALL' && player.role !== role) return false
    if (team !== 'ALL' && !identityMatches(team, [player.teamRouteId, player.teamShortName, player.teamFullName])) return false
    if (following === 'following' && !player.isFavorite) return false
    if (hero !== 'ALL' && !heroIdentityMatches(hero, [player.avatar?.heroName, ...safeArr(player.heroNames), player.most_played_hero, ...safeArr(player.top_3_heroes)])) return false

    return includesQuery(query, [
      player.identity?.primary,
      player.identity?.secondary,
      player.player_id,
      player.player_name,
      player.display_name,
      player.nickname,
      player.teamShortName,
      player.teamFullName,
      player.role,
      player.avatar?.heroName,
      formatOwHeroName(player.avatar?.heroName, 'zh-CN'),
      formatOwHeroName(player.avatar?.heroName, 'en-US'),
      getOwNameSearchText(player.avatar?.heroName, 'hero'),
      ...safeArr(player.heroNames),
      ...safeArr(player.heroNames).flatMap(heroName => [
        formatOwHeroName(heroName, 'zh-CN'),
        formatOwHeroName(heroName, 'en-US'),
        getOwNameSearchText(heroName, 'hero')
      ])
    ])
  })
}

export function sortPlayers(players, sort = 'default') {
  return [...safeArr(players)].sort((a, b) => {
    const favoriteDelta = compareFavorite(a, b)
    if (favoriteDelta) return favoriteDelta
    if (sort === 'team') return compareText(a.teamShortName, b.teamShortName) || compareText(a.identity?.primary, b.identity?.primary)
    if (sort === 'role') return getRoleRank(a.role) - getRoleRank(b.role) || compareText(a.identity?.primary, b.identity?.primary)
    if (sort === 'time') return toNumber(b.raw_time_mins) - toNumber(a.raw_time_mins) || toNumber(b.maps_played) - toNumber(a.maps_played) || compareText(a.identity?.primary, b.identity?.primary)
    return compareText(a.identity?.primary, b.identity?.primary)
  })
}

export function getRoleCounts(source) {
  const players = Array.isArray(source) ? source : safeArr(source?.players)
  const counts = { TANK: 0, DPS: 0, SUP: 0, SUPPORT: 0, FLEX: 0 }

  players.forEach(player => {
    const role = normalizeRosterRole(player.role)
    counts[role] = (counts[role] || 0) + 1
  })
  counts.SUPPORT = counts.SUP

  return counts
}

export function getStaffDirectory(db) {
  const rowsByTeamPerson = new Map()

  getTeamDirectory(db).forEach(team => {
    const addPerson = (person, role) => {
      const identity = normalizeStaffIdentity(person)
      if (!identity.key) return
      const id = `${team.routeId}:${identity.key}`

      if (!rowsByTeamPerson.has(id)) {
        rowsByTeamPerson.set(id, {
          id,
          name: identity.name || identity.battleTag,
          battleTag: identity.battleTag,
          roles: [],
          role: role,
          roleLabel: '',
          team,
          identityKey: identity.key
        })
      }

      const row = rowsByTeamPerson.get(id)
      if (!row.roles.includes(role)) row.roles.push(role)
      row.roles.sort((a, b) => STAFF_ROLE_ORDER.indexOf(a) - STAFF_ROLE_ORDER.indexOf(b))
      row.role = row.roles[0]
      row.roleLabel = row.roles.map(item => (item === 'manager' ? '经理' : '教练')).join(' / ')
    }

    team.staff.managers.forEach(person => addPerson(person, 'manager'))
    team.staff.coaches.forEach(person => addPerson(person, 'coach'))
  })

  return [...rowsByTeamPerson.values()]
}

export function filterStaff(staff, filters = {}) {
  const query = normalizeKey(filters.query ?? filters.q)
  const role = filters.type || filters.role || 'ALL'
  const team = normalize(filters.team || 'ALL')

  return safeArr(staff).filter(row => {
    if (role !== 'ALL' && !row.roles.includes(role)) return false
    if (team !== 'ALL' && !identityMatches(team, [row.team?.routeId, row.team?.shortName, row.team?.fullName])) return false

    return includesQuery(query, [
      row.name,
      row.battleTag,
      row.roleLabel,
      row.team?.shortName,
      row.team?.fullName
    ])
  })
}

export function sortStaff(staff, sort = 'default') {
  return [...safeArr(staff)].sort((a, b) => {
    if (sort === 'name') return compareText(a.name, b.name) || compareText(a.team?.shortName, b.team?.shortName)
    if (sort === 'role') return STAFF_ROLE_ORDER.indexOf(a.role) - STAFF_ROLE_ORDER.indexOf(b.role) || compareText(a.team?.shortName, b.team?.shortName) || compareText(a.name, b.name)
    return compareText(a.team?.shortName, b.team?.shortName) || STAFF_ROLE_ORDER.indexOf(a.role) - STAFF_ROLE_ORDER.indexOf(b.role) || compareText(a.name, b.name)
  })
}

export function getStaffCounts(staffOrDb) {
  const staff = Array.isArray(staffOrDb) ? staffOrDb : getStaffDirectory(staffOrDb)
  const teams = new Set()
  const people = new Set()
  let managers = 0
  let coaches = 0

  safeArr(staff).forEach(row => {
    if (row.team?.routeId) teams.add(row.team.routeId)
    if (row.identityKey) people.add(row.identityKey)
    if (row.roles?.includes('manager')) managers += 1
    if (row.roles?.includes('coach')) coaches += 1
  })

  return {
    uniqueStaff: people.size,
    dutyRecords: managers + coaches,
    managers,
    coaches,
    teams: teams.size
  }
}

export function paginateItems(items, page = 1, pageSize = 24) {
  const rows = safeArr(items)
  const isAll = pageSize === 'all'
  const numericPageSize = isAll ? rows.length || 1 : Math.max(1, toNumber(pageSize, 24))
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(rows.length / numericPageSize))
  const currentPage = isAll ? 1 : Math.min(Math.max(1, toNumber(page, 1)), totalPages)
  const start = isAll ? 0 : (currentPage - 1) * numericPageSize
  const pageItems = isAll ? rows : rows.slice(start, start + numericPageSize)
  const startIndex = rows.length ? start + 1 : 0
  const endIndex = rows.length ? Math.min(start + pageItems.length, rows.length) : 0

  return {
    items: pageItems,
    rows: pageItems,
    page: currentPage,
    pageSize: isAll ? 'all' : numericPageSize,
    totalPages,
    totalItems: rows.length,
    totalRows: rows.length,
    startIndex,
    endIndex,
    isAll
  }
}

export function paginateTeams(teams, page = 1, pageSize = 12) {
  return paginateItems(teams, page, pageSize)
}

export function paginatePlayers(players, page = 1, pageSize = 24) {
  return paginateItems(players, page, pageSize)
}

export function paginateStaff(staff, page = 1, pageSize = 20) {
  return paginateItems(staff, page, pageSize)
}

function readPageSize(params, defaults) {
  const raw = params.get('pageSize')
  if (defaults.includes('all') && raw === 'all') return 'all'
  const numeric = toNumber(raw, defaults[0])
  return defaults.includes(numeric) ? numeric : defaults[0]
}

export function buildRosterQueryState(searchParams, directory = 'teams') {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams)
  const isPlayers = directory === 'players'
  const isStaff = directory === 'staff'
  const defaults = isPlayers ? PLAYER_PAGE_SIZES : isStaff ? STAFF_PAGE_SIZES : TEAM_PAGE_SIZES
  const role = params.get('role') || 'ALL'
  const type = params.get('type') || params.get('role') || 'ALL'

  return {
    q: params.get('q') || '',
    query: params.get('q') || '',
    filter: params.get('filter') || 'all',
    role,
    team: params.get('team') || 'ALL',
    hero: params.get('hero') || 'ALL',
    type,
    following: params.get('following') || 'all',
    sort: params.get('sort') || 'default',
    page: Math.max(1, toNumber(params.get('page'), 1)),
    pageSize: readPageSize(params, defaults)
  }
}

export function getActiveRosterFilters(state = {}) {
  const filters = []
  if (state.q) filters.push({ key: 'q', label: `搜索：${state.q}` })
  if (state.filter && state.filter !== 'all') filters.push({ key: 'filter', label: state.filter })
  if (state.role && state.role !== 'ALL') filters.push({ key: 'role', label: normalizeRosterRole(state.role) === 'SUP' ? 'SUPPORT' : normalizeRosterRole(state.role) })
  if (state.type && state.type !== 'ALL') filters.push({ key: 'type', label: state.type === 'manager' ? '经理' : '教练' })
  if (state.team && state.team !== 'ALL') filters.push({ key: 'team', label: state.team })
  if (state.hero && state.hero !== 'ALL') filters.push({ key: 'hero', label: state.hero })
  if (state.following === 'following') filters.push({ key: 'following', label: '只看关注' })
  return filters
}

export function getRosterSummary(db) {
  const teams = getTeamDirectory(db)
  const roleCounts = getRoleCounts(db)
  const staffCounts = getStaffCounts(db)

  return {
    totalTeams: teams.length,
    totalPlayers: safeArr(db?.players).length,
    roleCounts,
    managers: staffCounts.managers,
    coaches: staffCounts.coaches,
    staff: staffCounts
  }
}
