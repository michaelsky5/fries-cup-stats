import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { formatMatchDate, formatTeamFullName, formatTeamName } from '../../lib/homeSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatEntrySeasonOvr, getEntryMetricValue, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import { getArchiveStory, getChampionResult, playerLabel, presentationHero } from './kprSelectors.js'
import useKprStory from './useKprStory.js'
import useStagePointer from './useStagePointer.js'
import styles from './KprStageArchive.module.css'

const Arrow = () => <span aria-hidden="true">↗</span>

function PlayerRecord({ entry, locale, championName }) {
  const isEn = locale === 'en-US'
  const metricIds = getRoleCoreMetricIds(entry?.role, entry?.most_played_hero).slice(0, 2)
  return (
    <div className={styles.record} data-player-record={entry?.player_id}>
      <div className={styles.recordEdge} aria-hidden="true" />
      <header className={styles.recordHeader}><span>FC / PLAYER RECORD</span><b>{championName}</b></header>
      <div className={styles.recordRole}><span>{isEn ? 'SEASON RATING' : uiText("赛季综合评分", locale)}</span><b>{entry?.role || '—'}</b></div>
      <div className={styles.recordOvr}><strong>{entry ? formatEntrySeasonOvr(entry) : '—'}</strong><span>OVR</span></div>
      <div className={styles.recordMetrics}>
        <span className={styles.metricCaption}>{isEn ? 'ROLE DATA / PER 10 MIN' : uiText("该职责数据 / 每 10 分钟", locale)}</span>
        {metricIds.map(id => {
          const metric = PUBLIC_METRICS.find(item => item.id === id)
          return <div key={id}><span>{isEn ? metric?.short : uiText(metric?.label, locale)}</span><strong>{formatLeaderboardStat(getEntryMetricValue(entry, id, 'per10'), 'per10', id)}</strong></div>
        })}
      </div>
      <footer className={styles.recordFooter}><span>{isEn ? 'MAPS / TIME' : uiText("该职责地图 / 时长", locale)}</span><strong>{entry?.roleMapsPlayed ?? '—'} <i>/</i> {entry ? `${Math.round(entry.roleTimeMins)} MIN` : '—'}</strong></footer>
      <div className={styles.recordNotch} aria-hidden="true" />
    </div>
  )
}

export default function KprStageArchive({ archive, overview, summary, includeReview }) {
  const { db, season, seasonId, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const story = useMemo(() => getArchiveStory(db, season, archive), [db, season, archive])
  const [subjectKey, setSubjectKey] = useState('')
  const subject = story.cast.find(entry => entry.entryKey === subjectKey) || story.officialFmvp || story.demoSubject
  const isOfficialFmvpSubject = Boolean(story.officialFmvp) && subject?.player_id === story.officialFmvp.player_id
  const { trackRef, stageRef, act, goToAct, reducedMotion, motionPaused, setMotionPaused, prefersReducedMotion } = useKprStory()
  useStagePointer(stageRef, reducedMotion)
  const finalResult = getChampionResult(archive.finalMatch, archive.champion)
  const finalId = archive.finalMatch?.match_id || archive.finalMatch?.id
  const code = overview.eventCode || season?.publicCode || seasonId
  const finalDate = formatMatchDate(archive.finalMatch, '')
  const year = finalDate.slice(0, 4)
  const playerPath = subject ? withSeason(`/players/${encodeURIComponent(subject.player_id)}?role=${subject.role}`) : withSeason('/leaderboard')
  const teamPath = withSeason(story.championId ? `/teams/${encodeURIComponent(story.championId)}` : '/teams')
  const selectPlayer = entry => { setSubjectKey(entry.entryKey); goToAct(1) }

  return (
    <div className={styles.archive} data-kpr-stage-archive data-i18n-ignore>
      <section className={styles.track} ref={trackRef} data-act={act} data-reduced-motion={reducedMotion} aria-label={isEn ? 'Champion stage and player spotlight' : uiText("冠军舞台与选手特写", locale)}>
        <div className={styles.stage} ref={stageRef}>
          <div className={styles.stageLines} aria-hidden="true"><span /><span /><span /></div>
          <div className={styles.stageFloor} aria-hidden="true" />
          <div className={styles.stageYear} aria-hidden="true">{year ? year.slice(-2) : 'FC'}</div>
          <div className={styles.artwork} aria-hidden="true">
            <img src="/design/kpr-stage/champion-monument-v1.webp" srcSet="/design/kpr-stage/champion-monument-v1-768.webp 768w, /design/kpr-stage/champion-monument-v1.webp 1536w" sizes="(max-width: 760px) 146vw, 83vw" width="1536" height="1024" alt="" fetchPriority="high" loading="eager" decoding="async" draggable="false" />
          </div>
          <div className={styles.imageVeil} aria-hidden="true" />

          <div className={styles.topline}>
            <span className={styles.archiveCode}><i /> {code}<b>/</b>{isEn ? 'SEASON ARCHIVE' : uiText("赛季典藏", locale)}</span>
            <span className={styles.toplineCenter}>A SEASON TO REMEMBER.</span>
            <button type="button" className={styles.motionButton} onClick={() => setMotionPaused(!motionPaused)} aria-pressed={reducedMotion} disabled={prefersReducedMotion}>
              <i aria-hidden="true">{reducedMotion ? 'Ⅱ' : '◉'}</i> {reducedMotion ? (isEn ? 'MOTION OFF' : uiText("动态关闭", locale)) : (isEn ? 'MOTION ON' : uiText("动态开启", locale))}
            </button>
          </div>

          <div className={styles.championCopy} aria-hidden={act !== 0} inert={act !== 0}>
            <span className={styles.kicker}><b>01</b> / {isEn ? 'THE TITLE BELONGS TO' : uiText("这一季，属于他们。", locale)}</span>
            <h1 data-long-name={story.championName.length > 5}><span className={styles.screenReader}>{isEn ? 'Season champions: ' : uiText("赛季总冠军：", locale)}</span>{story.championName}<i aria-hidden="true">.</i></h1>
            <div className={styles.championName}>
              <TeamLogo team={archive.champion} seasonId={seasonId} className={styles.teamLogo} />
              <div><strong>{formatTeamFullName(archive.champion)}</strong><span>{isEn ? 'SEASON CHAMPIONS' : uiText("赛季总冠军", locale)} <b>/</b> {code}</span></div>
            </div>
            <p className={styles.championStatement}>{isEn ? 'The final is over. Their season lives on.' : uiText("终场已至。属于他们的赛季，留在这里。", locale)}</p>
            <Link className={styles.primaryLink} to={teamPath}>{isEn ? 'Meet the champions' : uiText("走进冠军队伍", locale)}<Arrow /></Link>
          </div>

          <div className={styles.objectCaption} aria-hidden="true"><span>FRIES CUP</span><b>CHAMPIONS<br />EDITION — {year || code}</b><i>CONCEPT OBJECT / 01</i></div>
          <span className={styles.artworkNote} aria-hidden={act !== 0}>{isEn ? 'ORIGINAL TROPHY CONCEPT · NOT AN OFFICIAL TROPHY' : uiText("原创奖杯概念 · 非实物奖杯展示", locale)}</span>

          {finalResult && finalId ? <Link className={styles.finalScore} aria-hidden={act !== 0} inert={act !== 0} to={withSeason(`/matches/${encodeURIComponent(finalId)}`)}>
            <div><span>GRAND FINAL</span><small>{finalDate.slice(0, 10).replaceAll('-', '.')}</small></div>
            <strong>{finalResult.score}<i>:</i>{finalResult.opponentScore}</strong>
            <div className={styles.finalOpponent}><b>{formatTeamName(finalResult.own)} <em>VS</em> {formatTeamName(finalResult.opponent)}</b><span>{isEn ? 'Open match record' : uiText("查看决赛档案", locale)} <Arrow /></span></div>
          </Link> : <p className={styles.finalPending} aria-hidden={act !== 0}>{isEn ? 'Final record to be added' : uiText("决赛档案待补充", locale)}</p>}

          <div className={styles.spotlightBackground} aria-hidden="true">PLAYER<br />FOCUS<span>02</span></div>
          <div className={styles.spotlightCopy} aria-hidden={act !== 1} inert={act !== 1}>
            <span className={styles.kicker}><b>02</b> / {isOfficialFmvpSubject ? 'FINALS MVP' : 'PLAYER SPOTLIGHT'}</span>
            <span className={styles.awardTag}>{isOfficialFmvpSubject ? (isEn ? 'OFFICIAL FINALS MVP' : uiText("官方总决赛最有价值选手", locale)) : (isEn ? 'CHAMPION PLAYER SPOTLIGHT' : uiText("冠军选手人物镜头", locale))}</span>
            <h2 data-long-name={playerLabel(subject).length > 9}>{playerLabel(subject)}<i>.</i></h2>
            <div className={styles.subjectIdentity}><b>{subject?.team_short_name || story.championName}</b><span>/</span>{isEn ? subject?.role : uiText(getRoleLabel(subject?.role), locale)}</div>
            <p>{isOfficialFmvpSubject ? (isEn ? 'A defining player. A season to remember.' : uiText("把一个赛季，留给这个名字。", locale)) : (isEn ? 'One of the players behind the title.' : uiText("冠军背后的一个名字。", locale))}</p>
            <div className={styles.heroName}><span>{isEn ? 'CHAMPION TEAM SELECTION' : uiText("冠军队伍选择英雄", locale)}</span><b>{formatOwHeroName(presentationHero(subject), locale) || '—'}</b></div>
            <Link to={playerPath} className={styles.textLink}>{isEn ? 'Explore player record' : uiText("查看完整选手档案", locale)}<Arrow /></Link>
          </div>

          <div className={styles.recordScene} aria-hidden={act !== 1} inert={act !== 1}>
            <div className={styles.recordShadow} aria-hidden="true" />
            <PlayerRecord key={subject?.entryKey || 'empty'} entry={subject} locale={locale} championName={story.championName} />
            <span className={styles.recordCaption}>{isEn ? 'FROM THE SEASON ARCHIVE' : uiText("数据取自本赛季归档", locale)}<b>●</b></span>
          </div>

          <div className={styles.subjectPicker} aria-hidden={act !== 1} inert={act !== 1}>
            <span>{isEn ? 'CHANGE FOCUS' : uiText("切换选手镜头", locale)}</span>
            <div role="group" aria-label={isEn ? 'Spotlight player' : uiText("特写选手", locale)}>
              {story.cast.map(entry => <button key={entry.entryKey} type="button" onClick={() => setSubjectKey(entry.entryKey)} aria-pressed={subject?.entryKey === entry.entryKey}>{playerLabel(entry)}</button>)}
            </div>
          </div>

          <div className={styles.chapterBar}>
            <nav aria-label={isEn ? 'Archive chapters' : uiText("典藏章节", locale)}>
              <button type="button" onClick={() => goToAct(0)} aria-current={act === 0 ? 'step' : undefined}><b>01</b>{isEn ? 'CHAMPIONS' : uiText("冠军舞台", locale)}</button>
              <button type="button" onClick={() => goToAct(1)} aria-current={act === 1 ? 'step' : undefined}><b>02</b>{isEn ? 'PLAYER FOCUS' : uiText("选手特写", locale)}</button>
            </nav>
            <span className={styles.scrollHint}>{isEn ? 'SCROLL TO EXPLORE' : uiText("滚动，继续这一季", locale)}<b aria-hidden="true">↓</b></span>
          </div>
          <div className={styles.progressRail} aria-hidden="true"><span /></div>
        </div>
      </section>

      <section className={styles.rosterSection} aria-labelledby="stage-roster-title">
        <header className={styles.sectionHeading}><span>THE NAMES BEHIND THE TITLE</span><h2 id="stage-roster-title">{isEn ? 'One team. Every name.' : uiText("冠军不是一个名字。", locale)}</h2><p>{isEn ? 'Season representatives selected by playtime within each role, not the final’s starting lineup. Choose a player to open their spotlight.' : uiText("按各职责赛季出场时间选取代表选手，不代表决赛首发。点击名字，进入他的特写。", locale)}</p><Link className={styles.rosterTeamLink} to={teamPath}>{isEn ? 'Full team roster' : uiText("查看完整队伍", locale)}<Arrow /></Link></header>
        <div className={styles.rosterList}>
          {story.cast.map((entry, index) => <button key={entry.entryKey} type="button" onClick={() => selectPlayer(entry)} aria-label={isEn ? `Open spotlight: ${playerLabel(entry)}` : uiText("特写预览：{0}", locale, [playerLabel(entry)])} aria-pressed={subject?.entryKey === entry.entryKey}>
            <span className={styles.rosterNumber}>{String(index + 1).padStart(2, '0')}</span><strong>{playerLabel(entry)}</strong><span className={styles.rosterMeta}>{isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)}<small>{formatOwHeroName(presentationHero(entry), locale)}</small></span><Arrow />
          </button>)}
          {!story.cast.length ? <p>{isEn ? 'Player records are being added.' : uiText("选手档案待补充。", locale)}</p> : null}
        </div>
      </section>

      <section className={styles.journeySection} aria-labelledby="stage-journey-title">
        <header className={styles.journeyHeading}><div className={styles.sectionHeading}><span>THE LAST CHAPTERS / {code}</span><h2 id="stage-journey-title">{isEn ? 'The road to this moment.' : uiText("每一步，通向此刻。", locale)}</h2></div><p>{isEn ? 'The champions’ last three completed matches.' : uiText("冠军队伍最后三场已完成比赛。", locale)}</p></header>
        <div className={styles.journeyGrid}>
          {story.journey.map((match, index) => {
            const result = getChampionResult(match, archive.champion)
            const matchId = match.match_id || match.id
            const isFinal = matchId === finalId
            return <Link key={matchId} to={withSeason(`/matches/${encodeURIComponent(matchId)}`)} className={isFinal ? styles.finalJourney : ''}>
              <header><span>{String(index + 1).padStart(2, '0')} <b>/</b> {isFinal ? 'GRAND FINAL' : match.round || match.stage || 'MATCH'}</span><Arrow /></header>
              <div className={styles.journeyScore}>{result.score}<i>:</i>{result.opponentScore}</div>
              <strong>{formatTeamName(result.own)}<small>VS</small>{formatTeamName(result.opponent)}</strong>
              <time>{formatMatchDate(match).slice(0, 10).replaceAll('-', '.')}</time>
            </Link>
          })}
        </div>
      </section>

      <footer className={styles.archiveFooter}>
        <div><span>THE GAME ENDS. THE STORY STAYS.</span><h2>{isEn ? 'Every number has a story.' : uiText("高光之后，数据继续。", locale)}</h2><p>{summary.teams ?? '—'} {isEn ? 'TEAMS' : uiText("支队伍", locale)}<b>/</b>{summary.players ?? '—'} {isEn ? 'PLAYERS' : uiText("名选手", locale)}<b>/</b>{summary.maps ?? '—'} {isEn ? 'MAPS' : uiText("张地图", locale)}</p></div>
        <nav aria-label={isEn ? 'Continue exploring' : uiText("继续浏览", locale)}><Link to={withSeason('/leaderboard')}>{isEn ? 'Explore rankings' : uiText("进入数据排行榜", locale)}<Arrow /></Link><Link to={withSeason(includeReview ? '/review' : '/matches')}>{isEn ? 'Explore the season' : uiText("查看完整赛季回顾", locale)}<Arrow /></Link></nav>
      </footer>
    </div>
  )
}
