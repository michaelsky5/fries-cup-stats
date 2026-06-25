import styles from './MatchDetail.module.css'

export default function MapRecordHeader({ map, dossier, expanded, t }) {
  return (
    <div className={styles.mapRecordHeader}>
      <div className={styles.mapRecordId}>
        <span>MAP {map.orderLabel}</span>
        <strong>{map.type || 'MAP'}</strong>
      </div>
      <div className={styles.mapRecordName}>
        <strong>{map.name}</strong>
      </div>
      <div className={styles.mapRecordScore}>
        <span>{dossier.teamA.short}</span>
        <strong>{map.scoreA} : {map.scoreB}</strong>
        <span>{dossier.teamB.short}</span>
      </div>
      <div className={styles.mapRecordMeta}>
        <span>{t('matchDetail.winner', 'Winner')}</span>
        <strong>{map.winnerTeam?.short || map.winnerLabel || '-'}</strong>
      </div>
      <div className={styles.mapRecordMeta}>
        <span>{t('matchDetail.duration', 'Duration')}</span>
        <strong>{map.matchTime || '-'}</strong>
      </div>
      <div className={styles.mapRecordToggle} aria-hidden="true">
        {expanded ? '-' : '+'}
      </div>
    </div>
  )
}
