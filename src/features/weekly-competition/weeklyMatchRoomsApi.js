import { platformRequest } from '../auth/platformApi.js'

export function fetchMyWeeklyMatchRooms(seasonId, options = {}) {
  return platformRequest(`/me/weekly-match-rooms?seasonId=${encodeURIComponent(seasonId)}`, options)
}

export async function saveMyWeeklyMatchResponse(matchId, input, options = {}) {
  const data = await platformRequest(`/me/weekly-match-rooms/${encodeURIComponent(matchId)}/confirmation`, {
    ...options,
    method: 'PUT',
    body: input
  })
  return data?.confirmation || null
}
