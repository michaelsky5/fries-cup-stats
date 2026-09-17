import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatOwHeroNames } from '../../lib/heroes.js'
import { getRosterRoleLabel } from '../../lib/rosterSelectors.js'
import styles from './RosterComponents.module.css'

const ROLE_COLORS = {
  TANK: '#3978C5',
  DPS: '#CC4944',
  SUP: '#3F9369',
  FLEX: '#2a2a2a'
}

function displayRole(role, locale) {
  return getRosterRoleLabel(role, locale)
}

function cleanLabel(value) {
  return String(value || '').trim()
}

function getTeamTagLabel(player) {
  const shortName = cleanLabel(player.teamShortName || player.team_short_name)
  const fullName = cleanLabel(player.teamFullName || player.team_name)

  if (shortName && shortName !== '-') return shortName
  if (fullName && fullName !== '-') return fullName
  return cleanLabel(player.teamRouteId || player.team_id) || 'TEAM'
}

export function PlayerAvatar({ avatar, name, className = '' }) {
  const [index, setIndex] = useState(0)
  const candidates = avatar?.type === 'hero' ? avatar.candidates || [] : []
  const candidateKey = candidates.join('|')
  const src = candidates[index]

  useEffect(() => {
    setIndex(0)
  }, [candidateKey])

  return (
    <div className={`${styles.avatarBox} ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={avatar.heroName || name}
          loading="lazy"
          onError={() => setIndex(current => current + 1)}
        />
      ) : (
        <span className={styles.avatarInitials}>{avatar?.initials || 'FC'}</span>
      )}
    </div>
  )
}

export default function PlayerDirectoryCard({
  player,
  index = 1,
  presentation = 'default',
  withSeason = path => path,
  onToggleFavorite,
  favoriteDisabled = false,
  locale = 'zh-CN'
}) {
  const playerPath = withSeason(`/players/${player.identity.playerId || player.player_id}`)
  const favoriteLabel = player.isFavorite ? '取消关注' : favoriteDisabled ? '关注已满' : '关注'
  const roleLabel = displayRole(player.role, locale)
  const flexRole = player.flexRoles?.[0] ? displayRole(player.flexRoles[0], locale) : ''
  const teamLabel = getTeamTagLabel(player)
  const teamTitle = [teamLabel, player.teamFullName].filter(Boolean).join(' · ')
  const heroNames = player.hasStats
    ? (player.heroNames?.length ? player.heroNames : [player.avatar?.heroName].filter(Boolean))
    : []
  const heroText = heroNames.length ? formatOwHeroNames(heroNames, locale, 3).join(' / ') : '比赛开始后更新'

  if (presentation === 'signal') {
    return (
      <article
        className={`${styles.playerCard} ${styles.playerCardSignal} ${player.isFavorite ? styles.playerCardFavorite : ''}`}
        style={{ '--roster-role-color': ROLE_COLORS[player.role] || ROLE_COLORS.FLEX }}
        data-player-name={player.identity.primary}
      >
        <Link to={playerPath} className={styles.cardLinkOverlay} aria-label={uiText("查看选手 {0}", locale, [player.identity.primary])} />

        <div className={styles.playerSignalVisual} data-player-name={player.identity.primary}>
          <span className={styles.playerFileIndex}>{String(index).padStart(2, '0')}<i>/ PLAYER FILE</i></span>
          <span className={styles.playerSignalRole}>{roleLabel}<i>{player.role || 'FLEX'}</i></span>
          <PlayerAvatar avatar={player.avatar} name={player.identity.primary} className={styles.playerSignalAvatar} />
          {player.isFavorite ? <span className={styles.favoriteBadge}>FOLLOWING</span> : null}
          <button
            type="button"
            className={`${styles.favoriteButton} ${player.isFavorite ? styles.favoriteButtonActive : ''}`}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              onToggleFavorite?.(player)
            }}
            disabled={favoriteDisabled}
            aria-label={favoriteLabel}
          >
            {player.isFavorite ? uiText("已关注", locale) : uiText("关注", locale)}
          </button>
        </div>

        <div className={styles.playerSignalBody}>
          <div className={styles.playerSignalTeam}><b>{teamLabel}</b><span>{player.teamFullName}</span></div>
          <div className={styles.playerSignalIdentity}>
            <strong>{player.identity.primary}</strong>
            {player.identity.secondary ? <span title={player.identity.secondary}>{player.identity.secondary}</span> : null}
          </div>
          <div className={styles.playerSignalHeroes}>
            <span>HERO RECORD</span>
            <strong title={heroText}>{heroText}</strong>
          </div>
          <Link to={playerPath} className={styles.playerSignalLink}>{uiText("查看选手档案 ", locale)}<span aria-hidden="true">↗</span></Link>
        </div>
      </article>
    )
  }

  return (
    <article
      className={`${styles.playerCard} ${player.isFavorite ? styles.playerCardFavorite : ''}`}
      style={{ '--roster-role-color': ROLE_COLORS[player.role] || ROLE_COLORS.FLEX }}
    >
      <Link to={playerPath} className={styles.cardLinkOverlay} aria-label={uiText("查看选手 {0}", locale, [player.identity.primary])} />

      {player.isFavorite ? <span className={styles.favoriteBadge}>FOLLOWING</span> : null}
      <button
        type="button"
        className={`${styles.favoriteButton} ${player.isFavorite ? styles.favoriteButtonActive : ''}`}
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          onToggleFavorite?.(player)
        }}
        disabled={favoriteDisabled}
        aria-label={favoriteLabel}
      >
        {player.isFavorite ? uiText("已关注", locale) : uiText("关注", locale)}
      </button>

      <div className={styles.playerBody}>
        <div className={styles.playerHeaderRow}>
          <PlayerAvatar avatar={player.avatar} name={player.identity.primary} />

          <div className={styles.playerMain}>
            <div className={styles.playerName}>{player.identity.primary}</div>
            {player.identity.secondary ? (
              <div className={styles.playerBattleTag} title={player.identity.secondary}>{player.identity.secondary}</div>
            ) : null}
            <div className={styles.playerMetaStrip}>
              <span className={styles.teamTag} title={teamTitle || teamLabel}>
                <span className={styles.teamTagText}>{teamLabel}</span>
              </span>
              <span className={styles.roleTag}>{roleLabel}</span>
              {flexRole ? <span className={styles.flexTag}>{flexRole}</span> : null}
            </div>
          </div>
        </div>

        <div className={styles.playerHeroPanel}>
          <span>{uiText("常用英雄", locale)}</span>
          <strong title={heroText}>{heroText}</strong>
        </div>

        <Link to={playerPath} className={styles.cardTextLink}>{uiText("查看选手 →", locale)}</Link>
      </div>
    </article>
  )
}
