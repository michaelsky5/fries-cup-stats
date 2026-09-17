import { platformRequest } from '../auth/platformApi.js'

export async function fetchMyWeeklyCompetition(seasonId, options = {}) {
  return platformRequest(`/me/weekly-competition?seasonId=${encodeURIComponent(seasonId)}`, options)
}

export async function saveMyWeeklyCore(entryId, input) {
  const data = await platformRequest(
    `/me/weekly-cycle-entries/${encodeURIComponent(entryId)}/core-selection`,
    { method: 'PUT', body: input }
  )
  return data?.selection || null
}

export async function saveMyWeeklyParticipation(weekId, input) {
  const data = await platformRequest(
    `/me/weekly-weeks/${encodeURIComponent(weekId)}/participation`,
    { method: 'PUT', body: input }
  )
  return data?.participation || null
}

export async function saveMyWeeklyRoster(participationId, input) {
  const data = await platformRequest(
    `/me/weekly-participations/${encodeURIComponent(participationId)}/roster`,
    { method: 'PUT', body: input }
  )
  return data?.roster || null
}
