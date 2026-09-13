export const QGCS4_PREVIEW_PATH = '/scouting/qgcs4-preview'
export const QGCS4_REPORT_VERSION = '0.2'
export const LANGUAGES = ['zh', 'en', 'ko']
export const COMPARISON_FOCUSES = ['overall', 'consistency', 'pressure', 'heroes']
export const POSITION_CONFIG = {
  TANK: { slug: 'tank', color: '#5d9cff', metrics: ['dmg', 'elim', 'dth', 'block'], boundary: ['Feather', 'EVER', '小黄'] },
  HITSCAN: { slug: 'hitscan', color: '#ff6969', metrics: ['dmg', 'elim', 'dth', 'ast'], boundary: ['ONW', 'sa'] },
  FLEX_DPS: { slug: 'flex-dps', color: '#ff9f45', metrics: ['dmg', 'elim', 'dth', 'ast'], boundary: ['小歪', '风晴', '晚安'] },
  MAIN_SUPPORT: { slug: 'main-support', color: '#5dde8a', metrics: ['heal', 'ast', 'dth', 'dmg'], boundary: ['slipknot', '小五'] },
  FLEX_SUPPORT: { slug: 'flex-support', color: '#36c8d8', metrics: ['heal', 'ast', 'dth', 'dmg'], boundary: ['小水', '吉赛尔'] }
}
export const POSITIONS = Object.keys(POSITION_CONFIG)
export const COMPARISON_PLAYER_COLORS = ['#f4c320', '#67a7ff', '#62df92', '#ff7c72', '#b58cff']

export function getComparisonColor(player) {
  return COMPARISON_PLAYER_COLORS[(player.rank - 1) % COMPARISON_PLAYER_COLORS.length]
}

export function getOverviewFocusValue(player, focus) {
  if (focus === 'consistency') return player.factors.consistency
  if (focus === 'heroes') return player.factors.versatility
  if (focus === 'pressure') return player.context.pressure.eligible ? player.context.pressure.adjustedScore : null
  return player.score
}

export function getLanguage(value) {
  return LANGUAGES.includes(value) ? value : 'zh'
}

export function previewLink({ position, playerId, lang = 'zh', detail = false, compare, focus, basePath = QGCS4_PREVIEW_PATH } = {}) {
  const path = playerId ? `/players/${encodeURIComponent(playerId)}` : position ? `/positions/${POSITION_CONFIG[position].slug}` : ''
  const params = new URLSearchParams()
  if (lang !== 'zh') params.set('lang', getLanguage(lang))
  if (detail) params.set('view', 'analysis')
  if (compare) params.set('compare', compare)
  if (COMPARISON_FOCUSES.includes(focus) && focus !== 'overall') params.set('focus', focus)
  const query = params.toString()
  return `${basePath}${path}${query ? `?${query}` : ''}`
}

export function getComparisonFocus(value) {
  return COMPARISON_FOCUSES.includes(value) ? value : 'overall'
}

export function getComparisonPlayers(data, position, requested) {
  const candidates = getPositionPlayers(data, position)
  const ids = [...new Set(String(requested || '').split(','))]
    .filter(id => candidates.some(player => player.id === id)).slice(0, 3)
  return ids.length >= 2 ? candidates.filter(player => ids.includes(player.id)) : candidates.slice(0, 2)
}

export function getHeroMapRecords(player) {
  const seenMaps = new Set()
  const cells = new Map()
  const mapCounts = new Map()
  for (const match of player.matches) for (const entry of match.mapsUsed) {
    const mapId = `${match.id}|${entry.order}`
    if (seenMaps.has(mapId)) continue
    seenMaps.add(mapId)
    const key = `${entry.hero}|${entry.map}`
    if (!cells.has(key)) cells.set(key, { key, hero: entry.hero, map: entry.map, count: 0, matchIds: [] })
    const cell = cells.get(key)
    cell.count++
    if (!cell.matchIds.includes(match.id)) cell.matchIds.push(match.id)
    mapCounts.set(entry.map, (mapCounts.get(entry.map) || 0) + 1)
  }
  return {
    total: seenMaps.size,
    heroes: player.heroes.map(hero => hero.hero),
    maps: [...mapCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en')).map(([map]) => map),
    cells: [...cells.values()]
  }
}

export function getPositionPlayers(data, position, selectedOnly = true) {
  // Filtering never rebuilds the research model or changes its reference pool.
  return data.players.filter(player => player.position === position && (!selectedOnly || player.selected))
}

export function getMetricReference(data, player, key) {
  const peers = getPositionPlayers(data, player.position, false)
  const values = peers.map(peer => peer.metrics[key]).sort((a, b) => a - b)
  const value = player.metrics[key]
  const lowerIsBetter = key === 'dth'
  const better = values.filter(other => lowerIsBetter ? other < value : other > value).length
  const ties = values.filter(other => other === value).length
  const middle = Math.floor(values.length / 2)
  return {
    value, total: values.length, rank: better + 1, lowerIsBetter,
    median: values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2,
    // Midranks keep ties honest. The radar has no independent model weight.
    percentile: ((values.length - better - ties + ties / 2) / values.length) * 100
  }
}

export function getBoundaryPlayers(data, position) {
  return POSITION_CONFIG[position].boundary.map(name => data.players.find(player => player.position === position && player.name === name)).filter(Boolean)
}

export function getEvidenceMatches(player) {
  return player.evidenceMatchIds.map(id => player.matches.find(match => match.id === id)).filter(Boolean)
}

export function formatNumber(value, lang = 'zh', digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat({ zh: 'zh-CN', en: 'en-US', ko: 'ko-KR' }[getLanguage(lang)], {
    maximumFractionDigits: digits, minimumFractionDigits: digits
  }).format(value)
}
