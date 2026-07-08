import { LEADERBOARD_TABS } from '../../lib/leaderboardSelectors.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

function getSeasonName(season, locale) {
  if (!season?.name) return season?.publicCode || '-'
  return locale === 'en-US' ? season.name.en : season.name.zh
}

export default function LeaderboardHeader({
  summary,
  modeLabel,
  season,
  updatedAtText,
  activeTab = 'overall',
  locale = 'zh-CN'
}) {
  const currentTab = LEADERBOARD_TABS.find(item => item.id === activeTab) || LEADERBOARD_TABS[0]
  const tabLabel = locale === 'en-US' ? currentTab.en : currentTab.label
  const seasonCode = season?.publicCode || season?.id || 'FCA2026'
  const isEn = locale === 'en-US'

  return (
    <section className={styles.pageHeader} aria-labelledby="leaderboard-title">
      <div className={styles.headerMain}>
        <div className={styles.sectionLabel}>{isEn ? 'STATS / LEADERBOARD' : '赛事数据排行'}</div>
        <div className={styles.headerSeason}>{seasonCode}</div>
        <h1 id="leaderboard-title">{isEn ? 'Leaderboard' : '数据排行'}</h1>
        <p>
          {isEn
            ? 'Track Season OVR, role rankings, and player stat leaders from published match records.'
            : '查看赛季 OVR、职责排行与选手表现榜单，以公开赛事统计为准。'}
        </p>
        <div className={styles.headerRuleLine} aria-hidden="true" />
      </div>

      <div className={styles.headerFacts} aria-label={isEn ? 'Leaderboard overview' : '排行榜概览'}>
        <div>
          <span>{isEn ? 'Eligible Entries' : '合格条目'}</span>
          <strong>{summary.qualifiedEntries}</strong>
          <em>{isEn ? 'Qualified' : '达标'}</em>
        </div>
        <div>
          <span>{isEn ? 'Players' : '全部选手'}</span>
          <strong>{summary.totalPlayers}</strong>
          <em>{isEn ? 'Players' : '名录'}</em>
        </div>
        <div>
          <span>{isEn ? 'Minimum Time' : '排名门槛'}</span>
          <strong>{summary.minTimeMins}m</strong>
          <em>{isEn ? 'Min Time' : '最低时长'}</em>
        </div>
        <div>
          <span>{isEn ? 'Metric Mode' : '统计口径'}</span>
          <strong>{modeLabel}</strong>
          <em>{isEn ? 'Mode' : '口径'}</em>
        </div>
      </div>

      <div className={styles.eventMetaStrip} aria-label={isEn ? 'Current leaderboard status' : '当前排行榜状态'}>
        <span>
          <b>{isEn ? 'Event' : '当前赛事'}</b>
          {getSeasonName(season, locale)}
        </span>
        <span>
          <b>{isEn ? 'Season' : '赛季版本'}</b>
          {seasonCode}
        </span>
        <span>
          <b>{isEn ? 'Updated' : '更新时间'}</b>
          {updatedAtText || '-'}
        </span>
        <span>
          <b>{isEn ? 'Entries' : '排行范围'}</b>
          {summary.qualifiedEntries} / {summary.totalEntries}
        </span>
        <span>
          <b>{isEn ? 'Board' : '当前榜单'}</b>
          {tabLabel} / {modeLabel}
        </span>
      </div>
    </section>
  )
}
