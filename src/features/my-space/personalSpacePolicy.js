import { normalizeCompetitionId } from './accountCompetitionModel.js'

// Personal interests remain available when this event's participation portal is closed.
// Participation workspaces still require their existing account and feature checks.
export function requiresParticipationAccess(section) {
  return section !== 'following'
}

// An explicit competition link must retain its destination through sign-in.
export function isCompetitionMatchesEntry({ pathname, search = '' }) {
  if (!/^\/me\/?$/.test(pathname)) return false
  const params = new URLSearchParams(search)
  return params.get('section') === 'matches' && Boolean(normalizeCompetitionId(params.get('competition')))
}

// Account operations read their own authenticated API. Public archive failures
// must not prevent a participant from reaching a deadline-sensitive task.
export function requiresPublicSnapshot({ pathname, search = '', section, isAuthenticated }) {
  if (isCompetitionMatchesEntry({ pathname, search })) return false
  return !isAuthenticated || !/^\/me\/?$/.test(pathname) || ['following', 'stats'].includes(section)
}
