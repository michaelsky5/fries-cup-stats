import { platformRequest } from '../auth/platformApi.js'
export const liveRoomPath = matchId => `/weekly-live-rooms/${encodeURIComponent(matchId)}`
export const fetchLiveRoom = (matchId, options) => platformRequest(liveRoomPath(matchId), options)
export const liveRoomWrite = (matchId, path, body, method = 'POST') => platformRequest(liveRoomPath(matchId) + path, { method, body })
export const fetchRoomMessages = (matchId, channel, before, options) => platformRequest(`${liveRoomPath(matchId)}/messages?${new URLSearchParams({ channel, ...(before ? { before } : {}) })}`, options)
export const coordinationWrite = (path, body, staff = false, method = 'POST') => platformRequest(`${staff ? '' : '/me'}/weekly-coordination${path}`, { method, body })

export function roomReadFailure(error, previous) {
  const denied = [401, 403, 404].includes(error?.status)
  const message = error?.status === 429 ? '服务器请求较多，正在等待重试。' : error?.status >= 500 ? '服务暂时不可用，正在自动重连。' : error?.data?.error === 'REQUEST_TIMEOUT' ? '同步超时，正在自动重连。' : error instanceof TypeError ? '连接中断，正在自动重连。' : error?.message || '连接中断，正在自动重连。'
  return { data: denied ? null : previous, error: message }
}
