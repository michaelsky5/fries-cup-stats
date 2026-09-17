import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDossierRecord } from './teamDossierPresentation.js'
import { getDossierMapAnalysis, getDossierMapMatchPath, getDossierMapReading, SMALL_MAP_SAMPLE } from './teamDossierAnalysis.js'
import styles from './TeamMapAnalysis.module.css'

const rate = value => value === null ? '—' : `${(value * 100).toFixed(1)}%`
const outcomeLabel = (outcome, en) => ({ win: en ? 'W' : '胜', loss: en ? 'L' : '负', draw: en ? 'D' : '平' })[outcome]

function MapPlot({ analysis, selectedMap, onSelect, en }) {
  const uiLocale = useUiLocale()
  const selectedGroup = analysis.groups.find(group => group.maps.some(map => map.name === selectedMap.name))
  return <div className={styles.plotPanel}>
    <div className={styles.plotMasthead}><span>PERFORMANCE ATLAS</span><span>{en ? '01 / MAPS' : uiText("01 / 地图表现", uiLocale)}</span></div>
    <div className={styles.plotTitle}><h2>{en ? 'Win rate meets sample size.' : uiText("胜率，要和样本一起看。", uiLocale)}</h2><p>{en ? 'Right: more records. Up: a higher win rate.' : uiText("越向右，记录越多。越向上，胜率越高。", uiLocale)}</p></div>
    <div className={styles.plotSelection}><b>{selectedMap.displayName}</b><span>{selectedMap.maps} {en ? 'maps' : uiText("图", uiLocale)} / {rate(selectedMap.winRate)}</span></div>
    <div className={styles.chart} role="group" aria-label={en ? 'Map win rate by number of records. Select a point or a map in the index below.' : uiText("各地图胜率与记录数量。选择图中坐标，或使用下方地图索引。", uiLocale)}>
      <span className={styles.yTitle}>{en ? 'WIN RATE' : uiText("地图胜率", uiLocale)} ↑</span>
      <div className={styles.plotArea}>
        {[0, 25, 50, 75, 100].map(value => <div key={value} className={styles.horizontalGuide} style={{ bottom: `${value}%` }} aria-hidden="true"><span>{value}%</span></div>)}
        {analysis.ticks.map(value => <div key={value} className={styles.verticalGuide} style={{ left: `${value / analysis.maxX * 100}%` }} aria-hidden="true"><span>{value}</span></div>)}
        <div className={styles.baseline} style={{ bottom: `${analysis.winRate * 100}%` }} aria-hidden="true" />
        {analysis.groups.map(group => {
          const selected = group === selectedGroup
          const names = group.maps.map(map => map.displayName).join(en ? ', ' : '、')
          const nextMap = selected && group.maps.length > 1 ? group.maps[(group.maps.findIndex(map => map.name === selectedMap.name) + 1) % group.maps.length] : group.maps[0]
          return <button type="button" key={group.key} className={styles.plotPoint} style={{ left: `${group.samples / analysis.maxX * 100}%`, bottom: `${group.winRate * 100}%` }} aria-pressed={selected} aria-controls="team-map-reading" aria-label={`${names} · ${group.samples} ${en ? 'records' : uiText("图", uiLocale)} · ${rate(group.winRate)}${group.maps.length > 1 ? (en ? ' · shared coordinate, click to cycle maps' : uiText(" · 同坐标，点击切换地图", uiLocale)) : ''}`} title={names} onClick={() => onSelect(nextMap.name)}><i>{group.maps.length > 1 ? group.maps.length : ''}</i></button>
        })}
        <div className={styles.pointLabel} style={{ left: `clamp(70px, ${selectedMap.maps / analysis.maxX * 100}%, calc(100% - 70px))`, bottom: `${selectedMap.winRate * 100}%` }} data-below={selectedMap.winRate > .8 || undefined} aria-hidden="true"><b>{selectedMap.displayName}</b><span>{selectedMap.maps} {en ? 'maps' : uiText("图", uiLocale)} / {rate(selectedMap.winRate)}</span></div>
      </div>
      <span className={styles.xTitle}>{en ? 'RECORDED MAPS' : uiText("地图记录数", uiLocale)} →</span>
    </div>
    <div className={styles.plotLegend}><span><i />{en ? 'All maps, this team' : uiText("本队全部地图", uiLocale)} <b>{rate(analysis.winRate)}</b></span><span>{en ? 'Numbered dots contain multiple maps.' : uiText("带数字的坐标包含多张地图。", uiLocale)}</span></div>
    {selectedGroup.maps.length > 1 ? <div className={styles.sharedPoints}><span>{en ? 'At this coordinate' : uiText("同一坐标", uiLocale)}</span>{selectedGroup.maps.map(map => <button type="button" key={map.name} aria-pressed={map.name === selectedMap.name} onClick={() => onSelect(map.name)}>{map.displayName}</button>)}</div> : null}
  </div>
}

function MapReading({ map, analysis, locale, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  return <aside className={styles.reading} id="team-map-reading" aria-live="polite" aria-atomic="true">
    <div className={styles.mapImage}><img key={map.name} src={map.imageUrl} alt="" onError={event => { event.currentTarget.hidden = true }} /><span>{map.mode}</span><b>{String(analysis.maps.findIndex(item => item.name === map.name) + 1).padStart(2, '0')}</b></div>
    <div className={styles.readingBody}>
      <span className={styles.eyebrow}>{en ? 'THE SELECTED GROUND' : uiText("正在阅读的地图", locale)}</span>
      <h3>{map.displayName}</h3>{!en ? <span className={styles.mapEnglish}>{map.name}</span> : null}
      <div className={styles.readingNumbers}><strong>{rate(map.winRate)}</strong><span>{formatDossierRecord(map, locale)}<small>{map.maps} {en ? 'recorded maps' : uiText("份地图记录", locale)}</small></span></div>
      <p>{getDossierMapReading(map, analysis, locale)}</p>
      <div className={styles.resultStrip} aria-label={en ? 'Map outcomes in schedule order' : uiText("按赛程先后排列的地图结果", locale)}>{map.records.map(row => <Link key={`${row.match.match_id}-${row.mapIndex}`} to={withSeason(getDossierMapMatchPath(row))} state={returnState} onClick={onLeave} data-outcome={row.mapOutcome} aria-label={`${row.timeLabel} · ${row.opponentLabel} · ${row.mapScore} · ${outcomeLabel(row.mapOutcome, en)}`} title={`${row.opponentLabel} ${row.mapScore}`}>{outcomeLabel(row.mapOutcome, en)}</Link>)}</div>
      <div className={styles.readingFoot}><span>{en ? 'Oldest → newest' : uiText("从最早 → 最近", locale)}</span><Link to={withSeason(`/maps/${encodeURIComponent(map.name)}`)} state={returnState} onClick={onLeave}>{en ? 'Map archive' : uiText("地图档案", locale)} ↗</Link></div>
    </div>
  </aside>
}

export default function TeamMapAnalysis({ team, mapPool, selectedMap, locale, onSelect, evidenceOpen, onEvidenceToggle, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const analysis = useMemo(() => getDossierMapAnalysis(mapPool), [mapPool])
  const most = analysis.mostPlayed
  const selectFromIndex = name => {
    onSelect(name)
    window.requestAnimationFrame(() => document.getElementById('team-map-reading')?.scrollIntoView({ block: 'center', behavior: 'instant' }))
  }
  return <section className={styles.analysis} id="team-maps" data-dossier-chapter="maps">
    <header className={styles.intro} data-language={en ? 'en' : 'zh'}>
      <div><span className={styles.eyebrow}>THE TEAM, THROUGH DATA</span><h2>{en ? 'Every map, in perspective.' : uiText("逐张地图，继续研究。", locale)}</h2></div>
      <div className={styles.introAside}><span>{team.shortName} / {en ? 'COMPETITIVE ANALYSIS' : uiText("竞技分析", locale)}</span><p>{en ? 'Where do the wins happen? How much evidence is there? Start with the map, then return to the match.' : uiText("胜利发生在哪里，又有多少记录支撑？从一张地图开始，回到每一场比赛。", locale)}</p><div><strong>{analysis.samples}</strong><span>{en ? 'scored map records' : uiText("份有效地图记录", locale)}<small>{analysis.maps.length} {en ? 'different maps' : uiText("张不同地图", locale)}</small></span></div></div>
    </header>
    {selectedMap && most ? <>
      <div className={styles.atlas}><MapPlot analysis={analysis} selectedMap={selectedMap} onSelect={onSelect} en={en} /><MapReading map={selectedMap} analysis={analysis} locale={locale} withSeason={withSeason} returnState={returnState} onLeave={onLeave} /></div>
      <div className={styles.observations}>
        <div><span>01</span><p>{en ? <>Most recorded: <button type="button" onClick={() => selectFromIndex(most.name)}>{most.displayName} ↗</button>. {most.maps} maps, {rate(most.maps / analysis.samples)} of the sample.</> : <>{uiText("记录最多的是", locale)}<button type="button" onClick={() => selectFromIndex(most.name)}>{most.displayName} ↗</button>{uiText("，共 ", locale)}{most.maps}{uiText(" 图，占全部记录的 ", locale)}{rate(most.maps / analysis.samples)}。</>}</p></div>
        <div><span>02</span><p>{analysis.smallSampleCount ? (en ? `${analysis.smallSampleCount} maps have fewer than ${SMALL_MAP_SAMPLE} records. A high win rate alone does not establish a reliable advantage.` : uiText("{0} 张地图不足 {1} 份记录。高胜率仍需更多比赛，才能判断是否稳定。", locale, [analysis.smallSampleCount, SMALL_MAP_SAMPLE])) : (en ? 'Every map has at least 3 records. Opponents and tournament stages still differ between samples.' : uiText("每张地图至少有 3 份记录，不同地图的对手与比赛阶段仍有差异。", locale))}</p></div>
      </div>
      <details className={styles.mapDirectory}><summary>{en ? 'Find a map by name' : uiText("按名称选择地图", locale)}<span>{en ? `${analysis.maps.length} maps in this season` : uiText("本赛季全部 {0} 张地图", locale, [analysis.maps.length])}</span></summary><div className={styles.mapIndex} role="group" aria-label={en ? 'Choose a map to analyse' : uiText("选择要分析的地图", locale)}>{analysis.maps.map((map, index) => <button type="button" key={map.name} aria-pressed={map.name === selectedMap.name} aria-controls="team-map-reading" onClick={() => selectFromIndex(map.name)}><span>{String(index + 1).padStart(2, '0')}</span><b>{map.displayName}<small>{map.maps} {en ? 'maps' : uiText("图", locale)} · {formatDossierRecord(map, locale)}</small></b><strong>{rate(map.winRate)}</strong></button>)}</div></details>
      <div className={styles.evidence}>
        <button type="button" className={styles.evidenceToggle} aria-expanded={evidenceOpen} aria-controls="team-map-evidence" onClick={onEvidenceToggle}><span><small>{en ? 'FOLLOW THE EVIDENCE' : uiText("沿着证据，回到比赛", locale)}</small><b>{selectedMap.displayName} <span>/ {selectedMap.maps} {en ? 'records' : uiText("份记录", locale)}</span></b></span><span>{evidenceOpen ? (en ? 'Collapse' : uiText("收起比赛", locale)) : (en ? 'See every match' : uiText("展开全部比赛", locale))} <i aria-hidden="true">{evidenceOpen ? '−' : '+'}</i></span></button>
        {evidenceOpen ? <div id="team-map-evidence" className={styles.evidenceRows}>{[...selectedMap.records].reverse().map(row => <Link key={`${row.match.match_id}-${row.mapIndex}`} to={withSeason(getDossierMapMatchPath(row))} state={returnState} onClick={onLeave}><time>{row.timeLabel.split(' ')[0]}<small>{row.roundLabel}</small></time><b><small>{en ? 'vs' : uiText("对阵", locale)} </small>{row.opponentLabel}</b><strong>{row.mapScore}</strong><span className={styles.outcome} data-outcome={row.mapOutcome}>{outcomeLabel(row.mapOutcome, en)}</span><span className={styles.mapOrder}>{en ? `Map ${row.mapOrder}` : uiText("第 {0} 图", locale, [row.mapOrder])}</span><span aria-hidden="true">↗</span></Link>)}</div> : null}
      </div>
      <p className={styles.methodNote}>{en ? 'Win rate = wins ÷ all scored maps, including draws. The dashed line is this team’s overall map win rate. Administrative and forfeited maps are excluded. The “fewer than 3” note is a reading aid, not a statistical confidence threshold.' : uiText("胜率 = 胜图数 ÷ 有比分的地图记录数（含平局）。虚线为本队全部地图胜率；排除判罚及弃权地图。“不足 3 份”是阅读提示，不是统计置信度界限。", locale)}</p>
    </> : <div className={styles.empty}><span>— / MAPS</span><h2>{en ? 'The picture is still open.' : uiText("图景，等待比赛落笔。", locale)}</h2><p>{getDossierMapReading(null, analysis, locale)}</p></div>}
  </section>
}
