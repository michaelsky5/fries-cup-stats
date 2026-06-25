import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import AdvanceHeader from '../../components/advance/AdvanceHeader.jsx'
import AdvanceStageRail from '../../components/advance/AdvanceStageRail.jsx'
import BreakthroughPhasePanel from '../../components/advance/BreakthroughPhasePanel.jsx'
import FinalResultsPanel from '../../components/advance/FinalResultsPanel.jsx'
import PlayoffBracket from '../../components/advance/PlayoffBracket.jsx'
import SwissPhasePanel from '../../components/advance/SwissPhasePanel.jsx'
import {
  getAdvanceStageRail,
  getAdvanceSummary,
  getBreakthroughState,
  getDefaultAdvancePhase,
  getFinalResult,
  getPlayoffBracket,
  getSwissKeyMatches,
  getSwissOverview,
  getSwissStandingsRows,
  getSwissTiebreakers,
  getSwissZoneCounts,
  isValidAdvancePhase
} from '../../lib/advanceSelectors.js'
import styles from './AdvancePage.module.css'

function useAdvancePhase(db, season) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const defaultPhase = useMemo(() => getDefaultAdvancePhase(db, season), [db, season])
  const requestedPhase = String(searchParams.get('phase') || '').toLowerCase()
  const activePhase = isValidAdvancePhase(requestedPhase, season, db) ? requestedPhase : defaultPhase

  useEffect(() => {
    if (requestedPhase === activePhase) return
    const nextParams = new URLSearchParams(location.search)
    nextParams.set('phase', activePhase)
    navigate({ pathname: '/advance', search: `?${nextParams.toString()}` }, { replace: true })
  }, [activePhase, location.search, navigate, requestedPhase])

  return activePhase
}

export default function AdvancePage() {
  const {
    db,
    season,
    seasonId,
    t,
    withSeason = path => path,
    favorites,
    isFavoriteTeam,
    isPrimaryFavoriteTeam
  } = useOutletContext()
  const location = useLocation()
  const activePhase = useAdvancePhase(db, season)

  const summary = useMemo(() => getAdvanceSummary(db, season), [db, season])
  const rail = useMemo(() => getAdvanceStageRail(db, season, activePhase), [db, season, activePhase])
  const swissOverview = useMemo(() => getSwissOverview(db, season), [db, season])
  const swissRows = useMemo(() => getSwissStandingsRows(db, season, favorites), [db, season, favorites])
  const swissZones = useMemo(() => getSwissZoneCounts(db, season, favorites), [db, season, favorites])
  const tiebreakers = useMemo(() => getSwissTiebreakers(season, db), [season, db])
  const keyMatches = useMemo(() => getSwissKeyMatches(db, season, favorites, 3), [db, season, favorites])
  const breakthroughState = useMemo(() => getBreakthroughState(db, season), [db, season])
  const playoffBracket = useMemo(() => getPlayoffBracket(db, season), [db, season])
  const finalResult = useMemo(() => getFinalResult(db), [db])

  const getPhaseHref = phase => {
    const params = new URLSearchParams(location.search)
    params.set('phase', phase)
    return `/advance?${params.toString()}`
  }

  return (
    <div className={styles.shell}>
      <AdvanceHeader season={season} seasonId={seasonId} summary={summary} t={t} />
      <AdvanceStageRail items={rail} t={t} getHref={getPhaseHref} />

      {activePhase === 'swiss' ? (
        <SwissPhasePanel
          overview={swissOverview}
          zones={swissZones}
          rows={swissRows}
          tiebreakers={tiebreakers}
          keyMatches={keyMatches}
          seasonId={seasonId}
          t={t}
          withSeason={withSeason}
        />
      ) : null}

      {activePhase === 'breakthrough' ? (
        <BreakthroughPhasePanel
          state={breakthroughState}
          t={t}
          seasonId={seasonId}
          withSeason={withSeason}
          isFavoriteTeam={isFavoriteTeam}
          isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
        />
      ) : null}

      {activePhase === 'playoffs' ? (
        <PlayoffBracket
          bracket={playoffBracket}
          eyebrow="PLAYOFFS"
          title={t('advance.playoffs.title', '季后赛双败淘汰图')}
          t={t}
          seasonId={seasonId}
          withSeason={withSeason}
          isFavoriteTeam={isFavoriteTeam}
          isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
        />
      ) : null}

      {activePhase === 'final' ? (
        <FinalResultsPanel
          result={finalResult}
          playoffBracket={playoffBracket}
          seasonId={seasonId}
          t={t}
          withSeason={withSeason}
          isFavoriteTeam={isFavoriteTeam}
          isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
        />
      ) : null}
    </div>
  )
}
