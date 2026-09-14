import { buildStaffIndex } from './reviewSearch.js'
import { encodeStaffKey } from './reviewAssets.js'
import { getStaffDirectory } from './rosterSelectors.js'
import { getMatchArchiveStages } from './matchArchiveStages.js'
import { sortMatchesBySchedule } from './matchesSelectors.js'

export function getStaffProfilePath(staff) {
  return `/staff/${encodeURIComponent(staff.id)}?group=${staff.team ? 'team' : 'event'}`
}

// The directory, counts and detail page share the same published-credit index.
// Event roles and team registrations remain distinct records, even for one name.
export function getEventStaffDirectory(db) {
  const index = buildStaffIndex(db)
  const makeRow = (entry, role) => ({
    id: `event:${role}:${entry.staff_key}`,
    name: entry.staff_name,
    battleTag: entry.aliases?.find(alias => /#\d+$/.test(String(alias || ''))) || '',
    roles: [role], role,
    duties: entry.duties || [],
    avatar: entry.avatar || '',
    roleLabel: role === 'caster' ? '解说' : '赛管',
    identityKey: `${role}:${entry.staff_key}`,
    team: null,
    matches: sortMatchesBySchedule(entry.matches).reverse(),
    partners: entry.partners || [],
    matchCount: entry.match_count,
    stages: getMatchArchiveStages(entry.matches),
    stageCount: entry.stages.length,
    teamCount: entry.teams_seen.length,
    storyPath: `/review/story/staff/${role}/${encodeStaffKey(entry.staff_key)}`,
    creditSource: db?.meta?.review_staff_payload_source === 'localDataUrl' ? 'archive' : 'published'
  })
  return [...index.admins.map(entry => makeRow(entry, 'admin')), ...index.casters.map(entry => makeRow(entry, 'caster'))]
}

export function getStaffProfile(db, staffId) {
  const eventStaff = getEventStaffDirectory(db)
  const teamStaff = getStaffDirectory(db)
  // React Router has already decoded the route segment. Do not decode names twice.
  const staff = [...eventStaff, ...teamStaff].find(row => row.id === staffId)
  if (!staff) return null
  const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase()
  const rosterIds = new Set((staff.team?.player_ids || []).map(normalize).filter(Boolean))
  const teamNames = new Set([staff.team?.shortName, staff.team?.fullName].map(normalize).filter(Boolean))
  const teamId = normalize(staff.team?.routeId)
  const players = staff.team ? (db.players || []).filter(player => {
    if (rosterIds.size) return rosterIds.has(normalize(player.player_id))
    if (teamId && player.team_id) return teamId === normalize(player.team_id)
    return [player.team_short_name, player.team_name].some(name => teamNames.has(normalize(name)))
  }) : []
  const rosterCount = rosterIds.size || players.length
  return {
    ...staff,
    players,
    rosterCount,
    unavailablePlayers: Math.max(0, rosterCount - players.length),
    colleagues: staff.team
      ? teamStaff.filter(row => row.id !== staff.id && row.team.routeId === staff.team.routeId)
      : (staff.partners || []).map(partner => {
        const record = eventStaff.find(row => row.role === staff.role && row.name === partner.name)
        return record ? { ...record, sharedMatchCount: partner.count } : null
      }).filter(Boolean)
  }
}
