import test from 'node:test'
import assert from 'node:assert/strict'
import {centerEntryUrl,publicPageKind} from '../src/shared/centerPaths.js'
import {createCenterNavigation} from '../src/shared/centerNavigation.js'
import {createMatchReadingQuery,applyMatchReadingQuery} from '../src/shared/nativeMatchState.js'
import {publicNativeRoute} from '../src/shared/nativeDesignModel.js'

test('old public match links and selected maps resolve to the native detail subpackage',()=>{
  const route=publicNativeRoute('/matches/A%2FB?season=FCR26&map=2&token=private')
  assert.deepEqual(route,{view:'matches',id:'A/B',season:'FCR26',mapOrder:'2'})
  assert.match(centerEntryUrl(route),/^\/match\/pages\/index\?/)
  assert.equal(createMatchReadingQuery({...route,pquery:'private',compareA:'private'}),'map=2')
  assert.equal(createMatchReadingQuery({mapOrder:'bad'}),'')
  assert.equal(publicPageKind({view:'overview',season:'FCR26'}),'archive')
  assert.equal(publicPageKind({view:'roster',season:'FCR26',team:'A'}),'team')
})
test('returning from a match restores its historical home but does not render a list in that package',async()=>{
  let pages=[{route:'archive/pages/index',options:{season:'FCR26'}},{route:'match/pages/index',options:{season:'FCR26',id:'M'}}]
  const calls=[]
  const nav=createCenterNavigation({getPages:()=>pages,navigateBack:async({delta})=>{calls.push(['back',delta]);pages=pages.slice(0,-delta)},reLaunch:async({url})=>calls.push(['launch',url])})
  await nav.switchTo('overview',{seasonId:'FCR26'})
  assert.deepEqual(calls,[['back',1]]);assert.deepEqual(nav.takeVisit(),{view:'overview'})
  pages.push({route:'match/pages/index',options:{season:'FCR26',id:'M'}})
  await nav.switchTo('matches',{seasonId:'FCR26'})
  assert.equal(calls.at(-1)[0],'launch');assert.match(calls.at(-1)[1],/^\/center\/pages\/index\?season=FCR26&view=matches/)
})
test('original archive license links stay external public links in the mini-program',()=>{
  assert.deepEqual(publicNativeRoute('/fonts/harmonyos/LICENSE.txt'),{external:'https://stats.fries-cup.com/fonts/harmonyos/LICENSE.txt'})
})

test('match reading state works with native URLSearchParams without an iterator',()=>{
  const Original=globalThis.URLSearchParams
  class NativeParams {
    constructor(query){this.params=new Original(query)}
    forEach(callback){this.params.forEach(callback)}
  }
  try{
    globalThis.URLSearchParams=NativeParams
    const target=new Original('season=FCR26&map=1')
    applyMatchReadingQuery(target,'map=2&pview=maps')
    assert.equal(target.get('season'),'FCR26')
    assert.equal(target.get('map'),'2')
    assert.equal(target.get('pview'),'maps')
  }finally{globalThis.URLSearchParams=Original}
})
