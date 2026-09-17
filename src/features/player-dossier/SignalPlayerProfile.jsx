import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalBattleTag, SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { ARCHIVE_OFFICIAL_HONORS } from '../kpr-design/archiveHonors.js'
import { getPlayerSeasonJourney, getRecordedPlayerHeroes } from './playerDossierPresentation.js'
import { PlayerHeroCollection, PlayerRolePortfolio, PlayerSeasonJourney } from './SignalPlayerProfileSections.jsx'
import pages from './SignalPlayerPages.module.css'

const text = (en, zh, english) => en ? english : zh
const roleLabel = (role, en, labelLocale = 'zh-CN') => uiText(en ? getRoleEnLabel(role) : getRoleLabel(role), labelLocale)

export default function SignalPlayerProfile({ dossier, appearances, season, seasonId, locale, linkProps, analysisLink, onFavorite, favorited, favoriteDisabled, onShare }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const change = values => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setParams(next, { replace: true, state: location.state, preventScrollReset: true })
  }
  const { identity } = dossier
  const journey = useMemo(() => getPlayerSeasonJourney(appearances), [appearances])
  const heroes = useMemo(() => getRecordedPlayerHeroes(appearances), [appearances])
  const featuredHero = heroes.find(hero => hero.key === params.get('chero')) || heroes[0]
  const seasonName = uiText(season?.name?.[en ? 'en' : 'zh'], locale) || season?.publicCode || seasonId
  const honors = ARCHIVE_OFFICIAL_HONORS[season?.id || seasonId]
  const fmvp = honors?.fmvpPlayerId === identity.playerId
  const nameSize = identity.displayName.length > 12 ? 'long' : /^[\w\s.-]{1,7}$/.test(identity.displayName) ? 'short' : 'regular'
  const team = { id: identity.teamRouteId, short: identity.teamShort, name: identity.teamFull, logo: identity.teamLogo }

  return <section className={pages.profile} data-player-profile>
    <header className={pages.profileCover}>
      <div className={pages.profileCopy}>
        <div className={pages.coverTop}><Link {...linkProps(`/teams/${encodeURIComponent(identity.teamRouteId)}`)}><TeamLogo team={team} seasonId={seasonId} className={pages.profileTeamLogo} /><b>{identity.teamShort}</b><span aria-hidden="true">↗</span></Link><span>{season?.publicCode || seasonId}</span></div>
        <div className={pages.profileName}><p>{text(en, uiText("选手档案", locale), 'PLAYER PROFILE')}</p><h1 data-name-size={nameSize}>{identity.displayName}</h1><p className={pages.profileTag}><SignalBattleTag value={identity.battleTag} en={en} /></p></div>
        <div className={pages.profileCoverBottom}><p>{identity.teamFull}</p><Link {...analysisLink()} className={pages.primaryAction}>{text(en, uiText("查看数据分析", locale), 'Explore statistics')}<span aria-hidden="true">↗</span></Link></div>
        <div className={pages.profileActions}><button type="button" onClick={onFavorite} disabled={favoriteDisabled} aria-pressed={favorited}>{favorited ? text(en, uiText("已关注", locale), 'Following') : favoriteDisabled ? text(en, uiText("关注已满", locale), 'Limit reached') : text(en, uiText("关注选手", locale), 'Follow player')}</button><button type="button" onClick={onShare}>{text(en, uiText("分享档案", locale), 'Share profile')} ↗</button></div>
      </div>
      <figure className={pages.profilePortrait} data-has-art={Boolean(featuredHero)}>
        <div className={pages.portraitHeading}><span>{text(en, featuredHero ? uiText("本季英雄选择", locale) : uiText("所属战队", locale), featuredHero ? 'HERO SELECTION' : 'TEAM')}</span><span>{heroes.length ? `${heroes.length} ${text(en, '位英雄', 'heroes')}` : identity.teamShort}</span></div>
        <span className={pages.portraitWordmark} aria-hidden="true">{identity.teamShort}</span>
        {featuredHero ? <HeroArtwork hero={featuredHero.hero} variant="spotlight" className={pages.portraitArtwork} decorative priority locale={locale} /> : <TeamLogo team={team} seasonId={seasonId} className={pages.portraitTeamFallback} />}
        {heroes.length > 1 && <div className={pages.portraitChoices} aria-label={text(en, uiText("切换展示英雄", locale), 'Choose featured hero')}>{heroes.slice(0, 4).map(hero => <button key={hero.key} type="button" aria-pressed={hero.key === featuredHero.key} onClick={() => change({ chero: hero.key })} aria-label={formatOwHeroName(hero.hero, locale)}><SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /></button>)}</div>}
        <figcaption>{featuredHero ? <><span>{text(en, featuredHero.key === heroes[0].key ? uiText("最多出场英雄", locale) : uiText("出场英雄", locale), featuredHero.key === heroes[0].key ? 'Most recorded hero' : 'Recorded hero')}</span><Link {...analysisLink({ pview: 'heroes', role: featuredHero.roles[0], hfocus: featuredHero.key, phero: '', pmap: '', popen: '', presult: '' })}><b>{formatOwHeroName(featuredHero.hero, locale)}</b><small>{text(en, uiText("{0} 图", locale, [featuredHero.maps]), `${featuredHero.maps} maps`)}</small><span aria-hidden="true">↗</span></Link></> : <span>{identity.teamFull}</span>}</figcaption>
      </figure>
    </header>

    <div className={pages.seasonSummary}>
      <div className={pages.seasonIdentity}><p>{season?.publicCode || seasonId}</p><strong>{seasonName}</strong></div>
      <dl><div><dt>{text(en, uiText("出场比赛", locale), 'Matches')}</dt><dd>{journey.matches.length}</dd></div><div><dt>{text(en, uiText("出场地图", locale), 'Maps')}</dt><dd>{journey.mapCount}</dd></div><div><dt>{text(en, uiText("出场职责", locale), 'Roles played')}</dt><dd>{journey.roles.length}</dd></div></dl>
    </div>

    {journey.matches.length > 0 && <nav className={pages.profileIndex} aria-label={text(en, uiText("档案章节", locale), 'Profile chapters')}>
      <a href="#player-role-portfolio"><small>01</small>{text(en, uiText("赛场角色", locale), 'On the roster')}</a>
      <a href="#player-season-journey"><small>02</small>{text(en, uiText("赛季征程", locale), 'Season journey')}</a>
      {heroes.length > 0 && <a href="#player-hero-collection"><small>03</small>{text(en, uiText("英雄图鉴", locale), 'Hero collection')}</a>}
    </nav>}

    {fmvp && <section className={pages.honor} aria-label={text(en, uiText("赛事荣誉", locale), 'Tournament honors')}><strong>FMVP</strong><div><p>{text(en, uiText("总决赛最有价值选手", locale), 'Finals Most Valuable Player')}</p><span>{seasonName}</span></div></section>}

    <PlayerRolePortfolio dossier={dossier} journey={journey} en={en} analysisLink={analysisLink} />
    <PlayerSeasonJourney journey={journey} en={en} seasonId={seasonId} linkProps={linkProps} phaseKey={params.get('pstage')} onPhaseChange={phase => change({ pstage: phase })} />
    <PlayerHeroCollection heroes={heroes} en={en} locale={locale} analysisLink={analysisLink} selectedRole={params.get('crole')} onRoleChange={role => change({ crole: role })} />

    <footer className={pages.profileFooter}><div><span>{text(en, uiText("所属战队", locale), 'Team')}</span><Link {...linkProps(`/teams/${encodeURIComponent(identity.teamRouteId)}`)}>{identity.teamShort} ↗</Link></div><div><span>{text(en, journey.roles.length ? uiText("本季出场职责", locale) : uiText("登记职责", locale), journey.roles.length ? 'Roles played this season' : 'Registered roles')}</span><strong>{(journey.roles.length ? journey.roles : dossier.roles).map(role => roleLabel(role, en, locale)).join(' / ')}</strong></div><Link {...analysisLink()}>{text(en, uiText("完整数据与比赛记录", locale), 'Statistics and match records')} ↗</Link></footer>
  </section>
}
