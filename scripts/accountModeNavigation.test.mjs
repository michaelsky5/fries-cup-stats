import assert from 'node:assert/strict'
import { test } from 'node:test'
import { systemManagementLink } from '../src/features/auth/systemManagementLink.js'

test('entering System carries the chosen competition instead of the public archive', () => {
  const url = new URL(systemManagementLink({ search: '?season=FCR2026&competition=WEEKLY_A', seasonId: 'FCR26', base: 'http://127.0.0.1:5193' }))
  assert.equal(url.origin, 'http://127.0.0.1:5193')
  assert.equal(url.pathname, '/account-mode')
  assert.equal(url.searchParams.get('seasonId'), 'WEEKLY_A')
  assert.equal(url.searchParams.get('returnTo'), '/dashboard')
})

test('an existing task takes precedence over a later public or competition selection', () => {
  const original = '/settings/governance?seasonId=OFFICIAL_A&intervention=request-1&taskReturnTo=%2Ftasks%3Fview%3DMINE'
  const search = new URLSearchParams({ systemReturnTo: original, systemSeason: 'OLD_EVENT', competition: 'PARTNER_B' }).toString()
  const url = new URL(systemManagementLink({ search }))
  assert.equal(url.searchParams.get('returnTo'), original)
  assert.equal(url.searchParams.get('seasonId'), 'OFFICIAL_A')
})

test('malformed or repeated cross-site parameters never become external redirects', () => {
  for (const value of ['//evil.example/tasks', '/\\evil.example/tasks', 'https://evil.example/tasks', '/account/reset?token=private', 'javascript:alert(1)']) {
    const url = new URL(systemManagementLink({ search: new URLSearchParams({ systemReturnTo: value }).toString() }))
    assert.equal(url.origin, 'https://admin.fries-cup.com')
    assert.equal(url.searchParams.get('returnTo'), '/dashboard')
  }
  const duplicate = new URL(systemManagementLink({ search: '?systemReturnTo=/tasks&systemReturnTo=/settings&competition=A&competition=B', seasonId: 'PUBLIC_A' }))
  assert.equal(duplicate.searchParams.get('returnTo'), '/dashboard')
  assert.equal(duplicate.searchParams.get('seasonId'), 'PUBLIC_A')
  for (const base of ['javascript:alert(1)', 'https://user:secret@example.test', 'invalid']) assert.equal(systemManagementLink({ base }), '')
})
