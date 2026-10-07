const statuses = { PENDING: '等待经理审核', RETURNED: '需要补充资料', ACCEPTED: '已进入报名名单', REJECTED: '申请未通过', WITHDRAWN: '申请已撤回' }
const additionStatuses = { SUBMITTED: '等待管理员审核增员', APPROVED: '已加入队内名单', REJECTED: '增员申请未通过', CANCELLED: '增员申请已取消' }

export function joinApplicationStatusLabel(application) {
  return application.addition ? additionStatuses[application.addition.status] || application.addition.status : statuses[application.status] || application.status
}

export function canEditJoinApplication(application) {
  return !application || ['PENDING', 'RETURNED', 'REJECTED', 'WITHDRAWN'].includes(application.status)
    || (application.status === 'ACCEPTED' && ['REJECTED', 'CANCELLED'].includes(application.addition?.status))
}

export function canWithdrawJoinApplication(application) {
  return Boolean(application && (['PENDING', 'RETURNED'].includes(application.status)
    || (application.status === 'ACCEPTED' && application.addition?.status === 'SUBMITTED')))
}
