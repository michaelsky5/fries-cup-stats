import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import styles from './TeamShareCard.module.css'

const ROLE_LABELS = {
  TANK: '重装',
  DPS: '输出',
  SUP: '支援',
  SUPPORT: '支援'
}

function getTeamNameSize(name) {
  const length = String(name || '').length
  if (length >= 12) return 78
  if (length >= 9) return 92
  if (length >= 7) return 108
  return 128
}

function getPlayerNameSize(name, count) {
  const length = String(name || '').length
  if (count >= 7 && length >= 7) return 22
  if (length >= 8) return 24
  if (length >= 6) return 27
  return count >= 7 ? 30 : 34
}

function getRoleLabel(player) {
  return ROLE_LABELS[player?.roleKey] || player?.role || '选手'
}

function hasRecordedAppearance(player) {
  if (typeof player?.hasAppearance === 'boolean') return player.hasAppearance
  return Number(player?.mapsPlayed || 0) > 0 || Number(player?.timeMins || 0) > 0
}

function RosterPlayer({ player, index, count, team, seasonId }) {
  const uiLocale = useUiLocale()
  if (!player) return null

  const artwork = player.artwork || {}
  const crop = artwork.crop || {}
  const src = artwork.src || artwork.fallbackSrc || player.avatarSrc
  const hasArtwork = Boolean(src && player.hasArtwork !== false)

  return (
    <div
      className={styles.player}
      data-role={player.roleKey || ''}
      data-art={hasArtwork ? 'true' : 'false'}
      data-player-card
    >
      <div className={styles.playerArt}>
        {hasArtwork ? (
          <img
            src={src}
            alt=""
            loading="eager"
            style={{
              '--art-position': crop.objectPosition || '50% 48%',
              '--art-scale': crop.scale || 1.06,
              '--art-x': crop.translateX || '0px',
              '--art-y': crop.translateY || '0px'
            }}
            data-fallback-src={artwork.fallbackSrc || player.avatarSrc || ''}
            onError={event => {
              const fallback = event.currentTarget.dataset.fallbackSrc
              if (fallback && event.currentTarget.src !== new URL(fallback, window.location.href).href) {
                event.currentTarget.src = fallback
              } else {
                event.currentTarget.closest('[data-player-card]')?.setAttribute('data-art', 'false')
                event.currentTarget.style.display = 'none'
              }
            }}
          />
        ) : null}
        <div className={styles.playerFallback} aria-hidden="true">
          <div className={styles.fallbackTeamMark}>
            <TeamLogo team={team} seasonId={seasonId} className={styles.fallbackLogo} large />
          </div>
          <div className={styles.fallbackStamp}>
            <span>ROSTER VERIFIED</span>
            <em>{uiText("定妆照待补充", uiLocale)}</em>
          </div>
        </div>
      </div>
      <div className={styles.playerShade} aria-hidden="true" />
      <div className={styles.playerTopline}>
        <span>{uiText(getRoleLabel(player), uiLocale)}</span>
        <em>{String(index + 1).padStart(2, '0')}</em>
      </div>
      <div className={styles.playerIdentity}>
        <strong style={{ fontSize: `${getPlayerNameSize(player.name, count)}px` }}>{player.name}</strong>
        {player.battleTag ? <small>{player.battleTag}</small> : null}
      </div>
    </div>
  )
}

function FormStrip({ form }) {
  const rows = Array.isArray(form) ? form.slice(0, 5) : []
  if (!rows.length) return <span className={styles.formEmpty}>NO RECORD</span>

  return (
    <div className={styles.formStrip}>
      {rows.map((item, index) => (
        <b key={`${item.label}-${index}`} data-tone={item.tone}>{item.label}</b>
      ))}
    </div>
  )
}

export default function TeamShareCard({ model }) {
  const uiLocale = useUiLocale()
  if (!model) return null

  const registeredPlayers = (model.rosterPlayers?.length ? model.rosterPlayers : model.corePlayers).slice(0, 7)
  const rosterPlayers = registeredPlayers.filter(hasRecordedAppearance)
  const unplayedPlayers = registeredPlayers.filter(player => !hasRecordedAppearance(player))
  const focus = model.focusMatch

  return (
    <article className={styles.card} data-roster-count={registeredPlayers.length}>
      <img
        className={styles.mapImage}
        src={model.featuredMap.imageUrl}
        alt=""
        loading="eager"
        onError={event => {
          event.currentTarget.style.display = 'none'
        }}
      />
      <div className={styles.mapVeil} aria-hidden="true" />
      <div className={styles.posterGrid} aria-hidden="true" />
      <div className={styles.posterBands} aria-hidden="true" />
      <div className={styles.speedLines} aria-hidden="true" />
      <div className={styles.backgroundWord} aria-hidden="true">{model.team.shortName}</div>

      <header className={styles.masthead}>
        <div className={styles.brandLockup}>
          <span>FRIES CUP</span>
          <strong>DATA CENTER</strong>
        </div>
        <div className={styles.dossierMark}>
          <span>DATA CENTER / ROSTER FILE</span>
          <strong>{model.seasonLabel}</strong>
        </div>
      </header>

      <section className={styles.heroIdentity}>
        <div className={styles.logoStage}>
          <TeamLogo team={model.team.raw} seasonId={model.seasonId} className={styles.logo} large />
        </div>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>OFFICIAL TEAM DOSSIER / {registeredPlayers.length} PLAYERS</span>
          <h1 style={{ fontSize: `${getTeamNameSize(model.team.shortName)}px` }}>{model.team.shortName}</h1>
          <p>{model.team.fullName}</p>
          <div className={styles.identityRule} aria-hidden="true"><i /><span>{model.advance.isArchived ? 'SEASON ARCHIVE // COMPLETE' : 'TEAM FORMATION // READY'}</span></div>
        </div>
        <div className={styles.standingBlock}>
          <span>{model.advance.code}</span>
          <strong>{model.advance.label}</strong>
          <em>{model.advance.zone}</em>
          <div className={styles.standingStats}>
            <span><b>{model.matchRecord}</b>{model.matchRecordLabel || uiText("比赛战绩", uiLocale)}</span>
            <span><b>{model.mapWinRate.split(' ')[0]}</b>{uiText("地图胜率", uiLocale)}</span>
          </div>
        </div>
      </section>

      <section className={styles.rosterStage}>
        <div className={styles.rosterHeader}>
          <span>SQUAD FORMATION</span>
          <strong>{uiText("赛季出场阵线", uiLocale)}</strong>
          <em>
            {String(rosterPlayers.length).padStart(2, '0')} APPEARED
            {unplayedPlayers.length ? ` // ${String(unplayedPlayers.length).padStart(2, '0')} REGISTERED` : ''}
          </em>
        </div>
        <div
          className={styles.players}
          data-count={rosterPlayers.length}
          style={{ '--roster-count': Math.max(rosterPlayers.length, 1) }}
        >
          {rosterPlayers.length ? rosterPlayers.map((player, index) => (
            <RosterPlayer
              key={player.id || player.name}
              player={player}
              index={index}
              count={rosterPlayers.length}
              team={model.team.raw}
              seasonId={model.seasonId}
            />
          )) : <div className={styles.rosterEmpty}>ROSTER DATA PENDING</div>}
        </div>
      </section>

      <section className={styles.briefingStrip}>
        <div className={styles.staffBlock}>
          <span>TEAM STAFF</span>
          <div className={styles.staffMembers}>
            <p>{uiText("经理 ", uiLocale)}<strong>{model.staff.manager || uiText("待定", uiLocale)}</strong></p>
            <p>{uiText("教练 ", uiLocale)}<strong>{model.staff.coach || uiText("待定", uiLocale)}</strong></p>
          </div>
          {unplayedPlayers.length ? (
            <div className={styles.unplayedRoster}>
              <em>{uiText("注册未出场", uiLocale)}</em>
              <div>
                {unplayedPlayers.map(player => (
                  <span key={player.id || player.name}>
                    <b>{player.name}</b>
                    {player.battleTag ? <small>{player.battleTag}</small> : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.recordBlock}>
          <span>SEASON RECORD</span>
          <strong>{model.matchRecord}</strong>
          <em>{model.mapRecord}{uiText(" 地图战绩", uiLocale)}</em>
        </div>
        <div className={styles.formBlock}>
          <span>RECENT FORM</span>
          <FormStrip form={model.recentForm} />
        </div>
        <div className={styles.nextBlock}>
          <span>{focus?.kind === 'final' ? 'FINAL APPEARANCE' : focus?.kind === 'next' ? 'NEXT MATCH' : focus?.kind === 'live' ? 'LIVE MATCH' : 'LATEST MATCH'}</span>
          <strong>{focus?.opponent || uiText("暂无对手", uiLocale)}</strong>
          <em>{focus ? `${focus.round} · ${focus.time}` : uiText("暂无赛程", uiLocale)}</em>
          <b>{focus?.score || '- : -'}</b>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>STATS.FRIES-CUP.COM</span>
        <strong>{model.footerText}</strong>
      </footer>
    </article>
  )
}
