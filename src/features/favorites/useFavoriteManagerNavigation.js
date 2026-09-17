import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const managerKey = 'favoriteManagerTab'

// Keep editing state out of shared URLs, while accepting existing entry links.
export default function useFavoriteManagerNavigation(enabled = true) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const legacyEntry = params.get('manage') === '1'
  const tab = location.state?.[managerKey] || (legacyEntry ? params.get('tab') === 'players' ? 'players' : 'teams' : null)

  useEffect(() => {
    if (!enabled || !legacyEntry) return
    const next = new URLSearchParams(location.search)
    next.delete('manage')
    next.delete('tab')
    navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash }, {
      replace: true, preventScrollReset: true, state: { ...location.state, [managerKey]: tab }
    })
  }, [enabled, legacyEntry, location.pathname, location.search, location.hash, location.state, navigate, tab])

  const openManager = (nextTab = 'teams', section) => {
    const next = new URLSearchParams(location.search)
    next.delete('manage')
    next.delete('tab')
    if (section) next.set('section', section)
    navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash }, {
      preventScrollReset: true, state: { ...location.state, [managerKey]: nextTab === 'players' ? 'players' : 'teams' }
    })
  }
  const closeManager = () => {
    const state = { ...location.state }
    delete state[managerKey]
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, preventScrollReset: true, state })
  }
  return { managerOpen: enabled && Boolean(tab), managerTab: tab || 'teams', openManager, closeManager }
}
