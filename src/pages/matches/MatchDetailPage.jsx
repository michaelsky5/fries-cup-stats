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

function safeReturnPath(value) {
  const text = String(value || '').trim()
  return text.startsWith('/matches') ? text : ''
}

function getMapOrdersKey(dossier) {
  return dossier?.mapRecords?.map(map => map.order).join('|') || ''
}

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
  const [expandedMaps, setExpandedMaps] = useState(() => new Set())
  const [activeAnchor, setActiveAnchor] = useState('overview')
  const [collapseAllRequested, setCollapseAllRequested] = useState(false)

  const dossier = useMemo(
    () => getMatchDossier(db, matchId, { locale }),
    [db, matchId, locale]
  )
  const mapOrdersKey = getMapOrdersKey(dossier)
  const requestedMap = searchParams.get('map')
  const expandAll = searchParams.get('expand') === 'all'
  const defaultMapOrder = getValidMapOrder(dossier, requestedMap)
  const returnTo = safeReturnPath(location.state?.returnTo)
  const fallbackReturnTo = returnTo || withSeason('/matches')

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
    window.scrollTo(0, 0)
  }, [matchId])

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

    const allOrders = dossier.mapRecords.map(map => map.order)
    if (expandAll) {
      setExpandedMaps(new Set(allOrders))
      setActiveAnchor(defaultMapOrder || allOrders[0])
    } else {
      setExpandedMaps(defaultMapOrder ? new Set([defaultMapOrder]) : new Set())
      setActiveAnchor(defaultMapOrder || 'overview')
    }
  }, [dossier?.internalId, dossier?.hasMapRecords, mapOrdersKey, expandAll, defaultMapOrder, collapseAllRequested])

  useEffect(() => {
    if (!dossier?.hasMapRecords || !requestedMap) return
    if (String(defaultMapOrder) === String(requestedMap)) return

    const next = new URLSearchParams(searchParams)
    next.set('map', String(defaultMapOrder))
    next.delete('expand')
    setSearchParams(next, { replace: true })
  }, [dossier?.hasMapRecords, requestedMap, defaultMapOrder, searchParams, setSearchParams])

  useEffect(() => {
    if (!dossier?.hasMapRecords || !requestedMap || !defaultMapOrder) return
    scrollToMap(defaultMapOrder)
  }, [dossier?.internalId, dossier?.hasMapRecords, requestedMap, defaultMapOrder, scrollToMap])

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo)
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
      <MatchPosterHero dossier={dossier} seasonId={seasonId} onBack={handleBack} t={t} />
      <SeriesMapRail
        dossier={dossier}
        activeMapOrder={typeof activeAnchor === 'number' ? activeAnchor : 0}
        overviewActive={activeAnchor === 'overview'}
        onOverview={handleOverview}
        onSelectMap={handleSelectMap}
        t={t}
      />

      {showResultSections ? (
        <MatchAnalysisSection dossier={dossier} analysisRef={analysisRef} withSeason={withSeason} t={t} />
      ) : (
        <MatchDetailEmptyState dossier={dossier} t={t} />
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
          t={t}
        />
      ) : null}

      <MatchDetailFooterNav
        adjacent={dossier.adjacent}
        withSeason={withSeason}
        returnTo={fallbackReturnTo}
        locale={locale}
        t={t}
      />
    </main>
  )
}
