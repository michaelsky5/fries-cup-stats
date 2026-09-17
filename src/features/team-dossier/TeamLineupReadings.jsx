import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwHeroName, getOwHeroRole } from '../../lib/heroes.js'
import { lineupContexts } from './teamPerformanceReadings.js'
import { HeroPortrait, PerformanceEvidence, roleLabel } from './TeamPerformancePrimitives.jsx'
import TeamReviewRecords from './TeamReviewRecords.jsx'
import styles from './TeamLineupReadings.module.css'

function Lineup({ lineup, index, total, context }) {
  const { en, locale } = context
  const heroRole = hero => ({ TANK: 'TANK', DPS: 'DPS', DAMAGE: 'DPS', SUP: 'SUP', SUPPORT: 'SUP' })[getOwHeroRole(hero).toUpperCase()] || 'UNKNOWN'
  const roles = ['TANK', 'DPS', 'SUP', 'UNKNOWN'].map(role => ({ role, heroes: lineup.heroes.filter(hero => heroRole(hero) === role) })).filter(group => group.heroes.length)
  return <article className={styles.lineup} aria-label={en ? `Recorded lineup ${index + 1}` : uiText("记录阵容 {0}", locale, [index + 1])}>
    <header><span>{en ? 'LINEUP' : uiText("组合", locale)} {String(index + 1).padStart(2, '0')}</span><b>{lineup.records.length}<small>{en ? (lineup.records.length === 1 ? 'recorded map' : 'recorded maps') : uiText("张地图有记录", locale)}</small></b><span className={styles.lineupSample}>{lineup.records.length} / {total} {en ? 'records' : uiText("完整记录", locale)}<br />{(lineup.share * 100).toFixed(1)}%</span></header>
    <div className={styles.lineupHeroes} aria-label={en ? 'Five recorded heroes' : uiText("五个记录英雄", locale)}>{roles.map(group => <div key={group.role} className={styles.roleGroup} style={{ flex: group.heroes.length }}>
      <span>{roleLabel(group.role, en, locale)}</span><div style={{ gridTemplateColumns: `repeat(${group.heroes.length}, minmax(0, 1fr))` }}>{group.heroes.map((hero, i) => <span key={`${hero}-${i}`}><HeroPortrait hero={hero} /><b>{formatOwHeroName(hero, locale)}</b></span>)}</div>
    </div>)}</div>
    <dl><div><dt>{en ? 'Map results' : uiText("地图战绩", locale)}</dt><dd>{lineup.wins} {en ? 'W' : uiText("胜", locale)} / {lineup.losses} {en ? 'L' : uiText("负", locale)}{lineup.draws ? ` / ${lineup.draws} ${en ? 'D' : uiText("平", locale)}` : ''}</dd></div><div><dt>{lineup.commonMaps.length > 1 ? (en ? 'Joint most recorded maps' : uiText("常见地图 · 并列", locale)) : (en ? 'Most recorded map' : uiText("常见地图", locale))}</dt><dd>{lineup.commonMaps.length ? lineup.commonMaps.map(map => <span key={map} className={styles.commonMap}>{map}</span>) : '—'}</dd></div></dl>
    <PerformanceEvidence id={`lineup-${lineup.key}`} title={en ? (lineup.records.length === 1 ? 'Inspect this map' : `Inspect these ${lineup.records.length} maps`) : uiText("核对这 {0} 张地图", locale, [lineup.records.length])} {...context}>
      <TeamReviewRecords records={lineup.records} evidenceKey={`lineup-${lineup.key}`} {...context} />
    </PerformanceEvidence>
  </article>
}

export default function TeamLineupReadings({ report, scopeLabel, ...context }) {
  const uiLocale = useUiLocale()
  const { en } = context
  const lineups = lineupContexts(report.lineups)
  const total = lineups.reduce((sum, lineup) => sum + lineup.records.length, 0)
  return <section className={styles.lineupSection} aria-labelledby="lineup-records-title">
    <header className={styles.lineupHeading}>
      <div><span className={styles.eyebrow}>02 / LINEUPS</span><h3 id="lineup-records-title">{en ? 'Recorded lineups' : uiText("阵容组合", uiLocale)}</h3><p>{scopeLabel} · {report.records.length} {en ? (report.records.length === 1 ? 'map in scope' : 'maps in scope') : uiText("图范围", uiLocale)}</p></div>
      <div className={styles.lineupTotal}><strong>{lineups.length}<small>{en ? (lineups.length === 1 ? 'combination' : 'combinations') : uiText("种组合", uiLocale)}</small></strong><span>{total} {en ? (total === 1 ? 'complete five-hero record' : 'complete five-hero records') : uiText("份完整五英雄记录", uiLocale)}</span></div>
    </header>
    {lineups.slice(0, 3).map((lineup, index) => <Lineup key={lineup.key} lineup={lineup} index={index} total={total} context={context} />)}
    {!lineups.length ? <p className={styles.lineupEmpty}>{en ? 'No complete five-hero records in this scope.' : uiText("当前范围暂无完整的五英雄记录。", uiLocale)}</p> : null}
    {lineups.length > 3 ? <PerformanceEvidence id="all-lineup-contexts" title={en ? `Explore all ${lineups.length} lineups` : uiText("展开全部 {0} 种组合", uiLocale, [lineups.length])} {...context}>
      {lineups.slice(3).map((lineup, index) => <Lineup key={lineup.key} lineup={lineup} index={index + 3} total={total} context={context} />)}
    </PerformanceEvidence> : null}
    {lineups.length ? <p className={styles.lineupNote}>{en ? 'Final recorded heroes, not full-map playtime. A few winning records do not establish a strong or preferred composition.' : uiText("仅代表最终记录的英雄，不代表整图使用时长；少量胜场还不足以判断强势阵容或战术偏好。", uiLocale)}</p> : null}
  </section>
}
