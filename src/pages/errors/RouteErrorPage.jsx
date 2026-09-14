import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import { Link, isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom'
import { getInitialSeasonId, resolveSeasonFromUrl, withSeason } from '../../config/seasons.js'
import { getStoredLocale } from '../../lib/i18n.js'
import { normalizeReviewLocale } from '../../lib/reviewLocale.js'
import styles from './RouteErrorPage.module.css'

export default function RouteErrorPage({ notFound = false }) {
  const error = useRouteError()
  const location = useLocation()
  const headingRef = useRef(null)
  const params = new URLSearchParams(location.search)
  const seasonId = resolveSeasonFromUrl(params.get('season')) || getInitialSeasonId()
  const locale = normalizeReviewLocale(params.get('lang'), getStoredLocale())
  const missing = notFound || (isRouteErrorResponse(error) && error.status === 404)
  const text = (zh, en, ko) => locale === 'ko-KR' ? ko : locale === 'en-US' ? en : uiText(zh, locale)
  const title = missing
    ? text('这个页面不存在', 'Page not found', '페이지를 찾을 수 없습니다')
    : text('页面暂时无法载入', 'This page could not be loaded', '페이지를 불러올 수 없습니다')

  useEffect(() => {
    document.title = `${title} | Fries Cup`
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    headingRef.current?.focus()
  }, [title])

  return (
    <main className={styles.shell} lang={locale}>
      <div className={styles.panel}>
        <span className={styles.brand}>FRIES CUP EVENT CENTER</span>
        <span className={styles.code}>{missing ? '404' : 'UNAVAILABLE'}</span>
        <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
        <p>{missing
          ? text(uiText("链接可能已变更。你可以回到当前赛事，继续查看赛程与数据。", locale), 'The link may have changed. Return to your event to explore its schedule and data.', '링크가 변경되었을 수 있습니다. 대회로 돌아가 일정과 데이터를 확인하세요.')
          : text(uiText("请重新载入页面，或先返回赛事总览。", locale), 'Reload this page or return to the event overview.', '페이지를 새로고침하거나 대회 개요로 돌아가세요.')}</p>
        <nav aria-label={text(uiText("继续浏览", locale), 'Continue browsing', '계속 탐색')}>
          {!missing ? <button type="button" onClick={() => window.location.reload()}>{text(uiText("重新载入", locale), 'Reload page', '새로고침')}</button> : null}
          <Link to={withSeason('/', seasonId, location.search)}>{text(uiText("赛事总览", locale), 'Event overview', '대회 개요')}</Link>
          <Link to={withSeason('/matches', seasonId, location.search)}>{text(uiText("赛程赛果", locale), 'Matches', '일정 · 결과')}</Link>
        </nav>
      </div>
    </main>
  )
}
