import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import MatchHubRow from './MatchHubRow.jsx'
import styles from './MatchHub.module.css'

function getVisibleDefaultMatches(slot, visibleLimit) {
  const defaultMatches = slot?.defaultMatches?.length ? slot.defaultMatches : slot?.matches || []

  if (!Number.isFinite(visibleLimit)) return defaultMatches
  return defaultMatches.slice(0, Math.max(0, visibleLimit))
}

export default function TimeSlotMatchList({ slot, expanded, onToggle, visibleLimit }) {
  const uiLocale = useUiLocale()
  if (!slot) {
    return (
      <div className={styles.timeSlotBody} data-testid="time-slot-match-list">
        <div className={styles.emptyCanvas}>{uiText("暂无该时间段比赛。", uiLocale)}</div>
      </div>
    )
  }

  const defaultMatches = getVisibleDefaultMatches(slot, visibleLimit)
  const matches = expanded ? slot.matches : defaultMatches
  const canToggle = slot.matchCount > defaultMatches.length
  const remainingCount = Math.max(0, slot.matchCount - defaultMatches.length)

  return (
    <div className={styles.timeSlotBody} data-testid="time-slot-match-list">
      <div className={styles.matchRows}>
        {matches.map(match => (
          <MatchHubRow key={match.match_id} match={match} />
        ))}
      </div>
      <footer className={styles.timeSlotFooter}>
        {canToggle ? (
          <button type="button" className={styles.toggleButton} data-testid="time-slot-toggle" onClick={onToggle}>
            {expanded ? uiText("收起", uiLocale) : uiText("展开剩余 {0} 场", uiLocale, [remainingCount])}
          </button>
        ) : (
          <span>{uiText("全部对阵已显示", uiLocale)}</span>
        )}
      </footer>
    </div>
  )
}
