import TeamLogo from '../../components/matches/TeamLogo.jsx'
import styles from './TeamShareCard.module.css'

function Portrait({ player }) {
  if (!player) return null

  return (
    <div className={styles.portrait}>
      {player.avatarSrc ? (
        <img
          src={player.avatarSrc}
          alt={player.hero || player.name}
          loading="eager"
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <b>{player.initials || String(player.name || 'FC').slice(0, 2).toUpperCase()}</b>
      )}
      <span>
        <strong>{player.name}</strong>
        <em>{getShareRoleLabel(player.role)} / {player.hero || 'HERO TBD'}</em>
      </span>
    </div>
  )
}

function getShareRoleLabel(role) {
  if (role === 'TANK') return '重装'
  if (role === 'DPS') return '输出'
  if (role === 'SUP' || role === 'SUPPORT') return '支援'
  return role || '职责'
}

function FormStrip({ form }) {
  const rows = Array.isArray(form) ? form : []
  if (!rows.length) return <span className={styles.formEmpty}>NO RECORD</span>

  return (
    <div className={styles.formStrip}>
      {rows.map((item, index) => (
        <b key={`${item.label}-${index}`} data-tone={item.tone}>{item.label}</b>
      ))}
    </div>
  )
}

function MiniResult({ result }) {
  if (!result) return null
  return (
    <div className={styles.resultRow}>
      <span>{result.result}</span>
      <strong>{result.opponent}</strong>
      <em>{result.score}</em>
    </div>
  )
}

export default function TeamShareCard({ model }) {
  if (!model) return null

  const leaders = model.leaders.slice(0, 4)
  const corePlayers = model.corePlayers.slice(0, 4)

  return (
    <article className={styles.card}>
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
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.watermark}>{model.team.shortName}</div>

      <header className={styles.header}>
        <div>
          <span>FRIES CUP DATA CENTER</span>
          <strong>{model.seasonLabel}</strong>
        </div>
        <div className={styles.headerMeta}>
          <b>TEAM DOSSIER</b>
          <em>{model.featuredMap.mode} / {model.featuredMap.displayName}</em>
        </div>
      </header>

      <section className={styles.identity}>
        <div className={styles.logoFrame}>
          <TeamLogo team={model.team.raw} seasonId={model.seasonId} className={styles.logo} large />
        </div>

        <div className={styles.identityText}>
          <span>{model.advance.zone}</span>
          <h1>{model.team.shortName}</h1>
          <p>{model.team.fullName}</p>
          <div className={styles.staffLine}>
            <b>{model.staff.manager || '经理待定'}</b>
            <em>{model.staff.coach || '教练待定'}</em>
            <strong>{model.rosterSize} PLAYERS</strong>
          </div>
        </div>
      </section>

      <section className={styles.scoreboard}>
        <div className={styles.rankBlock}>
          <span>CURRENT RANK</span>
          <strong>{model.advance.label}</strong>
          <em>{model.advance.zone}</em>
        </div>
        <div>
          <span>MATCH RECORD</span>
          <strong>{model.matchRecord}</strong>
          <em>{model.completedLabel}</em>
        </div>
        <div>
          <span>MAP RECORD</span>
          <strong>{model.mapRecord}</strong>
          <em>{model.mapWinRate}</em>
        </div>
        <div>
          <span>NEXT / FOCUS</span>
          <strong>{model.focusMatch?.opponent || '待定'}</strong>
          <em>{model.focusMatch?.time || '暂无赛程'}</em>
        </div>
      </section>

      <section className={styles.lowerGrid}>
        <div className={styles.corePanel}>
          <div className={styles.panelLabel}>CORE LINEUP</div>
          <div className={styles.portraits}>
            {corePlayers.length ? corePlayers.map(player => <Portrait key={player.id || player.name} player={player} />) : (
              <div className={styles.empty}>阵容数据待更新</div>
            )}
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.panelLabel}>RECENT FORM</div>
          <FormStrip form={model.recentForm} />
          <div className={styles.results}>
            {model.latestResults.slice(0, 3).map(result => (
              <MiniResult key={`${result.opponent}-${result.score}-${result.time}`} result={result} />
            ))}
          </div>
        </div>

        <div className={styles.leaderPanel}>
          <div className={styles.panelLabel}>TEAM LEADERS</div>
          <div className={styles.leaders}>
            {leaders.length ? leaders.map(item => (
              <div key={item.label} className={styles.leaderItem}>
                <span>{item.label}</span>
                <strong>{item.name}</strong>
                <em>{item.value}</em>
              </div>
            )) : <div className={styles.empty}>暂无队内数据</div>}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>STATS.FRIES-CUP.COM</span>
        <strong>{model.footerText}</strong>
      </footer>
    </article>
  )
}
