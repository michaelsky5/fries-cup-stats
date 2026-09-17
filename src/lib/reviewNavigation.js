import { withSeason as buildSeasonLink } from '../config/seasons.js'
import { withReviewLocale } from './reviewLocale.js'
import { readReturnState } from './navigationState.js'

export function buildReviewPath(path, seasonId, locale, currentSearch = '') {
  return withReviewLocale(buildSeasonLink(path, seasonId, currentSearch), locale)
}

export function buildReviewEntryPath(seasonId, locale, currentSearch = '', { query = '', identity = '' } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (['player', 'teamStaff', 'admin', 'caster', 'viewer'].includes(identity)) params.set('identity', identity)
  return buildReviewPath(`/review${params.size ? `?${params}` : ''}`, seasonId, locale, currentSearch)
}

export function getReviewOverviewReturnState(state, seasonId, locale, currentSearch = '') {
  const returnTo = buildReviewPath('/', seasonId, locale, currentSearch)
  const source = readReturnState(state, { allowedPrefixes: ['/'] })
  if (!source.returnTo) return { returnTo }
  const sourceUrl = new URL(source.returnTo, 'https://review.invalid')
  const targetUrl = new URL(returnTo, sourceUrl.origin)
  if (sourceUrl.pathname !== '/' || sourceUrl.searchParams.get('season') !== targetUrl.searchParams.get('season')) return { returnTo }
  return { returnTo, ...(source.returnScrollY === null ? {} : { returnScrollY: source.returnScrollY }) }
}

export function getReviewEntryReturnPath(returnTo, seasonId, locale, currentSearch = '') {
  const fallback = buildReviewEntryPath(seasonId, locale, currentSearch)
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/review?')) return fallback
  const url = new URL(returnTo, 'https://review.invalid')
  const expectedSeason = new URL(fallback, url.origin).searchParams.get('season')
  if (url.pathname !== '/review' || url.searchParams.get('season') !== expectedSeason) return fallback
  return buildReviewEntryPath(seasonId, locale, currentSearch, {
    query: url.searchParams.get('q') || '',
    identity: url.searchParams.get('identity') || ''
  })
}

export function buildReviewSceneUrl(href, sceneIndex) {
  const url = new URL(href)
  const source = url.searchParams
  const params = new URLSearchParams()
  for (const key of ['season', 'lang', 'as', 'who', 'design']) {
    if (source.has(key)) params.set(key, source.get(key))
  }
  params.set('scene', String(Math.max(0, Number.isInteger(sceneIndex) ? sceneIndex : 0) + 1))
  url.search = params.toString()
  url.hash = ''
  return url.href
}
