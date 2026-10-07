import { fetchAccountLaunchStatus, fetchMySpaceContext } from './mySpaceApi.js'
import { fetchTaskCenter } from '../tasks/taskNotificationApi.js'
import { fetchMyWeeklyCompetition, fetchMyOwnershipTransfers } from '../weekly-competition/weeklyCompetitionApi.js'
import { fetchMyWeeklyMatchRooms } from '../weekly-competition/weeklyMatchRoomsApi.js'
import { buildAccountActivity, getAccountActivityAccess, isAccountActivitySource } from '../account-ui/accountActivityModel.js'

const LOADERS = { launch: fetchAccountLaunchStatus, context: fetchMySpaceContext, tasks: fetchTaskCenter, preparation: fetchMyWeeklyCompetition, rooms: fetchMyWeeklyMatchRooms, ownership: fetchMyOwnershipTransfers }

export async function fetchAccountAttentionContext(seasonId, userId, { signal, now = Date.now(), loaders = LOADERS } = {}) {
  if (!seasonId || !userId) return null
  const launch = await loaders.launch(seasonId, { signal })
  if (launch?.seasonId !== seasonId) throw new Error('参赛权限与当前赛事不一致。')
  if (!launch.allowed) return null
  const context = await loaders.context(seasonId, { signal })
  if (context?.seasonId !== seasonId || context?.user?.id !== userId) throw new Error('返回的账号资料与当前账号或赛事不一致。')
  const access = getAccountActivityAccess(context, launch)
  const keys = [access.genericTasks && 'tasks', access.weeklyPreparation && 'preparation', access.weeklyRooms && 'rooms', access.ownershipTransfers && 'ownership'].filter(Boolean)
  const results = await Promise.allSettled(keys.map(async key => {
    const data = await loaders[key](seasonId, { signal })
    if (!isAccountActivitySource(key, data, { seasonId, userId })) throw new Error('待办资料不完整或与当前账号、赛事不一致。')
    return data
  }))
  if (signal?.aborted) throw signal.reason
  const sources = Object.fromEntries(keys.map((key, index) => [key, results[index].status === 'fulfilled'
    ? { status: 'ready', data: results[index].value } : { status: 'error' }]))
  const activity = buildAccountActivity(sources, { ...access, seasonId, userId, identityType: context.primaryIdentityType, now })
  return { overview: { ...context.overview, openTaskCount: activity.taskView.openTasks.length, taskSyncStatus: activity.status } }
}
