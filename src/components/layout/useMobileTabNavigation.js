import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { getLocationPath, saveReturnScroll } from '../../lib/navigationState.js'
import { buildMobileTabTarget, getMobileNavigationGroup, getMobileNavigationScope, readMobileTab, rememberMobileTab } from './mobileNavigation.js'

export default function useMobileTabNavigation(navPath) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const group = getMobileNavigationGroup(location)
  // Public links omit account competition IDs; use the personal destination when scoping My.
  const scopePath = destination => navPath(destination === 'space' ? '/me' : '/')
  const scope = getMobileNavigationScope(scopePath(group), group, user?.id)
  const path = getLocationPath(location)

  useEffect(() => {
    const entry = { path, state: location.state, scrollY: location.state?.mobileTabRestore ? location.state.restoreScrollY : window.scrollY }
    rememberMobileTab(scope, group, entry)
    const captureScroll = () => rememberMobileTab(scope, group, { ...entry, scrollY: window.scrollY }, { persist: false })
    const persist = () => {
      const latest = readMobileTab(scope, group)
      if (latest) rememberMobileTab(scope, group, latest)
    }
    window.addEventListener('scroll', captureScroll, { passive: true })
    window.addEventListener('pagehide', persist)
    return () => {
      window.removeEventListener('scroll', captureScroll)
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [scope, group, path, location.state])

  const target = (destination, defaultPath) => {
    if (destination === group) return { to: path }
    const destinationScope = getMobileNavigationScope(scopePath(destination), destination, user?.id)
    return buildMobileTabTarget(readMobileTab(destinationScope, destination), defaultPath, destination)
  }
  const activate = (event, destination, defaultPath) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (destination === group) return
    saveReturnScroll(location)
    rememberMobileTab(scope, group, { path, state: location.state, scrollY: window.scrollY })
    const next = target(destination, defaultPath)
    navigate(next.to, { state: next.state })
  }
  return { group, target, activate }
}
