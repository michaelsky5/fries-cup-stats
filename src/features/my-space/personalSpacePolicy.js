// Personal interests remain available when this event's participation portal is closed.
// Participation workspaces still require their existing account and feature checks.
export function requiresParticipationAccess(section) {
  return section !== 'following'
}

// Account operations read their own authenticated API. Public archive failures
// must not prevent a participant from reaching a deadline-sensitive task.
export function requiresPublicSnapshot({ pathname, section, isAuthenticated }) {
  return !isAuthenticated || !/^\/me\/?$/.test(pathname) || ['following', 'stats'].includes(section)
}
