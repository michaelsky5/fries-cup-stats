import test from 'node:test'
import assert from 'node:assert/strict'
import { readWebLoginScene,normalizeWebLoginReview } from '../src/account/nativeWebLoginModel.js'

test('only an exact scene is accepted; URLs, query injection and invalid encodings cannot become ticket ids',()=>{
  assert.equal(readWebLoginScene('Synthetic_0123456789AB'),'Synthetic_0123456789AB')
  for(const value of ['../account','https://evil.test/scene','id=x&user=other','%E0%A4%A','short'])assert.equal(readWebLoginScene(value),'')
})
test('the phone deadline uses server time, and metadata never retains server identity or session fields',()=>{
  const start=Date.parse('2026-10-27T12:00:00Z')
  const review=normalizeWebLoginReview({status:'SCANNED',createdAt:new Date(start).toISOString(),expiresAt:new Date(start+120000).toISOString(),serverNow:new Date(start+30000).toISOString(),browser:'Edge',system:'Windows',region:'地区暂不可用',openid:'must-not-survive',session_key:'must-not-survive'},10)
  assert.equal(review.deadline,90010);assert(!JSON.stringify(review).includes('must-not-survive'))
  assert.throws(()=>normalizeWebLoginReview({...review,status:'GRANTED'}))
})
