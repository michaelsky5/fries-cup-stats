import { Link, useLocation } from 'react-router-dom'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { getMySpaceSourceLocation } from '../../lib/mySpaceNavigation.js'

export default function FollowingLink({ children, sourceSection = 'following', ...props }) {
  const location = useLocation()
  const source = getMySpaceSourceLocation(location, sourceSection)
  return <Link {...props} state={getReturnState(source)} onClick={() => {
    saveReturnScroll(location)
    if (source.search !== location.search) saveReturnScroll(source)
  }}>{children}</Link>
}
