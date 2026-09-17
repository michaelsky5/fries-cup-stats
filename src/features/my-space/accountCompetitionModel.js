export const ACCOUNT_COMPETITION_PARAM = 'competition'

export function normalizeCompetitionId(value) {
  const id = String(value || '').trim()
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : ''
}

export function normalizeAccountCompetitions(value) {
  // A missing field means the older API, not a confirmed empty membership list.
  if (!Array.isArray(value)) return null
  const seen = new Set()
  return value.filter(item => {
    if (!item || !normalizeCompetitionId(item.id) || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).map(item => ({
    id: item.id, name: String(item.name || item.id), status: item.status,
    competitionKind: item.competitionKind, teams: Array.isArray(item.teams) ? item.teams : []
  }))
}

export function resolveAccountCompetition({ search = '', competitions = null, rememberedId = '', publicSeasonId = '' }) {
  const params = new URLSearchParams(search)
  const requested = params.getAll(ACCOUNT_COMPETITION_PARAM)
  if (requested.length) {
    const id = requested.length === 1 ? normalizeCompetitionId(requested[0]) : ''
    if (!id) return { id: '', issue: 'INVALID' }
    if (competitions && !competitions.some(item => item.id === id)) return { id: '', issue: 'UNAVAILABLE' }
    return { id, issue: '' }
  }
  if (competitions === null) return { id: publicSeasonId, issue: '' }
  if (competitions.some(item => item.id === rememberedId)) return { id: rememberedId, issue: '' }
  if (competitions.length === 1) return { id: competitions[0].id, issue: '' }
  return { id: '', issue: competitions.length ? 'CHOOSE' : 'EMPTY' }
}

// Account context travels only to personal workspaces. Public archive IDs,
// filters, invitation tokens and other account-specific state stay out of it.
export function withAccountCompetition(path, competitionId, currentSearch = '') {
  const raw = String(path || '')
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('#')) return raw
  const [pathAndQuery, hash = ''] = raw.split('#')
  const [pathname, query = ''] = pathAndQuery.split('?')
  const params = new URLSearchParams(query)
  const personal = /^\/(?:me|account)\/?$/.test(pathname) || /^\/matches\/[^/]+\/room\/?$/.test(pathname)
  const source = params.has(ACCOUNT_COMPETITION_PARAM) ? params.get(ACCOUNT_COMPETITION_PARAM)
    : competitionId || new URLSearchParams(currentSearch).get(ACCOUNT_COMPETITION_PARAM)
  const id = normalizeCompetitionId(source)
  params.delete('platformSeason')
  if (personal && id) params.set(ACCOUNT_COMPETITION_PARAM, id)
  else params.delete(ACCOUNT_COMPETITION_PARAM)
  return `${pathname}${params.size ? `?${params}` : ''}${hash ? `#${hash}` : ''}`
}

export function competitionSwitchSearch(search, id) {
  const current = new URLSearchParams(search)
  const next = new URLSearchParams()
  for (const key of ['season', 'lang', 'design']) if (current.has(key)) next.set(key, current.get(key))
  if (normalizeCompetitionId(id)) next.set(ACCOUNT_COMPETITION_PARAM, id)
  next.set('section', 'overview')
  return next.toString()
}

export function readRememberedCompetition(userId, storage) {
  if (!userId) return ''
  try { return normalizeCompetitionId(storage?.getItem(`fries-cup:competition:${userId}`)) } catch { return '' }
}

export function rememberCompetition(userId, id, storage) {
  if (!userId || !normalizeCompetitionId(id)) return
  try { storage?.setItem(`fries-cup:competition:${userId}`, id) } catch { /* The URL remains the source of navigation context. */ }
}
