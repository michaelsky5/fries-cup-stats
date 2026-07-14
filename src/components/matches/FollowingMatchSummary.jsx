import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchStatus,
  getMatchStatusText,
  getMatchTimeLabel,
  getRoundText,
  safeArr
} from '../../lib/matchesSelectors.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { getBroadcastInfo } from '../../lib/broadcastSelectors.js'
import MatchHubSectionLabel from './MatchHubSectionLabel.jsx'
import TeamLogo from './TeamLogo.jsx'
import styles from './MatchHub.module.css'

function getNicknameList(people) {
  const seen = new Set()

  return safeArr(people)
    .map(person => String(typeof person === 'object' ? person?.name || person?.nickname || '' : person || '').trim())
    .filter(Boolean)
    .filter(name => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' / ')
}

function FollowingTeam({ team, source, seasonId, align = 'left' }) {
  return (
    <span className={`${styles.followingTeam} ${align === 'right' ? styles.followingTeamRight : ''}`}>
      <TeamLogo team={source} seasonId={seasonId} className={styles.followingLogo} />
      <span>
        <strong>{team.short}</strong>
        <em>{team.full}</em>
      </span>
    </span>
  )
}

function EmptyFollowing({ message }) {
  const { withSeason = path => path } = useOutletContext()

  return (
    <section className={styles.section} aria-labelledby="following-title" data-testid="following-section">
      <header className={styles.sectionHead}>
        <div>
          <MatchHubSectionLabel code="B / FOLLOWING" title="我的关注" />
          <h2 id="following-title">我的关注</h2>
        </div>
      </header>

      <div className={styles.followingEmpty} data-testid="following-summary">
        <strong>主关注队伍下一场</strong>
        <p>{message}</p>
        <div className={styles.followingActions}>
          <Link to={withSeason('/following?manage=1')}>设置主关注</Link>
          <Link to={withSeason('/following')}>前往我的关注 →</Link>
        </div>
      </div>
    </section>
  )
}

export default function FollowingMatchSummary({ hub }) {
  const { favorites, seasonId, withSeason = path => path } = useOutletContext()
  const location = useLocation()
  const primaryTeamId = favorites?.primaryTeamId
  const match = hub?.primaryFollowingNextMatch || null

  if (!primaryTeamId) {
    return (
      <EmptyFollowing message="设置主关注队伍后，将优先展示你的下一场比赛。" />
    )
  }

  if (!match) {
    return (
      <EmptyFollowing message="主关注队伍暂无下一场未开始比赛。" />
    )
  }

  const teams = getMatchDisplayTeams(match)
  const favoriteTeamTotal = safeArr(favorites?.favoriteTeamIds).length
  const otherFavoriteTeams = Math.max(favoriteTeamTotal - 1, 0)
  const primaryMatchInRound = safeArr(hub?.currentRoundMatches)
    .some(row => row?.match_id === match.match_id)
  const otherRoundMatches = Math.max((hub?.followingRoundMatchCount || 0) - (primaryMatchInRound ? 1 : 0), 0)
  const broadcast = getBroadcastInfo(match)
  const primaryStream = broadcast.streamLinks[0] || null
  const casterText = getNicknameList(broadcast.casters)
  const refereeText = getNicknameList(broadcast.referees)
  const status = getMatchStatus(match)
  const streamLabel = status === 'finished' ? '查看回放' : status === 'live' ? '观看直播' : '进入直播间'

  return (
    <section className={styles.section} aria-labelledby="following-title" data-testid="following-section">
      <header className={styles.sectionHead}>
        <div>
          <MatchHubSectionLabel code="B / FOLLOWING" title="我的关注" />
          <h2 id="following-title">我的关注</h2>
        </div>
      </header>

      <div
        className={styles.followingCard}
        data-testid="following-summary"
        data-has-broadcast={broadcast.hasPublicInfo ? 'true' : 'false'}
      >
        <div className={styles.followingMain}>
          <header className={styles.followingMatchHead}>
            <div>
              <span className={styles.followingLabel}>主关注队伍下一场</span>
              <strong>{getRoundText(match)}</strong>
            </div>
            <div>
              <time>{getMatchTimeLabel(match)}</time>
              <span className={styles.followingStatus}>{getMatchStatusText(match)}</span>
            </div>
          </header>

          <div className={styles.followingDuel} title={`${teams.teamA.full} vs ${teams.teamB.full}`}>
            <FollowingTeam
              team={teams.teamA}
              source={match?.team_a}
              seasonId={seasonId}
              align="right"
            />
            <b>VS</b>
            <FollowingTeam team={teams.teamB} source={match?.team_b} seasonId={seasonId} />
          </div>

          <footer className={styles.followingMatchFooter}>
            <span className={styles.followingFormat}>{match.format || 'TBD'}</span>
            <div className={styles.followingStaff}>
              {casterText ? <p><b>解说</b>{casterText}</p> : null}
              {refereeText ? <p><b>赛管</b>{refereeText}</p> : null}
              {!casterText && !refereeText ? <p>直播人员待公布</p> : null}
            </div>
            {primaryStream ? (
              <a
                className={styles.followingLiveLink}
                href={primaryStream.url}
                target="_blank"
                rel="noreferrer"
              >
                {streamLabel} →
              </a>
            ) : null}
          </footer>
        </div>
        <div className={styles.followingSide}>
          <span className={styles.followingSideLabel}>FOLLOWING SNAPSHOT</span>
          <div className={styles.followingStats}>
            <p><strong>{otherFavoriteTeams}</strong><span>另外关注队伍</span></p>
            <p><strong>{otherRoundMatches}</strong><span>本轮相关比赛</span></p>
          </div>
          <div className={styles.followingActions}>
            <Link
              to={withSeason(`/matches/${match.match_id}`)}
              state={getReturnState(location)}
              onClick={() => saveReturnScroll(location)}
            >
              比赛详情
            </Link>
            <Link to={withSeason('/following')}>前往我的关注 →</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
