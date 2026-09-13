import { platformRequest } from '../auth/platformApi.js'

function seasonQuery(seasonId, extra = '') {
  return `seasonId=${encodeURIComponent(seasonId)}${extra}`
}

export async function fetchCommunicationCenter(seasonId) {
  const [notificationData, announcementData, appealData, optionData] = await Promise.all([
    platformRequest(`/me/notifications?${seasonQuery(seasonId)}`),
    fetchMyAnnouncements(seasonId),
    platformRequest(`/me/appeals?${seasonQuery(seasonId)}`),
    platformRequest(`/me/appeal-options?${seasonQuery(seasonId)}`)
  ])
  return {
    notifications: notificationData?.notifications || [],
    announcements: announcementData,
    appeals: appealData?.appeals || [],
    appealOptions: optionData?.matches || []
  }
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
  return data?.announcements || []
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
