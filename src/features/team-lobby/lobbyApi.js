import { platformRequest } from '../auth/platformApi.js'

export const getLobbyConfig = options => platformRequest('/lobby/config', options)
export const getMyLobby = options => platformRequest('/lobby/me', options)
export const readNotice = id => platformRequest(`/lobby/me/notices/${encodeURIComponent(id)}/read`, { method: 'POST', body: {} })
export const getLobbyCard = (id, options) => platformRequest(`/lobby/cards/${encodeURIComponent(id)}`, options)
export function getLobbyCards({ type = 'teams', role = 'all', page = 1 }, options) {
  const query = new URLSearchParams({ kind: type === 'people' ? 'PERSON' : 'TEAM', page: String(page) })
  if (role !== 'all') query.set('role', role)
  return platformRequest(`/lobby/cards?${query}`, options)
}
export const saveCard = body => platformRequest('/lobby/me/card', { method: 'PUT', body })
export const changeCard = (id, body) => platformRequest(`/lobby/me/cards/${encodeURIComponent(id)}/action`, { method: 'POST', body })
export const saveFormation = (body, id) => platformRequest(`/lobby/me/formations${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body })
export const withdrawFormation = item => platformRequest(`/lobby/me/formations/${encodeURIComponent(item.id)}/withdraw`, { method: 'POST', body: { revision: item.revision } })
export const createContact = body => platformRequest('/lobby/contacts', { method: 'POST', body })
export const listContacts = ({ direction = 'all', page = 1 } = {}, options) => platformRequest(`/lobby/contacts?direction=${direction}&page=${page}&pageSize=20`, options)
export const getContact = (id, options) => platformRequest(`/lobby/contacts/${encodeURIComponent(id)}`, options)
export const changeContact = (id, body) => platformRequest(`/lobby/contacts/${encodeURIComponent(id)}/action`, { method: 'POST', body })
export const readContactQq = id => platformRequest(`/lobby/contacts/${encodeURIComponent(id)}/qq`, { method: 'POST', body: {} })
