import MapCodeBlock from './MapCodeBlock.jsx'
import styles from './MatchDetail.module.css'

function MetaItem({ label, value, children, wide = false }) {
  if (!value && !children) return null
  return (
    <div className={styles.mapMetaItem} data-wide={wide ? 'true' : 'false'}>
      <span>{label}</span>
      <strong>{children || value}</strong>
    </div>
  )
}

export default function MapMetaStrip({ map, dossier, t }) {
  return (
    <div className={styles.mapMetaStrip}>
      <MetaItem label={t('matchDetail.mapType', 'Map Type')} value={map.type || '-'} />
      <MetaItem label={t('matchDetail.duration', 'Duration')} value={map.matchTime || '-'} />
      <MetaItem label={t('matchDetail.winner', 'Winner')} value={map.winnerTeam?.short || map.winnerLabel || '-'} />
      <MetaItem label={t('matchDetail.status', 'Status')} value={map.hasResult ? dossier.statusLabel : '-'} />
      <MetaItem label={`${dossier.teamA.short} ${t('matchDetail.teamBan', 'Ban')}`} value={map.teamABan || '-'} />
      <MetaItem label={`${dossier.teamB.short} ${t('matchDetail.teamBan', 'Ban')}`} value={map.teamBBan || '-'} />
      <MetaItem label={t('matchDetail.matchCode', 'Match Code')} value="code" wide>
        <MapCodeBlock code={map.lobbyCode} t={t} />
      </MetaItem>
    </div>
  )
}
