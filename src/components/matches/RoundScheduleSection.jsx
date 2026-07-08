import { useEffect, useState } from 'react'
import MatchHubRow from './MatchHubRow.jsx'
import MatchHubSectionLabel from './MatchHubSectionLabel.jsx'
import TimeSlotMatchList from './TimeSlotMatchList.jsx'
import styles from './MatchHub.module.css'

function getDefaultPanel(hasUpcoming, hasResults) {
  if (hasUpcoming) return 'upcoming'
  if (hasResults) return 'results'
  return 'upcoming'
}

export default function RoundScheduleSection({ hub }) {
  const slots = hub?.roundTimeSlots || []
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
        <div className={styles.timeSlotGrid} data-testid="time-slot-grid">
          {slots.map(slot => {
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
                  onToggle={() => {
                    setExpandedSlots(current => ({ ...current, [slot.key]: !current[slot.key] }))
                  }}
                />
              </article>
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
