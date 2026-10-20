import { translateUiText } from '../../lib/uiText.js'

export function accountDateTime(value, locale = 'zh-CN', fallback = '时间待定', options = {}) {
  const date = value ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) return translateUiText(fallback, locale)
  const language = ['zh-CN', 'zh-TW', 'en-US', 'ko-KR'].includes(locale) ? locale : 'zh-CN'
  return new Intl.DateTimeFormat(language, {
    timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, ...options
  }).format(date)
}
