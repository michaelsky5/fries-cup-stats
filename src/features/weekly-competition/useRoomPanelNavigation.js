import { useLocation, useNavigate } from 'react-router-dom'
import { getRoomPanel, getRoomPanelNavigation } from './roomPanelNavigation.js'

export default function useRoomPanelNavigation(matchId) {
  const location = useLocation()
  const navigate = useNavigate()
  const panel = getRoomPanel(location.state, matchId)?.key || ''
  const setPanel = key => {
    const target = getRoomPanelNavigation(location, matchId, key)
    if (target) navigate(target.to, target.options)
  }
  return [panel, setPanel]
}
