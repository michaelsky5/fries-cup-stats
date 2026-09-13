import { normalizeLocale } from './locales.js'

const catalogs = new Map()
const pending = new Map()
let traditionalConverter
const loaders = {
  'zh-TW': () => import('../locales/zh-TW.js'),
  'ko-KR': () => import('../locales/ko-KR.js'),
  'en-US': () => import('../locales/en-US.js')
}

export function getUiCatalog(locale) {
  return catalogs.get(normalizeLocale(locale))
}

// Route loading and language controls await this before changing language.
// A rejected load is retryable; a slower previous selection cannot replace a
// newer language because each dictionary is stored under its own locale.
export function ensureUiLocale(locale) {
  const language = normalizeLocale(locale)
  if (language === 'zh-CN' || catalogs.has(language)) return Promise.resolve()
  if (!pending.has(language)) {
    const request = Promise.all([
      loaders[language](),
      language === 'zh-TW' ? import('./traditionalConverter.js') : null
    ]).then(([module, converter]) => {
      if (converter) traditionalConverter = converter.convertTraditional
      catalogs.set(language, module.default)
    }).finally(() => pending.delete(language))
    pending.set(language, request)
  }
  return pending.get(language)
}

export function convertTraditionalCopy(text) {
  if (!traditionalConverter) throw new Error('Traditional Chinese must be loaded before rendering review copy.')
  return traditionalConverter(text)
}
