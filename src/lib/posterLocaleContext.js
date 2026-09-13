import { createTraditionalReviewTranslator } from './traditionalText.js'

// Keep measurement and painting in the same language. This wraps only the
// current poster's context; browser canvas prototypes are never changed.
export function getPosterLocaleContext(canvas, payload) {
  const context = canvas.getContext('2d')
  const locale = payload?.locale
  if (!context || !['zh-TW', 'ko-KR'].includes(locale)) return context
  const translate = locale === 'zh-TW' ? createTraditionalReviewTranslator(payload) : value => value
  const cache = new Map()
  const text = value => {
    if (typeof value !== 'string') return value
    if (!cache.has(value)) cache.set(value, translate(value))
    return cache.get(value)
  }
  const family = locale === 'zh-TW'
    ? '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC"'
    : '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR"'
  return new Proxy(context, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (['measureText', 'fillText', 'strokeText'].includes(property)) {
        return (label, ...args) => value.call(target, text(label), ...args)
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, property, value) {
      const next = property === 'font' && typeof value === 'string'
        ? value.replace(/(\d+(?:\.\d+)?px)\s+/, `$1 ${family}, `)
        : value
      return Reflect.set(target, property, next, target)
    }
  })
}
