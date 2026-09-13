import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { SignalBattleTag, SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import SeasonRating from '../rating/SeasonRating.jsx'
import { formatSeasonRatingValue, getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import { getPlayerRoleAnalysis, PLAYER_METRIC_MODES } from '../../lib/playerDetailSelectors.js'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { filterPlayerAppearances, getPlayerMapProfiles, getRecordedPlayerHeroes, playerComparisonPath } from './playerDossierPresentation.js'
import SignalPlayerHistory from './SignalPlayerHistory.jsx'
import SignalPlayerRatingJourney from './SignalPlayerRatingJourney.jsx'
import { PlayerHeroWorkbench, PlayerMapAtlas, PlayerPerformanceTable, PlayerRecentForm } from './SignalPlayerInsights.jsx'
import insights from './SignalPlayerInsights.module.css'
import styles from './SignalPlayerDossier.module.css'
import pages from './SignalPlayerPages.module.css'

const text = (en, zh, english) => en ? english : zh
const roleLabel = (role, en) => en ? getRoleEnLabel(role) : getRoleLabel(role)
const mapLabel = (en, count) => text(en, `${count} 图`, `${count} ${count === 1 ? 'map' : 'maps'}`)
const matchLabel = (en, count) => text(en, `${count} 场`, `${count} ${count === 1 ? 'match' : 'matches'}`)

export default function SignalPlayerAnalysis({ db, dossier, active, appearances, season, seasonId, locale, linkProps, onShare }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const mode = PLAYER_METRIC_MODES.some(item => item.id === params.get('pmode')) ? params.get('pmode') : 'per10'
  const analysis = useMemo(() => getPlayerRoleAnalysis(db, dossier.basePlayer, active.entry, season, mode), [db, dossier.basePlayer, active.entry, season, mode])
  const roleAppearances = useMemo(() => filterPlayerAppearances(appearances, { role: active.role }), [appearances, active.role])
  const heroes = useMemo(() => getRecordedPlayerHeroes(roleAppearances), [roleAppearances])
  const maps = useMemo(() => getPlayerMapProfiles(roleAppearances), [roleAppearances])
  const selectedMap = maps.find(map => map.key === params.get('pmap'))
  const selectedHero = heroes.find(hero => hero.key === params.get('phero'))
  const result = ['win', 'loss', 'draw', 'pending'].includes(params.get('presult')) ? params.get('presult') : ''
  const filtered = filterPlayerAppearances(roleAppearances, { hero: selectedHero?.key, map: selectedMap?.key, result })
  const requestedView = params.get('pview')
  const view = ['performance', 'heroes', 'maps', 'matches'].includes(requestedView) ? requestedView : params.has('popen') || selectedHero || selectedMap || result ? 'matches' : 'performance'
  const change = values => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setParams(next, { replace: true, state: location.state, preventScrollReset: true })
  }
  const chooseHero = hero => change({ pview: 'matches', phero: hero, pmap: '', pshow: '', popen: '', presult: '' })
  const chooseMap = map => change({ pview: 'matches', pmap: map, phero: '', pshow: '', popen: '', presult: '' })
  const viewAllMatches = () => change({ pview: 'matches', pmap: '', phero: '', presult: '', popen: '', pshow: '' })
  const showCount = Math.max(8, Math.min(roleAppearances.length, Number(params.get('pshow')) || 8))
  const wins = roleAppearances.filter(match => match.result === 'win').length
  const losses = roleAppearances.filter(match => match.result === 'loss').length
  const draws = roleAppearances.filter(match => match.result === 'draw').length
  const pending = roleAppearances.some(match => match.result === 'pending')
  const { identity } = dossier

  return <section className={pages.analysis} data-player-analysis>
    <header className={pages.analysisHeading}>
      <div className={pages.analysisIdentity}><p className={styles.eyebrow}>{identity.teamShort} / {text(en, uiText("数据分析", locale), 'PLAYER ANALYSIS')}</p><h1>{identity.displayName}</h1><p><SignalBattleTag value={identity.battleTag} en={en} /></p></div>
      <div className={pages.analysisRating}><strong>{formatSeasonRatingValue(active.entry)}</strong><div><p>SEASON OVR · {roleLabel(active.role, en)}</p><span>{getSeasonRatingStatusLabel(active.entry, locale)}{analysis.summary.rank ? <b> #{analysis.summary.rank}<small> / {analysis.summary.rankTotal}</small></b> : null}</span><SeasonRating entry={active.entry} locale={locale} explanationOnly /></div></div>
      <div className={pages.analysisActions}>{analysis.summary.maps > 0 && <Link {...linkProps(playerComparisonPath(active.entry, location.search, mode))} className={pages.analysisCompare}>{text(en, uiText("对比选手", locale), 'Compare players')} ↗</Link>}<button type="button" onClick={onShare}>{text(en, uiText("分享数据", locale), 'Share stats')} ↗</button></div>
    </header>
    <div className={styles.roleBar}>
      <div className={styles.roleTabs} aria-label={text(en, uiText("选手职责", locale), 'Player role')}>
        {dossier.roleEntries.map(item => <button type="button" key={item.role} data-role={item.role} aria-pressed={item.role === active.role} onClick={() => change({ role: item.role, phero: '', pmap: '', hfocus: '', presult: '', pshow: '', popen: '', ptrend: '' })}><i aria-hidden="true" />{roleLabel(item.role, en)}<small>{mapLabel(en, item.summary.maps)}</small></button>)}
      </div>
      <span className={pages.analysisSample}>{matchLabel(en, roleAppearances.length)}<b>{wins}{text(en, uiText("胜", locale), 'W')} · {losses}{text(en, uiText("负", locale), 'L')}{draws > 0 ? ` · ${draws}${text(en, '平', 'D')}` : ''}</b><span>{analysis.summary.timeLabel}</span></span>
    </div>
    <nav className={pages.analysisTabs} aria-label={text(en, uiText("数据分析内容", locale), 'Analysis sections')}>
      {[['performance', text(en, '表现概览', 'Performance')], ['heroes', text(en, '英雄使用', 'Heroes')], ['maps', text(en, '地图表现', 'Maps')], ['matches', text(en, '比赛记录', 'Matches')]].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} aria-controls="player-analysis-content" onClick={() => change({ pview: key })}>{label}{key === 'heroes' ? <small>{heroes.length}</small> : key === 'maps' ? <small>{maps.length}</small> : key === 'matches' ? <small>{roleAppearances.length}</small> : null}</button>)}
    </nav>
    <div id="player-analysis-content" className={pages.analysisContent}>
      {view === 'performance' && <><div className={insights.overviewGrid}><PlayerPerformanceTable analysis={analysis} mode={mode} setMode={value => change({ pmode: value })} en={en} /><PlayerRecentForm matches={roleAppearances} en={en} linkProps={linkProps} onViewMatches={viewAllMatches} /></div><SignalPlayerRatingJourney matches={roleAppearances} en={en} locale={locale} seasonId={seasonId} selectedKey={params.get('ptrend')} onSelect={key => change({ ptrend: key })} linkProps={linkProps} /></>}
      {view === 'heroes' && <PlayerHeroWorkbench heroes={heroes} totalMaps={roleAppearances.reduce((total, match) => total + match.maps.length, 0)} focusHero={params.get('hfocus')} onFocusHero={key => change({ hfocus: key })} onSelect={chooseHero} en={en} locale={locale} />}
      {view === 'maps' && <PlayerMapAtlas maps={maps} en={en} locale={locale} onSelect={chooseMap} />}
      {view === 'matches' && <section id="player-history" className={styles.history} aria-label={text(en, uiText("比赛记录", locale), 'Match record')}>
        <div className={pages.historyHeading}><h2>{text(en, uiText("比赛记录", locale), 'Match record')}</h2><p>{roleLabel(active.role, en)} · {matchLabel(en, filtered.length)}</p></div>
        <div className={styles.historyFilters}>
          <div className={styles.segmented} aria-label={text(en, uiText("比赛结果", locale), 'Match result')}>{[['', text(en, '全部比赛', 'All matches')], ['win', text(en, '获胜', 'Wins')], ['loss', text(en, '失利', 'Losses')], ...(draws ? [['draw', text(en, '平局', 'Draws')]] : []), ...(pending ? [['pending', text(en, '进行中', 'Live')]] : [])].map(([value, label]) => <button type="button" key={value} aria-pressed={result === value} onClick={() => change({ presult: value, pshow: '', popen: '' })}>{label}</button>)}</div>
          <div className={pages.historySelects}><label className={styles.heroFilter}>{text(en, uiText("英雄", locale), 'Hero')}<select aria-label={text(en, uiText("筛选比赛英雄", locale), 'Filter matches by hero')} value={selectedHero?.key || ''} onChange={event => change({ phero: event.target.value, pshow: '', popen: '' })}><option value="">{text(en, uiText("全部英雄", locale), 'All heroes')}</option>{heroes.map(hero => <option value={hero.key} key={hero.key}>{formatOwHeroName(hero.hero, locale)}</option>)}</select></label><label className={styles.heroFilter}>{text(en, uiText("地图", locale), 'Map')}<select aria-label={text(en, uiText("筛选比赛地图", locale), 'Filter matches by map')} value={selectedMap?.key || ''} onChange={event => change({ pmap: event.target.value, pshow: '', popen: '' })}><option value="">{text(en, uiText("全部地图", locale), 'All maps')}</option>{maps.map(map => <option key={map.key} value={map.key}>{formatOwMapName(map.name, locale)}</option>)}</select></label></div>
        </div>
        {selectedHero && <div className={styles.filterSummary}><SignalHeroPortrait hero={selectedHero.hero} role={active.role} /><span>{formatOwHeroName(selectedHero.hero, locale)}</span><button type="button" onClick={() => change({ phero: '', pshow: '' })}>{text(en, uiText("清除", locale), 'Clear')} ×</button></div>}
        {selectedMap && <div className={styles.filterSummary}><span>{formatOwMapName(selectedMap.name, locale)}</span><button type="button" onClick={() => change({ pmap: '', pshow: '', popen: '' })}>{text(en, uiText("清除地图", locale), 'Clear map')} ×</button></div>}
        <SignalPlayerHistory selectedMap={selectedMap?.key || ''} matches={filtered.slice(0, showCount)} en={en} locale={locale} seasonId={seasonId} selectedHero={selectedHero?.key || ''} expanded={params.get('popen') || ''} onExpand={value => change({ popen: value })} linkProps={linkProps} />
        {!filtered.length && <div className={styles.empty}><p>{roleAppearances.length ? text(en, uiText("没有符合筛选条件的比赛。", locale), 'No matches for these filters.') : text(en, uiText("暂无已公开的比赛记录。", locale), 'No published match appearances yet.')}</p>{roleAppearances.length > 0 && <button type="button" className={styles.textButton} onClick={() => change({ phero: '', pmap: '', presult: '' })}>{text(en, uiText("重置筛选", locale), 'Reset filters')} ↗</button>}</div>}
        {filtered.length > showCount && <button type="button" className={styles.showMore} onClick={() => change({ pshow: String(showCount + 8) })}>{text(en, uiText("查看更多比赛", locale), 'Show more matches')} <span>{showCount} / {filtered.length}</span> ↓</button>}
      </section>}
    </div>
  </section>
}
