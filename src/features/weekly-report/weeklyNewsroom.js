import { translateUiText, pickUiLocale } from '../../lib/uiText.js'
import { formatOwMapName, formatOwHeroName, getOwHero, getOwHeroRole } from '../../lib/heroes.js'
import { weeklyTeamShort, weeklyCycleTitle } from '../weekly-overview/weeklyPresentation.js'
import { formatReportTime } from './weeklyReportPreview.js'
import { buildWeeklyDataStories, formatWeeklyDataStory } from './weeklyDataStories.js'
import { buildWeeklyPeopleNews } from './weeklyPeopleNews.js'
import { buildLeadIntro, buildMatchBackground, buildMatchBrief, selectWeeklyLead } from './weeklyEditorial.js'

const identity = team => String(team?.id || team?.team_id || '')
const score = value => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const tFor = locale => (zh, en) => String(locale).startsWith('en') ? en : translateUiText(zh, locale)
const countText = (items, locale) => items.map(item => formatOwHeroName(item.name, locale)).join(String(locale).startsWith('en') ? ', ' : '、')
export const newspaperTeamName = team => weeklyTeamShort(team) === '?' ? team?.name || team?.team_name || '?' : weeklyTeamShort(team)

// Historical Sombra honours retain the recorded role across its migration.
// A frozen edition without a role or game-version context is not relabelled.
export function resolveWeeklyHeroRole(hero, report) {
  const definition = getOwHero(hero?.name)
  if (!definition) return ''
  let recordedRole = hero.role
  if (definition.id === 'sombra' && !recordedRole) {
    const players = [...(report?.awards?.mvp || []), ...(report?.awards?.bestFive || []).map(slot => slot.player)].filter(Boolean)
    const saved = new Set(players.filter(player => ['DPS', 'SUP'].includes(player.role) && getOwHero(player.hero)?.id === definition.id)
      .map(player => getOwHeroRole(hero.name, { role: player.role })).filter(Boolean))
    if (saved.size > 1 || (!saved.size && !report?.gameVersion)) return ''
    recordedRole = [...saved][0]
  }
  return { tank: 'TANK', damage: 'DPS', support: 'SUP' }[getOwHeroRole(hero.name, { role: recordedRole, gameVersion: report?.gameVersion })] || ''
}

// Count recorded hero use, including switches, once per player/map/hero.
// These inputs retain every validated appearance, not only award candidates.
export function buildWeeklyHeroUsage(report) {
  const matches = new Set((report.completed || []).filter(match=>match.state==='complete').map(match=>String(match.id)))
  const scopes = new Set((report.maps || []).filter(map=>matches.has(String(map.matchId))&&!map.is_administrative).map(map=>JSON.stringify([String(map.matchId),Number(map.order)])))
  const appearances = new Set(), playerMaps = new Set(), counts = new Map()
  for (const input of report.awards?.snapshot?.inputs || []) {
    const matchId = String(input.matchId || ''), order = Number(input.mapOrder), playerId = String(input.playerId || '')
    if (!playerId || !scopes.has(JSON.stringify([matchId,order]))) continue
    for (const log of input.logs || []) {
      const hero = getOwHero(log.hero), minutes = Number(log.minutes)
      if (!hero || typeof log.minutes==='boolean' || !Number.isFinite(minutes) || minutes<=0) continue
      const key = JSON.stringify([matchId,order,playerId,hero.en])
      if (appearances.has(key)) continue
      appearances.add(key)
      playerMaps.add(JSON.stringify([matchId,order,playerId]))
      counts.set(hero.en,(counts.get(hero.en)||0)+1)
    }
  }
  const frequency = [...counts].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))
    .map((hero,index,all)=>({...hero,rank:all.findIndex(other=>other.count===hero.count)+1}))
  return {frequency,appearances:appearances.size,playerMaps:playerMaps.size,scope:'validated-player-map-hero'}
}

function recordedMapScore(map, winnerSide) {
  const value = input => typeof input === 'boolean' ? null : score(input)
  const pair = [value(map.score_a), value(map.score_b)]
  const parts = String(map.score ?? '').split(/[:：]/).map(part => value(part.trim()))
  const hasFields = map.score_a != null || map.score_b != null
  const legacy = parts.length === 2 && parts.every(number => number != null && number >= 0) ? parts : null
  const recorded = hasFields ? pair : legacy
  if (!recorded || recorded.some(number => number == null || number < 0)) return { mapScore:null, mapScoreStatus:'missing' }
  if ((hasFields && legacy && legacy.some((number, index) => number !== recorded[index])) ||
    (winnerSide === 0 ? recorded[0] <= recorded[1] : recorded[1] <= recorded[0])) return { mapScore:null, mapScoreStatus:'inconsistent' }
  return { mapScore:recorded, mapScoreStatus:'recorded' }
}

export function buildMatchNews(report, match, locale = 'zh-CN') {
  const t = tFor(locale), a = score(match.team_a?.score), b = score(match.team_b?.score)
  const maps = report.maps.filter(map => map.matchId === match.id).sort((x, y) => x.order - y.order)
  const sides = [match.team_a, match.team_b]
  const winning = a != null && b != null && a !== b ? sides[a > b ? 0 : 1] : null
  const losing = winning ? sides[a > b ? 1 : 0] : null
  const winnerId = identity(winning), wins = Math.max(a ?? 0, b ?? 0), losses = Math.min(a ?? 0, b ?? 0)
  const completeWinners = match.state === 'complete' && maps.length === 5 && maps.every((map,index) => !map.is_administrative && Number(map.order)===index+1 && sides.some(team => identity(team) === String(map.winner))) &&
    maps.filter(map=>String(map.winner)===identity(match.team_a)).length===a && maps.filter(map=>String(map.winner)===identity(match.team_b)).length===b
  const lastTwo = completeWinners && winning && maps.slice(-2).every(map => String(map.winner) === winnerId)
  const four = completeWinners ? maps.slice(0, 4).map(map => String(map.winner)) : []
  const tiedAtFour = four.length === 4 && four.filter(id => id === identity(match.team_a)).length === 2
  const alternating = completeWinners && maps.every((map,index) => index===0 || String(map.winner)!==String(maps[index-1].winner))
  const nameA = newspaperTeamName(match.team_a), nameB = newspaperTeamName(match.team_b)
  const reversed = Boolean(match.state==='complete' && winning && winning===match.team_b)
  const displayTeams = reversed ? [...sides].reverse() : [...sides]
  const displayScores = reversed ? [b,a] : [a,b]
  const sourceResult = `${nameA} ${a ?? '—'}:${b ?? '—'} ${nameB}`
  const result = `${newspaperTeamName(displayTeams[0])} ${displayScores[0] ?? '—'}:${displayScores[1] ?? '—'} ${newspaperTeamName(displayTeams[1])}`
  let title = t(`${nameA} 与 ${nameB} 的赛果已确认`, `${nameA}–${nameB}: result confirmed`)
  if (match.state === 'ruling') title = t(`${nameA} 与 ${nameB}：判定结果已公布`, `${nameA}–${nameB}: ruling recorded`)
  else if (winning && lastTwo && wins===3 && losses===2) title = pickUiLocale(locale, '{0} 连取末两图，{1}:{2} 逆转 {3}', '{0} wins the final two maps to come back against {3}, {1}:{2}', '{0}, 마지막 두 맵을 따내며 {3}에 {1}:{2} 역전승', '{0} 連取末兩圖，{1}:{2} 逆轉 {3}').replace(/\{(\d+)\}/g, (_token, index) => [newspaperTeamName(winning), wins, losses, newspaperTeamName(losing)][index])
  else if (winning && tiedAtFour) title = t(`${newspaperTeamName(winning)} 赢下决胜图，${wins}:${losses} 战胜 ${newspaperTeamName(losing)}`, `${newspaperTeamName(winning)} wins the decider to beat ${newspaperTeamName(losing)} ${wins}:${losses}`)
  else if (winning && completeWinners && losses===1 && String(maps[0].winner)!==winnerId) title = t(`${newspaperTeamName(winning)} 连赢四图，${wins}:${losses} 战胜 ${newspaperTeamName(losing)}`, `${newspaperTeamName(winning)} wins four straight to beat ${newspaperTeamName(losing)} ${wins}:${losses}`)
  else if (winning) title = t(`${newspaperTeamName(winning)} 以 ${wins}:${losses} 战胜 ${newspaperTeamName(losing)}`, `${newspaperTeamName(winning)} beats ${newspaperTeamName(losing)} ${wins}:${losses}`)
  else if (a != null && b != null && a === b && match.state === 'complete') title = t(`${nameA} 与 ${nameB} 战成 ${a}:${b}`, `${nameA} and ${nameB} finish ${a}:${b}`)
  const shortTitle = winning && match.state==='complete' ? t(`${newspaperTeamName(winning)} 以 ${wins}:${losses} 战胜 ${newspaperTeamName(losing)}`,`${newspaperTeamName(winning)} beats ${newspaperTeamName(losing)} ${wins}:${losses}`) : title
  const lostMaps = completeWinners && losing ? maps.filter(map=>String(map.winner)===identity(losing)) : []
  const winnerName=newspaperTeamName(winning), loserName=newspaperTeamName(losing)
  const mapName=map=>String(map?.map_name||'').trim() ? formatOwMapName(map.map_name,locale) : t(`第 ${map?.order} 图`,`map ${map?.order}`)
  let brief=winning ? t(`${winnerName} 以 ${wins}:${losses} 战胜 ${loserName}。`,`${winnerName} beat ${loserName} ${wins}:${losses}.`) : t(`${nameA} 与 ${nameB} 的赛果记录待补齐。`,`Result records for ${nameA} and ${nameB} are incomplete.`)
  if(match.state==='ruling') brief=t(`${nameA} 与 ${nameB} 的比赛以赛事判定结束，赛果按已公布判定记录。`,`${nameA}–${nameB} ended by an official ruling; the result follows the published decision.`)
  else if(completeWinners&&winning) {
    if(losses===0) brief=t(`${winnerName} 从${mapName(maps[0])}一路赢到${mapName(maps[4])}，五图全胜。`,`${winnerName} swept all five maps, from ${mapName(maps[0])} to ${mapName(maps[4])}.`)
    else if(lostMaps.length===1) {
      const lost=lostMaps[0], place=Number(lost.order), map=mapName(lost)
      if(place===1) brief=t(`${loserName} 率先拿下${map}。${winnerName} 随后连赢四图，从${mapName(maps[1])}一路赢到${mapName(maps[4])}。`,`${loserName} took the opener on ${map}. ${winnerName} answered with four straight maps, finishing on ${mapName(maps[4])}.`)
      else if(place===2) brief=t(`${winnerName} 先取${mapName(maps[0])}，${loserName} 在${map}追成 1:1。随后三图均由${winnerName}拿下。`,`${winnerName} won the opener; ${loserName} drew level at 1:1 on ${map}. ${winnerName} then took the remaining three maps.`)
      else if(place===3) brief=t(`${winnerName} 连下首两图，取得 2:0 领先。${loserName} 在${map}扳回一图，${winnerName} 随后拿下末两图。`,`${winnerName} opened 2:0. ${loserName} won ${map}; ${winnerName} took the last two.`)
      else if(place===4) brief=t(`${winnerName} 以三图连胜开局。${loserName} 在${map}追回一图，${winnerName} 再取${mapName(maps[4])}收尾。`,`${winnerName} opened 3:0. ${loserName} won ${map}; ${winnerName} took ${mapName(maps[4])}.`)
      else brief=t(`${winnerName} 连下前四图。${loserName} 在收官图${map}拿下一胜。`,`${winnerName} won the first four maps. ${loserName} took the finale on ${map}.`)
    } else if(tiedAtFour&&lastTwo) brief=t(`${loserName} 在前三图取得 2:1 领先。${winnerName} 连拿${mapName(maps[3])}与${mapName(maps[4])}，完成翻盘。`,`${loserName} led 2:1 after three maps. ${winnerName} won ${mapName(maps[3])} and ${mapName(maps[4])} to turn the match around.`)
    else if(tiedAtFour&&alternating) brief=t(`双方在前四图交替获胜，战成 2:2。${winnerName} 拿下${mapName(maps[4])}，以 ${wins}:${losses} 赢下对阵。`,`The sides traded the first four maps to reach 2:2. ${winnerName} took ${mapName(maps[4])} to win ${wins}:${losses}.`)
    else if(tiedAtFour) brief=t(`${loserName} 在${mapName(maps[3])}将比分追成 2:2。${winnerName} 随后拿下${mapName(maps[4])}，赢下决胜图。`,`${loserName} drew level at 2:2 on ${mapName(maps[3])}. ${winnerName} then took the deciding map on ${mapName(maps[4])}.`)
    else brief=t(`${winnerName} 在前四图拿下三图。${loserName} 收官图赢下${mapName(maps[4])}，本场以 ${wins}:${losses} 结束。`,`${winnerName} took three of the first four maps. ${loserName} won the finale on ${mapName(maps[4])}; the match ended ${wins}:${losses}.`)
  }
  const paragraphs = [t(`第 ${report.week.week_number} 周，${nameA} 与 ${nameB} 的已确认比分为 ${a ?? '—'}:${b ?? '—'}。${maps.length ? `本场收录 ${maps.length} 张实际比赛地图。` : '实际比赛地图记录尚不可用。'}`, `Public records for week ${report.week.week_number} confirm ${result}. ${maps.length} played maps are recorded.`)]
  if(tiedAtFour&&winning) paragraphs[0]=t(`${nameA} 与 ${nameB} 的五图对阵直到最后一图才确定胜负。${newspaperTeamName(winning)} 最终以 ${wins}:${losses} 获胜，本场完整收录五张实际地图。`,`${nameA} and ${nameB} remained level through four maps. ${newspaperTeamName(winning)} settled the result ${wins}:${losses} on the fifth. All five played maps are recorded.`)
  if (tiedAtFour && winning && String(maps[4].winner) === winnerId) paragraphs.push(t(`前四图双方战成 2:2。第 5 图 ${formatOwMapName(maps[4].map_name, locale)} 由 ${newspaperTeamName(winning)} 获胜，这一图确定了最终 ${wins}:${losses} 的比分。`, `The first four maps left the sides level at 2:2. ${newspaperTeamName(winning)} won map five, ${formatOwMapName(maps[4].map_name, locale)}, to settle the ${wins}:${losses} result.`))
  else if (completeWinners && winning) paragraphs.push(t(`逐图记录中，${newspaperTeamName(winning)} 赢下 ${maps.filter(map => String(map.winner) === winnerId).map(map => formatOwMapName(map.map_name, locale)).join('、')}。完整出场与英雄记录可在本场比赛详情中查阅。`, `${newspaperTeamName(winning)} won ${maps.filter(map => String(map.winner) === winnerId).map(map => formatOwMapName(map.map_name, locale)).join(', ')}. Match details retain the full appearance and hero records.`))
  const decisive = tiedAtFour && winning && String(maps[4]?.winner) === winnerId ? maps[4] : null
  const running = [0, 0]
  const sequence = completeWinners ? maps.map(map => {
    const side = String(map.winner) === identity(match.team_a) ? 0 : 1
    running[side]++
    const recorded = recordedMapScore(map, side)
    const displaySide = reversed ? 1-side : side
    return { order:map.order, map_name:map.map_name, map_type:map.map_type, winnerSide:displaySide === 0 ? 'a' : 'b', winnerName:newspaperTeamName(sides[side]),
      ...recorded, mapScore:recorded.mapScore && (reversed ? [...recorded.mapScore].reverse() : [...recorded.mapScore]), runningScore:reversed ? [...running].reverse() : [...running] }
  }) : []
  const visualNote = decisive ? alternating
    ? t(`交替拿图至 2:2，${formatOwMapName(decisive.map_name,locale)}决胜。`,`Maps traded to 2:2; ${formatOwMapName(decisive.map_name,locale)} decided it.`)
    : t(`前四图 2:2，${formatOwMapName(decisive.map_name,locale)}定胜负。`,`Level at 2:2 after four maps; ${formatOwMapName(decisive.map_name,locale)} decided it.`)
    : lostMaps.length===1 ? lostMaps[0].order===1
      ? t(`${newspaperTeamName(losing)} 拿下${formatOwMapName(lostMaps[0].map_name,locale)}，${newspaperTeamName(winning)} 随后连赢四图。`,`${newspaperTeamName(losing)} won ${formatOwMapName(lostMaps[0].map_name,locale)}; ${newspaperTeamName(winning)} then took four straight maps.`)
      : t(`${newspaperTeamName(losing)} 在${formatOwMapName(lostMaps[0].map_name,locale)}扳回一图。`,`${newspaperTeamName(losing)} pulled one back on ${formatOwMapName(lostMaps[0].map_name,locale)}.`)
    : winning&&match.state==='complete' ? t(`${newspaperTeamName(winning)} 以 ${wins}:${losses} 战胜 ${newspaperTeamName(losing)}。`,`${newspaperTeamName(winning)} beat ${newspaperTeamName(losing)} ${wins}:${losses}.`)
    : match.state==='ruling' ? t('本场以赛事判定结束。','This match ended by an official ruling.')
    : t(`${result}，赛果已确认。`,`${result}; the result is confirmed.`)
  const editorialMark=completeWinners&&winning ? wins===3&&losses===2&&lastTwo
    ? {kind:'late-comeback',label:t('末两图逆转','LATE COMEBACK')}
    : losses===0 ? {kind:'sweep',label:t('五图全胜','FIVE-MAP SWEEP')}
    : losses===1&&lostMaps[0].order===1 ? {kind:'four-straight',label:t('四图连胜','FOUR IN A ROW')}
    : null : null
  const newsKind = editorialMark?.kind || (decisive ? 'deciding-map' : lostMaps.length===1 ? `reply-map-${lostMaps[0].order}` : match.state==='ruling' ? 'ruling' : 'result')
  return { id:match.id, title, shortTitle, brief, visualNote, editorialMark, newsKind, displayTeams, displayScores, sourceScoreOrder:[nameA,nameB], scoreOrder:displayTeams.map(newspaperTeamName), result, sourceResult, paragraphs, maps, sequence, decisive, firstMapComeback:Boolean(completeWinners && winning && String(maps[0].winner) !== winnerId), image:decisive || maps.at(-1) || null, sources:[match.id], path:`/matches/${encodeURIComponent(match.id)}` }
}

export function selectMatchBriefs(articles,lead,limit=3) {
  const selected=[],kinds=new Set(lead?[lead.newsKind]:[]),teams=new Set((lead?.displayTeams||[]).map(identity))
  const priority={'late-comeback':100,'deciding-map':90,'four-straight':80,sweep:70}
  while(selected.length<limit) {
    const remaining=articles.filter(article=>article!==lead&&!selected.some(item=>item.id===article.id))
    if(!remaining.length)break
    const rank=article=>[Number(article.sequence.length===5),article.background?.priority||0,Number(!kinds.has(article.newsKind)),article.displayTeams.filter(team=>!teams.has(identity(team))).length,priority[article.newsKind]||20]
    remaining.sort((a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++){if(x[i]!==y[i])return y[i]-x[i]}return String(a.id).localeCompare(String(b.id))})
    const article=remaining[0]
    selected.push(article);kinds.add(article.newsKind);article.displayTeams.forEach(team=>teams.add(identity(team)))
  }
  return selected
}

// Single-map per-10 rates use validated actual playtime, never award eligibility.
// Duplicate rows count once; conflicting duplicates cannot establish a record.
export function buildWeeklyFunFacts(report, articles) {
  const completed = new Set(report.completed.filter(match=>match.state==='complete').map(match=>match.id))
  const entrants = new Map(report.roster.map(person=>[`${person.id}|${person.role}`,person]))
  const roles = { TANK:'TANK', DPS:'DPS', DAMAGE:'DPS', SUP:'SUP', SUPPORT:'SUP' }
  const timings = new Map(), conflictingTimings = new Set()
  for (const input of report.awards?.snapshot?.inputs || []) {
    const key = `${input.matchId}|${input.mapOrder}|${input.playerId}|${input.role}`
    const mapMinutes = Number(input.mapMinutes)
    if (typeof input.mapMinutes==='boolean' || !Number.isFinite(mapMinutes) || mapMinutes<=0 || !input.logs?.length) continue
    const logs = input.logs
    if (logs.some(log=>typeof log.minutes==='boolean' || !Number.isFinite(Number(log.minutes)) || Number(log.minutes)<=0 || ['damage','healing'].some(metric=>typeof log.totals?.[metric]==='boolean' || log.totals?.[metric]==null || !Number.isFinite(Number(log.totals[metric])) || Number(log.totals[metric])<0))) continue
    const timing = {minutes:Math.min(mapMinutes,logs.reduce((sum,log)=>sum+Number(log.minutes),0)),damage:logs.reduce((sum,log)=>sum+Number(log.totals.damage),0),healing:logs.reduce((sum,log)=>sum+Number(log.totals.healing),0)}
    if (timings.has(key) && JSON.stringify(timings.get(key))!==JSON.stringify(timing)) conflictingTimings.add(key)
    timings.set(key,timing)
  }
  const rows = new Map()
  for (const map of report.maps) {
    if (!completed.has(map.matchId) || map.is_administrative) continue
    for (const raw of Array.isArray(map.player_stats) ? map.player_stats : []) {
      const id = String(raw.player_id || '').trim(), role = roles[String(raw.role || '').toUpperCase()]
      if (!id || !role) continue
      const key = `${map.matchId}|${map.order}|${id}|${role}`
      const timing = timings.get(key)
      if (!timing || conflictingTimings.has(key)) continue
      const person = entrants.get(`${id}|${role}`)
      const entry = rows.get(key) || { key, id, role, name:person?.name || String(raw.player_name || id).replace(/#\d+$/,''), map, timing, damage:new Set(), healing:new Set(), heroes:new Set() }
      for (const metric of ['damage','healing']) {
        const value = score(raw[metric])
        if (typeof raw[metric]!=='boolean' && value != null && Number.isInteger(value) && value >= 0) entry[metric].add(value)
      }
      String(raw.heroes_played || '').split(/[、,/]/).map(name=>getOwHero(name.trim())?.en).filter(Boolean).forEach(hero=>entry.heroes.add(hero))
      rows.set(key,entry)
    }
  }
  const peak = metric => {
    const samples = [...rows.values()].filter(row=>row[metric].size===1 && [...row[metric]][0]===row.timing[metric]).map(row=>({ ...row, rawValue:[...row[metric]][0], minutes:row.timing.minutes, value:[...row[metric]][0]/row.timing.minutes*10 })).sort((a,b)=>b.value-a.value || a.key.localeCompare(b.key))
    if (!samples.length || samples[0].value===0) return null
    const first = samples[0]
    return { value:first.value, rawValue:first.rawValue, minutes:first.minutes, unit:'per-10-minutes', id:first.id, name:first.name, role:first.role, hero:first.heroes.size===1 ? [...first.heroes][0] : null, map:first.map.map_name, matchId:first.map.matchId, order:first.map.order, tiedCount:samples.filter(row=>Math.abs(row.value-first.value)<1e-7).length }
  }
  const verified = articles.filter(article=>article.sequence.length===5)
  const comebacks = verified.filter(article=>article.firstMapComeback)
  const sample = comebacks[0]
  return { comeback:{ count:comebacks.length, total:verified.length, sample:sample ? { id:sample.id, path:sample.path, result:sample.result, sequence:sample.sequence } : null }, damage:peak('damage'), healing:peak('healing') }
}

export function buildWeeklyNewspaper(report, locale = 'zh-CN') {
  if (!report) return null
  const t = tFor(locale)
  const articles = report.completed.map(match => {
    const article = buildMatchNews(report, match, locale)
    const background = buildMatchBackground(article, report, locale)
    return { ...article, state: match.state, background, recap: article.brief, brief: buildMatchBrief({ ...article, background }, locale) }
  })
  const lead = selectWeeklyLead(articles, report.closeMatch?.id)
  if (lead) lead.intro = buildLeadIntro(lead, articles, locale)
  const briefs=selectMatchBriefs(articles,lead)
  const otherResults=articles.filter(article=>article!==lead&&!briefs.some(brief=>brief.id===article.id)).sort((a,b)=>String(a.id).localeCompare(String(b.id)))
  const topMap = report.mapFrequency[0]
  const tiedMaps = topMap ? report.mapFrequency.filter(map=>map.count===topMap.count) : []
  const topBan = report.bans[0], tiedBans = topBan ? report.bans.filter(hero=>hero.count===topBan.count) : []
  const mapNames=tiedMaps.slice(0,3).map(map=>formatOwMapName(map.name,locale)).join(t('、',', '))
  const banNames=countText(tiedBans.slice(0,3),locale)
  const mapNews = {
    title:topMap ? t(`${tiedMaps.length===1 ? formatOwMapName(topMap.name,locale) : `${tiedMaps.length} 张地图`} 出现 ${topMap.count} 次`, `${tiedMaps.length===1 ? formatOwMapName(topMap.name,locale) : `${tiedMaps.length} maps`} recorded ${topMap.count} times`) : t('实际地图记录待补齐','Played-map records pending'),
    paragraphs:[t(topMap ? `${mapNames}${tiedMaps.length>3 ? `等 ${tiedMaps.length} 张地图` : ''}在本周实际比赛中${tiedMaps.length>1 ? '各' : ''}出现 ${topMap.count} 次${tiedMaps.length>1 ? '，并列最多' : '，为本周最多'}。` : '本周实际地图记录尚待补齐。',topMap ? `${mapNames}${tiedMaps.length>3 ? ` and ${tiedMaps.length-3} other maps` : ''} lead this week’s played-map frequency with ${topMap.count} appearances each.` : 'Played-map records are pending.')],
    sources:report.completed.map(match=>match.id)
  }
  mapNews.highlights=tiedMaps.slice(0,3)
  mapNews.tieCount=tiedMaps.length
  const funFacts=buildWeeklyFunFacts(report,articles)
  const dataStories=buildWeeklyDataStories(report,articles)
  dataStories.cards=dataStories.cards.map(story=>formatWeeklyDataStory(story,locale))
  const peopleNews=buildWeeklyPeopleNews(report,{featuredIds:dataStories.cards.map(story=>story.id),locale})
  const updates=(Array.isArray(report.updates) ? report.updates : []).filter(item=>item?.state==='published' && item.weekId===report.week.id && item.cycleId===report.cycle.id && ['product','game'].includes(item.category) && String(item.title || '').trim()).slice(0,2)
  const banNews = {
    title:topBan ? t(`${tiedBans.length>1 ? `${tiedBans.length} 名英雄并列` : formatOwHeroName(topBan.name,locale)+'为'} Ban 次数最多`, `${tiedBans.length>1 ? `${tiedBans.length} heroes share` : formatOwHeroName(topBan.name,locale)+' leads'} the ban-frequency lead`) : t('具名 Ban 记录待补齐','Named ban records pending'),
    paragraphs:[t(`公开记录包含 ${report.namedBans} 条具名英雄 Ban。${topBan ? `${countText(tiedBans,locale)} 各出现 ${topBan.count} 次。` : ''}空白记录不视为超时或未 Ban，也不据此推断队伍战术。`, `${report.namedBans} named hero bans are recorded. ${topBan ? `${countText(tiedBans,locale)} each appear ${topBan.count} times. ` : ''}Blank records do not establish a timeout, a skipped ban or a team tactic.`)],
    summary:t(topBan ? `${banNames}${tiedBans.length>3 ? `等 ${tiedBans.length} 名英雄` : ''}各被 Ban ${topBan.count} 次。本周共记录 ${report.namedBans} 条具名 Ban。` : '本周具名英雄 Ban 记录尚待补齐。',topBan ? `${banNames}${tiedBans.length>3 ? ` and ${tiedBans.length-3} other heroes` : ''} were each banned ${topBan.count} times. ${report.namedBans} named bans are recorded this week.` : 'Named hero ban records are pending.'),
    sources:report.completed.map(match=>match.id)
  }
  const banRanking=report.bans.map((hero,index,all)=>({...hero,rank:all.findIndex(other=>other.count===hero.count)+1}))
  banNews.highlights=banRanking.slice(0,3)
  banNews.tieCount=tiedBans.length
  const lastBan=banNews.highlights.at(-1)
  banNews.omittedTies=lastBan?banRanking.filter(hero=>hero.count===lastBan.count).length-banNews.highlights.filter(hero=>hero.count===lastBan.count).length:0
  const heroUsage = buildWeeklyHeroUsage(report), topHero = heroUsage.frequency[0]
  const heroHighlights = heroUsage.frequency.slice(0,3), lastHero = heroHighlights.at(-1)
  const heroNews = {
    ...heroUsage, highlights:heroHighlights,
    tieCount:topHero?heroUsage.frequency.filter(hero=>hero.count===topHero.count).length:0,
    omittedTies:lastHero?heroUsage.frequency.filter(hero=>hero.count===lastHero.count).length-heroHighlights.filter(hero=>hero.count===lastHero.count).length:0
  }
  const edition = t(`${weeklyCycleTitle(report.cycle,locale)} · 第 ${report.week.week_number} 周`, `${weeklyCycleTitle(report.cycle,locale)} · Week ${report.week.week_number}`)
  const sharingText = [t(`薯条周报｜${edition}（样报）`,`Fries Cup Weekly | ${edition} (sample)`),lead?.title, t(`${report.completed.length} 场已确认对阵 · ${report.maps.length} 张实际地图 · ${report.playerCount} 名出场选手`,`${report.completed.length} confirmed matches · ${report.maps.length} played maps · ${report.playerCount} recorded players`),t('最佳阵容与 MVP 依当周有效数据自动试评，尚未正式发布。','Team of the week and MVP are calculated from valid weekly data, not formally published.'),t(`数据截至 ${formatReportTime(report.sourceAt,locale)}，本期为可保存的报纸样稿。`,`Data version: ${formatReportTime(report.sourceAt,locale)}. This is a downloadable newspaper sample.`)].filter(Boolean).join('\n')
  return { report,locale,edition,articles,lead,briefs,otherResults:otherResults.slice(0,3),otherResultCount:otherResults.length,layout:report.completed.length<=2?'compact':'standard',mapNews,heroNews,banNews,peopleNews,funFacts,dataStories,updates,nextWeek:report.newsContext?.nextWeek || null,pageCount:1,sharingText,generation:{mode:'verified-facts-template',version:'frypress-v11',sourceAt:report.sourceAt,cycleId:report.cycle.id,weekId:report.week.id},publication:null,awards:report.awards,issueStandings:null }
}
