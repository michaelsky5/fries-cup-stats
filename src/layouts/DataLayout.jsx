import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_SEASON_ID,
  SEASONS,
  getInitialSeasonId,
  getSeasonById,
  getSeasonSearch,
  resolveSeasonFromUrl,
  seasonHasReview,
  setStoredSeasonId,
  withSeason as buildSeasonLink
} from '../config/seasons.js'
import { createTranslator, getStoredLocale, setStoredLocale } from '../lib/i18n.js'
import { getDb, isLocalDbFallback, refreshDb } from '../lib/db.js'
import { formatUpdatedAt } from '../lib/format.js'
import { getGlobalSummary } from '../lib/selectors.js'
import { getSeasonStatus } from '../lib/homeSelectors.js'
import { buildFriesCupTitle, getDataCenterPageLabel } from '../lib/pageTitle.js'
import { FavoritesProvider, normalizeSeasonId, useFavorites } from '../features/favorites/index.js'
import EventContextBar from '../components/layout/EventContextBar.jsx'
import { useLocaleDomTranslation } from '../hooks/useLocaleDomTranslation.js'
import styles from './DataLayout.module.css'

const PRIMARY_NAV = [
  { to: '/', cn: '赛事总览', en: 'OVERVIEW', end: true, group: 'overview' },
  { to: '/matches', cn: '赛程赛果', en: 'MATCHES', group: 'matches' },
  { to: '/advance', cn: '晋级形势', en: 'ADVANCE', group: 'advance' },
  { to: '/teams', cn: '参赛阵容', en: 'ROSTER', group: 'roster' },
  { to: '/leaderboard', cn: '数据排行', en: 'STATS', group: 'database' },
  { to: '/following', cn: '我的关注', en: 'FOLLOWING', group: 'following' }
]

const DATA_REFRESH_INTERVAL_MS = 60_000
const FALLBACK_REFRESH_INTERVAL_MS = 15_000

function setMetaContent(selector, attributes, content) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value))
    document.head.append(node)
  }
  node.setAttribute('content', content)
}

function getNavActiveGroup(pathname, search = '') {
  const params = new URLSearchParams(search)
  const matchTab = String(params.get('tab') || '').toLowerCase()
  const isFollowingView = params.get('following') === '1' || matchTab === 'following'

  if (pathname === '/') return 'overview'
  if (pathname.startsWith('/following')) return 'following'
  if (pathname.startsWith('/matches') || pathname.startsWith('/schedule')) return isFollowingView ? 'following' : 'matches'
  if (pathname.startsWith('/advance') || pathname.startsWith('/standings')) return 'advance'
  if (pathname.startsWith('/teams') || pathname.startsWith('/players') || pathname.startsWith('/staff') || pathname.startsWith('/roster')) return 'roster'
  if (pathname.startsWith('/leaderboard') || pathname.startsWith('/heroes') || pathname.startsWith('/maps')) return 'database'
  return ''
}

function PortalNavItem({ item, activeGroup, locale, to }) {
  const label = locale === 'en-US' ? item.en : item.cn

  return (
    <NavLink
      to={to}
      end={item.end}
      className={() => [
        styles.navLink,
        activeGroup === item.group ? styles.navLinkActive : ''
      ].filter(Boolean).join(' ')}
    >
      <span className={styles.navLabel}>{label}</span>
    </NavLink>
  )
}

function MobileNavItem({ item, activeGroup, locale, to }) {
  const label = locale === 'en-US' ? item.en : item.cn

  return (
    <NavLink
      to={to}
      end={item.end}
      className={() => [
        styles.mobileNavLink,
        activeGroup === item.group ? styles.mobileNavLinkActive : ''
      ].filter(Boolean).join(' ')}
    >
      <span>{label}</span>
      <em>{item.en}</em>
    </NavLink>
  )
}

export default function DataLayout() {
  const shellRef = useRef(null)
  const [seasonId, setSeasonId] = useState(() => getInitialSeasonId())
  const [locale, setLocale] = useState(() => getStoredLocale())
  const [db, setDb] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const t = useMemo(() => createTranslator(locale), [locale])
  const season = useMemo(() => getSeasonById(seasonId), [seasonId])
  const canonicalSeasonId = normalizeSeasonId(season?.publicCode || seasonId)
  const favoritesApi = useFavorites(canonicalSeasonId, db)

  useEffect(() => {
    let alive = true

    setIsLoading(true)
    setIsUsingFallback(false)
    setError('')

    getDb(seasonId)
      .then(data => {
        if (!alive) return
        const fallback = isLocalDbFallback(data)
        setDb(data)
        setIsUsingFallback(fallback)
        setError('')
        setIsLoading(false)

        if (!fallback) {
          refreshDb(seasonId)
            .then(refreshedData => {
              if (!alive) return
              setDb(current => current === refreshedData ? current : refreshedData)
              setIsUsingFallback(isLocalDbFallback(refreshedData))
            })
            .catch(() => {
              // The cached snapshot remains usable when a silent version check fails.
            })
        }
      })
      .catch(() => {
        if (!alive) return
        setDb(null)
        setIsUsingFallback(false)
        setError('DATA_LOAD_FAILED')
        setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [seasonId])

  useEffect(() => {
    let alive = true
    let requestInFlight = false
    let keepSyncing = isUsingFallback

    const refreshPublishedData = () => {
      if (document.visibilityState === 'hidden' || requestInFlight) return

      requestInFlight = true
      refreshDb(seasonId)
        .then(data => {
          if (!alive) return
          keepSyncing = isLocalDbFallback(data)
          setDb(current => current === data ? current : data)
          setIsUsingFallback(keepSyncing)
          setError('')
        })
        .catch(() => {
          // Keep the last valid public snapshot on screen when a background refresh fails.
        })
        .finally(() => {
          requestInFlight = false
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPublishedData()
    }

    if (isUsingFallback) refreshPublishedData()
    const interval = globalThis.setInterval(
      refreshPublishedData,
      isUsingFallback ? FALLBACK_REFRESH_INTERVAL_MS : DATA_REFRESH_INTERVAL_MS
    )
    globalThis.addEventListener('focus', refreshPublishedData)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      alive = false
      requestInFlight = false
      globalThis.clearInterval(interval)
      globalThis.removeEventListener('focus', refreshPublishedData)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isUsingFallback, seasonId])

  const visibleDb = isLoading ? null : db
  const summary = getGlobalSummary(visibleDb)
  const seasonStatus = getSeasonStatus(visibleDb, season)
  // Keep routine refreshes invisible while the current snapshot remains usable.
  // Only initial loading and local-fallback recovery need a visible sync state.
  const isSyncing = isLoading || isUsingFallback
  const updatedAtText = isSyncing
    ? t('layout.meta.loading')
    : formatUpdatedAt(summary.updatedAt, t('layout.meta.empty'))
  const reviewAvailable = seasonHasReview(season, db)
  const activeGroup = getNavActiveGroup(location.pathname, location.search)
  const activeNavItem = PRIMARY_NAV.find(item => item.group === activeGroup) || PRIMARY_NAV[0]
  const activeNavLabel = locale === 'en-US' ? activeNavItem.en : activeNavItem.cn
  const withSeason = useMemo(
    () => path => buildSeasonLink(path, seasonId, location.search),
    [seasonId, location.search]
  )

  useLocaleDomTranslation(locale, shellRef)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    const partnerTitle = season?.kind === 'PARTNER'
      ? (locale === 'en-US' ? season?.name?.en : season?.name?.zh)
      : undefined
    const pageLabel = getDataCenterPageLabel(location.pathname, location.search)
    const title = buildFriesCupTitle(pageLabel, partnerTitle)
    const eventName = locale === 'en-US' ? season?.name?.en : season?.name?.zh
    const description = locale === 'en-US'
      ? `${eventName || 'Fries Cup'} schedule, standings, teams, players, and match data.`
      : `${eventName || '赛事'}赛程赛果、晋级形势、战队阵容与比赛数据。`

    document.title = title
    setMetaContent('meta[name="description"]', { name: 'description' }, description)
    setMetaContent('meta[property="og:title"]', { property: 'og:title' }, title)
    setMetaContent('meta[property="og:description"]', { property: 'og:description' }, description)
    setMetaContent('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Fries Cup Data Center')
    setMetaContent('meta[name="twitter:title"]', { name: 'twitter:title' }, title)
    setMetaContent('meta[name="twitter:description"]', { name: 'twitter:description' }, description)
  }, [location.pathname, location.search, locale, season])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('season')) return

    const resolvedSeasonId = resolveSeasonFromUrl(params.get('season')) || DEFAULT_SEASON_ID
    if (resolvedSeasonId === seasonId) return

    setDb(null)
    setError('')
    setIsLoading(true)
    setIsUsingFallback(false)
    setSeasonId(resolvedSeasonId)

    if (resolveSeasonFromUrl(params.get('season'))) {
      setStoredSeasonId(resolvedSeasonId)
    }
  }, [location.search, seasonId])

  const handleSeasonChange = eventOrSeasonId => {
    const rawSeasonId = eventOrSeasonId?.target ? eventOrSeasonId.target.value : eventOrSeasonId
    const nextSeasonId = getSeasonById(rawSeasonId).id
    if (nextSeasonId === seasonId) return
    setDb(null)
    setError('')
    setIsLoading(true)
    setIsUsingFallback(false)
    setStoredSeasonId(nextSeasonId)
    setSeasonId(nextSeasonId)
    const baseSearch = location.pathname === '/matches' || location.pathname === '/advance' || location.pathname === '/standings'
      ? ''
      : location.search
    const nextSearch = getSeasonSearch(baseSearch, nextSeasonId)
    navigate({
      pathname: location.pathname,
      search: nextSearch,
      hash: location.hash
    })
  }

  const handleLocaleChange = nextLocale => {
    setStoredLocale(nextLocale)
    setLocale(nextLocale)
  }

  const outletContext = {
    db,
    season,
    seasonId,
    canonicalSeasonId,
    locale,
    t,
    updatedAtText,
    reviewAvailable,
    withSeason,
    favorites: favoritesApi.favorites,
    toggleTeamFavorite: favoritesApi.toggleTeamFavorite,
    togglePlayerFavorite: favoritesApi.togglePlayerFavorite,
    setPrimaryTeamFavorite: favoritesApi.setPrimaryTeamFavorite,
    saveFavorites: favoritesApi.saveFavorites,
    isFavoriteTeam: favoritesApi.isFavoriteTeam,
    isPrimaryFavoriteTeam: favoritesApi.isPrimaryFavoriteTeam,
    isFavoritePlayer: favoritesApi.isFavoritePlayer,
    favoriteLimits: favoritesApi.favoriteLimits
  }

  return (
    <div className={styles.shell} ref={shellRef} data-locale={locale}>
      <header className={styles.topShell}>
        <div className={styles.topBar}>
          <a href="https://fries-cup.com/" className={styles.brandLink} aria-label="FriesCup official site">
            <span className={styles.brandEventMark} aria-hidden="true">
              <img src="/logos/fc_logo.svg" alt="" />
            </span>
            <span className={styles.brandWordMark} aria-hidden="true">
              <img src="/logos/fc_data_center.svg" alt="" />
            </span>
          </a>

          <nav className={styles.nav} aria-label="Data center navigation">
            {PRIMARY_NAV.map(item => (
              <PortalNavItem
                key={item.group}
                item={item}
                activeGroup={activeGroup}
                locale={locale}
                to={buildSeasonLink(item.to, seasonId, '')}
              />
            ))}
          </nav>

          <details className={styles.mobileNavMenu}>
            <summary>
              <span>{activeNavLabel}</span>
              <b>MENU</b>
            </summary>
            <nav className={styles.mobileNavPanel} aria-label="Mobile data center navigation">
              {PRIMARY_NAV.map(item => (
                <MobileNavItem
                  key={item.group}
                  item={item}
                  activeGroup={activeGroup}
                  locale={locale}
                  to={buildSeasonLink(item.to, seasonId, '')}
                />
              ))}
            </nav>
          </details>

          <div className={styles.headerRight}>
            <div className={styles.languageSwitch} aria-label="Language">
              <button
                type="button"
                onClick={() => handleLocaleChange('zh-CN')}
                className={locale === 'zh-CN' ? styles.languageActive : ''}
              >
                ZH
              </button>
              <span className={styles.languageDivider}>/</span>
              <button
                type="button"
                onClick={() => handleLocaleChange('en-US')}
                className={locale === 'en-US' ? styles.languageActive : ''}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        <EventContextBar
          season={season}
          seasonId={seasonId}
          locale={locale}
          seasons={SEASONS}
          updatedAtText={updatedAtText}
          seasonStatus={seasonStatus}
          activeSummary={summary}
          isSyncing={isSyncing}
          onSeasonChange={handleSeasonChange}
        />
      </header>

      <div className={styles.pageFrame}>
        <main className={styles.main} aria-busy={isLoading ? 'true' : 'false'}>
          {isLoading ? (
            <div className={`${styles.systemBox} ${styles.syncBox}`} role="status" aria-live="polite">
              <span className={styles.syncKicker}>LIVE DATA SYNC</span>
              <div className={styles.syncMark} aria-hidden="true"><span /></div>
              <strong className={styles.syncTitle}>{t('layout.state.loading')}</strong>
              <p className={styles.syncDescription}>
                {t('layout.state.loadingDesc', '正在核对最新发布版本、赛程、赛果与晋级状态，请稍候。')}
              </p>
              <div
                className={styles.syncProgress}
                role="progressbar"
                aria-label={t('layout.state.loadingProgress', '赛事数据同步进度')}
              >
                <span />
              </div>
              <small>{locale === 'en-US' ? season?.name?.en : season?.name?.zh}</small>
            </div>
          ) : error ? (
            <div className={`${styles.systemBox} ${styles.errorBox}`}>
              <div className={styles.errorTitle}>{t('layout.state.error')}</div>
              <div className={styles.errorText}>
                {error === 'DATA_LOAD_FAILED'
                  ? t('layout.state.errorDesc', '赛事数据暂时无法载入，请稍后刷新重试。')
                  : error}
              </div>
            </div>
          ) : (
            <FavoritesProvider value={outletContext}>
              <>
                {isUsingFallback ? (
                  <div className={styles.fallbackSyncNotice} role="status" aria-live="polite">
                    <span>{t('layout.state.fallbackKicker', 'LIVE DATA SYNC')}</span>
                    <strong>{t('layout.state.fallbackTitle', '正在同步最新发布数据')}</strong>
                    <p>{t('layout.state.fallbackDesc', '当前暂时显示上次可用快照；同步完成后页面会自动更新。')}</p>
                    <i aria-hidden="true"><span /></i>
                  </div>
                ) : null}
                <Outlet context={outletContext} />
              </>
            </FavoritesProvider>
          )}
        </main>
      </div>
    </div>
  )
}
