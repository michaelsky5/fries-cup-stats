const roots = ['/dashboard', '/tasks', '/newspapers', '/staff-accounts', '/teams', '/players', '/tournaments', '/matches',
  '/match-workbench', '/submissions', '/publish', '/broadcast-scheduling', '/operations-delivery', '/settings', '/accounts', '/rulebooks', '/standings', '/stats']
const validSeason = value => /^[A-Za-z0-9_-]{1,128}$/.test(value || '') ? value : ''

function returnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/dashboard'
  try {
    const target = new URL(value, 'https://admin.fries-cup.com')
    if (target.origin !== 'https://admin.fries-cup.com' || !roots.some(root => target.pathname === root || target.pathname.startsWith(root + '/'))) return '/dashboard'
    return target.pathname + target.search + target.hash
  } catch { return '/dashboard' }
}

export function systemManagementLink({ search = '', seasonId = '', base = import.meta.env?.VITE_SYSTEM_APP_URL || 'https://admin.fries-cup.com' } = {}) {
  try {
    const origin = new URL(base)
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) return ''
    const params = new URLSearchParams(search)
    const destination = params.getAll('systemReturnTo').length === 1 ? returnPath(params.get('systemReturnTo')) : '/dashboard'
    const original = new URL(destination, origin).searchParams
    const requestedSeason = validSeason(original.get('seasonId')) || validSeason(original.get('filterSeason'))
      || (params.getAll('systemSeason').length === 1 ? validSeason(params.get('systemSeason')) : '')
      || (params.getAll('competition').length === 1 ? validSeason(params.get('competition')) : '') || validSeason(seasonId)
    const target = new URL('/account-mode', origin)
    target.searchParams.set('returnTo', destination)
    if (requestedSeason) target.searchParams.set('seasonId', requestedSeason)
    return target.href
  } catch { return '' }
}
