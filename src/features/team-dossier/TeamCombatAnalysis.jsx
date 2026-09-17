import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { getArchiveDistribution } from './teamArchiveContent.js'
import comparisonStyles from './TeamCombatAnalysis.module.css'
import styles from './SignalTeamDossier.module.css'

const number = value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: Math.abs(value) < 1000 ? 1 : 0 })
const percent = value => value === null ? '—' : `${Math.round(value * 100)}%`

function ChapterHeading({ index, title, code, note, dark = false }) {
  return <header className={styles.chapterHeading} data-dark={dark || undefined}>
    <span className={styles.chapterNumber}>{String(index).padStart(2, '0')}</span>
    <div><span className={styles.eyebrow}>{code}</span><h2>{title}</h2></div>
    {note ? <p>{note}</p> : null}
  </header>
}

function CombatDistribution({ metric, profiles, team, en }) {
  const uiLocale = useUiLocale()
  const { samples, median, max } = getArchiveDistribution(profiles, metric.id)
  const hasValue = Number.isFinite(metric.value)
  const maximum = Math.max(max, hasValue ? metric.value : 0, 1)
  const isCurrent = sample => String(sample.id) === String(team.routeId) || sample.name === team.shortName
  return <article className={comparisonStyles.metric}>
    <div className={comparisonStyles.metricHeading}><h4>{metric.label}</h4><strong>{hasValue ? number(metric.value) : '—'}<small>{en ? 'this team /10' : uiText("本队 /10", uiLocale)}</small></strong></div>
    <div className={comparisonStyles.distribution}>
      {samples.length ? <><div className={comparisonStyles.plot} aria-hidden="true">
        <i className={comparisonStyles.track} />
        {samples.map((sample, index) => <i key={sample.id} className={comparisonStyles.dot} data-current={isCurrent(sample) || undefined} style={{ left: `${sample.value / maximum * 100}%`, top: `${27 + index % 3 * 10}px` }} />)}
        <i className={comparisonStyles.median} style={{ left: `${median / maximum * 100}%` }} />
        {hasValue ? <i className={comparisonStyles.team} style={{ left: `${metric.value / maximum * 100}%` }} /> : null}
        <div className={comparisonStyles.axis}><span>0</span><span>{number(maximum)}</span></div>
      </div><div className={comparisonStyles.comparison}><span>{en ? 'Tournament median' : uiText("赛事中位数", uiLocale)} <b>{number(median)}</b></span><span>{!hasValue ? (en ? 'Team data incomplete' : uiText("本队数据未齐", uiLocale)) : metric.value === median ? (en ? 'At the median' : uiText("与中位数相同", uiLocale)) : metric.value > median ? (en ? 'Above the median' : uiText("高于中位数", uiLocale)) : (en ? 'Below the median' : uiText("低于中位数", uiLocale))}</span></div></> : <p className={comparisonStyles.noSamples}>{en ? 'No tournament comparison available.' : uiText("暂无可比较的赛事样本。", uiLocale)}</p>}
    </div>
    {samples.length ? <details className={comparisonStyles.evidence}><summary aria-label={`${metric.label}: ${samples.length} ${en ? 'team samples' : uiText("队伍样本", uiLocale)}`}>{samples.length} {en ? 'team samples' : uiText("队伍样本", uiLocale)}</summary><div className={comparisonStyles.samples}>{[...samples].reverse().map(sample => <p key={sample.id} data-current={isCurrent(sample) || undefined}><span>{sample.name}{isCurrent(sample) ? (en ? ' · this team' : uiText(" · 本队", uiLocale)) : ''}</span><b>{number(sample.value)}</b></p>)}</div></details> : null}
  </article>
}

export default function TeamCombatAnalysis({ team, locale, recordedLineups, combatComparisons, combatProfile, baselineTeamCount, combatDistributions = [] }) {
  const en = locale === 'en-US'
  return (
    <section id="team-records" className={`${styles.chapter} ${styles.recordsChapter}`} data-dossier-chapter="records">
      <ChapterHeading index={3} code="WITHIN THE FIELD" title={en ? 'Where this team sits.' : uiText("把本队，放进整个赛场。", locale)} note={en ? 'Team output & recorded heroes' : uiText("团队表现与最终英雄记录", locale)} dark />
      <div className={styles.combatIntro}><h3>{en ? 'Five-player output, per 10 minutes.' : uiText("五人队伍，每 10 分钟。", locale)}</h3><p>{en ? `Team totals normalised using recorded player time ÷ 5. Each dot represents one of ${baselineTeamCount} teams with data. Expand a row to see their values.` : uiText("按选手累计数据与总出场时间 ÷ 5 折算。每个点代表一支队伍，当前有 {0} 支队伍；展开每行可核对数值。", locale, [baselineTeamCount])}</p></div>
      <div className={comparisonStyles.legend}><span><i />{en ? 'This team' : uiText("本队", locale)}</span><span><i />{en ? 'Tournament median' : uiText("赛事中位数", locale)}</span><span><i />{en ? 'Each team' : uiText("各支队伍", locale)}</span><p>{en ? 'Each row has its own scale. Higher values are not a strength ranking.' : uiText("每项使用独立刻度；数值高低不等于实力排名。", locale)}</p></div>
      {combatProfile.hasData ? <div className={comparisonStyles.metrics}>{combatComparisons.map(metric => <CombatDistribution key={metric.id} metric={{ ...metric, value: combatProfile.available?.[metric.id] === false ? null : metric.value }} profiles={combatDistributions} team={team} en={en} />)}</div> : <p className={styles.empty}>{en ? 'Team combat statistics are not available yet.' : uiText("暂时没有可用的团队战斗数据。", locale)}</p>}
      <div className={styles.lineupIntro}><h3>{en ? 'The final five heroes on record.' : uiText("最后留下的五个英雄。", locale)}</h3><p>{en ? `Top 3 · ${recordedLineups.completeSamples} complete map samples. These are final recorded heroes, not full-map playtime or starting lineups.` : uiText("TOP 3 · {0} 份完整地图样本。这里记录最终英雄，不代表整图使用时长或首发阵容。", locale, [recordedLineups.completeSamples])}</p></div>
      <div className={styles.lineupList}>{recordedLineups.lineups.map((lineup, index) => <article className={styles.lineupRow} key={lineup.key}><span className={styles.lineupNumber}>0{index + 1}</span><div className={styles.lineupHeroes}>{lineup.slots.map((slot, slotIndex) => <div key={`${slot.heroKey}-${slotIndex}`}>{slot.portrait ? <img src={slot.portrait} alt="" loading="lazy" /> : null}<span>{slot.heroLabel}</span></div>)}</div><div className={styles.lineupSample}><strong>{lineup.maps}<small>{en ? ' maps' : uiText(" 图", locale)}</small></strong><span>{percent(lineup.adoptionRate)} {en ? 'of complete samples' : uiText("完整样本占比", locale)}</span></div></article>)}</div>
      {!recordedLineups.lineups.length ? <p className={styles.empty}>{en ? 'No complete five-hero sample has been published.' : uiText("暂未发布完整的五英雄样本。", locale)}</p> : null}
      <details className={styles.methodology}><summary>{en ? 'How to read this dossier' : uiText("如何阅读这份队伍档案", locale)}</summary><p>{en ? 'Series records use published results, including administrative results. Byes are listed in the journey and excluded from the win rate. Map statistics use named, scored maps and exclude forfeits and administrative maps. Missing results stay unknown.' : uiText("比赛战绩以已发布赛果为准，包含判罚结果；轮空保留在征程中，不计入比赛胜率。地图统计只使用具名且有比分的地图，排除弃权及行政地图。缺失结果保持未知。", locale)}</p><p>{en ? 'Roster entries describe registered players and recorded appearances. They do not designate official starters or substitutes. Team output is a descriptive average, without opponent, map, or lineup adjustment.' : uiText("名单展示注册选手与已有出场，不据此指定官方首发或替补。团队每 10 分钟数据为描述性均值，未按对手、地图及阵容作校正。", locale)}</p></details>
    </section>
  )
}
