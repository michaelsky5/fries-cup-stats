import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyCurrentTeamLogos, hydrateCurrentTeamLogos } from '../src/lib/currentTeamLogos.js'
import { getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'

const fixture = () => ({ meta: { version: 16 }, teams: [{ team_id: 'A', team_logo: 'https://old.test/a.png', points: 9 }], matches: [{ id: 'M', score_a: 4, team_a: { team_id: 'A', logoUrl: 'https://old.test/a.png', score: 4 }, team_b: { team_id: 'B', score: 1 } }] })
test('current logos update team and match consumers without changing publication facts or unknown teams', () => {
  const db = fixture(), before = structuredClone(db)
  const result = applyCurrentTeamLogos(db, { logos: [{ teamId: 'A', logoUrl: 'https://new.test/a.webp' }, { teamId: 'B', logoUrl: 'https://private.test/b.webp' }] })
  assert.equal(result.teams[0].team_logo, 'https://new.test/a.webp')
  assert.equal(getTeamLogoCandidates(result.matches[0].team_a, 'FCW26')[0], 'https://new.test/a.webp')
  assert.deepEqual(result.matches[0].team_b, before.matches[0].team_b)
  assert.equal(result.teams[0].points, 9); assert.equal(result.matches[0].team_a.score, 4)
  assert.deepEqual(result.meta, before.meta); assert.deepEqual(db, before)
})
test('removal clears stale aliases instead of displaying an older published logo', () => {
  const result = applyCurrentTeamLogos(fixture(), { logos: [{ teamId: 'A', logoUrl: '' }] })
  assert.equal(result.matches[0].team_a.logoUrl, '')
  assert.ok(!getTeamLogoCandidates(result.matches[0].team_a, 'FCW26').some(url => url.includes('old.test')))
})
test('unavailable, malformed or cross-season projections preserve published data', async () => {
  const db = fixture(), season = { id: 'FCW26', competitionFormat: 'WEEKLY', lifecycle: 'ACTIVE' }
  for (const fetchImpl of [async () => { throw Error('offline') }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ seasonId: 'OTHER', logos: [] }) })]) {
    assert.equal(await hydrateCurrentTeamLogos(db, season, '/public/data', fetchImpl), db)
  }
  assert.equal(applyCurrentTeamLogos(db, { logos: [{ teamId: 'A', logoUrl: 'javascript:bad' }] }), db)
})
test('archives, local previews and nonweekly seasons do not request live artwork', async () => {
  const db = fixture(), base = { id: 'FCW26', competitionFormat: 'WEEKLY', lifecycle: 'ACTIVE', localDataUrl: '/local.json' }
  for (const [season, source] of [[{ ...base, lifecycle: 'ARCHIVED' }, '/data'], [{ ...base, preferLocalData: true }, '/data'], [{ ...base, competitionFormat: 'SWISS' }, '/data'], [base, '/local.json']]) {
    assert.equal(await hydrateCurrentTeamLogos(db, season, source, async () => { assert.fail('must not fetch') }), db)
  }
})
