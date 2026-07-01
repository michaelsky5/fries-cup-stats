import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  DEFAULT_SEASON_ID,
  getInitialSeasonId,
  getSeasonById,
  resolveSeasonFromUrl,
  setStoredSeasonId,
  withSeason as buildSeasonLink
} from '../../config/seasons.js'
import { getStoredLocale } from '../../lib/i18n.js'
import { getDb } from '../../lib/db.js'
import { useLocaleDomTranslation } from '../../hooks/useLocaleDomTranslation.js'
import styles from './ManagerNextPage.module.css'

export default function ManagerNextStandaloneLayout() {
  const shellRef = useRef(null)
  const location = useLocation()
  const [seasonId, setSeasonId] = useState(() => getInitialSeasonId())
  const [locale] = useState(() => getStoredLocale())
  const [db, setDb] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const season = useMemo(() => getSeasonById(seasonId), [seasonId])
  const withSeason = useMemo(
    () => path => buildSeasonLink(path, seasonId, location.search),
    [seasonId, location.search]
  )

  useLocaleDomTranslation(locale, shellRef)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    let alive = true
    setIsLoading(true)

    getDb(seasonId)
      .then(data => {
        if (!alive) return
        setDb(data)
        setError('')
      })
      .catch(err => {
        if (!alive) return
        setDb(null)
        setError(err?.message || 'DATA_LOAD_FAILED')
      })
      .finally(() => {
        if (!alive) return
        setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [seasonId])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('season')) return

    const resolvedSeasonId = resolveSeasonFromUrl(params.get('season')) || DEFAULT_SEASON_ID
    if (resolvedSeasonId === seasonId) return

    setDb(null)
    setError('')
    setSeasonId(resolvedSeasonId)

    if (resolveSeasonFromUrl(params.get('season'))) {
      setStoredSeasonId(resolvedSeasonId)
    }
  }, [location.search, seasonId])

  const outletContext = {
    db,
    season,
    seasonId,
    canonicalSeasonId: season?.publicCode || seasonId,
    locale,
    withSeason
  }

  return (
    <div className={styles.standaloneRoot} ref={shellRef} data-locale={locale}>
      {isLoading ? (
        <div className={styles.bootScreen}>
          <div className={styles.bootCard}>
            <span>FM NEXT</span>
            <strong>电竞经理加载中</strong>
            <i aria-hidden="true" />
          </div>
        </div>
      ) : error ? (
        <div className={styles.bootScreen}>
          <div className={styles.bootCard}>
            <span>DATA LINK LOST</span>
            <strong>赛事数据载入失败</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <Outlet context={outletContext} />
      )}
    </div>
  )
}
