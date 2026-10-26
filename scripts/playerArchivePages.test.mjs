import assert from 'node:assert/strict'
import test from 'node:test'
import { PLAYER_ARCHIVE_PAGES, PLAYER_MATCHES_ANCHOR, getPlayerArchiveRedirect } from '../src/features/player-dossier/playerArchiveRoutes.js'

// 票 2.52: a player has two pages — 选手展厅 and 选手数据; the former 赛季征程 is 选手数据's 比赛记录.
test('the player pages are the showcase and the data page', () => {
  assert.deepEqual(PLAYER_ARCHIVE_PAGES.map(([key]) => key), ['profile', 'analysis'])
  assert.deepEqual(PLAYER_ARCHIVE_PAGES.map(([, zh]) => zh), ['选手展厅', '选手数据'])
})

test('the former journey page opens 比赛记录 on the data page, keeping context and the chosen match', () => {
  const url = new URL(getPlayerArchiveRedirect('/players/p%201/journey', '?season=FCW26&design=kpr5&lang=en&role=SUPPORT&pstage=SWISS&jmatch=M1'), 'http://localhost')
  assert.equal(url.pathname, '/players/p%201/analysis')
  assert.equal(url.hash, `#${PLAYER_MATCHES_ANCHOR}`)
  assert.deepEqual(Object.fromEntries(url.searchParams), { season: 'FCW26', design: 'kpr5', lang: 'en', role: 'SUPPORT', jmatch: 'M1', pview: 'matches' })
  assert.equal(new URL(getPlayerArchiveRedirect('/players/p/journey/'), 'http://localhost').pathname, '/players/p/analysis')
})

test('current player pages are never redirected', () => {
  for (const path of ['/players/p', '/players/p/', '/players/p/analysis', '/players/journey']) assert.equal(getPlayerArchiveRedirect(path, '?season=S'), null, path)
})
