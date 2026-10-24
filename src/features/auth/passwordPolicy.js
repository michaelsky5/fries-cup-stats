import { pickUiLocale } from '../../lib/uiText.js'

export const NEW_PASSWORD_MIN_LENGTH = 8
export const NEW_PASSWORD_MAX_LENGTH = 64

export function passwordPolicyHint(locale = 'zh-CN', minLength = NEW_PASSWORD_MIN_LENGTH) {
  return pickUiLocale(locale,
    `${minLength}–64 位，仅支持英文字母、数字和英文符号，不含空格。`,
    `${minLength}–64 characters. Use English letters, numbers and symbols; no spaces.`,
    `${minLength}–64자. 영문자, 숫자, 영문 기호만 사용할 수 있으며 공백은 제외됩니다.`,
    `${minLength}–64 位，僅支援英文字母、數字和英文符號，不含空格。`)
}

export function validateNewPassword(password, locale = 'zh-CN', minLength = NEW_PASSWORD_MIN_LENGTH) {
  return typeof password === 'string' && password.length >= minLength && password.length <= NEW_PASSWORD_MAX_LENGTH && /^[\x21-\x7e]+$/.test(password)
    ? '' : passwordPolicyHint(locale, minLength)
}

export function assertNewPassword(password) {
  const message = validateNewPassword(password)
  if (!message) return
  const error = new Error(message)
  error.status = 400
  error.data = { error: 'PASSWORD_POLICY' }
  throw error
}
