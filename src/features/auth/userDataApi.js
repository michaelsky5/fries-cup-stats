import { platformRequest } from './platformApi.js'
import { normalizeAccountCompetitions } from '../my-space/accountCompetitionModel.js'

function normalizeFavoritesResponse(data) {
  if (!data || typeof data !== 'object') return null
  return data.favorites || data.payload || data.userFavorite?.payload || null
}

export async function fetchUserFavorites(seasonId) {
  const data = await platformRequest(`/me/favorites/${encodeURIComponent(seasonId)}`)
  return normalizeFavoritesResponse(data)
}

export async function saveUserFavorites(seasonId, favorites) {
  const data = await platformRequest(`/me/favorites/${encodeURIComponent(seasonId)}`, {
    method: 'PUT',
    body: { favorites }
  })

  return normalizeFavoritesResponse(data)
}

export async function fetchUserSave(saveType, slotKey = 'default') {
  const data = await platformRequest(`/me/saves/${encodeURIComponent(saveType)}/${encodeURIComponent(slotKey)}`)
  return data?.save?.payload || data?.payload || null
}

export async function saveUserSave(saveType, slotKey = 'default', payload) {
  const data = await platformRequest(`/me/saves/${encodeURIComponent(saveType)}/${encodeURIComponent(slotKey)}`, {
    method: 'PUT',
    body: { payload }
  })

  return data?.save?.payload || data?.payload || null
}

export async function fetchUserProfile() {
  const data = await platformRequest('/me/profile')
  return data?.profile || null
}

export async function updateUserProfile(payload) {
  const data = await platformRequest('/me/profile', {
    method: 'PATCH',
    body: payload
  })
  return {
    user: data?.user || null,
    profile: data?.profile || null
  }
}

export async function fetchNotificationPreferences() {
  const data = await platformRequest('/me/notification-preferences')
  return {
    preference: data?.preference || null,
    mandatory: data?.mandatory || null
  }
}

export async function updateNotificationPreferences(payload) {
  const data = await platformRequest('/me/notification-preferences', {
    method: 'PATCH',
    body: payload
  })
  return {
    preference: data?.preference || null,
    mandatory: data?.mandatory || null
  }
}

export async function fetchContactPrivacy(seasonId = '') {
  const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : ''
  const data = await platformRequest(`/me/privacy/contact-access${query}`)
  return {
    grants: Array.isArray(data?.grants) ? data.grants : [],
    recentAccesses: Array.isArray(data?.recentAccesses) ? data.recentAccesses : []
  }
}

export async function fetchUserIdentityBundle() {
  const data = await platformRequest('/me/identities')
  return {
    userId: data?.userId || '',
    competitionSeasons: normalizeAccountCompetitions(data?.competitionSeasons),
    identities: Array.isArray(data?.identities) ? data.identities : [],
    primaryIdentity: data?.primaryIdentity || null,
    preferredIdentityType: data?.preferredIdentityType || null,
    primaryIdentitySource: data?.primaryIdentitySource || 'AUTOMATIC',
    capabilities: data?.capabilities || null
  }
}

export async function updatePrimaryIdentityPreference(identityType) {
  return platformRequest('/me/identity-preference', {
    method: 'PATCH',
    body: { identityType: identityType || null }
  })
}

export async function fetchVerificationRequests() {
  const data = await platformRequest('/me/verification-requests')
  return Array.isArray(data?.requests) ? data.requests : []
}

export async function createVerificationRequest(payload) {
  const data = await platformRequest('/me/verification-requests', {
    method: 'POST',
    body: payload
  })

  return data?.request || null
}

export async function fetchUserFeedback() {
  const data = await platformRequest('/me/feedback')
  return Array.isArray(data?.feedback) ? data.feedback : []
}

export async function createUserFeedback(payload) {
  const data = await platformRequest('/me/feedback', {
    method: 'POST',
    body: payload
  })

  return data?.feedback || null
}
