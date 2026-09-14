import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { DEFAULT_PUBLIC_DESIGN } from '../../features/fd-design/designPreview.js'
import { translateUiText } from '../../lib/uiText.js'
import { getLocaleParam } from '../../lib/locales.js'

export const PRIMARY_NAV = [
  { to: '/', cn: '赛事总览', en: 'OVERVIEW', ko: '대회 개요', end: true, group: 'overview' },
  { to: '/matches', cn: '赛程赛果', en: 'MATCHES', ko: '일정 · 결과', group: 'matches' },
  { to: '/advance', cn: '晋级形势', en: 'ADVANCE', ko: '진출 현황', group: 'advance' },
  { to: '/roster', cn: '参赛阵容', en: 'ROSTER', ko: '참가 명단', group: 'roster' },
  { to: '/leaderboard', cn: '数据排行', en: 'STATS', ko: '데이터 순위', group: 'database' },
  { to: '/me', cn: '我的空间', en: 'MY SPACE', ko: '내 공간', group: 'space' }
]

export function getPersonalNavItem(isAuthenticated = false) {
  return isAuthenticated ? PRIMARY_NAV[5] : {
    ...PRIMARY_NAV[5], cn: '我的关注', en: 'MY FOLLOWING', ko: '내 관심 목록'
  }
}

export function getPrimaryNavigation(isAuthenticated = false) {
  return [...PRIMARY_NAV.slice(0, -1), getPersonalNavItem(isAuthenticated)]
}

// Ordinary public links use the build default without adding preview parameters.
// Explicit versions and pages that override that default retain their context.
export function getNavigationSearch(search = '', design = '', locale) {
  const params = new URLSearchParams(search)
  if (locale) params.set('lang', getLocaleParam(locale))
  if (design && (design !== DEFAULT_PUBLIC_DESIGN || params.has('design'))) params.set('design', design)
  return params.toString()
}

export function getNavLabel(item, locale) {
  if (locale === 'ko-KR') return formatUiText(item.ko, locale)
  return formatUiText(locale === 'en-US' ? item.en : translateUiText(item.cn, locale), locale)
}

export function getWeeklyNavigationPath(path, search, enabled) {
  if (!enabled || !['/', '/matches', '/advance'].includes(path)) return path
  const current = new URLSearchParams(search)
  const params = new URLSearchParams()
  for (const key of ['cycle', 'week']) {
    const value = current.get(key)
    if (value && !(path === '/' && key === 'week' && value === 'all')) params.set(key, value)
  }
  if (path !== '/' && current.get('teamId')) params.set('teamId', current.get('teamId'))
  return `${path}${params.size ? `?${params}` : ''}`
}
