import { createNativeAccountClient } from '../../src/account/nativeAccountClient.js'

export const accountPreviewLabel = '本机模拟预览 · 账号与赛事均为虚构'
const stored = new Map(), now = Date.now()
let linked = false, active = false
const user = { id: 'synthetic-preview-user', displayName: '示例队长', emailVerified: true, effectiveMode: 'VIEWER' }
const week = {
  id: 'preview-week', label: '第 1 周', status: 'CONFIRMATION_OPEN', weekNumber: 1,
  confirmationOpensAt: new Date(now - 86400000).toISOString(), confirmationDeadlineAt: new Date(now + 86400000).toISOString(),
  availabilitySlots: [{ id: 'sat-19', label: '周六 19:00–21:00' }, { id: 'sun-19', label: '周日 19:00–21:00' }]
}
const players = Array.from({ length: 7 }, (_, index) => ({
  id: 'preview-player-' + index, displayName: index === 0 ? '示例选手名字比较长的昵称' : '示例选手 ' + (index + 1),
  battleTag: 'SyntheticPlayer' + index + '#12345', role: ['TANK', 'DPS', 'DPS', 'SUP', 'SUP', 'DPS', 'SUP'][index], status: 'ACTIVE'
}))
const team = { id: 'preview-team', name: '用于核对手机长队名展示的虚构薯条联队', shortName: '示例队伍' }
const participation = { id: null, status: 'PENDING', revision: 0, rosters: [], availability: { status: 'UNSET', slotIds: [], timeZone: 'Asia/Shanghai' }, availabilityNote: '' }
const entry = { id: 'preview-entry', team, seasonTeamId: team.id, accessMode: 'WRITE', coreSelections: [], players, weeks: [{ week, rules: { rosterMin: 5, rosterMax: 7, rosterContinuityMode: 'PREVIOUS_APPEARANCE' }, continuity: { required: 0, playerIds: [], status: 'FIRST_APPEARANCE' }, participation }] }
const session = () => ({ status: 'AUTHENTICATED', user, accessToken: 'synthetic.preview.token000000000000000000000', session: { id: 'preview-session', expiresAt: new Date(now + 3600000).toISOString() } })
const response = (data, statusCode = 200) => ({ data: data === null ? null : JSON.parse(JSON.stringify(data)), statusCode })

export const nativeAccount = createNativeAccountClient({
  storage: { get: key => stored.get(key), set: (key, value) => stored.set(key, value), remove: key => stored.delete(key) },
  login: async () => ({ code: 'synthetic-preview-code' }),
  request: async options => {
    const url = new URL(options.url), route = url.pathname.replace('/api/mini/v1', '')
    if (route === '/capabilities') return response({ capabilities: { wechatLogin: true, participationRead: true, weeklyConfirmation: true, lineup: true, matchRoom: false } })
    if (route === '/auth/wechat/login') {
      if (linked) { active = true; return response(session()) }
      return response({ status: 'BINDING_REQUIRED', bindingTicket: 'synthetic-preview-binding-ticket', expiresAt: new Date(Date.now() + 300000).toISOString() })
    }
    if (route === '/auth/wechat/bind') {
      if (options.data.email !== 'demo@example.test' || options.data.password !== 'NativeDemo123!') return response({ error: 'INVALID_CREDENTIALS' }, 401)
      linked = active = true
      return response(session(), 201)
    }
    if (!active) return response({ error: 'UNAUTHORIZED' }, 401)
    if (route === '/me') return response({ user, session: session().session })
    if (route === '/auth/logout') { active = false; return response(null, 204) }
    if (route === '/participation') return response({ contract: 'MINI_PARTICIPATION_V1', season: { id: url.searchParams.get('seasonId'), name: '模拟赛事', status: 'ACTIVE' }, teams: [{ team, roleLabels: ['队伍负责人'] }], tasks: [{ id: 'task-one', title: '请核对本周参赛准备', handling: 'WEB_WORKFLOW' }], openTaskCount: 1 })
    if (route === '/weekly/workspace') return response({
      userId: user.id, season: { id: url.searchParams.get('seasonId'), name: '模拟赛事', status: 'ACTIVE' }, accessMode: 'WRITE',
      teams: [{ team, accessMode: 'WRITE' }], cycles: [{ id: 'preview-cycle', name: '示例周期', rules: {}, entries: [entry] }]
    })
    if (route === '/weekly/weeks/preview-week/participation' && options.method === 'PUT') {
      if (options.data.revision !== participation.revision) return response({ error: 'WEEKLY_REVISION_CONFLICT' }, 409)
      Object.assign(participation, { ...options.data, id: 'preview-participation', revision: participation.revision + 1 })
      return response({ participation })
    }
    if (route === '/weekly/participations/preview-participation/roster' && options.method === 'PUT') {
      const previous = participation.rosters[0], body = options.data
      if (body.revision !== (previous?.revision || 0)) return response({ error: 'WEEKLY_REVISION_CONFLICT' }, 409)
      const roster = { id: 'preview-roster', revision: (previous?.revision || 0) + 1, status: body.status,
        members: body.members.map(member => ({ ...member, player: players.find(player => player.id === member.playerId) })) }
      participation.rosters = [roster]
      if (body.availabilityUpdate) Object.assign(participation, { ...body.availabilityUpdate, revision: participation.revision + 1 })
      // A deliberate local fixture proves that an interrupted response is not retried.
      if (body.availabilityUpdate?.availabilityNote?.includes('模拟断网')) return response({ error: 'AUTH_SERVICE_UNAVAILABLE' }, 503)
      return response({ roster })
    }
    return response({ error: 'UNKNOWN_SYNTHETIC_ROUTE' }, 404)
  }
})
