import { translateUiText as uiText } from '../../lib/uiText.js'
import Link from './ArchiveRecordLink.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { formatTeamFullName, formatTeamName } from '../../lib/homeSelectors.js'
import { playerLabel, presentationHero } from './kprSelectors.js'
import styles from './MobileSeasonArchive.module.css'

export default function MobileSeasonArchive({ archive, story, summary, code, seasonId, locale, withSeason, finalResult, includeReview, eventKindLabel }) {
  const isEn = locale === 'en-US'
  const spotlight = story.officialFmvp || story.cast[0]
  const championPath = withSeason(story.championId ? `/teams/${encodeURIComponent(story.championId)}` : '/teams')
  const finalId = archive.finalMatch?.match_id || archive.finalMatch?.id
  return <div className={styles.cover} data-mobile-season-archive>
    <header className={styles.heading}><span>{code}{eventKindLabel ? <small> · {eventKindLabel}</small> : null}</span><span>{isEn ? 'Season archived' : uiText("赛季已归档", locale)}</span></header>
    <Link className={styles.champion} to={championPath}>
      <span className={styles.watermark} aria-hidden="true">CHAMPIONS</span>
      <span className={styles.championLabel}>{isEn ? 'SEASON CHAMPIONS' : uiText("这一季的冠军", locale)}</span>
      <div className={styles.identity}><TeamLogo team={archive.champion} seasonId={seasonId} className={styles.logo} /><div><h1>{story.championName}</h1><p>{formatTeamFullName(archive.champion)}</p></div></div>
      <span className={styles.championCta}>{isEn ? 'Meet the champion team' : uiText("走进冠军队伍", locale)}<b aria-hidden="true">↗</b></span>
    </Link>
    {finalId && finalResult ? <Link className={styles.final} to={withSeason(`/matches/${encodeURIComponent(finalId)}`)}>
      <span>{isEn ? 'Grand final' : uiText("总决赛", locale)}<small>{isEn ? 'Match record' : uiText("查看比赛", locale)}</small></span>
      <div><strong>{formatTeamName(finalResult.own)}</strong><b>{finalResult.score}<i>:</i>{finalResult.opponentScore}</b><strong>{formatTeamName(finalResult.opponent)}</strong></div><span aria-hidden="true">↗</span>
    </Link> : null}
    <nav className={styles.entries} aria-label={isEn ? 'Explore this season' : uiText("查看本届赛事", locale)}>
      <Link to={withSeason('/matches')}><span>{isEn ? 'Match results' : uiText("回看赛果", locale)}</span><strong>{summary.matches ?? '—'}<small>{isEn ? 'matches' : uiText("场比赛", locale)}</small></strong><i aria-hidden="true">↗</i></Link>
      <Link to={withSeason('/roster')}><span>{isEn ? 'Meet the field' : uiText("认识阵容", locale)}</span><strong>{summary.teams ?? '—'}<small>{isEn ? 'teams' : uiText("支队伍", locale)}</small></strong><i aria-hidden="true">↗</i></Link>
    </nav>
    {spotlight ? <section className={styles.spotlight} aria-label={isEn ? 'Champion player' : uiText("冠军人物", locale)}>
      <div className={styles.sectionHeading}><h2>{isEn ? 'The people behind the title.' : uiText("从一个名字，继续看。", locale)}</h2><Link to={championPath}>{isEn ? 'Full roster' : uiText("完整阵容", locale)} ↗</Link></div>
      <Link className={styles.player} to={withSeason(`/players/${encodeURIComponent(spotlight.player_id)}?role=${spotlight.role}`)}>
        <HeroArtwork hero={presentationHero(spotlight)} className={styles.portrait} decorative locale={locale} />
        <div><span>{story.officialFmvp ? (isEn ? 'FINALS MVP' : uiText("总决赛最有价值选手", locale)) : (isEn ? 'CHAMPION PLAYER' : uiText("冠军成员", locale))}</span><strong>{playerLabel(spotlight)}</strong><small>{isEn ? 'Explore player file' : uiText("查看选手档案", locale)} ↗</small></div>
      </Link>
    </section> : null}
    {includeReview ? <Link className={styles.review} to={withSeason('/review')}><span>{isEn ? 'Revisit the season' : uiText("进入赛季回顾", locale)}</span><span aria-hidden="true">↗</span></Link> : null}
  </div>
}
