import { translateUiText as formatUiText } from './uiText.js'
export function getMySpaceSourceLocation(location, section) {
  if (location.pathname !== '/me' || !['following', 'overview'].includes(section)) return location
  const params = new URLSearchParams(location.search)
  params.set('section', section)
  return { ...location, search: `?${params}` }
}

export function getMySpaceReturnLabel(path, locale = 'zh-CN') {
  if (!/^\/(?:me|following)(?:[?#]|$)/.test(path || '')) return formatUiText('', locale)
  const [pathname, search = ''] = path.split('?')
  const following = pathname === '/following' || new URLSearchParams(search.split('#')[0]).get('section') === 'following'
  return formatUiText(locale === 'en-US' ? following ? 'Back to following' : 'Back to my space' : following ? '返回我的关注' : '返回我的空间', locale)
}
