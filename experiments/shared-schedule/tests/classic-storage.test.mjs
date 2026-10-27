import test from 'node:test'
import assert from 'node:assert/strict'
import { configureClassicStorage, classicStorage } from '../src/classic/classicStorage.js'
import { initNewRun, getRunState, hirePlayer, firePlayer, refreshShop, processBattleResult } from '../src/generated/classic/engine/runEngine.js'
import { getPlayerCards, calculateTeamPower, trainPlayer } from '../src/generated/classic/engine/managerEngine.js'
import { executeSimulation, TACTICS } from '../src/generated/classic/engine/simEngine.js'

function setup(season='FCR26', values = new Map()) {
  configureClassicStorage({get:key=>values.get(key),set:(key,value)=>values.set(key,value),remove:key=>values.delete(key)},season)
  return values
}
const db = {
  teams:[{team_id:'A',team_name:'A team',team_short_name:'A'},{team_id:'B',team_name:'B team',team_short_name:'B'}],
  player_totals:['TANK','DPS','DPS','SUP','SUP'].map((role,index)=>({player_id:String(index),role,display_name:'P'+index,player_name:'Tag'+index,team_short_name:'A',raw_time_mins:60,avg_dmg:1000+index*100,avg_block:1000,avg_heal:1000,avg_elim:10,avg_ast:10,most_played_hero:role==='TANK'?'温斯顿':role==='DPS'?'猎空':'安娜'}))
}
test('classic saves are separated by event and do not rewrite the Web or following keys', () => {
  const values=setup(); classicStorage.setItem('friesCup_currentRun','A')
  setup('FCA26',values); assert.equal(classicStorage.getItem('friesCup_currentRun'),null)
  classicStorage.setItem('friesCup_currentRun','B')
  setup('FCR26',values); assert.equal(classicStorage.getItem('friesCup_currentRun'),'A')
  assert.deepEqual([...values.keys()].sort(),['friescup:classic:FCA26:friesCup_currentRun','friescup:classic:FCR26:friesCup_currentRun'])
})
test('canonical hiring, training, tactics and settlement survive native save/reload', () => {
  setup(); let run=initNewRun(db)
  const cards=getPlayerCards(db)
  assert.equal(cards.length,5)
  for (const card of cards) {const hired=hirePlayer(run,card);assert.equal(hired.success,true);run=hired.state}
  assert.equal(getRunState().roster.length,5)
  const trained=trainPlayer(run.roster[0]);assert.equal(trained.upgradeLevel,1)
  const power=calculateTeamPower(run.roster);assert.ok(power.powerScore>0)
  const result=executeSimulation(run.roster,{...db.teams[1],powerScore:75},TACTICS[0].id,'伊利奥斯',1,power.activeSynergy,[])
  assert.equal(typeof result.isWin,'boolean');assert.equal(Object.keys(result.matchStats).length,5)
  const settled=processBattleResult(run,true,{team:db.teams[1],rewardMoney:110,rewardRelic:null},db)
  assert.equal(settled.state.currentNode,2);assert.equal(getRunState().history.length,1)
  const next=firePlayer(settled.state,'0');assert.equal(getRunState().roster.length,4)
  const refreshed=refreshShop(next,db);assert.equal(refreshed.success,true);assert.ok(getRunState().shopPool.length)
})
test('a corrupt save is surfaced and retained instead of silently replacing player progress', () => {
  setup();classicStorage.setItem('friesCup_currentRun','{corrupt')
  assert.throws(()=>getRunState(),SyntaxError)
  assert.equal(classicStorage.getItem('friesCup_currentRun'),'{corrupt')
})
test('a rejected native write cannot spend the visible budget or change the saved roster', () => {
  const values=setup();const run=initNewRun(db),before=JSON.stringify(run)
  configureClassicStorage({get:key=>values.get(key),set:()=>{throw new Error('storage quota')},remove:key=>values.delete(key)},'FCR26')
  assert.throws(()=>hirePlayer(run,getPlayerCards(db)[0]),/storage quota/)
  assert.equal(JSON.stringify(run),before)
  assert.equal(JSON.stringify(getRunState()),before)
})
test('corrupt career progress is retained and blocks a replacement write', () => {
  const values=setup();values.set('friescup:classic:FCR26:fca_manager_career_v2','broken career')
  assert.throws(()=>classicStorage.getItem('fca_manager_career_v2'),SyntaxError)
  assert.equal(values.get('friescup:classic:FCR26:fca_manager_career_v2'),'broken career')
})
