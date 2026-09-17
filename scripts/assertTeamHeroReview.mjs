import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTeamPerformance, getPerformanceRows, performanceRecordKey } from '../src/features/team-dossier/teamPerformance.js'
import { getHeroReview, getReviewBan, repeatedReviewContexts, scopeHeroReport } from '../src/features/team-dossier/teamHeroReview.js'
import { getOwHeroCanonicalKey } from '../src/lib/heroes.js'

const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const rows = getPerformanceRows(db.matches, 'FCR26-T026')
const report = buildTeamPerformance(rows, [{ player_id: 'absent', name: 'No appearances', role: 'SUP' }])
const keys = records => records.map(performanceRecordKey).sort()

test('hero appearances and bans are independent samples; every linked lineup uses the selected sample', () => {
  const before = JSON.stringify(report)
  const appeared = getHeroReview(report, { heroKey: '雾子' })
  const banned = getHeroReview(report, { heroKey: 'Kiriko', sample: 'opponent' })
  assert.equal(appeared.hero.key, 'kiriko')
  assert.equal(appeared.counts.recorded, 28)
  assert.equal(appeared.counts.opponent, 3)
  assert.equal(appeared.report.records.length, 28)
  assert.equal(banned.report.records.length, 3)
  assert.deepEqual(keys(banned.report.records), keys(report.bans.opponent.find(hero => hero.key === 'kiriko').records))
  for (const selection of [appeared, banned]) {
    const wanted = new Set(keys(selection.report.records))
    for (const lineup of selection.report.lineups) assert.ok(lineup.records.every(record => wanted.has(performanceRecordKey(record))))
    assert.deepEqual(keys(selection.report.lineups.flatMap(lineup => lineup.records)), keys(selection.report.records))
  }
  assert.equal(JSON.stringify(report), before)
})

test('player plus hero must match the same player entry, not a teammate on the same map', () => {
  const tank = report.members.find(member => member.role === 'TANK')
  const review = getHeroReview(report, { memberId: tank.id, heroKey: 'kiriko' })
  assert.equal(review.base.records.length, 32)
  assert.equal(review.report.records.length, 0)
  assert.equal(review.counts.opponent, 3)
  assert.ok(!review.heroes.some(hero => hero.key === 'kiriko'))
  for (const member of report.members.filter(member => member.maps)) {
    const selected = getHeroReview(report, { memberId: member.id, heroKey: 'kiriko' })
    const expected = report.records.filter(record => record.own.players.some(player => player.id === member.id && getOwHeroCanonicalKey(player.hero) === 'kiriko'))
    assert.deepEqual(keys(selected.report.records), keys(expected))
    const bans = getHeroReview(report, { memberId: member.id, heroKey: 'kiriko', sample: 'opponent' })
    assert.ok(bans.report.records.every(record => record.own.players.some(player => player.id === member.id)))
  }
})

test('repeated contexts group distinct series with matching opponent identity and map', () => {
  const review = getHeroReview(report, { heroKey: 'kiriko', sample: 'opponent' })
  assert.equal(review.repeated.length, 1)
  const [group] = review.repeated
  assert.equal(group.opponent, 'MASK')
  assert.equal(group.map, '斗兽场')
  assert.equal(group.records.length, 2)
  assert.equal(group.losses, 2)
  const [record] = group.records
  assert.deepEqual(repeatedReviewContexts([record, record, { ...record, mapIndex: 99 }]), [])
  assert.deepEqual(repeatedReviewContexts([record, { ...record, match: { ...record.match, match_id: 'different' }, opponent: { id: 'other-team' } }]), [])
})

test('stage and no-appearance selections remain empty and do not inherit season bans', () => {
  const swiss = buildTeamPerformance(rows.filter(row => row.match.stage === 'SWISS'))
  const review = getHeroReview(swiss, { heroKey: 'kiriko', sample: 'opponent' })
  assert.equal(review.hero.key, 'kiriko')
  assert.equal(review.counts.opponent, null)
  assert.deepEqual(review.report.records, [])
  const absent = getHeroReview(report, { heroKey: 'kiriko', memberId: 'absent' })
  assert.equal(absent.member.id, 'absent')
  assert.deepEqual(absent.heroes, [])
  assert.deepEqual(absent.report.lineups, [])
  assert.equal(absent.counts.opponent, null)
  const empty = getHeroReview(buildTeamPerformance([]), { heroKey: 'kiriko', sample: 'opponent' })
  assert.equal(empty.hero.key, 'kiriko')
  assert.equal(empty.counts.opponent, null)
  assert.deepEqual(empty.report.records, [])
})

test('scoping deduplicates map identities and keeps only named bans from that scope', () => {
  const record = report.bans.opponent.find(hero => hero.key === 'kiriko').records[0]
  const scoped = scopeHeroReport(report, [record, record])
  assert.equal(scoped.records.length, 1)
  assert.equal(scoped.lineups.flatMap(lineup => lineup.records).length, 1)
  assert.equal(scoped.bans.opponentCoverage, 1)
  assert.equal(scoped.bans.opponent.length, 1)
  assert.equal(scoped.bans.opponent[0].maps, 1)
})

test('missing bans, explicit no-ban and named bans keep distinct meanings on either side', () => {
  const record = { side: 'team_b', mapIndex: 0, match: { maps: [{ team_b_ban: '无', team_a_ban: 'Kiriko' }] } }
  assert.deepEqual(getReviewBan(record, 'own'), { kind: 'none' })
  assert.deepEqual(getReviewBan(record, 'opponent'), { kind: 'named', hero: 'Kiriko' })
  for (const value of [null, undefined, '', '-', 'unknown']) {
    record.match.maps[0].team_b_ban = value
    assert.deepEqual(getReviewBan(record, 'own'), { kind: 'unknown' })
  }
})
