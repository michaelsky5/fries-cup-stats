import { Link } from 'react-router-dom'
import FollowingMatchRow from './FollowingMatchRow.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

function flattenGroups(groups) {
  return groups.flatMap(dateGroup => dateGroup.timeGroups.flatMap(timeGroup => timeGroup.matches))
}

export default function MatchWeekPanel({ week, seasonId, withSeason, onManage }) {
  const dateGroups = week?.matchGroups || []
  const visibleMatches = flattenGroups(dateGroups)
  const summaryMatches = week?.favoriteMatches?.length ? week.favoriteMatches : visibleMatches
  const primaryMatch = summaryMatches.find(match => match.isPrimaryMatch)
  const nextMatch = summaryMatches[0]
  const timeSlotCount = dateGroups.reduce((sum, dateGroup) => sum + dateGroup.timeGroups.length, 0)
  const mainMatch = primaryMatch || nextMatch
  const matchCountText = week ? `${week.totalFavoriteMatches} 场关注比赛` : ''
  const boardRangeText = week ? `${week.boardDateRangeLabel || week.dateRangeLabel} / ${week.roundBoardLabel || week.roundLabel}` : '暂无比赛周'

  return (
    <section className={styles.weekPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <span>D / MATCH WEEK</span>
          <h2>本比赛周</h2>
          <p>{boardRangeText}</p>
        </div>
        <div className={styles.weekHeaderMeta}>
          {week ? <strong>{matchCountText}</strong> : null}
          <Link to={withSeason('/matches?view=list&tab=following')}>查看全部 →</Link>
        </div>
      </div>

      {dateGroups.length ? (
        <div className={styles.weekScheduleBoard}>
          <div className={styles.weekBoardFrame}>
            <div className={styles.weekProgramList}>
              {dateGroups.map(dateGroup => (
                <section className={styles.weekDateGroup} key={dateGroup.key}>
                  <div className={styles.weekDateBar}>
                    <h3>{dateGroup.dateLabel}</h3>
                    <span>{week.dateGroupMetaLabel || week.roundBoardLabel || week.roundLabel}</span>
                  </div>
                  <div className={styles.weekTimeGroups}>
                    {dateGroup.timeGroups.map(timeGroup => (
                      <div className={styles.weekTimeGroup} key={`${dateGroup.key}-${timeGroup.key}`}>
                        <time className={styles.weekGroupTime}>{timeGroup.timeLabel}</time>
                        <div className={styles.weekTimeMatches}>
                          {timeGroup.matches.map(match => (
                            <FollowingMatchRow
                              key={match.matchId}
                              match={match}
                              seasonId={seasonId}
                              withSeason={withSeason}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <aside className={styles.weekNoticeBoard} aria-label="比赛周公告">
              <div>
                <span>PROGRAM BOARD</span>
                <strong>{week.roundBoardLabel || week.roundLabel}</strong>
                <p>{week.dateGroupMetaLabel || 'MATCH WEEK'}</p>
              </div>

              <dl className={styles.weekNoticeStats}>
                <div>
                  <dt>关注比赛</dt>
                  <dd>{week.totalFavoriteMatches}</dd>
                </div>
                <div>
                  <dt>时间段</dt>
                  <dd>{timeSlotCount}</dd>
                </div>
                <div>
                  <dt>日期</dt>
                  <dd>{dateGroups.length}</dd>
                </div>
              </dl>

              <div className={styles.weekNoticeMain}>
                <span>{primaryMatch ? '主关注比赛' : '下一场关注比赛'}</span>
                <strong>
                  {mainMatch ? `${mainMatch.teamA?.short || 'TBD'} VS ${mainMatch.teamB?.short || 'TBD'}` : '暂无'}
                </strong>
                <p>{mainMatch?.compactTime || mainMatch?.timeLabel || '时间待定'}</p>
              </div>

              <p className={styles.weekNoticeHint}>赛程按后台最新开赛时间自动分组。</p>
            </aside>
          </div>

          {week.hasMore ? (
            <Link className={styles.weekMoreLink} to={withSeason('/matches?view=list&tab=following')}>
              查看全部 {week.totalFavoriteMatches} 场关注比赛 →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={styles.weekEmpty}>
          <strong>本比赛周没有关注比赛</strong>
          <span>可以查看完整赛程，或调整关注队伍。</span>
          <div>
            <Link to={withSeason('/matches')}>查看完整赛程 →</Link>
            <button className={styles.textAction} type="button" onClick={onManage}>编辑关注 →</button>
          </div>
        </div>
      )}
    </section>
  )
}
