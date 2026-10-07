const TASK_STATUSES = { PENDING: 'OPEN', SUBMITTED: 'COMPLETED', APPROVED: 'COMPLETED', REJECTED: 'COMPLETED', CANCELLED: 'CANCELLED', DECLINED: 'CANCELLED', EXPIRED: 'EXPIRED' }

export function isOwnershipTransferWorkspace(workspace, seasonId, userId) {
  return Boolean(userId && seasonId && workspace?.userId === userId && typeof workspace.canWrite === 'boolean'
    && Array.isArray(workspace.teams) && Array.isArray(workspace.transfers)
    && workspace.transfers.every(row => typeof row?.id === 'string' && row.id && row.seasonId === seasonId
      && Number.isFinite(Date.parse(row.expiresAt)) && [row.fromUserId, row.toUserId].includes(userId) && TASK_STATUSES[row.status]))
}

export function ownershipTransferDestination(seasonId, transferId) {
  const params = new URLSearchParams({ ownershipTransfer: transferId })
  return `/participate/${encodeURIComponent(seasonId)}?${params}#weekly-ownership-transfers`
}

// Read the source record so existing requests and later closures need no backfill.
export function buildOwnershipTransferTasks(workspace, { seasonId, userId, identityType = 'VIEWER', now = Date.now() } = {}) {
  if (!isOwnershipTransferWorkspace(workspace, seasonId, userId)) return []
  return workspace.transfers.filter(row => row.toUserId === userId).map(row => {
    const expired = row.status === 'PENDING' && Date.parse(row.expiresAt) <= Number(now)
    const sourceStatus = expired ? 'EXPIRED' : row.status
    const teamName = row.team?.name || '本队'
    const bodies = {
      PENDING: `${row.fromName} 申请将 ${teamName} 的负责人权限交接给你。请核对交接范围并确认接任。`,
      SUBMITTED: '你已确认接任，申请正在等待管理员审核。',
      APPROVED: '交接已通过审核，队伍管理权限已移交。',
      REJECTED: '你已确认接任，但交接申请未通过管理员审核。',
      CANCELLED: '原负责人已撤回交接，无需继续确认。',
      DECLINED: '你已拒绝接任，队伍归属未改变。',
      EXPIRED: '交接申请已过期，无需继续确认。'
    }
    return {
      id: `weekly-ownership:${row.id}`, userId, seasonId, status: TASK_STATUSES[sourceStatus],
      taskType: 'WEEKLY_OWNERSHIP_TRANSFER', sourceType: 'WEEKLY_OWNERSHIP_TRANSFER', sourceId: row.id,
      title: `${teamName} · 确认接任负责人`, body: bodies[sourceStatus], identityType,
      priority: 'HIGH', requiresSourceResolution: true, teamOrganization: row.team,
      dueAt: row.expiresAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
      completedAt: sourceStatus === 'PENDING' ? null : row.confirmedAt || row.updatedAt,
      actionUrl: ownershipTransferDestination(seasonId, row.id)
    }
  })
}
