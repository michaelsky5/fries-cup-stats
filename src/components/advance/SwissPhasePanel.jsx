import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import SwissSummary from './SwissSummary.jsx'
import SwissZoneSummary from './SwissZoneSummary.jsx'
import SwissStandingsTable from './SwissStandingsTable.jsx'
import TiebreakerPanel from './TiebreakerPanel.jsx'
import { formatShortDateTime, teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

function KeyMatches({ matches, t, withSeason }) {
  if (!matches.length) return null

  return (
    <section className={styles.keyMatches}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>KEY MATCHES</span>
          <h2>{t('advance.swiss.keyMatches', '本轮关键比赛')}</h2>
        </div>
        <Link to={withSeason('/matches?view=list&tab=round')}>{t('advance.common.allMatches', '完整比赛')}</Link>
      </header>
      <div className={styles.keyMatchGrid}>
        {matches.map(match => (
          <Link key={matchRouteId(match)} to={withSeason(`/matches/${matchRouteId(match)}`)}>
            <span>{match.round || match.stage}</span>
            <strong>{teamShort(match.team_a)} VS {teamShort(match.team_b)}</strong>
            <em>{formatShortDateTime(match) || t('advance.common.tbd', 'TBD')}</em>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function SwissPhasePanel({
  overview,
  zones,
  rows,
  tiebreakers,
  keyMatches,
  seasonId,
  t,
  withSeason
}) {
  const [activeZone, setActiveZone] = useState('all')
  const visibleRows = useMemo(() => {
    if (activeZone === 'all') return rows
    return rows.filter(row => row.status === activeZone)
  }, [activeZone, rows])
  const handleZoneSelect = zone => {
    setActiveZone(current => current === zone ? 'all' : zone)
  }

  if (!overview.hasStarted) {
    return (
      <div className={styles.phaseStack}>
        <SwissSummary overview={overview} t={t} withSeason={withSeason} />
        <div className={styles.infoGrid}>
          <TiebreakerPanel rules={tiebreakers} t={t} />
          <section className={styles.futureList}>
            <span className={styles.sectionLabel}>AFTER START</span>
            <h2>{t('advance.swiss.afterStartTitle', '比赛开始后展示')}</h2>
            <ul>
              <li>{t('advance.swiss.afterStartStandings', '完整积分榜')}</li>
              <li>{t('advance.swiss.afterStartZones', '晋级区 / 突围区 / 竞争区 / 危险区 / 已出局队伍')}</li>
              <li>{t('advance.swiss.afterStartTiebreakers', '同分规则与当前关键比赛')}</li>
            </ul>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.phaseStack}>
      <SwissSummary overview={overview} t={t} withSeason={withSeason} />
      <SwissZoneSummary
        zones={zones}
        t={t}
        archive={overview.seasonFinished || overview.swissFinished}
        activeZone={activeZone}
        onZoneSelect={handleZoneSelect}
      />
      <SwissStandingsTable
        rows={visibleRows}
        allRows={rows}
        activeZone={activeZone}
        seasonId={seasonId}
        t={t}
        withSeason={withSeason}
        tiebreakers={tiebreakers}
      />
      <KeyMatches matches={keyMatches} t={t} withSeason={withSeason} />
    </div>
  )
}
