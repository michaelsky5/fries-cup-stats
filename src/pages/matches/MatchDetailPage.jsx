import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import MatchAnalysisSection from '../../components/matches/detail/MatchAnalysisSection.jsx'
import MatchDetailEmptyState from '../../components/matches/detail/MatchDetailEmptyState.jsx'
import MatchDetailFooterNav from '../../components/matches/detail/MatchDetailFooterNav.jsx'
import MatchPosterHero from '../../components/matches/detail/MatchPosterHero.jsx'
import MapRecordSection from '../../components/matches/detail/MapRecordSection.jsx'
import SeriesMapRail from '../../components/matches/detail/SeriesMapRail.jsx'
import styles from '../../components/matches/detail/MatchDetail.module.css'
import { getMatchDossier, getValidMapOrder } from '../../lib/matchDetailSelectors.js'
import {
  getRestoreScrollState,
  getRestoreScrollY,
  getReturnState,
  readReturnState,
  restoreWindowScroll,
  saveReturnScroll
} from '../../lib/navigationState.js'

const EMPTY_MAP_RECORDS = []

export default function MatchDetailPage() {
  const context = useOutletContext() || {}
  const {
    db,
    withSeason = path => path,
    seasonId,
    locale = 'zh-CN',
    t = (key, fallback) => fallback || key
  } = context
  const { matchId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const analysisRef = useRef(null)
  const mapRefs = useRef(new Map())
  const sourceReturnRef = useRef(null)
  const [expandedMaps, setExpandedMaps] = useState(() => new Set())
  const [activeAnchor, setActiveAnchor] = useState('overview')
  const [collapseAllRequested, setCollapseAllRequested] = useState(false)

  const dossier = useMemo(
    () => getMatchDossier(db, matchId, { locale }),
    [db, matchId, locale]
  )
  const mapRecords = dossier?.mapRecords || EMPTY_MAP_RECORDS
  const mapOrders = useMemo(() => mapRecords.map(map => map.order), [mapRecords])
  const requestedMap = searchParams.get('map')
  const expandAll = searchParams.get('expand') === 'all'
  const defaultMapOrder = getValidMapOrder(dossier, requestedMap)
  const incomingReturnState = readReturnState(location.state, { allowedPrefixes: ['/matches'] })
  if (incomingReturnState.returnTo) sourceReturnRef.current = incomingReturnState
  const sourceReturnState = sourceReturnRef.current || incomingReturnState
  const returnTo = sourceReturnState.returnTo
  const returnScrollY = sourceReturnState.returnScrollY
  const fallbackReturnTo = returnTo || withSeason('/matches')
  const restoreScrollY = getRestoreScrollY(location.state)
  const currentReturnState = {
    ...getReturnState(location),
    ...(returnTo ? { parentReturnTo: returnTo } : {}),
    ...(Number.isFinite(Number(returnScrollY)) ? { parentReturnScrollY: returnScrollY } : {})
  }

  const setMapRef = useCallback((order, node) => {
    if (node) mapRefs.current.set(order, node)
    else mapRefs.current.delete(order)
  }, [])

  const scrollToNode = useCallback(node => {
    if (!node) return
    window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }, [])

  const scrollToMap = useCallback(order => {
    scrollToNode(mapRefs.current.get(order))
  }, [scrollToNode])

  useEffect(() => {
    if (restoreScrollY !== null) {
      restoreWindowScroll(restoreScrollY)
      return
    }

    window.scrollTo(0, 0)
  }, [matchId, restoreScrollY])

  useEffect(() => {
    if (!dossier?.hasMapRecords) {
      setExpandedMaps(new Set())
      setActiveAnchor('overview')
      return
    }

    if (collapseAllRequested) {
      setExpandedMaps(new Set())
      setActiveAnchor('overview')
      return
    }

    const allOrders = mapOrders
    if (expandAll) {
      setExpandedMaps(new Set(allOrders))
      setActiveAnchor(defaultMapOrder || allOrders[0])
    } else {
      setExpandedMaps(defaultMapOrder ? new Set([defaultMapOrder]) : new Set())
      setActiveAnchor(defaultMapOrder || 'overview')
    }
  }, [dossier?.internalId, dossier?.hasMapRecords, mapOrders, expandAll, defaultMapOrder, collapseAllRequested])

  useEffect(() => {
    if (!dossier?.hasMapRecords || !requestedMap) return
    if (String(defaultMapOrder) === String(requestedMap)) return

    const next = new URLSearchParams(searchParams)
    next.set('map', String(defaultMapOrder))
    next.delete('expand')
    setSearchParams(next, { replace: true })
  }, [dossier?.hasMapRecords, requestedMap, defaultMapOrder, searchParams, setSearchParams])

  useEffect(() => {
    if (restoreScrollY !== null || !dossier?.hasMapRecords || !requestedMap || !defaultMapOrder) return
    scrollToMap(defaultMapOrder)
  }, [dossier?.internalId, dossier?.hasMapRecords, requestedMap, defaultMapOrder, restoreScrollY, scrollToMap])

  const handleBack = () => {
    if (returnTo) {
      const restoreState = getRestoreScrollState(returnScrollY)
      navigate(returnTo, restoreState ? { state: restoreState } : undefined)
      return
    }
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(withSeason('/matches'))
  }

  const handleOverview = () => {
    setActiveAnchor('overview')
    const next = new URLSearchParams(searchParams)
    next.delete('map')
    next.delete('expand')
    setSearchParams(next)
    scrollToNode(analysisRef.current)
  }

  const handleSelectMap = order => {
    setCollapseAllRequested(false)
    setActiveAnchor(order)
    setExpandedMaps(new Set([order]))
    const next = new URLSearchParams(searchParams)
    next.set('map', String(order))
    next.delete('expand')
    setSearchParams(next)
    scrollToMap(order)
  }

  const handleToggleMap = order => {
    if (expandedMaps.has(order)) {
      setExpandedMaps(prev => {
        const next = new Set(prev)
        next.delete(order)
        return next
      })
      return
    }
    handleSelectMap(order)
  }

  const handleExpandAll = () => {
    if (!dossier?.hasMapRecords) return
    setCollapseAllRequested(false)
    const orders = dossier.mapRecords.map(map => map.order)
    setExpandedMaps(new Set(orders))
    setActiveAnchor(orders[0] || 'overview')
    const next = new URLSearchParams(searchParams)
    next.set('expand', 'all')
    next.delete('map')
    setSearchParams(next)
  }

  const handleCollapseAll = () => {
    setCollapseAllRequested(true)
    setExpandedMaps(new Set())
    setActiveAnchor('overview')
    const next = new URLSearchParams(searchParams)
    next.delete('map')
    next.delete('expand')
    setSearchParams(next)
  }

  if (!dossier) {
    return (
      <main className={styles.shell}>
        <div className={styles.statePanel}>
          <h1 className={styles.stateTitle}>MATCH NOT FOUND</h1>
          <p className={styles.stateBody}>{matchId}</p>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            {t('matchDetail.back', 'Back to Matches')} {'->'}
          </button>
        </div>
      </main>
    )
  }

  const showResultSections = dossier.state.canShowResults && !dossier.state.isForfeit
  const showMaps = showResultSections && dossier.hasMapRecords
  return (
    <main className={styles.shell}>
      <MatchPosterHero
        dossier={dossier}
        seasonId={seasonId}
        withSeason={withSeason}
        returnState={currentReturnState}
        onBack={handleBack}
        onTeamNavigate={() => saveReturnScroll(location)}
        t={t}
      />
      <SeriesMapRail
        dossier={dossier}
        activeMapOrder={typeof activeAnchor === 'number' ? activeAnchor : 0}
        overviewActive={activeAnchor === 'overview'}
        onOverview={handleOverview}
        onSelectMap={handleSelectMap}
        t={t}
      />

      {showResultSections ? (
        <MatchAnalysisSection dossier={dossier} analysisRef={analysisRef} withSeason={withSeason} locale={locale} t={t} />
      ) : (
        <MatchDetailEmptyState dossier={dossier} locale={locale} t={t} />
      )}

      {showMaps ? (
        <MapRecordSection
          dossier={dossier}
          expandedMaps={expandedMaps}
          onToggleMap={handleToggleMap}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          setMapRef={setMapRef}
          seasonId={seasonId}
          locale={locale}
          t={t}
        />
      ) : null}

      <MatchDetailFooterNav
        adjacent={dossier.adjacent}
        withSeason={withSeason}
        returnTo={fallbackReturnTo}
        returnScrollY={returnScrollY}
        locale={locale}
        t={t}
      />
    </main>
  )
}
