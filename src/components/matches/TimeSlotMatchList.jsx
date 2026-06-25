import MatchHubRow from './MatchHubRow.jsx'
import styles from './MatchHub.module.css'

export default function TimeSlotMatchList({ slot, expanded, onToggle }) {
  if (!slot) {
    return (
      <div className={styles.timeSlotBody} data-testid="time-slot-match-list">
        <div className={styles.emptyCanvas}>暂无该时间段比赛。</div>
      </div>
    )
  }

  const matches = expanded ? slot.matches : slot.defaultMatches
  const canToggle = slot.matchCount > slot.defaultMatches.length

  return (
    <div className={styles.timeSlotBody} data-testid="time-slot-match-list">
      <div className={styles.matchRows}>
        {matches.map(match => (
          <MatchHubRow key={match.match_id} match={match} />
        ))}
      </div>
      {canToggle ? (
        <button type="button" className={styles.toggleButton} data-testid="time-slot-toggle" onClick={onToggle}>
          {expanded ? '收起' : `展开全部 ${slot.matchCount} 场`}
        </button>
      ) : null}
    </div>
  )
}
