import { Link, useLocation } from 'react-router-dom'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'

// Match and team archives return to the exact advancement selection.
export default function AdvanceRecordLink(props) {
  const location = useLocation()
  return <Link {...props} state={{ ...getReturnState(location), ...props.state }} onClick={event => {
    saveReturnScroll(location)
    props.onClick?.(event)
  }} />
}
