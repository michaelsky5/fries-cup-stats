import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import AdvancePhaseHero from './AdvancePhaseHero.jsx'
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
  const uiLocale = useUiLocale()
  if (!matches.length) return null

  return (
    <section className={styles.keyMatches}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>KEY MATCHES</span>
          <h2>{t('advance.swiss.keyMatches', uiText("本轮关键比赛", uiLocale))}</h2>
        </div>
        <Link to={withSeason('/matches?view=list&tab=round')}>{t('advance.common.allMatches', uiText("完整比赛", uiLocale))}</Link>
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
  const uiLocale = useUiLocale()
  const [activeZone, setActiveZone] = useState('all')
  const visibleRows = useMemo(() => {
    if (activeZone === 'all') return rows
    return rows.filter(row => row.status === activeZone)
  }, [activeZone, rows])
  const handleZoneSelect = zone => {
    setActiveZone(current => current === zone ? 'all' : zone)
  }
  const hero = (
    <AdvancePhaseHero
      eyebrow="SWISS STAGE"
      title={t('advance.swiss.heroTitle', uiText("瑞士轮积分榜", uiLocale))}
      description={t('advance.swiss.heroDesc', uiText("6 轮瑞士制 · 5 胜直通季后赛 · 3 胜进入突围赛 · 4 负出局", uiLocale))}
      metrics={[
        { value: overview.teamCount, label: t('advance.swiss.teams', uiText("支队伍", uiLocale)) },
        { value: overview.rounds, label: t('advance.swiss.rounds', uiText("轮比赛", uiLocale)) },
        {
          value: `${overview.rules.directSlots || 4} / ${overview.rules.breakthroughSlots || 20}`,
          label: t('advance.swiss.routeSlots', uiText("直通 / 突围", uiLocale)),
          accent: true
        }
      ]}
    />
  )

  if (!overview.hasStarted) {
    return (
      <div className={styles.phaseStack}>
        <section className={styles.swissDashboard}>
          {hero}
          <SwissSummary overview={overview} t={t} withSeason={withSeason} />
        </section>
        <div className={styles.infoGrid}>
          <TiebreakerPanel rules={tiebreakers} t={t} />
          <section className={styles.futureList}>
            <span className={styles.sectionLabel}>AFTER START</span>
            <h2>{t('advance.swiss.afterStartTitle', uiText("比赛开始后展示", uiLocale))}</h2>
            <ul>
              <li>{t('advance.swiss.afterStartStandings', uiText("完整积分榜", uiLocale))}</li>
              <li>{t('advance.swiss.afterStartZones', uiText("晋级区 / 突围区 / 竞争区 / 危险区 / 已出局队伍", uiLocale))}</li>
              <li>{t('advance.swiss.afterStartTiebreakers', uiText("同分规则与当前关键比赛", uiLocale))}</li>
            </ul>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.phaseStack}>
      <section className={styles.swissDashboard}>
        {hero}
        <SwissSummary overview={overview} t={t} withSeason={withSeason} />
        <SwissZoneSummary
          zones={zones}
          t={t}
          archive={overview.seasonFinished || overview.swissFinished}
          activeZone={activeZone}
          onZoneSelect={handleZoneSelect}
        />
      </section>
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
