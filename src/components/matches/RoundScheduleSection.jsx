import { useEffect, useMemo, useState } from 'react'
import MatchHubRow from './MatchHubRow.jsx'
import MatchHubSectionLabel from './MatchHubSectionLabel.jsx'
import TimeSlotMatchList from './TimeSlotMatchList.jsx'
import styles from './MatchHub.module.css'

const EMPTY_TIME_SLOTS = []
const MAX_TIME_SLOT_COLUMNS = 3
const GROUP_VISIBLE_MATCH_LIMIT = 4

function getDefaultPanel(hasUpcoming, hasResults) {
  if (hasUpcoming) return 'upcoming'
  if (hasResults) return 'results'
  return 'upcoming'
}

function getSlotVisibleWeight(slot) {
  const defaultCount = slot?.defaultMatches?.length
  const matchCount = slot?.matchCount || slot?.matches?.length || 0
  const visibleCount = defaultCount || Math.min(matchCount || 1, GROUP_VISIBLE_MATCH_LIMIT)

  return Math.max(1, visibleCount)
}

function scoreTimeSlotGroups(groups, weights, targetWeight) {
  const sums = groups.map(group => group.reduce((sum, index) => sum + weights[index], 0))
  const spread = Math.max(...sums) - Math.min(...sums)
  const deviation = sums.reduce((sum, value) => sum + Math.abs(value - targetWeight), 0)
  const earlyMergeBias = groups.reduce((sum, group, index) => sum - group.length * (groups.length - index), 0)

  return { deviation, earlyMergeBias, spread }
}

function isBetterTimeSlotGrouping(score, bestScore) {
  if (!bestScore) return true
  if (score.spread !== bestScore.spread) return score.spread < bestScore.spread
  if (score.deviation !== bestScore.deviation) return score.deviation < bestScore.deviation
  return score.earlyMergeBias < bestScore.earlyMergeBias
}

function groupTimeSlots(slots, maxColumns = MAX_TIME_SLOT_COLUMNS) {
  if (!slots.length) return []

  const columnCount = Math.min(maxColumns, slots.length)
  if (slots.length <= columnCount) return slots.map(slot => [slot])

  const weights = slots.map(getSlotVisibleWeight)
  const targetWeight = weights.reduce((sum, value) => sum + value, 0) / columnCount
  let bestGroups = null
  let bestScore = null

  function visit(startIndex, groups) {
    const remainingGroups = columnCount - groups.length

    if (remainingGroups === 0) {
      if (startIndex !== slots.length) return
      const score = scoreTimeSlotGroups(groups, weights, targetWeight)

      if (isBetterTimeSlotGrouping(score, bestScore)) {
        bestGroups = groups
        bestScore = score
      }
      return
    }

    const maxEnd = slots.length - remainingGroups + 1
    for (let endIndex = startIndex + 1; endIndex <= maxEnd; endIndex += 1) {
      visit(endIndex, [...groups, Array.from({ length: endIndex - startIndex }, (_, offset) => startIndex + offset)])
    }
  }

  visit(0, [])

  return (bestGroups || []).map(group => group.map(index => slots[index]))
}

function getGroupedSlotRows(groupSlots) {
  if (groupSlots.length <= 1) return groupSlots.map(slot => ({ slot }))

  let remaining = GROUP_VISIBLE_MATCH_LIMIT

  return groupSlots.map((slot, index) => {
    const defaultCount = getSlotVisibleWeight(slot)
    const remainingSlots = groupSlots.length - index - 1
    const visibleLimit = Math.max(1, Math.min(defaultCount, remaining - remainingSlots))
    remaining -= visibleLimit

    return { slot, visibleLimit }
  })
}


export default function RoundScheduleSection({ hub }) {
  const slots = hub?.roundTimeSlots || EMPTY_TIME_SLOTS
  const defaultSlotKey = hub?.defaultTimeSlot?.key || slots[0]?.key || ''
  const hasUpcoming = Boolean(hub?.upcomingRoundMatches?.length)
  const hasResults = Boolean(hub?.recentFinishedMatches?.length)
  const defaultPanel = getDefaultPanel(hasUpcoming, hasResults)
  const [activePanel, setActivePanel] = useState(defaultPanel)
  const [expandedSlots, setExpandedSlots] = useState({})
  const sectionTitle = !hasUpcoming && hasResults ? '最近赛果' : '本轮赛程'
  const showTabs = hasUpcoming && hasResults
  const resultLimit = 9
  const resultRowsClassName = [
    styles.resultRows,
    styles.resultRowsGrid
  ].filter(Boolean).join(' ')
  const timeSlotGroups = useMemo(() => groupTimeSlots(slots), [slots])

  useEffect(() => {
    setActivePanel(defaultPanel)
  }, [defaultPanel])

  const showResults = activePanel === 'results' && hasResults

  return (
    <section className={styles.section} aria-labelledby="round-schedule-title" data-testid="round-schedule-section">
      <header className={styles.sectionHead}>
        <div>
          <MatchHubSectionLabel code="A / SCHEDULE" title={sectionTitle} />
          <h2 id="round-schedule-title">{sectionTitle}</h2>
        </div>
      </header>

      {showTabs ? (
        <div className={styles.statusTabs} role="tablist" aria-label="比赛状态" data-testid="match-status-tabs">
          {hasUpcoming ? (
            <button
              type="button"
              role="tab"
              aria-selected={activePanel === 'upcoming'}
              className={activePanel === 'upcoming' ? styles.tabActive : ''}
              onClick={() => setActivePanel('upcoming')}
            >
              下一开赛
            </button>
          ) : null}
          {hasResults ? (
            <button
              type="button"
              role="tab"
              aria-selected={activePanel === 'results'}
              className={showResults ? styles.tabActive : ''}
              onClick={() => setActivePanel('results')}
            >
              最近赛果
            </button>
          ) : null}
        </div>
      ) : null}

      {showResults ? (
        <div className={styles.resultCanvas} data-testid="recent-results-list">
          <div className={resultRowsClassName}>
            {hub.recentFinishedMatches.slice(0, resultLimit).map(match => (
              <MatchHubRow key={match.match_id} match={match} variant="result" />
            ))}
          </div>
        </div>
      ) : (
        <div
          className={styles.timeSlotGrid}
          data-testid="time-slot-grid"
          style={{ '--time-slot-columns': timeSlotGroups.length }}
        >
          {timeSlotGroups.map((groupSlots, columnIndex) => {
            const isActiveGroup = groupSlots.some(slot => slot.key === defaultSlotKey)
            const stackClassName = [
              styles.timeSlotStack,
              isActiveGroup ? styles.timeSlotStackActive : '',
              groupSlots.length > 1 ? styles.timeSlotStackGrouped : ''
            ].filter(Boolean).join(' ')

            return (
              <div key={`time-slot-stack-${columnIndex}`} className={stackClassName}>
              {getGroupedSlotRows(groupSlots).map(({ slot, visibleLimit }) => {
                const expanded = Boolean(expandedSlots[slot.key])
                const isDefaultSlot = slot.key === defaultSlotKey

                return (
                  <article
                    key={slot.key}
                    className={`${styles.timeSlotColumn} ${isDefaultSlot ? styles.timeSlotColumnActive : ''}`}
                  >
                    <header className={styles.timeSlotColumnHead} data-testid="time-slot-column-head">
                      <strong>{slot.title}</strong>
                      <span>{slot.matchCount} 场</span>
                    </header>
                    <TimeSlotMatchList
                      slot={slot}
                      expanded={expanded}
                      visibleLimit={visibleLimit}
                      onToggle={() => {
                        setExpandedSlots(current => ({ ...current, [slot.key]: !current[slot.key] }))
                      }}
                    />
                  </article>
                )
              })}
              </div>
            )
          })}
        </div>
      )}

      <p className={styles.scheduleNote}>
        赛程时间以最新公布信息为准。赛果与选手数据将在赛后核对完成后更新。
      </p>
    </section>
  )
}
