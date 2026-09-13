import { getLeaderboardEntries, getRankingMinTimeMins } from '../../lib/leaderboardSelectors.js'
import { ROLE_ORDER } from '../../lib/leaderboardScoring.js'
import { formatTeamName, safeArr } from '../../lib/homeSelectors.js'
import { getTeamRosterPlayers, getTeamStaff } from '../../lib/rosterSelectors.js'
import { ARCHIVE_HERO_SELECTIONS } from './archiveHeroSelections.js'
import { ARCHIVE_OFFICIAL_HONORS } from './archiveHonors.js'

export const playerLabel = entry => entry?.nickname || entry?.display_name || entry?.player_name || entry?.player_id || '—'
export const teamId = team => String(team?.team_id || team?.id || '')
export const presentationHero = entry => entry?.presentationHero || entry?.most_played_hero

function matchTimestamp(match) {
  const value = match.scheduled_at || match.match_date || match.date ||
    (match.scheduled_date && match.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : '')
  return Date.parse(value) || 0
}

export function getChampionResult(match, champion) {
  if (!match || !teamId(champion)) return null
  const side = [match.team_a, match.team_b].findIndex(team => teamId(team) === teamId(champion))
  if (side < 0) return null
  const [own, opponent] = side === 0 ? [match.team_a, match.team_b] : [match.team_b, match.team_a]
  const score = value => value === undefined || value === null || value === '' ? '—' : String(value)
  return { own, opponent, score: score(own?.score), opponentScore: score(opponent?.score) }
}

export function getArchiveStory(db, season, archive) {
  const champion = archive?.champion
  const championId = teamId(champion)
  const allEntries = getLeaderboardEntries(db, season)
  const championEntries = allEntries.filter(entry => championId && entry.team_id === championId)
  const byTime = [...championEntries].sort((a, b) => b.roleTimeMins - a.roleTimeMins || a.entryKey.localeCompare(b.entryKey))
  const playersById = new Map()
  for (const entry of byTime) {
    if (!playersById.has(entry.player_id)) playersById.set(entry.player_id, entry)
  }
  const uniquePlayers = [...playersById.values()]
  const selectedCast = []
  for (const [role, limit] of [['TANK', 1], ['DPS', 2], ['SUPPORT', 2]]) {
    selectedCast.push(...uniquePlayers.filter(entry => entry.role === role).slice(0, limit))
  }
  selectedCast.push(...uniquePlayers.filter(entry => !selectedCast.includes(entry)).slice(0, 5 - selectedCast.length))
  const resolvedSeasonId = season?.id || db?.season?.id || db?.meta?.season_id
  const heroSelection = ARCHIVE_HERO_SELECTIONS[resolvedSeasonId]
  const decorateEntry = entry => entry ? {
    ...entry,
    presentationHero: heroSelection?.players?.[entry.player_id] || entry.most_played_hero,
    presentationHeroSource: heroSelection?.players?.[entry.player_id] ? heroSelection.source : ''
  } : null
  const cast = selectedCast.map(decorateEntry)
  const castPlayerIds = new Set(cast.map(entry => entry.player_id))
  const championTeam = safeArr(db?.teams).find(team => teamId(team) === championId) || champion
  const championRoster = getTeamRosterPlayers(db, championTeam)
  const championStaff = getTeamStaff(championTeam)
  const reserveNames = championRoster
    .filter(player => !castPlayerIds.has(player.player_id))
    .map(playerLabel)
    .filter(Boolean)
  const eligibleArchiveEntries = allEntries
    .filter(entry => entry.eligible && !castPlayerIds.has(entry.player_id))
  const roleLeaders = ROLE_ORDER.map(role => eligibleArchiveEntries
    .filter(entry => entry.role === role)
    .sort((a, b) => (a.roleRank || Number.MAX_SAFE_INTEGER) - (b.roleRank || Number.MAX_SAFE_INTEGER) || a.entryKey.localeCompare(b.entryKey))[0])
    .filter(Boolean)
    .map(decorateEntry)
  const featuredLeader = decorateEntry([...eligibleArchiveEntries]
    .sort((a, b) => (a.overallRank || Number.MAX_SAFE_INTEGER) - (b.overallRank || Number.MAX_SAFE_INTEGER) || a.entryKey.localeCompare(b.entryKey))[0] || null
  )
  const honors = ARCHIVE_OFFICIAL_HONORS[resolvedSeasonId]
  const officialFmvp = honors?.source && honors?.fmvpPlayerId
    ? decorateEntry(championEntries.find(entry => entry.player_id === honors.fmvpPlayerId))
    : null
  const demoSubject = officialFmvp || cast.find(entry => entry.role === 'DPS') || cast[0] || null
  const journey = safeArr(db?.matches)
    .filter(match => ['COMPLETE', 'COMPLETED'].includes(String(match.status).toUpperCase()) && getChampionResult(match, champion))
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b) || String(a.match_id).localeCompare(String(b.match_id)))
    .slice(-3)
  return {
    championId,
    cast,
    roleLeaders,
    featuredLeader,
    rankingMinTimeMins: getRankingMinTimeMins(season, db),
    championFile: {
      rosterCount: championRoster.length,
      starterCount: cast.length,
      reserveCount: reserveNames.length,
      reserveNames,
      coach: championStaff.coachLabel,
      manager: championStaff.managerLabel
    },
    officialFmvp,
    demoSubject,
    journey,
    championName: formatTeamName(champion)
  }
}
