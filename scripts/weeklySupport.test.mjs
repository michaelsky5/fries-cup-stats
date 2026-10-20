import test from 'node:test'
import assert from 'node:assert/strict'
import { publicSupportView } from '../src/features/weekly-support/supportModel.js'
import { proxyRequest } from '../edge-functions/api/[[path]].js'
test('public UI rejects wrong scope and strips private fields and expired web names',()=>{
  const now=Date.parse('2026-10-18T12:00Z')
  const raw={schema:'friescup-weekly-support-v1',seasonId:'FCW26',published:true,orders:[{contact:'SECRET'}],contact:'SECRET',entryUrl:'javascript:alert(1)',supporters:[{displayName:'过期',web:true,startsAt:'2026-01-01',endsAt:'2026-01-02'},{displayName:'允许',roll:true,contact:'SECRET',publicId:'PRIVATE'}]}
  const view=publicSupportView(raw,'FCW26',now)
  assert.equal(view.supporters.length,1);assert.equal(view.supporters[0].displayName,'允许');assert.equal(view.entryUrl,'')
  assert(!JSON.stringify(view).includes('SECRET'));assert(!JSON.stringify(view).includes('PRIVATE'))
  assert.throws(()=>publicSupportView(raw,'FCR26'),/SCOPE/)
})
test('support public proxy is read-only, credential-free and bypasses every cache',async()=>{
  let fetched=0
  const url='https://stats.example/api/admin-public/seasons/FCW26/support?cycleId=C2'
  const cache={match:()=>{throw new Error('must not read cache')},put:()=>{throw new Error('must not cache')}}
  const response=await proxyRequest(new Request(url,{headers:{cookie:'SECRET',authorization:'Bearer SECRET'}}),{cache,fetchImpl:async(upstream,options)=>{
    fetched++;assert.equal(upstream,'https://admin.fries-cup.com/api/public/seasons/FCW26/support?cycleId=C2')
    assert.equal(options.headers.get('cookie'),null);assert.equal(options.headers.get('authorization'),null)
    return new Response('{}',{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=3600'}})
  }})
  assert.equal(fetched,1);assert.match(response.headers.get('cache-control'),/no-store/)
  const rejected=await proxyRequest(new Request(url,{method:'POST'}),{fetchImpl:()=>{throw new Error('must not write')}})
  assert.equal(rejected.status,405)
})
test('reviewed spending keeps advances separate and preserves an actual funding shortfall',()=>{
  const view=publicSupportView({schema:'friescup-weekly-support-v1',seasonId:'FCW26',published:true,summary:{allocated:{OPERATIONS:1000},deposits:{OPERATIONS:2000},spent:{OPERATIONS:4000},reimbursed:{OPERATIONS:0},available:{OPERATIONS:-1000},privateReceipt:'SECRET'}},'FCW26')
  assert.equal(view.summary.allocated.OPERATIONS,1000)
  assert.equal(view.summary.deposits.OPERATIONS,2000)
  assert.equal(view.summary.spent.OPERATIONS,4000)
  assert.equal(view.summary.available.OPERATIONS,-1000)
  assert(!JSON.stringify(view).includes('SECRET'))
})
