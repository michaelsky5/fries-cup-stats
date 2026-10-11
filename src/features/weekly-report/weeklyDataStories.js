import { getOwHero, formatOwMapName } from '../../lib/heroes.js'
import { translateUiText } from '../../lib/uiText.js'

const metrics = ['damage','healing','blocked','assists','elims']
const fields = {damage:'damage',healing:'healing',blocked:'mitigation',assists:'assists',elims:'eliminations'}
const priority = {damage:50,healing:50,assists:40,blocked:30,elims:25}
const roleOf = value => ({TANK:'TANK',DPS:'DPS',DAMAGE:'DPS',SUP:'SUP',SUPPORT:'SUP'})[String(value||'').toUpperCase()]
const amount = value => value!=null && typeof value!=='boolean' && String(value).trim()!=='' && Number.isInteger(Number(value)) && Number(value)>=0 ? Number(value) : null
const keyOf = (matchId,order,id,role) => JSON.stringify([String(matchId),Number(order),String(id),role])
const compareKey = (a,b) => a.key.localeCompare(b.key)

export const WEEKLY_STORY_POLICY = Object.freeze({
  version:'weekly-stories-v2',maximumCards:3,maximumMetrics:2,
  scope:'confirmed-current-week-played-maps',recordUnit:'single-map-total',
  anchor:'verified-weekly-record',uniquePlayer:true,
  sourceContextTarget:2,
  selection:['new-to-page','outside-honours','different-match','different-map','weekly-record','different-topic','different-team','editorial-priority','stable-source-key'],
  fallback:'verified-role-leaders-or-fewer-cards'
})

// Keep exact repeats once; conflicting source rows or snapshots cannot establish a fact.
export function collectWeeklyMapSamples(report) {
  const completed=new Set((report.completed||[]).filter(match=>match.state==='complete').map(match=>String(match.id)))
  const people=new Map((report.roster||[]).map(person=>[`${person.id}|${person.role}`,person]))
  const inputs=new Map(), conflicts=new Set()
  for(const input of report.awards?.snapshot?.inputs||[]) {
    const role=roleOf(input.role), mapMinutes=Number(input.mapMinutes), logs=input.logs
    if(!role||!input.playerId||typeof input.mapMinutes==='boolean'||!Number.isFinite(mapMinutes)||mapMinutes<=0||!logs?.length)continue
    if(logs.some(log=>typeof log.minutes==='boolean'||!Number.isFinite(Number(log.minutes))||Number(log.minutes)<=0||['damage','healing'].some(metric=>amount(log.totals?.[metric])==null)))continue
    const totals=Object.fromEntries(metrics.map(metric=>[metric,logs.every(log=>amount(log.totals?.[metric])!=null)?logs.reduce((sum,log)=>sum+Number(log.totals[metric]),0):null]))
    const timing={minutes:Math.min(mapMinutes,logs.reduce((sum,log)=>sum+Number(log.minutes),0)),totals}
    const key=keyOf(input.matchId,input.mapOrder,input.playerId,role)
    if(inputs.has(key)&&JSON.stringify(inputs.get(key))!==JSON.stringify(timing))conflicts.add(key)
    inputs.set(key,timing)
  }
  const rows=new Map()
  for(const map of report.maps||[]) {
    if(!completed.has(String(map.matchId))||map.is_administrative)continue
    for(const raw of map.player_stats||[]) {
      const id=String(raw.player_id||'').trim(),role=roleOf(raw.role)
      if(!id||!role)continue
      const key=keyOf(map.matchId,map.order,id,role),timing=inputs.get(key)
      if(!timing||conflicts.has(key))continue
      const person=people.get(`${id}|${role}`)
      const entry=rows.get(key)||{key,id,role,name:person?.name||String(raw.player_name||id).replace(/#\d+$/,''),teamId:String(raw.team_id||person?.teamId||''),team:person?.team,map,minutes:timing.minutes,logTotals:timing.totals,values:Object.fromEntries(metrics.map(metric=>[metric,new Set()])),heroes:new Set()}
      for(const metric of metrics)entry.values[metric].add(amount(raw[fields[metric]]??(metric==='blocked'?raw.blocked:undefined)))
      String(raw.heroes_played||'').split(/[、,/]/).map(name=>getOwHero(name.trim())?.en).filter(Boolean).forEach(hero=>entry.heroes.add(hero))
      rows.set(key,entry)
    }
  }
  return [...rows.values()].map(entry=>({
    key:entry.key,id:entry.id,name:entry.name,teamId:entry.teamId,team:entry.team,role:entry.role,
    map:entry.map.map_name,matchId:entry.map.matchId,order:entry.map.order,minutes:entry.minutes,
    hero:entry.heroes.size===1?[...entry.heroes][0]:null,
    totals:Object.fromEntries(metrics.map(metric=>[metric,entry.values[metric].size===1&&![...entry.values[metric]].includes(null)&&[...entry.values[metric]][0]===entry.logTotals[metric]?[...entry.values[metric]][0]:null]))
  })).filter(sample=>metrics.some(metric=>sample.totals[metric]>0)).sort(compareKey)
}

export function singleMapRecords(samples) {
  return metrics.flatMap(metric=>{
    const ranked=samples.filter(sample=>sample.totals[metric]>0).sort((a,b)=>b.totals[metric]-a.totals[metric]||compareKey(a,b))
    if(!ranked.length)return []
    const tied=ranked.filter(sample=>sample.totals[metric]===ranked[0].totals[metric])
    return tied.map(sample=>({...sample,metric,value:sample.totals[metric],unit:'single-map-total',tiedCount:tied.length,tiedPlayers:new Set(tied.map(row=>row.id)).size}))
  })
}

const stat = (sample,metric,record=false) => ({metric,value:sample.totals[metric],unit:'single-map-total',matchId:sample.matchId,order:sample.order,map:sample.map,role:sample.role,record,tiedCount:sample.tiedCount||1})
const roleMetric = {TANK:'blocked',DPS:'damage',SUP:'assists'}
const roleSecondary = {TANK:'elims',DPS:'elims',SUP:'healing'}
const playerId = player => player?.id||player?.player_id

export function buildWeeklyDataStories(report,articles,{samples=collectWeeklyMapSamples(report),featuredIds=[]}={}) {
  const records=singleMapRecords(samples),groups=new Map(),candidates=[]
  for(const record of records) {
    const group=groups.get(record.id)||[]
    group.push(record);groups.set(record.id,group)
  }
  for(const [id,group] of groups) {
    const unique=[...new Map(group.sort((a,b)=>priority[b.metric]-priority[a.metric]||compareKey(a,b)).map(record=>[record.metric,record])).values()]
    // For a tied record on several maps, retain a stable source for that metric.
    const shown=unique.slice(0,WEEKLY_STORY_POLICY.maximumMetrics),first=shown[0]
    const crossed=shown.length>1&&new Set(shown.map(record=>record.role)).size>1
    candidates.push({key:`record:${id}`,id,name:first.name,team:first.team,teamId:first.teamId,hero:first.hero,role:first.role,
      kind:shown.length>1?(crossed?'cross-role-records':'multiple-records'):'record',topic:`record:${shown.map(record=>record.metric).join('+')}`,
      isRecord:true,priority:priority[first.metric]+(shown.length>1?30:0),stats:shown.map(record=>stat(record,record.metric,true))})
  }
  const addPerformance=(sample,kind,metric,secondary,rank,article=null)=>{
    const stats=[stat(sample,metric)]
    if(sample.totals[secondary]>0)stats.push(stat(sample,secondary))
    candidates.push({key:`${kind}:${sample.key}`,id:sample.id,name:sample.name,team:sample.team,teamId:sample.teamId,hero:sample.hero,role:sample.role,
      kind,topic:`${kind}:${sample.role}`,isRecord:false,priority:kind==='deciding-map'?60:20-rank,stats,matchResult:article?.result||null})
  }
  for(const article of articles) {
    if(!article.decisive||article.sequence.length!==5)continue
    const mapSamples=samples.filter(sample=>sample.matchId===article.id&&sample.order===article.decisive.order)
    for(const role of ['TANK','DPS','SUP']) {
      const metric=role==='DPS'?'elims':role==='SUP'?'healing':'blocked',secondary=role==='DPS'?'damage':role==='SUP'?'assists':roleSecondary[role]
      const ranked=mapSamples.filter(sample=>sample.role===role&&sample.totals[metric]>0).sort((a,b)=>b.totals[metric]-a.totals[metric]||compareKey(a,b))
      for(const sample of ranked.filter(row=>row.totals[metric]===ranked[0]?.totals[metric]))addPerformance(sample,'deciding-map',metric,secondary,0,article)
    }
  }
  // These are role-specific leading samples, not invented weekly overall records.
  for(const role of ['TANK','DPS','SUP']) {
    const metric=roleMetric[role],ranked=samples.filter(sample=>sample.role===role&&sample.totals[metric]>0).sort((a,b)=>b.totals[metric]-a.totals[metric]||compareKey(a,b))
    const seen=new Set()
    for(const sample of ranked) {
      if(seen.has(sample.id))continue
      seen.add(sample.id)
      if(seen.size>2)break
      addPerformance(sample,'map-highlight',metric,roleSecondary[role],seen.size)
    }
  }
  const honoured=new Set([...(report.awards?.mvp||[]),...(report.awards?.bestFive||[]).map(slot=>slot.player)].map(playerId).filter(Boolean))
  const featured=new Set([...featuredIds,...honoured]),selected=[],topics=new Set(),teams=new Set(),matches=new Set(),maps=new Set()
  const mapKey=item=>JSON.stringify([String(item.matchId),Number(item.order)])
  const take=candidate=>{
    selected.push(candidate);featured.add(candidate.id);topics.add(candidate.topic);if(candidate.teamId)teams.add(candidate.teamId)
    candidate.stats.forEach(item=>{matches.add(String(item.matchId));maps.add(mapKey(item))})
  }
  const anchor=candidates.filter(candidate=>candidate.isRecord).sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key))[0]
  if(anchor)take(anchor)
  while(selected.length<WEEKLY_STORY_POLICY.maximumCards) {
    const remaining=candidates.filter(candidate=>!selected.some(story=>story.id===candidate.id))
    if(!remaining.length)break
    const rank=candidate=>[Number(!featured.has(candidate.id)),Number(!honoured.has(candidate.id)),Number(matches.size<WEEKLY_STORY_POLICY.sourceContextTarget&&candidate.stats.some(item=>!matches.has(String(item.matchId)))),Number(maps.size<WEEKLY_STORY_POLICY.sourceContextTarget&&candidate.stats.some(item=>!maps.has(mapKey(item)))),Number(candidate.isRecord),Number(!topics.has(candidate.topic)),Number(Boolean(candidate.teamId)&&!teams.has(candidate.teamId)),candidate.priority]
    remaining.sort((a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++){if(x[i]!==y[i])return y[i]-x[i]}return a.key.localeCompare(b.key)})
    take(remaining[0])
  }
  return {policy:WEEKLY_STORY_POLICY,records,cards:selected}
}

export function formatWeeklyDataStory(story,locale='zh-CN') {
  const en=String(locale).startsWith('en'),t=(zh,english)=>en?english:translateUiText(zh,locale)
  const labels={damage:t('伤害','Damage'),healing:t('治疗','Healing'),blocked:t('阻挡伤害','Mitigated'),assists:t('助攻','Assists'),elims:t('消灭','Elims')}
  const primary=story.stats[0],maps=[...new Set(story.stats.map(item=>formatOwMapName(item.map,locale)))]
  let headline
  if(story.kind==='cross-role-records')headline=t('跨岗双纪录','CROSS-ROLE RECORDS')
  else if(story.kind==='multiple-records')headline=t('本周双纪录','DUAL MAP RECORDS')
  else if(story.kind==='record')headline=t(`单图${labels[primary.metric]}${primary.tiedCount>1?'并列':''}最高`,`${labels[primary.metric].toUpperCase()} ${primary.tiedCount>1?'JOINT ':''}RECORD`)
  else if(story.kind==='deciding-map')headline=t('决胜图亮点','DECIDING MAP')
  else headline=t('单图数据亮点','MAP SPOTLIGHT')
  const name=String(story.name||'').trim()
  const numberEcho=story.isRecord&&primary.record&&primary.unit==='single-map-total'&&['assists','elims'].includes(primary.metric)&&/^[1-9]\d*$/.test(name)&&Number.isSafeInteger(primary.value)&&String(primary.value)===name
  if(numberEcho)headline=t(`${name}，打出 ${primary.value} 次${labels[primary.metric]}`,`${name} POSTS ${primary.value} ${labels[primary.metric].toUpperCase()}`)
  let caption=maps.length>1
    ? story.stats.map(item=>t(`${labels[item.metric]}：${formatOwMapName(item.map,locale)} · 第 ${item.order} 图`,`${labels[item.metric]}: ${formatOwMapName(item.map,locale)} · map ${item.order}`)).join(t('；','; '))
    : `${maps[0]} · ${t(`第 ${primary.order} 图`,`map ${primary.order}`)}`
  if(numberEcho)caption=t(`本周单图${labels[primary.metric]}${primary.tiedCount>1?'并列':''}最高 · ${maps[0]}`,`Weekly ${primary.tiedCount>1?'joint ':''}map record · ${maps[0]}`)
  return {...story,headline,caption,editorialHook:numberEcho?'number-echo':null,stats:story.stats.map(item=>({...item,label:labels[item.metric]}))}
}
