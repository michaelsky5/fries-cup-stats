import { buildWeeklyOverview } from '../../../../src/features/weekly-overview/weeklyOverviewModel.js'
import { buildWeeklyAdvance, weeklyPublishedRank } from '../../../../src/features/weekly-advance/weeklyAdvanceModel.js'
import { initialSelection, validateSnapshot } from './model.js'

export { weeklyPublishedRank }
export const idOf = item => String(item?.id || item?.team_id || '')
export const playerIdOf = item => String(item?.player_id || '')
export const playerName = item => item?.display_name || item?.nickname || item?.player_name || '资料待公布'
export const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()
export const roleLabel = value => ({ TANK: '重装', DPS: '输出', SUPPORT: '支援', SUP: '支援', FLEX: '自由人' }[String(value).toUpperCase()] || '职责待公布')
export const METRICS = [
  ['avg_elim', '消灭'], ['avg_dmg', '伤害'], ['avg_heal', '治疗'],
  ['avg_ast', '助攻'], ['avg_dth', '阵亡'], ['avg_block', '阻挡']
]
export function publicNumber(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}
export function metricText(value) {
  const number = publicNumber(value)
  return number === null ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(number)
}
export function routeView(params = {}) {
  if (params.story) return 'review'
  if (params.id) return 'matches'
  if (params.team || params.player) return 'roster'
  if (params.map) return 'maps'
  if (params.hero) return 'heroes'
  if (params.staff) return 'staff'
  return ['overview', 'matches', 'database', 'play', 'space', 'advance', 'roster', 'maps', 'heroes', 'staff', 'review', 'history'].includes(params.view) ? params.view : 'overview'
}
export function centerModel(raw, selection, following) {
  validateSnapshot(raw)
  const followedTeamIds = following?.teams || []
  const overviewWeekId = selection.weekId === 'all' ? initialSelection(raw, { cycle: selection.cycleId }).weekId : selection.weekId
  const overview = buildWeeklyOverview(raw, { ...selection, weekId: overviewWeekId, followedTeamIds })
  const advance = buildWeeklyAdvance(raw, { cycleId: selection.cycleId, weekId: selection.weekId, followedTeamIds })
  const teams = raw.teams.filter(team => idOf(team))
  const totals = new Map((raw.player_totals || []).map(row => [playerIdOf(row), row]))
  const players = (raw.players || []).filter(player => playerIdOf(player)).map(player => ({ ...player, totals: totals.get(playerIdOf(player)) || null }))
  const followedTeams = teams.filter(team => followedTeamIds.includes(idOf(team)))
  const followedPlayers = players.filter(player => (following?.players || []).includes(playerIdOf(player)))
  const relatedIds = new Set([...followedTeamIds, ...followedPlayers.map(player => String(player.team_id || ''))])
  const followedMatches = overview.weekEntries.flatMap(entry => entry.matches.map(match => ({ ...match, week: entry.week })))
    .filter(match => [match.team_a, match.team_b].some(team => relatedIds.has(idOf(team))))
  return { ...overview, advance, teams, players, followedTeams, followedPlayers, followedMatches,
    unavailableFollows: followedTeamIds.length + (following?.players || []).length - followedTeams.length - followedPlayers.length }
}
export function filterDirectory(model, { kind = 'teams', query = '', role = 'all', teamId = '' } = {}) {
  const search = normalize(query)
  return (kind === 'players' ? model.players : model.teams).filter(item => {
    const names = kind === 'players'
      ? [playerName(item), item.player_name, item.team_short_name, item.team_name]
      : [item.team_name, item.team_short_name]
    return (!search || names.some(name => normalize(name).includes(search))) &&
      (kind !== 'players' || ((!teamId || String(item.team_id) === teamId) && (role === 'all' || String(item.role).toUpperCase() === role)))
  })
}
export function rankedPlayers(players, metric, { role = 'all', query = '' } = {}) {
  const search = normalize(query)
  if (!METRICS.some(([key]) => key === metric)) return []
  return players.filter(player => publicNumber(player.totals?.maps_played) > 0 && publicNumber(player.totals?.[metric]) !== null &&
    (role === 'all' || String(player.totals?.role || player.role).toUpperCase() === role) &&
    (!search || [playerName(player), player.player_name, player.team_short_name, player.team_name].some(name => normalize(name).includes(search))))
    .sort((a, b) => publicNumber(b.totals[metric]) - publicNumber(a.totals[metric]) || playerIdOf(a).localeCompare(playerIdOf(b)))
}
export function teamProfile(model, teamId) {
  const team = model.teams.find(item => idOf(item) === teamId)
  if (!team) return null
  const standing = model.standings.find(row => String(row.team_id) === teamId) || null
  // The public team roster is a current directory, not an inferred past lineup.
  const members = model.players.filter(player => Array.isArray(team.player_ids) ? team.player_ids.includes(playerIdOf(player)) : String(player.team_id) === teamId)
  const locked = model.week?.rosters?.find(roster => String(roster.team_id) === teamId)
  return { team, standing, members,
    lockedMembers: locked ? model.players.filter(player => locked.player_ids?.includes(playerIdOf(player))) : null,
    matches: model.weekEntries.flatMap(entry => entry.matches).filter(match => [match.team_a, match.team_b].some(side => idOf(side) === teamId)) }
}
