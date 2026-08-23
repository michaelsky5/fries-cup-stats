import { Navigate, useLocation, useOutletContext } from 'react-router-dom'
import { getDefaultAdvancePhase } from '../../lib/advanceSelectors.js'

export default function StandingsPage() {
  const location = useLocation()
  const { db, season } = useOutletContext()
  const params = new URLSearchParams(location.search)
  params.set('phase', getDefaultAdvancePhase(db, season))

  return <Navigate to={{ pathname: '/advance', search: `?${params.toString()}` }} replace />
}
