import { safeLobbyReturn } from '../team-lobby/lobbyModel.js'
import { isAccountEntryPath } from './signInRequest.js'

// 票 2.71: after signing in on the fallback page (/account/login), go back to the page the visitor
// came from — any page of this site, not only the lobby. Lobby paths keep the lobby's own filter;
// other paths drop the one-time email tokens, and the entry pages themselves fall back to 我的空间.
const TOKEN_PARAMS = ['passwordResetToken', 'verifyEmail', 'emailChangeToken']

export function safeAccountReturn(value, fallback = '/me') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) <= 32)) return fallback
  const url = new URL(value, 'https://return.invalid')
  if (url.origin !== 'https://return.invalid') return fallback
  if (/^\/lobby(?:\/|$)/.test(url.pathname)) return safeLobbyReturn(value)
  if (isAccountEntryPath(url.pathname)) return fallback
  for (const key of TOKEN_PARAMS) url.searchParams.delete(key)
  const query = url.searchParams.toString()
  const hash = /token/i.test(url.hash) ? '' : url.hash
  return `${url.pathname}${query ? `?${query}` : ''}${hash}`
}
