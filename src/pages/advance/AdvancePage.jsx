import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import AdvanceHeader from '../../components/advance/AdvanceHeader.jsx'
import AdvanceStageRail from '../../components/advance/AdvanceStageRail.jsx'
import BreakthroughPhasePanel from '../../components/advance/BreakthroughPhasePanel.jsx'
import FinalResultsPanel from '../../components/advance/FinalResultsPanel.jsx'
import GroupPhasePanel from '../../components/advance/GroupPhasePanel.jsx'
import PlayoffBracket from '../../components/advance/PlayoffBracket.jsx'
import SwissPhasePanel from '../../components/advance/SwissPhasePanel.jsx'
import {
  getAdvanceStageRail,
  getAdvanceSummary,
  getBreakthroughState,
  getDefaultAdvancePhase,
  getFinalResult,
  getGroupOverview,
  getGroupStandings,
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
    locale,
    t,
    withSeason = path => path,
    favorites,
    isFavoriteTeam,
    isPrimaryFavoriteTeam
  } = useOutletContext()
  const location = useLocation()
  const activePhase = useAdvancePhase(db, season)

  const summary = useMemo(() => getAdvanceSummary(db, season), [db, season])
  const isGroupSeason = summary.competitionFormat === 'GROUP'
  const rail = useMemo(() => getAdvanceStageRail(db, season, activePhase), [db, season, activePhase])
  const swissOverview = useMemo(() => isGroupSeason ? null : getSwissOverview(db, season), [db, season, isGroupSeason])
  const swissRows = useMemo(() => isGroupSeason ? [] : getSwissStandingsRows(db, season, favorites), [db, season, favorites, isGroupSeason])
  const swissZones = useMemo(() => isGroupSeason ? [] : getSwissZoneCounts(db, season, favorites), [db, season, favorites, isGroupSeason])
  const tiebreakers = useMemo(() => isGroupSeason ? [] : getSwissTiebreakers(season, db), [season, db, isGroupSeason])
  const keyMatches = useMemo(() => isGroupSeason ? [] : getSwissKeyMatches(db, season, favorites, 3), [db, season, favorites, isGroupSeason])
  const breakthroughState = useMemo(() => isGroupSeason ? null : getBreakthroughState(db, season), [db, season, isGroupSeason])
  const playoffBracket = useMemo(() => getPlayoffBracket(db, season), [db, season])
  const finalResult = useMemo(() => getFinalResult(db), [db])
  const groupOverview = useMemo(() => isGroupSeason ? getGroupOverview(db, season) : null, [db, season, isGroupSeason])
  const groupStandings = useMemo(() => isGroupSeason ? getGroupStandings(db, season, favorites) : [], [db, season, favorites, isGroupSeason])

  const getPhaseHref = phase => {
    const params = new URLSearchParams(location.search)
    params.set('phase', phase)
    return `/advance?${params.toString()}`
  }

  return (
    <div className={styles.shell}>
      <AdvanceHeader season={season} seasonId={seasonId} summary={summary} result={finalResult} locale={locale} t={t} />
      <AdvanceStageRail items={rail} t={t} getHref={getPhaseHref} />

      {activePhase === 'groups' ? (
        <GroupPhasePanel
          overview={groupOverview}
          groups={groupStandings}
          seasonId={seasonId}
          withSeason={withSeason}
          locale={locale}
        />
      ) : null}

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
          eyebrow={isGroupSeason ? 'TOP 8 PLAYOFFS' : 'PLAYOFFS'}
          title={isGroupSeason ? t('advance.playoffs.singleElimTitle', '八强单败淘汰图') : t('advance.playoffs.title', '季后赛双败淘汰图')}
          t={t}
          seasonId={seasonId}
          withSeason={withSeason}
          isFavoriteTeam={isFavoriteTeam}
          isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
          showFilter={!isGroupSeason}
          singleElimination={isGroupSeason}
          locale={locale}
          emptyTitle={isGroupSeason ? t('advance.playoffs.groupEmptyTitle', '八强对阵待公布') : undefined}
          emptyDescription={isGroupSeason
            ? t('advance.playoffs.groupEmptyDesc', '小组赛各组前二确认后，由 System 发布八强单败对阵。八强赛与半决赛 FT3，季军赛与总决赛 FT4。')
            : undefined}
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
          originPhase={isGroupSeason ? 'groups' : 'swiss'}
          singleElimination={isGroupSeason}
        />
      ) : null}
    </div>
  )
}
