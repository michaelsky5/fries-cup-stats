import { normalizeCompetitionId } from './accountCompetitionModel.js'

const siteKeys = ['season', 'lang', 'design']
function siteContext(search) {
  const current = new URLSearchParams(search)
  const next = new URLSearchParams()
  for (const key of siteKeys) if (current.has(key)) next.set(key, current.get(key))
  return { current, next }
}

// The server identifies the real competition; public season never grants access.
export function matchRoomDestination(matchId, { search = '', competitionId = '' } = {}) {
  const { current, next } = siteContext(search)
  const id = normalizeCompetitionId(competitionId || current.get('competition'))
  if (id) next.set('competition', id)
  if (id && current.get('competition') === id && current.get('team')) next.set('team', current.get('team'))
  return `/me/matches/${encodeURIComponent(matchId)}/room${next.size ? `?${next}` : ''}`
}

export function matchListDestination(matchId, { search = '', competitionId = '' } = {}) {
  const room = new URL(matchRoomDestination(matchId, { search, competitionId }), 'https://navigation.invalid')
  room.searchParams.set('section', 'matches')
  if (matchId) room.searchParams.set('weeklyMatch', matchId)
  return `/me?${room.searchParams}`
}

export function spaceSectionDestination(section, { search = '', competitionId = '' } = {}) {
  const url = new URL(matchListDestination('', { search, competitionId }), 'https://navigation.invalid')
  url.searchParams.set('section', section)
  return `/me?${url.searchParams}`
}

export function teamManagementDestination({ search = '', competitionId = '', teamId = '', manage = '' } = {}) {
  const { current, next } = siteContext(search)
  const id = normalizeCompetitionId(competitionId || current.get('competition'))
  if (id) next.set('competition', id)
  next.set('section', 'team')
  if (teamId) next.set('team', teamId)
  if (teamId && ['members', 'coaches', 'ownership'].includes(manage)) next.set('manage', manage)
  return `/me?${next}`
}
