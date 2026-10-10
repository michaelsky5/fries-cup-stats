const labels = { PENDING: '待教练本人确认', ACCEPTED: '邀请已接受', REVOKED: '邀请已撤销', EXPIRED: '邀请已过期' }

export function coachInvitationPresentation(invitation, now = Date.now()) {
  const status = invitation.status === 'PENDING' && invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Number(now)
    ? 'EXPIRED' : invitation.status
  const currentBinding = status === 'ACCEPTED' && invitation.isCurrentBinding === true
  const [timingLabel, field] = {
    PENDING: ['邀请确认截止时间：', 'expiresAt'],
    ACCEPTED: [currentBinding ? '绑定确认时间：' : '邀请确认时间：', 'acceptedAt'],
    REVOKED: ['邀请撤销时间：', 'revokedAt'],
    EXPIRED: ['邀请过期时间：', 'expiresAt']
  }[status] || ['原邀请截止时间：', 'expiresAt']
  const value = invitation[field]
  return {
    status, currentBinding, label: currentBinding ? '已确认绑定' : labels[status] || status,
    timingLabel, timestamp: value && Number.isFinite(new Date(value).getTime()) ? value : null
  }
}

export function partitionCoachInvitations(invitations, now = Date.now()) {
  const records = invitations.map(invitation => ({ invitation, presentation: coachInvitationPresentation(invitation, now) }))
  const latestBindings = new Map()
  const bindingTime = ({ invitation }) => new Date(invitation.acceptedAt || invitation.createdAt).getTime() || 0
  for (const record of records) {
    if (!record.presentation.currentBinding) continue
    const key = record.invitation.target.id
    const previous = latestBindings.get(key)
    if (!previous || bindingTime(record) > bindingTime(previous)) latestBindings.set(key, record)
  }
  const current = [], history = []
  for (const record of records) {
    if (record.presentation.status === 'PENDING' || latestBindings.get(record.invitation.target.id) === record) current.push(record)
    else history.push({ ...record, presentation: coachInvitationPresentation({ ...record.invitation, isCurrentBinding: false }, now) })
  }
  return { current, history }
}
