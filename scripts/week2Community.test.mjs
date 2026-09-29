import assert from 'node:assert/strict'
import { test } from 'node:test'
import { weeklyRosterScopes, filterWeeklyRoster } from '../src/lib/weeklyRosterScope.js'
import { fetchCommunicationCenter } from '../src/features/communications/communicationApi.js'
import { accountRequestError } from '../src/features/auth/accountRequestError.js'

test('current team membership and published weekly rosters retain distinct historical views', () => {
  const players = [{player_id:'active',roster_status:'ACTIVE'}, {player_id:'departed',roster_status:'EXITED'}, {player_id:'retired',status:'RETIRED'}]
  const db = {weekly_competition:{cycles:[{name:'第一周期',weeks:[{id:'week1',label:'第1周',rosters:[{team_id:'A',player_ids:['departed']}]},{id:'week2',label:'第2周',rosters:[{team_id:'A',player_ids:['active']}]}]}]}}
  const scopes=weeklyRosterScopes(db,'A')
  assert.deepEqual(filterWeeklyRoster(players,'current').map(p=>p.player_id),['active'])
  assert.deepEqual(filterWeeklyRoster(players,'week1',scopes).map(p=>p.player_id),['departed'])
  assert.deepEqual(filterWeeklyRoster(players,'week2',scopes).map(p=>p.player_id),['active'])
  assert.equal(filterWeeklyRoster(players,'history'),players)
  assert.deepEqual(filterWeeklyRoster(players,'unknown',scopes),[])
  assert.equal(players.length,3,'filtering must not remove historical records')
})

test('communication sources fail independently and malformed data is never a confirmed empty list', async () => {
  const original=globalThis.fetch
  try {
    globalThis.fetch=async url=>{
      const path=String(url)
      const notification=path.includes('/me/notifications')
      const options=path.includes('/me/appeal-options')
      const status=path.includes('/announcements') ? 404 : 200
      const body=notification ? {notifications:[{id:'saved-message'}]} : options ? {matches:[]} : {}
      return {ok:status===200,status,headers:new Headers({'content-type':'application/json'}),json:async()=>body}
    }
    const result=await fetchCommunicationCenter('FCW26')
    assert.deepEqual(result.notifications,[{id:'saved-message'}])
    assert.deepEqual(result.appealOptions,[])
    assert.equal(result.announcements,undefined)
    assert.equal(result.appeals,undefined)
    assert.equal(result.errors.announcements.status,404)
    assert.ok(result.errors.appeals)
    assert.doesNotMatch(accountRequestError(result.errors.announcements,'赛事公告'),/Route|GET|api/)
    assert.match(accountRequestError({status:401}),/重新登录/)
  } finally {globalThis.fetch=original}
})
