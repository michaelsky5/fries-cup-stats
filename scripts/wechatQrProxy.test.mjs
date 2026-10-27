import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyRequest } from '../edge-functions/api/[[path]].js'

const id='SyntheticTicket_012345678', proof='synthetic-browser-proof'
test('the platform proxy preserves QR cookies and rewrites only their ticket-scoped path',async()=>{
  for(const action of ['create','poll']) {
    const headers=new Headers({'content-type':'application/json','cache-control':'private, no-store'})
    headers.append('set-cookie',`__Secure-fries_wechat_qr_${id}=${proof}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/wechat-qr/${id}; Max-Age=120`)
    if(action==='poll')headers.append('set-cookie','__Host-fries_session=synthetic-session; Path=/; HttpOnly; Secure; SameSite=Strict')
    let forwarded
    const response=await proxyRequest(new Request(`https://stats.example.test/api/platform/auth/wechat-qr/${id}`,{headers:{cookie:`__Secure-fries_wechat_qr_${id}=${proof}`}}),{
      platformOrigin:'https://platform.example.test',fetchImpl:async(_url,options)=>{forwarded=options.headers;return new Response('{}',{headers})}
    })
    assert.equal(forwarded.get('cookie'),`__Secure-fries_wechat_qr_${id}=${proof}`)
    assert.equal(response.headers.get('cache-control'),'private, no-store')
    const values=response.headers.getSetCookie()
    assert.equal(values.length,action==='poll'?2:1)
    assert(values.some(value=>value.includes(`Path=/api/platform/auth/wechat-qr/${id}`)&&value.includes('HttpOnly')&&value.includes('Secure')))
    if(action==='poll')assert(values.some(value=>value.startsWith('__Host-fries_session=')&&value.includes('Path=/;')))
  }
})
