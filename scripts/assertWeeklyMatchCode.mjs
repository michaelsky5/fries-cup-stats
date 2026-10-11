import test from 'node:test'
import assert from 'node:assert/strict'
import { getPublicMatchCode } from '../src/lib/publicMatchCode.js'
import { resolvePublicMatchIdentities } from '../src/lib/publicMatchIdentity.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
test('old weekly games show the dedicated code without changing public URLs or room identities',()=>{
  const match={match_id:'FCW26-SWISS-R1-M09',raw_match_id:'FCW26-OTHER-7AE549B6',cycle_week_id:'week-3',stage:'OTHER',status:'PENDING',maps:[],team_a:{id:'a'},team_b:{id:'b'}}
  const original=structuredClone(match)
  const db={teams:[],players:[],matches:[match]}
  const result=resolvePublicMatchIdentities(db)
  assert.equal(result.matches[0].match_code,'FCW26-WEEKLY-7AE549B6')
  assert.equal(result.matches[0].match_id,match.match_id)
  assert.equal(result.matches[0].raw_match_id,match.raw_match_id)
  const dossier=getMatchDossier(db,match.match_id)
  assert.equal(dossier.displayCode,'FCW26-WEEKLY-7AE549B6')
  assert.equal(dossier.roomPath,'/me/matches/FCW26-OTHER-7AE549B6/room')
  assert.deepEqual(match,original)
})
test('new weekly codes and nonweekly matches preserve their existing identities',()=>{
  assert.equal(getPublicMatchCode({match_id:'FCW26-WEEKLY-1234ABCD',cycle_week_id:'w'}),'FCW26-WEEKLY-1234ABCD')
  assert.equal(getPublicMatchCode({match_id:'FCQ-SWISS-R3-M02',raw_match_id:'FCQ-OTHER-1234ABCD'}),'FCQ-SWISS-R3-M02')
  assert.equal(getPublicMatchCode({match_code:'MANAGED-CODE',match_id:'old',cycle_week_id:'w'}),'MANAGED-CODE')
})
