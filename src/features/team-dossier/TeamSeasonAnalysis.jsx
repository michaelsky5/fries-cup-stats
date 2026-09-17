import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getArchiveStageAnalysis, getArchiveStageHref } from './teamArchiveContent.js'
import styles from './TeamSeasonAnalysis.module.css'

const percent = value => `${(value * 100).toFixed(1)}%`

export default function TeamSeasonAnalysis({ rows, locale, journeyHref, viewState }) {
  const en = locale === 'en-US'
  const stages = useMemo(() => getArchiveStageAnalysis(rows, locale), [rows, locale])
  const previous = stages.at(-2)
  const latest = stages.at(-1)
  const delta = previous ? (latest.winRate - previous.winRate) * 100 : null
  const comparison = previous ? (en
    ? `${previous.label}: ${percent(previous.winRate)}. ${latest.label}: ${percent(latest.winRate)}. ${Math.abs(delta).toFixed(1)} percentage points ${delta > 0 ? 'higher' : delta < 0 ? 'lower' : 'apart'}.`
    : `${previous.label} ${percent(previous.winRate)}，${latest.label} ${percent(latest.winRate)}，${delta === 0 ? uiText('两阶段持平', locale) : `${delta > 0 ? uiText('高', locale) : uiText('低', locale)} ${Math.abs(delta).toFixed(1)} 个百分点`}。`)
    : en ? 'A comparison becomes available once scored maps span more than one stage.' : uiText("有多个赛段的地图记录后，这里可以比较不同阶段。", locale)

  return <section className={styles.section} id="team-season-analysis" aria-labelledby="team-season-analysis-title">
    <header className={styles.heading}><span>05 / THROUGH THE SEASON</span><h2 id="team-season-analysis-title">{en ? 'One team. Different stages.' : uiText("同一支队伍，不同的赛段。", locale)}</h2><p>{en ? 'Map outcomes, read in their season context.' : uiText("把地图表现，放回当时的赛程。", locale)}</p></header>
    {stages.length ? <div className={styles.layout}>
      <aside className={styles.reading}><span>{en ? 'THE LATEST STAGE COMPARISON' : uiText("最近两个赛段的对照", locale)}</span><p>{comparison}</p><small>{en ? 'Opponents, maps and sample sizes change between stages. This describes the results; it does not explain their cause.' : uiText("赛段之间的对手、地图和样本量不同。这里描述结果差异，不据此判断状态变化的原因。", locale)}</small><div className={styles.legend}><span><i />{en ? 'Map wins' : uiText("地图获胜", locale)}</span><span><i />{en ? 'Map losses' : uiText("地图失利", locale)}</span><span><i />{en ? 'Draws' : uiText("平局", locale)}</span></div></aside>
      <div className={styles.stages}>{stages.map((stage, index) => <article key={stage.key} className={styles.stage}>
        <header><span><small>{String(index + 1).padStart(2, '0')}</small><b>{stage.label}</b></span><strong>{percent(stage.winRate)}<small>{en ? 'map win rate' : uiText("地图胜率", locale)}</small></strong></header>
        <div className={styles.resultBar} aria-label={en ? `${stage.wins} map wins, ${stage.losses} losses, ${stage.draws} draws` : uiText("{0} 图获胜，{1} 图失利，{2} 图平局", locale, [stage.wins, stage.losses, stage.draws])}><i style={{ width: `${stage.wins / stage.maps * 100}%` }} /><i style={{ width: `${stage.losses / stage.maps * 100}%` }} /><i style={{ width: `${stage.draws / stage.maps * 100}%` }} /></div>
        <div className={styles.stageFacts}><span>{stage.wins} {en ? 'W' : uiText("胜", locale)} / {stage.losses} {en ? 'L' : uiText("负", locale)}{stage.draws ? ` / ${stage.draws} ${en ? 'D' : uiText("平", locale)}` : ''}</span><span>{stage.maps} {en ? 'maps' : uiText("图", locale)} · {stage.opponentCount} {en ? 'opponents' : uiText("个对手", locale)}</span><Link to={getArchiveStageHref(journeyHref, stage.key)} state={viewState}>{en ? 'Read the matches' : uiText("回看这个赛段", locale)} ↗</Link></div>
      </article>)}</div>
    </div> : <p className={styles.empty}>{en ? 'Stage analysis begins with the first named, scored map.' : uiText("首份具名且有比分的地图发布后，这里将呈现赛段表现。", locale)}</p>}
    <footer>{en ? 'Win rate = map wins ÷ all eligible maps, including draws. Administrative results and byes are excluded.' : uiText("胜率 = 获胜地图 ÷ 有效地图总数，平局计入分母；不包含判罚结果与轮空。", locale)}</footer>
  </section>
}
