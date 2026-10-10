import { translateUiText as uiText } from '../../lib/uiText.js'

// Desktop, mobile and recovery destinations share the same names and order.
export const SPACE_SECTION_DEFINITIONS = {
  overview: { id: 'overview', label: '概览', en: 'HOME', english: 'Overview' },
  team: { id: 'team', label: '我的队伍', en: 'TEAM', english: 'My team' },
  matches: { id: 'matches', label: '我的比赛', en: 'MATCHES', english: 'My matches' },
  tasks: { id: 'tasks', label: '待办', en: 'TO DO', english: 'To do' },
  communications: { id: 'communications', label: '消息', en: 'INBOX', english: 'Messages' },
  events: { id: 'events', label: '参赛记录', en: 'RECORDS', english: 'Participation records' },
  stats: { id: 'stats', label: '我的数据', en: 'STATS', english: 'My stats' },
  stream: { id: 'stream', label: '直播展示', en: 'MY STREAM', english: 'Stream display' },
  referee: { id: 'referee', label: '赛管工作台', en: 'REFEREE', english: 'Referee workspace' },
  caster: { id: 'caster', label: '解说工作台', en: 'CASTER', english: 'Caster workspace' },
  following: { id: 'following', label: '我的关注', en: 'FOLLOWING', english: 'Following' },
  security: { id: 'security', label: '账号设置', en: 'ACCOUNT', english: 'Account settings' },
  progress: { id: 'progress', label: '参赛进度', en: 'PROGRESS', english: 'Participation progress' }
}

export const SPACE_PRIMARY_IDS = ['overview', 'team', 'matches', 'tasks', 'communications']
export const SPACE_NAV_GROUPS = [
  ...SPACE_PRIMARY_IDS.slice(0, 3).map(id => ({ ...SPACE_SECTION_DEFINITIONS[id], sectionIds: [id] })),
  { id: 'personal', label: '个人资料与记录', english: 'Profile & records', sectionIds: ['stats', 'events', 'stream'] },
  { id: 'workspace', label: '工作台', english: 'Workspace', sectionIds: ['referee', 'caster'] }
]
export const SPACE_UTILITY_NAV = SPACE_PRIMARY_IDS.slice(3).map(id => ({ ...SPACE_SECTION_DEFINITIONS[id], sectionIds: [id] }))
export const SPACE_MOBILE_MENU_IDS = [...SPACE_PRIMARY_IDS.slice(1), 'progress', 'stats', 'events', 'stream', 'referee', 'caster', 'following', 'security']

export function spaceSectionLabel(id, locale) {
  const item = SPACE_SECTION_DEFINITIONS[id] || SPACE_SECTION_DEFINITIONS.overview
  return locale === 'en-US' ? item.english : uiText(item.label, locale)
}

export function resolveSpaceEntry({ search = '', sections = [], weekly = false, staffRoles = [] }) {
  const params = new URLSearchParams(search)
  const requested = params.get('section') || 'overview'
  if (sections.some(section => section.id === requested)) return { section: requested, replacement: '', notice: '' }
  const staffEntry = weekly && ['referee', 'caster'].includes(requested) &&
    staffRoles.includes(requested === 'referee' ? 'REFEREE' : 'CASTER') && sections.some(section => section.id === 'matches')
  const recordsEntry = weekly && requested === 'events'
  const section = staffEntry ? 'matches' : 'overview'
  // Old form/task parameters must not select a different workflow on recovery.
  for (const key of ['cycle', 'entry', 'week', 'step', 'manage', 'weeklyMatch', 'task', 'view', 'journey', 'progress']) params.delete(key)
  params.set('section', section)
  if (recordsEntry) params.set('progress', 'history')
  const notice = staffEntry ? 'STAFF_MATCHES' : recordsEntry ? 'PARTICIPATION_RECORDS'
    : Object.hasOwn(SPACE_SECTION_DEFINITIONS, requested) ? 'UNAVAILABLE_SECTION' : 'UNKNOWN_SECTION'
  return { section, replacement: `/me?${params}`, notice }
}

// Registration is an account workflow, not another required step for linked
// players, coaches or staff. Existing registration records remain reachable.
export function registrationEntryPolicy(context, competition, selectedTeamId = '') {
  const teams = competition?.teams || context?.teamContexts || []
  const selected = selectedTeamId ? teams.find(team => (team.id || team.seasonTeam?.id) === selectedTeamId) : null
  const scopedTeams = selected ? [selected] : teams
  const roles = new Set((context?.identities || []).map(item => item.type || item.identityType))
  const records = competition?.registrations || []
  const managesTeam = scopedTeams.some(team => team.capabilities?.canManageTeam || ['MANAGER', 'LEADER'].includes(team.role) || team.roles?.some(role => ['MANAGER', 'LEADER'].includes(role)))
  const memberView = Boolean(selected && !managesTeam)
  const newManager = !teams.length && roles.has('MANAGER')
  const participant = teams.length > 0 || ['PLAYER', 'COACH', 'MANAGER'].some(role => roles.has(role))
  const staff = (competition?.staffRoles || []).length > 0 || ['REFEREE', 'CASTER'].some(role => roles.has(role))
  const hasRecords = !memberView && records.some(record => record.status !== 'WITHDRAWN')
  const hasDraft = !memberView && records.some(record => ['DRAFT', 'RETURNED', 'SUBMITTED'].includes(record.status))
  return { visible: hasRecords || managesTeam || newManager || (!participant && !staff), onHome: hasDraft || newManager || (!participant && !staff), allowCreate: managesTeam || newManager || (!participant && !staff) }
}
