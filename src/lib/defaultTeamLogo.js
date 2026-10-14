const YELLOW = '#F4C320'
const INK = '#2A2A2A'
const WHITE = '#FFFFFF'
const LETTERMARK_WIDTH = 84
const CACHE_LIMIT = 128
const cache = new Map()
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('und', { granularity: 'grapheme' }) : null

const normalizeLabel = value => Array.from(String(value ?? ''))
  .filter(character => {
    const code = character.codePointAt(0)
    return code >= 32 && !(code >= 127 && code <= 159)
      && !(code >= 0xD800 && code <= 0xDFFF)
      && !(code >= 0x202A && code <= 0x202E)
      && !(code >= 0x2066 && code <= 0x2069)
  })
  .join('').trim().replace(/\s+/gu, ' ').toUpperCase()

const escapeXml = value => value.replace(/[&<>"']/gu, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
})[character])

const glyphWidth = glyph => {
  if (/\s/u.test(glyph)) return 0.32
  if (/^[I1.,:;!|]$/u.test(glyph)) return 0.38
  if (/^[MW@]$/u.test(glyph)) return 0.9
  return /^[\x20-\x7E]$/u.test(glyph) ? 0.7 : 1
}
const lineWidth = glyphs => glyphs.reduce((width, glyph) => width + glyphWidth(glyph), 0)

const createLettermark = label => {
  const glyphs = segmenter ? Array.from(segmenter.segment(label), item => item.segment) : Array.from(label)
  const width = lineWidth(glyphs)
  const lines = [glyphs]
  if (width > 3.9) {
    let split = 1
    let distance = Infinity
    let before = 0
    for (let index = 1; index < glyphs.length; index += 1) {
      before += glyphWidth(glyphs[index - 1])
      const boundary = /[\s.\-_/·]/u.test(glyphs[index - 1])
      const next = Math.abs(width * 0.55 - before) - (boundary ? 0.5 : 0)
      if (next < distance) { split = index; distance = next }
    }
    lines.splice(0, 1, glyphs.slice(0, split), glyphs.slice(split))
  }
  const fontSize = Math.min(lines.length > 1 ? 30 : 48, LETTERMARK_WIDTH / Math.max(...lines.map(lineWidth)))
  return lines.map((line, index) => {
    const textWidth = Math.min(LETTERMARK_WIDTH, lineWidth(line) * fontSize)
    const baseline = lines.length > 1 ? 60 + index * 32 : 65 + fontSize * 0.35
    return `<text x="70" y="${baseline.toFixed(2)}" text-anchor="middle" font-family="Arial Black, Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="${fontSize.toFixed(2)}" font-weight="900" fill="${WHITE}" textLength="${textWidth.toFixed(2)}" lengthAdjust="spacingAndGlyphs">${escapeXml(line.join(''))}</text>`
  }).join('')
}

const CREW = `<g fill="${WHITE}"><path d="M35 49L45 39V90H35Z"/><path d="M49 49L59 39V90H49Z"/><path d="M63 49L73 39V90H63Z"/><path d="M77 49L87 39V90H77Z"/><path d="M91 49L101 39V90H91Z"/></g>`

// Self-contained and render-only: no network request or project asset is needed.
export const createDefaultTeamLogo = shortName => {
  const label = normalizeLabel(shortName)
  if (cache.has(label)) return cache.get(label)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><title>${escapeXml(label || 'Team')}</title><path d="M8 8H108L120 20V120H8Z" fill="${INK}"/><path d="M12 33H19V95H12Z" fill="${YELLOW}"/>${label ? createLettermark(label) : CREW}</svg>`
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(label, source)
  return source
}

export const DEFAULT_TEAM_LOGO = createDefaultTeamLogo('')

// Resolve after each scene's team lookup so defaults cannot mask published logos.
export const getTeamLogo = team => String(team?.logo ?? '').trim() || createDefaultTeamLogo(team?.shortName)
