import { useState } from 'react'
import { formatInt } from '../../../lib/format.js'
import {
  getHeroAvatarSrc,
  getPlayerInitials,
  getRoleColor,
  getRoleEnLabel
} from '../../../lib/leaderboardSelectors.js'
import {
  formatMapPlayerMatchRating,
  getMapPlayerMatchRating
} from '../../../lib/matchRatingDisplay.js'
import TeamLogo from '../TeamLogo.jsx'
import styles from './MatchDetail.module.css'

const ROLE_SORT_ORDER = {
  TANK: 0,
  DPS: 1,
  SUPPORT: 2
}

const GAME_STAT_COLUMNS = [
  { key: 'eliminations', labelKey: 'matchDetail.eliminations', fallback: 'Eliminations', short: 'E' },
  { key: 'assists', labelKey: 'matchDetail.assists', fallback: 'Assists', short: 'A' },
  { key: 'deaths', labelKey: 'matchDetail.deaths', fallback: 'Deaths', short: 'D' },
  { key: 'damage', labelKey: 'matchDetail.damage', fallback: 'Damage', short: 'DMG' },
  { key: 'healing', labelKey: 'matchDetail.healing', fallback: 'Healing', short: 'HEAL' },
  { key: 'mitigation', labelKey: 'matchDetail.mitigation', fallback: 'Mitigation', short: 'MIT' }
]

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

function makeImpactKey(player, role) {
  const playerKey = normalizeKey(player)
  const roleKey = normalizeKey(role)
  return playerKey && roleKey ? `${playerKey}:${roleKey}` : ''
}

function formatRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}

function getRoleSortValue(role) {
  return ROLE_SORT_ORDER[String(role || '').toUpperCase()] ?? 99
}

function getTeamTotals(rows) {
  return rows.reduce((totals, row) => ({
    eliminations: totals.eliminations + Number(row.eliminations || 0),
    damage: totals.damage + Number(row.damage || 0),
    healing: totals.healing + Number(row.healing || 0),
    mitigation: totals.mitigation + Number(row.mitigation || 0)
  }), { eliminations: 0, damage: 0, healing: 0, mitigation: 0 })
}

function getSummaryTail(totals) {
  if (totals.healing > 0) return `${formatInt(totals.healing, '-')} HEAL`
  if (totals.mitigation > 0) return `${formatInt(totals.mitigation, '-')} MIT`
  return ''
}

function createImpactIndex(rating) {
  const index = new Map()
  const entries = rating?.entries || []
  const participantScores = entries.map(entry => entry.roleScore).filter(score => Number.isFinite(Number(score)))

  entries.forEach((entry, entryIndex) => {
    const rank = entryIndex + 1
    const rawPts = Number(entry.roleScore)
    const matchRating = getMapPlayerMatchRating(rawPts, participantScores)
    const keys = [
      makeImpactKey(entry.player_id, entry.role),
      makeImpactKey(entry.player_name, entry.role),
      makeImpactKey(entry.display_name, entry.role),
      makeImpactKey(entry.nickname, entry.role)
    ].filter(Boolean)

    keys.forEach(key => {
      if (!index.has(key)) {
        index.set(key, {
          entry,
          rank,
          rawPts: Number.isFinite(rawPts) ? rawPts : null,
          matchRating
        })
      }
    })
  })

  return index
}

function getImpactForRow(row, impactIndex) {
  const keys = [
    makeImpactKey(row.playerId, row.role),
    makeImpactKey(row.rawName, row.role),
    makeImpactKey(row.displayName, row.role)
  ].filter(Boolean)

  return keys.map(key => impactIndex.get(key)).find(Boolean) || null
}

function buildDisplayRows(rows, impactIndex) {
  return rows
    .map((row, index) => ({
      row,
      index,
      impact: getImpactForRow(row, impactIndex)
    }))
    .sort((a, b) => {
      const roleDelta = getRoleSortValue(a.row.role) - getRoleSortValue(b.row.role)
      if (roleDelta !== 0) return roleDelta

      return a.index - b.index
    })
}

function getTeamMvpRowKey(displayRows) {
  return displayRows.reduce((best, item) => {
    const rating = Number(item.impact?.matchRating)
    if (!Number.isFinite(rating)) return best
    if (!best || rating > best.rating) return { key: item.row.key, rating }
    return best
  }, null)?.key || ''
}

function PlayerAvatar({ row }) {
  const [failed, setFailed] = useState(false)
  const src = !failed ? getHeroAvatarSrc(row.hero, row.role) : ''
  const initials = getPlayerInitials({
    display_name: row.displayName,
    player_name: row.rawName,
    player_id: row.playerId
  })

  return (
    <span className={styles.heroAvatar}>
      {src ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}
    </span>
  )
}

function RatingCluster({ impact, t, isTeamMvp = false }) {
  if (!impact) {
    return (
      <span
        className={styles.ratingCluster}
        data-empty="true"
        aria-label={t('matchDetail.mapRatingUnavailable', 'Match Rating unavailable')}
      >
        <span className={styles.mvpSlot}>
          {isTeamMvp ? <span className={styles.mvpBadge}>{t('matchDetail.teamMapMvpShort', 'MVP')}</span> : null}
        </span>
        <strong className={styles.ratingValue}>-</strong>
      </span>
    )
  }

  const ratingLabel = t('matchDetail.mapRating', 'Match Rating')
  const rawLabel = t('matchDetail.rawImpactScore', 'Raw Impact Score')
  const note = t('matchDetail.ratingMappedFromImpact', 'Rating is mapped from this map player impact scores.')
  const displayRating = formatMapPlayerMatchRating(impact.matchRating)
  const rawPts = formatRating(impact.rawPts)
  const mvpLabel = t('matchDetail.teamMapMvpShort', 'MVP')
  const mvpNote = t('matchDetail.teamMapMvpNote', 'Team-high map rating based on this map data; not an official MVP award.')
  const title = `${ratingLabel}: ${displayRating}\n${rawLabel}: ${rawPts} PTS\n${note}${isTeamMvp ? `\n${mvpNote}` : ''}`
  const ariaLabel = isTeamMvp
    ? `${mvpLabel}. ${ratingLabel}: ${displayRating}. ${rawLabel}: ${rawPts} PTS. ${mvpNote}`
    : `${ratingLabel}: ${displayRating}. ${rawLabel}: ${rawPts} PTS.`
  const featured = Number(impact.matchRating) >= 8.5

  return (
    <span
      className={styles.ratingCluster}
      data-featured={featured ? 'true' : 'false'}
      data-elite={Number(impact.matchRating) >= 9 ? 'true' : 'false'}
      title={title}
      aria-label={ariaLabel}
    >
      <span className={styles.mvpSlot}>
        {isTeamMvp ? <span className={styles.mvpBadge}>{mvpLabel}</span> : null}
      </span>
      <strong className={styles.ratingValue}>{displayRating}</strong>
    </span>
  )
}

function TeamStatsPanel({ team, sourceTeam, score, rows, rating, impactIndex: providedImpactIndex, seasonId, t }) {
  const totals = getTeamTotals(rows)
  const impactIndex = providedImpactIndex || createImpactIndex(rating)
  const displayRows = buildDisplayRows(rows, impactIndex)
  const teamMvpRowKey = getTeamMvpRowKey(displayRows)
  const tail = getSummaryTail(totals)

  return (
    <section className={styles.teamStatsPanel} aria-label={`${team.short} player stats`}>
      <header className={styles.teamStatsHead}>
        <TeamLogo
          team={sourceTeam}
          seasonId={seasonId}
          teamShortName={team.short}
          teamName={team.full}
          className={styles.teamStatsLogo}
        />
        <div>
          <strong>{team.short}</strong>
          <span>{team.full}</span>
        </div>
        <b>{score}</b>
        <em>{formatInt(totals.eliminations, '-')} E / {formatInt(totals.damage, '-')} DMG{tail ? ` / ${tail}` : ''}</em>
      </header>

      <table className={styles.statsTable}>
        <colgroup>
          <col className={styles.playerMetaCol} />
          <col className={styles.compactStatCol} />
          <col className={styles.compactStatCol} />
          <col className={styles.compactStatCol} />
          <col className={styles.wideStatCol} />
          <col className={styles.wideStatCol} />
          <col className={styles.wideStatCol} />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              title={`${t('matchDetail.role', 'Role')} / ${t('matchDetail.player', 'Player')} / ${t('matchDetail.mapRating', 'Match Rating')}`}
            >
              <span className={styles.playerMetaHead}>
                <span>R</span>
                <span>{t('matchDetail.player', 'Player')}</span>
                <span>{t('matchDetail.ratingShort', 'Rating')}</span>
              </span>
            </th>
            {GAME_STAT_COLUMNS.map(column => (
              <th key={column.key} scope="col" title={t(column.labelKey, column.fallback)}>
                {column.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map(({ row, impact }) => {
            const roleColor = getRoleColor(row.role)

            return (
              <tr key={row.key}>
                <td>
                  <div className={styles.playerMetaCell}>
                    <span className={styles.roleSlot}>
                      <span className={styles.roleLabel} style={{ color: roleColor }}>
                        {getRoleEnLabel(row.role)}
                      </span>
                    </span>
                    <div className={styles.playerIdentity}>
                      <PlayerAvatar row={row} />
                      <span>
                        <span className={styles.playerName}>{row.displayName}</span>
                        {row.battleTag ? <span className={styles.playerSub}>{row.battleTag}</span> : null}
                      </span>
                    </div>
                    <span className={styles.ratingCell}>
                      <RatingCluster impact={impact} t={t} isTeamMvp={row.key === teamMvpRowKey} />
                    </span>
                  </div>
                </td>
                <td>{formatInt(row.eliminations, '-')}</td>
                <td>{formatInt(row.assists, '-')}</td>
                <td>{formatInt(row.deaths, '-')}</td>
                <td>{formatInt(row.damage, '-')}</td>
                <td>{formatInt(row.healing, '-')}</td>
                <td>{formatInt(row.mitigation, '-')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

export default function DualTeamStatsTable({ map, dossier, seasonId, t }) {
  const impactIndex = createImpactIndex(map.rating)

  return (
    <div className={styles.dualStatsScroller}>
      <div className={styles.dualStatsGrid}>
        <TeamStatsPanel
          team={dossier.teamA}
          sourceTeam={dossier.match?.team_a}
          side="A"
          score={map.scoreA}
          rows={map.teamAStats}
          rating={map.rating}
          impactIndex={impactIndex}
          seasonId={seasonId}
          t={t}
        />
        <TeamStatsPanel
          team={dossier.teamB}
          sourceTeam={dossier.match?.team_b}
          side="B"
          score={map.scoreB}
          rows={map.teamBStats}
          rating={map.rating}
          impactIndex={impactIndex}
          seasonId={seasonId}
          t={t}
        />
      </div>
    </div>
  )
}
