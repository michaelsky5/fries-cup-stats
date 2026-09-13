import { platformRequest } from '../auth/platformApi.js'

const FEATURE_KEYS = ['communications', 'predictions', 'weeklyCompetition', 'teamOperations', 'scheduleNegotiation', 'matchRoom']

function normalizeLaunchFeatures(features) {
  return Object.fromEntries(FEATURE_KEYS.map(key => [key, ['READ_ONLY', 'WRITE'].includes(features?.[key]) ? features[key] : 'HIDDEN']))
}

export function hasAccountFeatureAccess(launch, feature, requiredAccess = 'READ_ONLY') {
  const rank = { HIDDEN: 0, READ_ONLY: 1, WRITE: 2 }
  return (rank[launch?.features?.[feature]] || 0) >= (rank[requiredAccess] || 0)
}

export async function fetchAccountLaunchStatus(seasonId, options = {}) {
  const data = await platformRequest(`/account-launch/seasons/${encodeURIComponent(seasonId)}`, options)
  return {
    seasonId: data?.launch?.seasonId || seasonId,
    portalMode: data?.launch?.portalMode || 'OFF',
    allowed: Boolean(data?.launch?.allowed),
    reason: data?.launch?.reason || 'PORTAL_OFF',
    emailVerified: Boolean(data?.launch?.emailVerified),
    features: normalizeLaunchFeatures(data?.launch?.features)
  }
}

export async function fetchMySpaceContext(seasonId) {
  const data = await platformRequest(`/me/space-context?seasonId=${encodeURIComponent(seasonId)}`)
  return data?.context || null
}
