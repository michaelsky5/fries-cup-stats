import { getRoomStageIndex } from '../weekly-competition/weeklyRoomFlow.js'
import { withLocale } from '../../lib/locales.js'

export const GUIDE_PATH = '/guides/weekly-room'
export const GUIDE_VERSION = '2026-09-26'
export const ROOM_PRACTICE_CASES = {
  disabled: { role: 'member', scene: 'live' },
  handover: { role: 'manager', scene: 'checkin' },
  substitution: { role: 'representative', scene: 'lineup' },
  disconnect: { role: 'representative', scene: 'live' },
  'result-error': { role: 'referee', scene: 'review' },
  dispute: { role: 'representative', scene: 'result' },
  broadcast: { role: 'caster', scene: 'live' },
}
export const GUIDE_ROLES = ['manager', 'representative', 'member', 'referee', 'caster', 'admin']
export const GUIDE_STEPS = ['entry', 'opening', 'map', 'lineup', 'ban', 'ready', 'live', 'map-result', 'result']
export const GUIDE_SCENARIOS = ['access', 'disabled', 'handover', 'substitution', 'opening-error', 'disconnect', 'result-error', 'rr5', 'forfeit', 'dispute', 'sync', 'broadcast']
export const ROLE_LESSONS = {
  manager: ['entry', 'lineup', 'result'], representative: GUIDE_STEPS,
  member: ['entry', 'lineup', 'live', 'result'], referee: GUIDE_STEPS,
  caster: ['entry', 'map', 'lineup', 'ban', 'live', 'result'], admin: GUIDE_STEPS,
}
const STAGE_STEPS = ['opening', 'map', 'lineup', 'ban', 'live', 'map-result', 'result']
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : ''

// These are reading preferences only. Never use guide query parameters for access.
export function readGuideContext(params) {
  return {
    role: GUIDE_ROLES.includes(params.get('role')) ? params.get('role') : 'representative',
    step: GUIDE_STEPS.includes(params.get('step')) ? params.get('step') : 'entry',
    scenario: GUIDE_SCENARIOS.includes(params.get('scenario')) ? params.get('scenario') : '',
    mode: params.get('mode') === 'captains' ? 'captains' : 'referee',
    match: id(params.get('match')), season: id(params.get('season')),
  }
}

export function guideContextForRoom(data) {
  const access = data?.access || {}
  const role = access.administrator ? 'admin' : access.staff ? 'referee'
    : access.representativeTeams?.length ? 'representative'
      : data?.representatives?.sides?.some(side => side.canAssign) || /队长|经理/.test(data?.actor?.label || '') ? 'manager'
        : access.production ? 'caster' : 'member'
  return { role, step: data?.preparation && data?.maps ? STAGE_STEPS[getRoomStageIndex(data)] : 'entry',
    mode: access.operatorMode === 'TEAM_CAPTAINS' ? 'captains' : 'referee', match: data?.match?.id, season: data?.match?.seasonId }
}

export function roomGuideUrl(context = {}, locale = 'zh-CN', { share = false } = {}) {
  const query = new URLSearchParams()
  const safe = readGuideContext(new URLSearchParams(Object.entries(context).filter(([, value]) => typeof value === 'string')))
  for (const key of ['role', 'step', 'mode', 'scenario']) if (safe[key]) query.set(key, safe[key])
  if (!share) for (const key of ['match', 'season']) if (safe[key]) query.set(key, safe[key])
  return withLocale(`${GUIDE_PATH}?${query}`, locale)
}

export function guideReturnPath(context, locale) {
  const match = id(context.match), season = id(context.season)
  return withLocale(match ? `/me/matches/${encodeURIComponent(match)}/room` : `/me?section=matches${season ? `&competition=${encodeURIComponent(season)}` : ''}`, locale)
}

export function guideLessons(role, step) {
  const lessons = ROLE_LESSONS[role] || ROLE_LESSONS.representative
  return GUIDE_STEPS.filter(item => lessons.includes(item) || item === step)
}

export function guidePracticeUrl(base = 'https://admin.fries-cup.com') {
  try {
    const url = new URL(base)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return ''
    return new URL('/tournaments?view=coordination#weekly-training', url.origin).href
  } catch { return '' }
}

export function guideRoleForMatch(room) {
  const label = room?.roleLabel || ''
  return /管理员/.test(label) ? 'admin' : /赛管|裁判/.test(label) ? 'referee'
    : /解说/.test(label) ? 'caster' : /队长|经理/.test(label) ? 'manager' : 'member'
}
