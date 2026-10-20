import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isWeeklyOverview } from '../../features/weekly-overview/weeklyOverviewModel.js'

const PartnerTrialOverview = lazy(() => import('../../components/layout/PartnerTrialOverview.jsx'))
const SignalWeeklyOverview = lazy(() => import('../../features/weekly-overview/SignalWeeklyOverview.jsx'))
const StandardHomePage = lazy(() => import('./StandardHomePage.jsx'))

export default function HomePage() {
  const { db, season, isKprHybridDesign } = useOutletContext()
  const weekly = isKprHybridDesign && isWeeklyOverview(db, season)
  return <Suspense fallback={<div role="status" style={{ padding: 32 }}>FRIES CUP / {weekly ? 'WEEKLY' : 'LOADING'}…</div>}>
    {season?.partnerTrial ? <PartnerTrialOverview />
      : weekly ? <SignalWeeklyOverview key={season.id} /> : <StandardHomePage />}
  </Suspense>
}
