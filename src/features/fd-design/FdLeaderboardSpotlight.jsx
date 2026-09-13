import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import DataMvpPanel from '../../components/leaderboard/DataMvpPanel.jsx'
import { formatDecimal, formatInt, formatPlayerTime } from '../../lib/format.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatEntrySeasonOvr, getEntryMetricValue, getEntrySeasonScoreMeta, getRoleLabel, getRoleEnLabel } from '../../lib/leaderboardSelectors.js'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import styles from './leaderboardStyles.js'

export default function FdLeaderboardSpotlight({ entry, withSeason, locale = 'zh-CN' }) {
  if (!entry) return <DataMvpPanel entry={entry} withSeason={withSeason} locale={locale} />
  const isEn = locale === 'en-US'
  const name = entry.nickname || entry.display_name || entry.player_name || entry.player_id
  const role = isEn ? getRoleEnLabel(entry.role) : uiText(getRoleLabel(entry.role), locale)
  const metrics = getRoleCoreMetricIds(entry.role, entry.most_played_hero).slice(0, 2)
  const hero = entry.most_played_hero

  return (
    <Link to={withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)} className={styles.spotlightPanel} aria-label={isEn ? `View ${name}` : uiText("查看 {0} 的选手详情", locale, [name])}>
      <div className={styles.spotlightTopline}>
        <span><b>01</b>{isEn ? 'SEASON LEADER' : uiText("榜首表现", locale)}</span>
        <em>{isEn ? 'Season OVR · reference only' : uiText("赛季 OVR · 仅供参考", locale)}</em>
      </div>
      <div className={styles.spotlightStage}>
        <HeroArtwork hero={hero} variant="spotlight" className={styles.spotlightArt} priority decorative locale={locale} />
        <div className={styles.spotlightIdentity}>
          <span>{role} / {entry.team_short_name || entry.team_name || '—'}</span>
          <h2>{name}</h2>
          <p>{entry.battleTag || entry.player_name || entry.player_id}</p>
          <em>{isEn ? 'MOST PLAYED' : uiText("常用英雄", locale)} / {formatOwHeroName(hero, locale) || '—'}</em>
        </div>
        <aside className={styles.spotlightDossier}>
          <span className={styles.spotlightDossierLabel}>{isEn ? 'PLAYER / SEASON DOSSIER' : uiText("选手 / 赛季档案", locale)}</span>
          <div className={styles.spotlightScore}>
            <span>{isEn ? 'SEASON OVR' : uiText("赛季 OVR", locale)}</span>
            <strong>{formatEntrySeasonOvr(entry)}</strong>
            <em>{getEntrySeasonScoreMeta(entry, locale) || role}</em>
          </div>
          <div className={styles.spotlightMetrics}>
            {metrics.map(id => {
              const metric = PUBLIC_METRICS.find(item => item.id === id)
              return <div key={id}><span>{isEn ? metric?.short : uiText(metric?.label, locale)}</span><strong>{formatDecimal(getEntryMetricValue(entry, id, 'per10'), 1, '—')}</strong><em>{isEn ? 'PER 10 MIN' : uiText("每 10 分钟", locale)}</em></div>
            })}
          </div>
          <dl className={styles.spotlightLedger}>
            <div><dt>{isEn ? 'Maps played' : uiText("出场地图", locale)}</dt><dd>{formatInt(entry.roleMapsPlayed)}</dd></div>
            <div><dt>{isEn ? 'Playtime' : uiText("出场时间", locale)}</dt><dd>{formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })}</dd></div>
          </dl>
          <span className={styles.spotlightCta}>{isEn ? 'OPEN PLAYER DOSSIER' : uiText("打开选手档案", locale)}<b aria-hidden="true">↗</b></span>
        </aside>
      </div>
    </Link>
  )
}
