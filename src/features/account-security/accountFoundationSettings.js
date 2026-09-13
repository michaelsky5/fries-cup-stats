export function accountSettingsError(error, locale) {
  if (String(error?.data?.error || '').startsWith('AVATAR_')) return locale === 'en-US' ? ({ AVATAR_TOO_LARGE: 'Choose an image smaller than 2 MB.', AVATAR_FORMAT: 'Use a JPG, PNG or static WebP. Animated images are not supported.', AVATAR_BUSY: 'Another image is being processed. Please try saving again shortly.', AVATAR_CROP: 'The crop is outside the image. Adjust it and try again.', AVATAR_STORAGE: 'The avatar could not be saved. Your changes are still here; try again shortly.' }[error.data.error] || 'This image could not be saved. Choose a readable static image up to 16 megapixels and try again.') : error.data.message
  const messages = {
    PASSWORD_INVALID: '当前密码不正确，请重新输入。',
    ACCOUNT_CREDENTIALS_CHANGED: '账号凭据已经变化，请重新登录后再操作。',
    EMAIL_DELIVERY_UNAVAILABLE: '邮件服务暂未开放，请联系赛事负责人核对账号邮箱。',
    EMAIL_VERIFICATION_TOKEN_INVALID: '验证链接无效或已使用，请重新申请。',
    EMAIL_VERIFICATION_TOKEN_EXPIRED: '验证链接已过期，请重新申请。',
    SESSION_NOT_FOUND: '这台设备已经退出，请刷新设备列表。',
    READ_ONLY_ACCOUNT: '当前账号不支持这项修改。',
    REGISTRATION_DISABLED: '当前采用邀请制，请打开赛事负责人或队长提供的邀请链接。',
    ORIGIN_NOT_ALLOWED: '当前站点尚未接通账号服务，请联系赛事负责人。'
  }
  if (messages[error?.data?.error]) return messages[error.data.error]
  if (error?.status === 401) return '登录已失效，请重新登录。'
  if (error?.status === 429) return '操作较频繁，请稍后再试。'
  if (error?.status >= 500 || error?.name === 'TypeError') return '账号服务暂时不可用，请稍后重试。'
  if (error?.status === 404) return '账号服务暂未提供这项功能，请稍后重试。'
  if (error?.status === 403) return '当前账号不能执行这项操作。'
  if (error?.data?.issues?.length) return '填写内容不符合要求，请检查后重试。'
  return error?.message || '操作未完成，请稍后重试。'
}

export function createAccountProfileForm(user, profile) {
  return { displayName: user?.displayName || '', nickname: profile?.nickname || '', bio: profile?.bio || '', regionCode: profile?.regionCode || '' }
}

export function buildAccountProfilePatch(form, original) {
  return Object.fromEntries(Object.keys(original).flatMap(key => {
    const value = String(form[key] || '').trim()
    return value === String(original[key] || '').trim() ? [] : [[key, key === 'displayName' ? value : value || null]]
  }))
}

export function validateAccountPassword({ currentPassword = '', newPassword = '', confirmation = '' }) {
  if (!currentPassword) return '请填写当前密码。'
  if (newPassword.length < 8) return '新密码至少需要 8 位。'
  if ([currentPassword, newPassword].some(value => new TextEncoder().encode(value).length > 72)) return '密码不能超过 72 个 UTF-8 字节。'
  if (currentPassword === newPassword) return '新密码需要与当前密码不同。'
  if (newPassword !== confirmation) return '两次输入的新密码不一致。'
  return ''
}

export function emailVerificationNotice(state) {
  if (state?.status === 'VERIFIED') return { tone: 'success', text: '邮箱已验证。' }
  if (state?.status === 'SENT' && state.result?.delivered) return { tone: 'success', text: '验证邮件已交给投递服务，请检查收件箱和垃圾邮件，并打开验证链接。' }
  if (state?.status === 'SENT' || state?.status === 'UNDELIVERED') return { tone: 'error', text: '验证邮件未投递，请稍后重试或联系赛事负责人。' }
  if (state?.status === 'ERROR') return { tone: 'error', text: accountSettingsError(state.error) }
  if (state?.status === 'VERIFYING') return { tone: 'info', text: '正在核验邮箱链接…' }
  return null
}
