import { normalizeLocale } from './locales.js'
import { getUiCatalog } from './localeCatalog.js'

const whitespace = value => value.trim().replace(/\s+/g, ' ')
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const indexes = new WeakMap()
function getIndex(catalog) {
  if (!catalog) return { exact: new Map(), patterns: [] }
  if (indexes.has(catalog)) return indexes.get(catalog)
  const exact = new Map()
  const patterns = []
  for (const [source, translated] of Object.entries(catalog)) {
    if (!/\{\d+\}/.test(source)) exact.set(whitespace(source), translated.trim())
    else if (source.replace(/\{\d+\}/g, '').trim().length >= 2) {
      const indices = [...source.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1]))
      const expression = escape(whitespace(source)).replace(/\\\{\d+\\\}/g, '(.+?)')
      patterns.push({ regex: new RegExp(`^${expression}$`), translated, indices, length: source.length })
    }
  }
  patterns.sort((a, b) => b.length - a.length)
  const index = { exact, patterns }
  indexes.set(catalog, index)
  return index
}

function interpolate(template, values) {
  return template.replace(/\{(\d+)\}/g, (token, index) => index in values ? String(values[index]) : token)
}

// Only catalogued interface copy is translated. Names, URLs, codes and user input
// are not subjected to character conversion or word-by-word substitutions.
export function translateUiText(value, locale = 'zh-CN', values) {
  if (value === null || value === undefined || typeof value !== 'string') return value
  const language = normalizeLocale(locale)
  const catalog = getUiCatalog(language)
  if (values) {
    return interpolate(catalog?.[value] || value, values)
  }
  if (language === 'zh-CN') return value
  const core = whitespace(value)
  if (!core) return value
  const { exact, patterns } = getIndex(catalog)
  let translated = exact.get(core)
  if (!translated && language !== 'zh-CN' && /[\u4e00-\u9fff]/.test(core)) {
    for (const pattern of patterns) {
      const match = core.match(pattern.regex)
      if (!match) continue
      const parameters = {}
      pattern.indices.forEach((index, i) => { parameters[index] = match[i + 1] })
      translated = interpolate(pattern.translated, parameters)
      break
    }
  }
  if (!translated || translated === core) return value
  return `${value.match(/^\s*/)[0]}${translated}${value.match(/\s*$/)[0]}`
}

export function pickUiLocale(locale, zh, en, ko, tw) {
  const language = normalizeLocale(locale)
  if (language === 'en-US' && en !== undefined) return en
  if (language === 'ko-KR' && ko !== undefined) return ko
  if (language === 'zh-TW' && tw !== undefined) return tw
  return translateUiText(zh, language)
}

// For copy dictionaries only; never pass tournament records or account data.
export function localizeUiCopy(copy, locale) {
  if (normalizeLocale(locale) === 'zh-CN') return copy
  if (typeof copy === 'string') return translateUiText(copy, locale)
  if (typeof copy === 'function') return (...args) => translateUiText(copy(...args), locale)
  if (Array.isArray(copy)) return copy.map(value => localizeUiCopy(value, locale))
  if (copy && typeof copy === 'object') return Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, localizeUiCopy(value, locale)]))
  return copy
}
