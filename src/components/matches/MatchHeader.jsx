import styles from './MatchHeader.module.css'

function displayScore(value) {
  return value === '' || value === null || value === undefined ? '-' : value
}

function getStatusClass(status) {
  if (status === 'COMPLETE' || status === 'COMPLETED') return styles.statusComplete
  if (status === 'IN_PROGRESS') return styles.statusProgress
  return styles.statusPending
}

function getStatusInfo(status) {
  if (status === 'COMPLETE' || status === 'COMPLETED') return { cn: '已完结', en: 'COMPLETED' }
  if (status === 'IN_PROGRESS') return { cn: '进行中', en: 'LIVE' }
  return { cn: '未开始', en: 'PENDING' }
}

export default function MatchHeader({ match }) {
  const scoreA = Number(match?.team_a?.score)
  const scoreB = Number(match?.team_b?.score)
  const isComplete = match?.status === 'COMPLETE' || match?.status === 'COMPLETED'
  const isWinnerA = isComplete && scoreA > scoreB
  const isWinnerB = isComplete && scoreB > scoreA

  const teamAName = match?.team_a?.name || 'TBD'
  const teamBName = match?.team_b?.name || 'TBD'
  const teamAShort = match?.team_a?.short || match?.team_a?.abbr || '-'
  const teamBShort = match?.team_b?.short || match?.team_b?.abbr || '-'
  const statusInfo = getStatusInfo(match?.status)

  return (
    <section className={styles.shell}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <div className={styles.kicker}>
            <span className={styles.kickerCn}>核心对阵</span>
            <span className={styles.kickerEn}>MATCH HEADLINE</span>
          </div>

          <div className={styles.titleWrap}>
            <h1 className={styles.title}>
              {match?.match_display_name || `${teamAName} VS ${teamBName}`}
            </h1>

            <span className={`${styles.statusPill} ${getStatusClass(match?.status)}`}>
              <span className={styles.statusCn}>{statusInfo.cn}</span>
              <span className={styles.statusEn}>{statusInfo.en}</span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.board}>
        <div className={`${styles.teamBlock} ${styles.teamBlockA} ${isWinnerA ? styles.teamWinner : ''}`}>
          <div className={styles.teamTagGroup}>
            <span className={styles.teamTagCn}>队伍 A</span>
            <span className={styles.teamTagEn}>TEAM A</span>
          </div>

          <div className={styles.teamName}>{teamAName}</div>
          <div className={styles.teamSub}>{teamAShort}</div>
        </div>

        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>
            <span className={styles.scoreLabelCn}>总比分</span>
            <span className={styles.scoreLabelEn}>SERIES SCORE</span>
          </div>

          <div className={styles.score}>
            <span className={isWinnerA ? styles.scoreHighlight : ''}>
              {displayScore(match?.team_a?.score)}
            </span>
            <span className={styles.scoreDivider}>:</span>
            <span className={isWinnerB ? styles.scoreHighlight : ''}>
              {displayScore(match?.team_b?.score)}
            </span>
          </div>
        </div>

        <div className={`${styles.teamBlock} ${styles.teamBlockB} ${isWinnerB ? styles.teamWinner : ''}`}>
          <div className={styles.teamTagGroup}>
            <span className={styles.teamTagCn}>队伍 B</span>
            <span className={styles.teamTagEn}>TEAM B</span>
          </div>

          <div className={styles.teamName}>{teamBName}</div>
          <div className={styles.teamSub}>{teamBShort}</div>
        </div>
      </div>
    </section>
  )
}