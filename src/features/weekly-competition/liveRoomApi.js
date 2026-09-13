import { platformRequest } from '../auth/platformApi.js'
export const liveRoomPath = matchId => `/weekly-live-rooms/${encodeURIComponent(matchId)}`
export const fetchLiveRoom = (matchId, options) => platformRequest(liveRoomPath(matchId), options)
export const liveRoomWrite = (matchId, path, body, method = 'POST') => platformRequest(liveRoomPath(matchId) + path, { method, body })
export const fetchRoomMessages = (matchId, channel, before, options) => platformRequest(`${liveRoomPath(matchId)}/messages?${new URLSearchParams({ channel, ...(before ? { before } : {}) })}`, options)
export const coordinationWrite = (path, body, staff = false, method = 'POST') => platformRequest(`${staff ? '' : '/me'}/weekly-coordination${path}`, { method, body })

export function roomReadFailure(error, previous) {
  const denied = [401, 403, 404].includes(error?.status)
  return { data: denied ? null : previous, error: error?.message || '同步中断，请重新同步后继续操作。' }
}
