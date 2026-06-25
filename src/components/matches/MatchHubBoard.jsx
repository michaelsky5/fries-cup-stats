import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchStatusText,
  getMatchTimeLabel,
  getRoundText
} from '../../lib/matchesSelectors.js'
import TeamLogo from './TeamLogo.jsx'
import styles from './MatchHub.module.css'

function BoardStat({ value, label, meta }) {
  return (
    <div className={styles.boardStat}>
      <strong>{value}</strong>
      <span>{label}</span>
      <em>{meta}</em>
    </div>
  )
}

function FeaturedBoardTeam({ team, seasonId, align = 'left' }) {
  const display = {
    short: team?.team_short_name || team?.short || team?.team_name || team?.name || 'TBD',
    full: team?.team_name || team?.name || team?.team_short_name || team?.short || 'TBD'
  }

  return (
    <span className={`${styles.boardFeaturedTeam} ${align === 'right' ? styles.boardFeaturedTeamRight : ''}`}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.boardFeaturedLogo} />
      <span>
        <strong>{display.short}</strong>
        <em>{display.full}</em>
      </span>
    </span>
  )
}

function FeaturedBoardRow({ match, index }) {
  const { withSeason = path => path, seasonId } = useOutletContext()
  const location = useLocation()
  const teams = getMatchDisplayTeams(match)
  const matchId = match?.match_id || match?.id || ''

  return (
    <Link
      to={withSeason(`/matches/${encodeURIComponent(matchId)}`)}
      state={{ returnTo: `${location.pathname}${location.search || ''}` }}
      className={styles.boardFeaturedRow}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
    >
      <span className={styles.boardFeaturedIndex}>{String(index).padStart(2, '0')}</span>
      <span className={styles.boardFeaturedDuel}>
        <FeaturedBoardTeam team={match?.team_a} seasonId={seasonId} align="right" />
        <b>VS</b>
        <FeaturedBoardTeam team={match?.team_b} seasonId={seasonId} />
      </span>
      <span className={styles.boardFeaturedMeta}>
        <time>{getMatchTimeLabel(match)}</time>
        <strong>{match?.format || 'TBD'}</strong>
        <em>{getMatchStatusText(match)}</em>
      </span>
      <span className={styles.boardFeaturedArrow} aria-hidden="true">→</span>
    </Link>
  )
}

export default function MatchHubBoard({ summary, featuredMatches = [] }) {
  const { withSeason = path => path } = useOutletContext()
  const roundLabel = summary?.roundLabel || 'ROUND 1'
  const total = summary?.totalMatches || 0
  const slotCount = summary?.timeSlotCount || 0
  const firstLabel = summary?.firstMatchLabel || '待定'
  const nextLabel = summary?.nextMatchLabel || '待定'
  const progressLabel = summary?.progress?.label || `0 / ${total}`

  return (
    <section className={styles.board} aria-labelledby="match-hub-title" data-testid="match-hub-board">
      <div className={styles.boardLead}>
        <div className={styles.boardTitle}>
          <span id="match-hub-title">MATCHES</span>
          <strong>赛程赛果</strong>
        </div>
        <p className={styles.roundMark}>{roundLabel} BOARD</p>
        <h1>本轮赛程</h1>
        <p>
          本轮从 {firstLabel} 开始，
          {total} 场比赛分为 {slotCount} 个开赛时段进行。
        </p>
        <nav className={styles.boardActions} aria-label="Match Hub actions">
          <Link to={withSeason('/matches?view=list&tab=round')}>查看全部比赛</Link>
          <Link to={withSeason('/following')}>我的关注</Link>
          <Link to={withSeason('/matches?view=list&focus=search')}>查找比赛 →</Link>
        </nav>
      </div>

      <div className={styles.boardStats} aria-label="Round 1 summary">
        <BoardStat value={total} label="本轮比赛" meta="MATCHES" />
        <BoardStat value={slotCount} label="开赛时段" meta="TIME SLOTS" />
        <BoardStat value={nextLabel} label="下一开赛" meta="NEXT" />
        <BoardStat value={progressLabel} label="本轮进度" meta="PROGRESS" />
      </div>

      <section className={styles.boardFeatured} aria-label="本轮重点比赛">
        <header className={styles.boardFeaturedHead}>
          <span>FEATURED MATCHES</span>
          <strong>本轮重点比赛</strong>
          <em>{roundLabel || getRoundText(featuredMatches[0])}</em>
        </header>
        <div className={styles.boardFeaturedRows}>
          {featuredMatches.length ? featuredMatches.map((match, index) => (
            <FeaturedBoardRow key={match?.match_id || match?.id || index} match={match} index={index + 1} />
          )) : (
            <div className={styles.boardFeaturedEmpty}>
              <strong>暂无重点比赛</strong>
              <span>赛程公布后将展示本轮代表性对阵。</span>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
