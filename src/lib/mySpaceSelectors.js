import {
  getTeamFavoriteId,
  getTeamFullName,
  getTeamIdentityValues,
  getTeamRouteId,
  getTeamShortName,
  identityMatches
} from '../features/favorites/favoritesSelectors.js'
import { formatMatchSchedule, getPublicStatusLabel } from './scheduleFormat.js'

const safeArr = value => Array.isArray(value) ? value : []

export function shouldExposeTeamSpace({
  isVerifiedPlayer = false,
  hasVerifiedTeamIdentity = false,
  hasPendingTeamWorkflow = false,
  hasCapabilitySnapshot = false,
  hasTeamOperations = false,
  sectionEnabled = false
} = {}) {
  if (isVerifiedPlayer || hasVerifiedTeamIdentity || hasPendingTeamWorkflow) return true
  return hasCapabilitySnapshot ? Boolean(hasTeamOperations) : Boolean(sectionEnabled)
}

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function getPlayerDisplayName(player) {
  return normalize(player?.display_name || player?.displayName || player?.nickname || player?.player_name || player?.name)
}

function getPlayerBattleTag(player) {
  return normalize(player?.battle_tag || player?.battleTag || player?.battletag)
}

export function buildPlayerSpaceDossier({ publicDossier = null, identity = null, target = null, user = null } = {}) {
  if (publicDossier) return { ...publicDossier, isPublished: true }

  const player = target?.player || null
  const team = target?.team || null
  const battleTag = normalize(identity?.battleTag || getPlayerBattleTag(player))
  const displayName = getPlayerDisplayName(player) || normalize(user?.displayName || user?.username) || battleTag.split('#')[0] || '我的'

  return {
    isPublished: false,
    basePlayer: null,
    identity: {
      playerId: normalize(target?.playerRouteId || identity?.targetId),
      displayName,
      battleTag,
      initials: displayName.slice(0, 2).toUpperCase(),
      teamShort: team ? getTeamShortName(team) : normalize(target?.teamShort || identity?.teamId),
      teamFull: team ? getTeamFullName(team) : normalize(target?.teamName),
      teamRouteId: team ? getTeamRouteId(team) : normalize(target?.teamRouteId || identity?.teamId),
      registeredRole: ''
    },
    roles: [],
    roleEntries: [],
    selectedView: 'overview',
    selectedRoleData: null,
    isOverview: true,
    rows: []
  }
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getMatchTime(match) {
  const value = match?.scheduled_at || match?.scheduledAt || match?.schedule?.scheduled_at
  const timestamp = value ? new Date(value).getTime() : NaN
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function buildTeamIndex(db) {
  const index = new Map()
  safeArr(db?.teams).forEach(team => {
    getTeamIdentityValues(team).forEach(identity => {
      const key = normalizeKey(identity)
      if (key && !index.has(key)) index.set(key, team)
    })
  })
  return index
}

function resolveTeam(index, source) {
  const team = index.get(normalizeKey(source?.id || source?.short || source?.name)) || source || {}
  return {
    ...team,
    id: getTeamFavoriteId(team) || source?.id || source?.short || '',
    routeId: getTeamRouteId(team) || source?.id || source?.short || '',
    short: source?.short || getTeamShortName(team),
    full: source?.name || getTeamFullName(team),
    score: source?.score
  }
}

function getScoreLabel(teamA, teamB) {
  const scoreA = teamA.score === '' || teamA.score === null || teamA.score === undefined ? '-' : teamA.score
  const scoreB = teamB.score === '' || teamB.score === null || teamB.score === undefined ? '-' : teamB.score
  return `${scoreA} : ${scoreB}`
}

export function getTeamMatchHistory(db, teamOrId, limit = 8) {
  if (!teamOrId) return []

  const team = typeof teamOrId === 'object' ? teamOrId : safeArr(db?.teams).find(item => identityMatches(teamOrId, getTeamIdentityValues(item)))
  const identities = team ? getTeamIdentityValues(team) : [normalize(teamOrId)]
  const teamIndex = buildTeamIndex(db)

  return safeArr(db?.matches)
    .filter(match => identities.some(identity => (
      identityMatches(identity, [match?.team_a?.id, match?.team_a?.short, match?.team_a?.name]) ||
      identityMatches(identity, [match?.team_b?.id, match?.team_b?.short, match?.team_b?.name])
    )))
    .sort((a, b) => {
      const timeA = getMatchTime(a)
      const timeB = getMatchTime(b)
      if (timeA === Number.MAX_SAFE_INTEGER && timeB !== Number.MAX_SAFE_INTEGER) return 1
      if (timeB === Number.MAX_SAFE_INTEGER && timeA !== Number.MAX_SAFE_INTEGER) return -1
      return timeB - timeA || normalize(b?.match_id).localeCompare(normalize(a?.match_id))
    })
    .slice(0, Math.max(0, Number(limit) || 0))
    .map(match => {
      const teamA = resolveTeam(teamIndex, match?.team_a)
      const teamB = resolveTeam(teamIndex, match?.team_b)
      const ownSide = identities.some(identity => identityMatches(identity, [teamA.id, teamA.short, teamA.full])) ? 'a' : 'b'
      const opponent = ownSide === 'a' ? teamB : teamA
      const ownScore = toNumber(ownSide === 'a' ? teamA.score : teamB.score)
      const opponentScore = toNumber(ownSide === 'a' ? teamB.score : teamA.score)
      const resultText = ownScore === null || opponentScore === null
        ? ''
        : ownScore > opponentScore ? '胜' : ownScore < opponentScore ? '负' : '平'
      const schedule = formatMatchSchedule(match, { locale: 'zh-CN', includeWeekday: true })

      return {
        match,
        matchId: match.match_id || match.raw_match_id,
        teamA,
        teamB,
        opponent,
        ownSide,
        schedule,
        compactTime: schedule.compact,
        stageLabel: normalize(match?.round || match?.stage || match?.match_display_name || '赛程'),
        format: normalize(match?.format || 'FT2'),
        statusLabel: getPublicStatusLabel(match?.status, 'zh-CN'),
        score: getScoreLabel(teamA, teamB),
        resultText
      }
    })
}
