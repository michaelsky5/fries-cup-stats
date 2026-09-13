import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatMatchDate, formatTeamFullName, formatTeamName } from '../../lib/homeSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatEntrySeasonOvr, getEntryMetricValue, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { getArchiveStory, getChampionResult, playerLabel, presentationHero } from './kprSelectors.js'
import useKprStory from './useKprStory.js'
import styles from './KprArchivePage.module.css'

function Cross({ className = '' }) {
  return <span className={`${styles.cross} ${className}`} aria-hidden="true">+</span>
}

export default function KprArchivePage({ archive, overview, summary, includeReview }) {
  const { db, season, seasonId, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const story = useMemo(() => getArchiveStory(db, season, archive), [db, season, archive])
  const [subjectKey, setSubjectKey] = useState('')
  const subject = story.cast.find(entry => entry.entryKey === subjectKey) || story.officialFmvp || story.demoSubject
  const isOfficialFmvpSubject = Boolean(story.officialFmvp) && subject?.player_id === story.officialFmvp.player_id
  const { trackRef, stageRef, act, goToAct, reducedMotion, motionPaused, setMotionPaused, prefersReducedMotion } = useKprStory()
  const finalResult = getChampionResult(archive.finalMatch, archive.champion)
  const cast = story.cast.length === 5 ? [story.cast[3], story.cast[0], story.cast[1], story.cast[2], story.cast[4]] : story.cast
  const coreMetrics = getRoleCoreMetricIds(subject?.role, subject?.most_played_hero).slice(0, 2)
  const code = overview.eventCode || season?.publicCode || seasonId
  const year = formatMatchDate(archive.finalMatch, '').slice(0, 4)
  const playerPath = subject ? withSeason(`/players/${encodeURIComponent(subject.player_id)}?role=${subject.role}`) : withSeason('/leaderboard')

  return (
    <div className={styles.archive} data-kpr-archive data-i18n-ignore>
      <section className={styles.storyTrack} ref={trackRef} data-act={act} data-reduced-motion={reducedMotion} aria-label={isEn ? 'Season champions and spotlight' : uiText("赛季冠军与选手特写", locale)}>
        <div className={styles.stage} ref={stageRef}>
          <div className={styles.darkSurface} aria-hidden="true" />
          <div className={styles.stageGrid} aria-hidden="true" />
          <div className={styles.orbit} aria-hidden="true"><span />ALL ROADS LED HERE.</div>

          <div className={styles.topline}>
            <span><i /> {code} <b>/</b> {isEn ? 'SEASON ARCHIVE' : uiText("赛季典藏", locale)}</span>
            <span className={styles.edition}>FRIES CUP <b>—</b> ARCHIVE {year}</span>
            <button type="button" className={styles.motionButton} onClick={() => setMotionPaused(!motionPaused)} aria-pressed={motionPaused} disabled={prefersReducedMotion}>
              {reducedMotion ? (isEn ? 'MOTION OFF' : uiText("动态已关闭", locale)) : (isEn ? 'MOTION ON' : uiText("动态开启", locale))} <i aria-hidden="true">{reducedMotion ? 'Ⅱ' : '◉'}</i>
            </button>
          </div>

          <div className={styles.championHeadline} aria-hidden={act !== 0} inert={act !== 0}>
            <span className={styles.chapterKicker}>01 / {isEn ? 'THE CHAMPIONS' : uiText("属于他们的赛季", locale)}</span>
            <h1>CHAMPIONS<span aria-hidden="true">+</span></h1>
          </div>
          <div className={styles.spotlightBackdrop} aria-hidden="true">MVP</div>

          <div className={styles.castCanvas} aria-hidden="true">
            {cast.map((entry, index) => (
              <div
                key={entry.entryKey}
                className={`${styles.castFigure} ${entry.entryKey === subject?.entryKey ? styles.focusFigure : ''}`}
                style={{ '--cast-x': `${cast.length === 1 ? 50 : 16 + index * 68 / (cast.length - 1)}%`, '--cast-z': index === 2 ? 5 : 3 - Math.abs(index - 2), '--cast-offset': `${index % 2 === 0 ? 0 : 24}px` }}
              >
                <HeroArtwork hero={presentationHero(entry)} variant="spotlight" className={styles.castArt} decorative priority locale={locale} />
              </div>
            ))}
          </div>

          <div className={styles.championCaption} aria-hidden={act !== 0} inert={act !== 0}>
            <div className={styles.championIdentity}>
              <TeamLogo team={archive.champion} seasonId={seasonId} className={styles.championLogo} />
              <div><span>{isEn ? 'SEASON CHAMPION' : uiText("赛季总冠军", locale)}</span><strong>{story.championName}</strong><p>{formatTeamFullName(archive.champion)}</p></div>
            </div>
            {finalResult ? (
              <Link className={styles.finalScore} to={withSeason(`/matches/${encodeURIComponent(archive.finalMatch.match_id || archive.finalMatch.id)}`)}>
                <span>GRAND FINAL <i>↗</i></span>
                <strong>{finalResult.score}<b>:</b>{finalResult.opponentScore}</strong>
                <small>{formatTeamName(finalResult.own)} <em>VS</em> {formatTeamName(finalResult.opponent)}</small>
              </Link>
            ) : <span className={styles.pending}>{isEn ? 'Final results pending' : uiText("决赛结果待补充", locale)}</span>}
            <Link className={styles.teamLink} to={withSeason(story.championId ? `/teams/${encodeURIComponent(story.championId)}` : '/teams')}>
              <span>{isEn ? 'Meet the champions' : uiText("走近这支冠军队伍", locale)}</span><b>↗</b>
            </Link>
          </div>

          <div className={styles.spotlightCopy} aria-hidden={act !== 1} inert={act !== 1}>
            <span className={styles.chapterKicker}>02 / {isOfficialFmvpSubject ? 'FINALS MVP' : 'PLAYER SPOTLIGHT'}</span>
            <div className={styles.awardTag}>{isOfficialFmvpSubject ? (isEn ? 'OFFICIAL FINALS MVP' : uiText("官方总决赛最有价值选手", locale)) : (isEn ? 'CHAMPION PLAYER SPOTLIGHT' : uiText("冠军选手人物镜头", locale))}</div>
            <h2>{playerLabel(subject)}<i>.</i></h2>
            <span className={styles.subjectIdentity}>{subject?.team_short_name || story.championName} <b>/</b> {isEn ? subject?.role : uiText(getRoleLabel(subject?.role), locale)}</span>
            <p>{isOfficialFmvpSubject
              ? (isEn ? 'One player. A defining season.' : uiText("一个名字，一个赛季的回响。", locale))
              : (isEn ? 'One of the players behind the title.' : uiText("冠军背后的一个名字。", locale))}</p>
            <Link className={styles.spotlightLink} to={playerPath}>{isEn ? 'Explore player' : uiText("查看选手档案", locale)} <b>↗</b></Link>
          </div>

          {subject ? <div className={styles.spotlightStats} aria-hidden={act !== 1} inert={act !== 1}>
            <span>{isEn ? 'SEASON DATA / PER 10 MIN' : uiText("赛季数据 / 每 10 分钟", locale)}</span>
            <div className={styles.ovrStat}><small>OVR</small><strong>{formatEntrySeasonOvr(subject)}</strong></div>
            {coreMetrics.map(id => <div key={id} className={styles.coreStat}>
              <span>{isEn ? PUBLIC_METRICS.find(metric => metric.id === id)?.short : uiText(PUBLIC_METRICS.find(metric => metric.id === id)?.label, locale)}</span>
              <strong>{formatLeaderboardStat(getEntryMetricValue(subject, id, 'per10'), 'per10', id)}</strong>
            </div>)}
            <span className={styles.heroCredit}>{isEn ? 'TEAM SELECTION' : uiText("队伍选择英雄", locale)}<b>{formatOwHeroName(presentationHero(subject), locale)}</b></span>
          </div> : null}

          <div className={styles.chapterBar}>
            <nav aria-label={isEn ? 'Story chapters' : uiText("典藏章节", locale)}>
              <button type="button" onClick={() => goToAct(0)} aria-current={act === 0 ? 'step' : undefined}><b>01</b> {isEn ? 'CHAMPIONS' : uiText("冠军群像", locale)}</button>
              <button type="button" onClick={() => goToAct(1)} aria-current={act === 1 ? 'step' : undefined}><b>02</b> {isEn ? 'SPOTLIGHT' : uiText("人物镜头", locale)}</button>
            </nav>
            <span className={styles.scrollHint}>{isEn ? 'SCROLL TO EXPLORE' : uiText("向下滚动，进入下一幕", locale)} <b>↓</b></span>
          </div>
          <div className={styles.progressRail} aria-hidden="true"><span /></div>
          <Cross className={styles.crossLeft} /><Cross className={styles.crossRight} />
        </div>
      </section>

      <section className={styles.rosterSection} aria-labelledby="kpr-roster-title">
        <div className={styles.sectionHeading}><span>THE FIVE / 01—05</span><h2 id="kpr-roster-title">{isEn ? 'The winning lineup.' : uiText("冠军，由他们写下。", locale)}</h2><p>{isEn ? 'The champion team’s presentation heroes. Select a player to preview the spotlight.' : uiText("冠军队伍确认的展示英雄。点选选手，进入他的人物镜头。", locale)}</p></div>
        <div className={styles.rosterList}>
          {story.cast.map((entry, index) => <button key={entry.entryKey} type="button" aria-label={isEn ? `Preview ${playerLabel(entry)}` : uiText("特写预览：{0}", locale, [playerLabel(entry)])} aria-pressed={subject?.entryKey === entry.entryKey} onClick={() => { setSubjectKey(entry.entryKey); goToAct(1) }}>
            <span className={styles.rosterNumber}>0{index + 1}</span><span><strong>{playerLabel(entry)}</strong><small>{isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)} <i>/</i> {formatOwHeroName(presentationHero(entry), locale)}</small></span><b>↗</b>
          </button>)}
          {!story.cast.length ? <p>{isEn ? 'The roster will appear when player data is available.' : uiText("选手数据补齐后，这里将呈现冠军阵容。", locale)}</p> : null}
        </div>
      </section>

      <section className={styles.journeySection} aria-labelledby="kpr-journey-title">
        <div className={styles.sectionHeading}><span>THE ROAD TO THE TITLE / {code}</span><h2 id="kpr-journey-title">{isEn ? 'Every round mattered.' : uiText("每一步，都通向此刻。", locale)}</h2><p>{isEn ? 'The champions’ last three completed matches.' : uiText("冠军队伍最后三场已完成比赛。", locale)}</p></div>
        <div className={styles.journeyList}>
          {story.journey.map((match, index) => {
            const result = getChampionResult(match, archive.champion)
            const isFinal = (match.match_id || match.id) === (archive.finalMatch?.match_id || archive.finalMatch?.id)
            return <Link key={match.match_id || match.id} to={withSeason(`/matches/${encodeURIComponent(match.match_id || match.id)}`)} className={isFinal ? styles.finalJourney : ''}>
              <span className={styles.journeyIndex}>0{index + 1}</span>
              <div className={styles.journeyMatch}><span>{isFinal ? 'GRAND FINAL' : (match.round || match.stage || 'MATCH')}</span><strong>{formatTeamName(result.own)} <small>VS</small> {formatTeamName(result.opponent)}</strong></div>
              <time>{formatMatchDate(match).slice(0, 10)}</time><b className={styles.journeyScore}>{result.score}<i>:</i>{result.opponentScore}</b><span className={styles.journeyArrow}>↗</span>
            </Link>
          })}
        </div>
      </section>

      <footer className={styles.archiveFooter}>
        <div><span>BEYOND THE SPOTLIGHT</span><h2>{isEn ? 'The story lives in the data.' : uiText("镜头之后，数据继续。", locale)}</h2><p>{summary.teams ?? '—'} {isEn ? 'TEAMS' : uiText("支队伍", locale)} <b>·</b> {summary.players ?? '—'} {isEn ? 'PLAYERS' : uiText("名选手", locale)} <b>·</b> {summary.maps ?? '—'} {isEn ? 'MAPS' : uiText("张地图", locale)}</p></div>
        <nav><Link to={withSeason('/leaderboard')}>{isEn ? 'Explore rankings' : uiText("进入数据排行榜", locale)} <b>↗</b></Link><Link to={withSeason(includeReview ? '/review' : '/matches')}>{isEn ? 'Season archive' : uiText("完整赛季回顾", locale)} <b>↗</b></Link></nav>
      </footer>
    </div>
  )
}
