import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { GUIDE_ROLES, GUIDE_STEPS, GUIDE_SCENARIOS, guideContextForRoom, guideLessons, guidePracticeUrl, guideReturnPath, guideRoleForMatch, readGuideContext, roomGuideUrl } from '../src/features/room-guide/roomGuideModel.js'

test('room guidance uses current representative and referee authority, not captain identity alone', () => {
  const data = { actor: { label: 'A · 队长' }, access: { representativeTeams: [], operatorMode: 'TEAM_CAPTAINS' }, preparation: {}, maps: [], opening: { complete: false, phase: 'BANNING' }, map: { lineupA: [], lineupB: [] }, match: { id: 'MATCH-1', seasonId: 'TEST26' } }
  assert.deepEqual(guideContextForRoom(data), { role: 'manager', step: 'lineup', mode: 'captains', match: 'MATCH-1', season: 'TEST26' })
  assert.equal(guideContextForRoom({ ...data, access: { ...data.access, representativeTeams: ['A'] } }).role, 'representative')
  assert.equal(guideContextForRoom({ ...data, access: { staff: true } }).role, 'referee')
  assert.equal(guideContextForRoom({ ...data, access: { staff: true, administrator: true } }).role, 'admin')
  assert.equal(guideContextForRoom({ ...data, actor: { label: '本场解说' }, access: { production: true } }).role, 'caster')
  assert.equal(guideContextForRoom({ ...data, actor: { label: 'A · 选手' }, access: {} }).role, 'member')
  assert.equal(guideRoleForMatch({ roleLabel: '本场赛管' }), 'referee')
  assert.equal(guideRoleForMatch({ roleLabel: '本场解说' }), 'caster')
})

test('deep links retain correct stages including paused, map review and series results', () => {
  const base = { maps: [], preparation: {}, access: {} }
  for (const [data, step] of [[{ phase: 'PAUSED' }, 'live'], [{ phase: 'REVIEW' }, 'map-result'], [{ result: { phase: 'DISPUTED' } }, 'result'], [{ opening: { complete: false, phase: 'CHOOSING' } }, 'map'], [{ opening: { complete: false, phase: 'BANNING' }, map: { lineupA: [1,2,3,4,5], lineupB: [1,2,3,4,5] } }, 'ban']]) {
    assert.equal(guideContextForRoom({ ...base, ...data }).step, step)
  }
  assert.equal(guideContextForRoom(null).step, 'entry')
})

test('shared reading links drop match, season and arbitrary sensitive query values', () => {
  const url = new URL(roomGuideUrl({ role: 'caster', step: 'live', scenario: 'broadcast', mode: 'captains', match: 'PRIVATE-MATCH', season: 'TRAIN-123', token: 'secret' }, 'ko-KR', { share: true }), 'https://stats.example')
  assert.equal(url.searchParams.get('lang'), 'ko')
  assert.equal(url.searchParams.get('role'), 'caster')
  for (const key of ['match','season','token']) assert.equal(url.searchParams.has(key), false)
  assert.equal(url.pathname, '/guides/weekly-room')
  assert.equal(new URL(guideReturnPath({ match: '//attacker.test' }, 'en-US'), 'https://stats.example').pathname, '/me')
  assert.equal(new URL(guideReturnPath({ match: 'MATCH-1' }, 'zh-TW'), 'https://stats.example').pathname, '/me/matches/MATCH-1/room')
  const accountReturn = new URL(guideReturnPath({ season: 'TRAIN-123' }, 'en-US'), 'https://stats.example')
  assert.equal(accountReturn.searchParams.get('competition'), 'TRAIN-123')
  assert.equal(accountReturn.searchParams.has('season'), false)
})

test('malformed reading preferences fall back, and practice can only link to the fixed System route', () => {
  const context = readGuideContext(new URLSearchParams('role=ROOT&step=delete&scenario=unknown&mode=admin&match=../x'))
  assert.equal(context.role, 'representative'); assert.equal(context.step, 'entry'); assert.equal(context.scenario, ''); assert.equal(context.match, '')
  for (const url of ['javascript:alert(1)','https://user:pass@admin.example','garbage']) assert.equal(guidePracticeUrl(url), '')
  assert.equal(guidePracticeUrl('https://admin.example/untrusted?token=secret'), 'https://admin.example/tournaments?view=coordination#weekly-training')
})

test('all six courses and contextual stages have complete copy in all four languages', () => {
  const copy = JSON.parse(readFileSync(new URL('../src/features/room-guide/roomGuideCopy.json', import.meta.url)))
  for (const locale of ['zh-CN','zh-TW','en-US','ko-KR']) {
    assert.deepEqual(Object.keys(copy[locale]).sort(), Object.keys(copy['zh-CN']).sort())
    for (const role of GUIDE_ROLES) {
      assert.ok(copy[locale][`role.${role}`]); assert.ok(copy[locale][`intro.${role}`])
      assert.ok(guideLessons(role, 'result').includes('result'))
    }
    for (const step of GUIDE_STEPS) for (const field of ['title','who','where','action','success','trouble']) assert.ok(copy[locale][`step.${step}.${field}`]?.trim(), `${locale} ${step} ${field}`)
    for (const key of GUIDE_SCENARIOS) for (const field of ['title','body','who']) assert.ok(copy[locale][`case.${key}.${field}`]?.trim())
  }
  for (const value of Object.values(copy['en-US'])) assert.doesNotMatch(value, /[\u3400-\u9fff]/)
  assert.notEqual(copy['zh-TW'].title, copy['zh-CN'].title)
})
