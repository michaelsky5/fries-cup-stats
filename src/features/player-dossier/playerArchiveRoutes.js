// 票 2.52: a player has two pages — 选手展厅 (/players/:id) and 选手数据 (/players/:id/analysis).
// The former 赛季征程 page (/journey) was the full match list; it now lives in the data page's
// 比赛记录 tab. This module stays free of data helpers so the router can import it.
export const PLAYER_MATCHES_ANCHOR = 'player-history'

export const PLAYER_ARCHIVE_PAGES = [
  ['profile', '选手展厅', 'Showcase', '선수 전시실', '選手展廳'],
  ['analysis', '选手数据', 'Player data', '선수 데이터', '選手數據']
]

export function getPlayerArchiveRedirect(pathname, search = '') {
  const base = String(pathname || '').match(/^(.*\/players\/[^/]+)\/journey\/?$/)?.[1]
  if (!base) return null
  const params = new URLSearchParams(search)
  params.delete('pstage')
  params.set('pview', 'matches')
  return `${base}/analysis?${params}#${PLAYER_MATCHES_ANCHOR}`
}
