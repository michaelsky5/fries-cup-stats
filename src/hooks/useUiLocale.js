import { useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, LOCALE_CHANGE_EVENT, getActiveLocale } from '../lib/locales.js'

function subscribe(callback) {
  window.addEventListener('popstate', callback)
  window.addEventListener('storage', callback)
  window.addEventListener(LOCALE_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener('storage', callback)
    window.removeEventListener(LOCALE_CHANGE_EVENT, callback)
  }
}

export function useUiLocale() {
  return useSyncExternalStore(subscribe, getActiveLocale, () => DEFAULT_LOCALE)
}
