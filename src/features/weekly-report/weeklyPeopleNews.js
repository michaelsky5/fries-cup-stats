import {formatOwMapName} from '../../lib/heroes.js'
import {translateUiText,pickUiLocale} from '../../lib/uiText.js'
import {collectWeeklyMapSamples} from './weeklyDataStories.js'

const roleOrder={TANK:0,DPS:1,SUP:2}
const roleMetric={TANK:'blocked',DPS:'elims',SUP:'assists'}

// A small rotating people corner, independent of honour selection.
// Every note retains a verified same-week source; repeats leave fewer notes.
export function buildWeeklyPeopleNews(report,{featuredIds=[],locale='zh-CN'}={}) {
  const t=(zh,en)=>String(locale).startsWith('en')?en:translateUiText(zh,locale)
  const samples=collectWeeklyMapSamples(report),groups=new Map()
  const excluded=new Set([...featuredIds,...(report.awards?.mvp||[]).map(p=>p.id),...(report.awards?.bestFive||[]).map(s=>s.player?.id)].filter(Boolean))
  for(const sample of samples) {
    const person=groups.get(sample.id)||{id:sample.id,name:sample.name,team:sample.team,teamId:sample.teamId,roleMaps:new Map(),sources:[]}
    const maps=person.roleMaps.get(sample.role)||new Set()
    maps.add(JSON.stringify([sample.matchId,sample.order]));person.roleMaps.set(sample.role,maps)
    person.sources.push({matchId:sample.matchId,order:sample.order,role:sample.role})
    groups.set(sample.id,person)
  }
  const people=[...groups.values()].map(p=>({id:p.id,name:p.name,team:p.team,teamId:p.teamId,sources:p.sources,roles:[...p.roleMaps].map(([role,maps])=>({role,maps:maps.size})).sort((a,b)=>roleOrder[a.role]-roleOrder[b.role])}))
  const peopleById=new Map(people.map(p=>[p.id,p]))
  const candidates=people.filter(p=>p.roles.length>1&&!excluded.has(p.id)).map(p=>({...p,kind:'cross-role',key:`cross:${p.id}`,rank:0}))
  for(const role of ['TANK','DPS','SUP']) {
    const metric=roleMetric[role],seen=new Set()
    const ranked=samples.filter(s=>s.role===role&&s.totals[metric]>0).sort((a,b)=>b.totals[metric]-a.totals[metric]||a.key.localeCompare(b.key))
    let rank=0
    for(const sample of ranked) {
      if(seen.has(sample.id))continue
      seen.add(sample.id);rank++
      if(excluded.has(sample.id))continue
      candidates.push({...peopleById.get(sample.id),kind:'map-note',key:sample.key,role,metric,value:sample.totals[metric],rank,source:{matchId:sample.matchId,order:sample.order,map:sample.map}})
    }
  }
  const selected=[],teams=new Set(),kinds=new Set(),coverage={TANK:0,DPS:0,SUP:0}
  for(const person of people.filter(p=>excluded.has(p.id)))for(const role of person.roles)coverage[role.role]++
  while(selected.length<2) {
    const available=candidates.filter(p=>!excluded.has(p.id))
    if(!available.length)break
    available.sort((a,b)=>Number(kinds.has(a.kind))-Number(kinds.has(b.kind))||Number(b.kind==='cross-role')-Number(a.kind==='cross-role')||(coverage[a.role]||0)-(coverage[b.role]||0)||a.rank-b.rank||Number(teams.has(a.teamId))-Number(teams.has(b.teamId))||(roleOrder[a.role]||0)-(roleOrder[b.role]||0)||a.key.localeCompare(b.key))
    const person=available[0];selected.push(person);excluded.add(person.id);teams.add(person.teamId);kinds.add(person.kind)
    for(const role of person.roles)coverage[role.role]++
  }
  const labels={TANK:t('坦克','tank'),DPS:t('输出','damage'),SUP:t('辅助','support')}
  const metricLabels={blocked:t('阻挡','blocked'),elims:t('消灭','elims'),assists:t('助攻','assists')}
  const notes=selected.map(person=>{
    const describe=(zh,en,ko,tw,values)=>pickUiLocale(locale,zh,en,ko,tw).replace(/\{(\d+)\}/g,(token,index)=>values[index]??token)
    if(person.kind==='cross-role') {
      const appearances=person.roles.map(role=>describe('{0} {1} 图','{0}: {1} maps','{0} {1}맵','{0} {1} 圖',[labels[role.role],role.maps])).join(t('、',', '))
      return {...person,summary:person.roles.map(r=>labels[r.role]).join(' / '),context:t('本周兼任多个岗位','Played multiple roles this week'),description:describe('{0}本周在多个职责出场：{1}。','{0} played several roles this week: {1}.','이번 주 {0}은 여러 역할로 출전했습니다: {1}.','{0}本週在多個職責出場：{1}。',[person.name,appearances])}
    }
    const value=person.value.toLocaleString('en-US'),label=metricLabels[person.metric]
    const map=formatOwMapName(person.source.map,locale)
    return {...person,summary:t(`单图${label} ${value}`,`Map: ${value} ${label}`),context:`${map} · ${t(`第 ${person.source.order} 图`,`map ${person.source.order}`)}`,description:describe('{0}在第 {1} 图{2}的单图记录为：{3} {4}。','{0} recorded {4} {3} on map {1}, {2}.','이번 주 확정된 {1}번째 맵 {2}에서 {0}은 {4} {3}을 기록했습니다.','{0}在第 {1} 圖{2}的單圖記錄為：{3} {4}。',[person.name,person.source.order,map,label,value])}
  })
  return {title:t('赛场侧写','PLAYER NOTES'),people:notes,paragraphs:notes.map(p=>`${p.name} · ${p.summary}`),note:t('来自已确认地图的记录，不代表荣誉评选。','Confirmed map records, not award selections.')}
}
