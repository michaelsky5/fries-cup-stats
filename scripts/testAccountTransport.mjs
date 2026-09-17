import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createHttpsTransport } from '../api/account.js'

function fakeRequest(scenarios, calls) {
  return (url, options, onResponse) => {
    const scenario = scenarios[calls.length]
    const req = new EventEmitter(), socket = new EventEmitter()
    calls.push({url, options}); socket.connecting = true
    req.destroy = error => { req.emit('error', error); req.emit('close') }
    req.end = body => {
      calls.at(-1).body = body
      queueMicrotask(() => {
        req.emit('socket', socket)
        if (scenario === 'no-connect') return
        socket.emit('connect'); socket.emit('secureConnect')
        if (scenario === 'lost-after-connect') { req.destroy(new Error('ECONNRESET')); return }
        const res = new EventEmitter(); res.statusCode=200; res.rawHeaders=['Content-Type','application/json']
        onResponse(res); res.emit('data', Buffer.from('{"saved":true}')); res.emit('end'); req.emit('close')
      })
    }
    return req
  }
}
const requestOptions = () => ({method:'POST',headers:new Headers({'Content-Type':'application/json'}),body:Buffer.from('{"displayName":"test"}'),signal:AbortSignal.timeout(2000)})
test('a connection that never opens is replaced, then exactly one submission reaches a connected socket', async()=>{
  const calls=[], phases=[]
  const transport=createHttpsTransport({requestImpl:fakeRequest(['no-connect','ok'],calls),connectionTimeoutMs:5})
  const response=await transport(new URL('https://account.example.test/api/me/profile'),requestOptions(),phases)
  assert.equal(response.status,200); assert.equal(calls.length,2); assert.equal(phases.filter(p=>p==='tcp').length,1)
})
test('connection retries are bounded even if the origin never accepts a connection',async()=>{
  const calls=[]
  const transport=createHttpsTransport({requestImpl:fakeRequest(['no-connect','no-connect','no-connect'],calls),connectionTimeoutMs:5})
  await assert.rejects(transport(new URL('https://account.example.test'),requestOptions(),[]),/CONNECT_TIMEOUT/)
  assert.equal(calls.length,3)
})
test('a write failure after the TCP connection is established is never replayed',async()=>{
  const calls=[]
  const transport=createHttpsTransport({requestImpl:fakeRequest(['lost-after-connect','ok'],calls),connectionTimeoutMs:5})
  await assert.rejects(transport(new URL('https://account.example.test'),requestOptions(),[]),/ECONNRESET/)
  assert.equal(calls.length,1)
})
