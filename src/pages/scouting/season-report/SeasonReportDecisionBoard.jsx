import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatOwMapName } from '../../../lib/heroes.js'
import { createSeasonReportEvidence } from './SeasonReportEvidence.jsx'
import { createSeasonReportPrimitives } from './SeasonReportPrimitives.jsx'
import report from '../ScoutingReportPage.module.css'
import styles from './SeasonReport.module.css'

export function createSeasonReportDecisionBoard(adapter) {
  const { formatNumber, getComparisonColor, getComparisonFocus, getComparisonPlayers, getHeroMapRecords, getMetricReference, getPositionPlayers, localize, PLAYER_COPY, POSITION_CONFIG, previewLink, textFor } = adapter
  const { HeroRecords, PositionComparison, StageStatus } = createSeasonReportEvidence(adapter)
  const { EvidenceFocusSwitch, ReportDisclosure, ReportSectionHeading } = createSeasonReportPrimitives(adapter)

  function ComparisonFingerprint({ data, players, lang, focus }) {
    const metrics = focus === 'overall' ? POSITION_CONFIG[players[0].position].metrics : ['profileFloor', 'consistency']
    return <div className={report.comparisonProfilePanel}>
      <header><span>01 · DIRECT COMPARISON</span><h3>{textFor(lang, 'focus_' + focus)}</h3><p>{textFor(lang, 'focusHint_' + focus)}</p></header>
      <div className={report.comparisonProfileBody}>
        <div className={report.comparisonPlayerLegend}>{players.map(player => <span key={player.id} style={{ '--compare-player-color': getComparisonColor(player) }}><i aria-hidden="true" />{player.name}</span>)}</div>
        <div className={report.comparisonMetricMatrix}>{metrics.map(key => <div className={report.comparisonMetricRow} key={key}>
          <span>{textFor(lang, (focus === 'overall' ? 'metric_' : 'factor_') + key)}<small>{textFor(lang, focus === 'overall' ? 'per10' : 'indexFactorUnit')}</small></span>
          <div className={report.comparisonMetricRail} aria-hidden="true">{focus === 'overall' ? <i /> : null}{players.map(player => {
            const value = focus === 'overall' ? getMetricReference(data, player, key).percentile : player.factors[key]
            return <b key={player.id} style={{ '--compare-player-color': getComparisonColor(player), left: value + '%' }} />
          })}</div>
          <div className={report.comparisonMetricValues}>{players.map(player => {
            const reference = focus === 'overall' ? getMetricReference(data, player, key) : null
            const value = reference ? reference.value : player.factors[key]
            const digits = reference ? ['dmg', 'heal', 'block'].includes(key) ? 0 : 2 : 1
            return <span key={player.id} style={{ '--compare-player-color': getComparisonColor(player) }}><i aria-hidden="true" /><b>{player.name}</b><strong>{formatNumber(value, lang, digits)}</strong>{reference ? <small className={styles.metricRank}>{textFor(lang, 'poolRankPlain', { rank: reference.rank, total: reference.total })}</small> : null}</span>
          })}</div>
        </div>)}</div>
      </div>
    </div>
  }
  
  function PressureComparison({ players, navigation }) {
    const { lang } = navigation
    return <div className={styles.focusCards}>{players.map(player => {
      const pressure = player.context.pressure
      return <article className={report.profileCard + ' ' + styles.focusCard} key={player.id}>
        <h3>{player.name}</h3>
        <div className={styles.focusStat}><span>{textFor(lang, 'pressure')}</span><strong>{pressure.eligible ? formatNumber(pressure.adjustedScore, lang) : '—'}</strong><small>{textFor(lang, 'adjusted')}</small><p>{textFor(lang, 'series', { n: pressure.matches })} · {textFor(lang, 'maps', { n: pressure.maps })}</p>{!pressure.eligible ? <p className={styles.caution}>{textFor(lang, 'pressureLimited')}</p> : null}</div>
        <div className={styles.focusStat}><span>{textFor(lang, 'stageLabel')}</span><strong>{formatNumber(player.phases.playoffs.adjustedScore, lang)}</strong><small>{textFor(lang, 'adjusted')}</small><p>{textFor(lang, 'series', { n: player.stage.playoff.matches })} · {textFor(lang, 'maps', { n: player.stage.playoff.maps })}</p><StageStatus player={player} lang={lang} /></div>
        <Link className={styles.textLink} to={previewLink({ ...navigation, playerId: player.id, detail: true }) + '#context-evidence'}>{textFor(lang, 'viewPressure')} ↗</Link>
      </article>
    })}</div>
  }
  
  function HeroComparison({ players, navigation }) {
    const { lang } = navigation
    const locale = { zh: 'zh-CN', en: 'en-US', ko: 'ko-KR' }[lang]
    return <div className={styles.focusCards}>{players.map(player => {
      const records = getHeroMapRecords(player)
      return <article className={report.profileCard + ' ' + styles.focusCard} key={player.id}>
        <h3>{player.name}</h3><HeroRecords player={player} lang={lang} compact />
        <div className={styles.mapCoverage}><strong>{textFor(lang, 'mapCoverage', { n: records.maps.length })}</strong><div>{records.maps.slice(0, 3).map(map => <span key={map}>{formatOwMapName(map, locale)}</span>)}</div></div>
        <Link className={styles.textLink} to={previewLink({ ...navigation, playerId: player.id, detail: true }) + '#hero-map-evidence'}>{textFor(lang, 'viewHeroMaps')} ↗</Link>
      </article>
    })}</div>
  }
  
  function SeasonReportDecisionBoard({ data, position, navigation, onQueryChange }) {
    const { lang, detail, compare } = navigation
    const feedbackId = useId()
    const [feedback, setFeedback] = useState(null)
    const players = getComparisonPlayers(data, position, compare)
    const candidates = getPositionPlayers(data, position)
    const focus = getComparisonFocus(navigation.focus)
    const toggle = id => {
      const selected = players.some(player => player.id === id)
      if (selected && players.length === 2) return setFeedback('compareMinimum')
      if (!selected && players.length === 3) return setFeedback('compareMaximum')
      setFeedback(null)
      const ids = selected ? players.filter(player => player.id !== id).map(player => player.id) : [...players.map(player => player.id), id]
      onQueryChange('compare', ids.join(','))
    }
    return <section id="position-comparison" className={report.comparisonSection + ' ' + report.managerComparisonSection + ' ' + report.anchorSection} data-count={players.length} style={{ '--comparison-count': players.length }}>
      <ReportSectionHeading title={textFor(lang, 'compareTitle')} meta={textFor(lang, 'compareIntro')} eyebrow="01 · CANDIDATE COMPARISON" />
      <div className={report.comparePicker + ' ' + report.managerComparePicker}>
        <div className={report.comparePlayers}>
          <span>{textFor(lang, 'compareSelect')}</span>
          <div className={report.comparePlayerOptions} role="group" aria-label={textFor(lang, 'compareSelect')}>{candidates.map(player => {
            const selected = players.some(item => item.id === player.id)
            return <button type="button" key={player.id} className={selected ? report.comparePlayerActive : ''} aria-label={textFor(lang, 'compareToggle', { name: player.name })} aria-pressed={selected} aria-describedby={feedbackId} data-blocked={selected && players.length === 2 ? 'minimum' : !selected && players.length === 3 ? 'limit' : undefined} style={{ '--compare-player-color': getComparisonColor(player) }} onClick={() => toggle(player.id)}><i aria-hidden="true" /><b>{player.name}</b><small>{textFor(lang, 'rankOf', { rank: player.rank, total: player.poolSize })}</small></button>
          })}</div>
          <small>{textFor(lang, 'rankLegend')}</small>
        </div>
        <div id={feedbackId} className={report.comparePickerFeedback} role="status" data-state={players.length === 3 ? 'full' : 'ready'}><strong>{textFor(lang, 'compareCount', { n: players.length })}</strong><span>{textFor(lang, feedback || (players.length === 3 ? 'compareMaximum' : 'compareMinimum'))}</span></div>
        <nav className={report.managerSelectedDossiers} aria-label={textFor(lang, 'dossiers')}>{players.map(player => <Link key={player.id} to={previewLink({ ...navigation, playerId: player.id })} style={{ '--compare-player-color': getComparisonColor(player) }}><span><i aria-hidden="true" />{player.name}</span><b>{textFor(lang, 'profile')} ↗</b></Link>)}</nav>
      </div>
      <EvidenceFocusSwitch lang={lang} focus={focus} onChange={key => onQueryChange('focus', key === 'overall' ? null : key)} />
      {focus === 'overall' || focus === 'consistency' ? <ComparisonFingerprint data={data} players={players} lang={lang} focus={focus} /> : <><p className={styles.subheading}>{textFor(lang, 'focusHint_' + focus)}</p>{focus === 'pressure' ? <PressureComparison players={players} navigation={navigation} /> : <HeroComparison players={players} navigation={navigation} />}</>}
      <p className={styles.fine}>{textFor(lang, 'focusNoReweight')}</p>
      <div className={report.managerDecisionColumns + ' ' + styles.comparisonRead}>{players.map((player, index) => <article key={player.id}>
        <header><span>{'0' + (index + 1)}</span><strong>{player.name}</strong></header>
        <ol><li><b>01</b><p>{localize(PLAYER_COPY[player.id].lead, lang)}</p></li><li><b>02</b><p>{localize(PLAYER_COPY[player.id].watch, lang)}</p></li></ol>
      </article>)}</div>
      <ReportDisclosure title={textFor(lang, 'viewExactStats')} kicker="EXACT STATISTICS" open={detail}><PositionComparison data={data} players={players} lang={lang} /></ReportDisclosure>
    </section>
  }

  return SeasonReportDecisionBoard
}
