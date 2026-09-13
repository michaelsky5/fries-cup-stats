import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import { formatOwHeroName, formatOwMapName, formatOwMapMode } from '../../lib/heroes.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { Arrow, AtlasImage, HeroPortrait } from '../map-atlas/MapAtlasShared.jsx'
import { formatMapDuration, mapImageUrl } from '../map-atlas/mapAtlasModel.js'
import { filterHeroRecords, heroGuideHref, heroMatchHref } from './heroDataModel.js'
import { GuideEmpty, GuideMethod, GuideSectionTitle, HeroDataNav, percentage, roleLabel } from './HeroDataShared.jsx'
import styles from './HeroData.module.css'

function PlayerEvidence({ hero, isEn, withSeason, evidenceHref }) {
  const uiLocale = useUiLocale()
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()
  return <section className={styles.analysisPanel} id="hero-players" aria-labelledby="hero-players-heading">
    <header><h3 id="hero-players-heading">{isEn ? 'The players behind the hero' : uiText("谁把这个英雄带上场", uiLocale)}</h3><span>{hero.players.length} {isEn ? 'players' : uiText("位选手", uiLocale)}</span></header>
    <div className={styles.tableLabels}><span>{isEn ? 'PLAYER / RECORDED TEAM' : uiText("选手 / 记录中的队伍", uiLocale)}</span><span>{isEn ? 'APPEARANCES' : uiText("出场记录", uiLocale)}</span></div>
    {hero.players.length ? <ol className={styles.playerList}>{hero.players.slice(0, expanded ? undefined : 6).map((player, index) => <li key={player.key}><span className={styles.rowRank}>{String(index + 1).padStart(2, '0')}</span><div>{player.id ? <Link to={withSeason(`/players/${encodeURIComponent(player.id)}`)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)}>{player.name}<Arrow /></Link> : <strong>{player.name}</strong>}<small>{player.teams.join(' / ') || '—'}</small></div><Link className={styles.evidenceCount} to={evidenceHref({ heroPlayer: player.key })} aria-label={isEn ? `View ${player.name}'s ${player.count} appearances` : uiText("查看 {0} 的 {1} 次出场记录", uiLocale, [player.name, player.count])}><b>{player.count}</b><Arrow /></Link></li>)}</ol> : <p className={styles.directoryNote}>{isEn ? 'Player identities are unavailable for these records.' : uiText("这些记录暂未提供可识别的选手信息。", uiLocale)}</p>}
    {hero.players.length > 6 ? <button className={styles.expandButton} type="button" onClick={() => setExpanded(value => !value)}>{expanded ? (isEn ? 'Show fewer players' : uiText("收起选手", uiLocale)) : (isEn ? `All ${hero.players.length} players` : uiText("查看全部 {0} 位选手", uiLocale, [hero.players.length]))}<Arrow down={!expanded} /></button> : null}
  </section>
}

function MapEvidence({ hero, isEn, locale, withSeason, evidenceHref }) {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  return <section className={styles.analysisPanel} id="hero-maps" aria-labelledby="hero-maps-heading">
    <header><h3 id="hero-maps-heading">{isEn ? 'Where the hero appears' : uiText("在哪些地图留下记录", locale)}</h3><span>{hero.maps.length} {isEn ? 'maps' : uiText("张地图", locale)}</span></header>
    <div className={styles.tableLabels}><span>{isEn ? 'MAP' : uiText("地图", locale)}</span><span>{isEn ? 'APPEARANCES / MAP RATE' : uiText("出场记录 / 该图出场率", locale)}</span></div>
    <ol className={styles.mapList}>{hero.maps.slice(0, expanded ? undefined : 6).map(map => <li key={map.key}><Link className={styles.mapIdentity} to={withSeason(`/maps/${encodeURIComponent(map.routeName)}`)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)}><AtlasImage src={mapImageUrl(map)} className={styles.mapThumb} /><span><strong>{formatOwMapName(map.name, locale)}</strong><small>{formatOwMapMode(map.type, locale)}</small></span></Link><Link className={styles.mapCount} to={evidenceHref({ heroMap: map.name })} aria-label={isEn ? `View ${map.count} appearances on ${map.name}` : uiText("查看在{0}的 {1} 次出场记录", locale, [formatOwMapName(map.name, locale), map.count])}><b>{map.count}</b><small>{percentage(map.rate)}</small><Arrow /></Link></li>)}</ol>
    {hero.maps.length > 6 ? <button className={styles.expandButton} type="button" onClick={() => setExpanded(value => !value)}>{expanded ? (isEn ? 'Show fewer maps' : uiText("收起地图", locale)) : (isEn ? `All ${hero.maps.length} maps` : uiText("查看全部 {0} 张地图", locale, [hero.maps.length]))}<Arrow down={!expanded} /></button> : null}
    <p className={styles.smallNote}>{isEn ? 'Map rate = hero appearances / covered team-sides on that map.' : uiText("该图出场率 = 英雄在该图的出场次数 ÷ 该图有英雄信息的队伍样本。", locale)}</p>
  </section>
}

function RecordLedger({ hero, params, setParams, locale, isEn, withSeason }) {
  const [limit, setLimit] = useState({ key: '', value: 8 })
  const location = useLocation()
  const map = params.get('heroMap') || ''
  const player = params.get('heroPlayer') || ''
  const search = params.get('heroRecordSearch') || ''
  const filterKey = `${hero.key}|${map}|${player}|${search}`
  const visibleCount = limit.key === filterKey ? limit.value : 8
  const records = useMemo(() => filterHeroRecords(hero, { map, player, search }), [hero, map, player, search])
  const update = values => setParams(previous => {
    const next = new URLSearchParams(previous)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    return next
  }, { replace: true, preventScrollReset: true, flushSync: true, state: { ...location.state, restoreScrollY: undefined } })
  const filtered = Boolean(map || player || search)
  return <section id="hero-records" className={styles.records} aria-labelledby="hero-records-title">
    <GuideSectionTitle number="03" english="FOLLOW THE EVIDENCE" titleId="hero-records-title" title={isEn ? 'Back to the matches.' : uiText("回到每一场比赛。", locale)}><span role="status" aria-live="polite" id="hero-records-heading">{records.length} {isEn ? 'map records' : uiText("条地图记录", locale)}</span></GuideSectionTitle>
    <div className={styles.recordToolbar}><label className={styles.search}><ImeSafeInput aria-label={isEn ? 'Search hero records' : uiText("搜索英雄比赛记录", locale)} placeholder={isEn ? 'Find a team, player or map…' : uiText("搜索队伍、选手或地图…", locale)} value={search} onValueChange={value => update({ heroRecordSearch: value })} />{search ? <button type="button" onClick={() => update({ heroRecordSearch: '' })} aria-label={isEn ? 'Clear record search' : uiText("清除比赛搜索", locale)}>×</button> : null}</label><select aria-label={isEn ? 'Filter records by map' : uiText("按地图筛选比赛", locale)} value={map} onChange={event => update({ heroMap: event.target.value })}><option value="">{isEn ? 'All maps' : uiText("全部地图", locale)}</option>{map && !hero.maps.some(item => item.name === map) ? <option value={map}>{map}</option> : null}{hero.maps.map(item => <option value={item.name} key={item.key}>{formatOwMapName(item.name, locale)}</option>)}</select><select aria-label={isEn ? 'Filter records by player' : uiText("按选手筛选比赛", locale)} value={player} onChange={event => update({ heroPlayer: event.target.value })}><option value="">{isEn ? 'All players' : uiText("全部选手", locale)}</option>{player && !hero.players.some(item => item.key === player) ? <option value={player}>{isEn ? 'Unavailable player' : uiText("未匹配选手", locale)}</option> : null}{hero.players.map(item => <option value={item.key} key={item.key}>{item.name} · {item.teams.join(' / ')}</option>)}</select></div>
    <div className={styles.recordNote}><p>{isEn ? 'Player names identify the side recording this hero. A mirror appears once here.' : uiText("选手名标出哪一侧记录了该英雄；双方同选时，一张图在这里仍只列一次。", locale)}</p>{filtered ? <button type="button" onClick={() => update({ heroMap: '', heroPlayer: '', heroRecordSearch: '' })}>{isEn ? 'Clear filters' : uiText("清除筛选", locale)} ×</button> : null}</div>
    {records.length ? <ol className={styles.recordList}>{records.slice(0, visibleCount).map(record => <li key={record.id}><Link className={styles.recordRow} to={withSeason(heroMatchHref(record))} state={getReturnState(location)} onClick={() => saveReturnScroll(location)}>
      <div className={styles.recordMap}><AtlasImage src={mapImageUrl(record)} className={styles.recordThumb} /><span><strong>{formatOwMapName(record.name, locale)}</strong><small>{record.date ? new Date(record.timestamp).toLocaleDateString(isEn ? 'en-GB' : 'zh-CN', { month: '2-digit', day: '2-digit' }) : '—'}<i> / </i>{isEn ? `Map ${record.order}` : uiText("第 {0} 图", locale, [record.order])}</small></span></div>
      <div className={styles.matchup}><span className={styles.scoreSeparator} aria-hidden="true">:</span>{[['A', record.a, record.scoreA], ['B', record.b, record.scoreB]].map(([side, team, score]) => <div key={side} className={styles.matchSide} data-winner={record.winner === side}><span><b>{team.short || team.name || '—'}</b><small>{record.appearances.filter(item => item.side === side).flatMap(item => item.players.map(person => person.name)).join(' / ') || '—'}</small></span><strong>{score ?? '—'}</strong></div>)}</div><span className={styles.recordDuration}>{formatMapDuration(record.duration)}</span><Arrow />
    </Link></li>)}</ol> : <GuideEmpty title={isEn ? 'No matching matches' : uiText("没有符合条件的比赛", locale)}>{isEn ? 'Try clearing a map, player or search filter.' : uiText("试试清除地图、选手或搜索条件。", locale)}</GuideEmpty>}
    {records.length > visibleCount ? <button className={styles.expandButton} type="button" onClick={() => setLimit({ key: filterKey, value: visibleCount + 8 })}>{isEn ? 'More matches' : uiText("继续查看", locale)}<span>{Math.min(visibleCount, records.length)} / {records.length}</span><Arrow down /></button> : null}
  </section>
}

export default function SignalHeroDossier({ guide, hero, params, setParams, locale, withSeason }) {
  const isEn = locale === 'en-US'
  const backTo = heroGuideHref(params, '', '#hero-directory')
  const evidenceHref = filters => {
    const next = new URLSearchParams(params)
    ;['heroMap', 'heroPlayer', 'heroRecordSearch'].forEach(key => next.delete(key))
    Object.entries(filters).forEach(([key, value]) => next.set(key, value))
    return `/heroes?${next.toString()}#hero-records`
  }
  return <div className={styles.shell} data-hero-guide="dossier" data-role={hero.role} data-i18n-ignore>
    <HeroDataNav withSeason={withSeason} isEn={isEn} backTo={backTo} />
    <header className={styles.dossierHero}>
      <span className={styles.dossierWatermark} aria-hidden="true">{hero.name.toUpperCase()}</span>
      <HeroArtwork hero={hero.name} variant="spotlight" decorative priority className={styles.dossierArt} />
      <div className={styles.dossierCopy}><span className={styles.eyebrow}>{roleLabel(hero.role, isEn)}<i> / </i>{isEn ? `No. ${hero.roleRank} in recorded appearances for this role` : uiText("本职责记录出场第 {0}", locale, [hero.roleRank])}</span><h1>{formatOwHeroName(hero.name, locale)}</h1>{!isEn ? <span className={styles.dossierEnglish}>{hero.name.toUpperCase()}</span> : null}<div className={styles.dossierRate}><strong>{percentage(hero.rate)}</strong><span>{isEn ? 'recorded appearance rate' : uiText("记录出场率", locale)}<small>{hero.count} / {guide.samples} {isEn ? 'team-sides' : uiText("份队伍单图记录", locale)}</small></span></div></div>
      <span className={styles.dossierRole}>{hero.role.toUpperCase()}</span>
    </header>
    <div className={styles.dossierFacts}><p><strong>{hero.count}</strong><span>{isEn ? 'recorded appearances' : uiText("次记录出场", locale)}</span></p><a href="#hero-players"><strong>{hero.players.length}</strong><span>{isEn ? 'recorded players' : uiText("位使用选手", locale)}</span><Arrow down /></a><a href="#hero-maps"><strong>{hero.maps.length}</strong><span>{isEn ? 'maps with this hero' : uiText("张出场地图", locale)}</span><Arrow down /></a><a href="#hero-records"><strong>{hero.records.length}</strong><span>{isEn ? 'map records' : uiText("条可回溯地图记录", locale)}</span><Arrow down /></a></div>
    <p className={styles.dossierReading}>{isEn ? 'Post-map records only. When both teams record this hero, it counts as two appearances and one map record.' : uiText("按赛后单图记录统计。双方都记录了这个英雄时，计 2 次出场，在比赛列表中合为 1 条地图记录。", locale)}</p>
    <nav className={styles.chapterNav} aria-label={isEn ? 'Hero file chapters' : uiText("英雄档案章节", locale)}><a href="#hero-footprint">01 {isEn ? 'Players & maps' : uiText("选手与地图", locale)}</a><a href="#hero-partners">02 {isEn ? 'Recorded partners' : uiText("同队英雄", locale)}</a><a href="#hero-records">03 {isEn ? 'Match records' : uiText("比赛记录", locale)}</a></nav>
    <section className={styles.footprint} id="hero-footprint"><GuideSectionTitle number="01" english="THE SEASON FOOTPRINT" title={isEn ? 'A hero, through the season.' : uiText("英雄在赛季里的足迹。", locale)} /><div className={styles.analysisGrid}><PlayerEvidence hero={hero} isEn={isEn} withSeason={withSeason} evidenceHref={evidenceHref} /><MapEvidence hero={hero} isEn={isEn} locale={locale} withSeason={withSeason} evidenceHref={evidenceHref} /></div></section>
    <section className={styles.partnerSection} id="hero-partners"><GuideSectionTitle number="02" english="RECORDED ON THE SAME SIDE" title={isEn ? 'Alongside this hero.' : uiText("记录中的同队英雄。", locale)} /><p className={styles.partnerNote}>{isEn ? 'Heroes recorded on the same team-side, ranked by shared appearances. This does not imply a full-match lineup.' : uiText("按同一侧单图记录中的共同出场次数排列，不代表全程同时使用的阵容。", locale)}</p><div className={styles.partnerGrid}>{hero.partners.slice(0, 5).map(partner => <Link key={partner.key} to={heroGuideHref(params, partner.key)}><HeroPortrait name={partner.name} className={styles.partnerPortrait} /><span><strong>{formatOwHeroName(partner.name, locale)}</strong><small>{roleLabel(partner.role, isEn)}</small></span><b>{partner.count}<small>{isEn ? 'shared records' : uiText("次共同记录", locale)}</small></b><Arrow /></Link>)}</div>{!hero.partners.length ? <p>{isEn ? 'No shared hero records yet.' : uiText("暂时没有可用的同队英雄记录。", locale)}</p> : null}</section>
    <RecordLedger hero={hero} params={params} setParams={setParams} locale={locale} isEn={isEn} withSeason={withSeason} />
    <GuideMethod guide={guide} isEn={isEn} /><footer className={styles.footer}><Link to={backTo}><Arrow back />{isEn ? 'Back to all heroes' : uiText("返回英雄索引", locale)}</Link><span>HERO FIELD GUIDE</span></footer>
  </div>
}
