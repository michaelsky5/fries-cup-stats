import { Navigate, useLocation } from 'react-router-dom'

export default function StandingsPage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('phase', 'swiss')

  return <Navigate to={{ pathname: '/advance', search: `?${params.toString()}` }} replace />
}
