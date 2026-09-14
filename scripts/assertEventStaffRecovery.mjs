import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createAccountReviewFixture } from './lib/accountReviewFixtureServer.mjs'

// Local fixture contract checks. Real service authorization is not mocked as evidence.
const sessions = new Map(['staff-none','staff-invited','staff-active','staff-error','staff-refresh-error'].map(key => [key, createAccountReviewFixture(key)]))
const server = createServer((req,res) => sessions.get(req.headers['x-review']).handle(req,res))
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}/api`
async function call(scenario, path, method = 'GET') {
  const response = await fetch(base + path, {method,headers:{'x-review':scenario}})
  return {status:response.status,data:await response.json()}
}
try {
  for (const season of ['FCR26','FCA26','QGCS4']) {
    const path = `/me/event-staff-context?seasonId=${season}`
    const none = await call('staff-none', path)
    assert.deepEqual(none.data.participations, [])
    assert.equal(none.data.seasonId, season)
    const invitation = (await call('staff-invited', path)).data.participations
    for (const role of ['CASTER','REFEREE']) {
      const participation = invitation.find(item => item.role === role)
      assert.equal(participation.status, 'INVITED')
      const actionPath = `/me/event-staff-participations/${participation.id}`
      assert.equal((await call('staff-invited', actionPath + '/accept', 'POST')).data.participation.status, 'ACTIVE')
      assert.equal((await call('staff-invited', actionPath + '/accept', 'POST')).status, 409)
      assert.equal((await call('staff-invited', actionPath + '/withdraw', 'POST')).data.participation.status, 'WITHDRAWN')
    }
    assert.equal((await call('staff-error', path)).status, 503)
    assert.equal((await call('staff-error', path)).status, 503)
    assert.equal((await call('staff-error', path)).status, 200)
    assert.equal((await call('staff-refresh-error', path)).data.participations[0].status, 'ACTIVE')
    assert.equal((await call('staff-refresh-error', path)).status, 200)
    assert.equal((await call('staff-refresh-error', path)).status, 503)
    assert.equal((await call('staff-refresh-error', path)).data.participations[0].status, 'ACTIVE')
    console.log(`${season}: both roles, isolated relationship and recovery fixtures passed`)
  }
} finally { await new Promise(resolve => server.close(resolve)) }
