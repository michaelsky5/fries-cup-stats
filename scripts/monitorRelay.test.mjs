import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import onRequest, { monitorRelay } from '../edge-functions/api/[[path]].js'

const origin = 'https://stats.fries-cup.com/api/ops-monitor'
const worker = 'https://friescup-external-monitor.shenkeyu5.workers.dev'
const body = '{ "schema": 1, "issuedAt": 1792778400000, "instance": "friescup-production", "budgetPartition": "host6-external4-v1", "lastSuccess": null }'
const signature = createHmac('sha256', Buffer.alloc(32, 0xab)).update(body).digest('hex')
function receipt(overrides = {}) {
  return new Request(origin + '/receipt', { method: 'POST', body,
    headers: { 'Content-Type': 'application/json', 'X-FriesCup-Signature': signature }, ...overrides })
}
function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

test('forwards exactly the signed bytes to one fixed Worker, without credentials or caller routing headers', async () => {
  let sent
  const response = await monitorRelay(receipt({ headers: {
    'Content-Type': 'application/json; charset=utf-8', 'X-FriesCup-Signature': signature,
    Cookie: 'private-session=do-not-forward', Authorization: 'Bearer do-not-forward',
    'X-Forwarded-Host': 'attacker.invalid', Referer: 'https://private.example/path'
  } }), { fetchImpl: async (url, init) => {
    sent = { url, init }
    assert.equal(Buffer.from(init.body).toString(), body)
    assert.equal(createHmac('sha256', Buffer.alloc(32, 0xab)).update(init.body).digest('hex'), init.headers.get('x-friescup-signature'))
    return json({ accepted: true }, 200, { 'Set-Cookie': 'untrusted=not-forwarded', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public,max-age=300' })
  } })
  assert.equal(sent.url, worker+'/receipt')
  assert.equal(sent.init.redirect, 'manual')
  assert.deepEqual([...sent.init.headers.keys()].sort(), ['accept','cache-control','content-type','x-friescup-signature'])
  assert.deepEqual(await response.json(), { accepted: true })
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(response.headers.get('access-control-allow-origin'), null)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store')
})

test('health preserves unavailable 503 and never synthesizes an accepted receipt', async () => {
  let calls=0
  const value={schema:1,status:'unavailable',checkedAt:1792778400000,acceptance:false,pendingNotification:false}
  const response=await monitorRelay(new Request(origin+'/health'), {fetchImpl:async(url,init)=>{
    calls++;assert.equal(url,worker+'/health');assert.equal(init.method,'GET');assert.equal(init.body,undefined)
    assert.equal(init.headers.get('x-friescup-signature'),null)
    return json(value,503)
  }})
  assert.equal(calls,1);assert.equal(response.status,503);assert.deepEqual(await response.json(),value)
})

test('rejects arbitrary routes, query redirects, and methods before network access', async () => {
  let calls=0
  const options={fetchImpl:async()=>{calls++;return json({})}}
  for(const path of ['/unknown','/receipt/','/health?target=https://attacker.invalid','/%2fhealth']) {
    assert.equal((await monitorRelay(new Request(origin+path),options)).status,404)
  }
  for(const [path,method] of [['/receipt','GET'],['/health','POST'],['/health','HEAD'],['/receipt','OPTIONS']]) {
    assert.equal((await monitorRelay(new Request(origin+path,{method}),options)).status,405)
  }
  assert.equal((await onRequest({request:new Request(origin+'/unknown')})).status,404)
  assert.equal(calls,0)
})

test('rejects browser-origin POSTs, missing signatures and invalid media types', async () => {
  let calls=0;const options={fetchImpl:async()=>{calls++;return json({})}}
  for(const headers of [
    {'Content-Type':'application/json','X-FriesCup-Signature':signature,Origin:'https://stats.fries-cup.com'},
    {'Content-Type':'application/json','X-FriesCup-Signature':signature,'Sec-Fetch-Site':'cross-site'}
  ])assert.equal((await monitorRelay(receipt({headers}),options)).status,403)
  for(const headers of [
    {'Content-Type':'application/json'},
    {'Content-Type':'text/plain','X-FriesCup-Signature':signature},
    {'Content-Type':'application/json','X-FriesCup-Signature':'not-a-signature'}
  ])assert.equal((await monitorRelay(receipt({headers}),options)).status,400)
  assert.equal(calls,0)
})

test('limits both declared and chunked receipt sizes and does not forward an empty body',async()=>{
  let calls=0;const options={fetchImpl:async()=>{calls++;return json({})}}
  const headers={'Content-Type':'application/json','X-FriesCup-Signature':signature,'Content-Length':'2049'}
  assert.equal((await monitorRelay(receipt({headers}),options)).status,413)
  assert.equal((await monitorRelay(receipt({body:'x'.repeat(2049)}),options)).status,413)
  let cancelled=false
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(1024));c.enqueue(new Uint8Array(1025))},cancel(){cancelled=true}})
  assert.equal((await monitorRelay(receipt({body:stream,duplex:'half'}),options)).status,413)
  assert.equal(cancelled,true)
  assert.equal((await monitorRelay(receipt({body:''}),options)).status,400)
  assert.equal(calls,0)
})

test('an invalid Worker signature response remains a failure, with no retry',async()=>{
  let calls=0
  const response=await monitorRelay(receipt(),{fetchImpl:async()=>{calls++;return json({error:'signature'},401)}})
  assert.equal(response.status,401);assert.equal(calls,1);assert.deepEqual(await response.json(),{error:'signature'})
})

test('does not follow redirects or trust HTML, malformed, scalar or oversized upstream responses',async()=>{
  const responses=[new Response('',{status:302,headers:{location:'https://attacker.invalid'}}),
    new Response('<html>private</html>',{headers:{'content-type':'text/html'}}),
    new Response('{',{headers:{'content-type':'application/json'}}),json('not-an-object'),json({large:'x'.repeat(2048)})]
  for(const upstream of responses){
    let calls=0
    const response=await monitorRelay(receipt(),{fetchImpl:async()=>{calls++;return upstream}})
    assert.equal(response.status,502);assert.equal(calls,1)
    assert(!JSON.stringify(await response.json()).includes('private'))
  }
})

test('bounds a stalled receipt without sending it and a stalled upstream without retrying',async()=>{
  let calls=0,cancelled=false
  const stream=new ReadableStream({cancel(){cancelled=true}})
  const response=await monitorRelay(receipt({body:stream,duplex:'half'}),{timeoutMs:15,fetchImpl:async()=>{calls++;return json({})}})
  assert.equal(response.status,504);assert.equal(calls,0);assert(cancelled)
  const upstream=await monitorRelay(receipt(),{timeoutMs:15,fetchImpl:()=>{calls++;return new Promise(()=>{})}})
  assert.equal(upstream.status,504);assert.equal(calls,1)
})

test('bounds a stalled upstream body and cancels its stream',async()=>{
  let cancelled=false
  const response=await monitorRelay(new Request(origin+'/health'),{timeoutMs:15,fetchImpl:async()=>new Response(
    new ReadableStream({cancel(){cancelled=true}}),{headers:{'Content-Type':'application/json'}})})
  assert.equal(response.status,504);assert(cancelled)
})
