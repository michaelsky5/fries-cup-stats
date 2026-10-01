import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMobileTabTarget, getMobileNavigationGroup, getMobileNavigationScope, readMobileTab, rememberMobileTab, sanitizeMobileNavigationPath } from '../src/components/layout/mobileNavigation.js'
import { getRoomPanel, getRoomPanelNavigation } from '../src/features/weekly-competition/roomPanelNavigation.js'

test('returning to a Tab preserves query, sort, page, comparisons and scroll', () => {
  const entry = { path: '/leaderboard?season=FCR2026&q=石头&page=2&sort=heal&compare=p1&compare=p2', scrollY: 428 }
  const target = buildMobileTabTarget(entry, '/leaderboard?season=FCR2026&lang=en', 'database')
  const url = new URL(target.to, 'https://test.invalid')
  assert.equal(url.searchParams.get('q'), '石头')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('sort'), 'heal')
  assert.deepEqual(url.searchParams.getAll('compare'), ['p1', 'p2'])
  assert.equal(url.searchParams.get('lang'), 'en')
  assert.equal(target.state.restoreScrollY, 428)
})

test('a player detail stays in its source Tab, including nested match navigation', () => {
  assert.equal(getMobileNavigationGroup({ pathname: '/players/p1', state: { returnTo: '/leaderboard?q=石头' } }), 'database')
  assert.equal(getMobileNavigationGroup({ pathname: '/players/p1', state: { returnTo: '/matches/m1', parentReturnTo: '/leaderboard' } }), 'database')
  assert.equal(getMobileNavigationGroup({ pathname: '/players/p1', state: { returnTo: '/roster' } }), 'overview')
  assert.equal(getMobileNavigationGroup({ pathname: '/matches/m1', state: { returnTo: '/me?section=matches' } }), 'space')
  assert.equal(getMobileNavigationGroup({ pathname: '/matches' }), 'matches')
})

test('a deep Tab destination retains the source return URL and scroll', () => {
  const scope = getMobileNavigationScope('/?season=FCR2026', 'database')
  rememberMobileTab(scope, 'database', { path: '/players/p1?season=FCR2026', state: { returnTo: '/leaderboard?season=FCR2026&q=石头', returnScrollY: 231 }, scrollY: 100 })
  const target = buildMobileTabTarget(readMobileTab(scope, 'database'), '/leaderboard?season=FCR2026', 'database')
  assert.match(target.to, /^\/players\/p1/)
  assert.equal(target.state.returnScrollY, 231)
  assert.equal(new URL(target.state.returnTo, 'https://test.invalid').searchParams.get('q'), '石头')
  assert.equal(getMobileNavigationGroup({ pathname: '/players/p1', state: target.state }), 'database')
})

test('season and competition scopes are isolated and stale season links are rejected', () => {
  const oldScope = getMobileNavigationScope('/?season=FCR2026', 'database')
  const newScope = getMobileNavigationScope('/?season=FCW2026', 'database')
  assert.notEqual(oldScope, newScope)
  assert.equal(readMobileTab(newScope, 'database'), null)
  assert.notEqual(getMobileNavigationScope('/?season=FCW2026&competition=a', 'space', 'u1'), getMobileNavigationScope('/?season=FCW2026&competition=b', 'space', 'u1'))
  assert.deepEqual(buildMobileTabTarget({ path: '/leaderboard?season=FCR2026&q=old' }, '/leaderboard?season=FCW2026', 'database'), { to: '/leaderboard?season=FCW2026' })
})

test('personal navigation cannot follow a different account while public filters are shared', () => {
  const one = getMobileNavigationScope('/?season=FCW2026', 'space', 'u1')
  const two = getMobileNavigationScope('/?season=FCW2026', 'space', 'u2')
  rememberMobileTab(one, 'space', { path: '/me?section=tasks', scrollY: 30 })
  assert.equal(readMobileTab(two, 'space'), null)
  assert.equal(getMobileNavigationScope('/?season=FCW2026', 'database', 'u1'), getMobileNavigationScope('/?season=FCW2026', 'database', 'u2'))
})

test('remembered state contains no credentials, form values or invitation destinations', () => {
  assert.equal(sanitizeMobileNavigationPath('/participate/FCW2026?invitation=private'), '')
  assert.equal(sanitizeMobileNavigationPath('/auth/staff?token=private'), '')
  assert.equal(sanitizeMobileNavigationPath('//outside.invalid'), '')
  assert.equal(sanitizeMobileNavigationPath('/\\\\outside.invalid'), '')
  const scope = getMobileNavigationScope('/?season=FCW2026', 'space', 'privacy-test')
  rememberMobileTab(scope, 'space', { path: '/account?password=secret&token=secret#email', state: { password: 'secret', form: { email: 'private' } }, scrollY: 0 })
  const saved = readMobileTab(scope, 'space')
  assert.equal(saved.path, '/account#email')
  assert.deepEqual(saved.state, { mobileTabGroup: 'space' })
})

test('a destination from another top-level section falls back to the correct root', () => {
  assert.deepEqual(buildMobileTabTarget({ path: '/matches?season=FCR2026' }, '/leaderboard?season=FCR2026', 'database'), { to: '/leaderboard?season=FCR2026' })
})

test('switching language also updates the detail return links without restoring private state', () => {
  const target = buildMobileTabTarget({ path: '/players/p1?season=FCR2026&lang=zh', state: {
    returnTo: '/matches/m1?season=FCR2026&lang=zh&map=2&token=private', parentReturnTo: '/leaderboard?q=石头&lang=zh',
    returnScrollY: 123, draft: 'private'
  } }, '/leaderboard?season=FCR2026&lang=en', 'database')
  assert.equal(new URL(target.state.returnTo, 'https://test.invalid').searchParams.get('lang'), 'en')
  assert.equal(new URL(target.state.returnTo, 'https://test.invalid').searchParams.get('map'), '2')
  assert.equal(new URL(target.state.parentReturnTo, 'https://test.invalid').searchParams.get('q'), '石头')
  assert.equal(target.state.returnScrollY, 123)
  assert.equal(target.state.draft, undefined)
  assert.equal(target.state.returnTo.includes('private'), false)
})

test('weekly navigation retains the selected entry and step, not invitation data', () => {
  const target = buildMobileTabTarget({ path: '/me?section=team&competition=FCW26&entry=e1&week=w1&step=roster&manage=members&invitation=private' }, '/me?season=FCW2026&competition=FCW26', 'space')
  const url = new URL(target.to, 'https://test.invalid')
  for (const [key, value] of [['entry', 'e1'], ['week', 'w1'], ['step', 'roster'], ['manage', 'members']]) assert.equal(url.searchParams.get(key), value)
  assert.equal(url.searchParams.has('invitation'), false)
})

test('personal progress, selected match and followed-match filters survive Tab navigation', () => {
  for (const path of ['/me?section=overview&journey=preparation%3Ae1%3Aw1', '/me?section=matches&weeklyMatch=m1', '/me?section=following&followView=matches&followState=upcoming&follow=team%3At1']) {
    const target = buildMobileTabTarget({ path }, '/me?season=FCW2026&competition=FCW26', 'space')
    const expected = new URL(path, 'https://test.invalid')
    const actual = new URL(target.to, 'https://test.invalid')
    expected.searchParams.forEach((value, key) => assert.equal(actual.searchParams.get(key), value))
  }
})

test('room panels use one history entry and Back returns to the same room', () => {
  const room = { pathname: '/weekly/matches/m1/room', search: '?lang=zh', hash: '', key: 'room-base', state: { returnTo: '/me?section=matches' } }
  const open = getRoomPanelNavigation(room, 'm1', 'more')
  assert.equal(open.options.replace, false)
  assert.deepEqual(open.to, { pathname: room.pathname, search: room.search, hash: '' })
  const switchPanel = getRoomPanelNavigation({ ...room, state: open.options.state }, 'm1', 'records')
  assert.equal(switchPanel.options.replace, true)
  assert.equal(switchPanel.options.state.roomPanel.originKey, 'room-base')
  assert.equal(switchPanel.options.state.returnTo, room.state.returnTo)
  assert.deepEqual(getRoomPanelNavigation({ ...room, state: switchPanel.options.state }, 'm1', ''), { to: -1 })
  assert.equal(getRoomPanel(open.options.state, 'm2'), null)
  assert.equal(getRoomPanel(room.state, 'm1'), null)
})

test('public detail analysis and match comparison resume the chosen view', () => {
  const analysis = buildMobileTabTarget({ path: '/players/p1/analysis?role=SUPPORT&pview=heroes&hfocus=kiriko&phero=kiriko&pmode=per10', state: { returnTo: '/leaderboard?q=石头&preview=p1%3ASUPPORT' } }, '/leaderboard?season=FCR2026', 'database')
  const url = new URL(analysis.to, 'https://test.invalid')
  assert.equal(url.searchParams.get('pview'), 'heroes')
  assert.equal(url.searchParams.get('hfocus'), 'kiriko')
  assert.equal(url.searchParams.get('pmode'), 'per10')
  assert.equal(new URL(analysis.state.returnTo, 'https://test.invalid').searchParams.get('preview'), 'p1:SUPPORT')
  const match = buildMobileTabTarget({ path: '/matches/m1?map=2&pview=compare&compareA=p1&compareB=p2' }, '/matches?season=FCR2026', 'matches')
  assert.equal(new URL(match.to, 'https://test.invalid').searchParams.get('compareB'), 'p2')
})
