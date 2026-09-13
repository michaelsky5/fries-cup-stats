import { platformRequest } from '../auth/platformApi.js'

export async function fetchEventContext(seasonId) {
  return platformRequest(`/me/event-contexts?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function fetchCoachContext(seasonId) {
  return platformRequest(`/me/coach-context?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function fetchManagerTransferContext() {
  return platformRequest('/me/manager-transfer-context')
}

export async function initiateManagerTransfer(teamOrganizationId, payload) {
  const data = await platformRequest(`/team-organizations/${encodeURIComponent(teamOrganizationId)}/manager-transfers`, {
    method: 'POST',
    body: payload
  })
  return data?.transfer || null
}

export async function respondToManagerTransfer(transferId, decision, payload = {}) {
  return platformRequest(`/manager-transfers/${encodeURIComponent(transferId)}/${decision}`, {
    method: 'POST',
    body: payload
  })
}

export async function cancelManagerTransfer(transferId, payload) {
  return platformRequest(`/manager-transfers/${encodeURIComponent(transferId)}/cancel`, {
    method: 'POST',
    body: payload
  })
}

export async function inviteLongTermCoach(teamOrganizationId, lookup) {
  const data = await platformRequest(`/team-organizations/${encodeURIComponent(teamOrganizationId)}/coach-invitations`, {
    method: 'POST',
    body: { lookup }
  })
  return data?.membership || null
}

export async function respondToLongTermCoachInvitation(membershipId, decision) {
  return platformRequest(`/team-coach-memberships/${encodeURIComponent(membershipId)}/${decision}`, { method: 'POST' })
}

export async function leaveLongTermCoachTeam(membershipId) {
  return platformRequest(`/team-coach-memberships/${encodeURIComponent(membershipId)}/leave`, { method: 'POST' })
}

export async function removeLongTermCoach(membershipId) {
  return platformRequest(`/team-coach-memberships/${encodeURIComponent(membershipId)}/remove`, { method: 'POST' })
}

export async function inviteEventCoach(registrationId, membershipId) {
  const data = await platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/coach-invitations`, {
    method: 'POST',
    body: { membershipId }
  })
  return data?.staff || null
}

export async function respondToEventCoachInvitation(staffId, decision) {
  return platformRequest(`/event-coach-relationships/${encodeURIComponent(staffId)}/${decision}`, { method: 'POST' })
}

export async function leaveEventCoachRole(staffId) {
  return platformRequest(`/event-coach-relationships/${encodeURIComponent(staffId)}/leave`, { method: 'POST' })
}

export async function removeEventCoach(staffId) {
  return platformRequest(`/event-coach-relationships/${encodeURIComponent(staffId)}/remove`, { method: 'POST' })
}

export async function createTeamClaim(payload) {
  const data = await platformRequest('/teams/claims', { method: 'POST', body: payload })
  return data?.claim || null
}

export async function submitTeamRegistration(seasonId, payload) {
  const data = await platformRequest(`/seasons/${encodeURIComponent(seasonId)}/team-registrations`, {
    method: 'POST',
    body: payload
  })
  return data?.registration || null
}

export async function updateRecruitment(registrationId, payload) {
  const data = await platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/recruitment`, {
    method: 'PATCH',
    body: payload
  })
  return data?.registration || null
}

export async function fetchRecruitingTeams(seasonId) {
  const data = await platformRequest(`/seasons/${encodeURIComponent(seasonId)}/recruiting-teams`)
  return Array.isArray(data?.teams) ? data.teams : []
}

export async function saveFreeAgentProfile(seasonId, payload) {
  const data = await platformRequest(`/seasons/${encodeURIComponent(seasonId)}/me/free-agent-profile`, {
    method: 'PUT',
    body: payload
  })
  return data?.profile || null
}

export async function fetchFreeAgents(seasonId) {
  const data = await platformRequest(`/seasons/${encodeURIComponent(seasonId)}/free-agents`)
  return Array.isArray(data?.freeAgents) ? data.freeAgents : []
}

export async function applyToTeam(registrationId, payload) {
  const data = await platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/applications`, {
    method: 'POST',
    body: payload
  })
  return data?.application || null
}

export async function reviewTeamApplication(applicationId, decision) {
  return platformRequest(`/team-applications/${encodeURIComponent(applicationId)}/${decision}`, { method: 'POST' })
}

export async function accessTeamPrivateContact(registrationId, subjectUserId, purpose) {
  return platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/private-contact-access`, {
    method: 'POST',
    body: { subjectUserId, purpose }
  })
}

export async function withdrawTeamApplication(applicationId) {
  return platformRequest(`/team-applications/${encodeURIComponent(applicationId)}/withdraw`, { method: 'POST' })
}

export async function invitePlayer(registrationId, payload) {
  const data = await platformRequest(`/team-registrations/${encodeURIComponent(registrationId)}/invitations`, {
    method: 'POST',
    body: payload
  })
  return data?.invitation || null
}

export async function respondToTeamInvitation(invitationId, decision) {
  return platformRequest(`/team-invitations/${encodeURIComponent(invitationId)}/${decision}`, { method: 'POST' })
}

export async function saveRosterConfiguration(rosterId, payload) {
  const data = await platformRequest(`/event-rosters/${encodeURIComponent(rosterId)}`, {
    method: 'PATCH',
    body: payload
  })
  return data?.roster || null
}

export async function submitOfficialRoster(rosterId, password) {
  const data = await platformRequest(`/event-rosters/${encodeURIComponent(rosterId)}/submit`, {
    method: 'POST',
    body: { password }
  })
  return data?.roster || null
}

export async function withdrawOfficialRoster(rosterId) {
  return platformRequest(`/event-rosters/${encodeURIComponent(rosterId)}/withdraw`, { method: 'POST' })
}
