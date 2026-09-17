const GROUP_ROLES = {
  team: ['manager', 'coach'],
  event: ['admin', 'caster']
}

export function getStaffDirectoryGroup(search = '') {
  const params = new URLSearchParams(search)
  const group = params.get('group')
  if (Object.hasOwn(GROUP_ROLES, group)) return group

  const role = params.get('type') || params.get('role')
  if (GROUP_ROLES.team.includes(role)) return 'team'
  if (GROUP_ROLES.event.includes(role)) return 'event'

  const focus = params.get('rosterFocus')
  if (focus) return focus.startsWith('event:') ? 'event' : 'team'
  if (params.get('team') && params.get('team') !== 'ALL') return 'team'
  return 'event'
}

// Persist the inferred group so clearing a legacy role filter cannot change sections.
export function normalizeStaffDirectorySearch(search = '') {
  const params = new URLSearchParams(search)
  const group = getStaffDirectoryGroup(params)
  const role = params.get('type') || params.get('role') || 'ALL'
  const incompatibleRole = role !== 'ALL' && !GROUP_ROLES[group].includes(role)
  const incompatibleTeam = group === 'event' && params.has('team') && params.get('team') !== 'ALL'
  params.set('group', group)
  params.delete('role')
  if (role === 'ALL' || incompatibleRole) params.delete('type')
  else params.set('type', role)
  if (group === 'event') {
    params.delete('team')
    if (params.get('sort') === 'team') params.delete('sort')
  }
  if (group === 'team' && params.get('sort') === 'matches') {
    params.delete('sort')
    params.delete('page')
    params.delete('rosterFocus')
  }
  if (incompatibleRole || incompatibleTeam) {
    params.delete('page')
    params.delete('rosterFocus')
  }
  const focus = params.get('rosterFocus')
  if (focus && focus.startsWith('event:') !== (group === 'event')) params.delete('rosterFocus')
  return params
}
