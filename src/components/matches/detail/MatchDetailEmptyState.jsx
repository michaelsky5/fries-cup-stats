import { getRoleColor } from '../../../lib/leaderboardSelectors.js'
import { getRosterRoleLabel } from '../../../lib/rosterSelectors.js'
import styles from './MatchDetail.module.css'

function Roster({ title, players, locale = 'zh-CN' }) {
  return (
    <section className={styles.rosterList}>
      <div className={styles.rosterHead}>{title}</div>
      {players.length ? players.map(player => (
        <div key={player.id || player.name} className={styles.rosterPlayer}>
          <span>{player.name}</span>
          <span className={styles.roleLabel} style={{ color: getRoleColor(player.role) }}>
            {getRosterRoleLabel(player.role, locale)}
          </span>
        </div>
      )) : (
        <div className={styles.emptyText}>-</div>
      )}
    </section>
  )
}

export default function MatchDetailEmptyState({ dossier, locale = 'zh-CN', t }) {
  const message = dossier.state.isUpcoming
    ? t('matchDetail.pendingNotice', 'This match has not started; only published matchup, schedule, and roster information is shown.')
    : (dossier.statusNote || t('matchDetail.unavailableNotice', 'This match currently does not generate map or stat records.'))

  return (
    <section className={styles.section}>
      <div className={styles.statePanel}>
        <h2 className={styles.stateTitle}>{dossier.statusLabel}</h2>
        <p className={styles.stateBody}>{message}</p>
        <div className={styles.rosterGrid}>
          <Roster title={dossier.teamA.short} players={dossier.rosters.teamA} locale={locale} />
          <Roster title={dossier.teamB.short} players={dossier.rosters.teamB} locale={locale} />
        </div>
      </div>
    </section>
  )
}
