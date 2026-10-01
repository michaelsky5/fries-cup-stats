import { weeklyResponseAccess, weeklyTeamName } from '../weekly-competition/weeklyMatchRoomModel.js'
import { buildTaskCenterView } from '../tasks/taskNotificationModel.js'
import { buildWeeklyPreparation, isWeeklyPreparationWorkspace } from '../weekly-competition/weeklyPreparationModel.js'
import { hasAccountFeatureAccess } from '../my-space/mySpaceApi.js'

export function getAccountActivityAccess(context, launch) {
  const participant = (context?.identities || []).some(identity => ['MANAGER', 'PLAYER'].includes(String(identity.type || identity.identityType || '').toUpperCase()))
  const canViewWeeklyCompetition = hasAccountFeatureAccess(launch, 'weeklyCompetition') && participant
  const canViewWeeklyMatchRooms = hasAccountFeatureAccess(launch, 'matchRoom') && Boolean(context?.sections?.weeklyRooms || participant)
  const weekly = context?.competitionKind === 'WEEKLY'
  return {
    canViewWeeklyCompetition,
    canViewWeeklyMatchRooms,
    genericTasks: hasAccountFeatureAccess(launch, 'communications'),
    weeklyPreparation: weekly && canViewWeeklyCompetition,
    weeklyRooms: weekly && canViewWeeklyMatchRooms,
    preparationReadOnly: !hasAccountFeatureAccess(launch, 'weeklyCompetition', 'WRITE'),
    roomsReadOnly: !hasAccountFeatureAccess(launch, 'matchRoom', 'WRITE')
  }
}

export function isAccountActivitySource(key, data, { seasonId, userId }) {
  if (key === 'tasks') return Array.isArray(data?.tasks) && data.tasks.every(task => (!task.userId || task.userId === userId) && (!task.seasonId || task.seasonId === seasonId))
  if (key === 'preparation') return isWeeklyPreparationWorkspace(data, seasonId, userId)
  if (key === 'rooms') return data?.season?.id === seasonId && (!data.userId || data.userId === userId) && Array.isArray(data.rooms) && Array.isArray(data.teams)
  return false
}

// Navigation and My Space derive their count from this same permission-aware queue.
export function buildAccountActivity(sources, { seasonId, userId, identityType, preparationReadOnly = true, roomsReadOnly = true, now = Date.now() }) {
  const preparation = buildWeeklyPreparation(sources.preparation?.data || null,
    { seasonId, userId, readOnly: preparationReadOnly || sources.preparation?.status !== 'ready', now })
  const taskView = mergeAccountTasks(sources.tasks?.data?.tasks || [], [
    ...preparation.tasks,
    ...buildWeeklyResultTasks(sources.rooms?.data || null, { seasonId, readOnly: roomsReadOnly || sources.rooms?.status !== 'ready' })
  ], { now, identityType })
  const records = Object.values(sources)
  const status = records.some(source => source.status === 'loading') ? 'loading' : records.some(source => source.status === 'error') ? 'error' : 'ready'
  return { preparation, taskView, status }
}

export function buildWeeklyResultTasks(workspace, { seasonId, readOnly = true } = {}) {
  if (!workspace || !seasonId || workspace.season?.id !== seasonId) return []
  const viewOnly = readOnly || workspace.accessMode !== 'WRITE' || workspace.featureAccess !== 'WRITE' || workspace.season.status === 'ARCHIVED'
  const preparation = viewOnly ? [] : (workspace.rooms || []).filter(room => room.status === 'PENDING').flatMap(room => (room.myTeams || [])
    .filter(team => team.accessMode === 'WRITE' && team.preparation?.canConfirm && !team.preparation.ready)
    .map(team => ({
      id: `weekly-ready:${room.id}:${team.team.id}`, status: 'OPEN', requiresSourceResolution: true,
      taskType: 'WEEKLY_TEAM_READINESS', sourceType: 'WEEKLY_READINESS', sourceId: `${room.id}:${team.team.id}`,
      title: `${weeklyTeamName(team.team)} · 确认赛前准备`, priority: 'HIGH', identityType: 'MANAGER', teamOrganization: team.team,
      body: `${room.cycle?.name || '周赛'} · ${room.displayName || '本场比赛'}。${team.preparation.stale ? '安排或名单有变化，请重新核对并确认。' : '房间安排已发布，请核对房间与出赛队员，再代表本队确认准备状态。'}`,
      actionUrl: `/me?section=matches&weeklyMatch=${encodeURIComponent(room.id)}`
    })))
  const results = (workspace.rooms || []).flatMap(room => (room.myTeams || [])
    .filter(team => team.confirmation?.status === 'PENDING' && weeklyResponseAccess(room, team, { readOnly: viewOnly }).allowed)
    .map(team => ({
      id: `weekly-result:${room.id}:${team.team.id}`, status: 'OPEN', requiresSourceResolution: true,
      taskType: 'WEEKLY_RESULT_CONFIRMATION', sourceType: 'WEEKLY_RESULT', sourceId: `${room.id}:${team.team.id}`,
      title: `核对 ${weeklyTeamName(team.team)} 的本场赛果`, priority: 'HIGH', identityType: 'MANAGER', teamOrganization: team.team,
      body: `${room.cycle?.name || '周赛'} · ${room.displayName || room.week?.label || '赛果确认'}。核对比分后代表本队确认，或提交争议说明。`,
      actionUrl: `/me?section=matches&weeklyMatch=${encodeURIComponent(room.id)}`
    })))
  return [...preparation, ...results]
}

// An action URL alone is not an identity: both teams can respond to the same room.
export function mergeAccountTasks(tasks = [], derived = [], options) {
  const seen = new Set()
  const ids = new Set()
  const merged = [...tasks, ...derived].filter(task => {
    const key = task.sourceType && task.sourceId && task.status === 'OPEN' ? `${task.sourceType}:${task.sourceId}:OPEN` : task.id
    if (!key || seen.has(key) || ids.has(task.id)) return false
    seen.add(key)
    ids.add(task.id)
    return true
  })
  return buildTaskCenterView(merged, options)
}
