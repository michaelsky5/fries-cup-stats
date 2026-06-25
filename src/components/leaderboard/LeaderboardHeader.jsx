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

  return (
    <section className={styles.pageHeader} aria-labelledby="leaderboard-title">
      <div className={styles.headerMain}>
        <div className={styles.sectionLabel}>DATA / LEADERBOARD</div>
        <div className={styles.headerSeason}>{seasonCode}</div>
        <h1 id="leaderboard-title">数据排行</h1>
        <p>查看综合评分、职责排行与选手数据表现，以公开赛事统计为准。</p>
        <div className={styles.headerRuleLine} aria-hidden="true" />
      </div>

      <div className={styles.headerFacts} aria-label="排行榜概览">
        <div>
          <span>合格条目</span>
          <strong>{summary.qualifiedEntries}</strong>
          <em>QUALIFIED</em>
        </div>
        <div>
          <span>全部选手</span>
          <strong>{summary.totalPlayers}</strong>
          <em>PLAYERS</em>
        </div>
        <div>
          <span>排名门槛</span>
          <strong>{summary.minTimeMins}m</strong>
          <em>MIN TIME</em>
        </div>
        <div>
          <span>统计口径</span>
          <strong>{modeLabel}</strong>
          <em>MODE</em>
        </div>
      </div>

      <div className={styles.eventMetaStrip} aria-label="当前数据状态">
        <span>
          <b>CURRENT EVENT</b>
          {getSeasonName(season, locale)}
        </span>
        <span>
          <b>DATA VERSION</b>
          {seasonCode}
        </span>
        <span>
          <b>UPDATED</b>
          {updatedAtText || '-'}
        </span>
        <span>
          <b>RANGE</b>
          {summary.qualifiedEntries} / {summary.totalEntries}
        </span>
        <span>
          <b>BOARD</b>
          {tabLabel} / {modeLabel}
        </span>
      </div>
    </section>
  )
}
