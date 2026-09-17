import { platformRequest } from '../auth/platformApi.js'

export async function fetchRosterChangeContext(seasonId) {
  return platformRequest(`/me/roster-change-context?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function fetchRosterChangeCandidates(seasonId, registrationId) {
  const data = await platformRequest(`/seasons/${encodeURIComponent(seasonId)}/roster-change-candidates?registrationId=${encodeURIComponent(registrationId)}`)
  return Array.isArray(data?.candidates) ? data.candidates : []
}

export async function createRosterChangeRequest(registrationId, payload) {
  const data = await platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/roster-change-requests`, {
    method: 'POST',
    body: payload
  })
  return data?.request || null
}

export async function addRosterChangeItem(requestId, payload) {
  const data = await platformRequest(`/roster-change-requests/${encodeURIComponent(requestId)}/items`, {
    method: 'POST',
    body: payload
  })
  return data?.request || null
}

export async function deleteRosterChangeItem(itemId) {
  return platformRequest(`/roster-change-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
}

export async function respondToRosterChangePlayer(itemId, decision) {
  return platformRequest(`/roster-change-items/${encodeURIComponent(itemId)}/player-confirm`, {
    method: 'POST',
    body: { decision }
  })
}

export async function respondToRosterChangeRelease(itemId, decision) {
  return platformRequest(`/roster-change-items/${encodeURIComponent(itemId)}/source-release`, {
    method: 'POST',
    body: { decision }
  })
}

export async function saveRosterChangeConfiguration(requestId, payload) {
  const data = await platformRequest(`/roster-change-requests/${encodeURIComponent(requestId)}/configuration`, {
    method: 'PATCH',
    body: payload
  })
  return data?.request || null
}

export async function submitRosterChangeRequest(requestId, password) {
  const data = await platformRequest(`/roster-change-requests/${encodeURIComponent(requestId)}/submit`, {
    method: 'POST',
    body: { password }
  })
  return data?.request || null
}
