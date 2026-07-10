import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatInt } from '../../../lib/format.js'
import {
  getHeroAvatarSrc,
  getPlayerInitials,
  getRoleColor,
  getRoleEnLabel,
  getRoleLabel
} from '../../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../../lib/heroes.js'
import RoleLeaderRow from './RoleLeaderRow.jsx'
import styles from './MatchDetail.module.css'

const ROLE_KEYS = ['TANK', 'DPS', 'SUPPORT']

function formatRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}

function formatTenPointRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? (num / 10).toFixed(1) : '-'
}

function formatMinutes(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '-'

  const totalMinutes = Math.round(num)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getEntryName(entry) {
  return entry?.display_name || entry?.nickname || entry?.player_name || entry?.player_id || '-'
}

function getPerformanceStats(entry, coreStats, locale) {
  const isEn = locale === 'en-US'
  const items = [
    Number(entry?.maps_played) > 0
      ? { key: 'maps', label: isEn ? 'MAPS' : '地图', value: formatInt(entry.maps_played, '-') }
      : null,
    Number(entry?.roleTimeMins) > 0
      ? { key: 'time', label: isEn ? 'TIME' : '时长', value: formatMinutes(entry.roleTimeMins) }
      : null,
    ...coreStats.map(stat => ({
      key: stat.metricId,
      label: stat.label,
      value: formatInt(stat.value, '-')
    })),
    entry?.most_played_hero
      ? { key: 'hero', label: isEn ? 'MAIN HERO' : '主用英雄', value: formatOwHeroName(entry.most_played_hero, locale) }
      : null
  ]

  return items.filter(Boolean)
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
  const topRoleLabel = locale === 'en-US' ? getRoleEnLabel(top.role) : getRoleLabel(top.role)
  const coreStats = (top.coreStats || []).filter(stat => Number(stat.value) > 0).slice(0, 2)
  const performanceStats = getPerformanceStats(top, coreStats, locale)
  const playerPath = top.player_id ? withSeason(`/players/${encodeURIComponent(top.player_id)}?role=${encodeURIComponent(top.role)}`) : ''
  const rawRating = formatRating(top.roleScore)

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
          <span className={styles.roleLabel} style={{ color: roleColor }}>{topRoleLabel}</span>
        </div>
        <div
          className={styles.topPerformerScore}
          title={locale === 'en-US' ? `Raw rating ${rawRating} / 100` : `原始评分 ${rawRating} / 100`}
          aria-label={locale === 'en-US' ? `${formatTenPointRating(top.roleScore)} out of 10` : `${formatTenPointRating(top.roleScore)} 十分制`}
        >
          <b>{formatTenPointRating(top.roleScore)}</b>
          <span>{locale === 'en-US' ? 'RATING / 10' : '评分 / 10'}</span>
        </div>
      </div>

      <div className={styles.performanceStats}>
        {performanceStats.map(stat => (
          <span key={stat.key}>
            <b>{stat.label}</b>
            <strong>{stat.value}</strong>
          </span>
        ))}
      </div>

      {playerPath ? (
        <Link className={styles.playerLink} to={playerPath}>
          {t('matchDetail.viewPlayer', 'View Player')} {'->'}
        </Link>
      ) : null}

      <div className={styles.roleLeaderList} aria-label={t('matchDetail.roleLeaders', 'Role Leaders')}>
        {ROLE_KEYS.map(role => <RoleLeaderRow key={role} role={role} entry={roleLeaders[role]} locale={locale} />)}
      </div>

      <p className={styles.performanceNote}>
        {t('matchDetail.ratingNote', 'Ratings are generated from match stats for reference.')}
      </p>
    </section>
  )
}
