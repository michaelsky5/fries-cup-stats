import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatInt } from '../../../lib/format.js'
import {
  getHeroAvatarSrc,
  getPlayerInitials,
  getRoleColor,
  getRoleEnLabel
} from '../../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../../lib/heroes.js'
import RoleLeaderRow from './RoleLeaderRow.jsx'
import styles from './MatchDetail.module.css'

const ROLE_KEYS = ['TANK', 'DPS', 'SUPPORT']

function formatRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}

function getEntryName(entry) {
  return entry?.display_name || entry?.nickname || entry?.player_name || entry?.player_id || '-'
}

function PerformerAvatar({ entry }) {
  const [failed, setFailed] = useState(false)
  const src = !failed ? getHeroAvatarSrc(entry?.most_played_hero, entry?.role) : ''
  const initials = getPlayerInitials(entry)

  return (
    <span className={styles.performerAvatar}>
      {src ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}
    </span>
  )
}

export default function MatchPerformancePanel({ dossier, withSeason, locale = 'zh-CN', t }) {
  const top = dossier.topRatedPlayer
  const roleLeaders = dossier.roleLeaders || {}

  if (!dossier.rating?.supported || !top) {
    return (
      <section className={styles.performancePanel}>
        <header className={styles.analysisSubhead}>
          <span>{t('matchDetail.performanceKicker', 'Performance Rating')}</span>
          <strong>{t('matchDetail.dataPerformance', 'Data Performance')}</strong>
        </header>
        <div className={styles.emptyText}>{t('matchDetail.noRating', 'Current stats are not sufficient for reliable data ratings.')}</div>
      </section>
    )
  }

  const roleColor = getRoleColor(top.role)
  const coreStats = (top.coreStats || []).filter(stat => Number(stat.value) > 0).slice(0, 2)
  const playerPath = top.player_id ? withSeason(`/players/${encodeURIComponent(top.player_id)}?role=${encodeURIComponent(top.role)}`) : ''

  return (
    <section className={styles.performancePanel} aria-labelledby="match-performance-title">
      <header className={styles.analysisSubhead}>
        <span>{t('matchDetail.performanceKicker', 'Performance Rating')}</span>
        <strong id="match-performance-title">{t('matchDetail.dataPerformance', 'Data Performance')}</strong>
      </header>

      <div className={styles.topPerformer}>
        <PerformerAvatar entry={top} />
        <div className={styles.topPerformerMain}>
          <span className={styles.performanceKicker}>{t('matchDetail.topRatedPlayer', 'Top Rated Player')}</span>
          <strong>{getEntryName(top)}</strong>
          <em>{top.battleTag || top.player_name} / {top.team_short_name || top.team_name}</em>
          <span className={styles.roleLabel} style={{ color: roleColor }}>{getRoleEnLabel(top.role)}</span>
        </div>
        <div className={styles.topPerformerScore}>
          <b>{formatRating(top.roleScore)}</b>
          <span>PTS</span>
        </div>
      </div>

      <div className={styles.performanceStats}>
        {coreStats.map(stat => (
          <span key={stat.metricId}>{stat.label} {formatInt(stat.value, '-')}</span>
        ))}
        {top.most_played_hero ? <span>{formatOwHeroName(top.most_played_hero, locale)}</span> : null}
      </div>

      {playerPath ? (
        <Link className={styles.playerLink} to={playerPath}>
          {t('matchDetail.viewPlayer', 'View Player')} {'->'}
        </Link>
      ) : null}

      <div className={styles.roleLeaderList} aria-label={t('matchDetail.roleLeaders', 'Role Leaders')}>
        {ROLE_KEYS.map(role => <RoleLeaderRow key={role} role={role} entry={roleLeaders[role]} />)}
      </div>

      <p className={styles.performanceNote}>
        {t('matchDetail.ratingNote', 'Ratings are generated from match stats for reference.')}
      </p>
    </section>
  )
}
