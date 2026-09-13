import { translateUiText } from './uiText.js'

export function createPublicTextTranslator(db, account) {
  const names = new Set()
  const collect = row => {
    if (!row || typeof row !== 'object') return
    for (const [key, value] of Object.entries(row)) {
      if (/hero|map/i.test(key)) continue
      if (typeof value === 'string' && /name|short|nick|tag|coach|manager/i.test(key)) {
        names.add(value.trim())
      } else if (Array.isArray(value) && /roster|member|staff|player/i.test(key)) value.forEach(collect)
    }
  }
  for (const key of ['players', 'teams', 'staff', 'casters', 'admins', 'team_staff', 'player_totals']) {
    if (Array.isArray(db?.[key])) db[key].forEach(collect)
  }
  collect(account)
  return (value, locale) => typeof value === 'string' && names.has(value.trim())
    ? value : translateUiText(value, locale)
}
