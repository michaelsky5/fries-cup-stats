import { platformRequest } from '../auth/platformApi.js'

function seasonQuery(seasonId, extra = '') {
  return `seasonId=${encodeURIComponent(seasonId)}${extra}`
}

export async function fetchCommunicationCenter(seasonId) {
  const keys = ['notifications', 'announcements', 'appeals', 'appealOptions']
  const results = await Promise.allSettled([
    platformRequest(`/me/notifications?${seasonQuery(seasonId)}`),
    fetchMyAnnouncements(seasonId),
    platformRequest(`/me/appeals?${seasonQuery(seasonId)}`),
    platformRequest(`/me/appeal-options?${seasonQuery(seasonId)}`)
  ])
  const selectors = [data => data?.notifications, data => data, data => data?.appeals, data => data?.matches]
  const data = { errors: {} }
  results.forEach((result, index) => {
    const key = keys[index]
    const value = result.status === 'fulfilled' ? selectors[index](result.value) : undefined
    if (Array.isArray(value)) data[key] = value
    else data.errors[key] = result.status === 'rejected' ? result.reason : new Error('Invalid response')
  })
  return data
}

export async function markNotificationRead(notificationId) {
  const data = await platformRequest(`/me/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST'
  })
  return data?.notification || null
}

export async function markAllNotificationsRead(seasonId) {
  return platformRequest(`/me/notifications/read-all?seasonId=${encodeURIComponent(seasonId)}`, {
    method: 'POST'
  })
}

export async function fetchMyAnnouncements(seasonId) {
  const data = await platformRequest(`/announcements?${seasonQuery(seasonId)}`)
  if (!Array.isArray(data?.announcements)) throw new Error('Invalid announcements response')
  return data.announcements
}

export async function markAnnouncementRead(id) {
  const data = await platformRequest(`/announcements/${encodeURIComponent(id)}/read`, { method: 'POST' })
  return data?.receipt || null
}

export async function acknowledgeAnnouncement(id) {
  const data = await platformRequest(`/announcements/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' })
  return data?.receipt || null
}

export async function createAppeal(matchId, payload) {
  const data = await platformRequest(`/matches/${encodeURIComponent(matchId)}/appeals`, { method: 'POST', body: payload })
  return data?.appeal || null
}

export async function addAppealEvidence(id, evidence) {
  const data = await platformRequest(`/appeals/${encodeURIComponent(id)}/evidence`, {
    method: 'POST', body: { evidence }
  })
  return data?.evidence || []
}

export async function withdrawAppeal(id, note = '') {
  const data = await platformRequest(`/appeals/${encodeURIComponent(id)}/withdraw`, {
    method: 'POST', body: { note: note || null }
  })
  return data?.appeal || null
}

export async function requestAppealReview(id, payload) {
  return platformRequest(`/appeals/${encodeURIComponent(id)}/review`, { method: "POST", body: payload })
}
