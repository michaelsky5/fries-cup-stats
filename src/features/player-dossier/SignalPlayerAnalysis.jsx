import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { SignalBattleTag } from '../../components/matches/detail/SignalPlayerData.jsx'
import SeasonRating from '../rating/SeasonRating.jsx'
import { formatSeasonRatingValue, getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import { getPlayerRoleAnalysis, PLAYER_METRIC_MODES } from '../../lib/playerDetailSelectors.js'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { filterPlayerAppearances, getPlayerMapProfiles, getRecordedPlayerHeroes, playerComparisonPath } from './playerDossierPresentation.js'
import SignalPlayerHistory from './SignalPlayerHistory.jsx'
import SignalPlayerRatingJourney from './SignalPlayerRatingJourney.jsx'
import { PlayerHeroWorkbench, PlayerMapAtlas, PlayerPerformanceTable, PlayerRecentForm } from './SignalPlayerInsights.jsx'
import { PlayerPersonalReadout } from './PlayerPersonalStory.jsx'
import styles from './SignalPlayerDossier.module.css'
import pages from './SignalPlayerAnalysis.module.css'

const text = (en, zh, english) => en ? english : zh
const roleLabel = (role, en, labelLocale = 'zh-CN') => uiText(en ? getRoleEnLabel(role) : getRoleLabel(role), labelLocale)
const mapLabel = (en, count, labelLocale = 'zh-CN') => uiText(text(en, `${count} 图`, `${count} ${count === 1 ? 'map' : 'maps'}`), labelLocale)
const matchLabel = (en, count, labelLocale = 'zh-CN') => uiText(text(en, `${count} 场`, `${count} ${count === 1 ? 'match' : 'matches'}`), labelLocale)

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
  const chooseTrend = key => {
    change({ ptrend: key })
    document.getElementById('player-rating-journey')?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const expandedIndex = filtered.findIndex(match => match.key === params.get('popen'))
  const expandedKey = filtered[expandedIndex]?.key || ''
  const showCount = Math.max(8, expandedIndex + 1, Math.min(roleAppearances.length, Number(params.get('pshow')) || 8))
  const wins = roleAppearances.filter(match => match.result === 'win').length
  const losses = roleAppearances.filter(match => match.result === 'loss').length
  const draws = roleAppearances.filter(match => match.result === 'draw').length
  const pending = roleAppearances.some(match => match.result === 'pending')
  const hasFilters = Boolean(selectedHero || selectedMap || result)
  const noRankLabel = analysis.summary.eligible ? text(en, uiText('名次暂缺', locale), 'Rank unavailable') : text(en, uiText('出场样本尚未达到正式排名门槛', locale), 'Below the official ranking threshold')
  const { identity } = dossier

  useEffect(() => {
    if (view !== 'matches' || !expandedKey) return
    const frame = requestAnimationFrame(() => document.getElementById(`player-maps-${expandedKey.replaceAll(':', '-')}`)?.previousElementSibling?.scrollIntoView({ block: 'center', behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [expandedKey, view])

  return <section className={pages.analysis} data-player-analysis>
    <header className={pages.analysisHeading}>
      <div className={pages.analysisIdentity}><p><Link {...linkProps(`/teams/${encodeURIComponent(identity.teamRouteId)}`)}>{identity.teamShort} ↗</Link><span>03 / {text(en, uiText('竞技分析', locale), 'PLAYER PERFORMANCE')}</span></p><h1>{identity.displayName}</h1><p><SignalBattleTag value={identity.battleTag} en={en} /></p></div>
        <div className={pages.analysisActions}>{analysis.summary.maps > 0 && <Link {...linkProps(playerComparisonPath(active.entry, location.search, mode))}>{text(en, uiText('同职责选手对比', locale), 'Compare this role')} ↗</Link>}<button type="button" onClick={onShare}>{text(en, uiText('分享数据', locale), 'Share stats')} ↗</button></div>
      <div className={pages.analysisRating}><p>SEASON OVR <span>{roleLabel(active.role, en, locale)}</span></p><div className={pages.ratingValue}><strong>{formatSeasonRatingValue(active.entry)}</strong><span>{getSeasonRatingStatusLabel(active.entry, locale)}{analysis.summary.rank ? <b>#{analysis.summary.rank}<small> / {analysis.summary.rankTotal}</small><small>{text(en, uiText('同职责排名', locale), 'Rank in this role')}</small></b> : <small>{noRankLabel}</small>}</span></div><SeasonRating entry={active.entry} locale={locale} explanationOnly /></div>
      <div className={pages.scopeBar}>
        <div className={pages.roleScope} data-count={dossier.roleEntries.length} style={{ '--player-role-count': dossier.roleEntries.length }}><span>{text(en, uiText('分析职责', locale), 'ROLE IN VIEW')}</span><div className={styles.roleTabs} aria-label={text(en, uiText('选手职责', locale), 'Player role')}>
          {dossier.roleEntries.map(item => <button type="button" key={item.role} data-role={item.role} aria-pressed={item.role === active.role} onClick={() => change({ role: item.role, phero: '', pmap: '', hfocus: '', presult: '', pshow: '', popen: '', ptrend: '' })}><i aria-hidden="true" />{roleLabel(item.role, en, locale)}<small>{mapLabel(en, item.summary.maps, locale)}</small></button>)}
        </div></div>
        <dl className={pages.analysisSample}><div><dt>{text(en, uiText('出场比赛', locale), 'Matches played')}</dt><dd>{roleAppearances.length}</dd></div><div><dt>{text(en, uiText('出场比赛赛果', locale), 'Results when playing')}</dt><dd>{wins}<small>{text(en, uiText('胜', locale), 'W')}</small><span> / </span>{losses}<small>{text(en, uiText('负', locale), 'L')}</small>{draws > 0 && <small> · {draws}{text(en, uiText('平', locale), 'D')}</small>}</dd></div><div><dt>{text(en, uiText('本职责时长', locale), 'Role playtime')}</dt><dd>{analysis.summary.timeLabel}</dd></div></dl>
      </div>
    </header>
    {!roleAppearances.length ? <div className={styles.empty}><h2>{text(en, uiText('本职责的出场记录，尚待收录。', locale), 'No recorded appearances in this role yet.')}</h2><p>{text(en, uiText('登记身份保留在选手档案中；有已发布出场后，再呈现英雄、地图和竞技表现。', locale), 'The registered identity remains in the profile. Published appearances will add hero, map and performance records.')}</p><Link {...linkProps(`/players/${encodeURIComponent(identity.playerId)}`)}>{text(en, uiText('返回选手档案', locale), 'Back to the player profile')} ↗</Link></div> : <><nav className={pages.analysisTabs} aria-label={text(en, uiText("数据分析内容", locale), 'Analysis sections')}>
      {[['performance', text(en, '表现概览', 'Performance')], ['heroes', text(en, '英雄使用', 'Heroes')], ['maps', text(en, '地图表现', 'Maps')], ['matches', text(en, '比赛记录', 'Matches')]].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} aria-controls="player-analysis-content" onClick={() => change({ pview: key })}>{uiText(label, locale)}{key === 'heroes' ? <small>{heroes.length}</small> : key === 'maps' ? <small>{maps.length}</small> : key === 'matches' ? <small>{roleAppearances.length}</small> : null}</button>)}
    </nav>
    <div id="player-analysis-content" className={pages.analysisContent}>
      {view === 'performance' && <><PlayerPersonalReadout active={active} appearances={roleAppearances} locale={locale} onHero={key => change({ pview: 'heroes', hfocus: key })} onMatches={viewAllMatches} /><PlayerPerformanceTable analysis={analysis} mode={mode} setMode={value => change({ pmode: value })} en={en} />{roleAppearances.length > 1 && <PlayerRecentForm matches={roleAppearances} en={en} selectedKey={params.get('ptrend')} onSelect={chooseTrend} onViewMatches={viewAllMatches} />}<SignalPlayerRatingJourney matches={roleAppearances} en={en} locale={locale} seasonId={seasonId} selectedKey={params.get('ptrend')} onSelect={key => change({ ptrend: key })} linkProps={linkProps} /></>}
      {view === 'heroes' && <PlayerHeroWorkbench heroes={heroes} totalMaps={roleAppearances.reduce((total, match) => total + match.maps.length, 0)} focusHero={params.get('hfocus')} onFocusHero={key => change({ hfocus: key })} onSelect={chooseHero} onShare={heroKey => onShare({ kind: 'hero', role: active.role, heroKey })} en={en} locale={locale} />}
      {view === 'maps' && <PlayerMapAtlas maps={maps} en={en} locale={locale} onSelect={chooseMap} />}
      {view === 'matches' && <section id="player-history" className={styles.history} aria-label={text(en, uiText("比赛记录", locale), 'Match record')}>
        <div className={pages.historyHeading}><div><p>MATCH RECORD</p><h2>{text(en, uiText('比赛记录', locale), 'Match record')}</h2></div><p aria-live="polite">{roleLabel(active.role, en, locale)} · {matchLabel(en, filtered.length, locale)}{hasFilters && ` / ${matchLabel(en, roleAppearances.length, locale)}`}</p></div>
        <div className={styles.historyFilters}>
          <div className={styles.segmented} aria-label={text(en, uiText("比赛结果", locale), 'Match result')}>{[['', text(en, '全部比赛', 'All matches')], ['win', text(en, '获胜', 'Wins')], ['loss', text(en, '失利', 'Losses')], ...(draws ? [['draw', text(en, '平局', 'Draws')]] : []), ...(pending ? [['pending', text(en, '进行中', 'Live')]] : [])].map(([value, label]) => <button type="button" key={value} aria-pressed={result === value} onClick={() => change({ presult: value, pshow: '', popen: '' })}>{label}</button>)}</div>
          <div className={pages.historySelects}><label className={styles.heroFilter}>{text(en, uiText("英雄", locale), 'Hero')}<select aria-label={text(en, uiText("筛选比赛英雄", locale), 'Filter matches by hero')} value={selectedHero?.key || ''} onChange={event => change({ phero: event.target.value, pshow: '', popen: '' })}><option value="">{text(en, uiText("全部英雄", locale), 'All heroes')}</option>{heroes.map(hero => <option value={hero.key} key={hero.key}>{formatOwHeroName(hero.hero, locale)}</option>)}</select></label><label className={styles.heroFilter}>{text(en, uiText("地图", locale), 'Map')}<select aria-label={text(en, uiText("筛选比赛地图", locale), 'Filter matches by map')} value={selectedMap?.key || ''} onChange={event => change({ pmap: event.target.value, pshow: '', popen: '' })}><option value="">{text(en, uiText("全部地图", locale), 'All maps')}</option>{maps.map(map => <option key={map.key} value={map.key}>{formatOwMapName(map.name, locale)}</option>)}</select></label></div>
        </div>
        <div className={pages.recordNote}><p>{text(en, uiText('比分为所在队伍在前；评分满分 10。展开比赛，查看本职责的逐图数据。', locale), 'Scores show this player’s team first. Ratings are out of 10. Expand a match for this role’s map statistics.')}</p><button type="button" disabled={!hasFilters} onClick={viewAllMatches}>{text(en, uiText('重置筛选', locale), 'Reset filters')} ↺</button></div>
        <SignalPlayerHistory selectedMap={selectedMap?.key || ''} matches={filtered.slice(0, showCount)} en={en} locale={locale} seasonId={seasonId} selectedHero={selectedHero?.key || ''} expanded={params.get('popen') || ''} onExpand={value => change({ popen: value })} linkProps={linkProps} />
        {!filtered.length && <div className={styles.empty}><p>{roleAppearances.length ? text(en, uiText("没有符合筛选条件的比赛。", locale), 'No matches for these filters.') : text(en, uiText("暂无已公开的比赛记录。", locale), 'No published match appearances yet.')}</p>{roleAppearances.length > 0 && <button type="button" className={styles.textButton} onClick={() => change({ phero: '', pmap: '', presult: '' })}>{text(en, uiText("重置筛选", locale), 'Reset filters')} ↗</button>}</div>}
        {filtered.length > showCount && <button type="button" className={styles.showMore} onClick={() => change({ pshow: String(showCount + 8) })}>{text(en, uiText("查看更多比赛", locale), 'Show more matches')} <span>{showCount} / {filtered.length}</span> ↓</button>}
      </section>}
    </div></>}
  </section>
}
