let storage = { get: () => undefined, set: () => undefined }
export function configureLocaleStorage(value) { storage = value }
export { LOCALES, DEFAULT_LOCALE, normalizeLocale, getLocaleParam, LOCALE_STORAGE_KEY, LOCALE_CHANGE_EVENT } from '../generated/localeIdentity.js'
import { DEFAULT_LOCALE, normalizeLocale, getLocaleParam, LOCALE_STORAGE_KEY } from '../generated/localeIdentity.js'

let active = DEFAULT_LOCALE
const listeners = new Set()
export function subscribeLocale(callback) { listeners.add(callback); return () => listeners.delete(callback) }
export function getActiveLocale() { return active }
export function getStoredLocale(fallback = DEFAULT_LOCALE) {
  try { return normalizeLocale(storage.get(LOCALE_STORAGE_KEY), fallback) } catch (_) { return normalizeLocale(fallback) }
}
export function setStoredLocale(value) {
  active = normalizeLocale(value)
  let saved = true
  try { storage.set(LOCALE_STORAGE_KEY, active) } catch (_) { saved = false }
  listeners.forEach(callback => callback())
  return saved
}
export function activateLocale(value) {
  const next = normalizeLocale(value || getStoredLocale())
  if (next !== active) { active = next; listeners.forEach(callback => callback()) }
  return next
}
export function withLocale(path, locale = active) {
  const [base, ...hashParts] = String(path || '').split('#')
  const [pathname, query = ''] = base.split('?')
  const entries = query.split('&').filter(item => item && !/^lang=/.test(item))
  entries.push(`lang=${getLocaleParam(locale)}`)
  return `${pathname}?${entries.join('&')}${hashParts.length ? `#${hashParts.join('#')}` : ''}`
}
