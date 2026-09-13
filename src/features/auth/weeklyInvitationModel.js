export function readWeeklyInvitationLocation(location = {}) {
  const query = new URLSearchParams(location.search || '')
  const fragment = new URLSearchParams(String(location.hash || '').replace(/^#/, ''))
  const values = fragment.has('token') ? fragment.getAll('token') : query.getAll('token')
  const rawToken = values.length === 1 ? values[0].trim() : ''
  const token = rawToken.length >= 20 && rawToken.length <= 500 ? rawToken : ''
  query.delete('token')
  const search = query.toString()
  return { token, cleanPath: `${location.pathname || '/activate-weekly'}${search ? `?${search}` : ''}` }
}

export function isPendingWeeklyInvitation(invitation) {
  return Boolean(invitation?.id && invitation?.user?.id && invitation?.team?.id && invitation?.team?.seasonId &&
    invitation.status === 'PENDING' && ['SET', 'CONFIRM'].includes(invitation.passwordMode) &&
    ['MANAGER', 'PLAYER'].includes(invitation.identityType))
}

export function validateWeeklyInvitationPassword({ password = '', confirmation = '', passwordMode }, locale = 'zh-CN') {
  const en = locale === 'en-US'
  if (password.length < 8) return en ? 'Use at least 8 characters.' : '密码至少需要 8 位。'
  if (new TextEncoder().encode(password).length > 72) return en ? 'Use no more than 72 UTF-8 bytes. Some characters use more than one byte.' : '密码不能超过 72 个 UTF-8 字节；中文等字符会占用多个字节。'
  if (passwordMode === 'SET' && password !== confirmation) return en ? 'Passwords do not match.' : '两次输入的密码不一致。'
  return ''
}

export function weeklyInvitationErrorMessage(error, locale = 'zh-CN') {
  if (locale === 'en-US') {
    const messages = {
      INVALID_PASSWORD: 'The current password is incorrect. Try again.',
      INVALID_CREDENTIALS: 'Use the invited email and its password to sign in.',
      ACCOUNT_LINK_INVITATION_EXPIRED: 'This invitation has expired. Ask the weekly organizer to issue a new link.',
      ACCOUNT_LINK_INVITATION_REVOKED: 'This invitation was revoked. Ask the weekly organizer to check your invitation.',
      ACCOUNT_LINK_INVITATION_ACCEPTED: 'This invitation has already been used. Sign in with the invited account to continue.',
      ACCOUNT_LINK_INVITATION_INVALID: 'This invitation is invalid. Open the complete link provided by the organizer.',
      ACCOUNT_LINK_INVITATION_CHANGED: 'The invitation has changed. Reopen the latest link from the organizer.',
      IDENTITY_STATUS_RESTRICTED: 'This identity is inactive. Ask the organizer to check its status.',
      VIEWER_ACCOUNT_REQUIRED: 'This account is no longer eligible to claim the invitation. Contact the organizer.',
      PLAYER_IDENTITY_ALREADY_BOUND: 'This account is already linked to another player. The existing identity cannot be replaced.',
      BATTLETAG_ALREADY_BOUND: 'This player has already been claimed by another account. Contact the organizer.',
      TEAM_CAPTAIN_ALREADY_BOUND: 'This team representative has already been claimed. Contact the organizer.'
    }
    if (messages[error?.data?.error]) return messages[error.data.error]
    if (error?.status === 429) return 'Too many requests. Please wait before trying again.'
    if (error?.status === 400) return 'Check the invitation and password, then try again.'
    return 'The invitation status could not be confirmed. Retry, or reopen the original invitation if you already submitted it.'
  }
  const messages = {
    INVALID_PASSWORD: '现有账号密码不正确，请重试。',
    INVALID_CREDENTIALS: '邮箱或密码不正确，请使用受邀邮箱登录。',
    ACCOUNT_LINK_INVITATION_EXPIRED: '邀请已经过期，请联系周赛管理员重新生成。',
    ACCOUNT_LINK_INVITATION_REVOKED: '邀请已被撤销，请联系周赛管理员。',
    ACCOUNT_LINK_INVITATION_ACCEPTED: '这份邀请已经使用过。已认领的账号无需再次绑定。',
    ACCOUNT_LINK_INVITATION_INVALID: '邀请链接无效，请联系周赛管理员重新生成。',
    ACCOUNT_LINK_INVITATION_CHANGED: '邀请状态刚刚发生变化，请重新打开管理员提供的链接核对。',
    IDENTITY_STATUS_RESTRICTED: '对应身份已被停用，请联系全局管理员处理。',
    VIEWER_ACCOUNT_REQUIRED: '受邀账号已停用或不再符合认领条件，请联系管理员。',
    PLAYER_IDENTITY_ALREADY_BOUND: '该账号已绑定其他选手，不能覆盖原身份。',
    BATTLETAG_ALREADY_BOUND: '该选手已被其他账号认领，请联系管理员核对。',
    TEAM_CAPTAIN_ALREADY_BOUND: '该负责人已被其他账号认领，请联系管理员核对。'
  }
  if (messages[error?.data?.error]) return messages[error.data.error]
  if (error?.status === 429) return '操作过于频繁，请稍后重试。'
  if (error?.status === 400) return '邀请或密码不符合要求，请检查后重试。'
  return '暂时无法确认邀请状态。请重试；若已提交过认领，可重新打开原链接核对，不要另建账号。'
}

// Terminal links need a new invitation or sign-in, not another identical request.
export function weeklyInvitationFailureKind(error, hasToken = true) {
  if (!hasToken) return 'missing'
  const code = error?.data?.error
  if (code === 'ACCOUNT_LINK_INVITATION_ACCEPTED') return 'used'
  if (code === 'ACCOUNT_LINK_INVITATION_EXPIRED') return 'expired'
  if (code === 'ACCOUNT_LINK_INVITATION_REVOKED') return 'revoked'
  if (['ACCOUNT_LINK_INVITATION_INVALID', 'ACCOUNT_LINK_INVITATION_CHANGED', 'IDENTITY_STATUS_RESTRICTED', 'VIEWER_ACCOUNT_REQUIRED', 'PLAYER_IDENTITY_ALREADY_BOUND', 'BATTLETAG_ALREADY_BOUND', 'TEAM_CAPTAIN_ALREADY_BOUND'].includes(code)) return 'unavailable'
  return 'retry'
}

export function getWeeklyInvitationWorkspaceHref({ seasonId, seasons = [] }) {
  const id = String(seasonId || '').trim()
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null
  const season = seasons.find(item => item.id === id || item.publicCode === id)
  const params = new URLSearchParams({ section: 'team', competition: season?.id || id })
  if (season) params.set('season', season.publicCode || season.id)
  return `/me?${params}`
}
