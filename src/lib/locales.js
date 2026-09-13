export const LOCALE_STORAGE_KEY = 'fries_cup_stats_locale'
export const LEGACY_REVIEW_LOCALE_STORAGE_KEY = 'fries_cup_review_locale'
export const DEFAULT_LOCALE = 'zh-CN'
export const LOCALE_CHANGE_EVENT = 'friescup:locale-change'

// One language contract for public pages, accounts, review stories and share URLs.
export const LOCALES = [
  { id: 'zh-CN', param: 'zh', code: 'ZH-CN', label: '简体中文', shortLabel: '简中' },
  { id: 'zh-TW', param: 'zh-TW', code: 'ZH-TW', label: '繁體中文', shortLabel: '繁中' },
  { id: 'ko-KR', param: 'ko', code: 'KO-KR', label: '한국어', shortLabel: '한국어' },
  { id: 'en-US', param: 'en', code: 'EN-US', label: 'English', shortLabel: 'EN' }
]

function resolveLocale(value) {
  const raw = String(value || '').trim().replaceAll('_', '-').toLowerCase()
  if (/^zh-(?:tw|hk|mo|hant)(?:-|$)/.test(raw)) return 'zh-TW'
  if (/^zh(?:-|$)/.test(raw)) return 'zh-CN'
  if (/^ko(?:-|$)/.test(raw)) return 'ko-KR'
  if (/^en(?:-|$)/.test(raw)) return 'en-US'
  return null
}

export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return resolveLocale(value) || resolveLocale(fallback) || DEFAULT_LOCALE
}

export function getLocaleParam(locale) {
  return LOCALES.find(item => item.id === normalizeLocale(locale)).param
}

export function getStoredLocale(fallback = DEFAULT_LOCALE) {
  if (typeof window === 'undefined') return normalizeLocale(fallback)
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_REVIEW_LOCALE_STORAGE_KEY), fallback)
  } catch {
    return normalizeLocale(fallback)
  }
}

export function setStoredLocale(locale) {
  if (typeof window === 'undefined') return
  try {
    const normalized = normalizeLocale(locale)
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    window.localStorage.setItem(LEGACY_REVIEW_LOCALE_STORAGE_KEY, normalized)
  } catch { /* Language switching still works in the URL when storage is blocked. */ }
  window.dispatchEvent?.(new Event(LOCALE_CHANGE_EVENT))
}

export function getActiveLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(new URLSearchParams(window.location.search).get('lang') || getStoredLocale())
}

export function withLocale(path, locale) {
  const [base, ...hashParts] = String(path || '').split('#')
  const [pathname, query = ''] = base.split('?')
  const params = new URLSearchParams(query)
  params.set('lang', getLocaleParam(locale))
  return `${pathname}?${params}${hashParts.length ? `#${hashParts.join('#')}` : ''}`
}
