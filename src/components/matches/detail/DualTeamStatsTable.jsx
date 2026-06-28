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

const AWARD_DEFINITIONS = {
  eliminations: { labelKey: 'matchDetail.awardTopEliminations', fallback: '最高击杀' },
  assists: { labelKey: 'matchDetail.awardTopAssists', fallback: '最高助攻' },
  damage: { labelKey: 'matchDetail.awardTopDamage', fallback: '最高伤害' },
  healing: { labelKey: 'matchDetail.awardTopHealing', fallback: '最高治疗' },
  mitigation: { labelKey: 'matchDetail.awardTopMitigation', fallback: '最高阻挡' },
  rating: { labelKey: 'matchDetail.awardTopRating', fallback: '最高评分' }
}

const ROLE_AWARD_PRIORITY = {
  TANK: ['mitigation', 'damage', 'eliminations', 'assists', 'healing'],
  DPS: ['damage', 'eliminations', 'assists', 'mitigation', 'healing'],
  DAMAGE: ['damage', 'eliminations', 'assists', 'mitigation', 'healing'],
  SUPPORT: ['healing', 'assists', 'damage', 'eliminations', 'mitigation'],
  SUP: ['healing', 'assists', 'damage', 'eliminations', 'mitigation']
}

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

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
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

function getDisplayedMatchRating(entry, rawPts, participantScores) {
  const modelMapRating = Number(entry?.mapRating)
  if (Number.isFinite(modelMapRating)) return modelMapRating
  return getMapPlayerMatchRating(rawPts, participantScores)
}

function createImpactIndex(rating) {
  const index = new Map()
  const entries = rating?.entries || []
  const participantScores = entries.map(entry => entry.roleScore).filter(score => Number.isFinite(Number(score)))

  entries.forEach((entry, entryIndex) => {
    const rank = entryIndex + 1
    const rawPts = Number(entry.roleScore)
    const matchRating = getDisplayedMatchRating(entry, rawPts, participantScores)
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

function getTopRatingRowKeys(displayRows) {
  const best = displayRows.reduce((current, item) => {
    const rating = Number(item.impact?.matchRating)
    if (!Number.isFinite(rating)) return current
    if (!current || rating > current.rating) return { rating }
    return current
  }, null)

  if (!best || best.rating <= 0) {
    return new Set()
  }

  return new Set(
    displayRows
      .filter(item => Number(item.impact?.matchRating) === best.rating)
      .map(item => item.row.key)
  )
}

function createAwardIndex(displayRows) {
  const metricKeys = ['eliminations', 'assists', 'damage', 'healing', 'mitigation']
  const topRatingRowKeys = getTopRatingRowKeys(displayRows)
  const maxByMetric = metricKeys.reduce((acc, key) => {
    acc[key] = Math.max(...displayRows.map(item => toNumber(item.row[key])), 0)
    return acc
  }, {})

  return displayRows.reduce((acc, item) => {
    const role = String(item.row.role || '').toUpperCase()
    const priority = ROLE_AWARD_PRIORITY[role] || metricKeys
    const metric = priority.find(key => maxByMetric[key] > 0 && toNumber(item.row[key]) === maxByMetric[key])
    const isTopRating = topRatingRowKeys.has(item.row.key)
    const awardKey = metric || (isTopRating ? 'rating' : '')

    if (awardKey) {
      acc.set(item.row.key, {
        ...AWARD_DEFINITIONS[awardKey],
        primary: isTopRating
      })
    }

    return acc
  }, new Map())
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

function AwardBadge({ award, t }) {
  if (!award) {
    return <span className={styles.awardEmpty} aria-hidden="true"></span>
  }

  return (
    <span className={styles.awardBadge} data-primary={award.primary ? 'true' : 'false'}>
      {t(award.labelKey, award.fallback)}
    </span>
  )
}

function RatingCluster({ impact, t }) {
  if (!impact) {
    return (
      <span
        className={styles.ratingCluster}
        data-empty="true"
        aria-label={t('matchDetail.mapRatingUnavailable', 'Match Rating unavailable')}
      >
        <strong className={styles.ratingValue}>-</strong>
      </span>
    )
  }

  const ratingLabel = t('matchDetail.mapRating', 'Match Rating')
  const rawLabel = t('matchDetail.rawImpactScore', 'Base Rating Score')
  const note = t('matchDetail.ratingMappedFromImpact', 'Rating is generated from player performance metrics on this map.')
  const displayRating = formatMapPlayerMatchRating(impact.matchRating)
  const rawPts = formatRating(impact.rawPts)
  const title = `${ratingLabel}: ${displayRating}\n${rawLabel}: ${rawPts} PTS\n${note}`
  const ariaLabel = `${ratingLabel}: ${displayRating}. ${rawLabel}: ${rawPts} PTS.`
  const featured = Number(impact.matchRating) >= 8.5

  return (
    <span
      className={styles.ratingCluster}
      data-featured={featured ? 'true' : 'false'}
      data-elite={Number(impact.matchRating) >= 9 ? 'true' : 'false'}
      title={title}
      aria-label={ariaLabel}
    >
      <strong className={styles.ratingValue}>{displayRating}</strong>
    </span>
  )
}

function TeamStatsPanel({ team, sourceTeam, score, rows, displayRows, awardIndex, seasonId, t, winner = false }) {
  const totals = getTeamTotals(rows)
  const tail = getSummaryTail(totals)

  return (
    <section className={styles.teamStatsPanel} aria-label={`${team.short} player stats`}>
      <header className={styles.teamStatsHead} data-winner={winner ? 'true' : 'false'}>
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
                <span>{t('matchDetail.highlightShort', 'Highlight')}</span>
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
                    <span className={styles.awardCell}>
                      <AwardBadge award={awardIndex.get(row.key)} t={t} />
                    </span>
                    <span className={styles.ratingCell}>
                      <RatingCluster impact={impact} t={t} />
                    </span>
                  </div>
                </td>
                {GAME_STAT_COLUMNS.map(column => (
                  <td key={column.key} data-label={column.short}>
                    {formatInt(row[column.key], '-')}
                  </td>
                ))}
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
  const teamADisplayRows = buildDisplayRows(map.teamAStats, impactIndex)
  const teamBDisplayRows = buildDisplayRows(map.teamBStats, impactIndex)
  const awardIndex = createAwardIndex([...teamADisplayRows, ...teamBDisplayRows])

  return (
    <div className={styles.dualStatsScroller}>
      <div className={styles.dualStatsGrid}>
        <TeamStatsPanel
          team={dossier.teamA}
          sourceTeam={dossier.match?.team_a}
          side="A"
          score={map.scoreA}
          rows={map.teamAStats}
          displayRows={teamADisplayRows}
          awardIndex={awardIndex}
          seasonId={seasonId}
          t={t}
          winner={map.winnerSide === 'A'}
        />
        <TeamStatsPanel
          team={dossier.teamB}
          sourceTeam={dossier.match?.team_b}
          side="B"
          score={map.scoreB}
          rows={map.teamBStats}
          displayRows={teamBDisplayRows}
          awardIndex={awardIndex}
          seasonId={seasonId}
          t={t}
          winner={map.winnerSide === 'B'}
        />
      </div>
    </div>
  )
}
