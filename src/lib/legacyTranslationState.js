import { translateLegacyText } from './legacyI18n.js'

// A changed DOM value belongs to React/the page, not to our previous source.
// This matters when a Chinese placeholder becomes a team name after loading.
export function translateLegacyValue(current, previous, locale, translate = translateLegacyText) {
  const source = previous && current === previous.rendered ? previous.source : current
  return { source, rendered: translate(source, locale) }
}
