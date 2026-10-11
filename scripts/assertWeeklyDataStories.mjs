import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildWeeklyReportPreview, listWeeklyReportPreviews } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildWeeklyNewspaper, buildMatchNews } from '../src/features/weekly-report/weeklyNewsroom.js'
import { collectWeeklyMapSamples, singleMapRecords, buildWeeklyDataStories, formatWeeklyDataStory } from '../src/features/weekly-report/weeklyDataStories.js'
import {buildWeeklyPeopleNews} from '../src/features/weekly-report/weeklyPeopleNews.js'

const db=JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json',import.meta.url),'utf8'))
const report=buildWeeklyReportPreview(db)
const paper=buildWeeklyNewspaper(report)

function fixture(players) {
  const totals=player=>({damage:player.damage||0,healing:player.healing||0,blocked:0,assists:0,elims:0})
  return {completed:[{id:'current',state:'complete'}],roster:players.map(player=>({id:player.id,name:player.id,role:'DPS',teamId:'team'})),
    maps:[{matchId:'current',order:1,map_name:'Samoa',player_stats:players.map(player=>({player_id:player.id,role:'DPS',team_id:'team',damage:player.damage||0,healing:player.healing||0,mitigation:0,assists:0,eliminations:0,heroes_played:'Cassidy'}))}],
    awards:{mvp:[],bestFive:[],snapshot:{inputs:players.map(player=>({matchId:'current',mapOrder:1,playerId:player.id,role:'DPS',mapMinutes:10,logs:[{hero:'Cassidy',minutes:player.minutes||10,totals:totals(player)}]}))}}}
}

test('this issue selects three distinct players and merges the actual cross-role records',()=>{
  assert.deepEqual(paper.dataStories.cards.map(card=>card.name),['麦秸','33','Answer'])
  const [dual,assists,deciding]=paper.dataStories.cards
  assert.equal(dual.kind,'cross-role-records')
  assert.deepEqual(dual.stats.map(stat=>[stat.metric,stat.value,stat.map]),[['damage',20355,'Neon Junction'],['healing',17914,'Route 66']])
  assert.equal(assists.kind,'record')
  assert.deepEqual(assists.stats.map(stat=>[stat.metric,stat.value]),[['assists',33]])
  assert.equal(deciding.kind,'deciding-map')
  assert.deepEqual(deciding.stats.map(stat=>[stat.metric,stat.value]),[['elims',38],['damage',19670]])
  assert.ok(paper.dataStories.cards.every(card=>card.stats.every(stat=>stat.unit==='single-map-total')))
  const honoured=new Set([...report.awards.mvp,...report.awards.bestFive.map(slot=>slot.player)].filter(Boolean).map(player=>player.id))
  assert.ok(paper.dataStories.cards.every(card=>!honoured.has(card.id)))
})

test('story records use actual map totals even when a shorter appearance has a higher rate',()=>{
  const sample=fixture([{id:'long',damage:10000,minutes:10},{id:'short',damage:3000,minutes:2}])
  const records=singleMapRecords(collectWeeklyMapSamples(sample))
  assert.equal(records.find(row=>row.metric==='damage').id,'long')
  assert.equal(records.find(row=>row.metric==='damage').value,10000)
  assert.ok(records.every(row=>row.unit==='single-map-total'))
})

test('the second issue spreads three story cards beyond one match and one map without inventing records',()=>{
  const issue=listWeeklyReportPreviews(db).find(sample=>sample.week.week_number===2)
  const stories=buildWeeklyNewspaper(issue).dataStories
  assert.equal(stories.cards.length,3)
  assert.ok(new Set(stories.cards.flatMap(card=>card.stats.map(stat=>stat.matchId))).size>=2)
  assert.ok(new Set(stories.cards.flatMap(card=>card.stats.map(stat=>JSON.stringify([stat.matchId,stat.order])))).size>=2)
  const recordValues=new Set(stories.records.map(record=>JSON.stringify([record.id,record.matchId,record.order,record.metric,record.value])))
  for(const card of stories.cards)for(const stat of card.stats) {
    if(stat.record)assert.ok(recordValues.has(JSON.stringify([card.id,stat.matchId,stat.order,stat.metric,stat.value])))
    else assert.doesNotMatch(formatWeeklyDataStory(card).headline,/纪录|最高/)
  }
})

test('a tied record caption identifies its map and order rather than repeating the record headline',()=>{
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:10000}])
  const card=formatWeeklyDataStory(buildWeeklyDataStories(sample,[]).cards[0])
  assert.match(card.headline,/并列最高/)
  assert.equal(card.caption,'萨摩亚 · 第 1 图')
  assert.doesNotMatch(card.caption,/最高|纪录/)
})

test('each archive issue uses only its own verified source maps',()=>{
  for(const issue of listWeeklyReportPreviews(db)) {
    const newspaper=buildWeeklyNewspaper(issue),valid=new Set(issue.maps.map(map=>`${map.matchId}|${map.order}`))
    assert.ok(newspaper.dataStories.cards.length<=3)
    assert.equal(new Set(newspaper.dataStories.cards.map(card=>card.id)).size,newspaper.dataStories.cards.length)
    for(const card of newspaper.dataStories.cards) {
      assert.ok(card.stats.length<=2)
      assert.equal(new Set(card.stats.map(stat=>stat.metric)).size,card.stats.length)
      assert.ok(card.stats.every(stat=>valid.has(`${stat.matchId}|${stat.order}`)))
    }
  }
})

test('exact duplicates count once and contradictory source totals cannot establish a record',()=>{
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:3000}])
  const row=sample.maps[0].player_stats[0]
  sample.maps[0].player_stats.push({...row})
  sample.awards.snapshot.inputs.push(structuredClone(sample.awards.snapshot.inputs[0]))
  assert.equal(singleMapRecords(collectWeeklyMapSamples(sample)).filter(record=>record.metric==='damage').length,1)
  sample.maps[0].player_stats.push({...row,damage:99999})
  assert.equal(singleMapRecords(collectWeeklyMapSamples(sample)).find(record=>record.metric==='damage').id,'b')
})

test('conflicting snapshots, invalid totals and absent evidence never create extra stories',()=>{
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:3000}])
  const conflicting=structuredClone(sample.awards.snapshot.inputs[0]);conflicting.logs[0].minutes=3
  sample.awards.snapshot.inputs.push(conflicting)
  assert.ok(collectWeeklyMapSamples(sample).every(row=>row.id!=='a'))
  sample.maps[0].player_stats[1].damage=true
  assert.equal(buildWeeklyDataStories(sample,[]).cards.length,0)
  assert.equal(buildWeeklyDataStories({...sample,awards:null},[]).cards.length,0)
})

test('a tied highest value remains explicitly tied in the generated copy',()=>{
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:10000}])
  const story=buildWeeklyDataStories(sample,[])
  assert.equal(story.records.length,2)
  assert.ok(story.records.every(record=>record.tiedCount===2&&record.tiedPlayers===2))
  for(const card of story.cards) {
    assert.match(formatWeeklyDataStory(card,'zh').headline,/并列/)
    assert.match(formatWeeklyDataStory(card,'en').headline,/JOINT/)
  }
})

test('coverage preferences never relabel a non-leading sample as a weekly record',()=>{
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:3000}])
  sample.awards.mvp=[{id:'a'}]
  const cards=buildWeeklyDataStories(sample,[]).cards
  assert.equal(cards[0].id,'a')
  const other=cards.find(card=>card.id==='b')
  assert.ok(other)
  assert.equal(other.isRecord,false)
  assert.doesNotMatch(formatWeeklyDataStory(other).headline,/最高|纪录/)
})

test('unverified deciding-map context cannot support a deciding-map headline',()=>{
  const altered=structuredClone(report)
  altered.maps.find(map=>map.matchId===report.closeMatch.id&&map.order===1).winner=''
  const articles=altered.completed.map(match=>buildMatchNews(altered,match))
  const cards=buildWeeklyDataStories(altered,articles).cards
  assert.ok(cards.every(card=>card.kind!=='deciding-map'))
})

test('other weeks, rulings and administrative maps are excluded from the story pool',()=>{
  const sample=fixture([{id:'a',damage:10000}])
  sample.completed.push({id:'ruling',state:'ruling'})
  for(const [matchId,order,is_administrative] of [['other-week',1,false],['ruling',1,false],['current',2,true]]) {
    sample.maps.push({matchId,order,is_administrative,map_name:'Samoa',player_stats:[{...sample.maps[0].player_stats[0],damage:99999}]})
    sample.awards.snapshot.inputs.push({...structuredClone(sample.awards.snapshot.inputs[0]),matchId,mapOrder:order,logs:[{minutes:10,totals:{damage:99999,healing:0,blocked:0,assists:0,elims:0}}]})
  }
  assert.equal(singleMapRecords(collectWeeklyMapSamples(sample))[0].value,10000)
  assert.equal(buildWeeklyDataStories(sample,[]).cards.length,1)
})

test('source ordering does not change selected people, figures or copy',()=>{
  const altered=structuredClone(report)
  altered.maps.reverse();altered.roster.reverse();altered.completed.reverse();altered.awards.snapshot.inputs.reverse()
  altered.maps.forEach(map=>map.player_stats.reverse())
  assert.deepEqual(buildWeeklyNewspaper(altered).dataStories,paper.dataStories)
})

test('generating editorial stories never mutates the award candidates or result',()=>{
  const before=structuredClone(report.awards)
  buildWeeklyNewspaper(report)
  assert.deepEqual(report.awards,before)
  assert.deepEqual(report.awards.bestFive.map(slot=>slot.position),['TANK','FLEX_DPS','HITSCAN','MAIN_SUPPORT','FLEX_SUPPORT'])
})

test('the numeric-name hook uses a verified exact count and retains record context',()=>{
  const card=paper.dataStories.cards.find(card=>card.name==='33')
  assert.equal(card.editorialHook,'number-echo')
  assert.match(card.headline,/33，打出 33 次助攻/)
  assert.match(card.caption,/本周单图助攻最高/)
  assert.match(formatWeeklyDataStory(card,'en').headline,/33 POSTS 33 ASSISTS/)
  for(const alteration of [{name:'033'},{name:'33x'},{isRecord:false},{stats:[{...card.stats[0],unit:'per-10-minutes'}]},{stats:[{...card.stats[0],value:32}]}]) {
    assert.equal(formatWeeklyDataStory({...card,...alteration}).editorialHook,null)
  }
  assert.match(formatWeeklyDataStory({...card,stats:[{...card.stats[0],tiedCount:2}]}).caption,/并列/)
})

test('rotating people notes add distinct non-honoured faces with traceable map facts',()=>{
  const excluded=paper.dataStories.cards.map(card=>card.id)
  const notes=buildWeeklyPeopleNews(report,{featuredIds:excluded})
  assert.deepEqual(notes.people.map(p=>p.name),['MZC','欢猪猪'])
  const allFeatured=new Set([...excluded,...report.awards.mvp.map(p=>p.id),...report.awards.bestFive.map(s=>s.player?.id)])
  assert.ok(notes.people.every(p=>!allFeatured.has(p.id)))
  assert.equal(new Set(notes.people.map(p=>p.id)).size,notes.people.length)
  for(const note of notes.people) {
    assert.ok(note.sources.every(source=>report.maps.some(map=>map.matchId===source.matchId&&map.order===source.order)))
    assert.doesNotMatch(note.summary,/最高|最佳|获奖/)
  }
  assert.equal(buildWeeklyPeopleNews({...report,awards:null}).people.length,0)
  const allIds=report.roster.map(p=>p.id)
  assert.equal(buildWeeklyPeopleNews(report,{featuredIds:allIds}).people.length,0)
})

test('people notes rotate across archive issues and ignore raw-only or conflicting evidence',()=>{
  for(const issue of listWeeklyReportPreviews(db)) {
    const newspaper=buildWeeklyNewspaper(issue)
    for(const note of newspaper.peopleNews.people) {
      assert.ok(note.sources.every(source=>issue.maps.some(map=>map.matchId===source.matchId&&map.order===source.order)))
      assert.ok(!newspaper.dataStories.cards.some(card=>card.id===note.id))
    }
  }
  const sample=fixture([{id:'a',damage:10000},{id:'b',damage:3000}])
  const disputed=structuredClone(sample.awards.snapshot.inputs[0]);disputed.logs[0].minutes=3
  sample.awards.snapshot.inputs.push(disputed)
  assert.ok(buildWeeklyPeopleNews(sample).people.every(p=>p.id!=='a'))
  sample.completed[0].state='ruling'
  assert.equal(buildWeeklyPeopleNews(sample).people.length,0)
})

test('people-note selection is stable under source reordering and preserves the report',()=>{
  const before=structuredClone(report),altered=structuredClone(report)
  altered.maps.reverse();altered.roster.reverse();altered.awards.snapshot.inputs.reverse()
  assert.deepEqual(buildWeeklyPeopleNews(altered,{featuredIds:paper.dataStories.cards.map(c=>c.id)}),paper.peopleNews)
  assert.deepEqual(report,before)
})
