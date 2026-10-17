export function validateRecoveryPassword(password, confirmation) {
  if (password.length < 8) return '新密码至少需要 8 位。'
  if (new TextEncoder().encode(password).length > 72) return '新密码不能超过 72 个 UTF-8 字节。'
  if (password !== confirmation) return '两次输入的新密码不一致。'
  return ''
}

export function validateRecoveryApplication(form) {
  if (form.currentEmail.trim().toLowerCase() === form.newEmail.trim().toLowerCase()) return '请提供一个与原登录邮箱不同、仍可收信的新邮箱。'
  if (form.reason.trim().length < 10) return '请至少用 10 个字说明无法登录的原因。'
  if (form.evidence.trim().length < 20) return '请至少填写 20 个字的可核对线索，方便平台核验账号归属。'
  return ''
}

// A successful credential write remains successful when its expected session
// revocation returns 401, or when the follow-up session read is unavailable.
export async function synchronizeAfterCredentialChange(refreshSession) {
  try { await refreshSession(); return '' }
  catch (error) { return error?.status === 401 ? '' : '账号变更已完成，但当前登录状态暂未同步。请刷新页面后使用新邮箱登录。' }
}

export async function readRecoveryProgress(tokens, request, verified) {
  if (tokens.get('verify') && !verified.current) {
    try {
      await request('/auth/account-recovery/verify', { method: 'POST', body: { token: tokens.get('verify') } })
      verified.current = true
    } catch (error) {
      if (!tokens.get('request') || !['RECOVERY_TOKEN_INVALID', 'RECOVERY_TOKEN_EXPIRED'].includes(error?.data?.error)) throw error
    }
  }
  if (!tokens.get('request')) throw new Error('申请链接不完整，请重新打开验证邮件。')
  const data = await request('/auth/account-recovery/status', { method: 'POST', body: { token: tokens.get('request') } })
  if (data.request.status !== 'VERIFY_EMAIL') verified.current = true
  return data
}
