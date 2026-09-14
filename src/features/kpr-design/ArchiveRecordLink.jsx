import { Link, useLocation } from 'react-router-dom'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'

// Keep a record's source in router state; shared URLs remain ordinary links.
export default function ArchiveRecordLink({ onClick, state, ...props }) {
  const location = useLocation()
  return <Link {...props} state={{ ...getReturnState(location), ...state }} onClick={event => {
    onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      saveReturnScroll(location)
    }
  }} />
}
