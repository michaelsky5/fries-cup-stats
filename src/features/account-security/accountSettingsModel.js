export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  emailEnabled: true,
  operationsEmail: true,
  matchReminderInApp: true,
  matchReminderEmail: true,
  announcementInApp: true,
  announcementEmail: true,
  predictionInApp: true,
  predictionEmail: false
})

const ACTIVE_EMAIL_APPEAL_STATUSES = new Set(['PENDING_EMAIL_VERIFICATION', 'PENDING_REVIEW'])

export function buildAccountSettingsView({
  security = {},
  notificationSettings = {},
  contactPrivacy = {},
  identities = []
} = {}) {
  const user = security?.user || {}
  const sessions = Array.isArray(security?.sessions) ? security.sessions : []
  const otherSessions = sessions.filter(session => !session.current)
  const identityRequests = Array.isArray(security?.identityRequests) ? security.identityRequests : []
  const activeIdentities = (Array.isArray(identities) ? identities : []).filter(identity => (
    identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase())
  ))
  const pendingIdentityRequests = identityRequests.filter(request => request.status === 'PENDING')
  const notificationPreference = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(notificationSettings?.preference || {})
  }
  const privacyGrants = Array.isArray(contactPrivacy?.grants) ? contactPrivacy.grants : []
  const recentAccesses = Array.isArray(contactPrivacy?.recentAccesses) ? contactPrivacy.recentAccesses : []
  const emailAppealActive = ACTIVE_EMAIL_APPEAL_STATUSES.has(security?.emailAppeal?.status)
  const emailChangeActive = Boolean(security?.emailChangeRequest || emailAppealActive)

  let action
  if (!user.emailVerified) {
    action = {
      key: 'verify-email',
      eyebrow: 'ACCOUNT REQUIRED',
      headline: '先完成邮箱验证',
      description: '身份申请、赛事报名和竞猜都依赖已验证邮箱；验证前其余账号设置仍可查看。',
      label: '发送验证邮件',
      target: 'email'
    }
  } else if (emailChangeActive) {
    action = {
      key: 'email-change',
      eyebrow: 'EMAIL CHANGE IN PROGRESS',
      headline: '邮箱换绑尚未完成',
      description: security.emailChangeRequest
        ? '原邮箱和新邮箱都需要确认；两边完成后才会更新登录邮箱。'
        : '新邮箱验证或 System 人工审核仍在进行，请先完成当前申请。',
      label: '查看换绑进度',
      target: 'credentials'
    }
  } else if (otherSessions.length) {
    action = {
      key: 'sessions',
      eyebrow: 'SESSION REVIEW',
      headline: `还有 ${otherSessions.length} 个其他设备在线`,
      description: '如果这些设备都认识，可以继续保留；发现陌生设备时应立即退出并修改密码。',
      label: '检查登录设备',
      target: 'sessions'
    }
  } else if (pendingIdentityRequests.length) {
    action = {
      key: 'identity-pending',
      eyebrow: 'IDENTITY PENDING',
      headline: `${pendingIdentityRequests.length} 项身份申请审核中`,
      description: '基础身份审核通过后长期有效；每届赛事队伍和工作人员关系仍需单独建立。',
      label: '查看身份记录',
      target: 'identity'
    }
  } else {
    action = {
      key: 'ready',
      eyebrow: 'ACCOUNT READY',
      headline: '账号状态正常',
      description: '邮箱、安全设置和隐私记录均可用；建议定期检查设备与通知偏好。',
      label: '检查安全设置',
      target: 'sessions'
    }
  }

  const readiness = [
    { key: 'email', label: '登录邮箱', value: user.emailVerified ? '已验证' : '待验证', complete: Boolean(user.emailVerified), target: 'credentials' },
    { key: 'sessions', label: '在线设备', value: `${sessions.length} 个`, detail: otherSessions.length ? `${otherSessions.length} 个其他设备` : '仅当前设备', complete: sessions.some(session => session.current), target: 'sessions' },
    { key: 'notifications', label: '可选邮件', value: notificationPreference.emailEnabled ? '已开启' : '已关闭', detail: '必达通知不受影响', complete: true, target: 'notifications' },
    { key: 'privacy', label: '隐私授权', value: `${privacyGrants.length} 项`, detail: recentAccesses.length ? `${recentAccesses.length} 条查看记录` : '暂无查看记录', complete: true, target: 'privacy' },
    { key: 'identities', label: '长期身份', value: `${activeIdentities.length} 个`, detail: pendingIdentityRequests.length ? `${pendingIdentityRequests.length} 项审核中` : '无待审申请', complete: true, target: 'identity' }
  ]

  return {
    action,
    readiness,
    notificationPreference,
    counts: {
      sessions: sessions.length,
      otherSessions: otherSessions.length,
      activeIdentities: activeIdentities.length,
      pendingIdentityRequests: pendingIdentityRequests.length,
      privacyGrants: privacyGrants.length,
      recentAccesses: recentAccesses.length
    }
  }
}
