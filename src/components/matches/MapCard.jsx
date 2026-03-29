import MapStatsTable from './MapStatsTable.jsx'
import styles from './MapCard.module.css'

export default function MapCard({ map, match }) {
  const teamAStats = Array.isArray(map?.team_a_stats) ? map.team_a_stats : []
  const teamBStats = Array.isArray(map?.team_b_stats) ? map.team_b_stats : []

  const teamAId = match?.team_a?.id
  const teamBId = match?.team_b?.id
  const teamAName = map?.team_a_name || match?.team_a?.name || 'TEAM A'
  const teamBName = map?.team_b_name || match?.team_b?.name || 'TEAM B'

  const isWinnerA = map?.winner === 'A' || map?.winner === teamAId
  const isWinnerB = map?.winner === 'B' || map?.winner === teamBId
  const isDraw = map?.winner === 'DRAW'

  const getWinnerText = () => {
    if (isWinnerA) return teamAName
    if (isWinnerB) return teamBName
    if (isDraw) return '平局'
    return '-'
  }

  const mapOrder = map?.map_order ? String(map.map_order).padStart(2, '0') : '--'

  const shellClass = [
    styles.shell,
    isWinnerA || isWinnerB ? styles.shellResolved : '',
    isDraw ? styles.shellDraw : ''
  ].filter(Boolean).join(' ')

  return (
    <article className={shellClass}>
      <header className={styles.head}>
        <div className={styles.left}>
          <div className={styles.orderRow}>
            <span className={styles.orderCn}>第 {mapOrder} 图</span>
            <span className={styles.orderEn}>MAP {mapOrder}</span>
          </div>

          <div className={styles.name}>{map?.map_name || '未知地图'}</div>

          <div className={styles.typeRow}>
            <span className={styles.typeCn}>{map?.map_type || '未知模式'}</span>
            <span className={styles.typeEn}>MODE</span>
          </div>
        </div>

        <div className={styles.center}>
          <div className={styles.scoreShell}>
            <span className={`${styles.scoreNum} ${isWinnerA ? styles.scoreWinner : styles.scoreNormal}`}>
              {map?.score_a ?? '-'}
            </span>
            <span className={styles.scoreDivider}>:</span>
            <span className={`${styles.scoreNum} ${isWinnerB ? styles.scoreWinner : styles.scoreNormal}`}>
              {map?.score_b ?? '-'}
            </span>
          </div>

          <div className={styles.scoreTeams}>
            <span className={`${styles.scoreTeam} ${isWinnerA ? styles.scoreTeamWinner : ''}`} title={teamAName}>
              {teamAName}
            </span>
            <span className={styles.scoreTeamDivider}>VS</span>
            <span className={`${styles.scoreTeam} ${isWinnerB ? styles.scoreTeamWinner : ''}`} title={teamBName}>
              {teamBName}
            </span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.metaLine}>
            <span className={styles.metaLabelGroup}>
              <span className={styles.metaLabel}>胜方</span>
              <span className={styles.metaLabelEn}>WINNER</span>
            </span>
            <span className={`${styles.metaValue} ${(isWinnerA || isWinnerB || isDraw) ? styles.textHighlight : ''}`}>
              {getWinnerText()}
            </span>
          </div>

          <div className={styles.metaLine}>
            <span className={styles.metaLabelGroup}>
              <span className={styles.metaLabel}>时长</span>
              <span className={styles.metaLabelEn}>TIME</span>
            </span>
            <span className={`${styles.metaValue} ${styles.mono}`}>{map?.match_time || '-'}</span>
          </div>
        </div>
      </header>

      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoHead}>
            <span className={styles.infoCn}>A 队禁用</span>
            <span className={styles.infoEn}>TEAM A BAN</span>
          </div>
          <div className={styles.infoValueRow}>
            <span className={styles.infoValue}>{map?.team_a_ban || '-'}</span>
            {map?.team_a_ban_role ? <span className={styles.roleTag}>{map.team_a_ban_role}</span> : null}
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoHead}>
            <span className={styles.infoCn}>B 队禁用</span>
            <span className={styles.infoEn}>TEAM B BAN</span>
          </div>
          <div className={styles.infoValueRow}>
            <span className={styles.infoValue}>{map?.team_b_ban || '-'}</span>
            {map?.team_b_ban_role ? <span className={styles.roleTag}>{map.team_b_ban_role}</span> : null}
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoHead}>
            <span className={styles.infoCn}>比赛代码</span>
            <span className={styles.infoEn}>LOBBY CODE</span>
          </div>
          <div className={`${styles.infoValueRow} ${styles.infoValueMono}`}>
            <span className={styles.infoValue}>{map?.lobby_code || '-'}</span>
          </div>
        </div>

        {map?.notes ? (
          <div className={`${styles.infoCard} ${styles.infoCardWide}`}>
            <div className={styles.infoHead}>
              <span className={styles.infoCn}>备注</span>
              <span className={styles.infoEn}>NOTES</span>
            </div>
            <div className={`${styles.infoValueRow} ${styles.infoNotes}`}>
              <span className={styles.infoValue}>{map.notes}</span>
            </div>
          </div>
        ) : null}
      </section>

      <div className={styles.tables}>
        <MapStatsTable title={teamAName} rows={teamAStats} winner={isWinnerA} />
        <MapStatsTable title={teamBName} rows={teamBStats} winner={isWinnerB} />
      </div>
    </article>
  )
}