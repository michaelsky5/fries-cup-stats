import { Link } from 'react-router-dom'
import { pickUiLocale, translateUiText } from '../../lib/uiText.js'
import { getWeeklyPhaseLabel } from '../../lib/weeklyMatchIdentity.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import { weeklyCycleTitle, weeklyPeriodPath } from '../weekly-overview/weeklyPresentation.js'
import { weeklyReportPath, newspaperIssueStamp, newspaperIssueTitle, newspaperTeamName, newspaperWeekLabel } from './weeklyReportPresentation.js'
import styles from './WeeklyReport.module.css'

const copy = (locale, zh, en) => String(locale).startsWith('en') ? en : translateUiText(zh, locale)

export function ReportCover({ report, newspaper: publishedPaper, locale }) {
  const newspaper=publishedPaper || report.newspaper
  if (!newspaper) return null
  return <div className={styles.paperCover} aria-hidden="true">
    <div className={styles.paperCoverTop}>FRIES CUP / WEEKLY NEWSPAPER <span>{newspaperIssueStamp(report,locale).value}</span></div>
    <strong className={styles.paperCoverName}><img src="/logos/fries-cup-mark-ink.svg" alt=""/>{copy(locale,'薯条周报','THE WEEKLY')}</strong>
    <span className={styles.paperCoverIssue}>{weeklyCycleTitle(report.cycle,locale)} / {newspaperWeekLabel(report.week,locale)}</span>
    <b className={styles.paperCoverHeadline}>{newspaper.lead?.title||copy(locale,'本周赛果待确认','Confirmed results pending')}</b>
    <div className={styles.paperCoverColumns}><p>{newspaper.lead?.visualNote||copy(locale,'本周赛果待确认','Confirmed results pending')}</p><p>{copy(locale,translateUiText('{0} 支队伍 · {1} 名选手',locale,[report.teamCount,report.playerCount]),`${report.teamCount} teams · ${report.playerCount} players`)}</p></div>
    <div className={styles.paperCoverFoot}>{report.completed.length} {copy(locale,'场对阵','matches')} · {report.maps.length} {copy(locale,'张地图','maps')}<span>{copy(locale,'可保存 PDF / 图片','PDF / IMAGES')}</span></div>
  </div>
}

export function WeeklyReportQuickLink({ report, locale, withSeason }) {
  if (!report?.completed.length) return null
  const title = newspaperIssueTitle(report.week, locale)
  return <Link className={styles.reportQuickLink} data-weekly-report-quick-link to={withSeason(weeklyReportPath(report))} aria-label={pickUiLocale(locale, `阅读${title}`, `Read ${title}`, `${title} 읽기`, `閱讀${title}`)}>
    {title}<span aria-hidden="true">→</span>
  </Link>
}

function ReportPreviewCover({ report, newspaper, locale }) {
  const lead = newspaper.lead
  const image = lead?.image
  const lineup = (report.awards?.bestFive || []).flatMap(slot => slot.player ? [slot.player] : [])
  return <div className={styles.previewCover} aria-hidden="true">
    <div className={styles.previewCoverSheet}>
    <div className={styles.previewCoverBrand}><img src="/logos/fries-cup-mark-ink.svg" alt="" /><span>FRIES CUP<small>{copy(locale, '薯条周报', 'THE WEEKLY')}</small></span><b data-edition={newspaperIssueStamp(report, locale).edition}>{newspaperIssueStamp(report, locale).value}</b></div>
    <div className={styles.previewCoverIssue}>{weeklyCycleTitle(report.cycle, locale)} · {newspaperWeekLabel(report.week, locale)}</div>
    <b className={styles.previewCoverHeadline}>{lead?.title}</b>
    {image?.map_name && <img className={styles.previewCoverPhoto} src={getMapImage(image.map_type, image.map_name)} alt="" />}
    {lead && <div className={styles.previewCoverResult}><span>{lead.scoreOrder[0]}</span><strong>{lead.displayScores.join(':')}</strong><span>{lead.scoreOrder[1]}</span></div>}
    {lineup.length > 0 && <div className={styles.previewCoverLineup}>{lineup.map(player => <img key={player.id} src={getHeroImage(player.hero, player.role)} alt="" />)}</div>}
    <div className={styles.previewCoverFoot}>{copy(locale, '赛果 · 阵容 · 数据', 'RESULTS · LINEUPS · DATA')}</div>
    </div>
  </div>
}

function ReportPreviewHighlight({ report, story, locale }) {
  const mvps = report.awards?.mvp || []
  const mvp = mvps.length === 1 ? mvps[0] : null
  const t = (zh, en) => copy(locale, zh, en)
  if (mvps.length) return <div className={styles.previewHighlight} data-report-preview-mvp={mvps.map(player => player.id).join(',')}>
    {mvp && <img src={getHeroImage(mvp.hero, mvp.role)} alt="" />}
    <div><span>{mvps.length > 1 ? t('并列 MVP', 'Joint MVP') : t('本周 MVP', 'Weekly MVP')}</span><strong>{mvps.map(player => player.name).join(' / ')}</strong>{mvp && <small>{mvp.teams.map(newspaperTeamName).join(' / ')}</small>}</div>
  </div>
  if (!story) return null
  return <div className={styles.previewHighlight}><div><span>{story.headline}</span><strong>{story.name}</strong><small>{story.stats.map(stat => `${stat.label} ${new Intl.NumberFormat(locale).format(stat.value)}`).join(' · ')}</small></div></div>
}

export function WeeklyReportTeaser({ cycle, week, report: providedReport, compact = false, locale, withSeason }) {
  const report = providedReport
  const newspaper = report?.newspaper
  if (!report?.completed?.length) return null
  const t = (zh, en) => copy(locale, zh, en)
  const story = newspaper.dataStories.cards[0]
  const issueTitle = newspaperIssueTitle(report.week, locale)
  const openLabel = pickUiLocale(locale, `打开${issueTitle}`, `Open ${issueTitle}`, `${issueTitle} 열기`, `打開${issueTitle}`)
  if (compact) return <section className={`${styles.teaser} ${styles.compactTeaser}`} aria-labelledby="weekly-report-heading" data-weekly-report-teaser data-report-week={report.week.id} data-i18n-ignore>
    <div className={styles.compactBody}>
      <Link className={`${styles.coverLink} ${styles.previewCoverLink}`} to={withSeason(weeklyReportPath(report))} aria-label={openLabel}><ReportPreviewCover report={report} newspaper={newspaper} locale={locale} /></Link>
      <div className={styles.compactCopy}>
        <div className={styles.teaserLabel}><div className={styles.previewHeading}><h2 id="weekly-report-heading">{issueTitle}</h2></div><Link to={withSeason(`/reports?cycle=${encodeURIComponent(report.cycle.id)}`)}>{t('周报归档', 'Report archive')}<span aria-hidden="true">→</span></Link></div>
        <h3>{newspaper.lead?.title || t('本周赛果待确认', 'Confirmed results pending')}</h3>{newspaper.lead?.visualNote && <p>{newspaper.lead.visualNote}</p>}
        <div className={styles.previewActions}><ReportPreviewHighlight report={report} story={story} locale={locale} /><Link className={styles.primaryLink} to={withSeason(weeklyReportPath(report))}>{t('阅读周报', 'Read issue')}<span aria-hidden="true">→</span></Link></div>
      </div>
    </div>
  </section>
  const storySummary = story
    ? story.editorialHook === 'number-echo' ? story.headline : `${story.headline} · ${story.name} / ${story.stats.map(stat => `${stat.label} ${new Intl.NumberFormat(locale).format(stat.value)}`).join(' · ')}`
    : t('本周赛果与选手数据。', 'Results and player statistics.')
  return <section className={styles.teaser} aria-labelledby="weekly-report-heading" data-weekly-report-teaser data-i18n-ignore>
    <div className={styles.teaserLabel}><h2 id="weekly-report-heading">{t('周报', 'Weekly report')}<small>THE WEEK, IN PRINT.</small></h2><Link to={withSeason(`/reports?cycle=${encodeURIComponent(cycle.id)}`)}>{t('周报归档', 'Report archive')}<span aria-hidden="true">→</span></Link></div>
    <div className={styles.teaserBody}>
      <Link className={styles.coverLink} to={withSeason(weeklyReportPath(report))} aria-label={openLabel}><ReportCover report={report} locale={locale} /></Link>
      <div className={styles.teaserCopy}>
        <div className={styles.issueMeta}><span>{weeklyCycleTitle(cycle, locale)} · {newspaperWeekLabel(week, locale)}</span></div>
        <h3>{newspaper.lead?.title||t('本周赛果待确认', 'Confirmed results pending')}</h3>
        <p>{storySummary}</p>
        <div className={styles.teaserFacts}>
          <span><strong>{report.completed.length}</strong>{t('场比赛', 'matches')}</span><span><strong>{report.maps.length}</strong>{t('图赛果', 'played maps')}</span><span><strong>{report.playerCount}</strong>{t('名选手', 'players')}</span>
        </div>
        <div className={styles.teaserFoot}><span>{t('保存 PDF 或图片', 'Save PDF or image')}</span><Link className={styles.primaryLink} to={withSeason(weeklyReportPath(report))}>{t('阅读周报', 'Read issue')}<span aria-hidden="true">→</span></Link></div>
      </div>
    </div>
  </section>
}

export function WeeklyEventPathway({ cycle, week, locale, withSeason, supportPath = null }) {
  const t = (zh, en) => copy(locale, zh, en)
  const stages = [
    ['01', getWeeklyPhaseLabel('REGULAR', locale), t('五局累计赛段积分', 'Five maps, cycle points')],
    ['02', getWeeklyPhaseLabel('PLAYOFFS', locale), t('四强单败', 'Four-team single elimination')],
    ['03', getWeeklyPhaseLabel('MAJOR', locale), t('赛制与名额见赛事说明', 'See the event guide for format and places')]
  ]
  return <footer className={styles.pathway} aria-labelledby="weekly-pathway-title" data-weekly-pathway data-i18n-ignore>
    <div className={styles.pathwayHeading}><h2 id="weekly-pathway-title">{t('赛事路径', 'The competition path')}</h2><Link to={withSeason(weeklyPeriodPath('/advance', cycle, week))}>{t('查看晋级形势', 'Explore advancement')}<span aria-hidden="true">→</span></Link></div>
    <ol className={styles.pathwayStages}>{stages.map(([number, title, description], index) => <li key={number}><span className={styles.stageNumber}>{number}</span><div><b>{title}</b><small>{description}</small></div>{index < 2 && <span className={styles.stageArrow} aria-hidden="true">→</span>}</li>)}</ol>
    <p>{t('晋级名额与日期，以当期公示为准。', 'Qualification places and dates follow the current announcement.')}</p>
    {supportPath && <Link className={styles.pathwaySupport} data-weekly-support-entry to={supportPath}>
      <span><b>{pickUiLocale(locale, '支持周赛', 'Support the weekly', '주간 대회 후원', '支持週賽')}</b><small>{pickUiLocale(locale, '钱用在哪、奖池多少、约定直播兑现了几场，都公开在这里。', 'Where the money goes, the prize pools and the agreed broadcasts, all published.', '자금 사용처, 상금, 약정 중계 현황을 모두 공개합니다.', '錢用在哪、獎池多少、約定直播兌現了幾場，都公開在這裡。')}</small></span>
      <span>{pickUiLocale(locale, '周赛支持与资金进度', 'Weekly support & funding', '주간 대회 후원 및 자금 현황', '週賽支持與資金進度')} <i aria-hidden="true">→</i></span>
    </Link>}
  </footer>
}
