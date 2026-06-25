const CANONICAL_SEASON_IDS = {
  FCR26: 'FCR2026',
  FCR2026: 'FCR2026',
  FCA26: 'FCA2026',
  FCA2026: 'FCA2026'
}

export function normalizeSeasonId(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  if (CANONICAL_SEASON_IDS[raw]) return CANONICAL_SEASON_IDS[raw]
  if (raw.startsWith('FCR')) return 'FCR2026'
  if (raw.startsWith('FCA')) return 'FCA2026'
  return raw
}

export function getSeasonStorageAliases(value) {
  const canonical = normalizeSeasonId(value)
  if (canonical === 'FCR2026') return ['FCR2026', 'FCR26']
  if (canonical === 'FCA2026') return ['FCA2026', 'FCA26']
  return canonical ? [canonical] : []
}
