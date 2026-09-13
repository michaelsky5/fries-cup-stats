import { buildMyMatchesView } from '../my-space/myMatchesModel.js'
import { buildWeeklyResultTasks, mergeAccountTasks } from './accountActivityModel.js'

const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity
const finished = new Set(['COMPLETE', 'LOCKED', 'CANCELLED'])

export function getOverviewTaskAction(task) {
  if (task.requiresSourceResolution === false) return { label: '查看并确认', url: `/me?section=tasks&task=${encodeURIComponent(task.id)}` }
  const labels = { WEEKLY_PREPARATION_CORE: '登记周期核心', WEEKLY_PREPARATION_PARTICIPATION: '确认本周参赛', WEEKLY_PREPARATION_ROSTER: '提交出赛名单', WEEKLY_RESULT_CONFIRMATION: '核对本场赛果', WEEKLY_TEAM_READINESS: '核对并确认准备' }
  return { label: labels[task.taskType] || '进入流程', url: task.resolvedActionUrl || task.actionUrl || '/me?section=tasks' }
}

export function getSpaceOverviewPresentation(context, { taskCount = 0, tasksPending = false, next = null } = {}) {
  const operationalRoles = new Set(['PLAYER', 'MANAGER', 'CAPTAIN', 'COACH', 'REFEREE', 'CASTER'])
  const identities = [context?.primaryIdentityType, ...(context?.identities || []).map(item => item.type || item.identityType)]
  const operational = identities.some(role => operationalRoles.has(String(role || '').toUpperCase())) || Boolean(context?.teamContexts?.length || context?.staffViews?.length)
  const collapseTasks = !tasksPending && taskCount === 0
  return { collapseTasks, followingFirst: collapseTasks && !next && !operational }
}

export function buildSpaceOverview(context, { now = new Date(), sections, weekly, activity } = {}) {
  const overview = context?.overview || {}
  const allowed = id => !sections || sections.some(section => section.id === id)
  const related = buildMyMatchesView(context, { now }).nextMatch
  const teamMatch = related || overview.nextTeamMatch
  const staff = overview.nextStaffAssignment
  const workspace = weekly?.status === 'ready' && weekly.workspace?.season?.id === context?.seasonId ? weekly.workspace : null
  const weeklyRooms = allowed('matches') ? workspace?.rooms || [] : []
  const weeklyTasks = allowed('matches') ? buildWeeklyResultTasks(workspace, { seasonId: context?.seasonId, readOnly: weekly?.readOnly !== false }) : []
  const weeklyCandidates = weeklyRooms.filter(room => room.myTeams?.length && ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'READY'].includes(room.status))
    .map(match => ({ match, isStaff: false, role: '', canEnterRoom: false, actionLabel: '查看周赛比赛', actionUrl: `/me?section=matches&weeklyMatch=${encodeURIComponent(match.id)}` }))
  const candidates = [
    ...weeklyCandidates,
    teamMatch && !weeklyCandidates.some(item => item.match.id === teamMatch.id) && { match: teamMatch, isStaff: false, role: '', canEnterRoom: Boolean(related?.roomAccess?.canEnter && allowed('matches')) },
    staff?.match && { match: staff.match, isStaff: true, role: staff.assignmentType, canEnterRoom: false }
  ].filter(item => item && !finished.has(item.match.status))
  candidates.sort((a, b) => Number(b.match.status === 'IN_PROGRESS') - Number(a.match.status === 'IN_PROGRESS') || time(a.match.scheduledAt) - time(b.match.scheduledAt))
  const accountTasks = allowed('tasks') ? (overview.tasks || []).map(task => ({ status: 'OPEN', ...task })) : []
  const tasks = activity ? activity.taskView.openTasks : mergeAccountTasks(accountTasks, weeklyTasks, { now }).openTasks
  return { next: context?.season?.status === 'ARCHIVED' ? null : candidates[0] || null, tasks, taskCount: activity ? tasks.length : Math.max(tasks.length, allowed('tasks') ? Number(overview.openTaskCount || 0) : 0), allowed }
}
