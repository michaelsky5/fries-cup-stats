import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { getLocationPath, getRestoreScrollY, getSavedReturnScroll, restoreWindowScroll } from '../../lib/navigationState.js'

export default function useFollowingReturnScroll(loaded) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const scrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => {
    if (loaded && scrollY !== null) restoreWindowScroll(scrollY)
  }, [loaded, location.key, scrollY])
}
