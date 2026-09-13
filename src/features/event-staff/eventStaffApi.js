import { platformRequest } from '../auth/platformApi.js'

export async function fetchEventStaffContext(seasonId) {
  return platformRequest(`/me/event-staff-context?seasonId=${encodeURIComponent(seasonId)}`)
}

export async function respondToEventStaffInvitation(participationId, decision, payload = {}) {
  return platformRequest(`/me/event-staff-participations/${encodeURIComponent(participationId)}/${decision}`, {
    method: 'POST',
    body: payload
  })
}

export async function withdrawEventStaffParticipation(participationId, note = '') {
  return platformRequest(`/me/event-staff-participations/${encodeURIComponent(participationId)}/withdraw`, {
    method: 'POST',
    body: { note: note || undefined }
  })
}

export async function submitOwnEventStaffAvailability(formId, payload) {
  return platformRequest(`/me/event-staff/availability/${encodeURIComponent(formId)}`, {
    method: 'POST',
    body: payload
  })
}
