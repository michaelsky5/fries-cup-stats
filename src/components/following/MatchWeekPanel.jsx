import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import FollowingMatchRow from './FollowingMatchRow.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

function flattenGroups(groups) {
  return groups.flatMap(dateGroup => dateGroup.timeGroups.flatMap(timeGroup => timeGroup.matches))
}

export default function MatchWeekPanel({ week, seasonId, withSeason, onManage }) {
  const uiLocale = useUiLocale()
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
          <h2>{uiText("本比赛周", uiLocale)}</h2>
          <p>{boardRangeText}</p>
        </div>
        <div className={styles.weekHeaderMeta}>
          {week ? <strong>{matchCountText}</strong> : null}
          <Link to={withSeason('/matches?view=list&tab=following')}>{uiText("查看全部 →", uiLocale)}</Link>
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

            <aside className={styles.weekNoticeBoard} aria-label={uiText("比赛周公告", uiLocale)}>
              <div>
                <span>PROGRAM BOARD</span>
                <strong>{week.roundBoardLabel || week.roundLabel}</strong>
                <p>{week.dateGroupMetaLabel || 'MATCH WEEK'}</p>
              </div>

              <dl className={styles.weekNoticeStats}>
                <div>
                  <dt>{uiText("关注比赛", uiLocale)}</dt>
                  <dd>{week.totalFavoriteMatches}</dd>
                </div>
                <div>
                  <dt>{uiText("时间段", uiLocale)}</dt>
                  <dd>{timeSlotCount}</dd>
                </div>
                <div>
                  <dt>{uiText("日期", uiLocale)}</dt>
                  <dd>{dateGroups.length}</dd>
                </div>
              </dl>

              <div className={styles.weekNoticeMain}>
                <span>{primaryMatch ? uiText("主关注比赛", uiLocale) : uiText("下一场关注比赛", uiLocale)}</span>
                <strong>
                  {mainMatch ? `${mainMatch.teamA?.short || 'TBD'} VS ${mainMatch.teamB?.short || 'TBD'}` : uiText("暂无", uiLocale)}
                </strong>
                <p>{mainMatch?.compactTime || mainMatch?.timeLabel || uiText("时间待定", uiLocale)}</p>
              </div>

              <p className={styles.weekNoticeHint}>{uiText("赛程已按开赛时间分组展示。", uiLocale)}</p>
            </aside>
          </div>

          {week.hasMore ? (
            <Link className={styles.weekMoreLink} to={withSeason('/matches?view=list&tab=following')}>{uiText("查看全部 ", uiLocale)}{week.totalFavoriteMatches}{uiText(" 场关注比赛 →", uiLocale)}</Link>
          ) : null}
        </div>
      ) : (
        <div className={styles.weekEmpty}>
          <strong>{uiText("本比赛周没有关注比赛", uiLocale)}</strong>
          <span>{uiText("可以查看完整赛程，或调整关注队伍。", uiLocale)}</span>
          <div>
            <Link to={withSeason('/matches')}>{uiText("查看完整赛程 →", uiLocale)}</Link>
            {onManage ? <button className={styles.textAction} type="button" onClick={onManage}>{uiText("编辑关注 →", uiLocale)}</button> : null}
          </div>
        </div>
      )}
    </section>
  )
}
