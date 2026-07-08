import { useState } from 'react'
import { formatInt, formatPlayerTime } from '../../lib/format.js'
import {
  formatEntrySeasonOvr,
  getEntryMetricValue,
  getHeroAvatarSrc,
  getPlayerInitials,
  getRoleEnLabel,
  getRoleLabel
} from '../../lib/leaderboardSelectors.js'
import { isRoleCoreMetric } from '../../lib/leaderboardScoring.js'
import EligibilityBadge from './EligibilityBadge.jsx'
import { formatLeaderboardStat } from './leaderboardFormat.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

function isSameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function getMetricToneClass(metricId) {
  if (metricId === 'dmg') return styles.metricDamage
  if (metricId === 'heal') return styles.metricHeal
  if (metricId === 'block') return styles.metricBlock
  return ''
}

function getRoleToneClass(role) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'TANK') return styles.roleTank
  if (normalized === 'DPS') return styles.roleDps
  if (normalized === 'SUPPORT' || normalized === 'SUP') return styles.roleSupport
  return ''
}

export function HeroAvatar({ entry, className = '' }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = getHeroAvatarSrc(entry?.most_played_hero, entry?.role)
  const failed = Boolean(src && failedSrc === src)
  const initials = getPlayerInitials(entry)

  return (
    <span className={`${styles.heroAvatar} ${className}`} aria-hidden="true">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  )
}

export function PlayerIdentity({ entry }) {
  const primary = entry?.nickname || entry?.display_name || entry?.player_name || entry?.player_id || '-'
  const secondary = entry?.battleTag || entry?.player_name || ''
  const showSecondary = secondary && !isSameText(primary, secondary)

  return (
    <div className={styles.playerIdentity}>
      <HeroAvatar entry={entry} />
      <div className={styles.playerText}>
        <strong title={primary}>{primary}</strong>
        {showSecondary ? <span title={secondary}>{secondary}</span> : <span>{entry?.player_id || '-'}</span>}
        <em title={entry?.team_name || entry?.team_short_name || ''}>
          {entry?.team_short_name || entry?.team_name || '-'} / {getRoleEnLabel(entry?.role)}
        </em>
      </div>
    </div>
  )
}

export function RoleTag({ entry, locale = 'zh-CN' }) {
  const label = locale === 'en-US' ? getRoleEnLabel(entry.role) : getRoleLabel(entry.role)

  return (
    <span className={`${styles.roleTag} ${getRoleToneClass(entry.role)}`}>
      <span>{label}</span>
      <b>{getRoleEnLabel(entry.role)}</b>
    </span>
  )
}

function DataCell({ entry, column, mode, locale }) {
  if (column.id === 'score') {
    return (
      <td className={`${styles.numericCell} ${styles.scoreCell} ${styles.scoreDataCell}`}>
        {formatEntrySeasonOvr(entry)}
      </td>
    )
  }

  if (column.id === 'team') {
    return (
      <td className={`${styles.textCell} ${styles.teamCell}`}>
        <strong title={entry.team_short_name || entry.team_name || ''}>{entry.team_short_name || '-'}</strong>
        <span title={entry.team_name || ''}>{entry.team_name || '-'}</span>
      </td>
    )
  }

  if (column.id === 'role') {
    return (
      <td className={`${styles.roleCell} ${styles.roleDataCell}`}>
        <RoleTag entry={entry} locale={locale} />
        {!entry.eligible ? <EligibilityBadge eligible={false} /> : null}
      </td>
    )
  }

  if (column.id === 'maps') {
    return <td className={styles.numericCell}>{formatInt(entry.roleMapsPlayed)}</td>
  }

  if (column.id === 'time') {
    return <td className={styles.numericCell}>{formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })}</td>
  }

  if (column.metricId) {
    const metricValue = getEntryMetricValue(entry, column.metricId, mode)
    const hasEntryData = Number(entry.roleTimeMins) > 0 || Number(entry.roleMapsPlayed) > 0 || Number(metricValue) > 0
    const isPriority = hasEntryData && isRoleCoreMetric(entry.role, column.metricId, entry.most_played_hero)
    const metricTone = getMetricToneClass(column.metricId)
    return (
      <td className={`${styles.numericCell} ${metricTone} ${isPriority ? styles.priorityMetric : ''}`}>
        {formatLeaderboardStat(metricValue, mode, column.metricId)}
      </td>
    )
  }

  return <td className={styles.textCell}>-</td>
}

export default function LeaderboardRow({
  entry,
  columns,
  mode,
  rankValue,
  isFavorite,
  isCompareSelected,
  compareDisabled,
  onNavigate,
  onToggleFavorite,
  onToggleCompare,
  locale = 'zh-CN'
}) {
  const rowClass = [
    styles.tableRow,
    isFavorite ? styles.followingRow : '',
    isCompareSelected ? styles.compareSelectedRow : '',
    !entry.eligible ? styles.insufficientRow : ''
  ].filter(Boolean).join(' ')
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id || '-'

  const handleKeyDown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onNavigate(entry)
  }

  return (
    <tr
      className={rowClass}
      tabIndex={0}
      role="link"
      aria-label={`查看 ${playerName} 的选手详情`}
      onClick={() => onNavigate(entry)}
      onKeyDown={handleKeyDown}
    >
      <td className={`${styles.rankCell} ${styles.stickyRank}`}>
        <span className={entry.eligible ? styles.rankBadge : styles.rankMuted}>
          {entry.eligible ? rankValue : '-'}
        </span>
      </td>

      {columns.map(column => {
        if (column.id === 'player') {
          return (
            <td key={column.id} className={`${styles.playerCell} ${styles.stickyPlayer}`}>
              <PlayerIdentity entry={entry} />
              {isFavorite ? <span className={styles.followingPill}>FOLLOWING</span> : null}
            </td>
          )
        }

        return <DataCell key={column.id} entry={entry} column={column} mode={mode} locale={locale} />
      })}

      <td className={styles.actionCell} onClick={event => event.stopPropagation()}>
        <div className={styles.actionGroup}>
          <label
            className={`${styles.compareCheck} ${isCompareSelected ? styles.compareCheckActive : ''} ${compareDisabled ? styles.compareCheckBlocked : ''}`}
            title={compareDisabled ? '仅支持同职责选手比较' : '加入比较'}
          >
            <input
              type="checkbox"
              aria-label={`${isCompareSelected ? '移出比较' : '加入比较'}：${playerName}`}
              checked={isCompareSelected}
              disabled={compareDisabled}
              onChange={event => onToggleCompare(entry, event.target.checked)}
            />
            <span aria-hidden="true">VS</span>
          </label>

          <button
            type="button"
            aria-label={isFavorite ? `取消关注：${playerName}` : `关注选手：${playerName}`}
            title={isFavorite ? '取消关注' : '关注选手'}
            className={`${styles.followButton} ${isFavorite ? styles.followButtonActive : ''}`}
            onClick={onToggleFavorite}
          >
            <span aria-hidden="true">FAV</span>
          </button>
        </div>
      </td>
    </tr>
  )
}
