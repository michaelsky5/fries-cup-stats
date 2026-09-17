import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatPlayerMatchStage, getPlayerPrimaryRole } from './playerDossierPresentation.js'
import styles from './SignalPlayerProfileSections.module.css'

const text = (en, zh, english) => en ? english : zh
const roleLabel = (role, en, labelLocale = 'zh-CN') => uiText(en ? getRoleEnLabel(role) : getRoleLabel(role), labelLocale)
const resultLabel = (result, en, labelLocale = 'zh-CN') => uiText(({ win: text(en, '胜', 'W'), loss: text(en, '负', 'L'), draw: text(en, '平', 'D'), pending: text(en, '进行中', 'LIVE'), unknown: '—' })[result] || '—', labelLocale)
const score = match => match.scoreFor != null && match.scoreAgainst != null ? `${match.scoreFor} : ${match.scoreAgainst}` : '—'

export function PlayerRolePortfolio({ dossier, journey, en, analysisLink }) {
  const uiLocale = useUiLocale()
  const primary = getPlayerPrimaryRole(dossier)
  const entries = dossier.roleEntries.filter(item => journey.roles.includes(item.role))
  if (!entries.length) return null
  const totalTime = entries.reduce((sum, item) => sum + item.summary.timeMins, 0)
  return <section id="player-role-portfolio" className={styles.roles} aria-labelledby="player-role-portfolio-title">
    <header className={styles.chapterHeading}><p>01 / ON THE ROSTER</p><h2 id="player-role-portfolio-title">{text(en, uiText("赛场角色", uiLocale), 'On the roster')}</h2><span>{text(en, uiText("按本季出场时长", uiLocale), 'By time played this season')}</span></header>
    <div className={styles.roleCards}>
      {entries.map(item => <Link key={item.role} {...analysisLink({ role: item.role, pview: 'performance', phero: '', pmap: '', presult: '', popen: '' })} className={styles.roleCard} data-role={item.role}>
        <div><span>{roleLabel(item.role, en, uiLocale)}</span><small>{item.role === primary.role ? text(en, uiText("主要职责", uiLocale), 'Primary role') : text(en, uiText("出场职责", uiLocale), 'Also played')}</small><b aria-hidden="true">↗</b></div>
        <p><strong>{item.summary.maps}</strong><span>{text(en, uiText("图", uiLocale), 'maps')}</span><em>{item.summary.timeLabel}</em></p>
        <span className={styles.roleTimeTrack} aria-hidden="true"><i style={{ width: `${totalTime > 0 ? item.summary.timeMins / totalTime * 100 : 0}%` }} /></span>
      </Link>)}
    </div>
  </section>
}

export function PlayerSeasonJourney({ journey, en, seasonId, linkProps, phaseKey, onPhaseChange }) {
  const uiLocale = useUiLocale()
  const selected = journey.phases.find(phase => phase.phase === phaseKey) || journey.phases.at(-1)
  return <section id="player-season-journey" className={styles.journey} aria-labelledby="player-journey-title">
    <header className={styles.journeyHeading}><div className={styles.chapterHeading}><p>02 / SEASON JOURNEY</p><h2 id="player-journey-title">{text(en, uiText("赛季征程", uiLocale), 'Season journey')}</h2></div><p>{journey.matches.length} {text(en, uiText("场出场比赛", uiLocale), 'match appearances')}<span>{journey.phases.length} {text(en, uiText("个赛事阶段", uiLocale), 'tournament stages')}</span></p></header>
    {selected ? <div className={styles.journeyBoard}>
      <nav className={styles.phaseRail} aria-label={text(en, uiText("选择赛事阶段", uiLocale), 'Choose tournament stage')}>
        {journey.phases.map((phase, index) => <button key={phase.phase} type="button" aria-pressed={phase === selected} aria-controls="player-phase-content" onClick={() => onPhaseChange(phase.phase)}>
          <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{formatPlayerMatchStage(phase.phase, en) || text(en, uiText("赛事记录", uiLocale), 'Tournament')}</strong><small><span>{phase.matches.length} {text(en, uiText("场", uiLocale), 'matches')}</span><span>{phase.wins}{text(en, uiText("胜", uiLocale), 'W')} / {phase.losses}{text(en, uiText("负", uiLocale), 'L')}{phase.draws ? ` / ${phase.draws}${text(en, '平', 'D')}` : ''}</span></small></div><b aria-hidden="true">↗</b>
        </button>)}
      </nav>
      <div className={styles.phaseContent} id="player-phase-content">
        <header><div><p>{text(en, uiText("出场记录", uiLocale), 'MATCH APPEARANCES')}</p><h3>{formatPlayerMatchStage(selected.phase, en) || text(en, uiText("赛事记录", uiLocale), 'Tournament')}</h3></div><span>{selected.matches[0].dateLabel.split(' ')[0]} — {selected.latest.dateLabel.split(' ')[0]}</span></header>
        <div className={styles.phaseScoreline} aria-label={text(en, uiText("本阶段比赛结果", uiLocale), 'Stage results')}>
          {selected.matches.map(match => <Link key={match.matchId} {...linkProps(`/matches/${encodeURIComponent(match.matchId)}`)} data-result={match.result} aria-label={`${match.opponent.short} · ${score(match)} · ${resultLabel(match.result, en, uiLocale)}`}><b>{resultLabel(match.result, en, uiLocale)}</b><span>{match.opponent.short}</span></Link>)}
        </div>
        <div className={styles.journeyMatches}>{[...selected.matches].reverse().map(match => <Link key={match.matchId} {...linkProps(`/matches/${encodeURIComponent(match.matchId)}`)} className={styles.journeyMatch}>
          <time dateTime={match.date}>{match.dateLabel}</time><TeamLogo team={match.opponent} seasonId={seasonId} className={styles.teamLogo} /><strong><small>vs</small> {match.opponent.short}</strong><b>{score(match)}</b><span data-result={match.result}>{resultLabel(match.result, en, uiLocale)}</span><i aria-hidden="true">↗</i>
        </Link>)}</div>
      </div>
    </div> : <div className={styles.empty}><strong>{text(en, uiText("暂无出场记录", uiLocale), 'No recorded appearances')}</strong><p>{text(en, uiText("本赛季暂无已公开的比赛数据。", uiLocale), 'No published match data for this season.')}</p></div>}
  </section>
}

export function PlayerHeroCollection({ heroes, en, locale, analysisLink, selectedRole, onRoleChange }) {
  if (!heroes.length) return null
  const roles = ['TANK', 'DPS', 'SUPPORT'].filter(role => heroes.some(hero => hero.roles.includes(role)))
  const role = roles.includes(selectedRole) ? selectedRole : ''
  const visible = role ? heroes.filter(hero => hero.roles.includes(role)) : heroes
  const featured = visible[0]
  const compact = visible.length <= 3
  const heroLink = hero => analysisLink({ role: hero.roles[0], pview: 'heroes', hfocus: hero.key, phero: '', pmap: '', presult: '', popen: '', pshow: '' })
  const featureCard = (hero, index) => <Link key={hero.key} {...heroLink(hero)} className={styles.collectionFeature} data-role={hero.roles[0]} data-secondary={index > 0 || undefined}>
    <div className={styles.featureHeading}><span>{index === 0 ? text(en, uiText("最多出场", locale), 'MOST RECORDED') : text(en, uiText("出场英雄", locale), 'RECORDED HERO')}</span><strong>{formatOwHeroName(hero.hero, locale)}</strong></div>
    <HeroArtwork hero={hero.hero} variant="spotlight" decorative locale={locale} className={styles.collectionArtwork} />
    <div className={styles.featureFacts}><div><b>{hero.maps}</b><span>{text(en, uiText("图", locale), hero.maps === 1 ? 'map' : 'maps')}<small>{hero.matches} {text(en, uiText("场比赛", locale), hero.matches === 1 ? 'match' : 'matches')}</small></span></div><span>{text(en, uiText("英雄数据", locale), 'Hero analysis')} ↗</span></div>
  </Link>
  return <section id="player-hero-collection" className={styles.collection} aria-labelledby="player-hero-collection-title">
    <header className={styles.collectionHeading}><div className={styles.chapterHeading}><p>03 / HERO COLLECTION</p><h2 id="player-hero-collection-title">{text(en, uiText("本季英雄图鉴", locale), 'Heroes this season')}</h2></div><span>{heroes.length} {text(en, uiText("位出场英雄", locale), heroes.length === 1 ? 'recorded hero' : 'recorded heroes')}</span></header>
    {roles.length > 1 && <div className={styles.collectionFilters} aria-label={text(en, uiText("图鉴职责", locale), 'Collection roles')}>{['', ...roles].map(value => <button type="button" key={value} aria-pressed={role === value} onClick={() => onRoleChange(value)}>{value ? roleLabel(value, en, locale) : text(en, uiText("全部英雄", locale), 'All heroes')}<small>{value ? heroes.filter(hero => hero.roles.includes(value)).length : heroes.length}</small></button>)}</div>}
    <div className={styles.collectionBody} data-single={visible.length === 1 || undefined} data-compact={compact || undefined} style={{ '--hero-count': visible.length, '--hero-list-columns': visible.length >= 7 ? 2 : 1 }}>
      {(compact ? visible : [featured]).map(featureCard)}
      {!compact && <div className={styles.heroCollection}>{visible.slice(1).map((hero, index) => <Link key={hero.key} {...heroLink(hero)} data-role={hero.roles[0]}>
        <small>{String(index + 2).padStart(2, '0')}</small><SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /><div><strong>{formatOwHeroName(hero.hero, locale)}</strong><span>{hero.roles.map(item => roleLabel(item, en, locale)).join(' / ')}</span></div><span className={styles.collectionCount}><strong>{hero.maps}</strong><small>{text(en, uiText("图", locale), hero.maps === 1 ? 'map' : 'maps')}</small></span><b aria-hidden="true">↗</b>
      </Link>)}</div>}
    </div>
  </section>
}
