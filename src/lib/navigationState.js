const RETURN_SCROLL_STORAGE_PREFIX = 'fries-cup:return-scroll:'

function getWindowScrollY() {
  if (typeof window === 'undefined') return 0
  return window.scrollY || window.pageYOffset || 0
}

function toFiniteScrollY(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function getLocationPath(location) {
  if (!location) return ''
  return `${location.pathname || ''}${location.search || ''}${location.hash || ''}`
}

export function getSafeInternalPath(value, allowedPrefixes = []) {
  const text = String(value || '').trim()
  if (!text || !text.startsWith('/') || text.startsWith('//') || /[\r\n]/.test(text)) return ''
  if (!allowedPrefixes.length) return text
  return allowedPrefixes.some(prefix => text === prefix || text.startsWith(`${prefix}/`) || text.startsWith(`${prefix}?`))
    ? text
    : ''
}

export function saveReturnScroll(locationOrPath, scrollY = getWindowScrollY()) {
  if (typeof window === 'undefined') return
  const path = typeof locationOrPath === 'string' ? locationOrPath : getLocationPath(locationOrPath)
  const safePath = getSafeInternalPath(path)
  const safeScrollY = toFiniteScrollY(scrollY)
  if (!safePath || safeScrollY === null) return

  try {
    window.sessionStorage.setItem(
      `${RETURN_SCROLL_STORAGE_PREFIX}${safePath}`,
      JSON.stringify({ scrollY: safeScrollY, updatedAt: Date.now() })
    )
  } catch {
    // Session storage can be unavailable in private or embedded contexts.
  }
}

export function getSavedReturnScroll(path) {
  if (typeof window === 'undefined') return null
  const safePath = getSafeInternalPath(path)
  if (!safePath) return null

  try {
    const value = window.sessionStorage.getItem(`${RETURN_SCROLL_STORAGE_PREFIX}${safePath}`)
    if (!value) return null
    const parsed = JSON.parse(value)
    return toFiniteScrollY(parsed?.scrollY)
  } catch {
    return null
  }
}

export function getReturnState(location) {
  const returnTo = getLocationPath(location)
  return returnTo ? { returnTo } : {}
}

export function readReturnState(state, { allowedPrefixes = [] } = {}) {
  const returnTo = getSafeInternalPath(state?.returnTo, allowedPrefixes)
  const stateScrollY = toFiniteScrollY(state?.returnScrollY)
  const savedScrollY = returnTo ? getSavedReturnScroll(returnTo) : null

  return {
    returnTo,
    returnScrollY: stateScrollY ?? savedScrollY
  }
}

export function getRestoreScrollY(state) {
  return toFiniteScrollY(state?.restoreScrollY)
}

export function getRestoreScrollState(scrollY) {
  const safeScrollY = toFiniteScrollY(scrollY)
  return safeScrollY === null ? undefined : { restoreScrollY: safeScrollY }
}

export function restoreWindowScroll(scrollY) {
  if (typeof window === 'undefined') return
  const target = toFiniteScrollY(scrollY)
  if (target === null) return

  let attempts = 0
  const apply = () => {
    window.scrollTo({ top: target, left: 0, behavior: 'auto' })
    attempts += 1
    if (attempts < 8 && Math.abs(getWindowScrollY() - target) > 2) {
      window.setTimeout(apply, 60)
    }
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(apply)
  })
}
