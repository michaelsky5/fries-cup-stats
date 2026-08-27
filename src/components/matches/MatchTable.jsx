import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { getBroadcastInfo } from '../../lib/broadcastSelectors.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { isForfeitMatch } from '../../lib/matchesSelectors.js'
import styles from './MatchTable.module.css'

function displayScore(value) {
  return value === '' || value === null || value === undefined ? '-' : value
}

function getStatusInfo(status, isForfeit) {
  if (status === 'COMPLETE' || status === 'COMPLETED') {
    if (isForfeit) {
      return { cn: '弃权完结', en: 'FORFEIT', className: styles.statusComplete }
    }
    return { cn: '已完结', en: 'COMPLETE', className: styles.statusComplete }
  }
  if (status === 'IN_PROGRESS') {
    return { cn: '进行中', en: 'LIVE', className: styles.statusProgress }
  }
  return { cn: '未开始', en: 'PENDING', className: styles.statusPending }
}

function HeadLabel({ cn, en, align = 'center' }) {
  const cls = [
    styles.headLabel,
    align === 'left' ? styles.alignLeft : '',
    align === 'center' ? styles.alignCenter : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <span className={styles.headCn}>{cn}</span>
      <span className={styles.headEn}>{en}</span>
    </div>
  )
}

export default function MatchTable({ rows = [], locale = 'zh-CN' }) {
  const { withSeason = path => path } = useOutletContext()
  const location = useLocation()

  return (
    <div className={styles.tablePanel}>
      <div className={styles.tableWrap}>
        <div className={styles.headerRow}>
          <HeadLabel cn="对局信息" en="MATCH INFO" align="left" />
          <HeadLabel cn="赛段 / 轮次" en="STAGE / ROUND" />
          <HeadLabel cn="双方对阵" en="MATCHUP" />
          <HeadLabel cn="比分 / 状态" en="SCORE / STATUS" />
          <HeadLabel cn="操作" en="ACTION" />
        </div>

        <div className={styles.bodyList}>
          {rows.length > 0 ? rows.map(row => {
            const isComplete = row.status === 'COMPLETE' || row.status === 'COMPLETED'
            const isProgress = row.status === 'IN_PROGRESS'
            const isForfeit = isForfeitMatch(row)
            const matchTitle = row.match_display_name || row.match_id
            const teamAName = row?.team_a?.name || 'TBD'
            const teamBName = row?.team_b?.name || 'TBD'
            const scoreA = Number(row?.team_a?.score)
            const scoreB = Number(row?.team_b?.score)
            const isWinnerA = isComplete && scoreA > scoreB
            const isWinnerB = isComplete && scoreB > scoreA
            const statusInfo = getStatusInfo(row.status, isForfeit)
            const schedule = formatMatchSchedule(row, { locale })
            const broadcast = getBroadcastInfo(row)

            return (
              <div
                key={row.match_id}
                className={[
                  styles.bodyRow,
                  isComplete ? styles.bodyRowComplete : '',
                  isProgress ? styles.bodyRowProgress : ''
                ].filter(Boolean).join(' ')}
              >
                <div className={styles.matchInfoCell}>
                  <div className={styles.matchTitle} title={matchTitle}>{matchTitle}</div>
                  <div className={styles.matchMetaRow}>
                    <span className={styles.miniTag}>{row.format || 'TBD'}</span>
                    <span className={styles.miniTag} title={schedule.title}>{schedule.compact}</span>
                    {broadcast.streamLinks.length > 0 ? broadcast.streamLinks.map((stream, index) => (
                      <a
                        key={`${stream.url}-${index}`}
                        className={`${styles.miniTag} ${styles.broadcastLink}`}
                        href={stream.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {stream.label || '\u76f4\u64ad\u95f4'}
                      </a>
                    )) : broadcast.hasPublicInfo ? (
                      <span className={`${styles.miniTag} ${styles.broadcastTag}`}>
                        {'\u76f4\u64ad\u5b89\u6392'}
                      </span>
                    ) : null}
                    <span className={styles.miniTag} title={row.match_id}>{row.match_id}</span>
                  </div>
                  {broadcast.casterText ? (
                    <div className={styles.broadcastLine}>
                      {'\u89e3\u8bf4: '}{broadcast.casterText}
                    </div>
                  ) : null}
                  {broadcast.refereeText ? (
                    <div className={styles.broadcastLine}>
                      {'\u8d5b\u7ba1: '}{broadcast.refereeText}
                    </div>
                  ) : null}
                </div>

                <div className={`${styles.stageCell} ${styles.alignCenter}`}>
                  <div className={styles.stagePill}>{row.stage || '-'}</div>
                  <div className={styles.stageSub}>{row.round || '-'}</div>
                </div>

                <div className={`${styles.matchupCell} ${styles.alignCenter}`}>
                  <div className={styles.teamStack}>
                    <span className={`${styles.teamName} ${isWinnerA ? styles.teamNameWinner : ''}`} title={teamAName}>
                      {teamAName}
                    </span>
                    <span className={styles.vs}>VS</span>
                    <span className={`${styles.teamName} ${isWinnerB ? styles.teamNameWinner : ''}`} title={teamBName}>
                      {teamBName}
                    </span>
                  </div>
                </div>

                <div className={`${styles.scoreStatusCell} ${styles.alignCenter}`}>
                  <div className={styles.scorePanel}>
                    <div className={styles.scoreBlock}>
                      <span className={isWinnerA ? styles.scoreHighlight : ''}>{displayScore(row?.team_a?.score)}</span>
                      <span className={styles.scoreDivider}>:</span>
                      <span className={isWinnerB ? styles.scoreHighlight : ''}>{displayScore(row?.team_b?.score)}</span>
                    </div>

                    <span className={`${styles.statusPill} ${statusInfo.className}`}>
                      <span className={styles.statusCn}>{statusInfo.cn}</span>
                      <span className={styles.statusEn}>{statusInfo.en}</span>
                    </span>
                  </div>
                </div>

                <div className={`${styles.actionCell} ${styles.alignCenter}`}>
                  <Link
                    to={withSeason(`/matches/${row.match_id}`)}
                    state={getReturnState(location)}
                    className={`${styles.actionBtn} ${isComplete ? styles.actionBtnSubtle : styles.actionBtnAccent}`}
                    onClick={() => saveReturnScroll(location)}
                  >
                    <span className={styles.actionBtnCn}>查看详情</span>
                    <span className={styles.actionBtnEn}>DETAIL</span>
                  </Link>
                </div>
              </div>
            )
          }) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyCn}>暂无匹配的比赛记录</span>
              <span className={styles.emptyEn}>NO MATCHES FOUND</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
