import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef, useState } from 'react'
import { Link, isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom'
import { getInitialSeasonId, resolveSeasonFromUrl, withSeason } from '../../config/seasons.js'
import { getStoredLocale } from '../../lib/i18n.js'
import { normalizeReviewLocale } from '../../lib/reviewLocale.js'
import styles from './RouteErrorPage.module.css'

export default function RouteErrorPage({ notFound = false }) {
  const error = useRouteError()
  const location = useLocation()
  const headingRef = useRef(null)
  const [receipt, setReceipt] = useState('')
  const params = new URLSearchParams(location.search)
  const seasonId = resolveSeasonFromUrl(params.get('season')) || getInitialSeasonId()
  const locale = normalizeReviewLocale(params.get('lang'), getStoredLocale())
  const missing = notFound || (isRouteErrorResponse(error) && error.status === 404)
  const roomMatch = /^\/me\/matches\/([^/]+)\/room\/?$/.exec(location.pathname)?.[1]
  const roomCode = roomMatch && !missing ? /dynamically imported module|Loading chunk|Importing a module script|Failed to fetch module/i.test(error?.message || '') ? 'ROOM_ASSET_ERROR' : 'ROOM_ROUTE_ERROR' : null
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
        {roomCode && <p>{roomCode} · {roomMatch}<br />{text(roomCode === 'ROOM_ASSET_ERROR' ? '比赛房脚本未能载入，请重新载入页面获取当前版本。' : '比赛房显示异常，服务器中的比赛记录保留。请重新载入后继续。', 'The room could not be displayed. Saved match records remain on the server. Reload to continue.', '경기 방을 표시할 수 없습니다. 저장된 기록은 서버에 유지됩니다. 새로고침해 주세요.')}</p>}
        <p>{missing
          ? text(uiText("链接可能已变更。你可以回到当前赛事，继续查看赛程与数据。", locale), 'The link may have changed. Return to your event to explore its schedule and data.', '링크가 변경되었을 수 있습니다. 대회로 돌아가 일정과 데이터를 확인하세요.')
          : text(uiText("请重新载入页面，或先返回赛事总览。", locale), 'Reload this page or return to the event overview.', '페이지를 새로고침하거나 대회 개요로 돌아가세요.')}</p>
        <nav aria-label={text(uiText("继续浏览", locale), 'Continue browsing', '계속 탐색')}>
          {!missing ? <button type="button" onClick={() => window.location.reload()}>{text(uiText("重新载入", locale), 'Reload page', '새로고침')}</button> : null}
          {roomCode && <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`Fries Cup / ${roomCode}\nMatch: ${roomMatch}\nTime: ${new Date().toISOString()}`); setReceipt(text('诊断信息已复制。', 'Diagnostics copied.', '진단 정보를 복사했습니다.')) } catch { setReceipt(text('复制失败，请记录诊断编号和比赛链接。', 'Copy failed. Save the diagnostic code and match link.', '복사에 실패했습니다. 진단 코드와 경기 링크를 기록해 주세요.')) } }}>{text('复制诊断信息', 'Copy diagnostics', '진단 정보 복사')}</button>}
          <Link to={withSeason('/', seasonId, location.search)}>{text(uiText("赛事总览", locale), 'Event overview', '대회 개요')}</Link>
          <Link to={withSeason('/matches', seasonId, location.search)}>{text(uiText("赛程赛果", locale), 'Matches', '일정 · 결과')}</Link>
        </nav>
        {receipt && <p role="status">{receipt}</p>}
      </div>
    </main>
  )
}
