import { DEFAULT_LOCALE, getSavedLocale, getLocaleParam, resolveLocale, setStoredLocale } from './locales.js'

export function browserLocale(languages = []) {
  return languages.map(resolveLocale).find(Boolean) || null
}

export function regionLocale(countryCode) {
  const country = String(countryCode || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) return null
  if (country === 'CN') return 'zh-CN'
  if (['HK', 'MO', 'TW'].includes(country)) return 'zh-TW'
  if (country === 'KR') return 'ko-KR'
  return 'en-US'
}

export function initialLocale({ queryLocale, savedLocale, languages, countryCode } = {}) {
  return resolveLocale(queryLocale) || resolveLocale(savedLocale) || browserLocale(languages) || regionLocale(countryCode) || 'en-US'
}

async function readVisitorCountry(fetchImpl, timeoutMs) {
  if (!fetchImpl) return null
  const controller = new AbortController()
  let timer
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl('/api/locale', { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal })
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null
        return (await response.json()).countryCode
      })(),
      new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null) }, timeoutMs) })
    ])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Run before importing the router. No background language switch can interrupt a form.
export async function initializeVisitorLocale({ fetchImpl = globalThis.fetch, timeoutMs = 800 } = {}) {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const preference = () => ({
    queryLocale: new URLSearchParams(window.location.search).get('lang'),
    savedLocale: getSavedLocale(),
    languages: window.navigator?.languages?.length ? [...window.navigator.languages] : [window.navigator?.language].filter(Boolean)
  })
  let context = preference()
  let countryCode
  if (!resolveLocale(context.queryLocale) && !context.savedLocale && !browserLocale(context.languages)) {
    countryCode = await readVisitorCountry(fetchImpl, timeoutMs)
    context = preference()
  }
  const locale = initialLocale({ ...context, countryCode })
  // Invalid URL values must not override the detected preference in legacy consumers.
  if (context.queryLocale && !resolveLocale(context.queryLocale)) {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', getLocaleParam(locale))
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  setStoredLocale(locale)
  return locale
}
