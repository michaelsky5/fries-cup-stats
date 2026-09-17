import { platformRequest } from '../auth/platformApi.js'

export async function fetchScheduleContext(seasonId) {
  return platformRequest(`/me/schedule-context?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function createScheduleProposal(matchId, payload) {
  const data = await platformRequest(`/matches/${encodeURIComponent(matchId)}/schedule-proposals`, {
    method: 'POST', body: payload
  })
  return data?.proposal || null
}

export async function addScheduleCandidate(proposalId, payload) {
  const data = await platformRequest(`/schedule-proposals/${encodeURIComponent(proposalId)}/candidates`, {
    method: 'POST', body: payload
  })
  return data?.proposal || null
}

export async function confirmScheduleCandidate(proposalId, payload) {
  const data = await platformRequest(`/schedule-proposals/${encodeURIComponent(proposalId)}/team-confirmations`, {
    method: 'POST', body: payload
  })
  return data?.proposal || null
}
