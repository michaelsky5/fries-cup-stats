import { getPlayerDirectory, getPlayerDisplayIdentity, getRoleCounts, getStaffCounts, getStaffDirectory, getTeamDirectory, normalizeRosterRole, sortTeams } from '../../lib/rosterSelectors.js'
import { buildStaffIndex } from '../../lib/reviewSearch.js'
import { getPlayerRosterChange } from '../../lib/rosterStage.js'
import { getStaffProfilePath } from '../../lib/staffProfiles.js'

const key = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()
const array = value => Array.isArray(value) ? value : []
const roleOrder = ['TANK', 'DPS', 'SUP', 'FLEX']
const compareNames = (a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true })
const recordedNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null

export function getOverviewTeamRoster(db, team) {
  if (!team) return []
  const publishedIds = new Set(array(team.player_ids).map(key).filter(Boolean))
  const teamId = key(team.team_id || team.id)
  const teamNames = [team.shortName, team.fullName, team.team_short_name, team.team_name].map(key).filter(Boolean)
  return array(db?.players).filter(player => {
    // An explicit roster is authoritative; a reused name cannot add another team's player.
    if (publishedIds.size) return publishedIds.has(key(player.player_id || player.id))
    const playerTeamId = key(player.team_id)
    if (teamId && playerTeamId) return teamId === playerTeamId
    return [player.team_short_name, player.team_name].map(key).filter(Boolean).some(name => teamNames.includes(name))
  })
}

export function staffOverviewHref(staff, role) {
  return getStaffProfilePath(staff.team ? staff : { id: `event:${role}:${staff.staff_key}` })
}

export function buildRosterOverview(db, season) {
  const players = getPlayerDirectory(db, {}, { season })
  const byPlayerId = new Map(players.map(player => [key(player.identity.playerId), player]).filter(([id]) => id))
  const teamStaff = getStaffDirectory(db)
  const staffCounts = getStaffCounts(teamStaff)
  const roleCounts = getRoleCounts(db)
  const teams = sortTeams(getTeamDirectory(db), 'short').map(team => {
    const rosterRecords = getOverviewTeamRoster(db, team)
    const members = rosterRecords.map(player => {
      const identity = getPlayerDisplayIdentity(player)
      const recorded = identity.playerId ? byPlayerId.get(key(identity.playerId)) : null
      return {
        identity,
        role: normalizeRosterRole(player.role),
        rosterChange: getPlayerRosterChange(player),
        href: identity.playerId ? `/players/${encodeURIComponent(identity.playerId)}` : '',
        hero: recorded?.hasStats ? recorded.avatar?.heroName || '' : '',
        playedMinutes: recordedNumber(recorded?.raw_time_mins ?? recorded?.roleTimeMins),
        mapsPlayed: recordedNumber(recorded?.maps_played)
      }
    }).sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) || compareNames(a.identity.primary, b.identity.primary))
    const rosterSize = new Set(array(team.player_ids).map(key).filter(Boolean)).size || members.length
    // A season archive can retain both replaced players and their replacements.
    // Reconstruct the opening count only when every published member has a known joining stage.
    const hasOpeningRoster = rosterRecords.length > 0 && rosterRecords.length === rosterSize &&
      rosterRecords.every(player => ['season', 'playoffs'].includes(key(player.join_stage)))
    return {
      ...team,
      members,
      rosterSize,
      openingRosterSize: hasOpeningRoster ? rosterRecords.filter(player => key(player.join_stage) === 'season').length : null,
      playoffJoins: members.filter(member => member.rosterChange === 'playoff_join').length,
      playoffExits: members.filter(member => member.rosterChange === 'playoff_exit').length,
      staffRecords: teamStaff.filter(staff => key(staff.team.routeId) === key(team.routeId)),
      heroMember: members.filter(member => member.hero).sort((a, b) =>
        (b.playedMinutes ?? -1) - (a.playedMinutes ?? -1) ||
        (b.mapsPlayed ?? -1) - (a.mapsPlayed ?? -1) ||
        compareNames(a.identity.primary, b.identity.primary) || compareNames(a.identity.playerId, b.identity.playerId)
      )[0] || null
    }
  })
  const index = buildStaffIndex(db)
  const credits = Object.fromEntries([['admin', index.admins], ['caster', index.casters]].map(([role, entries]) => [role, entries.map(entry => ({
    ...entry,
    role,
    key: `${role}:${entry.staff_key}`,
    href: staffOverviewHref(entry, role),
    matchLinks: entry.matches.map(match => ({
      id: String(match.match_id || match.id || ''),
      teamA: match.team_a?.short || match.team_a?.team_short_name || match.team_a?.name || '',
      teamB: match.team_b?.short || match.team_b?.team_short_name || match.team_b?.name || ''
    })).filter(match => match.id)
  })).sort((a, b) => b.match_count - a.match_count || compareNames(a.staff_name, b.staff_name))]))
  const sizes = new Map()
  const rosterSizeBasis = teams.length && teams.every(team => team.openingRosterSize !== null) ? 'opening' : 'season'
  teams.forEach(team => {
    const size = rosterSizeBasis === 'opening' ? team.openingRosterSize : team.rosterSize
    sizes.set(size, (sizes.get(size) || 0) + 1)
  })
  const groups = [
    { id: 'teams', href: '/teams', entries: teams.map(team => ({ id: team.routeId, name: team.shortName, detail: team.fullName, fields: [team.shortName, team.fullName], href: `/teams/${encodeURIComponent(team.routeId)}` })) },
    { id: 'players', href: '/players', entries: players.filter(player => player.identity.playerId).map(player => ({ id: player.identity.playerId, name: player.identity.primary, detail: player.teamShortName, fields: [player.identity.primary, player.identity.secondary, player.teamShortName, player.teamFullName], href: `/players/${encodeURIComponent(player.identity.playerId)}` })) },
    { id: 'teamStaff', href: '/staff?group=team', entries: teamStaff.map(staff => ({ id: staff.id, name: staff.name, detail: staff.team.shortName, fields: [staff.name, staff.battleTag, staff.team.shortName, staff.team.fullName], href: staffOverviewHref(staff) })) },
    { id: 'eventStaff', href: '/staff?group=event', entries: [...credits.admin, ...credits.caster].map(staff => ({ id: staff.key, name: staff.staff_name, detail: staff.role, fields: [staff.staff_name, ...staff.aliases], href: staff.href })) }
  ]
  return {
    teams, credits, groups, rosterSizeBasis,
    totalPlayers: players.length,
    teamStaffCount: teamStaff.length,
    eventStaffCount: credits.admin.length + credits.caster.length,
    staffCounts,
    roles: roleOrder.map(role => ({ role, count: roleCounts[role] || 0 })),
    rosterSizes: [...sizes].sort(([a], [b]) => a - b).map(([size, count]) => ({ size, count }))
  }
}

export function searchRosterOverview(model, query) {
  const term = key(query)
  if (!term) return []
  return model.groups.map(group => {
    // Keep the same single-field phrase search as the destination directories.
    const matches = group.entries.filter(entry => entry.fields.some(field => key(field).includes(term)))
    const [pathname, search = ''] = group.href.split('?')
    const params = new URLSearchParams(search)
    params.set('q', query.normalize('NFKC').trim())
    return { id: group.id, total: matches.length, items: matches.slice(0, 3), href: `${pathname}?${params}` }
  }).filter(group => group.total)
}
