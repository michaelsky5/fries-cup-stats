import { getPlayerFavoriteId, getPlayerDisplayName, getTeamFavoriteId, getTeamRouteId, getTeamShortName, getTeamFullName, getTeamIdentityValues, sanitizeFavoritesForSeason } from '../favorites/favoritesSelectors.js'
import { getPlayerMatchLogs } from '../../lib/playerMatchLogs.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { buildWeeklyOverview, isWeeklyOverview } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyWeekTitle } from '../weekly-overview/weeklyPresentation.js'
import { buildFollowingWeeklyMatch } from './followingMatchPresentation.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const key = value => text(value).toLowerCase()
const completed = new Set(['COMPLETE', 'COMPLETED', 'FINISHED'])
const live = new Set(['LIVE', 'IN_PROGRESS'])
const cancelled = new Set(['CANCELLED', 'CANCELED'])
const pending = new Set(['PENDING', 'SCHEDULED', 'READY', 'NOT_STARTED'])
const timestamp = value => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null
const score = value => typeof value !== 'boolean' && text(value) !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null

function teamResolver(teams) {
  const aliases = new Map()
  for (const team of teams) {
    for (const value of getTeamIdentityValues(team)) {
      const identity = key(value)
      if (aliases.has(identity) && aliases.get(identity) !== team) aliases.set(identity, null)
      else if (!aliases.has(identity)) aliases.set(identity, team)
    }
  }
  return values => values.map(value => aliases.get(key(value))).find(Boolean) || null
}

function teamView(team = {}) {
  return { ...team, id: getTeamFavoriteId(team), routeId: getTeamRouteId(team), short: getTeamShortName(team), full: getTeamFullName(team) }
}

export function buildFollowingFeed(db, favorites, { season = {}, locale = 'zh-CN', now = Date.now(), cycleId } = {}) {
  const clean = sanitizeFavoritesForSeason(favorites, db)
  const directory = list(db?.teams)
  const resolveTeam = teamResolver(directory)
  const nowTime = Number.isFinite(Number(now)) ? Number(now) : Date.now()
  const weekly = isWeeklyOverview(db, season) ? buildWeeklyOverview(db, { cycleId }) : null
  const sourceMatches = weekly ? weekly.weekEntries.flatMap(({ week, matches }) => matches.map(match => ({ ...match, followingWeek: week }))) : list(db?.matches)
  const rawMatchIds = new Map()
  for (const match of sourceMatches) {
    const raw = key(match.raw_match_id)
    const id = key(match.match_id || match.id || match.raw_match_id)
    if (!raw || !id) continue
    if (rawMatchIds.has(raw) && rawMatchIds.get(raw) !== id) rawMatchIds.set(raw, null)
    else if (!rawMatchIds.has(raw)) rawMatchIds.set(raw, id)
  }
  const teamSet = new Set(clean.favoriteTeamIds.map(key))
  const playerSet = new Set(clean.favoritePlayerIds.map(key))
  const teams = clean.favoriteTeamIds.map(id => resolveTeam([id])).filter(Boolean)
    .map(team => ({ ...teamView(team), primary: key(getTeamFavoriteId(team)) === key(clean.primaryTeamId) }))
  const players = list(db?.players).filter(player => playerSet.has(key(getPlayerFavoriteId(player))))
    .map(player => ({ id: getPlayerFavoriteId(player), name: getPlayerDisplayName(player), role: player.role || '', team: resolveTeam([player.team_id, player.team_short_name]), player,
      matchIds: new Set(getPlayerMatchLogs(player).logs.map(log => key(log.matchId || log.match_id) || rawMatchIds.get(key(log.rawMatchId || log.raw_match_id))).filter(Boolean)) }))
    .sort((a, b) => clean.favoritePlayerIds.indexOf(a.id) - clean.favoritePlayerIds.indexOf(b.id))
  const lifecycle = text(season.lifecycle || season.status).toUpperCase()
  const archived = weekly ? weekly.cycle?.status === 'CLOSED' : ['ARCHIVED', 'COMPLETED', 'FINISHED'].includes(lifecycle) || (!lifecycle && sourceMatches.length > 0 && sourceMatches.every(match => completed.has(text(match.status).toUpperCase()) || cancelled.has(text(match.status).toUpperCase())))
  const seen = new Set()
  const matches = []
  for (const match of sourceMatches) {
    const id = text(match.match_id || match.id || match.raw_match_id)
    if (!id || seen.has(key(id))) continue
    const status = text(match.status).toUpperCase()
    const presentation = weekly ? buildFollowingWeeklyMatch(db, match, locale) : null
    const a = resolveTeam([match.team_a?.id, match.team_a?.short, match.team_a?.name])
    const b = resolveTeam([match.team_b?.id, match.team_b?.short, match.team_b?.name])
    const sides = [a, b].filter(Boolean)
    const relations = sides.filter(team => teamSet.has(key(getTeamFavoriteId(team))))
      .map(team => ({ type: 'team', id: getTeamFavoriteId(team), name: getTeamShortName(team) }))
    for (const player of players) {
      const appeared = player.matchIds.has(key(id))
      const finished = presentation ? ['complete', 'ruling', 'forfeit'].includes(presentation.state) : completed.has(status)
      const teamSchedule = !finished && player.team && sides.includes(player.team)
      if (appeared || teamSchedule) relations.push({ type: appeared ? 'appearance' : 'player-team', id: player.id, name: player.name })
    }
    if (!relations.length) continue
    seen.add(key(id))
    const scheduledAt = getMatchScheduleValue(match)
    const time = timestamp(scheduledAt)
    const group = presentation ? ({ complete: 'results', ruling: 'results', forfeit: 'results', unknown: 'pending' }[presentation.state] || presentation.state)
      : completed.has(status) ? 'results' : cancelled.has(status) ? 'cancelled' : !archived && live.has(status) ? 'live'
      : !archived && pending.has(status) && time != null && time >= nowTime ? 'upcoming' : 'pending'
    const side = (source, team) => teamView(team || { id: source?.id, short: source?.short, name: source?.name })
    matches.push({ id, group, scheduledAt, time, schedule: formatMatchSchedule(match, { locale, includeWeekday: true }),
      teamA: side(match.team_a, a), teamB: side(match.team_b, b), scoreA: score(match.team_a?.score), scoreB: score(match.team_b?.score),
      stage: weekly ? weeklyWeekTitle(match.followingWeek, locale) : text(match.match_display_name || match.round || match.stage), relations, match,
      ...(presentation ? { presentation, cycleId: weekly.cycle.id, weekId: match.followingWeek.id } : {}) })
  }
  const order = ['live', 'review', 'upcoming', 'results', 'postponed', 'pending', 'cancelled']
  const groups = Object.fromEntries(order.map(group => [group, matches.filter(match => match.group === group).sort((a, b) => {
    if (a.time == null || b.time == null) return a.time == null && b.time == null ? a.id.localeCompare(b.id) : a.time == null ? 1 : -1
    return (group === 'results' ? b.time - a.time : a.time - b.time) || a.id.localeCompare(b.id)
  })]))
  return { archived, weekly, teams, players, groups, matches: order.flatMap(group => groups[group]),
    hasFavorites: Boolean(clean.favoriteTeamIds.length || clean.favoritePlayerIds.length), total: matches.length, loaded: Boolean(db) }
}
