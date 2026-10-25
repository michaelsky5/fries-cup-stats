import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'
import { buildWeeklyReportPreview } from '../src/features/weekly-report/weeklyReportPreview.js'
import { createIssueDraft } from '../src/features/weekly-report/weeklyIssueVersions.js'
import { WEEKLY_POSITIONS, WEEKLY_POSITION_ROLES } from '../src/features/weekly-report/weeklyPositions.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
await Promise.all(['zh-TW','en-US','ko-KR'].map(ensureUiLocale))
const exportRoot=path.resolve('output/playoff-preview')
await mkdir(exportRoot,{recursive:true})
function sample(state,locale) {
  const db=structuredClone(buildWeeklyPlayoffFixture(state==='review'?'medal-complete':state==='empty'?'pending-seeds':'medal-complete'))
  db.updated_at='2026-10-25T00:00:00.000Z'
  const names=['绿洲城','国王大道','里阿尔托','新皇后街','苏拉瓦萨'],types=['CONTROL','HYBRID','ESCORT','PUSH','FLASHPOINT']
  for(const match of db.matches.filter(m=>m.cycle_week_id==='sample-cycle-1-playoffs')) {
    const count=match.team_a.score+match.team_b.score
    const sides=count===5?[0,1,1,0,0]:count===4?[0,1,0,0]:[0,0,0]
    match.maps=sides.map((side,i)=>({map_order:i+1,map_name:names[i],map_type:types[i],winner:[match.team_a.id,match.team_b.id][side],score_a:side===0?2:0,score_b:side===1?2:0,match_time:'10:00',time:'10:00',player_stats:[]}))
    if(state==='review'&&match.round==='THIRD_PLACE')match.status='RESULT_REVIEW'
    if(state==='ruling'&&match.round==='FINAL'){match.is_forfeit=true;match.status='FORFEIT';match.team_b.score=0}
    if(state==='long')for(const team of [match.team_a,match.team_b])team.short=team.name='Championship Contenders United'
  }
  if(state==='long')for(const team of db.teams)team.team_short_name=team.team_name='Championship Contenders United'
  const report=buildWeeklyReportPreview(db,{cycleId:'sample-cycle-1',weekId:'sample-cycle-1-playoffs'})
  if(state!=='empty') {
    const heroes=['Reinhardt','Genji','Cassidy','Lucio','Ana']
    const players=WEEKLY_POSITIONS.map((position,i)=>({id:'fictional-'+i,name:'Sample '+(i+1),role:WEEKLY_POSITION_ROLES[position],position,hero:heroes[i],teams:[db.teams[i%4]],per10:{blocked:12345,damage:6789,healing:7890,elims:23.5,assists:28.1},maps:7,score:85+i,rating:85+i}))
    report.awards={...report.awards,minimumMaps:3,mvp:[players[0]],bestFive:players.map(player=>({position:player.position,role:player.role,status:'selected',player}))}
  }
  return createIssueDraft(report,'FCW2026',locale)
}
const server=await createServer({server:{host:'127.0.0.1',port:3063,strictPort:true},plugins:[{name:'playoff-newspaper-preview',configureServer(vite){
  vite.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url,'http://localhost')
    const exportMatch=/^\/__playoff\/export\/(zh-CN|zh-TW|en-US|ko-KR)\/(review|complete|long|empty|ruling)\.(pdf|png)$/.exec(url.pathname)
    if(exportMatch&&req.method==='POST') {
      if(req.headers.origin!=='http://127.0.0.1:3063'){res.statusCode=403;return res.end('Origin refused')}
      const chunks=[];let size=0
      for await (const chunk of req){size+=chunk.length;if(size>20*1024*1024){res.statusCode=413;return res.end('Too large')}chunks.push(chunk)}
      const filename=`playoff-${exportMatch[1]}-${exportMatch[2]}.${exportMatch[3]}`
      await writeFile(path.join(exportRoot,filename),Buffer.concat(chunks))
      res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({filename,bytes:size}))
    }
    if(url.pathname==='/__playoff/report.json'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(sample(url.searchParams.get('state')||'review',url.searchParams.get('locale')||'zh-CN')))}
    if(url.pathname!=='/__playoff/')return next()
    res.setHeader('Content-Type','text/html; charset=utf-8')
    res.end(await vite.transformIndexHtml(req.url,`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>季后赛专刊 · 虚构验收样张</title><style>body{margin:0;padding:16px;background:#e9e6dd;color:#2a2a2a}p,h1,h2,h3,h4,dl,dd,figure{margin:0}button{font:inherit} .sample-nav{display:flex;gap:16px;flex-wrap:wrap;max-width:900px;margin:auto;font:13px sans-serif}.sample-nav b{flex-basis:100%}</style></head><body><nav class="sample-nav"><b>虚构验收样张 / FICTIONAL LAYOUT TEST · 不发布比赛结果</b>${['zh-CN','zh-TW','en-US','ko-KR'].map(l=>`<a href="?locale=${l}&state=${url.searchParams.get('state')||'review'}">${l}</a>`).join('')}${['review','complete','long','empty','ruling'].map(s=>`<a href="?locale=${url.searchParams.get('locale')||'zh-CN'}&state=${s}">${s}</a>`).join('')}</nav><div id="root"></div><script type="module" src="/scripts/playoffPreviewEntry.jsx"></script></body></html>`))
  })
}}]})
await server.listen();console.log('Playoff newspaper preview: http://127.0.0.1:3063/__playoff/')
