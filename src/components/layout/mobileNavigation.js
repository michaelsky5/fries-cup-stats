import { getSafeInternalPath } from '../../lib/navigationState.js'

const GROUPS = new Set(['overview', 'matches', 'database', 'space'])
const CONTEXT_KEYS = ['season', 'competition', 'lang', 'design']
const QUERY_KEYS = new Set([...CONTEXT_KEYS,
  'cycle', 'week', 'entry', 'step', 'progress', 'journey', 'weeklyMatch', 'manage', 'section',
  'teamId', 'view', 'tab', 'q', 'query', 'team', 'role', 'hero', 'following', 'followed', 'minTime', 'insufficient',
  'mode', 'sort', 'dir', 'page', 'pageSize', 'cols', 'metrics', 'compare', 'map', 'expand', 'status', 'stage', 'round', 'roundView', 'format', 'focus', 'preview', 'filter', 'type', 'size', 'limit',
  'follow', 'followView', 'followState', 'followCollection', 'followLimit', 'rosterFocus', 'rosterTeam', 'rosterCredit', 'creditRole', 'teamsExpanded', 'task', 'group', 'scene', 'identity',
  // Public dossier and match reading controls are navigation, not form drafts.
  'pview', 'phero', 'pmap', 'pmode', 'popen', 'pquery', 'presult', 'prole', 'pshow', 'pside', 'pstage', 'ptrend', 'hfocus', 'chero', 'crole', 'jmatch',
  'compareA', 'compareB', 'analysis', 'collapsed', 'mapStats', 'analysisStage', 'analysisTopic', 'analysisView', 'banSide', 'chapter', 'combatMetric', 'combatView',
  'heroSample', 'journalMatch', 'journeyView', 'mapEvidence', 'member', 'memberMetric', 'performanceHero', 'performanceMember', 'seasonRecords',
  'teamEvidence', 'teamMap', 'teamMatch', 'teamOpponent', 'teamOrder', 'teamStage', 'trendMetric', 'result'
])
const PREFIX = 'fries-cup:mobile-tab:v1:'
const memory = new Map()
const isDetail = pathname => /^\/(?:players|teams|staff|matches|maps)\/[^/]+/.test(pathname)

export function getMobileNavigationGroup(location, depth = 0) {
  const pathname = location?.pathname || '/'
  if (isDetail(pathname) && depth < 4) {
    if (GROUPS.has(location.state?.mobileTabGroup)) return location.state.mobileTabGroup
    const source = getSafeInternalPath(location.state?.returnTo)
    if (source && source.split('?')[0] !== pathname) {
      const url = new URL(source, 'https://navigation.invalid')
      return getMobileNavigationGroup({ pathname: url.pathname, search: url.search,
        state: { returnTo: location.state?.parentReturnTo } }, depth + 1)
    }
  }
  if (/^\/(?:me|following|account|participate|auth|activate-weekly)(?:\/|$)/.test(pathname)) return 'space'
  if (/^\/(?:matches|schedule)(?:\/|$)/.test(pathname)) return 'matches'
  if (/^\/(?:leaderboard|heroes|maps)(?:\/|$)/.test(pathname)) return 'database'
  return 'overview'
}

export function sanitizeMobileNavigationPath(path) {
  const safe = getSafeInternalPath(path)
  if (!safe) return ''
  const url = new URL(safe, 'https://navigation.invalid')
  if (url.origin !== 'https://navigation.invalid') return ''
  // Invitation and authentication pages must never become remembered Tab destinations.
  if (!/^\/(?:$|matches(?:\/|$)|leaderboard$|heroes$|maps(?:\/|$)|roster$|players(?:\/|$)|teams(?:\/|$)|staff(?:\/|$)|advance$|standings$|review$|me$|following$|account$)/.test(url.pathname)) return ''
  const params = new URLSearchParams()
  url.searchParams.forEach((value, key) => { if (QUERY_KEYS.has(key)) params.append(key, value) })
  const hash = /^#[a-z0-9_-]+$/i.test(url.hash) ? url.hash : ''
  return url.pathname + (params.size ? '?' + params : '') + hash
}

export function getMobileNavigationScope(fallback, group, userId = '') {
  const url = new URL(fallback, 'https://navigation.invalid')
  return JSON.stringify([url.searchParams.get('season') || '', url.searchParams.get('competition') || '', group === 'space' ? userId || 'guest' : 'public'])
}

export function buildMobileTabTarget(entry, fallback, group) {
  const safe = sanitizeMobileNavigationPath(entry?.path)
  if (!safe || getMobileNavigationGroup({ pathname: new URL(safe, 'https://navigation.invalid').pathname, state: { mobileTabGroup: group } }) !== group) return { to: fallback }
  const next = new URL(safe, 'https://navigation.invalid')
  const context = new URL(fallback, 'https://navigation.invalid')
  if (next.searchParams.get('season') && next.searchParams.get('season') !== context.searchParams.get('season')) return { to: fallback }
  applyContext(next, context)
  const state = navigationState(entry.state)
  for (const key of ['returnTo', 'parentReturnTo']) {
    if (!state[key]) continue
    const source = new URL(state[key], 'https://navigation.invalid')
    applyContext(source, context)
    state[key] = source.pathname + source.search + source.hash
  }
  const scrollY = Number.isFinite(entry.scrollY) && entry.scrollY >= 0 ? entry.scrollY : 0
  return { to: next.pathname + next.search + next.hash,
    state: { ...state, mobileTabGroup: group, mobileTabRestore: true, restoreScrollY: scrollY } }
}

function applyContext(url, context) {
  for (const key of CONTEXT_KEYS) {
    url.searchParams.delete(key)
    if (context.searchParams.has(key)) url.searchParams.set(key, context.searchParams.get(key))
  }
}

function browserStorage() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null }
}

function storageKey(scope, group) { return PREFIX + scope + ':' + group }

export function readMobileTab(scope, group) {
  const key = storageKey(scope, group)
  if (memory.has(key)) return memory.get(key)
  try {
    const entry = JSON.parse(browserStorage()?.getItem(key) || 'null')
    if (entry && sanitizeMobileNavigationPath(entry.path)) { memory.set(key, entry); return entry }
  } catch {
    // Storage may be unavailable or contain an older/invalid entry; use the default destination.
  }
  return null
}

function navigationState(input) {
  const state = {}
  for (const key of ['returnTo', 'parentReturnTo']) {
    const value = sanitizeMobileNavigationPath(input?.[key])
    if (value) state[key] = value
  }
  for (const key of ['returnScrollY', 'parentReturnScrollY']) {
    if (Number.isFinite(input?.[key]) && input[key] >= 0) state[key] = input[key]
  }
  return state
}

export function rememberMobileTab(scope, group, entry, { persist = true } = {}) {
  const path = sanitizeMobileNavigationPath(entry.path)
  if (!path || !GROUPS.has(group)) return
  const state = navigationState(entry.state)
  state.mobileTabGroup = group
  const next = { path, state, scrollY: Number.isFinite(entry.scrollY) ? Math.max(0, entry.scrollY) : 0 }
  const key = storageKey(scope, group)
  memory.set(key, next)
  if (persist) {
    try { browserStorage()?.setItem(key, JSON.stringify(next)) } catch {
      // Keep this session's in-memory navigation usable when browser storage is disabled.
    }
  }
}
