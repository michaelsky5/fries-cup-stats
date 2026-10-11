import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildWeeklyReportPreview,listWeeklyReportPreviews} from '../src/features/weekly-report/weeklyReportPreview.js'
import {buildWeeklyNewspaper,buildMatchNews,newspaperTeamName,buildWeeklyHeroUsage,buildWeeklyFunFacts} from '../src/features/weekly-report/weeklyNewsroom.js'
import {makeNewspaperPdf,PAPER_SIZE,A4_POINTS,editionFilename} from '../src/features/weekly-report/newspaperExport.js'
import {buildWeeklyNewspaperResultsUrl,buildWeeklyNewspaperQr} from '../src/features/weekly-report/weeklyNewspaperShare.js'

const db=JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json',import.meta.url),'utf8'))
const report=buildWeeklyReportPreview(db)
const paper=buildWeeklyNewspaper(report)

test('printed results links keep the exact issue on the public site in every supported language',()=>{
  for (const [locale,param] of [['zh-CN','zh'],['zh-TW','zh-TW'],['ko-KR','ko'],['en-US','en']]) {
    const url=new URL(buildWeeklyNewspaperResultsUrl(report,'FCW2026',locale))
    assert.equal(url.origin,'https://stats.fries-cup.com')
    assert.equal(url.pathname,'/matches')
    assert.equal(url.searchParams.get('cycle'),report.cycle.id)
    assert.equal(url.searchParams.get('week'),report.week.id)
    assert.equal(url.searchParams.get('season'),'FCW2026')
    assert.equal(url.searchParams.get('lang'),param)
    assert.equal(url.searchParams.size,4)
    assert.equal(url.hash,'')
  }
})

test('missing issue identity never produces a QR for a different or default week',()=>{
  for (const issue of [null,{}, {...report,cycle:null}, {...report,week:{} }]) assert.equal(buildWeeklyNewspaperResultsUrl(issue,'FCW2026','zh'),'')
  assert.equal(buildWeeklyNewspaperResultsUrl(report,'','zh'),'')
  assert.equal(buildWeeklyNewspaperResultsUrl(report,'unknown-season','zh'),'')
  assert.equal(buildWeeklyNewspaperQr(''),null)
})

test('share URL treats identifier text as data instead of accepting extra URL parameters',()=>{
  const issue={cycle:{id:'cycle&host=localhost'},week:{id:'week#other'}}
  const url=new URL(buildWeeklyNewspaperResultsUrl(issue,'FCW26','en'))
  assert.equal(url.searchParams.get('cycle'),issue.cycle.id)
  assert.equal(url.searchParams.get('week'),issue.week.id)
  assert.equal(url.searchParams.get('season'),'FCW2026')
  assert.equal(url.searchParams.size,4)
  assert.equal(url.hash,'')
})

test('the lead tells a verified fifth-map result, not an imagined tactical story',()=>{
  assert.equal(paper.lead.id,'FCW26-SWISS-R1-M09')
  assert.match(paper.lead.title,/MH 连取末两图，3:2 战胜 404/)
  assert.equal(paper.lead.decisive.map_name,'Route 66')
  assert.match(paper.lead.paragraphs[1],/前四图双方战成 2:2/)
  assert.deepEqual(paper.lead.sources,['FCW26-SWISS-R1-M09'])
  assert.doesNotMatch(JSON.stringify(paper.lead),/精彩操作|战术压制|观众沸腾|采访|MH_PLACEHOLDER/)
})

test('editorial stamps require a verified reversal or winning streak',()=>{
  assert.deepEqual(paper.lead.editorialMark,{kind:'late-comeback',label:'末两图逆转'})
  const match=report.closeMatch
  const make=(wins)=>{
    const sample=structuredClone(report),target=structuredClone(match)
    target.team_a.score=wins.filter(side=>side==='a').length;target.team_b.score=wins.filter(side=>side==='b').length
    sample.maps.filter(m=>m.matchId===match.id).sort((a,b)=>a.order-b.order).forEach((map,index)=>{map.winner=index>=wins.length?'':wins[index]==='a'?target.team_a.id:target.team_b.id})
    return buildMatchNews(sample,target)
  }
  assert.equal(make(['a','a','a','a','a']).editorialMark.kind,'sweep')
  assert.equal(make(['b','a','a','a','a']).editorialMark.kind,'four-straight')
  assert.equal(make(['a','a','b','a','a']).editorialMark,null)
  assert.equal(make(['a','b','a','b','a']).editorialMark,null)
  const partial=structuredClone(report);partial.maps.find(m=>m.matchId===match.id&&m.order===1).winner=''
  assert.equal(buildMatchNews(partial,match).editorialMark,null)
  assert.equal(buildMatchNews(report,{...match,state:'ruling'}).editorialMark,null)
})
test('partial or contradictory winners never support a sequence or deciding-map claim',()=>{
  const match=report.closeMatch
  for(const alter of [r=>r.maps.find(m=>m.matchId===match.id).winner='',r=>r.maps=r.maps.filter(m=>!(m.matchId===match.id&&m.order===5)),r=>r.maps.find(m=>m.matchId===match.id&&m.order===4).winner=match.team_b.id,r=>r.maps.find(m=>m.matchId===match.id&&m.order===4).order=3,r=>r.maps.find(m=>m.matchId===match.id&&m.order===5).is_administrative=true]) {
    const r=structuredClone(report);alter(r)
    const story=buildMatchNews(r,match)
    assert.doesNotMatch(story.title,/连取/)
    assert.equal(story.decisive,null)
    assert.doesNotMatch(story.paragraphs.join(''),/前四图|这一图确定|赢下/)
    assert.doesNotMatch(story.brief,/连下|连赢|追回|扳回|决胜|翻盘|首两图|前四图|末两图/)
  }
})
test('administrative rulings and missing scores are reported as such',()=>{
  const ruling={...report.closeMatch,state:'ruling'}
  const story=buildMatchNews(report,ruling)
  assert.match(story.title,/判定结果/)
  assert.equal(story.decisive,null)
  const missing={...report.closeMatch,team_a:{...report.closeMatch.team_a,score:''}}
  const incomplete=buildMatchNews(report,missing)
  assert.doesNotMatch(incomplete.title,/战胜|连取/)
  assert.match(incomplete.result,/—/)
})
test('a one-page edition has two briefs and at most two observed people even for large fields',()=>{
  const large=structuredClone(report)
  large.roster=Array.from({length:1000},(_,i)=>({...report.roster[i%report.roster.length],id:`extra-${i}`}))
  large.completed=Array.from({length:120},(_,i)=>({...report.completed[i%3],id:`extra-match-${i}`}))
  const largePaper=buildWeeklyNewspaper(large)
  assert.equal(largePaper.pageCount,1)
  assert.equal(largePaper.briefs.length,2)
  assert.ok(largePaper.peopleNews.people.length<=2)
  assert.equal(largePaper.rosterPages,undefined)
  for(const sample of listWeeklyReportPreviews(db)) {
    const issue=buildWeeklyNewspaper(sample)
    assert.equal(issue.pageCount,1)
    assert.ok(issue.briefs.length<=2)
    assert.ok(issue.articles.every(a=>sample.completed.some(m=>m.id===a.id)))
    assert.equal(issue.generation.weekId,sample.week.id)
  }
})
test('the people corner adds unfeatured people using cross-role and map facts without calling them winners',()=>{
  const mz=paper.peopleNews.people.find(p=>p.name==='MZC'),tank=paper.peopleNews.people.find(p=>p.name==='欢猪猪')
  assert.deepEqual(mz.roles,[{role:'TANK',maps:4},{role:'SUP',maps:1}])
  assert.equal(tank.metric,'blocked')
  assert.equal(tank.value,22763)
  assert.match(tank.summary,/单图阻挡 22,763/)
  assert.doesNotMatch(tank.summary,/最高|最佳|冠军/)
  assert.ok(paper.peopleNews.people.every(person=>!paper.dataStories.cards.some(card=>card.id===person.id)))
  assert.match(paper.peopleNews.note,/不代表荣誉评选/)
  for(const field of ['publication','issueStandings']) assert.equal(paper[field],null)
  assert.equal(paper.awards.status,'automatic-preview')
})
test('map and ban frequency captions retain exact counts and ties',()=>{
  assert.match(paper.mapNews.title,/3 次/)
  assert.match(paper.mapNews.paragraphs[0],/霓虹枢纽/)
  assert.match(paper.banNews.summary,/堡垒、D.Mon、飞天猫各被 Ban 3 次/)
  assert.match(paper.banNews.summary,/27 条/)
  assert.equal(newspaperTeamName({short:'?',name:'Ateam'}),'Ateam')
})

test('visual score paths and first-map comebacks require all five verified winners',()=>{
  assert.deepEqual(paper.lead.scoreOrder,['MH','404'])
  assert.deepEqual(paper.lead.sequence.map(map=>map.mapScore),[[0,2],[3,0],[2,3],[1,0],[4,3]])
  assert.deepEqual(paper.lead.sequence.map(map=>map.runningScore),[[0,1],[1,1],[1,2],[2,2],[3,2]])
  assert.equal(paper.funFacts.comeback.count,1)
  assert.equal(paper.funFacts.comeback.total,3)
  const partial=structuredClone(report)
  partial.maps.find(map=>map.matchId===paper.lead.id&&map.order===1).winner=''
  const issue=buildWeeklyNewspaper(partial)
  assert.deepEqual(issue.lead.sequence,[])
  assert.equal(issue.funFacts.comeback.count,0)
  assert.equal(issue.funFacts.comeback.total,2)
})

test('hero leaders include all validated weekly appearances, not only the honour lineup',()=>{
  assert.deepEqual(paper.heroNews.highlights.map(hero=>[hero.name,hero.count,hero.rank]),[['Kiriko',23,1],['Jetpack Cat',12,2],['Shion',12,2]])
  assert.equal(paper.heroNews.appearances,150)
  assert.equal(paper.heroNews.playerMaps,150)
  assert.equal(paper.heroNews.scope,'validated-player-map-hero')
  assert.deepEqual(buildWeeklyHeroUsage({...report,awards:{snapshot:report.awards.snapshot}}),buildWeeklyHeroUsage(report))
  assert.deepEqual(buildWeeklyHeroUsage({...report,awards:null}).frequency,[])
})

test('hero switches and aliases count once per player/map/hero within actual confirmed maps',()=>{
  const sample={completed:[{id:'current',state:'complete'},{id:'ruling',state:'ruling'}],maps:[{matchId:'current',order:1},{matchId:'current',order:2},{matchId:'current',order:3,is_administrative:true},{matchId:'ruling',order:1}],awards:{snapshot:{inputs:[
    {matchId:'current',mapOrder:1,playerId:'a',logs:[{hero:'Kiriko',minutes:4},{hero:'雾子',minutes:2},{hero:'Ana',minutes:1},{hero:'Unknown',minutes:2},{hero:'Tracer',minutes:0}]},
    {matchId:'current',mapOrder:1,playerId:'a',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'current',mapOrder:1,playerId:'b',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'current',mapOrder:2,playerId:'a',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'current',mapOrder:3,playerId:'a',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'ruling',mapOrder:1,playerId:'a',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'last-week',mapOrder:1,playerId:'a',logs:[{hero:'Kiriko',minutes:4}]},
    {matchId:'current',mapOrder:2,playerId:'',logs:[{hero:'Kiriko',minutes:4}]}
  ]}}}
  const usage=buildWeeklyHeroUsage(sample)
  assert.deepEqual(usage.frequency,[{name:'Kiriko',count:3,rank:1},{name:'Ana',count:1,rank:2}])
  assert.equal(usage.appearances,4)
  assert.equal(usage.playerMaps,3)
})

test('three displayed hero leaders retain tied ranks and acknowledge omitted boundary ties',()=>{
  const tied=structuredClone(report)
  tied.awards.snapshot.inputs=[{matchId:report.maps[0].matchId,mapOrder:report.maps[0].order,playerId:'a',logs:['Kiriko','Ana','Tracer','Cassidy'].map(hero=>({hero,minutes:1}))}]
  const issue=buildWeeklyNewspaper(tied)
  assert.equal(issue.heroNews.highlights.length,3)
  assert.deepEqual(issue.heroNews.highlights.map(hero=>hero.rank),[1,1,1])
  assert.equal(issue.heroNews.tieCount,4)
  assert.equal(issue.heroNews.omittedTies,1)
  assert.equal(buildWeeklyNewspaper({...report,awards:null}).heroNews.highlights.length,0)
})

test('hero leaders follow the selected archive issue and never reuse a later week',()=>{
  const issues=listWeeklyReportPreviews(db).map(sample=>buildWeeklyNewspaper(sample))
  assert.deepEqual(issues.map(issue=>issue.heroNews.appearances),[150,250,100])
  assert.deepEqual(issues.map(issue=>issue.heroNews.highlights[0].count),[23,28,14])
  assert.equal(issues[2].heroNews.tieCount,2)
})

test('missing or conflicting single-map scores never borrow a cumulative series score',()=>{
  for(const defect of ['missing','partial','conflicting','winner-mismatch']) {
    const altered=structuredClone(report),map=altered.maps.find(map=>map.matchId===paper.lead.id&&map.order===2)
    if(defect==='missing') {delete map.score_a;delete map.score_b;delete map.score}
    if(defect==='partial') {delete map.score_b}
    if(defect==='conflicting') map.score='1:1'
    if(defect==='winner-mismatch') {map.score_a='0';map.score_b='3';map.score='0:3'}
    const article=buildMatchNews(altered,report.closeMatch),entry=article.sequence.find(map=>map.order===2)
    assert.equal(entry.mapScore,null,defect)
    assert.deepEqual(entry.runningScore,[1,1],defect)
    assert.equal(entry.mapScoreStatus,['conflicting','winner-mismatch'].includes(defect)?'inconsistent':'missing',defect)
  }
  const legacy=structuredClone(report),map=legacy.maps.find(map=>map.matchId===paper.lead.id&&map.order===2)
  delete map.score_a;delete map.score_b
  assert.deepEqual(buildMatchNews(legacy,report.closeMatch).sequence.find(map=>map.order===2).mapScore,[3,0])
})

test('single-map peaks rank per ten minutes within this week and retain their source totals',()=>{
  assert.equal(Math.round(paper.funFacts.damage.value),14854)
  assert.equal(paper.funFacts.damage.rawValue,12230)
  assert.equal(paper.funFacts.damage.minutes,494/60)
  assert.equal(paper.funFacts.damage.name,'KK')
  assert.equal(paper.funFacts.damage.hero,'Bastion')
  assert.equal(paper.funFacts.damage.map,'Suravasa')
  assert.equal(Math.round(paper.funFacts.healing.value),13269)
  assert.equal(paper.funFacts.healing.rawValue,17095)
  assert.equal(paper.funFacts.healing.minutes,773/60)
  assert.equal(paper.funFacts.healing.name,'slipknot')
  assert.equal(paper.funFacts.healing.hero,'Kiriko')
  assert.equal(paper.funFacts.healing.map,'Neon Junction')
  for(const peak of [paper.funFacts.damage,paper.funFacts.healing]) {
    assert.equal(peak.unit,'per-10-minutes')
    assert.equal(peak.value,peak.rawValue/peak.minutes*10)
  }
  const altered=structuredClone(report)
  altered.maps.push({...report.maps[0],matchId:'another-week',player_stats:[{...report.maps[0].player_stats[0],damage:999999,healing:999999}]})
  assert.deepEqual(buildWeeklyNewspaper(altered).funFacts.damage,paper.funFacts.damage)
})

test('duplicated or contradictory stat rows do not manufacture a peak or a tie',()=>{
  const repeated=structuredClone(report)
  const map=repeated.maps.find(m=>m.matchId===paper.funFacts.damage.matchId&&m.order===paper.funFacts.damage.order)
  const row=map.player_stats.find(r=>r.player_id===paper.funFacts.damage.id)
  map.player_stats.push({...row})
  assert.deepEqual(buildWeeklyNewspaper(repeated).funFacts.damage,paper.funFacts.damage)
  map.player_stats.push({...row,damage:row.damage+10})
  assert.equal(Math.round(buildWeeklyNewspaper(repeated).funFacts.damage.value),14467)
  const tied=structuredClone(report)
  const tieMap=tied.maps.find(m=>m.matchId===paper.funFacts.damage.matchId&&m.order===paper.funFacts.damage.order)
  const tieRow=tieMap.player_stats.find(r=>r.player_id!==paper.funFacts.damage.id)
  const tieInput=tied.awards.snapshot.inputs.find(input=>input.matchId===tieMap.matchId&&input.mapOrder===tieMap.order&&input.playerId===tieRow.player_id)
  tieRow.damage=paper.funFacts.damage.rawValue
  tieInput.logs[0].totals.damage=paper.funFacts.damage.rawValue
  tieInput.logs[0].minutes=paper.funFacts.damage.minutes
  tieInput.mapMinutes=paper.funFacts.damage.minutes
  assert.equal(buildWeeklyNewspaper(tied).funFacts.damage.tiedCount,2)
})

const perTenSample=()=>({
  completed:[{id:'current',state:'complete'},{id:'ruling',state:'ruling'}],roster:[],
  maps:[{matchId:'current',order:1,map_name:'Samoa',player_stats:[
    {player_id:'long',player_name:'Long#123',role:'DPS',damage:10000,healing:0,heroes_played:'Cassidy'},
    {player_id:'short',player_name:'Short#456',role:'DPS',damage:3000,healing:0,heroes_played:'Tracer'}
  ]}],
  awards:{snapshot:{inputs:[
    {matchId:'current',mapOrder:1,playerId:'long',role:'DPS',mapMinutes:10,logs:[{minutes:10,totals:{damage:10000,healing:0}}]},
    {matchId:'current',mapOrder:1,playerId:'short',role:'DPS',mapMinutes:10,logs:[{minutes:2,totals:{damage:3000,healing:0}}]}
  ]}}
})

test('per-ten rates compare actual playtime rather than raw totals or match length',()=>{
  const sample=perTenSample(),peak=buildWeeklyFunFacts(sample,[]).damage
  assert.equal(peak.name,'Short')
  assert.equal(peak.value,15000)
  assert.equal(peak.minutes,2)
  assert.equal(buildWeeklyFunFacts(sample,[]).healing,null)
  const capped=structuredClone(sample)
  capped.awards.snapshot.inputs[1].mapMinutes=2
  capped.awards.snapshot.inputs[1].logs[0].minutes=20
  assert.deepEqual(buildWeeklyFunFacts(capped,[]).damage,peak)
  const switched=structuredClone(sample)
  switched.awards.snapshot.inputs[1].logs=[{minutes:1,totals:{damage:1800,healing:0}},{minutes:1,totals:{damage:1200,healing:0}}]
  assert.deepEqual(buildWeeklyFunFacts(switched,[]).damage,peak)
})

test('missing or inconsistent playtime never falls back to a raw-total peak',()=>{
  for(const change of [
    input=>delete input.mapMinutes,
    input=>input.logs[0].minutes=0,
    input=>input.logs[0].minutes=true,
    input=>input.logs[0].minutes=NaN,
    input=>input.logs[0].totals.damage=3001
  ]) {
    const sample=perTenSample();change(sample.awards.snapshot.inputs[1])
    assert.equal(buildWeeklyFunFacts(sample,[]).damage.name,'Long')
  }
  const sample=perTenSample()
  assert.equal(buildWeeklyFunFacts({...sample,awards:null},[]).damage,null)
  sample.awards.snapshot.inputs.push(structuredClone(sample.awards.snapshot.inputs[1]))
  assert.equal(buildWeeklyFunFacts(sample,[]).damage.tiedCount,1)
  sample.awards.snapshot.inputs.at(-1).logs[0].minutes=3
  assert.equal(buildWeeklyFunFacts(sample,[]).damage.name,'Long')
})

test('per-ten peaks exclude other weeks, administrative maps and rulings',()=>{
  const sample=perTenSample()
  for(const [matchId,order,is_administrative] of [['last-week',1,false],['ruling',1,false],['current',2,true]]) {
    sample.maps.push({matchId,order,is_administrative,map_name:'Samoa',player_stats:[{player_id:'extra',role:'DPS',damage:999999,healing:999999}]})
    sample.awards.snapshot.inputs.push({matchId,mapOrder:order,playerId:'extra',role:'DPS',mapMinutes:10,logs:[{minutes:1,totals:{damage:999999,healing:999999}}]})
  }
  assert.equal(buildWeeklyFunFacts(sample,[]).damage.name,'Short')
  assert.equal(buildWeeklyFunFacts(sample,[]).healing,null)
})

test('match briefs use natural copy without calling an opening map win a recovery',()=>{
  assert.deepEqual(paper.briefs.map(article=>article.visualNote),['CSM 在香巴里寺院扳回一图。','MMGT 在香巴里寺院扳回一图。'])
  for(const issue of listWeeklyReportPreviews(db)) {
    const articles=buildWeeklyNewspaper(issue).articles
    for(const article of articles.filter(article=>article.sequence.length===5)) {
      const loserSide=article.displayScores[0]<article.displayScores[1]?'a':'b'
      const losses=article.sequence.filter(map=>map.winnerSide===loserSide)
      if(losses.length===1&&losses[0].order===1) {
        assert.match(article.visualNote,/随后连赢四图/)
        assert.doesNotMatch(article.visualNote,/扳回|唯一一胜/)
      }
    }
  }
})

test('current briefs distinguish the verified opening, reply and closing sequences in two sentences',()=>{
  const [first,second]=paper.briefs
  assert.match(first.brief,/Ateam 连下首两图，取得 2:0 领先/)
  assert.match(first.brief,/CSM 在香巴里寺院扳回一图，Ateam 随后拿下末两图/)
  assert.match(second.brief,/SPS.V 以三图连胜开局/)
  assert.match(second.brief,/MMGT 在香巴里寺院追回一图，SPS.V 再取霓虹枢纽收尾/)
  const english=buildWeeklyNewspaper(report,'en-US').briefs
  assert.match(english[0].brief,/Ateam opened 2:0.*CSM won Shambali Monastery.*Ateam took the last two/)
  assert.match(english[1].brief,/SPS.V opened 3:0.*MMGT won Shambali Monastery.*SPS.V took Neon Junction/)
  for(const issue of listWeeklyReportPreviews(db)) for(const article of buildWeeklyNewspaper(issue).articles) {
    assert.ok((article.brief.match(/。/g)||[]).length<=2)
    assert.doesNotMatch(article.brief,/战术|压制|操作|关键团战|观众|唯一一胜/)
  }
})

test('the only lost map changes the news account instead of reusing a generic recovery',()=>{
  const base=report.completed.find(match=>match.id===paper.briefs[0].id)
  for(let lostOrder=1;lostOrder<=5;lostOrder++) {
    const sample=structuredClone(report)
    sample.maps.filter(map=>map.matchId===base.id).forEach(map=>{map.winner=map.order===lostOrder?base.team_b.id:base.team_a.id})
    const story=buildMatchNews(sample,base)
    if(lostOrder===1) {assert.match(story.brief,/率先拿下.*随后连赢四图/);assert.doesNotMatch(story.brief,/扳回|追回/)}
    if(lostOrder===2) assert.match(story.brief,/追成 1:1.*随后三图/)
    if(lostOrder===3) assert.match(story.brief,/首两图.*2:0.*末两图/)
    if(lostOrder===4) assert.match(story.brief,/三图连胜开局.*收尾/)
    if(lostOrder===5) {assert.match(story.brief,/连下前四图.*收官图/);assert.doesNotMatch(story.brief,/再取|末两图|扳回/)}
  }
})

test('a fifth-map win, a reversal and a late losing map remain different factual stories',()=>{
  const base=report.closeMatch, expected=[[/2:1 领先.*连拿.*完成翻盘/,[false,true,false,true,true]],[/将比分追成 2:2.*赢下决胜图/,[true,true,false,false,true]],[/前四图拿下三图.*收官图赢下/,[true,false,true,true,false]]]
  for(const [wording,winners] of expected) {
    const sample=structuredClone(report)
    sample.maps.filter(map=>map.matchId===base.id).forEach(map=>{map.winner=winners[map.order-1]?base.team_a.id:base.team_b.id})
    const story=buildMatchNews(sample,base)
    assert.match(story.brief,wording)
    if(!winners[4]) {assert.equal(story.decisive,null);assert.doesNotMatch(story.brief,/翻盘|决胜图/)}
  }
  const sweep=buildWeeklyNewspaper(listWeeklyReportPreviews(db).find(issue=>issue.week.week_number===2)).articles.find(article=>article.result==='MH 5:0 蒙粤队')
  assert.match(sweep.brief,/从尼泊尔一路赢到阿特利斯，五图全胜/)
})

test('the updates desk accepts both product and game notes only for this published issue',()=>{
  const note={id:'release-1',title:'Test product note',state:'published',category:'product',weekId:report.week.id,cycleId:report.cycle.id}
  const withUpdates={...report,updates:[note,{...note,id:'game-1',category:'game',title:'Test game note'},{...note,id:'old',weekId:'previous-week'},{...note,id:'draft',state:'draft'}]}
  assert.deepEqual(buildWeeklyNewspaper(withUpdates).updates.map(item=>item.id),['release-1','game-1'])
  assert.deepEqual(paper.updates,[])
})
test('an empty confirmed week remains a sample, not a borrowed story',()=>{
  const empty={...report,completed:[],maps:[],roster:[],mapFrequency:[],bans:[],namedBans:0,closeMatch:null,playerCount:0,awards:null}
  const issue=buildWeeklyNewspaper(empty)
  assert.equal(issue.lead,null);assert.deepEqual(issue.briefs,[])
  assert.deepEqual(issue.peopleNews.people,[]);assert.equal(issue.pageCount,1)
  assert.equal(issue.awards,null)
})
test('sharing copy and filenames preserve issue identity and sample status',()=>{
  assert.ok(paper.sharingText.includes(paper.lead.title))
  assert.match(paper.sharingText,/第 3 周（样报）/)
  assert.match(paper.sharingText,/2026\/10\/05 21:01 UTC\+8/)
  assert.match(paper.sharingText,/尚未正式发布/)
  assert.equal(editionFilename(report,'.pdf'),'FriesCup-Weekly-C01-3-sample.pdf')
  assert.equal(editionFilename({...report,cycle:{code:'../../invalid'}},'.png').includes('../'),false)
  assert.deepEqual(PAPER_SIZE,{width:900,height:1273})
})
test('PDF assembly places exactly the supplied image on each A4 page',async()=>{
  const calls=[]
  const fakePdf={setTitle:t=>calls.push(['title',t]),setAuthor:()=>{},setSubject:()=>{},embedJpg:async image=>image,addPage:size=>({drawImage:(image,options)=>calls.push({size,image,options})}),save:async()=>new Uint8Array([37,80,68,70])}
  await assert.rejects(makeNewspaperPdf({create:async()=>fakePdf},[],'Issue'),/No newspaper pages/)
  const bytes=await makeNewspaperPdf({create:async()=>fakePdf},[new Uint8Array([1,2])],'Issue')
  assert.deepEqual([...bytes],[37,80,68,70])
  const draw=calls.find(call=>call.size)
  assert.deepEqual(draw.size,A4_POINTS)
  assert.deepEqual(draw.options,{x:0,y:0,width:A4_POINTS[0],height:A4_POINTS[1]})
})

test('winner-first display reverses the entire score path while retaining immutable source data',()=>{
  const issue=listWeeklyReportPreviews(db).find(sample=>sample.week.week_number===2)
  const before=structuredClone(issue)
  const story=buildWeeklyNewspaper(issue).lead
  assert.equal(story.result,'MMGT 3:2 Ateam')
  assert.equal(story.sourceResult,'Ateam 2:3 MMGT')
  assert.deepEqual(story.scoreOrder,['MMGT','Ateam'])
  assert.deepEqual(story.sourceScoreOrder,['Ateam','MMGT'])
  assert.deepEqual(story.displayScores,[3,2])
  assert.deepEqual(story.sequence.map(map=>map.mapScore),[[2,1],[0,3],[1,0],[0,3],[1,0]])
  assert.deepEqual(story.sequence.map(map=>map.runningScore),[[1,0],[1,1],[2,1],[2,2],[3,2]])
  assert.deepEqual(story.sequence.map(map=>map.winnerSide),['a','b','a','b','a'])
  assert.match(story.title,/赢下决胜图，3:2 战胜 Ateam/)
  assert.match(story.brief,/交替获胜.*2:2.*拿下香巴里寺院/)
  assert.deepEqual(issue,before)
})

test('reversing the display never manufactures a missing or inconsistent map score',()=>{
  const issue=listWeeklyReportPreviews(db).find(sample=>sample.week.week_number===2)
  const match=issue.closeMatch
  for(const values of [[null,null],[1,1]]) {
    const changed=structuredClone(issue)
    const map=changed.maps.find(sample=>sample.matchId===match.id&&sample.order===1)
    map.score_a=values[0];map.score_b=values[1];map.score=''
    assert.equal(buildMatchNews(changed,match).sequence[0].mapScore,null)
  }
})

test('multiweek briefs prefer different verified match patterns and keep the remaining results visible',()=>{
  const issues=listWeeklyReportPreviews(db)
  const first=buildWeeklyNewspaper(issues.find(sample=>sample.week.week_number===1))
  const second=buildWeeklyNewspaper(issues.find(sample=>sample.week.week_number===2))
  assert.equal(first.layout,'compact')
  assert.equal(second.layout,'standard')
  assert.equal(new Set(second.briefs.map(article=>article.newsKind)).size,2)
  assert.equal(second.otherResults.length,2)
  assert.deepEqual(new Set([second.lead,...second.briefs,...second.otherResults].map(article=>article.id)),new Set(second.articles.map(article=>article.id)))
  const reordered={...second.report,completed:[...second.report.completed].reverse(),maps:[...second.report.maps].reverse()}
  const other=buildWeeklyNewspaper(reordered)
  assert.deepEqual(other.briefs.map(article=>article.id),second.briefs.map(article=>article.id))
  assert.deepEqual(other.otherResults.map(article=>article.id),second.otherResults.map(article=>article.id))
  const ordinary=first.lead
  assert.doesNotMatch(ordinary.title,/末两图|逆转|决胜/)
})
