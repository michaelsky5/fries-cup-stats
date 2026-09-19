import { translateUiText as uiText } from '../../lib/uiText.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import MatchAnalysisSection from '../../components/matches/detail/MatchAnalysisSection.jsx'
import MatchDetailEmptyState from '../../components/matches/detail/MatchDetailEmptyState.jsx'
import MatchDetailFooterNav from '../../components/matches/detail/MatchDetailFooterNav.jsx'
import MatchPosterHero, { PosterBroadcast } from '../../components/matches/detail/MatchPosterHero.jsx'
import MapRecordSection from '../../components/matches/detail/MapRecordSection.jsx'
import SeriesMapRail from '../../components/matches/detail/SeriesMapRail.jsx'
import SignalMatchDetail from '../../components/matches/detail/SignalMatchDetail.jsx'
import styles from '../../components/matches/detail/matchDetailStyles.js'
import { getMatchDossier, getValidMapOrder } from '../../lib/matchDetailSelectors.js'
import { getMySpaceReturnLabel } from '../../lib/mySpaceNavigation.js'
import { getScheduleReturnLabel } from '../../features/match-schedule/schedulePresentation.js'
import { getWeeklyMatchPeriod } from '../../components/matches/detail/matchPhasePresentation.js'
import {
  getRestoreScrollState,
  getRestoreScrollY,
  getReturnState,
  getLocationPath,
  getSavedReturnScroll,
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
    isKprHybridDesign = false,
    locale = 'zh-CN',
    t = (key, fallback) => fallback || key
  } = context
  const { matchId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [searchParams, setSearchParams] = useSearchParams()
  const analysisRef = useRef(null)
  const mapRefs = useRef(new Map())
  const sourceReturnRef = useRef(null)
  const lastScrollMatchRef = useRef(null)
  const lastMapScrollRef = useRef('')
  const [expandedMaps, setExpandedMaps] = useState(() => new Set())
  const [activeAnchor, setActiveAnchor] = useState('overview')
  const [collapseAllRequested, setCollapseAllRequested] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const isEn = locale === 'en-US'

  const dossier = useMemo(
    () => getMatchDossier(db, matchId, { locale }),
    [db, matchId, locale]
  )
  const mapRecords = dossier?.mapRecords || EMPTY_MAP_RECORDS
  const mapOrders = useMemo(() => mapRecords.map(map => map.order), [mapRecords])
  const requestedMap = searchParams.get('map')
  useEffect(() => { setCopyMessage('') }, [matchId, requestedMap])
  const expandAll = searchParams.get('expand') === 'all'
  const defaultMapOrder = getValidMapOrder(dossier, requestedMap)
  const incomingReturnState = readReturnState(location.state, { allowedPrefixes: ['/', '/advance', '/roster', '/staff', '/matches', '/teams', '/players', '/heroes', '/maps', '/me', '/following'] })
  if (incomingReturnState.returnTo) sourceReturnRef.current = incomingReturnState
  const sourceReturnState = sourceReturnRef.current || incomingReturnState
  const returnTo = sourceReturnState.returnTo
  const returnScrollY = sourceReturnState.returnScrollY
  const fallbackReturnTo = returnTo || withSeason('/matches')
  const backLabel = getMySpaceReturnLabel(returnTo, locale) || (isKprHybridDesign ? getScheduleReturnLabel(dossier?.state?.isWeekly ? fallbackReturnTo : returnTo, locale, { weekly: dossier?.state?.isWeekly }) : '') || (returnTo?.startsWith('/teams') ? (isEn ? 'Back to team' : uiText("返回队伍档案", locale))
    : returnTo?.startsWith('/staff/') ? (isEn ? 'Back to staff profile' : uiText('返回职员档案', locale))
    : returnTo?.startsWith('/advance') ? (isEn ? 'Back to advancement' : uiText("返回晋级形势", locale))
    : returnTo?.startsWith('/roster') ? (isEn ? 'Back to roster overview' : uiText("返回阵容总览", locale))
    : returnTo?.startsWith('/maps') ? (isEn ? 'Back to map' : uiText("返回地图档案", locale))
    : returnTo?.startsWith('/heroes') ? (isEn ? 'Back to hero' : uiText("返回英雄档案", locale))
    : /^\/players\/[^/?]+\/analysis(?:\?|$)/.test(returnTo || '') ? (isEn ? 'Back to player analysis' : uiText("返回选手数据", locale))
    : returnTo?.startsWith('/players') ? (isEn ? 'Back to player' : uiText("返回选手档案", locale))
    : /^\/(?:\?|$)/.test(returnTo || '') ? (isEn ? 'Back to overview' : uiText("返回赛事总览", locale)) : t('matchDetail.back', 'Back to Matches'))
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
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
      node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }, 0)
  }, [])

  const scrollToMap = useCallback(order => {
    scrollToNode(mapRefs.current.get(order))
  }, [scrollToNode])

  useEffect(() => {
    if (restoreScrollY !== null) {
      restoreWindowScroll(restoreScrollY)
    } else if (lastScrollMatchRef.current !== matchId) {
      window.scrollTo(0, 0)
    }
    lastScrollMatchRef.current = matchId
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
      setActiveAnchor(requestedMap ? defaultMapOrder || 'overview' : 'overview')
    }
  }, [dossier?.internalId, dossier?.hasMapRecords, mapOrders, expandAll, defaultMapOrder, requestedMap, collapseAllRequested])

  useEffect(() => {
    if (!dossier?.hasMapRecords || !requestedMap) return
    if (String(defaultMapOrder) === String(requestedMap)) return

    const next = new URLSearchParams(searchParams)
    next.set('map', String(defaultMapOrder))
    next.delete('expand')
    setSearchParams(next, { replace: true, state: location.state })
  }, [dossier?.hasMapRecords, requestedMap, defaultMapOrder, searchParams, setSearchParams, location.state])

  useEffect(() => {
    if (!dossier?.hasMapRecords || !requestedMap || !defaultMapOrder) {
      lastMapScrollRef.current = ''
      return
    }
    const request = `${dossier.internalId}:${isKprHybridDesign}:${defaultMapOrder}`
    if (lastMapScrollRef.current === request) return
    lastMapScrollRef.current = request
    if (restoreScrollY !== null) return
    scrollToMap(defaultMapOrder)
  }, [dossier?.internalId, dossier?.hasMapRecords, requestedMap, defaultMapOrder, restoreScrollY, scrollToMap, isKprHybridDesign])

  const handleBack = () => {
    if (returnTo) {
      const restoreState = getRestoreScrollState(returnScrollY)
      const parentReturn = readReturnState({ returnTo: location.state?.parentReturnTo, returnScrollY: location.state?.parentReturnScrollY }, { allowedPrefixes: ['/', '/staff', '/matches', '/teams', '/players', '/leaderboard', '/heroes', '/maps', '/me', '/following'] })
      navigate(returnTo, { state: { ...restoreState, ...(parentReturn.returnTo ? parentReturn : {}) } })
      return
    }
    navigate(withSeason('/matches'))
  }

  const setMapSearch = next => setSearchParams(next, { state: { ...location.state, restoreScrollY: undefined } })

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyMessage(isEn ? 'Link copied' : uiText("链接已复制", locale))
    } catch {
      setCopyMessage(isEn ? 'Copy the link from the address bar.' : uiText("请从地址栏复制当前链接。", locale))
    }
  }

  const handleOverview = () => {
    setCollapseAllRequested(false)
    setActiveAnchor('overview')
    const next = new URLSearchParams(searchParams)
    next.delete('map')
    next.delete('expand')
    if (isKprHybridDesign) { next.delete('compareA'); next.delete('compareB') }
    setMapSearch(next)
    if (!isKprHybridDesign) scrollToNode(analysisRef.current)
  }

  const handleSelectMap = order => {
    setCollapseAllRequested(false)
    setActiveAnchor(order)
    setExpandedMaps(new Set([order]))
    const next = new URLSearchParams(searchParams)
    next.set('map', String(order))
    next.delete('expand')
    setMapSearch(next)
    if (String(requestedMap) === String(order)) scrollToMap(order)
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
    setMapSearch(next)
  }

  const handleCollapseAll = () => {
    setCollapseAllRequested(true)
    setExpandedMaps(new Set())
    setActiveAnchor('overview')
    const next = new URLSearchParams(searchParams)
    next.delete('map')
    next.delete('expand')
    setMapSearch(next)
  }

  if (!dossier) {
    return (
      <div className={styles.shell} data-page-mode="index">
        <div className={styles.statePanel}>
          <h1 className={styles.stateTitle}>{isEn ? 'Match not found' : uiText("找不到这场比赛", locale)}</h1>
          <p className={styles.stateBody}>{isEn ? 'This event has no published record for this match.' : uiText("当前赛事没有这场比赛的公开记录。", locale)} <small>{matchId}</small></p>
          <button type="button" className={styles.posterBack} onClick={handleBack}>
            {t('matchDetail.back', 'Back to Matches')} {'->'}
          </button>
        </div>
      </div>
    )
  }

  const showResultSections = dossier.state.canShowResults && !dossier.state.isForfeit
  const showMaps = !dossier.state.isForfeit && dossier.hasMapRecords
  const roomPath = dossier.roomPath ? withSeason(dossier.roomPath) : null

  if (isKprHybridDesign) return <SignalMatchDetail
    dossier={dossier} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason}
    weeklyPeriod={getWeeklyMatchPeriod(db, dossier.match)} isPreview={db?.meta?.preview === true}
    returnState={currentReturnState} onNavigate={() => saveReturnScroll(location)}
    backLabel={backLabel} onBack={handleBack} roomPath={roomPath} onCopyLink={handleCopyLink} copyMessage={copyMessage}
    activeAnchor={requestedMap ? defaultMapOrder : 'overview'} onSelectMap={handleSelectMap} analysisRef={analysisRef} setMapRef={setMapRef}
    returnTo={fallbackReturnTo} returnScrollY={returnScrollY}
  />

  return (
    <div className={styles.shell} data-page-mode="index">
      <div className={styles.detailToolbar}>
        <button type="button" className={styles.posterBack} onClick={handleBack}>← {backLabel}</button>
        <div className={styles.detailActions}>
          <button type="button" className={styles.textButton} onClick={handleCopyLink}>{isEn ? 'Copy link' : uiText("复制链接", locale)}</button>
          {roomPath && <Link className={styles.roomActionLink} to={roomPath}>{isEn ? 'Match room' : uiText("比赛房间", locale)} ↗</Link>}
        </div>
      </div>
      {copyMessage ? <p className={styles.copyFeedback} role="status">{copyMessage}</p> : null}
      <MatchPosterHero
        dossier={dossier}
        seasonId={seasonId}
        withSeason={withSeason}
        returnState={currentReturnState}
        onTeamNavigate={() => saveReturnScroll(location)}
        t={t}
        locale={locale}
      />
      <SeriesMapRail
        dossier={dossier}
        activeMapOrder={typeof activeAnchor === 'number' ? activeAnchor : 0}
        overviewActive={activeAnchor === 'overview'}
        onOverview={handleOverview}
        onSelectMap={handleSelectMap}
        t={t}
      />

      <PosterBroadcast broadcast={dossier.broadcast} locale={locale} />

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
        backLabel={backLabel}
        locale={locale}
        t={t}
      />
    </div>
  )
}
