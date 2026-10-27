import { translateUiText } from '../../../../src/lib/uiText.js'
import { getActiveLocale } from './nativeLocales.js'
let identities = new Set()
// Protect published names and BattleTags even when they happen to match a UI word.
export function protectPublicIdentities(raw) {
  const names = new Set()
  const visit = value => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach(visit); return }
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:name|team_name|team_short_name|player_name|display_name|nickname|battleTag|battle_tag|battletag|staff_name|caster_name)$/.test(key) && typeof child === 'string' && child) names.add(child)
      else if (typeof child === 'object') visit(child)
    }
  }
  visit(raw)
  identities = names
}
export function nativeCopy(value) {
  if (typeof value === 'string') return identities.has(value.trim()) ? value : translateUiText(value, getActiveLocale())
  if (Array.isArray(value)) return value.map(nativeCopy)
  return value
}
