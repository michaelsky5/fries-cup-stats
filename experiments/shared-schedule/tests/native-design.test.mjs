import test from 'node:test'
import assert from 'node:assert/strict'
import { nativePublicPath,publicNativeRoute,nativeOverviewSearch,nativeOverviewSelection,nativeSelectorClasses,nativeAssetUrl } from '../src/shared/nativeDesignModel.js'

test('false HTML boolean attributes stay absent while data and ARIA false values remain selectable',()=>{
  const absent=nativeSelectorClasses({hidden:false,disabled:false,checked:false}).split(' ')
  for(const attribute of ['hidden','disabled','checked'])assert.ok(!absent.includes('shared-attr-'+attribute))
  assert.ok(nativeSelectorClasses({hidden:true}).split(' ').includes('shared-attr-hidden'))
  assert.ok(nativeSelectorClasses({'data-hidden':false}).includes('shared-data-hidden-false'))
  assert.ok(nativeSelectorClasses({'aria-expanded':false}).includes('shared-attr-aria-expanded-false'))
})

test('query-only navigation preserves the native page instead of returning to overview',()=>{
  const advance=publicNativeRoute({search:'?cycle=C02&phase=league'},'/advance')
  assert.equal(advance.view,'advance');assert.equal(advance.cycle,'C02')
  assert.equal(new URLSearchParams(advance.filters).get('phase'),'league')
  assert.equal(publicNativeRoute('?q=pororo','/leaderboard').view,'database')
  assert.equal(publicNativeRoute('#map-records','/matches/M1').id,'M1')
  assert.equal(publicNativeRoute({search:'?section=team&competition=FCW26'},'/me').unavailable,true)
})

test('Stats links retain public subject and selected event/period when mapped to native routes',()=>{
  assert.deepEqual(publicNativeRoute('/matches/C-W2-M1?season=FCW26&cycle=C&week=W2'),{view:'matches',id:'C-W2-M1',season:'FCW26',cycle:'C',week:'W2'})
  assert.deepEqual(publicNativeRoute('/players/P%20A?role=DPS&season=FCR26'),{view:'roster',directory:'players',player:'P A',season:'FCR26',role:'DPS'})
  assert.deepEqual(publicNativeRoute('/review/story/player/P1?season=FCA26'),{view:'review',story:'player',subject:'P1',season:'FCA26'})
  assert.equal(nativePublicPath('roster',{team:'A/B'}),'/teams/A%2FB')
  assert.deepEqual(publicNativeRoute('https://fries-cup.com/rules/?book=weekly'),{external:'https://fries-cup.com/rules/?book=weekly'})
})
test('native detail links keep canonical reading state while excluding credentials and local diagnostics',()=>{
  const player=publicNativeRoute('/players/FCR26-P0005/analysis?season=FCR2026&role=SUPPORT&pview=matches&popen=M1&pmap=oasis&token=secret&debug=private')
  assert.equal(player.dossierView,'analysis');assert.equal(player.role,'SUPPORT')
  const params=new URLSearchParams(player.filters)
  assert.equal(params.get('pmap'),'oasis');assert.equal(params.get('popen'),'M1')
  assert.doesNotMatch(JSON.stringify(player),/secret|private|token|debug/)
  const following=publicNativeRoute('/following?followView=matches&member=P1')
  assert.equal(new URLSearchParams(following.filters).get('followView'),'matches')
})
test('native weekly query changes clear the old focus and resolve a published week after changing cycle',()=>{
  const raw={teams:[],matches:[],weekly_competition:{schema_version:'friescup-weekly-public-v1',cycles:[
    {id:'A',status:'ACTIVE',weeks:[{id:'A1',week_number:1,status:'PUBLISHED',match_ids:[]}]},
    {id:'B',status:'ACTIVE',weeks:[{id:'B1',week_number:1,status:'PUBLISHED',match_ids:[]},{id:'B2',week_number:2,status:'DRAFT',match_ids:[]}]}
  ]}}
  const current={seasonId:'FCW26',cycleId:'A',weekId:'A1',match:'OLD',teamId:'T',query:'saved',status:'complete'}
  const next=nativeOverviewSelection(raw,current,new URLSearchParams('cycle=B'))
  assert.equal(next.cycleId,'B');assert.equal(next.weekId,'B1');assert.equal(next.match,'')
  assert.equal(next.query,'saved');assert.equal(next.teamId,'T');assert.equal(next.status,'complete');assert.equal(next.seasonId,'FCW26')
  assert.equal(nativeOverviewSearch({...current,weekId:'all'},{season:'FCW26'}).has('week'),false)
})
test('native state classes preserve authored active/current/expanded and independent lifecycle flags',()=>{
  const state=nativeSelectorClasses({'data-design':'kpr','data-syncing':false,'data-phone-navigation':true,'aria-current':'true','aria-pressed':false,'aria-expanded':true,'data-focused':undefined,'data-map-state':'recorded'})
  assert.ok(state.includes('shared-data-design-kpr'))
  assert.ok(state.includes('shared-data-syncing-false'))
  assert.ok(state.includes('shared-current'))
  assert.ok(state.includes('shared-expanded'))
  assert.ok(state.includes('shared-map-recorded'))
  assert.ok(!state.includes('shared-focused'));assert.ok(!state.includes('shared-selected'))
  assert.equal(nativeAssetUrl('/assets/mobile/fries-cup-symbol.png'),'/assets/mobile/fries-cup-symbol.png')
  assert.equal(nativeAssetUrl('/logos/example.png'),'https://stats.fries-cup.com/logos/example.png')
})
