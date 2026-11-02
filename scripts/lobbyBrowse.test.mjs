import assert from 'node:assert/strict'
import test from 'node:test'
import { drawLobbyCards, reconcileLobbyDraw, filterLobbyCards, lobbyBrowseQuery, updateLobbyBrowseQuery } from '../src/features/team-lobby/lobbyBrowseModel.js'
import { safeLobbyReturn } from '../src/features/team-lobby/lobbyModel.js'
const now = Date.parse('2026-10-29T09:00:00Z')
const at = hours => new Date(now + hours * 3600000).toISOString()
const card = (id, extra = {}) => ({ publicId: id, kind: 'PERSON', title: id, roles: ['SUP'], level: '支援 大师 3', availability: '周六晚上', goal: '固定训练', bio: '能开麦', heroes: '安娜', qqMode: 'REQUEST', confirmedAt: at(-2), expiresAt: at(48), ...extra })

test('pagination moves to the requested page while changed filters return to page one', () => {
  const previous = new URLSearchParams('type=teams&page=1&role=SUP&teamState=forming&lang=en')
  const next = updateLobbyBrowseQuery(previous, 'page', '2')
  assert.equal(next.get('page'), '2')
  assert.equal(updateLobbyBrowseQuery(next, 'q', 'River').get('page'), '1')
  const people = updateLobbyBrowseQuery(next, 'type', 'people')
  assert.equal(people.has('teamState'), false)
  assert.equal(people.get('role'), 'SUP')
  assert.equal(people.get('lang'), 'en')
  assert.equal(previous.get('page'), '1')
})

test('combined filters search authored text without inferring a certified rank or schedule', () => {
  const rows = [card('North'), card('wrong-role', { roles: ['DPS'] }), card('wrong-time', { availability: '周日白天' }), card('no-rank', { level: '' })]
  assert.deepEqual(filterLobbyCards(rows, { query: 'ｎＯＲＴＨ 开麦', role: 'SUP', level: '大师', availability: '周六' }, now).map(row => row.publicId), ['North'])
  assert.equal(filterLobbyCards(rows, { availability: '周末' }, now).length, 0)
  assert.equal(rows[0].level, '支援 大师 3')
})

test('expiry, visibility, QQ consent mode, confirmation recency and team status combine', () => {
  const rows = [card('match', { kind: 'TEAM', forming: true, qqMode: 'VERIFIED' }), card('expired', { expiresAt: at(0) }), card('hidden', { state: 'HIDDEN' }), card('old', { confirmedAt: at(-80) }), card('established', { kind: 'TEAM', forming: false, qqMode: 'VERIFIED' })]
  assert.deepEqual(filterLobbyCards(rows, { qqMode: 'VERIFIED', recent: 'day', teamState: 'forming' }, now).map(row => row.publicId), ['match'])
  assert.deepEqual(filterLobbyCards(rows, {}, now).map(row => row.publicId).sort(), ['established', 'match', 'old'])
})

test('sorts are deterministic and leave the original cards untouched', () => {
  const rows = [card('new', { expiresAt: at(24) }), card('old', { confirmedAt: at(-12), expiresAt: at(2) })]
  assert.deepEqual(filterLobbyCards(rows, { sort: 'expiring' }, now).map(row => row.publicId), ['old', 'new'])
  assert.deepEqual(rows.map(row => row.publicId), ['new', 'old'])
})

test('draws contain at most three unique matches and avoid the previous group when possible', () => {
  const rows = Array.from({ length: 8 }, (_, index) => card(String(index)))
  const first = drawLobbyCards(rows, [], () => .25)
  const next = drawLobbyCards(rows, first, () => .75)
  assert.equal(new Set(first.map(row => row.publicId)).size, 3)
  assert.equal(new Set(next.map(row => row.publicId)).size, 3)
  assert.equal(next.some(row => first.some(old => row.publicId === old.publicId)), false)
  assert.deepEqual(rows.map(row => row.publicId), ['0', '1', '2', '3', '4', '5', '6', '7'])
  for (const length of [0, 1, 2, 3]) assert.equal(drawLobbyCards(rows.slice(0, length)).length, length)
  const limited = drawLobbyCards([...rows.slice(0, 4), rows[0]], rows.slice(0, 3), () => .5)
  assert.equal(limited.some(row => row.publicId === '3'), true)
  assert.equal(new Set(limited.map(row => row.publicId)).size, 3)
})

test('expiry replaces only the expired card and retains the other cards in reading order', () => {
  const rows = ['A', 'B', 'C', 'D', 'E'].map(id => card(id, id === 'A' ? { expiresAt: at(.01) } : {}))
  const next = reconcileLobbyDraw(filterLobbyCards(rows, {}, now + 60000), rows.slice(0, 3), () => 0)
  assert.deepEqual(next.slice(1).map(row => row.publicId), ['B', 'C'])
  assert.equal(next.length, 3)
  assert.equal(next.some(row => row.publicId === 'A'), false)
  assert.equal(new Set(next.map(row => row.publicId)).size, 3)
  const updated = { ...rows[1], bio: 'updated' }
  const stable = reconcileLobbyDraw([updated, rows[2]], next, () => 0)
  assert.deepEqual(stable.map(row => row.publicId), ['B', 'C'])
  assert.equal(stable[0], updated)
  assert.deepEqual(reconcileLobbyDraw([], stable), [])
})

test('one bounded page carries all active filters to the server without reading a card pool', () => {
  const query = lobbyBrowseQuery({ type: 'teams', role: 'SUP', q: '河流 & 100%', level: '大师', time: '周六',
    qq: 'VERIFIED', recent: 'day', teamState: 'forming', sort: 'expiring', page: 4, pageSize: 6 })
  assert.deepEqual(Object.fromEntries(query), { kind: 'TEAM', role: 'SUP', q: '河流 & 100%', level: '大师', time: '周六',
    qq: 'VERIFIED', recent: 'day', teamState: 'forming', sort: 'expiring', page: '4', pageSize: '6' })
  assert.match(query.toString(), /q=%E6%B2%B3%E6%B5%81\+%26\+100%25/)
})

test('exploration sends at most three distinct keep/exclude IDs and never downloads pages', () => {
  const query = lobbyBrowseQuery({ type: 'teams', q: 'night', role: 'DPS', qq: 'REQUEST', page: 900, pageSize: 50,
    sort: 'expiring', keep: ['a', 'a', 'b', 'c', 'd'], exclude: ['x', 'y', 'x', 'z', 'w'] }, { explore: true })
  assert.deepEqual(Object.fromEntries(query), { kind: 'TEAM', q: 'night', role: 'DPS', qq: 'REQUEST', keep: 'a,b,c', exclude: 'x,y,z' })
})

test('pagination bounds are integers and person browsing ignores team-only state', () => {
  const query = lobbyBrowseQuery({ type: 'people', page: 2.9, pageSize: 500, teamState: 'forming', role: 'all', recent: 'all' })
  assert.deepEqual(Object.fromEntries(query), { kind: 'PERSON', page: '2', pageSize: '50', sort: 'recent' })
  assert.equal(lobbyBrowseQuery({ page: -1, pageSize: -3 }).get('pageSize'), '1')
  assert.equal(lobbyBrowseQuery({ page: Infinity }).get('page'), '10000')
})

test('return destinations preserve discovery filters but still discard private contact values', () => {
  assert.equal(safeLobbyReturn('/lobby?type=people&role=SUP&view=explore&level=大师&qq=VERIFIED'), '/lobby?type=people&role=SUP&view=explore&level=%E5%A4%A7%E5%B8%88&qq=VERIFIED')
  assert.equal(safeLobbyReturn('/lobby?qq=12345678&verifyEmail=secret&view=explore'), '/lobby?view=explore')
})
