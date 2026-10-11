import { useMemo } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { pickUiLocale, translateUiText } from '../../lib/uiText.js'
import { weeklyCycleTitle, weeklyPeriodPath } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyOverview } from '../weekly-overview/weeklyOverviewModel.js'
import { formatReportTime, weeklyReportPath } from './weeklyReportPreview.js'
import usePublishedNewspaper from './usePublishedNewspaper.js'
import { ReportCover } from './WeeklyReportTeaser.jsx'
import WeeklyNewspaper from './WeeklyNewspaper.jsx'
import styles from './WeeklyReport.module.css'

export default function WeeklyReportPage() {
  const { db, season, seasonId, locale, withSeason } = useOutletContext()
  const weekly = season?.rules?.weeklyCompetition?.enabled === true || season?.competitionFormat === 'WEEKLY'
  const { weekId } = useParams()
  const [params] = useSearchParams()
  const requestedCycle = params.get('cycle')
  const overview = useMemo(() => buildWeeklyOverview(db, { cycleId: requestedCycle }), [db, requestedCycle])
  const cycleId = requestedCycle || overview.cycle?.id
  const { issue, issues, loading, error } = usePublishedNewspaper({ seasonId, cycleId: weekly ? cycleId : null, weekId, locale }, !weekId)
  // Delayed backfills keep their publication time without moving an earlier week above later weeks.
  const archiveIssues = useMemo(() => [...issues].sort((a, b) => b.report.week.week_number - a.report.week.week_number), [issues])
  const report = issue?.report
  const t = (zh, en) => String(locale).startsWith('en') ? en : translateUiText(zh, locale)
  const home = report ? withSeason(weeklyPeriodPath('/', report.cycle, report.week)) : withSeason('/')
  const archive = withSeason('/reports' + (cycleId ? '?cycle=' + encodeURIComponent(cycleId) : ''))
  if (weekId && issue) return <WeeklyNewspaper report={report} newspaperOverride={issue.newspaper} locale={locale} seasonId={seasonId} withSeason={withSeason} home={home} archive={archive} />
  return <div className={styles.page} data-weekly-report-archive={!weekId || undefined} data-i18n-ignore>
    <nav className={styles.breadcrumbs} aria-label={t('周报导航', 'Report navigation')}><Link to={home}>← {t('赛事总览', 'Event overview')}</Link><Link to={archive}>{t('周报归档', 'Report archive')} →</Link></nav>
    {!weekId && <>
      <header className={styles.archiveHeading}><div><span className={styles.eyebrow}>FRIES CUP / WEEKLY NEWSPAPER</span><h1>{t('薯条周报', 'Fries Cup Weekly')}</h1></div><p>{t('每周赛果、最佳阵容与数据看点。', 'Weekly results, best lineups and data stories.')}</p></header>
      <nav className={styles.cycleLinks} aria-label={t('周报比赛周期', 'Report cycles')}>{overview.cycles.map(cycle => <Link key={cycle.id} to={withSeason('/reports?cycle=' + encodeURIComponent(cycle.id))} aria-current={cycle.id === cycleId ? 'page' : undefined}>{weeklyCycleTitle(cycle, locale)}</Link>)}</nav>
    </>}
    {(loading || error || (weekId ? !issue : !issues.length)) && <section className={styles.unavailable} role={error ? 'alert' : 'status'}>
      <h2>{!weekly ? pickUiLocale(locale, '当前赛事暂无周报', 'No weekly reports for this event', '이 대회에는 주간 신문이 없습니다', '目前賽事暫無週報') : loading ? t('正在读取周报…', 'Loading the issue…') : error ? t('周报暂时无法读取', 'The issue could not be loaded') : t('本期周报尚未出刊', 'This issue has not been published')}</h2>
      <p>{weekly && (error ? t('请稍后刷新重试。', 'Please refresh and retry.') : !loading ? t('每周二 12:00（UTC+8）出刊。', 'Published Tuesdays at 12:00 (UTC+8).') : '')}</p>
      <Link className={styles.textLink} to={home}>{t('返回赛事总览', 'Return to the overview')} →</Link>
    </section>}
    <div className={styles.archiveList}>{archiveIssues.map(item => {
      const published = item.report
      return <article key={published.week.id} className={styles.archiveRow}>
        <Link className={styles.coverLink} to={withSeason(weeklyReportPath(published))}><ReportCover report={published} newspaper={item.newspaper} locale={locale} /></Link>
        <div><div className={styles.issueMeta}><span>{weeklyCycleTitle(published.cycle, locale)} · {t('第 ' + published.week.week_number + ' 周', 'Week ' + published.week.week_number)}</span><span>{formatReportTime(item.publishedAt, locale)}{published.publication?.backfill ? ' · ' + t('补刊', 'Backfilled') : ''}</span></div><h2><Link to={withSeason(weeklyReportPath(published))}>{item.newspaper.lead?.title}</Link></h2><p>{t(translateUiText('{0} 场比赛 · {1} 图赛果 · {2} 名选手', locale, [published.completed.length, published.maps.length, published.playerCount]), published.completed.length + ' matches · ' + published.maps.length + ' maps · ' + published.playerCount + ' players')}</p></div>
        <Link className={styles.textLink} to={withSeason(weeklyReportPath(published))}>{t('阅读周报', 'Read issue')}<span aria-hidden="true">→</span></Link>
      </article>
    })}</div>
  </div>
}
