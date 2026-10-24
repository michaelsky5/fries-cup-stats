import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router-dom'
import { isWeeklyOverview } from '../../features/weekly-overview/weeklyOverviewModel.js'
import HomeTopEntry from './HomeTopEntry.jsx'

const PartnerTrialOverview = lazy(() => import('../../components/layout/PartnerTrialOverview.jsx'))
const SignalWeeklyOverview = lazy(() => import('../../features/weekly-overview/SignalWeeklyOverview.jsx'))
const StandardHomePage = lazy(() => import('./StandardHomePage.jsx'))

export default function HomePage() {
  const { db, season, isKprHybridDesign, locale, withSeason } = useOutletContext()
  const weekly = isKprHybridDesign && isWeeklyOverview(db, season)
  return <>{!season?.partnerTrial && <HomeTopEntry db={db} season={season} locale={locale} withSeason={withSeason} />}<Suspense fallback={<div role="status" style={{ padding: 32 }}>FRIES CUP / {weekly ? 'WEEKLY' : 'LOADING'}…</div>}>
    {season?.partnerTrial ? <PartnerTrialOverview />
      : weekly ? <SignalWeeklyOverview key={season.id} /> : <StandardHomePage />}
  </Suspense></>
}
