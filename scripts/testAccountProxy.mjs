import assert from 'node:assert/strict'
import test from 'node:test'
import { createAccountProxy } from '../api/account.js'

function harness(fetchImpl) {
  const logs = []
  const handler = createAccountProxy({ origin: 'https://test-admin.fries-cup.com', fetchImpl, log: entry => logs.push(entry) })
  const invoke = async (overrides = {}) => {
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = body?.toString() } }
    await handler({ method: 'GET', url: '/api/account?accountPath=me/profile&seasonId=TEST', headers: {}, ...overrides }, response)
    return response
  }
  return { invoke, logs }
}

test('only forwards application cookies, preserves query and origin, never caches private JSON', async () => {
  let captured
  const { invoke, logs } = harness(async (url, init) => {
    captured = { url: url.toString(), init }
    return Response.json({ user: { id: 'synthetic' } })
  })
  const response = await invoke({headers: {cookie: '_vercel_jwt=private-preview-token; __Host-fries_session=account-session; other=secret', origin:'https://untrusted.example.test'}})
  assert.equal(captured.url, 'https://test-admin.fries-cup.com/api/me/profile?seasonId=TEST')
  assert.equal(captured.init.headers.get('Cookie'), '__Host-fries_session=account-session')
  assert.equal(captured.init.headers.get('Origin'), 'https://untrusted.example.test')
  assert.equal(response.statusCode, 200)
  assert.match(response.headers['Cache-Control'], /private.*no-store/)
  assert.equal(response.headers['Vercel-CDN-Cache-Control'], 'no-store')
  assert(!logs.join('').includes('account-session'))
  assert(!logs.join('').includes('private-preview-token'))
  assert(!logs.join('').includes('seasonId'))
})

test('relays password-free server response and secure application Set-Cookie without changing its attributes', async () => {
  let captured
  const cookie='__Host-fries_session=synthetic; Path=/; Secure; HttpOnly; SameSite=Strict'
  const {invoke}=harness(async (_url, init) => {
    captured=init
    return new Response('{"user":{"id":"synthetic"}}', {status:200,headers:{'content-type':'application/json','set-cookie':cookie}})
  })
  const response=await invoke({method:'POST',url:'/api/account?accountPath=auth/login',headers:{'content-type':'application/json'},body:{email:'test@example.test',password:'synthetic-password'}})
  assert.equal(JSON.parse(captured.body.toString()).email,'test@example.test')
  assert.equal(response.headers['Set-Cookie'][0],cookie)
  assert(!response.body.includes('password'))
})

test('keeps authorization failures and retry instructions from the backend', async () => {
  const {invoke}=harness(async()=>new Response('{"error":"ORIGIN_NOT_ALLOWED"}',{status:403,headers:{'content-type':'application/json','retry-after':'60'}}))
  const response=await invoke()
  assert.equal(response.statusCode,403)
  assert.equal(response.headers['Retry-After'],'60')
  assert.equal(JSON.parse(response.body).error,'ORIGIN_NOT_ALLOWED')
})

test('refuses traversal, arbitrary origins, and ambiguous reserved route parameters before any request', async () => {
  let calls=0
  const {invoke}=harness(async()=>{calls++;return Response.json({})})
  for (const path of ['https://evil.example.test','me/../auth/login','me//profile','public/data','me/%2e%2e/profile']) {
    assert.equal((await invoke({url:'/api/account?accountPath='+encodeURIComponent(path)})).statusCode,400)
  }
  assert.equal((await invoke({url:'/api/account?accountPath=me/profile&accountPath=auth/login'})).statusCode,400)
  assert.equal(calls,0)
})

test('does not follow upstream redirects or pass login HTML off as account data', async () => {
  for (const result of [new Response('',{status:302,headers:{location:'https://unrelated.example.test'}}),new Response('<html>sign in</html>',{status:200,headers:{'content-type':'text/html'}})]) {
    const {invoke}=harness(async()=>result)
    const response=await invoke()
    assert.equal(response.statusCode,502)
    assert.equal(JSON.parse(response.body).outcomeUnknown,false)
    assert(!response.body.includes('<html>'))
  }
})

test('a timed-out write is attempted once and explicitly reports an unknown outcome', async () => {
  let calls=0
  const {invoke}=harness(async()=>{calls++;throw new DOMException('Timed out','TimeoutError')})
  const response=await invoke({method:'PATCH',body:{displayName:'new'}})
  assert.equal(calls,1)
  assert.equal(response.statusCode,504)
  assert.equal(JSON.parse(response.body).outcomeUnknown,true)
  assert(JSON.parse(response.body).requestId)
})

test('a response-body timeout also cannot be presented as a successful write', async () => {
  const {invoke}=harness(async()=>({status:200,headers:new Headers({'content-type':'application/json'}),arrayBuffer:async()=>{throw new DOMException('body timed out','TimeoutError')}}))
  const response=await invoke({method:'PATCH',body:{displayName:'new'}})
  assert.equal(response.statusCode,504)
  assert.equal(JSON.parse(response.body).outcomeUnknown,true)
})

test('large account bodies are refused before sending, without claiming an unknown submitted outcome', async()=>{
  let calls=0
  const {invoke}=harness(async()=>{calls++;return Response.json({})})
  const response=await invoke({method:'POST',body:Buffer.alloc(2*1024*1024+1)})
  assert.equal(calls,0)
  assert.equal(response.statusCode,413)
  assert.equal(JSON.parse(response.body).outcomeUnknown,false)
})
