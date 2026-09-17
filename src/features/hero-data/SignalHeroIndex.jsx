import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import { SignalDataHeading } from '../../components/database/SignalDataHeader.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { Arrow, HeroPortrait } from '../map-atlas/MapAtlasShared.jsx'
import { buildHeroFieldGuide, filterGuideHeroes, findGuideHero, HERO_DATA_ROLES, heroGuideHref } from './heroDataModel.js'
import { GuideEmpty, GuideMethod, HeroDataNav, percentage, roleLabel } from './HeroDataShared.jsx'
import SignalHeroDossier from './SignalHeroDossier.jsx'
import styles from './HeroData.module.css'

function RoleSpotlight({ role, heroes, samples, locale, isEn, toHero, index }) {
  const location = useLocation()
  const leader = heroes[0]
  if (!leader) return null
  const tied = heroes[1]?.count === leader.count
  return <article className={styles.spotlight} data-role={role}>
    <div className={styles.spotlightTop}><span>{roleLabel(role, locale)}{!isEn ? <i>/ {role.toUpperCase()}</i> : null}</span><small>0{index + 1}</small></div>
    <Link to={toHero(leader.key)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} className={styles.spotlightMain} aria-label={`${formatOwHeroName(leader.name, locale)} · ${isEn ? 'Explore hero' : uiText("查看英雄档案", locale)}`}>
      <HeroPortrait name={leader.name} className={styles.spotlightPortrait} />
      <span className={styles.spotlightArtWindow}><HeroArtwork hero={leader.name} decorative priority className={styles.spotlightArt} /></span>
      <div className={styles.spotlightCopy}><span className={styles.eyebrow}>{tied ? (isEn ? 'JOINT MOST RECORDED' : uiText("本职责并列记录最多", locale)) : (isEn ? 'MOST RECORDED' : uiText("本职责记录最多", locale))}</span><h3>{formatOwHeroName(leader.name, locale)}</h3>{!isEn ? <span className={styles.heroEnglish}>{leader.name.toUpperCase()}</span> : null}</div>
      <span className={styles.spotlightMetric}><strong>{percentage(leader.rate)}</strong><span>{isEn ? 'recorded appearance rate' : uiText("记录出场率", locale)}<small>{leader.count} / {samples} {isEn ? 'team-sides' : uiText("份记录", locale)}</small></span><Arrow /></span>
    </Link>
    <div className={styles.runners}>{heroes.slice(1, 3).map(hero => <Link key={hero.key} to={toHero(hero.key)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)}><HeroPortrait name={hero.name} className={styles.runnerPortrait} /><span>{formatOwHeroName(hero.name, locale)}</span><b>{percentage(hero.rate)}</b><Arrow /></Link>)}</div>
  </article>
}

function HeroDirectory({ guide, params, setParams, locale, isEn }) {
  const location = useLocation()
  const role = HERO_DATA_ROLES.includes(params.get('heroRole')) ? params.get('heroRole') : ''
  const search = params.get('heroSearch') || ''
  const sort = ['records', 'players', 'name'].includes(params.get('heroSort')) ? params.get('heroSort') : 'records'
  const visible = useMemo(() => filterGuideHeroes(guide.heroes, { role, search, sort }), [guide, role, search, sort])
  const showOverview = !role && !search.trim() && sort === 'records'
  const filtered = Boolean(role || search.trim())
  const update = values => setParams(previous => {
    const next = new URLSearchParams(previous)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    return next
  }, { replace: true, preventScrollReset: true, flushSync: true })
  return <section className={styles.directory} id="hero-directory" aria-label={isEn ? 'Find and browse heroes' : uiText("英雄查找与浏览", locale)}>
    <div className={styles.directoryToolbar}>
      <div className={styles.roles} role="group" aria-label={isEn ? 'Filter by role' : uiText("按职责筛选", locale)}>{['', ...HERO_DATA_ROLES].map(value => {
        const count = value ? guide.heroes.filter(hero => hero.role === value).length : guide.heroes.length
        return <button type="button" key={value} aria-pressed={role === value} aria-controls="hero-results" onClick={() => update({ heroRole: value })}><span>{value ? roleLabel(value, locale) : isEn ? 'All roles' : uiText("全部英雄", locale)}</span><small>{count} {isEn ? 'heroes' : uiText("位英雄", locale)}</small></button>
      })}</div>
      <div className={styles.searchControls}><label className={styles.search}><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.5" /></svg><ImeSafeInput value={search} onValueChange={value => update({ heroSearch: value })} placeholder={isEn ? 'Find a hero…' : uiText("搜索英雄", locale) + "…"} aria-label={isEn ? 'Find a hero' : uiText("搜索英雄", locale)} aria-controls="hero-results" />{search ? <button type="button" onClick={() => update({ heroSearch: '' })} aria-label={isEn ? 'Clear search' : uiText("清除搜索", locale)}>×</button> : null}</label><select aria-label={isEn ? 'Sort heroes' : uiText("英雄排序", locale)} value={sort} onChange={event => update({ heroSort: event.target.value })}><option value="records">{isEn ? 'Most appearances' : uiText("出场记录最多", locale)}</option><option value="players">{isEn ? 'Most players' : uiText("使用选手最多", locale)}</option><option value="name">{isEn ? 'Name A–Z' : uiText("名称 A–Z", locale)}</option></select></div>
    </div>
    {showOverview ? <section className={styles.overview} aria-labelledby="role-leaders-heading">
      <header className={styles.overviewHeading}><h2 id="role-leaders-heading">{isEn ? 'Most recorded, by role.' : uiText("各职责的高频出场。", locale)}</h2><a href="#hero-results">{isEn ? 'Full directory' : uiText("查看完整列表", locale)}<Arrow down /></a></header>
      <div className={styles.spotlights}>{HERO_DATA_ROLES.map((value, index) => <RoleSpotlight key={value} role={value} heroes={guide.heroes.filter(hero => hero.role === value)} samples={guide.samples} locale={locale} isEn={isEn} index={index} toHero={key => heroGuideHref(params, key)} />)}</div>
    </section> : null}
    <section className={styles.results} id="hero-results" aria-labelledby="directory-heading">
    <header className={styles.directoryHeading}><div><h2 id="directory-heading">{search.trim() ? (isEn ? 'Matching heroes' : uiText("搜索结果", locale)) : role ? (isEn ? `${roleLabel(role, locale)} heroes` : uiText("{0}英雄", locale, [roleLabel(role, locale)])) : (isEn ? 'Hero directory' : uiText("英雄索引", locale))}</h2><span role="status" aria-live="polite">{visible.length} / {guide.heroes.length} {isEn ? 'recorded heroes' : uiText("位已收录英雄", locale)}</span></div>{filtered ? <button type="button" className={styles.resetFilters} onClick={() => update({ heroRole: '', heroSearch: '' })}>{isEn ? 'Clear filters' : uiText("清除筛选", locale)} ×</button> : <span>{isEn ? 'Select a hero to explore' : uiText("点选英雄，查看选手与比赛", locale)}<Arrow /></span>}</header>
    <div className={styles.directoryReading}><p className={styles.directoryNote}>{sort === 'players' ? (isEn ? 'Players are counted once per hero, across all their map records.' : uiText("同一选手使用同一英雄，在多张地图有记录也只计一位。", locale)) : (isEn ? `Appearance rate = hero appearances / ${guide.samples} covered team-sides. Filters keep this denominator and season ranks.` : uiText("记录出场率 = 该英雄出场次数 ÷ {0} 份队伍单图样本；筛选保留全季口径与序号。", locale, [guide.samples]))}</p><a href="#hero-method">{isEn ? 'How records are counted' : uiText("统计口径", locale)}<Arrow down /></a></div>
    <a className={styles.mobileMethodLink} href="#hero-method">{isEn ? 'About the data' : uiText('统计口径', locale)}<Arrow down /></a>
    {visible.length ? <ol className={styles.heroGrid} data-sort={sort}>{visible.map(hero => <li key={hero.key}><Link to={heroGuideHref(params, hero.key)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} className={styles.heroRow} data-role={hero.role}>
      <span className={styles.rowRank}>{sort === 'records' ? String(hero.rank).padStart(2, '0') : '↗'}</span><HeroPortrait name={hero.name} className={styles.portrait} /><span className={styles.rowIdentity}><strong>{formatOwHeroName(hero.name, locale)}</strong><small>{roleLabel(hero.role, locale)}<i> / </i>{sort === 'players' ? `${hero.count} ${isEn ? 'appearances' : uiText("次出场", locale)}` : `${hero.players.length} ${isEn ? (hero.players.length === 1 ? 'player' : 'players') : uiText("位选手", locale)}`}</small></span><span className={styles.rowMetric}><b>{sort === 'players' ? hero.players.length : percentage(hero.rate)}</b><small>{sort === 'players' ? (isEn ? (hero.players.length === 1 ? 'player' : 'players') : uiText("位选手", locale)) : `${hero.count} ${isEn ? 'appearances' : uiText("次出场", locale)}`}</small></span><span className={styles.rowTrack} aria-hidden="true"><i style={{ width: percentage(hero.rate) }} /></span>
    </Link></li>)}</ol> : <GuideEmpty title={isEn ? 'No matching heroes' : uiText("没有找到匹配的英雄", locale)} action={<button type="button" className={styles.textButton} onClick={() => update({ heroRole: '', heroSearch: '' })}>{isEn ? 'Clear filters' : uiText("清除筛选", locale)}<Arrow /></button>}>{isEn ? 'Try another name or role.' : uiText("试试其他名称，或切换职责。", locale)}</GuideEmpty>}
    </section>
  </section>
}

export default function SignalHeroIndex() {
  const { db, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const guide = useMemo(() => buildHeroFieldGuide(db), [db])
  const isEn = locale === 'en-US'
  const selected = params.get('hero')
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    if (restoreScrollY !== null) {
      restoreWindowScroll(restoreScrollY)
      return
    }
    const frame = requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' })
      else if (navigationType === 'PUSH') window.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.hash, navigationType, selected, restoreScrollY])
  const hero = selected ? findGuideHero(guide, selected) : null
  const backTo = heroGuideHref(params, '', '#hero-directory')
  if (selected) return hero ? <SignalHeroDossier key={`${db?.season?.id || ''}:${hero.key}`} guide={guide} hero={hero} params={params} setParams={setParams} locale={locale} withSeason={withSeason} /> : <div className={styles.shell} data-hero-guide="missing"><HeroDataNav withSeason={withSeason} isEn={isEn} backTo={backTo} /><GuideEmpty title={isEn ? 'No records for this hero' : uiText("本赛季暂无该英雄记录", locale)} action={<Link className={styles.textButton} to={backTo}>{isEn ? 'Browse all heroes' : uiText("浏览全部英雄", locale)}<Arrow /></Link>}>{isEn ? 'Explore heroes with published match records below.' : uiText("可返回索引，查看本赛季已有记录的英雄。", locale)}</GuideEmpty></div>
  return <div className={styles.shell} data-hero-guide="index" data-i18n-ignore>
    <HeroDataNav withSeason={withSeason} isEn={isEn} />
    <SignalDataHeading compact title={isEn ? 'The faces of this season.' : uiText("这一季，谁在场。", locale)} description={isEn ? 'Follow each hero’s recorded appearances to the players, maps and matches behind them.' : uiText("从英雄的出场记录，找到使用它的选手、地图与比赛。", locale)}>
      <span><b>{guide.heroes.length}</b> {isEn ? 'recorded heroes' : uiText("位英雄留下记录", locale)}</span>
      <span>{guide.mapRecords} {isEn ? 'map records' : uiText("条地图记录", locale)} · {guide.samples} {isEn ? 'team-sides' : uiText("份队伍单图样本", locale)}</span>
    </SignalDataHeading>
    {guide.heroes.length ? <HeroDirectory guide={guide} params={params} setParams={setParams} locale={locale} isEn={isEn} /> : <GuideEmpty title={isEn ? 'The field guide is waiting.' : uiText("英雄档案，等待开场。", locale)}>{isEn ? 'Heroes will appear once post-map statistics are published.' : uiText("发布包含英雄信息的单图统计后，这里会呈现本赛季的英雄选择。", locale)}</GuideEmpty>}
    <GuideMethod isEn={isEn} guide={guide} />
  </div>
}
