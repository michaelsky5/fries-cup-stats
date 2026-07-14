import { useEffect, useState } from 'react'
import MatchHubRow from './MatchHubRow.jsx'
import MatchHubSectionLabel from './MatchHubSectionLabel.jsx'
import styles from './MatchHub.module.css'

const EMPTY_TIME_SLOTS = []

function getDefaultPanel(hasUpcoming, hasResults) {
  if (hasUpcoming) return 'upcoming'
  if (hasResults) return 'results'
  return 'upcoming'
}

export default function RoundScheduleSection({ hub }) {
  const slots = hub?.roundTimeSlots || EMPTY_TIME_SLOTS
  const upcomingMatches = hub?.activeRoundMatches || slots.flatMap(slot => slot.matches || [])
  const hasUpcoming = Boolean(upcomingMatches.length)
  const hasResults = Boolean(hub?.recentFinishedMatches?.length)
  const defaultPanel = getDefaultPanel(hasUpcoming, hasResults)
  const [activePanel, setActivePanel] = useState(defaultPanel)
  const sectionTitle = !hasUpcoming && hasResults ? '最近赛果' : '本轮赛程'
  const showTabs = hasUpcoming && hasResults
  const resultLimit = 9
  const resultRowsClassName = [
    styles.resultRows,
    styles.resultRowsGrid
  ].filter(Boolean).join(' ')
  const upcomingRowsClassName = [
    styles.resultRows,
    styles.resultRowsGrid,
    styles.upcomingRowsGrid
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
        <div className={styles.scheduleCanvas} data-testid="time-slot-grid">
          <div className={upcomingRowsClassName}>
            {upcomingMatches.map(match => (
              <MatchHubRow key={match.match_id} match={match} variant="upcoming" />
            ))}
          </div>
        </div>
      )}

      <p className={styles.scheduleNote}>
        赛程时间以最新公布信息为准。赛果与选手数据将在赛后核对完成后更新。
      </p>
    </section>
  )
}
