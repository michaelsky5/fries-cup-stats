import { METRICS } from './centerModel.js'

export function createBrowseState() {
  return {
    roster: { kind: 'teams', query: '', role: 'all', teamId: '', page: 0 },
    database: { tab: 'points', metric: 'avg_elim', query: '', role: 'all', page: 0, mode: 'per10', direction: 'desc', teamId: '', hero: '', minTime: false, showInsufficient: true, following: false, sortKey: '', allColumns: false, comparisonKeys: [] },
    matches: { query: '', teamId: '', stage: '', round: '', status: 'all', format: '', page: 0 },
    maps: { query: '', mode: '', sort: 'plays', page: 0 },
    heroes: { query: '', role: '', sort: 'records', map: '', player: '', page: 0 },
    staff: { query: '', role: '', group: '', page: 0 },
    review: { query: '', identity: 'all', page: 0 },
    advance: { phase: '', page: 0 }
  }
}

// Browsing stays in the page controller so switching a tab or refreshing the
// public snapshot cannot discard a directory's search, filters or page.
export function updateBrowseState(state, view, patch) {
  if (!state[view]) return state
  const current = state[view]
  const next = { ...current }
  for (const key of Object.keys(current)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) next[key] = patch[key]
  }
  next.query = String(next.query || '').slice(0, 60)
  if (['roster', 'database'].includes(view)) next.role = ['all', 'TANK', 'DPS', 'SUPPORT', 'FLEX'].includes(next.role) ? next.role : 'all'
  if (view === 'roster') {
    next.kind = next.kind === 'players' ? 'players' : 'teams'
    next.teamId = String(next.teamId || '')
  } else if (view === 'database') {
    next.tab = next.tab === 'players' ? 'players' : 'points'
    if (![...METRICS.map(([key]) => key), 'score', 'elim', 'ast', 'dth', 'dmg', 'heal', 'block'].includes(next.metric)) next.metric = 'avg_elim'
    if (next.role === 'FLEX') next.role = 'all'
  }
  next.page = Number.isFinite(Number(next.page)) ? Math.max(0, Math.floor(Number(next.page))) : 0
  if (Object.keys(current).some(key => !['page', 'tab'].includes(key) && next[key] !== current[key])) next.page = 0
  return { ...state, [view]: next }
}

export function pageForCount(page, count) {
  const requested = Number.isFinite(Number(page)) ? Math.max(0, Math.floor(Number(page))) : 0
  return Math.min(requested, Math.max(0, Math.ceil(count / 20) - 1))
}
