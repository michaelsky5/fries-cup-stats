import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
// The full center is in a WeChat subpackage; the legacy entry remains usable.
import Taro, { useDidShow, useLoad, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro'
import ScheduleRuntimeBoundary from '../../shared/ScheduleRuntimeBoundary'
import { checkPublicConnection, readPublicSchedule, followingStorage, switchCenter, takeCenterVisit, scrollToTop, finishPullDownRefresh, storedSeasonId } from '../../platform'
import { getSeasonById, isWeeklySeason } from '../../shared/publicSeasons'
import { formatRequestDiagnostic } from '../../shared/publicScheduleReader'
import { initialSelection, reconcileSelection } from '../../shared/model'
import { createBrowseState, updateBrowseState } from '../../shared/browseState'
import { centerShare } from '../../shared/centerRoutes'
import { routeView } from '../../shared/centerModel'
import { emptyFollowing, readFollowing, toggleFollowing,saveFollowing } from '../../shared/followingStore'
import { centerEntryUrl, publicPageKind, decodePublicOptions } from '../../shared/centerPaths'

import { subscribeLocale, getActiveLocale, activateLocale } from '../../shared/nativeLocales'
import { protectPublicIdentities } from '../../shared/nativeCopy'

function ScheduleContents({Render,pageKind}) {
  const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, getActiveLocale)
  const [params, setParams] = useState({})
  const [view, setView] = useState('overview')
  const [following, setFollowing] = useState(emptyFollowing)
  const [storageError, setStorageError] = useState('')
  const [loaded, setLoaded] = useState(null)
  const [selection, setSelection] = useState(null)
  const [browseState, setBrowseState] = useState(createBrowseState)
  const [error, setError] = useState('')
  const [requestDetail, setRequestDetail] = useState('')
  const [connectionDetail, setConnectionDetail] = useState('')
  const [navigationError, setNavigationError] = useState('')
  const [loading, setLoading] = useState(true)
  const generation = useRef(0)
  const selectionRef = useRef(null)
  const seasonRef = useRef('FCW26')
  function selectSelection(update) {
    const next = typeof update === 'function' ? update(selectionRef.current) : update
    selectionRef.current = next
    setSelection(next)
  }
  async function refresh(force = false, requestParams = params) {
    const own = ++generation.current
    setLoading(true)
    setError('')
    setRequestDetail('')
    setConnectionDetail('')
    try {
      const season = getSeasonById(requestParams.season || seasonRef.current)
      const request = readPublicSchedule(force, season.id)
      const cached = await readPublicSchedule.cached(season.id)
      if (own === generation.current && cached && !selectionRef.current) {
        const cachedSelection = { ...(isWeeklySeason(season) ? initialSelection(cached.data, requestParams) : { query: '', teamId: '', status: 'all' }), seasonId: season.id }
        protectPublicIdentities(cached.data)
        setLoaded(cached)
        selectSelection(cachedSelection)
      }
      const next = await request
      if (own !== generation.current) return
      // Compute inside this try block. A functional React state updater runs
      // during rendering, where an unsupported built-in escapes this catch.
      const nextSelection = { ...(isWeeklySeason(season) ? selectionRef.current ? reconcileSelection(next.data, selectionRef.current) : initialSelection(next.data, requestParams) : selectionRef.current || { query: '', teamId: '', status: 'all' }), seasonId: season.id }
      protectPublicIdentities(next.data)
      setLoaded(next)
      selectSelection(nextSelection)
    } catch (failure) {
      if (own === generation.current) {
        setError(failure.code ? failure.message : '赛事记录暂时无法显示，请重新读取。')
        setRequestDetail(formatRequestDiagnostic(failure.diagnostic))
      }
    }
    finally { if (own === generation.current) { setLoading(false); finishPullDownRefresh() } }
  }
  // React can render before Taro's global router has been populated on a phone.
  // The page's onLoad options are the stable source of query parameters.
  useLoad(options => {
    const incoming = decodePublicOptions(options)
    activateLocale(incoming.lang)
    const oldShare = !incoming.season && ['id', 'team', 'player', 'cycle', 'week'].some(key => incoming[key])
    const nextParams = { ...incoming, season: getSeasonById(incoming.season || (oldShare ? 'FCW26' : storedSeasonId())).id }
    if(publicPageKind(nextParams)!==pageKind){Taro.redirectTo({url:centerEntryUrl(nextParams)}).catch(()=>setNavigationError('页面切换失败，请重试。'));return}
    seasonRef.current = nextParams.season
    const stored = readFollowing(followingStorage, seasonRef.current)
    setFollowing(stored.data)
    setStorageError(stored.error)
    setParams(nextParams)
    setView(routeView(nextParams))
    return refresh(false, nextParams)
  })
  useDidShow(() => {
    const visit = takeCenterVisit()
    if (visit) {
      setView(visit.view)
      setNavigationError('')
      scrollToTop()
    }
    const stored = readFollowing(followingStorage, seasonRef.current)
    setFollowing(stored.data)
    setStorageError(stored.error)
  })
  useEffect(() => () => { generation.current += 1 }, [])
  usePullDownRefresh(() => refresh(true))
  useShareAppMessage(() => centerShare(loaded?.data, view, params, selection || {}))
  async function checkConnection() {
    if (connectionDetail === '正在检测连接…') return
    const own = generation.current
    setConnectionDetail('正在检测连接…')
    const next = await checkPublicConnection()
    if (own === generation.current) setConnectionDetail(next)
  }
  function follow(kind, id) {
    // Storage writes are synchronous; read the latest successful write so rapid
    // taps on different subjects cannot overwrite each other's saved following.
    const latest = readFollowing(followingStorage, seasonRef.current)
    const result = toggleFollowing(followingStorage, latest.error ? following : latest.data, kind, id)
    setFollowing(result.data)
    setStorageError(result.error)
  }
  function publicRoute(patch) {
    const safe = Object.fromEntries(['role', 'section', 'mapOrder', 'scene', 'topic','directory','dossierView','filters','returnTo','cycle','week'].filter(key => Object.prototype.hasOwnProperty.call(patch, key)).map(key => [key, patch[key]]))
    setParams(current => ({ ...current, ...safe }))
  }
  async function saveFavorites(next) {
    const result=saveFollowing(followingStorage,following,{teams:next.favoriteTeamIds,players:next.favoritePlayerIds,primaryTeamId:next.primaryTeamId})
    setFollowing(result.data);setStorageError(result.error)
    if(result.error)throw new Error(result.error)
  }
  async function navigate(nextView) {
    setNavigationError('')
    try {
      if (publicPageKind({view:nextView,season:seasonRef.current})!==pageKind || ['id', 'team', 'player', 'map', 'hero', 'staff', 'story'].some(key => params[key])) await switchCenter(nextView, selection)
      else { setView(nextView); await scrollToTop() }
    } catch (_) { setNavigationError('页面切换失败，请重试。') }
  }
  return <Render locale={locale} raw={loaded?.data} fetchedAt={loaded?.fetchedAt || 0} selection={selection} onSelection={selectSelection} {...{ params, view, following, storageError, browseState, navigationError }} onSaveFavorites={saveFavorites} onBrowseState={(key, patch) => setBrowseState(current => updateBrowseState(current, key, patch))} onFollow={follow} onNavigate={navigate} onPublicRoute={publicRoute} loading={loading} error={error} requestDetail={requestDetail} connectionDetail={connectionDetail} onCheckConnection={process.env.TARO_ENV === 'weapp' ? checkConnection : undefined} stale={loaded?.stale || false} onRetry={() => refresh(true)} />
}

export default function PublicPage({Render,pageKind='center'}) {
  return <ScheduleRuntimeBoundary><ScheduleContents Render={Render} pageKind={pageKind}/></ScheduleRuntimeBoundary>
}
