import { platformRequest } from './platformApi.js'

export async function previewWeeklyAccountInvitation(token, options = {}) {
  const data = await platformRequest('/auth/weekly-account-links/preview', {
    ...options,
    method: 'POST',
    body: { token }
  })
  return data?.invitation || null
}

export function acceptWeeklyAccountInvitation({ token, password }, options = {}) {
  return platformRequest('/auth/weekly-account-links/accept', {
    ...options,
    method: 'POST',
    body: { token, password }
  })
}

