import assert from 'node:assert/strict'
import test from 'node:test'
import { getStaffDirectoryGroup, normalizeStaffDirectorySearch } from '../src/lib/staffDirectoryGroups.js'
import { buildRosterQueryState, filterStaff, sortStaff } from '../src/lib/rosterSelectors.js'
import { withSeason } from '../src/config/seasons.js'
import { getDataCenterPageLabel } from '../src/lib/pageTitle.js'

test('legacy staff links resolve by role, selected record or team before the event default', () => {
  for (const [search, group] of [
    ['', 'event'], ['group=unknown', 'event'], ['type=manager', 'team'], ['role=coach', 'team'],
    ['type=admin', 'event'], ['type=caster', 'event'], ['team=FCR26-T026', 'team'],
    ['rosterFocus=event:caster:person', 'event'], ['rosterFocus=FCR26-T026:person', 'team']
  ]) assert.equal(getStaffDirectoryGroup(search), group, search)
})

test('explicit categories take priority over incompatible legacy roles and selections', () => {
  assert.equal(getStaffDirectoryGroup('group=event&type=manager&rosterFocus=TEAM:person'), 'event')
  assert.equal(getStaffDirectoryGroup('group=team&type=caster&rosterFocus=event:caster:person'), 'team')
})

test('clearing a migrated role filter keeps its directory and preserves site context', () => {
  const params = normalizeStaffDirectorySearch('role=coach&season=FCR26&design=kpr5&lang=en&competition=weekly')
  assert.equal(params.get('type'), 'coach')
  assert.equal(params.has('role'), false)
  params.delete('type')
  assert.equal(getStaffDirectoryGroup(params), 'team')
  for (const [key, value] of [['season', 'FCR26'], ['design', 'kpr5'], ['lang', 'en'], ['competition', 'weekly']]) assert.equal(params.get(key), value)
})

test('incompatible event filters cannot produce a false empty list or retain a stale page', () => {
  const params = normalizeStaffDirectorySearch('group=event&type=coach&team=TEAM&sort=team&page=8&rosterFocus=TEAM:coach&q=Shared&pageSize=40')
  assert.equal(params.get('q'), 'Shared')
  assert.equal(params.get('pageSize'), '40')
  for (const key of ['type', 'team', 'sort', 'page', 'rosterFocus']) assert.equal(params.has(key), false, key)
  const rows = [{ id: 'event:admin:shared', name: 'Shared', roles: ['admin'], team: null }]
  assert.deepEqual(filterStaff(rows, buildRosterQueryState(params, 'staff')), rows)
})

test('team records retain combined roles and team filters when a legacy URL is normalized', () => {
  const rows = [
    { id: 'A:shared', name: 'Shared', roles: ['manager', 'coach'], team: { routeId: 'A' } },
    { id: 'B:shared', name: 'Shared', roles: ['coach'], team: { routeId: 'B' } }
  ]
  const params = normalizeStaffDirectorySearch('role=coach&team=A&sort=team&page=2&rosterFocus=A:shared')
  assert.equal(params.get('page'), '2')
  assert.equal(params.get('rosterFocus'), 'A:shared')
  assert.equal(params.get('sort'), 'team')
  assert.deepEqual(filterStaff(rows, buildRosterQueryState(params, 'staff')).map(row => row.id), ['A:shared'])
})

test('cross-category focus is removed while valid event selections and pagination survive', () => {
  assert.equal(normalizeStaffDirectorySearch('group=team&rosterFocus=event:caster:a').has('rosterFocus'), false)
  const original = normalizeStaffDirectorySearch('group=event&type=caster&page=2&rosterFocus=event:caster:a')
  assert.equal(original.get('page'), '2')
  assert.equal(original.get('rosterFocus'), 'event:caster:a')
  assert.equal(normalizeStaffDirectorySearch(original).toString(), original.toString())
})

test('category navigation starts clean while preserving the selected season and language', () => {
  const href = withSeason('/staff?group=event', 'QGCS4', '?design=kpr5&lang=en&group=team&type=coach&team=A&page=3&q=Shared&rosterFocus=A:shared')
  const target = new URL(href, 'http://localhost')
  assert.equal(target.pathname, '/staff')
  assert.equal(target.searchParams.get('group'), 'event')
  assert.equal(target.searchParams.get('season'), 'QGCS4')
  assert.equal(target.searchParams.get('lang'), 'en')
  assert.equal(target.searchParams.get('design'), 'kpr5')
  for (const key of ['type', 'team', 'page', 'q', 'rosterFocus']) assert.equal(target.searchParams.has(key), false, key)
})

test('browser titles distinguish the categories and retain the original directory title', () => {
  assert.equal(getDataCenterPageLabel('/staff', '?design=kpr5&type=coach'), '战队职员')
  assert.equal(getDataCenterPageLabel('/staff', '?group=event'), '赛事职员')
  assert.equal(getDataCenterPageLabel('/staff', '?design=original'), '赛事人员')
  assert.equal(getDataCenterPageLabel('/staff', '?design=original&group=team'), '赛事人员')
})

test('credit sorting spans roles, resolves equal counts by name, and does not mutate records', () => {
  const rows = [
    { id: 'official:first', name: 'Aaron', role: 'admin', matchCount: 2 },
    { id: 'caster:most', name: 'Zoe', role: 'caster', matchCount: 27 },
    { id: 'official:tie', name: 'Bea', role: 'admin', matchCount: 20 },
    { id: 'caster:tie', name: 'Amy', role: 'caster', matchCount: 20 },
    { id: 'official:unknown', name: 'Unpublished', role: 'admin' }
  ]
  assert.deepEqual(sortStaff(rows, 'matches').map(row => row.name), ['Zoe', 'Amy', 'Bea', 'Aaron', 'Unpublished'])
  assert.deepEqual(sortStaff(rows, 'name').map(row => row.name), ['Aaron', 'Amy', 'Bea', 'Unpublished', 'Zoe'])
  assert.deepEqual(sortStaff(rows, 'default').map(row => row.name), ['Aaron', 'Bea', 'Unpublished', 'Amy', 'Zoe'])
  assert.equal(rows[0].name, 'Aaron')
})

test('event sorting survives filters and explicit role order, while team records reject credit sorting', () => {
  for (const sort of ['matches', 'name', 'default']) {
    const params = normalizeStaffDirectorySearch(`group=event&type=caster&sort=${sort}&page=2`)
    assert.equal(params.get('sort'), sort)
    assert.equal(params.get('page'), '2')
  }
  const team = normalizeStaffDirectorySearch('group=team&sort=matches&page=2&rosterFocus=TEAM:manager')
  for (const key of ['sort', 'page', 'rosterFocus']) assert.equal(team.has(key), false, key)
  assert.equal(team.get('group'), 'team')
})
