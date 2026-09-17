import { translateUiText as formatUiText } from '../../lib/uiText.js'
export function readPasswordResetLocation(location = {}) {
  const query = new URLSearchParams(location.search || '')
  const hash = String(location.hash || '')
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const present = query.has('passwordResetToken') || fragment.has('passwordResetToken')
  const values = fragment.has('passwordResetToken') ? fragment.getAll('passwordResetToken') : query.getAll('passwordResetToken')
  const candidate = values.length === 1 ? values[0].trim() : ''
  const token = candidate.length >= 20 && candidate.length <= 500 ? candidate : ''
  query.delete('passwordResetToken')
  const cleanHash = fragment.has('passwordResetToken') ? '' : hash
  return { present, token, cleanPath: `${location.pathname || '/'}${query.size ? `?${query}` : ''}${cleanHash}` }
}

export function isPasswordResetComplete(result) {
  return result?.reset === true && result?.loginRequired === true
}

export function passwordRecoveryTitle(stage, locale, failure) {
  const t = (zh, en) => locale === 'en-US' ? en : zh
  if (stage === 'complete') return formatUiText(t('密码已更新', 'Password updated'), locale)
  if (stage === 'sent') return formatUiText(t('找回申请已受理', 'Reset request received'), locale)
  if (stage === 'invalid') return formatUiText(failure?.title || t('重置链接不可用', 'Reset link unavailable'), locale)
  return formatUiText(stage === 'reset' ? t('设置新密码', 'Set a new password') : t('找回账号密码', 'Recover your account'), locale)
}

export function passwordRecoveryFailure(error, locale = 'zh-CN') {
  const t = (zh, en) => locale === 'en-US' ? en : zh
  const code = error?.data?.error
  const expired = code === 'PASSWORD_RESET_TOKEN_EXPIRED'
  const used = code === 'PASSWORD_RESET_TOKEN_USED'
  const invalid = code === 'PASSWORD_RESET_TOKEN_INVALID'
  if (expired || used || invalid) return {
    terminal: true,
    title: expired ? t('重置链接已过期', 'Reset link expired') : used ? t('重置链接已使用', 'Reset link already used') : t('重置链接不可用', 'Reset link unavailable'),
    body: used ? t('如果你已经重置密码，请直接登录；仍无法登录时，可以重新申请链接。', 'If you have already reset your password, sign in. Otherwise, request a new reset link.') : t('请重新申请密码重置邮件，并打开最新的一封。账号和参赛身份不会因此丢失。', 'Request a new reset email and open the latest link. Your account and tournament identities are preserved.')
  }
  if (error?.validation) return { terminal: false, body: error.validation }
  if (error?.status === 429) return { terminal: false, body: t('请求过于频繁，请稍后再试。', 'Too many requests. Wait before trying again.') }
  if (code === 'ACCOUNT_NOT_ACTIVE') return { terminal: true, title: t('账号暂不可用', 'Account unavailable'), body: t('账号状态不允许重置密码，请联系赛事负责人核对账号。', 'This account cannot reset its password in its current state. Contact the organizer.') }
  if (['PASSWORD_INVALID', 'INVALID_INPUT'].includes(code)) return { terminal: false, body: t('请检查输入内容。密码至少 8 位，最多 72 个 UTF-8 字节。', 'Check your input. Use at least 8 characters and no more than 72 UTF-8 bytes.') }
  return { terminal: false, body: t('暂时无法确认处理结果，请稍后重试。如果已提交新密码，可以先返回登录确认。', 'The result could not be confirmed. Retry later, or try signing in if you already submitted a new password.') }
}
