import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { formatOwHeroName, formatOwMapMode, formatOwMapName, getOwMap, getOwMapImageName, getOwMapModeFolder } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import { PLAYER_METRIC_MODES } from '../../lib/playerDetailSelectors.js'
import { getPlayerRecentForm } from './playerDossierPresentation.js'
import styles from './SignalPlayerInsights.module.css'

const text = (en, zh, english) => en ? english : zh
const rating = value => Number.isFinite(value) ? value.toFixed(1) : '—'
const result = (value, en) => ({ win: text(en, '胜', 'W'), loss: text(en, '负', 'L'), draw: text(en, '平', 'D'), pending: text(en, '进行中', 'LIVE'), unknown: '—' })[value] || '—'

export function PlayerPerformanceTable({ analysis, mode, setMode, en }) {
  const uiLocale = useUiLocale()
  const hasSample = analysis.summary.maps > 0
  const hasBenchmark = analysis.sample.rows.some(row => Number(row.roleTimeMins ?? row.raw_time_mins) > 0)
  return <section className={styles.performance} aria-labelledby="player-performance-label">
    <header className={styles.sectionHeading}><div><p>ROLE BENCHMARK</p><h2 id="player-performance-label">{text(en, uiText("数据对照", uiLocale), 'Role benchmark')}</h2></div><div className={styles.metricModes} aria-label={text(en, uiText("统计方式", uiLocale), 'Metric format')}>{PLAYER_METRIC_MODES.map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{en ? item.en : uiText(item.label, uiLocale)}</button>)}</div></header>
    <table className={styles.benchmarkTable}>
      <thead><tr><th scope="col">{text(en, uiText("指标", uiLocale), 'Metric')}</th><th scope="col">{text(en, uiText("选手", uiLocale), 'Player')}</th><th scope="col">{text(en, uiText("同职责均值", uiLocale), 'Role average')}</th><th scope="col">{text(en, uiText("相对均值", uiLocale), 'Difference')}</th></tr></thead>
      <tbody>{analysis.coreStats.map(metric => {
        const scale = Math.max(metric.value, metric.average, 1)
        const delta = hasSample && hasBenchmark && metric.average > 0 ? (metric.value / metric.average - 1) * 100 : null
        return <tr key={metric.id}>
          <th scope="row">{en ? ({ elim: 'Eliminations', ast: 'Assists', dth: 'Deaths', dmg: 'Damage', heal: 'Healing', block: 'Mitigation' })[metric.id] : uiText(metric.label, uiLocale)}</th>
          <td><strong>{hasSample ? metric.valueLabel : '—'}</strong><span className={styles.benchmarkTrack} aria-hidden="true"><i style={{ width: `${hasSample ? metric.value / scale * 100 : 0}%` }} />{hasBenchmark && <b style={{ left: `${metric.average / scale * 100}%` }} />}</span></td>
          <td>{hasBenchmark ? metric.averageLabel : '—'}</td><td>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}%`}</td>
        </tr>
      })}</tbody>
    </table>
    <div className={styles.benchmarkNote}>{hasSample ? <><span><i aria-hidden="true" />{text(en, uiText("选手", uiLocale), 'Player')}</span><span><b aria-hidden="true" />{text(en, uiText("同职责均值", uiLocale), 'Role average')}</span></> : text(en, uiText("本赛季暂无该职责的比赛数据。", uiLocale), 'No match data for this role this season.')}</div>
  </section>
}

export function PlayerRecentForm({ matches, en, linkProps, onViewMatches }) {
  const uiLocale = useUiLocale()
  const form = useMemo(() => getPlayerRecentForm(matches), [matches])
  return <section className={styles.form} aria-labelledby="player-form-title">
    <header className={styles.sectionHeading}><div><p>RECENT FORM</p><h2 id="player-form-title">{text(en, uiText("近期赛况", uiLocale), 'Recent form')}</h2></div><span>{text(en, uiText("最近 {0} 场", uiLocale, [form.matches.length]), `Last ${form.matches.length} matches`)}</span></header>
    {form.matches.length ? <>
      <div className={styles.formSummary}><div><strong>{rating(form.averageRating)}</strong><p>{text(en, uiText("全场评分均值", uiLocale), 'Mean match rating')}<small>{form.ratedCount} {text(en, uiText("场有评分 · 满分 10", uiLocale), 'rated matches · out of 10')}</small></p></div><p><b>{form.wins}</b>{text(en, uiText("胜", uiLocale), 'W')}<span>/</span><b>{form.losses}</b>{text(en, uiText("负", uiLocale), 'L')}{form.draws > 0 ? <small>{form.draws} {text(en, uiText("平", uiLocale), 'D')}</small> : null}</p></div>
      <div className={styles.formMatches}>{form.matches.map(match => <Link key={match.key} {...linkProps(`/matches/${encodeURIComponent(match.matchId)}`)} data-result={match.result}>
        <span className={styles.formResult}>{result(match.result, en)}</span><div><strong>vs {match.opponent.short}</strong><time dateTime={match.date}>{match.dateLabel}</time></div><span>{match.scoreFor != null && match.scoreAgainst != null ? `${match.scoreFor} : ${match.scoreAgainst}` : '—'}</span><b>{rating(match.rating)}</b><i aria-hidden="true">↗</i>
      </Link>)}</div>
    </> : <p className={styles.darkEmpty}>{text(en, uiText("暂无已公开的比赛记录。", uiLocale), 'No published match appearances yet.')}</p>}
    <button type="button" className={styles.formMore} onClick={onViewMatches}>{text(en, uiText("查看全部比赛", uiLocale), 'All match appearances')}<span aria-hidden="true">↗</span></button>
  </section>
}

export function PlayerHeroWorkbench({ heroes, totalMaps, focusHero, onFocusHero, en, locale, onSelect }) {
  const stageRef = useRef(null)
  const selected = heroes.find(hero => hero.key === focusHero) || heroes[0]
  const highest = Math.max(1, ...heroes.map(hero => hero.maps))
  const chooseHero = key => {
    onFocusHero(key)
    if (window.matchMedia('(max-width: 760px)').matches) stageRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  if (!selected) return <div className={styles.empty}>{text(en, uiText("暂无已公开的英雄记录。", locale), 'No published hero records yet.')}</div>
  return <section className={styles.heroWorkbench} aria-label={text(en, uiText("英雄使用", locale), 'Hero record')}>
    <div className={styles.heroStage} ref={stageRef}>
      <header><span>HERO / {String(heroes.findIndex(hero => hero.key === selected.key) + 1).padStart(2, '0')}</span><span>{heroes.length} {text(en, uiText("位英雄", locale), 'heroes')}</span></header>
      <h2>{formatOwHeroName(selected.hero, locale)}</h2><HeroArtwork hero={selected.hero} className={styles.heroArt} variant="spotlight" decorative locale={locale} />
      <div className={styles.heroFacts}><div><strong>{selected.maps}<small> / {totalMaps}</small></strong><span>{text(en, uiText("出场地图", locale), 'Maps played')}</span></div><div><strong>{selected.wins}<small>{text(en, uiText("胜", locale), 'W')} / </small>{selected.losses}<small>{text(en, uiText("负", locale), 'L')}</small></strong><span>{text(en, uiText("地图赛果", locale), 'Map results')}{selected.draws ? ` · ${selected.draws} ${text(en, '平', 'draws')}` : ''}</span></div></div>
      <button type="button" onClick={() => onSelect(selected.key)}>{text(en, uiText("查看相关比赛", locale), 'Explore match appearances')} <span aria-hidden="true">↗</span></button>
    </div>
    <div className={styles.heroIndex}>
      <header className={styles.sectionHeading}><div><p>HERO RECORD</p><h2>{text(en, uiText("英雄使用", locale), 'Hero record')}</h2></div><span>{text(en, uiText("按出场地图数", locale), 'By map appearances')}</span></header>
      <div className={styles.heroRows}>{heroes.map(hero => <button key={hero.key} type="button" aria-pressed={selected.key === hero.key} onClick={() => chooseHero(hero.key)} aria-label={formatOwHeroName(hero.hero, locale)}>
        <SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /><span><strong>{formatOwHeroName(hero.hero, locale)}</strong><small>{hero.matches} {text(en, uiText("场比赛", locale), hero.matches === 1 ? 'match' : 'matches')} · {hero.wins}{text(en, uiText("胜", locale), 'W')} / {hero.losses}{text(en, uiText("负", locale), 'L')}{hero.draws ? ` / ${hero.draws}${text(en, '平', 'D')}` : ''}</small><i aria-hidden="true"><b style={{ width: `${hero.maps / highest * 100}%` }} /></i></span><strong>{hero.maps}<small>{text(en, uiText("图", locale), hero.maps === 1 ? 'map' : 'maps')}</small></strong><em aria-hidden="true">↗</em>
      </button>)}</div>
    </div>
  </section>
}

function MapArtwork({ name }) {
  const [failed, setFailed] = useState(false)
  const map = getOwMap(name)
  return map && !failed ? <img src={getMapImage(getOwMapModeFolder(map.mode), getOwMapImageName(name))} alt="" loading="lazy" onError={() => setFailed(true)} /> : null
}

export function PlayerMapAtlas({ maps, en, locale, onSelect }) {
  return <section className={styles.mapAtlas} aria-labelledby="player-map-atlas-title">
    <header className={styles.sectionHeading}><div><p>MAP PERFORMANCE</p><h2 id="player-map-atlas-title">{text(en, uiText("地图表现", locale), 'Map performance')}</h2></div><span>{maps.length} {text(en, uiText("种地图 · 按出场次数", locale), 'maps · by appearances')}</span></header>
    {maps.length ? <div className={styles.mapGrid}>{maps.map(map => <button key={map.key} type="button" className={styles.mapCard} onClick={() => onSelect(map.key)} aria-label={`${formatOwMapName(map.name, locale)} · ${text(en, '查看比赛', 'View matches')}`}>
      <div className={styles.mapImage}><MapArtwork name={map.name} /><span>{formatOwMapMode(getOwMap(map.name)?.mode || '', locale)}</span><strong>{formatOwMapName(map.name, locale)}</strong></div>
      <div className={styles.mapFacts}><div><b>{map.maps}</b><span>{text(en, uiText("次出场", locale), 'appearances')}</span></div><div><b>{map.wins}<small>{text(en, uiText("胜", locale), 'W')}</small> / {map.losses}<small>{text(en, uiText("负", locale), 'L')}</small></b><span>{map.draws ? `${map.draws} ${text(en, '平局', 'draws')}` : text(en, uiText("地图赛果", locale), 'Map results')}</span></div><div><b>{rating(map.averageRating)}</b><span>{text(en, uiText("平均单图评分", locale), 'Mean map rating')}{map.ratedCount < map.maps ? ` · ${map.ratedCount} ${text(en, '图有评分', 'rated')}` : ''}</span></div></div>
      <div className={styles.mapCardFooter}><span>{map.heroes.slice(0, 6).map(hero => <SignalHeroPortrait key={hero} hero={hero} description={formatOwHeroName(hero, locale)} />)}</span><b aria-hidden="true">↗</b></div>
    </button>)}</div> : <p className={styles.empty}>{text(en, uiText("暂无已公开的地图记录。", locale), 'No published map records yet.')}</p>}
  </section>
}
