// 票 2.42: a team has two pages — 展厅 (/teams/:id) for the team's story and 数据
// (/teams/:id/analysis) for results and analysis. The former 赛季征程 page is split between
// them: its chronicle is the 展厅's "这一季" section, its match ledger the 数据 page's
// "赛程赛果" section. This module stays free of data helpers so the router can import it.
export const TEAM_SEASON_ANCHOR = 'team-season'
export const TEAM_MATCHES_ANCHOR = 'team-matches'

const LEGACY_VIEW_KEYS = ['chapter', 'tab', 'journeyView']
const archiveBase = pathname => String(pathname || '').replace(/\/(?:journey|analysis)\/?$/, '').replace(/\/$/, '')
const isPath = (pathname, page) => new RegExp(`/${page}/?$`).test(String(pathname || ''))

export function getDossierView(pathname) {
  return isPath(pathname, 'analysis') ? 'analysis' : 'gallery'
}

// Switching pages keeps the season, language and selections; legacy view keys are dropped.
export function getDossierViewHref(pathname, search, view, anchor = '') {
  const params = new URLSearchParams(search)
  for (const key of LEGACY_VIEW_KEYS) params.delete(key)
  const query = params.toString()
  return `${archiveBase(pathname)}${view === 'analysis' ? '/analysis' : ''}${query ? `?${query}` : ''}${anchor ? `#${anchor}` : ''}`
}

// Old links still land on the content they pointed to:
// /journey (chronicle)                         → 展厅 #team-season
// /journey?journeyView=records, ?chapter=journey, ?tab=matches → 数据 #team-matches
// ?chapter=maps|records, ?tab=stats            → 数据
// ?chapter=roster|season-route                 → 展厅 (season-route keeps its match in 这一季)
export function getTeamArchiveRedirect(pathname, search = '', hash = '') {
  const params = new URLSearchParams(search)
  const journey = isPath(pathname, 'journey')
  if (!journey && !LEGACY_VIEW_KEYS.some(key => params.has(key))) return null
  const chapter = params.get('chapter') || ({ matches: 'journey', stats: 'records' })[params.get('tab')] || ''
  const ledger = params.get('journeyView') === 'records' || chapter === 'journey'
  const analysis = ledger || ['maps', 'records'].includes(chapter) || isPath(pathname, 'analysis')
  const season = !analysis && (chapter === 'season-route' || (journey && !chapter))
  const anchor = ledger ? TEAM_MATCHES_ANCHOR : season ? TEAM_SEASON_ANCHOR : String(hash || '').replace(/^#/, '')
  return getDossierViewHref(pathname, search, analysis ? 'analysis' : 'gallery', anchor)
}

// A stage chip (team index, stage analysis) opens the 数据 ledger filtered to that stage.
export function getTeamStageLedgerHref(teamPath, stage) {
  const [path, search = ''] = String(teamPath).split('#')[0].split('?')
  const params = new URLSearchParams(search)
  for (const key of [...LEGACY_VIEW_KEYS, 'result', 'teamMatch']) params.delete(key)
  params.set('teamStage', stage)
  params.set('journey', 'all')
  return getDossierViewHref(path, `?${params}`, 'analysis', TEAM_MATCHES_ANCHOR)
}
