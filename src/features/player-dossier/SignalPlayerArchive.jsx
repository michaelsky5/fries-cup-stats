import { useMemo } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalBattleTag, SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { ARCHIVE_OFFICIAL_HONORS } from '../kpr-design/archiveHonors.js'
import { getPlayerCycleHonors, weeklyHonorLabel } from '../weekly-advance/weeklyCycleHonors.js'
import { getPlayerPrimaryRole, getRecordedPlayerHeroes } from './playerDossierPresentation.js'
import { getPlayerCompanions } from './playerArchiveModel.js'
import { ArchiveHeading, PlayerArchiveMoments, PlayerArchiveNext, PlayerCompanions, archiveCopy, archiveDate, archiveRole } from './PlayerArchiveSections.jsx'
import { PlayerSignatureMatch } from './PlayerPersonalStory.jsx'
import styles from './PlayerArchive.module.css'

// 票 2.52: the 选手展厅. Its match links open the 选手数据 page's 比赛记录 (the former 赛季征程).
export default function SignalPlayerArchive({ db, dossier, appearances, archive, season, seasonId, locale, linkProps, analysisLink, onShare }) {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const text = (zh, en) => archiveCopy(locale, zh, en)
  const { identity } = dossier
  const heroes = useMemo(() => getRecordedPlayerHeroes(appearances), [appearances])
  const companions = useMemo(() => getPlayerCompanions(appearances, db.players), [appearances, db.players])
  const featuredHero = heroes.find(hero => hero.key === params.get('chero')) || heroes[0]
  const primary = getPlayerPrimaryRole(dossier)
  const hasAppearances = archive.matches.length > 0
  const hasSeasonMoments = archive.matches.length > 1 && archive.highlights.length > 0
  const shareProfile = () => onShare({ kind: 'season', role: featuredHero?.roles[0] || primary.role, heroKey: featuredHero?.key || '' })
  const team = { id: identity.teamRouteId, short: identity.teamShort, name: identity.teamFull, logo: identity.teamLogo }
  const fmvp = ARCHIVE_OFFICIAL_HONORS[season?.id || seasonId]?.fmvpPlayerId === identity.playerId
  // 票 2.19: weekly cycle placements the player earned by playing for the team in that cycle.
  const cycleHonors = useMemo(() => fmvp ? [] : getPlayerCycleHonors(db, appearances), [db, appearances, fmvp])
  const nameSize = identity.displayName.length > 12 ? 'long' : /^[\w\s.-]{1,7}$/.test(identity.displayName) ? 'short' : 'regular'
  const chooseHero = hero => {
    const next = new URLSearchParams(params)
    next.set('chero', hero)
    setParams(next, { replace: true, state: location.state, preventScrollReset: true })
  }
  const teamLink = linkProps(`/teams/${encodeURIComponent(identity.teamRouteId)}`)
  const matchesLink = (changes = {}) => analysisLink({ pview: 'matches', jmatch: '', popen: '', phero: '', pmap: '', presult: '', ...changes })

  return <section className={styles.archive} data-player-profile>
    <header className={styles.cover} data-record-state={hasAppearances ? 'played' : 'registered'}>
      <div className={styles.coverCopy}>
        <div className={styles.coverContext}><Link {...teamLink}><TeamLogo team={team} seasonId={seasonId} className={styles.logo} /><strong>{identity.teamShort}</strong><span aria-hidden="true">→</span></Link><span>{season?.publicCode || seasonId}</span></div>
        <div className={styles.name}><p className={styles.nameChapter}>{text('选手档案', 'PLAYER PROFILE')}</p><p className={styles.mobileRole}>{(archive.roles.length ? archive.roles : dossier.roles).map(role => archiveRole(role, locale)).join(' / ')}</p><p className={styles.displayName} data-name-size={nameSize} aria-hidden="true">{identity.displayName}</p><SignalBattleTag value={identity.battleTag} en={locale === 'en-US'} /></div>
        <p className={styles.identityLine}>{identity.teamFull}<span>{archive.roles.length ? archive.roles.map(role => archiveRole(role, locale)).join(' / ') : `${text('登记职责', 'Registered role')} · ${dossier.roles.map(role => archiveRole(role, locale)).join(' / ')}`}</span></p>
        {fmvp && <div className={styles.honor} aria-label={text('赛事荣誉', 'Tournament honor')}><strong>FMVP</strong><span>{text('总决赛最有价值选手', 'Finals Most Valuable Player')}</span></div>}
        {cycleHonors.length > 0 && <div className={styles.honor} data-cycle-honor aria-label={text('赛段荣誉', 'Cycle honours')}><strong>{weeklyHonorLabel(cycleHonors[0], locale)}</strong><span>{[cycleHonors[0].team?.team_short_name || cycleHonors[0].team?.short || identity.teamShort, ...cycleHonors.slice(1).map(honor => weeklyHonorLabel(honor, locale))].join(' · ')}</span></div>}
        {hasAppearances ? <dl className={styles.coverFacts}><div><dt>{text('场比赛', archive.matches.length === 1 ? 'match' : 'matches')}</dt><dd>{archive.matches.length}</dd></div><div><dt>{text('图出场', archive.mapCount === 1 ? 'map played' : 'maps played')}</dt><dd>{archive.mapCount}</dd></div><div><dt>{text('位出场英雄', heroes.length === 1 ? 'recorded hero' : 'recorded heroes')}</dt><dd>{heroes.length}</dd></div></dl> : <div className={styles.registration}><strong>{text('本届阵容成员', 'On this season’s roster')}</strong><p>{text('暂无已发布出场记录。', 'No published appearances are available.')}</p></div>}
        <div className={styles.coverActions}><Link {...(hasAppearances ? matchesLink() : teamLink)} className={styles.primary}>{hasAppearances ? archive.matches.length === 1 ? text('查看出场记录', 'View this appearance') : pickUiLocale(locale, '查看全部比赛记录', 'View every match', '모든 경기 기록 보기', '查看全部比賽記錄') : text('查看所属队伍', 'View the team')} <span aria-hidden="true">→</span></Link><button type="button" onClick={shareProfile}>{text('分享档案', 'Share profile')} →</button></div>
      </div>
      <figure className={styles.portrait}>
        <div className={styles.portraitMeta}><span>{text(featuredHero ? '来自本季出场记录' : '所属战队', featuredHero ? 'FROM THIS SEASON' : 'TEAM IDENTITY')}</span><span>{archive.first ? archiveDate(archive.first) : season?.publicCode || seasonId}{archive.latest && archive.latest !== archive.first ? ` — ${archiveDate(archive.latest)}` : ''}</span></div>
        <span className={styles.wordmark} aria-hidden="true">{identity.teamShort}</span>
        {featuredHero ? <HeroArtwork hero={featuredHero.hero} variant="spotlight" decorative priority locale={locale} className={styles.coverArt} /> : <TeamLogo team={team} seasonId={seasonId} className={styles.fallbackLogo} />}
        <figcaption>{featuredHero ? <><span>{featuredHero.maps === heroes[0]?.maps ? heroes.filter(hero => hero.maps === featuredHero.maps).length > 1 ? text('并列最多出场', 'Joint most recorded') : text('最多出场英雄', 'Most recorded hero') : text('出场英雄', 'Recorded hero')}</span><Link {...analysisLink({ pview: 'heroes', role: featuredHero.roles[0], hfocus: featuredHero.key, phero: '', pmap: '', popen: '' })}><strong>{formatOwHeroName(featuredHero.hero, locale)}</strong><span>{featuredHero.maps} {text('图', featuredHero.maps === 1 ? 'map' : 'maps')} →</span></Link></> : <><span>{text('参赛战队', 'TEAM')}</span><strong>{identity.teamShort}</strong></>}</figcaption>
      </figure>
      {featuredHero && <div className={styles.heroSelection}><div className={styles.mobileHeroLabel}><span>{text('封面英雄', 'Featured hero')}</span><Link {...analysisLink({ pview: 'heroes', role: featuredHero.roles[0], hfocus: featuredHero.key, phero: '', pmap: '', popen: '' })}>{formatOwHeroName(featuredHero.hero, locale)} →</Link></div>{heroes.length > 1 && <div className={styles.heroChoices} aria-label={text('切换展示英雄', 'Choose featured hero')}>{heroes.slice(0, 4).map(hero => <button key={hero.key} type="button" aria-label={formatOwHeroName(hero.hero, locale)} aria-pressed={hero.key === featuredHero.key} onClick={() => chooseHero(hero.key)}><SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /></button>)}</div>}</div>}
    </header>

    {hasAppearances && <><nav className={styles.chapterNav} style={{ '--chapter-count': hasSeasonMoments ? 4 : 3 }} aria-label={text('档案章节', 'Profile chapters')}><a href="#player-signature-match">{text('代表比赛', 'Featured match')}</a><a href="#player-hero-collection">{text('英雄使用', 'Hero usage')}</a><a href="#player-companions">{text('同场队友', 'Teammates')}</a>{hasSeasonMoments && <a href="#player-season-moments">{text('比赛记录', 'Match records')}</a>}</nav>
      <PlayerSignatureMatch appearances={appearances} roleEntries={dossier.roleEntries} defaultRole={primary.role} locale={locale} seasonId={seasonId} analysisLink={analysisLink} onShare={onShare} />
      <section id="player-hero-collection" className={styles.heroCollection}>
        <ArchiveHeading number="01" english="HEROES IN THE RECORD" title={text('英雄使用', 'Hero usage')} detail={text('本届比赛使用过的英雄。', 'Heroes used in this event.')} locale={locale} />
        <div className={styles.heroGrid} data-count={Math.min(heroes.length, 4)}>{heroes.slice(0, 4).map((hero, index) => <Link key={hero.key} {...analysisLink({ pview: 'heroes', role: hero.roles[0], hfocus: hero.key, phero: '', pmap: '', popen: '' })} className={styles.heroCard}>
          <div className={styles.heroCardTop}><span>{String(index + 1).padStart(2, '0')}</span><span>{hero.roles.map(role => archiveRole(role, locale)).join(' / ')}</span></div><HeroArtwork hero={hero.hero} variant="roster" decorative locale={locale} className={styles.heroCardArt} /><div className={styles.heroCardText}><strong>{formatOwHeroName(hero.hero, locale)}</strong><div><b>{hero.maps}</b><span>{text('图', hero.maps === 1 ? 'map' : 'maps')} · {hero.matches} {text('场比赛', hero.matches === 1 ? 'match' : 'matches')}</span><span aria-hidden="true">→</span></div></div>
        </Link>)}</div>
        {heroes.length > 4 && <details className={styles.moreHeroes}><summary>{text('其余出场英雄', 'More recorded heroes')} · {heroes.length - 4}</summary><div>{heroes.slice(4).map(hero => <Link key={hero.key} {...analysisLink({ pview: 'heroes', role: hero.roles[0], hfocus: hero.key, phero: '', pmap: '', popen: '' })}><SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /><strong>{formatOwHeroName(hero.hero, locale)}</strong><span>{hero.maps} {text('图', hero.maps === 1 ? 'map' : 'maps')} →</span></Link>)}</div></details>}
        {!heroes.length && <p className={styles.note}>{text('已收录出场，英雄记录尚待补充。', 'Appearances are recorded; hero details are not available yet.')}</p>}
        <div className={styles.heroFoot}><p>{text('同一张图可记录多个英雄；出场图数不等于使用时长或熟练度。', 'A map can record several heroes. Map counts do not measure playtime or proficiency.')}</p><Link {...analysisLink({ role: primary.role, pview: 'heroes' })}>{text('查看英雄使用分析', 'Explore hero usage')} →</Link></div>
      </section>
      <PlayerCompanions companions={companions} locale={locale} linkProps={linkProps} teamLink={teamLink} />
      {hasSeasonMoments && <PlayerArchiveMoments archive={archive} locale={locale} seasonId={seasonId} matchLink={match => matchesLink({ jmatch: match.matchId, role: match.roles?.[0] || '' })} />}
      <PlayerArchiveNext matchesLink={matchesLink()} analysisLink={analysisLink()} locale={locale} />
    </>}
  </section>
}
