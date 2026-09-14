import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useMemo, useState } from 'react'
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
    <p className={styles.benchmarkScope}>{text(en, uiText('与本赛事同职责的公开数据比较，按所选统计方式呈现。', uiLocale), 'Compared with published records in the same role and event, using the selected metric format.')}</p>
    <div className={styles.metricGrid}>{analysis.coreStats.map(metric => {
        const scale = Math.max(metric.value, metric.average, 1)
        const delta = hasSample && hasBenchmark && metric.average > 0 ? (metric.value / metric.average - 1) * 100 : null
        return <div key={metric.id} className={styles.metric}>
          <h3>{en ? ({ elim: 'Eliminations', ast: 'Assists', dth: 'Deaths', dmg: 'Damage', heal: 'Healing', block: 'Mitigation' })[metric.id] : uiText(metric.label, uiLocale)}</h3>
          <strong>{hasSample ? metric.valueLabel : '—'}</strong><span className={styles.benchmarkTrack} aria-hidden="true"><i style={{ width: `${hasSample ? metric.value / scale * 100 : 0}%` }} />{hasBenchmark && <b style={{ left: `${metric.average / scale * 100}%` }} />}</span>
          <dl><div><dt>{text(en, uiText('同职责均值', uiLocale), 'Role average')}</dt><dd>{hasBenchmark ? metric.averageLabel : '—'}</dd></div><div><dt>{text(en, uiText('相对均值', uiLocale), 'Difference')}</dt><dd>{delta == null ? '—' : `${Math.round(delta) > 0 ? '+' : ''}${Math.round(delta)}%`}</dd></div></dl>
        </div>
      })}</div>
    <div className={styles.benchmarkNote}><span><i aria-hidden="true" />{text(en, uiText('选手', uiLocale), 'Player')}</span><span><b aria-hidden="true" />{text(en, uiText('同职责均值', uiLocale), 'Role average')}</span><p>{text(en, uiText('差值表示数据高低，不代表 OVR 加减分。', uiLocale), 'Differences describe the statistic, not points added to OVR.')}</p></div>
  </section>
}

export function PlayerRecentForm({ matches, en, selectedKey, onSelect, onViewMatches }) {
  const uiLocale = useUiLocale()
  const form = useMemo(() => getPlayerRecentForm(matches), [matches])
  return <section className={styles.form} aria-labelledby="player-form-title">
    <div className={styles.formIntro}><p>RECENT FORM</p><h2 id="player-form-title">{text(en, uiText('最近 {0} 场', uiLocale, [form.matches.length]), `Last ${form.matches.length} matches`)}</h2><span>{form.wins}{text(en, uiText('胜', uiLocale), 'W')} · {form.losses}{text(en, uiText('负', uiLocale), 'L')}{form.draws > 0 ? ` · ${form.draws}${text(en, '平', 'D')}` : ''}</span><button type="button" onClick={onViewMatches}>{text(en, uiText('全部比赛', uiLocale), 'All matches')} ↗</button></div>
    <div className={styles.formSummary}><strong>{rating(form.averageRating)}</strong><p>{text(en, uiText('全场评分均值', uiLocale), 'Mean match rating')}<small>{form.ratedCount} {text(en, uiText('场有评分 · 满分 10', uiLocale), 'rated · out of 10')}</small></p></div>
    <div className={styles.formRecord}><p>{text(en, uiText('最近在前 · 点选查看当场表现', uiLocale), 'Latest first · select to explore')}</p><div className={styles.formMatches} style={{ '--form-count': form.matches.length }}>{form.matches.map(match => <button type="button" key={match.key} onClick={() => onSelect(match.key)} aria-pressed={(selectedKey || matches[0]?.key) === match.key} aria-controls="player-rating-journey" aria-label={`${match.opponent.short} · ${match.dateLabel} · ${text(en, '查看当场表现', 'Explore performance')}`} data-result={match.result}>
        <time dateTime={match.date}>{match.dateLabel.split(' ')[0]}</time><strong>{match.opponent.short}</strong><span><b>{rating(match.rating)}</b><small>{uiText(result(match.result, en), uiLocale)}</small></span>
      </button>)}</div></div>
  </section>
}

export function PlayerHeroWorkbench({ heroes, totalMaps, focusHero, onFocusHero, en, locale, onSelect, onShare }) {
  const selected = heroes.find(hero => hero.key === focusHero) || heroes[0]
  const highest = Math.max(1, ...heroes.map(hero => hero.maps))
  if (!selected) return <div className={styles.empty}>{text(en, uiText("暂无已公开的英雄记录。", locale), 'No published hero records yet.')}</div>
  return <section className={styles.heroWorkbench} aria-label={text(en, uiText("英雄使用", locale), 'Hero record')}>
    <header className={styles.sectionHeading}><div><p>HERO RECORD</p><h2>{text(en, uiText('英雄使用', locale), 'Hero record')}</h2></div><span>{heroes.length} {text(en, uiText('位英雄 · 按出场地图数', locale), 'heroes · by map appearances')}</span></header>
    <div className={styles.heroIndex}>
      <div className={styles.heroRows} aria-label={text(en, uiText('选择分析英雄', locale), 'Choose a hero to analyse')}>{heroes.map(hero => <button key={hero.key} type="button" aria-pressed={selected.key === hero.key} aria-controls="player-hero-focus" onClick={() => onFocusHero(hero.key)} aria-label={formatOwHeroName(hero.hero, locale)}>
        <SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /><span><strong>{formatOwHeroName(hero.hero, locale)}</strong><small>{hero.matches} {text(en, uiText("场比赛", locale), hero.matches === 1 ? 'match' : 'matches')} · {hero.wins}{text(en, uiText("胜", locale), 'W')} / {hero.losses}{text(en, uiText("负", locale), 'L')}{hero.draws ? ` / ${hero.draws}${text(en, '平', 'D')}` : ''}</small><i aria-hidden="true"><b style={{ width: `${hero.maps / highest * 100}%` }} /></i></span><strong>{hero.maps}<small>{text(en, uiText("图", locale), hero.maps === 1 ? 'map' : 'maps')}</small></strong><em aria-hidden="true">↗</em>
      </button>)}</div>
      <p className={styles.heroNote}>{text(en, uiText('只计本职责的出场；同图换英雄会分别计数，英雄图数不可相加。', locale), 'Only this role is included. Hero switches count each hero on the map, so hero map counts are not additive.')}</p>
    </div>
    <div className={styles.heroStage} id="player-hero-focus">
      <header><span>HERO / {String(heroes.findIndex(hero => hero.key === selected.key) + 1).padStart(2, '0')}</span><span>{text(en, uiText('本职责出场英雄', locale), 'RECORDED IN THIS ROLE')}</span></header>
      <h3>{formatOwHeroName(selected.hero, locale)}</h3><HeroArtwork hero={selected.hero} className={styles.heroArt} variant="spotlight" decorative locale={locale} />
      <div className={styles.heroFacts}><div><strong>{selected.maps}<small> / {totalMaps}</small></strong><span>{text(en, uiText('出场地图', locale), 'Maps played')}</span></div><div><strong>{selected.matches}</strong><span>{text(en, uiText('场比赛使用', locale), 'Matches played')}</span></div><div><strong>{selected.wins}<small>{text(en, uiText('胜', locale), 'W')} / </small>{selected.losses}<small>{text(en, uiText('负', locale), 'L')}</small></strong><span>{text(en, uiText('地图赛果', locale), 'Map results')}{selected.draws ? ` · ${selected.draws} ${text(en, '平', 'draws')}` : ''}{selected.maps > selected.wins + selected.losses + selected.draws ? ` · ${selected.maps - selected.wins - selected.losses - selected.draws} ${text(en, '未定', 'unsettled')}` : ''}</span></div></div>
      <div className={styles.heroActions}><button type="button" onClick={() => onSelect(selected.key)}>{text(en, uiText('查看相关比赛', locale), 'Explore matches')} <span aria-hidden="true">↗</span></button>
      {onShare && <button type="button" onClick={() => onShare(selected.key)}>{text(en, uiText('分享英雄出场', locale), 'Share hero record')} <span aria-hidden="true">↗</span></button>}</div>
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
    <header className={styles.sectionHeading}><div><p>MAP PERFORMANCE</p><h2 id="player-map-atlas-title">{text(en, uiText('地图表现', locale), 'Map performance')}</h2></div><span>{maps.length} {text(en, uiText('种地图 · 按出场次数', locale), 'maps · by appearances')}</span></header>
    <p className={styles.mapNote}>{text(en, uiText('从地图回到比赛。均分只计算本职责已公开的单图评分，满分 10。', locale), 'Follow a map back to its matches. Means use published map ratings in this role, out of 10.')}</p>
    {maps.length ? <div className={styles.mapGrid}>{maps.map(map => <button key={map.key} type="button" className={styles.mapCard} onClick={() => onSelect(map.key)} aria-label={`${formatOwMapName(map.name, locale)} · ${text(en, '查看比赛', 'View matches')}`}>
      <div className={styles.mapImage}><MapArtwork name={map.name} /><span>{formatOwMapMode(getOwMap(map.name)?.mode || '', locale)}</span><strong>{formatOwMapName(map.name, locale)}</strong></div>
      <div className={styles.mapFacts}><div><b>{map.maps}</b><span>{text(en, uiText('次出场', locale), 'appearances')}</span></div><div><b>{map.wins}<small>{text(en, uiText('胜', locale), 'W')}</small> / {map.losses}<small>{text(en, uiText('负', locale), 'L')}</small></b><span>{map.draws ? `${map.draws} ${text(en, '平局', 'draws')}` : text(en, uiText('地图赛果', locale), 'Map results')}{map.maps > map.wins + map.losses + map.draws ? ` · ${map.maps - map.wins - map.losses - map.draws} ${text(en, '未定', 'unsettled')}` : ''}</span></div><div><b>{rating(map.averageRating)}<small>/ 10</small></b><span>{map.ratedCount} {text(en, uiText('图评分均值', locale), 'rated maps · mean')}</span></div></div>
      <div className={styles.mapCardFooter}><span>{map.heroes.slice(0, 6).map(hero => <SignalHeroPortrait key={hero} hero={hero} description={formatOwHeroName(hero, locale)} />)}</span><b aria-hidden="true">↗</b></div>
    </button>)}</div> : <p className={styles.empty}>{text(en, uiText("暂无已公开的地图记录。", locale), 'No published map records yet.')}</p>}
  </section>
}
