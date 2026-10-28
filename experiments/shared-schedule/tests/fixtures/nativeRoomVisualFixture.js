import recorded from './nativeRoomSnapshots.json'
const scenes = new Map(recorded.snapshots.map(item => [item.name, item.room]))
export const roomVisualActor = scenes.get('preparation').actor.id
const labels = { preparation: '赛前准备', rps: '石头剪刀布', 'map-1': '地图选择', 'lineup-1': '首发确认',
  'ban-order-1': '禁用顺序', 'ban-1-0': '英雄禁用', 'live-1': '比赛进行', paused: '暂停恢复', 'series-complete': '整场结束' }
export function roomVisualResponse(route, method) {
  if (route !== '/rooms' && !route.startsWith('/weekly-live-rooms/')) return null
  const hash = globalThis.location?.hash || '', query = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '')
  const visualId = route.startsWith('/weekly-live-rooms/VISUAL-') ? route.slice('/weekly-live-rooms/VISUAL-'.length) : ''
  const scene = visualId === 'lineup-long' ? 'lineup-1' : visualId || query.get('scene')
  const source = scenes.get(scene) || scenes.get('preparation')
  const room = JSON.parse(JSON.stringify(source)), now = Date.now(), anchor = Date.parse(room.phaseClock?.serverNow)
  if (visualId) room.match.id = 'VISUAL-' + visualId
  if (visualId === 'lineup-long') {
    room.match.teamA.shortName = '用于窄屏验收的超长虚构队伍名Alpha'
    room.rosters.find(item => item.teamId === room.match.teamA.id).members[0].name = '超长虚构选手昵称Alpha0123456789'
  }
  room.syncedAt = new Date(now).toISOString()
  if (room.phaseClock) {
    room.phaseClock.serverNow = new Date(now).toISOString()
    for (const [record, key] of [[room.phaseClock, 'deadlineAt'], [room.phaseClock.submissionGrace, 'normalDeadlineAt']]) {
      if (record?.[key]) record[key] = new Date(now + Date.parse(record[key]) - anchor).toISOString()
    }
  }
  if (route === '/rooms') return { contract: 'MINI_ROOMS_V1', seasonId: 'FCW26', rooms: [...Object.entries(labels), ['lineup-long', '长名字首发']].map(([key, label]) => ({
    ...room.match, id: 'VISUAL-' + key, name: '合成场景 · ' + label, roleLabel: room.actor.label
  })) }
  if (method && method !== 'GET') return { saved: true }
  return room
}
