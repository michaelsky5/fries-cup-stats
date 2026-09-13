import { translateUiText as uiText } from '../../lib/uiText.js'
import { getAnalysisMember } from './teamAnalysisReading.js'
import { memberQuickRead } from './teamPerformanceReadings.js'
import { PERFORMANCE_METRICS } from './teamPerformance.js'
import { roleLabel, valueLabel } from './TeamPerformancePrimitives.jsx'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import MissingHeroPortrait from '../../components/media/MissingHeroPortrait.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import styles from './TeamAnalysisReading.module.css'

export default function TeamAnalysisPlayerPeek({ report, params, updateQuery, onInspect, en, locale }) {
  const member = getAnalysisMember(report, params)
  if (!member) return null
  const reading = memberQuickRead(member, report.records.length)
  const hero = member.maps ? member.heroes[0]?.hero : null
  return <section className={styles.playerPeek} id="analysis-player-peek" aria-labelledby="analysis-player-title">
    <header className={styles.playerHeader}>
      <div><span>PLAYER CHECK</span><h2 id="analysis-player-title">{en ? 'The player, in context.' : uiText("把表现，放回选手身上。", locale)}</h2></div>
      <label>{en ? 'Player' : uiText("查看成员", locale)}<select aria-label={en ? 'Overview player' : uiText("速览成员", locale)} value={member.id} onChange={event => updateQuery({ member: event.target.value, performanceMember: null, analysisView: 'brief' })}>
        {report.members.map(player => <option value={player.id} key={player.id}>{player.name} · {roleLabel(player.role, en)}</option>)}
      </select></label>
    </header>
    <div className={styles.playerBody} aria-live="polite">
      <div className={styles.playerIdentity}>
        <div className={styles.playerArt} data-missing={!hero}>{hero ? <HeroArtwork hero={hero} variant="spotlight" decorative locale={locale} /> : <MissingHeroPortrait locale={locale} />}</div>
        <div className={styles.playerName}><span>{roleLabel(member.role, en)}</span><h3>{member.name}</h3><p>{member.maps ? (en ? `${member.maps} / ${report.records.length} maps · ${Math.round(reading.appearance * 100)}% appearance share` : uiText("{0} / {1} 图出场 · 占比 {2}%", locale, [member.maps, report.records.length, Math.round(reading.appearance * 100)])) : (en ? 'No recorded appearances in this scope.' : uiText("当前范围暂无出场记录。", locale))}</p></div>
        <small className={styles.heroNote}>{hero ? (en ? 'Most recorded hero · ' : uiText("记录最多的英雄 · ", locale)) + formatOwHeroName(hero, locale) : (en ? 'No hero data' : uiText("暂无英雄数据", locale))}</small>
      </div>
      {member.maps ? <div className={styles.playerMeasures}>
        <div className={styles.measureLabels}><span>{en ? 'Per 10 min' : uiText("每 10 分钟", locale)}</span><span>{member.name}</span><span>{en ? 'Opposing role' : uiText("对手同职责", locale)}</span><span>{en ? 'Difference' : uiText("差异", locale)}</span></div>
        {reading.measures.map(measure => {
          const metric = PERFORMANCE_METRICS.find(item => item.id === measure.id)
          const max = Math.max(measure.own || 0, measure.opponent || 0, 1)
          return <button type="button" key={measure.id} onClick={() => onInspect(member, measure.id)} aria-label={en ? `Inspect ${member.name}: ${metric.en}` : uiText("查看 {0} 的{1}详细对照", locale, [member.name, metric.zh])}>
            <span className={styles.metricName}>{en ? metric.en : uiText(metric.zh, locale)}<small>{measure.count} {en ? 'paired maps' : uiText("图可比", locale)}</small></span>
            <span className={styles.metricOwn}><b>{valueLabel(measure.own)}</b>{measure.own !== null ? <i aria-hidden="true" style={{ width: measure.own / max * 100 + '%' }} /> : null}</span>
            <span className={styles.metricReference}><span className={styles.referenceLabel}>{en ? 'Opposing role' : uiText("对手同职责", locale)} </span><b>{valueLabel(measure.opponent)}</b>{measure.opponent !== null ? <i aria-hidden="true" style={{ width: measure.opponent / max * 100 + '%' }} /> : null}</span>
            <span className={styles.metricDelta}>{measure.difference === null ? '—' : `${measure.difference > 0 ? '+' : ''}${measure.difference.toFixed(1)}%`} <i aria-hidden="true">↗</i></span>
          </button>
        })}
        <p>{en ? 'Same maps, same recorded role; opposing players are time-weighted. Higher is not always better.' : uiText("对照同场同职责选手，按出场时间加权；数值高低不直接等于好坏。", locale)}</p>
      </div> : <div className={styles.playerEmpty}><p>{en ? 'Performance values remain unknown. The registered profile is still available.' : uiText("表现数值保持未知，仍可查看已登记的成员资料。", locale)}</p></div>}
    </div>
    <button className={styles.playerMore} type="button" onClick={() => onInspect(member)}>{en ? 'Explore player performance' : uiText("查看这位成员的完整表现", locale)} <span aria-hidden="true">↗</span></button>
  </section>
}
