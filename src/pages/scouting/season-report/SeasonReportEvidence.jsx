import { useId, useState } from 'react'
import { formatOwHeroName, formatOwMapName, getOwHero } from '../../../lib/heroes.js'
import { createSeasonReportPrimitives } from './SeasonReportPrimitives.jsx'
import report from '../ScoutingReportPage.module.css'
import styles from './SeasonReport.module.css'

export function createSeasonReportEvidence(adapter) {
  const { formatNumber, getEvidenceMatches, getHeroMapRecords, getMetricReference, POSITION_CONFIG, textFor } = adapter
  const { ReportDisclosure, ReportSectionHeading } = createSeasonReportPrimitives(adapter)

  const localeOf = lang => ({ zh: 'zh-CN', en: 'en-US', ko: 'ko-KR' }[lang])
  
  function HeroIcon({ name, size = 36 }) {
    const hero = getOwHero(name)
    if (!hero) return null
    return <span className={report.heroIcon} style={{ width: size, height: size }}><img src={`/heroes/${hero.role}/${hero.assetKey.replace(/-/g, '_')}.png`} width={size} height={size} loading="lazy" decoding="async" alt="" /></span>
  }
  
  function StageStatus({ player, lang, explanation = false }) {
    const status = player.stage.playoff.status
    return <div className={styles.stageStatus} data-status={status}>
      <span><i aria-hidden="true" />{textFor(lang, `stage_${status}`)}</span>
      {explanation ? <p>{textFor(lang, `stageDesc_${status}`)}</p> : null}
    </div>
  }
  
  function HeroRecords({ player, lang, compact = false }) {
    const heroes = compact ? player.heroes.slice(0, 2) : player.heroes
    if (!compact) return <div className={report.heroPoolList}>{heroes.map(hero => <div className={report.heroPoolRow} key={hero.hero}>
      <HeroIcon name={hero.hero} size={42} />
      <div><strong>{formatOwHeroName(hero.hero, localeOf(lang))}</strong><span>{textFor(lang, 'maps', { n: hero.maps })} · {textFor(lang, 'series', { n: hero.matches })}</span></div>
      <div className={report.heroUsage} aria-hidden="true"><i style={{ width: `${hero.maps / player.scope.maps * 100}%` }} /></div><b>{formatNumber(hero.maps / player.scope.maps * 100, lang, 0)}%</b>
    </div>)}</div>
    return <div className={styles.heroTokens}>
      {heroes.map(hero => <div key={hero.hero} className={styles.heroRecord}>
        <HeroIcon name={hero.hero} size={compact ? 24 : 36} />
        <span>{formatOwHeroName(hero.hero, localeOf(lang))}</span>
        <small>{textFor(lang, 'maps', { n: hero.maps })}</small>
      </div>)}
    </div>
  }
  
  function HeroMapMatches({ player, selected, lang, id }) {
    return <div id={id} className={styles.heroMapMatches} aria-live="polite"><div><span>{textFor(lang, 'heroMapSelected')}</span><h3>{formatOwHeroName(selected.hero, localeOf(lang))} · {formatOwMapName(selected.map, localeOf(lang))}</h3></div><ul>{selected.matchIds.map(matchId => {
      const match = player.matches.find(item => item.id === matchId)
      const orders = match.mapsUsed.filter(map => map.hero === selected.hero && map.map === selected.map).map(map => map.order).join(' / ')
      return <li key={matchId}><a href={match.url} target="_blank" rel="noopener noreferrer"><span>{textFor(lang, match.stage === 'PLAYOFFS' ? 'playoffs' : 'group')}</span><strong>vs {match.opponent}</strong><small>{textFor(lang, 'mapOrders', { maps: orders })}</small><b aria-hidden="true">↗</b></a></li>
    })}</ul></div>
  }
  
  function HeroMapEvidence({ player, lang, detail }) {
    const records = getHeroMapRecords(player)
    const evidenceId = useId()
    const [selectedKey, setSelectedKey] = useState(null)
    const selected = records.cells.find(cell => cell.key === selectedKey) || records.cells[0]
    const cellButton = (cell, layout) => <button type="button" aria-label={textFor(lang, 'heroMapCell', { hero: formatOwHeroName(cell.hero, localeOf(lang)), map: formatOwMapName(cell.map, localeOf(lang)), n: cell.count })} aria-pressed={cell.key === selected?.key} aria-controls={`${evidenceId}-${layout}`} onClick={() => setSelectedKey(cell.key)} style={{ '--cell-strength': Math.min(.24, .05 + cell.count * .035) }}>{cell.count}</button>
    return <ReportDisclosure id="hero-map-evidence" title={textFor(lang, 'heroMapTitle')} meta={textFor(lang, 'mapCoverage', { n: records.maps.length })} kicker="HERO × MAP" open={detail}>
      <p className={styles.subheading}>{textFor(lang, 'heroMapIntro')}</p>
      <p className={styles.fine}>{textFor(lang, 'heroMapCaption', { n: records.total })}</p>
      <div className={styles.heroMapDesktop}><table className={styles.heroMapTable}>
        <caption className={styles.srOnly}>{textFor(lang, 'heroMapTitle')}</caption>
        <thead><tr><th scope="col">{textFor(lang, 'mapLabel')}</th>{records.heroes.map(hero => <th scope="col" key={hero}><HeroIcon name={hero} size={32} /><span>{formatOwHeroName(hero, localeOf(lang))}</span></th>)}</tr></thead>
        <tbody>{records.maps.map(map => <tr key={map}><th scope="row">{formatOwMapName(map, localeOf(lang))}</th>{records.heroes.map(hero => {
          const cell = records.cells.find(item => item.map === map && item.hero === hero)
          return <td key={hero}>{cell ? cellButton(cell, 'desktop') : <span className={styles.noRecord}>—</span>}</td>
        })}</tr>)}</tbody>
      </table>{selected ? <HeroMapMatches id={`${evidenceId}-desktop`} player={player} selected={selected} lang={lang} /> : null}</div>
      <div className={styles.heroMapMobile}>{records.maps.map(map => <article key={map}><h4>{formatOwMapName(map, localeOf(lang))}</h4><div className={styles.heroMapHeroList}>{records.cells.filter(cell => cell.map === map).map(cell => <div key={cell.key}><HeroIcon name={cell.hero} size={28} /><span>{formatOwHeroName(cell.hero, localeOf(lang))}</span>{cellButton(cell, 'mobile')}</div>)}</div>{selected?.map === map ? <HeroMapMatches id={`${evidenceId}-mobile`} player={player} selected={selected} lang={lang} /> : null}</article>)}</div>
      <p className={styles.fine}>{textFor(lang, 'heroMeasure')}</p>
    </ReportDisclosure>
  }
  
  function MetricTable({ data, player, lang }) {
    const keys = POSITION_CONFIG[player.position].metrics
    return <>
      <table className={styles.metricTable}>
        <caption>{textFor(lang, 'per10')}</caption>
        <thead><tr><th scope="col">{textFor(lang, 'metric')}</th><th scope="col">{textFor(lang, 'yourPlayer')}</th><th scope="col">{textFor(lang, 'poolMedian')}</th><th scope="col">{textFor(lang, 'metricRank')}</th></tr></thead>
        <tbody>{keys.map(key => {
          const metric = getMetricReference(data, player, key)
          const digits = ['dmg', 'heal', 'block'].includes(key) ? 0 : 2
          return <tr key={key}><th scope="row">{textFor(lang, `metric_${key}`)}</th><td>{formatNumber(metric.value, lang, digits)}</td><td>{formatNumber(metric.median, lang, digits)}</td><td>{metric.rank} / {metric.total}</td></tr>
        })}</tbody>
      </table>
      <p className={styles.fine}>{textFor(lang, 'metricRankNote')}</p>
    </>
  }
  
  function PlayerRadar({ data, player, lang }) {
    const titleId = useId()
    const keys = POSITION_CONFIG[player.position].metrics
    const metrics = keys.map(key => getMetricReference(data, player, key))
    const point = (index, value) => {
      const angle = -Math.PI / 2 + index * Math.PI / 2
      return [190 + Math.cos(angle) * 88 * value / 100, 139 + Math.sin(angle) * 88 * value / 100]
    }
    const polygon = value => keys.map((_, index) => point(index, value).join(',')).join(' ')
    const labels = [{ x: 190, y: 28, anchor: 'middle' }, { x: 374, y: 132, anchor: 'end' }, { x: 190, y: 266, anchor: 'middle' }, { x: 6, y: 132, anchor: 'start' }]
    return <section className={report.profileCard}>
      <header><h3>{textFor(lang, 'radarTitle')}</h3></header>
      <figure className={styles.radar}>
        <svg viewBox="0 0 380 284" role="img" aria-labelledby={titleId}>
          <title id={titleId}>{textFor(lang, 'radarAccessible', { name: player.name })}</title>
          {[25, 50, 75, 100].map(value => <polygon key={value} points={polygon(value)} className={value === 50 ? styles.medianRing : styles.radarRing} />)}
          {keys.map((key, index) => {
            const [x, y] = point(index, 100)
            return <line key={key} x1="190" y1="139" x2={x} y2={y} className={styles.radarAxis} />
          })}
          <polygon points={metrics.map((metric, index) => point(index, metric.percentile).join(',')).join(' ')} className={styles.radarFill} />
          {metrics.map((metric, index) => { const [x, y] = point(index, metric.percentile); return <circle key={keys[index]} cx={x} cy={y} r="3.5" className={styles.radarDot} /> })}
          {keys.map((key, index) => <text key={key} x={labels[index].x} y={labels[index].y} textAnchor={labels[index].anchor}>{textFor(lang, `metric_${key}`)}</text>)}
        </svg>
        <figcaption><span className={styles.solidLegend}>{player.name}</span><span className={styles.dashLegend}>{textFor(lang, 'poolMedian')}</span></figcaption>
      </figure>
      <p className={styles.fine}>{textFor(lang, 'radarHint')} {textFor(lang, 'lowerBetter')}</p>
      <MetricTable data={data} player={player} lang={lang} />
    </section>
  }
  
  function PositionComparison({ data, players, lang }) {
    const keys = POSITION_CONFIG[players[0].position].metrics
    return <section>
      <h3>{textFor(lang, 'compareHeading')}</h3>
      <p className={styles.subheading}>{textFor(lang, 'compareSubheading')}</p>
      <table className={styles.comparisonTable}>
        <thead><tr><th scope="col">{textFor(lang, 'player')}</th>{keys.map(key => <th scope="col" key={key}>{textFor(lang, `metric_${key}`)}</th>)}<th scope="col">{textFor(lang, 'adjusted')}</th></tr></thead>
        <tbody>{players.map(player => <tr key={player.id}><th scope="row">{player.name}<small>{player.team}</small></th>{keys.map(key => <td key={key} data-label={textFor(lang, `metric_${key}`)}>{formatNumber(player.metrics[key], lang, ['dmg', 'heal', 'block'].includes(key) ? 0 : 2)}</td>)}<td data-label={textFor(lang, 'adjusted')}>{formatNumber(player.context.estimate, lang)}</td></tr>)}
          <tr className={styles.medianRow}><th scope="row">{textFor(lang, 'poolMedian')}</th>{keys.map(key => <td key={key} data-label={textFor(lang, `metric_${key}`)}>{formatNumber(getMetricReference(data, players[0], key).median, lang, ['dmg', 'heal', 'block'].includes(key) ? 0 : 2)}</td>)}<td data-label={textFor(lang, 'adjusted')}>—</td></tr>
        </tbody>
      </table>
      <p className={styles.fine}>{textFor(lang, 'comparisonCaution')}</p>
    </section>
  }
  
  function MatchCard({ match, lang }) {
    const date = new Date(match.scheduledAt).toLocaleDateString(localeOf(lang), { month: 'short', day: 'numeric', timeZone: 'Asia/Singapore' })
    return <article className={`${report.profileCard} ${styles.matchCard}`}>
      <header><span>{textFor(lang, match.stage === 'PLAYOFFS' ? 'playoffs' : 'group')} · {date}</span><strong>vs {match.opponent}</strong></header>
      <div className={styles.matchValue}><span>{textFor(lang, 'adjusted')}</span><b>{formatNumber(match.adjustedScore, lang)}</b></div>
      <p>{textFor(lang, 'mapOrders', { maps: match.mapsUsed.map(map => map.order).join(' / ') })}</p>
      <details className={styles.mapDetails}><summary>{textFor(lang, 'mapDetail')}</summary><ul>{match.mapsUsed.map(map => <li key={map.order}><b>{String(map.order).padStart(2, '0')}</b><span>{formatOwMapName(map.map, localeOf(lang))}</span><HeroIcon name={map.hero} size={24} /><small>{formatOwHeroName(map.hero, localeOf(lang))}</small></li>)}</ul></details>
      <a href={match.url} target="_blank" rel="noopener noreferrer">{textFor(lang, 'matchCta')} <span aria-hidden="true">↗</span></a>
    </article>
  }
  
  function MatchEvidence({ player, lang }) {
    return <section className={styles.evidenceSection} id="match-evidence">
      <ReportSectionHeading title={textFor(lang, 'evidenceTitle')} meta={textFor(lang, 'evidenceHint')} eyebrow="MATCH EVIDENCE" />
      <div className={styles.twoColumns}>{getEvidenceMatches(player).map(match => <MatchCard key={match.id} match={match} lang={lang} />)}</div>
      <ReportDisclosure title={textFor(lang, 'allMatches', { n: player.matches.length })} kicker="MATCH RECORDS">
        <div className={styles.matchList}>{player.matches.map(match => <a key={match.id} href={match.url} target="_blank" rel="noopener noreferrer">
          <span>{textFor(lang, match.stage === 'PLAYOFFS' ? 'playoffs' : 'group')}</span><strong>vs {match.opponent}</strong>
          <span>{textFor(lang, 'mapOrders', { maps: match.mapsUsed.map(map => map.order).join(' / ') })}</span>
          <b aria-label={`${textFor(lang, 'adjusted')} ${match.adjustedScore}`}>{formatNumber(match.adjustedScore, lang)} ↗</b>
        </a>)}</div>
        <p className={styles.fine}>{textFor(lang, 'sourceCaution')}</p>
      </ReportDisclosure>
    </section>
  }
  
  function ModelEvidence({ player, lang, detail }) {
    const neutralStage = player.stage.playoff.status !== 'COMPARABLE' && player.stage.change.status !== 'COMPARABLE'
    return <ReportDisclosure title={textFor(lang, 'modelTitle')} meta={`${textFor(lang, 'technicalIndex')} ${formatNumber(player.score, lang)}`} kicker="MODEL EXPLANATION" open={detail}>
      <p className={styles.subheading}>{textFor(lang, 'modelHint')}</p>
      <div className={styles.factorList}>{player.contributions.map(factor => <div className={styles.factorRow} key={factor.key}>
        <div><h3>{textFor(lang, `factor_${factor.key}`)}</h3><p>{textFor(lang, `factorDesc_${factor.key}`)}</p></div>
        <dl><div><dt>{textFor(lang, 'factorIndex')}</dt><dd>{formatNumber(factor.value, lang)}{factor.key === 'stageValidation' && neutralStage ? <small>{textFor(lang, 'neutral')}</small> : null}</dd></div><div><dt>{textFor(lang, 'weight')}</dt><dd>{formatNumber(factor.weight * 100, lang)}%</dd></div><div><dt>{textFor(lang, 'points')}</dt><dd>+{formatNumber(factor.points, lang)}</dd></div></dl>
      </div>)}</div>
    </ReportDisclosure>
  }
  
  function ContextEvidence({ player, lang, detail }) {
    const [low, high] = player.context.interval90
    return <ReportDisclosure id="context-evidence" title={textFor(lang, 'contextTitle')} kicker="CONTEXT & UNCERTAINTY" open={detail}>
      <div className={styles.phaseGrid}>{['earlier', 'playoffs'].map(phase => <article key={phase}>
        <span>{textFor(lang, phase === 'earlier' ? 'group' : 'playoffs')}</span>
        <strong>{formatNumber(player.phases[phase].adjustedScore, lang)}</strong>
        <span>{textFor(lang, 'adjusted')}</span>
        <small>{textFor(lang, 'series', { n: player.phases[phase].matches })} · {textFor(lang, 'maps', { n: player.phases[phase].maps })}</small>
      </article>)}</div>
      <StageStatus player={player} lang={lang} explanation />
      <p className={styles.fine}>{textFor(lang, 'phaseCaution')} <b>{textFor(lang, player.stage.change.status === 'COMPARABLE' ? 'changeObserved' : 'changeUnknown')}</b></p>
      <div className={styles.interval}>
        <h3>{textFor(lang, 'interval')}</h3><strong>{formatNumber(low, lang)} – {formatNumber(high, lang)}</strong>
        <div className={styles.intervalTrack} aria-hidden="true"><i style={{ left: `${Math.max(0, low)}%`, width: `${Math.min(100, high) - Math.max(0, low)}%` }} /><b style={{ left: `${player.context.estimate}%` }} /></div>
        <p className={styles.fine}>{textFor(lang, 'intervalHint')}</p>
      </div>
      <div className={styles.pressureLine}><div><h3>{textFor(lang, 'pressure')}</h3><p>{textFor(lang, 'series', { n: player.context.pressure.matches })} · {textFor(lang, 'maps', { n: player.context.pressure.maps })}</p></div><strong>{formatNumber(player.context.pressure.adjustedScore, lang)}<small>{textFor(lang, 'adjusted')}</small></strong></div>
      <p className={styles.fine}>{textFor(lang, 'pressureHint')}</p>
    </ReportDisclosure>
  }
  
  function StabilityEvidence({ player, lang, detail }) {
    const review = player.review
    return <ReportDisclosure title={textFor(lang, 'reviewTitle')} kicker="SHORTLIST STABILITY" open={detail}>
      <div className={styles.reviewHeadline}><strong>{review.retained}<span> / {review.total}</span></strong><p>{textFor(lang, 'retainedCount', { n: review.retained, total: review.total })}{review.ties ? <span>{textFor(lang, 'tieCount', { n: review.ties })}</span> : null}</p></div>
      <div className={styles.countGrid} aria-hidden="true">{Array.from({ length: review.total }, (_, index) => <i key={index} data-state={index < review.retained ? 'retained' : index < review.retained + review.ties ? 'tie' : 'out'} />)}</div>
      <p>{textFor(lang, 'reviewRank', { min: review.minRank, max: review.maxRank })}</p>
      <p className={styles.fine}>{textFor(lang, 'reviewHint')}</p>
      <div className={styles.weightReview}><h3>{textFor(lang, 'weightReview')}</h3><strong>{formatNumber(review.weightRetained, lang, Number.isInteger(review.weightRetained) ? 0 : 1)} / {formatNumber(review.weightTrials, lang, 0)}</strong><p className={styles.fine}>{textFor(lang, 'weightReviewHint')}</p></div>
    </ReportDisclosure>
  }
  
  function Methodology({ id, data, lang }) {
    return <ReportDisclosure id={id} title={textFor(lang, 'methodology')} kicker="METHODOLOGY">
      <p className={styles.subheading}>{textFor(lang, 'methodologyIntro')}</p>
      <ul className={styles.methodList}>{['methodSample', 'methodMaps', 'methodOpponents', 'methodScore', 'methodMissing'].map(key => <li key={key}>{textFor(lang, key)}</li>)}</ul>
      <a className={styles.textLink} href={data.source.url} target="_blank" rel="noopener noreferrer">{textFor(lang, 'source')} ↗</a>
    </ReportDisclosure>
  }

  return { HeroIcon, StageStatus, HeroRecords, HeroMapEvidence, MetricTable, PlayerRadar, PositionComparison, MatchEvidence, ModelEvidence, ContextEvidence, StabilityEvidence, Methodology }
}
