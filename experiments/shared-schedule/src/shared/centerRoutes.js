import { buildWeeklyOverview } from '../../../../src/features/weekly-overview/weeklyOverviewModel.js'
import { weeklyTeamShort } from './model.js'
import { idOf, playerIdOf, playerName, routeView } from './centerModel.js'
import { getSeasonById, getSeasonName, isWeeklySeason } from './publicSeasons.js'
import { getOwMap, getOwHero, formatOwMapName, formatOwHeroName } from '../../../../src/lib/heroes.js'
import { getStaffProfile } from '../../../../src/lib/staffProfiles.js'
import { centerEntryUrl } from './centerPaths.js'
import { buildPublicStory, publicStoryScenes } from './publicStoryModel.js'

import { getActiveLocale, getLocaleParam } from './nativeLocales.js'
import { nativeCopy } from './nativeCopy.js'

export function centerUrl(params = {}, context = {}) {
  const values = { ...(getActiveLocale() !== 'zh-CN' ? { lang: getLocaleParam(getActiveLocale()) } : {}), season: context.seasonId || '', cycle: context.cycleId || '', week: context.weekId || '', ...params }
  // Only public route identifiers belong in links. Never serialize following,
  // search text, diagnostic state or arbitrary incoming query parameters.
  return centerEntryUrl(values)
}

export function centerShare(raw, view, params = {}, selection = {}) {
  const season = getSeasonById(raw?.season?.id || raw?.meta?.season_id || params.season || selection.seasonId)
  if (!isWeeklySeason(season) || ['maps', 'heroes', 'staff', 'review', 'history'].includes(view)) return publicArchiveShare(raw, view, params, season)
  let destination = routeView({ view })
  // Each recipient has their own device following; share public overview.
  if (destination === 'space') destination = 'overview'
  let route = { view: destination }
  let context = { cycleId: '', weekId: '', seasonId: season.id }
  let title = ({ overview: '薯条杯赛事助手', matches: '薯条杯 · 赛程赛果', database: '薯条杯 · 公开赛事数据', roster: '薯条杯 · 参赛阵容', advance: '薯条杯 · 晋级形势' })[destination]
  if (raw) {
    const overview = buildWeeklyOverview(raw, selection)
    context = { cycleId: overview.cycle?.id || '', weekId: selection.weekId === 'all' ? 'all' : overview.week?.id || '', seasonId: season.id }
    if (params.id) {
      const entry = overview.weekEntries.find(item => item.matches.some(match => [match.id, match.raw_match_id].includes(params.id)))
      const match = entry?.matches.find(item => [item.id, item.raw_match_id].includes(params.id))
      route = match ? { view: 'matches', id: match.id } : { view: 'matches' }
      if (match && Number(params.mapOrder) > 0 && Number(params.mapOrder) <= (match.maps || []).length) route.mapOrder = Math.floor(Number(params.mapOrder))
      title = match ? `${weeklyTeamShort(match.team_a)} vs ${weeklyTeamShort(match.team_b)} · 薯条杯` : '薯条杯 · 赛程赛果'
      if (match) context.weekId = entry.week.id
    } else if (params.team) {
      const team = raw.teams.find(item => idOf(item) === params.team)
      route = team ? { view: 'roster', team: idOf(team) } : { view: 'roster' }
      title = team ? `${weeklyTeamShort(team)} · 薯条杯队伍资料` : '薯条杯 · 参赛阵容'
    } else if (params.player) {
      const player = (raw.players || []).find(item => playerIdOf(item) === params.player)
      route = player ? { view: 'roster', player: playerIdOf(player) } : { view: 'roster' }
      title = player ? `${playerName(player)} · 薯条杯选手资料` : '薯条杯 · 参赛阵容'
    }
  }
  // A fixed public cover avoids including local following/checkmarks in the
  // automatically captured share-card screenshot.
  publicDetailState(route, params)
  return { title:nativeCopy(title), path: centerUrl(route, context), imageUrl: '/assets/share-public.png' }
}

function publicDetailState(route, params) {
  if((route.player||route.team)&&['journey','analysis'].includes(params.dossierView))route.dossierView=params.dossierView
  if ((route.player || route.team) && ['archive', 'journey', 'analysis'].includes(params.section)) route.section = params.section
  if (route.player && ['TANK', 'DPS', 'SUPPORT'].includes(params.role)) route.role = params.role
  if (route.team && route.section === 'analysis' && ['team', 'members', 'heroes', 'opponents', 'maps'].includes(params.topic)) route.topic = params.topic
}

function publicArchiveShare(raw, view, params, season) {
  const destination = view === 'space' ? 'overview' : routeView({ view })
  const route = { view: destination, season: season.id }
  let title = `${getSeasonName(season)} · ${nativeCopy(({ overview: '赛事总览', matches: '赛程赛果', database: '赛事数据', roster: '参赛阵容', advance: '晋级与排名', maps: '地图数据', heroes: '英雄数据', staff: '工作人员', review: '赛事回顾', history: '历史赛事' })[destination] || '赛事助手')}`
  if (raw && !params.story) {
    const match = raw.matches?.find(item => [item.match_id, item.raw_match_id].includes(params.id))
    const team = raw.teams?.find(item => idOf(item) === params.team)
    const player = raw.players?.find(item => playerIdOf(item) === params.player)
    const map = params.map && raw.matches?.flatMap(item => item.maps || []).find(item => (getOwMap(item.map_name)?.en || item.map_name) === (getOwMap(params.map)?.en || params.map))
    const hero = params.hero && getOwHero(params.hero)
    const staff = params.staff && getStaffProfile(raw, params.staff)
    if (match) { route.id = match.match_id; title = `${weeklyTeamShort(match.team_a)} vs ${weeklyTeamShort(match.team_b)} · ${getSeasonName(season)}`; if (Number(params.mapOrder) > 0 && Number(params.mapOrder) <= (match.maps || []).length) route.mapOrder = Math.floor(Number(params.mapOrder)) }
    else if (team) { route.team = idOf(team); title = `${weeklyTeamShort(team)} · ${getSeasonName(season)}` }
    else if (player) { route.player = playerIdOf(player); title = `${playerName(player)} · ${getSeasonName(season)}` }
    else if (map) { route.map = map.map_name; title = `${formatOwMapName(map.map_name,getActiveLocale())} · ${getSeasonName(season)}` }
    else if (hero) { route.hero = hero.en; title = `${formatOwHeroName(hero.en,getActiveLocale())} · ${getSeasonName(season)}` }
    else if (staff) { route.staff = staff.id; title = `${staff.name} · ${getSeasonName(season)}` }
  }
  if (params.story && raw) {
    const scenes = buildPublicStory(raw, params)
    if (scenes.length) { route.view = 'review'; route.story = params.story; if (params.subject) route.subject = params.subject; if (params.story === 'staff-key') route.role = params.role
      const chapter = Number(params.scene)
      if (params.scene !== undefined && Number.isInteger(chapter) && chapter >= 0 && chapter < publicStoryScenes(raw, params).length) route.scene = chapter
    }
  }
  publicDetailState(route, params)
  return { title, path: centerUrl(route), imageUrl: '/assets/share-public.png' }
}
