import { normalizeSeasonId } from '../favorites/normalizeSeasonId.js'

const TEAM_IDENTITY_TYPES = new Set(['MANAGER', 'COACH'])
const STAFF_IDENTITY_TYPES = new Set(['CASTER', 'REFEREE'])

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function clean(value) {
  return String(value || '').trim()
}

function normalizeKey(value) {
  return clean(value).toLocaleLowerCase()
}

function latestByStatus(requests, status) {
  return safeArr(requests)
    .filter(request => clean(request.status).toUpperCase() === status)
    .sort((a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt || 0) - new Date(a.reviewedAt || a.updatedAt || a.createdAt || 0))[0] || null
}

function matchesSeason(value, seasonId) {
  const requestedSeason = normalizeSeasonId(seasonId)
  const candidateSeason = normalizeSeasonId(value)
  return !requestedSeason || !candidateSeason || requestedSeason === candidateSeason
}

function requestsForSeason(requests, seasonId) {
  return safeArr(requests).filter(request => matchesSeason(request?.seasonId, seasonId))
}

function getVerifiedRequest(profile, requests, seasonId) {
  const approved = requestsForSeason(requests, seasonId)
    .filter(request => clean(request.status).toUpperCase() === 'APPROVED')
  const matched = approved.find(request => (
    (!profile?.verifiedIdentityType || clean(request.identityType).toUpperCase() === clean(profile.verifiedIdentityType).toUpperCase()) &&
    (!profile?.verifiedTargetType || clean(request.targetType).toUpperCase() === clean(profile.verifiedTargetType).toUpperCase()) &&
    (!profile?.verifiedTargetId || normalizeKey(request.targetId) === normalizeKey(profile.verifiedTargetId))
  ))

  if (matched) return matched
  if (approved.length > 0) return latestByStatus(approved, 'APPROVED') || approved[0]

  if ((profile?.verifiedAt || profile?.claimedPlayerVerified) && matchesSeason(profile?.verifiedSeasonId, seasonId)) {
    return {
      status: 'APPROVED',
      seasonId: profile.verifiedSeasonId,
      identityType: profile.verifiedIdentityType,
      targetType: profile.verifiedTargetType,
      targetId: profile.verifiedTargetId || profile.claimedPlayerId,
      reviewedAt: profile.verifiedAt
    }
  }

  return null
}

function normalizePrimaryIdentity(identity, seasonId) {
  if (!identity || typeof identity !== 'object') return null
  const matchingContext = safeArr(identity.contexts)
    .filter(context => matchesSeason(context?.seasonId, seasonId))
    .sort((a, b) => new Date(b.reviewedAt || b.createdAt || 0) - new Date(a.reviewedAt || a.createdAt || 0))[0] || null
  const status = clean(identity.status).toUpperCase()
  const isVerified = Boolean(identity.isVerified || status === 'ACTIVE' || status === 'APPROVED')
  const isPending = Boolean(identity.isPending || status === 'PENDING')
  const isRejected = Boolean(identity.isRejected || status === 'REJECTED' || status === 'REVOKED')

  return {
    ...identity,
    status: isVerified ? 'APPROVED' : isPending ? 'PENDING' : isRejected ? 'REJECTED' : status || 'UNVERIFIED',
    isVerified,
    isPending: !isVerified && isPending,
    isRejected: !isVerified && !isPending && isRejected,
    seasonId: clean(matchingContext?.seasonId || identity.seasonId || seasonId),
    identityType: clean(identity.identityType || identity.type).toUpperCase(),
    targetType: clean(matchingContext?.targetType || identity.targetType).toUpperCase(),
    targetId: clean(matchingContext?.targetId || identity.targetId),
    teamId: clean(matchingContext?.teamId || identity.teamId),
    battleTag: clean(identity.battleTag || matchingContext?.battleTag),
    sourceRequestId: clean(matchingContext?.id || identity.sourceRequestId || identity.id),
    reviewedAt: matchingContext?.reviewedAt || identity.reviewedAt || identity.verifiedAt || ''
  }
}

export function buildAccountIdentity({ primaryIdentity = null, profile = null, requests = [], seasonId = '' } = {}) {
  const normalizedPrimary = normalizePrimaryIdentity(primaryIdentity, seasonId)
  if (normalizedPrimary?.identityType) return normalizedPrimary

  const scopedRequests = requestsForSeason(requests, seasonId)
  const verified = getVerifiedRequest(profile, scopedRequests, seasonId)
  const pending = latestByStatus(scopedRequests, 'PENDING')
  const rejected = latestByStatus(scopedRequests, 'REJECTED')
  const source = verified || pending || rejected

  return {
    status: verified ? 'APPROVED' : pending ? 'PENDING' : rejected ? 'REJECTED' : 'UNVERIFIED',
    isVerified: Boolean(verified),
    isPending: Boolean(!verified && pending),
    isRejected: Boolean(!verified && !pending && rejected),
    seasonId: clean(source?.seasonId || profile?.verifiedSeasonId || seasonId),
    identityType: clean(source?.identityType || profile?.verifiedIdentityType).toUpperCase(),
    targetType: clean(source?.targetType || profile?.verifiedTargetType).toUpperCase(),
    targetId: clean(source?.targetId || profile?.verifiedTargetId || profile?.claimedPlayerId),
    teamId: clean(source?.teamId),
    battleTag: clean(source?.battleTag),
    adminNote: clean(source?.adminNote),
    sourceRequestId: clean(source?.id),
    reviewedAt: source?.reviewedAt || profile?.verifiedAt || ''
  }
}

export function findVerifiedAccountIdentity(identities = [], identityType = '', seasonId = '') {
  const requestedType = clean(identityType).toUpperCase()
  if (!requestedType) return null

  return safeArr(identities)
    .map(identity => normalizePrimaryIdentity(identity, seasonId))
    .filter(identity => identity?.isVerified && identity.identityType === requestedType)
    .sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0))[0] || null
}

export function getAccountCapabilities(identity = null, identities = []) {
  const isVerified = Boolean(identity?.isVerified)
  const identityType = clean(identity?.identityType).toUpperCase()
  const verifiedTypes = new Set([
    ...(isVerified && identityType ? [identityType] : []),
    ...safeArr(identities)
      .filter(item => item?.isVerified || ['ACTIVE', 'APPROVED'].includes(clean(item?.status).toUpperCase()))
      .map(item => clean(item?.identityType || item?.type).toUpperCase())
      .filter(Boolean)
  ])
  const hasVerifiedIdentity = verifiedTypes.size > 0

  return {
    canUseFavorites: true,
    canSubmitFeedback: true,
    canSubmitVerifiedFeedback: hasVerifiedIdentity,
    canAccessPlayerSpace: verifiedTypes.has('PLAYER'),
    canAccessTeamSpace: [...TEAM_IDENTITY_TYPES].some(type => verifiedTypes.has(type)),
    canAccessStaffSpace: [...STAFF_IDENTITY_TYPES].some(type => verifiedTypes.has(type)),
    identityTypes: [...verifiedTypes],
    feedbackSourceLevel: hasVerifiedIdentity ? 'VERIFIED' : identity?.isPending ? 'PENDING' : 'REGISTERED'
  }
}

function teamValues(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.shortName,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalizeKey).filter(Boolean)
}

function playerValues(player) {
  return [
    player?.player_id,
    player?.id,
    player?.player_name,
    player?.nickname,
    player?.displayName,
    player?.battleTag,
    player?.battle_tag,
    player?.battletag
  ].map(normalizeKey).filter(Boolean)
}

function teamRouteId(team) {
  return clean(team?.team_id || team?.id || team?.team_short_name || team?.shortName || team?.short || team?.team_name || team?.name)
}

function playerRouteId(player) {
  return clean(player?.player_id || player?.id || player?.battleTag || player?.battle_tag || player?.player_name || player?.nickname)
}

export function resolveAccountIdentityTarget(identity = null, db = null) {
  if (!identity?.isVerified) return null

  const playerNeedles = [identity.targetType === 'PLAYER' ? identity.targetId : '', identity.battleTag].map(normalizeKey).filter(Boolean)
  const player = safeArr(db?.players).find(item => playerValues(item).some(value => playerNeedles.includes(value))) || null
  const teamNeedles = [
    identity.teamId,
    identity.targetType === 'TEAM' ? identity.targetId : '',
    player?.team_id,
    player?.team_short_name,
    player?.team_name
  ].map(normalizeKey).filter(Boolean)
  const team = safeArr(db?.teams).find(item => teamValues(item).some(value => teamNeedles.includes(value))) || null

  return {
    team,
    player,
    teamRouteId: team ? teamRouteId(team) : clean(identity.teamId || (identity.targetType === 'TEAM' ? identity.targetId : '')),
    playerRouteId: player ? playerRouteId(player) : clean(identity.targetType === 'PLAYER' ? identity.targetId : '')
  }
}
