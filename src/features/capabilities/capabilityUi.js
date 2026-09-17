const GLOBAL_SOURCE_TYPES = new Set(['ACCOUNT', 'IDENTITY', 'SYSTEM_ROLE'])

function clean(value) {
  return String(value || '').trim()
}

export function findCapability(snapshot, key) {
  return snapshot?.capabilities?.find(item => item?.key === key) || null
}

export function resolveCapabilityAccess(snapshot, key, {
  organizationId = '',
  registrationId = '',
  matchId = ''
} = {}) {
  if (!snapshot) {
    return {
      known: false,
      allowed: true,
      key,
      reason: '',
      capability: null
    }
  }

  const capability = findCapability(snapshot, key)
  if (!capability) {
    return {
      known: false,
      allowed: true,
      key,
      reason: '',
      capability: null
    }
  }

  let allowed = Boolean(capability.granted)
  const normalizedOrganizationId = clean(organizationId)
  const normalizedRegistrationId = clean(registrationId)
  const normalizedMatchId = clean(matchId)
  const sources = Array.isArray(capability.sources) ? capability.sources : []

  if (allowed && normalizedOrganizationId && capability.scope === 'ORGANIZATION') {
    allowed = sources.some(source => clean(source?.organizationId) === normalizedOrganizationId)
  }
  if (allowed && normalizedRegistrationId && capability.scope === 'TEAM') {
    allowed = sources.some(source => (
      clean(source?.registrationId) === normalizedRegistrationId ||
      GLOBAL_SOURCE_TYPES.has(source?.type)
    ))
  }
  if (allowed && normalizedMatchId && capability.scope === 'MATCH') {
    allowed = sources.some(source => clean(source?.matchId) === normalizedMatchId)
  }

  return {
    known: true,
    allowed,
    key,
    label: capability.label || key,
    reason: allowed ? '' : capability.deniedReason || capability.requirement || '当前上下文未授予这项操作能力。',
    capability
  }
}

export function isCapabilityDeniedError(error) {
  return error?.data?.error === 'CAPABILITY_DENIED'
}

export function capabilityDeniedMessage(error) {
  if (!isCapabilityDeniedError(error)) return ''
  const details = error?.data?.details || {}
  const capability = details.requiredCapability || '所需操作能力'
  const reason = details.deniedReason || '当前账号在这个赛事上下文中没有获得相应能力。'
  return `账号权限不足（${capability}）：${reason}`
}

export function capabilityBlockText(access, fallback = '当前账号不能执行这项操作。') {
  if (!access?.known || access.allowed) return ''
  return `账号权限：${access.reason || fallback}`
}
