import { resolveHeroSubrole } from '../../lib/heroSubroleSelectors.js'

export const WEEKLY_POSITIONS=Object.freeze(['TANK','FLEX_DPS','HITSCAN','MAIN_SUPPORT','FLEX_SUPPORT'])
export const WEEKLY_POSITION_ROLES=Object.freeze({TANK:'TANK',FLEX_DPS:'DPS',HITSCAN:'DPS',MAIN_SUPPORT:'SUP',FLEX_SUPPORT:'SUP'})

export function weeklyLogPosition(log,role) {
  const resolved=resolveHeroSubrole(log.hero,{role})
  const position=resolved.resolvedSubrole
  return resolved.known&&WEEKLY_POSITION_ROLES[position]===role?position:null
}

// Only validated current-week records enter assignment. Each map's hero times
// are capped to recorded playtime before identifying the player's primary seat.
export function buildWeeklyPositionAssignments(groups) {
  const people=new Map()
  for(const group of groups) {
    if(!people.has(group.id))people.set(group.id,{positions:new Map(),unknownMinutes:0,totalMinutes:0})
    const person=people.get(group.id),total=group.logs.reduce((sum,log)=>sum+log.playtimeMinutes,0)
    for(const log of group.logs) {
      const minutes=group.playtime*log.playtimeMinutes/total,position=weeklyLogPosition(log,group.role)
      person.totalMinutes+=minutes
      if(!position){person.unknownMinutes+=minutes;continue}
      if(!person.positions.has(position))person.positions.set(position,{position,minutes:0,mapMinutes:new Map(),heroes:new Map()})
      const entry=person.positions.get(position)
      entry.minutes+=minutes
      entry.mapMinutes.set(group.scope,(entry.mapMinutes.get(group.scope)||0)+minutes)
      entry.heroes.set(log.hero,(entry.heroes.get(log.hero)||0)+minutes)
    }
  }
  return new Map([...people].map(([id,person])=>{
    const positions=[...person.positions.values()].sort((a,b)=>b.minutes-a.minutes||WEEKLY_POSITIONS.indexOf(a.position)-WEEKLY_POSITIONS.indexOf(b.position))
      .map(entry=>({...entry,maps:entry.mapMinutes.size,mapMinutes:Object.fromEntries([...entry.mapMinutes].sort(([a],[b])=>a.localeCompare(b))),heroes:[...entry.heroes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([hero,minutes])=>({hero,minutes}))}))
    const tied=positions.length>1&&Math.abs(positions[0].minutes-positions[1].minutes)<1e-7
    const status=person.unknownMinutes>1e-7?'unknown-hero':tied?'position-tie':positions.length?'assigned':'no-valid-position'
    return [id,{position:status==='assigned'?positions[0].position:null,status,totalMinutes:person.totalMinutes,unknownMinutes:person.unknownMinutes,positions}]
  }))
}
