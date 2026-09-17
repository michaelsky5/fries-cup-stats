import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchStatusText
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

function splitDateTime(label) {
  const parts = String(label || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { date: label || '待定', time: '' }
  return { date: parts[0], time: parts.slice(1).join(' ') }
}

function getRoundPosterMark(label) {
  const text = String(label || '').trim().toUpperCase()
  const number = text.match(/\d+/)?.[0]

  if (/GRAND|FINAL|总决|决赛/.test(text)) return 'FINALS'
  if (/PLAY\s*OFF|PLAYOFF|季后/.test(text)) return 'PLAYOFFS'
  if (/LCQ|LAST\s*CHANCE|突围/.test(text)) return 'LCQ'
  if (/GROUP|小组/.test(text)) return 'GROUP'
  if (/SWISS|ROUND|瑞士/.test(text) && number) return 'SWISS'
  if (number) return `ROUND ${number}`
  return text || 'MATCH'
}

function BoardNextTeam({ team, display, seasonId, align = 'left' }) {
  return (
    <span className={`${styles.boardNextTeam} ${align === 'right' ? styles.boardNextTeamRight : ''}`} title={display.full}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.boardNextLogo} />
      <span className={styles.boardNextTeamCopy}>
        <strong>{display.short}</strong>
        <em>{display.full}</em>
      </span>
    </span>
  )
}

function BoardNextTicket({ match, nextParts, seasonId }) {
  const uiLocale = useUiLocale()
  const teams = match ? getMatchDisplayTeams(match) : null

  return (
    <div className={styles.boardNextTicket}>
      <div className={styles.boardNextHead}>
        <span>NEXT MATCH</span>
        <em>{uiText("下一开赛", uiLocale)}</em>
      </div>
      {teams ? (
        <div className={styles.boardNextDuel}>
          <BoardNextTeam team={match?.team_a} display={teams.teamA} seasonId={seasonId} align="right" />
          <b>VS</b>
          <BoardNextTeam team={match?.team_b} display={teams.teamB} seasonId={seasonId} />
        </div>
      ) : (
        <div className={`${styles.boardNextDuel} ${styles.boardNextDuelEmpty}`}>
          <strong>{uiText("待定", uiLocale)}</strong>
        </div>
      )}
      <div className={styles.boardNextMeta}>
        <time>{nextParts.date}{nextParts.time ? ` ${nextParts.time}` : ''}</time>
        {match?.format ? <span>{match.format}</span> : null}
        {match ? <span>{getMatchStatusText(match)}</span> : null}
      </div>
    </div>
  )
}

function BoardProgress({ finished, total, progress, label = '本轮进度' }) {
  const uiLocale = useUiLocale()
  const percentLabel = `${Math.round(progress)}%`

  return (
    <div className={`${styles.boardStat} ${styles.boardProgressStat}`} style={{ '--board-progress': `${progress}%` }}>
      <strong>{percentLabel}</strong>
      <span>{uiText(label, uiLocale)}</span>
      <em className={styles.boardProgressMeta}>{finished} / {total}{uiText(" 已完成", uiLocale)}</em>
      <i aria-hidden="true" />
    </div>
  )
}

export default function MatchHubBoard({ summary }) {
  const uiLocale = useUiLocale()
  const { withSeason = path => path, seasonId } = useOutletContext()
  const roundLabel = summary?.roundLabel || 'ROUND 1'
  const roundMark = getRoundPosterMark(roundLabel)
  const total = summary?.totalMatches || 0
  const slotCount = summary?.timeSlotCount || 0
  const firstLabel = summary?.firstMatchLabel || '待定'
  const nextMatch = summary?.nextMatch || null
  const nextLabel = summary?.nextMatchLabel || '待定'
  const nextParts = splitDateTime(nextLabel)
  const finishedCount = summary?.progress?.finished || 0
  const progressPercent = total ? Math.min(100, Math.max(0, (finishedCount / total) * 100)) : 0
  const isGroupDay = String(summary?.stage || '').toUpperCase() === 'GROUP'

  return (
    <section className={styles.board} aria-labelledby="match-hub-title" data-testid="match-hub-board">
      <div className={styles.boardLead} data-round-mark={roundMark}>
        <div className={styles.boardTitle}>
          <span id="match-hub-title">MATCHES</span>
          <strong>{uiText("赛程赛果", uiLocale)}</strong>
        </div>
        <p className={styles.roundMark}>{roundLabel}</p>
        <h1>{isGroupDay ? uiText("小组赛赛程", uiLocale) : uiText("本轮赛程", uiLocale)}</h1>
        <p>
          {isGroupDay ? uiText("本比赛日", uiLocale) : uiText("本轮", uiLocale)}{uiText("从 ", uiLocale)}{firstLabel}{uiText(" 开始，", uiLocale)}{total}{uiText(" 场比赛分为 ", uiLocale)}{slotCount}{uiText(" 个开赛时段进行。", uiLocale)}</p>
        <nav className={styles.boardActions} aria-label="Match Hub actions">
          <Link to={withSeason('/matches?view=list&tab=round')}>{uiText("查看完整赛程", uiLocale)}</Link>
          <Link to={withSeason('/me')}>{uiText("我的空间", uiLocale)}</Link>
        </nav>
      </div>

      <div className={styles.boardStats} aria-label={`${roundLabel} summary`}>
        <BoardNextTicket match={nextMatch} nextParts={nextParts} seasonId={seasonId} />
        <div className={styles.boardMetricGrid}>
          <BoardStat value={total} label={isGroupDay ? uiText("当日比赛", uiLocale) : uiText("本轮比赛", uiLocale)} meta="MATCHES" />
          <BoardStat value={slotCount} label={uiText("开赛时段", uiLocale)} meta="TIME SLOTS" />
          <BoardProgress
            finished={finishedCount}
            total={total}
            progress={progressPercent}
            label={isGroupDay ? uiText("本比赛日进度", uiLocale) : uiText("本轮进度", uiLocale)}
          />
        </div>
      </div>
    </section>
  )
}
