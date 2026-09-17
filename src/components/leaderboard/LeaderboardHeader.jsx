import { translateUiText as uiText } from '../../lib/uiText.js'
import { LEADERBOARD_TABS } from '../../lib/leaderboardSelectors.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

function getSeasonName(season, locale) {
  if (!season?.name) return season?.publicCode || '-'
  return locale === 'en-US' ? season.name.en : uiText(season.name.zh, locale)
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
  const tabLabel = locale === 'en-US' ? currentTab.en : uiText(currentTab.label, locale)
  const seasonCode = season?.publicCode || season?.id || 'FCA2026'
  const isEn = locale === 'en-US'

  return (
    <section className={styles.pageHeader} aria-labelledby="leaderboard-title">
      <div className={styles.headerMain}>
        <div className={styles.sectionLabel}>{isEn ? 'STATS / LEADERBOARD' : uiText("赛事数据排行", locale)}</div>
        <div className={styles.headerSeason}>{seasonCode}</div>
        <h1 id="leaderboard-title">{isEn ? 'Leaderboard' : uiText("数据排行", locale)}</h1>
        <p>
          {isEn
            ? 'Track Season OVR, role rankings, and player stat leaders from published match records.'
            : uiText("查看赛季 OVR、职责排行与选手表现榜单，以公开赛事统计为准。", locale)}
        </p>
        <div className={styles.headerRuleLine} aria-hidden="true" />
      </div>

      <div className={styles.headerFacts} aria-label={isEn ? 'Leaderboard overview' : uiText("排行榜概览", locale)}>
        <div>
          <span>{isEn ? 'Eligible Entries' : uiText("合格条目", locale)}</span>
          <strong>{summary.qualifiedEntries}</strong>
          <em>{isEn ? 'Qualified' : uiText("达标", locale)}</em>
        </div>
        <div>
          <span>{isEn ? 'Players' : uiText("全部选手", locale)}</span>
          <strong>{summary.totalPlayers}</strong>
          <em>{isEn ? 'Players' : uiText("名录", locale)}</em>
        </div>
        <div>
          <span>{isEn ? 'Minimum Time' : uiText("排名门槛", locale)}</span>
          <strong>{summary.sampleRequirements.formal.minutes}m</strong>
          <em>{isEn ? `${summary.sampleRequirements.formal.maps} maps · ${summary.sampleRequirements.formal.matches} matches` : uiText("{0} 图 · {1} 场", locale, [summary.sampleRequirements.formal.maps, summary.sampleRequirements.formal.matches])}</em>
        </div>
        <div>
          <span>{isEn ? 'Metric Mode' : uiText("统计口径", locale)}</span>
          <strong>{modeLabel}</strong>
          <em>{isEn ? 'Mode' : uiText("口径", locale)}</em>
        </div>
      </div>

      <div className={styles.eventMetaStrip} aria-label={isEn ? 'Current leaderboard status' : uiText("当前排行榜状态", locale)}>
        <span>
          <b>{isEn ? 'Event' : uiText("当前赛事", locale)}</b>
          {getSeasonName(season, locale)}
        </span>
        <span>
          <b>{isEn ? 'Season' : uiText("赛季版本", locale)}</b>
          {seasonCode}
        </span>
        <span>
          <b>{isEn ? 'Updated' : uiText("更新时间", locale)}</b>
          {updatedAtText || '-'}
        </span>
        <span>
          <b>{isEn ? 'Entries' : uiText("排行范围", locale)}</b>
          {summary.qualifiedEntries} / {summary.totalEntries}
        </span>
        <span>
          <b>{isEn ? 'Board' : uiText("当前榜单", locale)}</b>
          {tabLabel} / {modeLabel}
        </span>
      </div>
    </section>
  )
}
