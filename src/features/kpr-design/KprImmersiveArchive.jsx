import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { formatMatchDate, formatTeamFullName, formatTeamName } from '../../lib/homeSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatEntrySeasonOvr, getEntryMetricValue, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import { formatSeasonSampleRequirements } from '../../lib/seasonRatingPolicy.js'
import { getArchiveStory, getChampionResult, playerLabel, presentationHero } from './kprSelectors.js'
import { getSeriesArchive } from './seriesArchive.js'
import useKprStory from './useKprStory.js'
import useArchiveMotion from './useArchiveMotion.js'
import useStagePointer from './useStagePointer.js'
import MobileSeasonArchive from './MobileSeasonArchive.jsx'
import styles from './KprImmersiveArchive.module.css'

const Arrow = () => <span aria-hidden="true">↗</span>

function SectionSignal({ chapter, label, code, tone = 'light' }) {
  return <span className={styles.sectionSignal} data-tone={tone} aria-hidden="true">
    <b>{chapter}</b>
    <span>FRIES CUP SIGNAL</span>
    <i>{code} / {label}</i>
  </span>
}

const rankNumber = value => Number.isFinite(Number(value)) ? String(Math.round(Number(value))).padStart(2, '0') : '—'
const entryTeamName = entry => entry?.team_short_name || entry?.team_name || entry?.team_id || '—'

function getEnsembleCast(cast) {
  const remaining = [...cast]
  const take = role => {
    const index = remaining.findIndex(entry => entry.role === role)
    return index >= 0 ? remaining.splice(index, 1)[0] : remaining.shift()
  }
  const tank = take('TANK')
  const dpsInner = take('DPS')
  const dpsOuter = take('DPS')
  const supportInner = take('SUPPORT')
  const supportOuter = take('SUPPORT')
  return [
    { entry: dpsOuter, slot: 'far-left' },
    { entry: dpsInner, slot: 'inner-left' },
    { entry: tank, slot: 'center' },
    { entry: supportInner, slot: 'inner-right' },
    { entry: supportOuter, slot: 'far-right' }
  ].filter(item => item.entry)
}

function PlayerMetrics({ entry, isEn }) {
  const uiLocale = useUiLocale()
  const ids = getRoleCoreMetricIds(entry?.role, entry?.most_played_hero).slice(0, 2)
  return (
    <dl className={styles.playerMetrics}>
      <div><dt>{isEn ? 'SEASON RATING' : uiText("赛季综合评分", uiLocale)}</dt><dd>{entry ? formatEntrySeasonOvr(entry) : '—'}<small>OVR</small></dd></div>
      {ids.map(id => {
        const metric = PUBLIC_METRICS.find(item => item.id === id)
        return <div key={id}><dt>{isEn ? metric?.short : uiText(metric?.label, uiLocale)}<small>{isEn ? ' / 10 MIN' : uiText(" / 10 分钟", uiLocale)}</small></dt><dd>{entry ? formatLeaderboardStat(getEntryMetricValue(entry, id, 'per10'), 'per10', id) : '—'}</dd></div>
      })}
    </dl>
  )
}

export default function KprImmersiveArchive({ archive, overview, summary, includeReview, presentation = 'solo' }) {
  const { db, season, seasonId, locale = 'zh-CN', withSeason = path => path, dataStatus, updatedAtText } = useOutletContext()
  const isEn = locale === 'en-US'
  const isHybrid = presentation === 'hybrid'
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches)
  const isPhoneArchive = isHybrid && isPhone
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const onChange = event => setIsPhone(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  const story = useMemo(() => getArchiveStory(db, season, archive), [db, season, archive])
  const ensembleCast = getEnsembleCast(story.cast)
  const seriesArchive = isHybrid ? getSeriesArchive(season?.seriesCode) : null
  const atlasChapter = seriesArchive ? 3 : 2
  const journeyChapter = seriesArchive ? 4 : 3
  const dossierChapter = seriesArchive ? 5 : 4
  const reviewChapter = seriesArchive ? 6 : 5
  const [subjectKey, setSubjectKey] = useState('')
  const archiveRootRef = useRef(null)
  const atlasRef = useRef(null)
  const journeyRef = useRef(null)
  const { trackRef, stageRef, act, goToAct, reducedMotion, motionPaused, setMotionPaused, prefersReducedMotion } = useKprStory({ enabled: !isPhoneArchive })
  const chapterItems = [
    { id: 'archive-champions', number: '01', label: isEn ? 'CHAMPIONS' : uiText("冠军", locale) },
    ...(seriesArchive ? [{ id: 'archive-series-podium', number: '02', label: isEn ? 'SERIES' : uiText("系列赛", locale) }] : []),
    { id: 'archive-season-atlas', number: String(atlasChapter).padStart(2, '0'), label: isEn ? 'ATLAS' : uiText("图谱", locale) },
    { id: 'archive-title-road', number: String(journeyChapter).padStart(2, '0'), label: isEn ? 'ROAD' : uiText("征程", locale) },
    { id: 'archive-player-files', number: String(dossierChapter).padStart(2, '0'), label: isEn ? 'PLAYERS' : uiText("人物", locale) },
    ...(includeReview ? [{ id: 'archive-season-review', number: String(reviewChapter).padStart(2, '0'), label: isEn ? 'REVIEW' : uiText("回顾", locale) }] : [])
  ]
  const chapterIdsKey = chapterItems.map(item => item.id).join('|')
  const { activeChapter, scrollToChapter } = useArchiveMotion(archiveRootRef, chapterIdsKey, reducedMotion)
  const activeChapterIndex = Math.max(0, chapterItems.findIndex(item => item.id === activeChapter))
  useStagePointer(stageRef, reducedMotion || isPhoneArchive)

  const subject = story.cast.find(entry => entry.entryKey === subjectKey) || story.officialFmvp || story.demoSubject
  const isOfficialFmvpSubject = Boolean(story.officialFmvp) && subject?.player_id === story.officialFmvp.player_id
  const subjectIndex = story.cast.findIndex(entry => entry.entryKey === subject?.entryKey)
  const subjectNumber = subjectIndex < 0 ? '—' : String(subjectIndex + 1).padStart(2, '0')
  const name = playerLabel(subject)
  const hasLongName = name.length > 9 || (/[\u4e00-\u9fff]/.test(name) && name.length > 3)
  const heroName = formatOwHeroName(presentationHero(subject), locale) || '—'
  const roleLabel = isEn ? subject?.role : uiText(getRoleLabel(subject?.role), locale)
  const finalResult = getChampionResult(archive.finalMatch, archive.champion)
  const finalId = archive.finalMatch?.match_id || archive.finalMatch?.id
  const finalDate = formatMatchDate(archive.finalMatch, '')
  const code = overview.eventCode || season?.publicCode || seasonId
  const year = finalDate.slice(0, 4)
  const teamPath = withSeason(story.championId ? `/teams/${encodeURIComponent(story.championId)}` : '/teams')
  const leaderboardPath = withSeason('/leaderboard')
  const playerPath = subject ? withSeason(`/players/${encodeURIComponent(subject.player_id)}?role=${subject.role}`) : withSeason('/leaderboard')
  const playerFilePath = entry => withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const openRecord = entry => {
    setSubjectKey(entry.entryKey)
    goToAct(1)
  }
  const showSeasonAtlas = () => atlasRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
  const rosterSection = <section className={styles.rosterSection} aria-labelledby="immersive-roster-title">
    <header className={styles.sectionHeading}>
      <span>THE NAMES BEHIND THE TITLE</span>
      <h2 id="immersive-roster-title">{isEn ? 'A team worth remembering.' : uiText("值得记住的，不止比分。", locale)}</h2>
      <p>{isEn ? 'The champion team confirmed these presentation heroes. They shape the archive portraits and do not claim the final’s lineup or picks.' : uiText("展示英雄由冠军队伍确认，用于赛季典藏的人物呈现，不代表决赛首发或决赛选角。", locale)}</p>
      <Link to={teamPath}>{isEn ? 'Explore the full roster' : uiText("查看完整队伍与阵容", locale)}<Arrow /></Link>
    </header>
    <div className={styles.rosterRecords}>
      {story.cast.map((entry, index) => <button key={entry.entryKey} type="button" onClick={() => openRecord(entry)} aria-label={isEn ? `Preview ${playerLabel(entry)}` : uiText("查看人物镜头：{0}", locale, [playerLabel(entry)])}>
        <span className={styles.recordNumber}>{String(index + 1).padStart(2, '0')}</span>
        <strong>{playerLabel(entry)}</strong>
        <span className={styles.recordRole}>{isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)}<small>{formatOwHeroName(presentationHero(entry), locale)}</small></span>
        <span className={styles.recordOvr}>{formatEntrySeasonOvr(entry)}<small>OVR</small></span><Arrow />
      </button>)}
      {!story.cast.length ? <p>{isEn ? 'Player records are being added.' : uiText("选手档案待补充。", locale)}</p> : null}
    </div>
  </section>

  const seriesSection = seriesArchive ? <section className={styles.seriesSection} id="archive-series-podium" data-archive-section aria-labelledby="series-podium-title">
    <SectionSignal chapter="02" label="CLUB PODIUM" code={seriesArchive.code} tone="dark" />
    <span className={styles.seriesBackdrop} aria-hidden="true">{seriesArchive.code}</span>
    <header className={styles.seriesHeading}>
      <div>
        <span>02 / {seriesArchive.code} / CLUB PODIUM</span>
        <h2 id="series-podium-title">{isEn ? <>Two events.<span>One series.</span></> : <>{uiText("两项赛事，", locale)}<span>{uiText("一个系列赛。", locale)}</span></>}</h2>
      </div>
      <div className={styles.seriesContext}>
        <div className={styles.seriesEquation} aria-label={seriesArchive.eventCodes.join(' plus ')}>
          <span>{seriesArchive.eventCodes[0]}</span><i>+</i><span>{seriesArchive.eventCodes[1]}</span><b>→</b><strong>{seriesArchive.code}</strong>
        </div>
        <p>{isEn ? 'The 2026 Fries Cup club honours are decided across both Academy and Regular competition.' : uiText("学院赛与常规赛共同构成 2026 薯条杯系列赛，这里记录贯穿两项赛事的俱乐部荣誉。", locale)}</p>
      </div>
    </header>
    <div className={styles.seriesPodium}>
      {seriesArchive.podium.map(entry => <article key={entry.club} data-rank={entry.rank}>
        <span className={styles.podiumRank}><b>{String(entry.rank).padStart(2, '0')}</b><small>{entry.rank === 1 ? (isEn ? 'SERIES CHAMPION' : uiText("系列赛总冠军", locale)) : entry.rank === 2 ? (isEn ? 'RUNNER-UP' : uiText("系列赛亚军", locale)) : (isEn ? 'THIRD PLACE' : uiText("系列赛季军", locale))}</small></span>
        <div className={styles.podiumLogo}><img src={entry.logo} alt={`${entry.club} logo`} /></div>
        <strong>{entry.club}</strong>
        <span className={styles.podiumMark} aria-hidden="true">{entry.rank === 1 ? 'CHAMPION' : `0${entry.rank}`}</span>
      </article>)}
    </div>
    <footer className={styles.seriesEligibility}>
      <span><i />{isEn ? 'ELIGIBILITY' : uiText("入选条件", locale)}</span>
      <p>{isEn ? 'Only clubs that completed both FCA2026 and FCR2026 are included.' : uiText("仅统计完整参加 FCA2026 与 FCR2026 两项赛事的俱乐部。", locale)}</p>
    </footer>
  </section> : null

  const championFileMeta = isEn
    ? `${story.championFile.rosterCount} registered · Reserve ${story.championFile.reserveNames.join(', ') || '—'} · Coach ${story.championFile.coach || '—'} · Manager ${story.championFile.manager || '—'}`
    : uiText("{0} 名注册选手 · 替补 {1} · 教练 {2} · 经理 {3}", locale, [story.championFile.rosterCount, story.championFile.reserveNames.join('、') || '—', story.championFile.coach || '—', story.championFile.manager || '—'])
  const championFileBrief = isEn
    ? `${story.championFile.rosterCount} PLAYERS · ${story.championFile.reserveCount} RESERVE · COACH ${story.championFile.coach || '—'}`
    : uiText("{0} 名注册 · {1} 名替补 · 教练 {2}", locale, [story.championFile.rosterCount, story.championFile.reserveCount, story.championFile.coach || '—'])

  const dossierSection = <section className={styles.dossierSection} id="archive-player-files" data-archive-section aria-labelledby="hybrid-player-files-title">
    <SectionSignal chapter={String(dossierChapter).padStart(2, '0')} label="PLAYER FILES" code={code} />
    <header className={styles.dossierHeading}>
      <div>
        <span>{String(dossierChapter).padStart(2, '0')} / THE PLAYER FILES</span>
        <h2 id="hybrid-player-files-title" data-locale={isEn ? 'en' : 'zh'}>{isEn ? <>Beyond the title.<span>Meet the season leaders.</span></> : <>{uiText("冠军之外，", locale)}<span>{uiText("谁定义了这个赛季？", locale)}</span></>}</h2>
      </div>
      <div className={styles.dossierIntro}>
        <p>{isEn ? 'Meet more players who shaped the season. Beyond the champion lineup above, explore standout performances across all three roles.' : uiText("走出冠军群像，继续认识这一季的选手。从重装、输出与支援的表现，发现更多值得回看的赛场记录。", locale)}</p>
        <Link to={leaderboardPath}>{isEn ? 'OPEN COMPLETE LEADERBOARD' : uiText("查看完整数据排行", locale)}<Arrow /></Link>
      </div>
    </header>
    <div className={styles.dossierWorkspace}>
      <section className={styles.dossierAdditions} aria-labelledby="dossier-featured-title">
        <header><span>{isEn ? 'SEASON OVERALL / PLAYER FILE' : uiText("赛季综合表现 / 选手档案", locale)}</span><strong id="dossier-featured-title">{isEn ? 'OVERALL LEADER' : uiText("综合排名领跑者", locale)}</strong></header>
        <div>
          {story.featuredLeader ? <Link className={`${styles.dossierFeature} ${styles.dossierLeaderFeature}`} to={playerFilePath(story.featuredLeader)}>
            <HeroArtwork hero={presentationHero(story.featuredLeader)} className={styles.dossierLeaderArt} decorative locale={locale} />
            <span className={styles.dossierLeaderShade} aria-hidden="true" />
            <span className={styles.dossierFeatureIdentity}>
              <small>OVERALL #{rankNumber(story.featuredLeader.overallRank)} · {isEn ? story.featuredLeader.role : uiText(getRoleLabel(story.featuredLeader.role), locale)} #{rankNumber(story.featuredLeader.roleRank)}</small>
              <strong>{playerLabel(story.featuredLeader)}</strong>
              <span>{entryTeamName(story.featuredLeader)}<i>/</i>{formatOwHeroName(presentationHero(story.featuredLeader), locale)}</span>
            </span>
            <span className={styles.dossierLeaderScore}><b>{formatEntrySeasonOvr(story.featuredLeader)}</b><small>OVR</small></span>
            <span className={styles.dossierFeatureCta}>{isEn ? 'OPEN PLAYER FILE' : uiText("查看选手档案", locale)}<Arrow /></span>
          </Link> : <Link className={styles.dossierFeatureEmpty} to={leaderboardPath}>{isEn ? 'Season rankings are not ready yet.' : uiText("赛季排行榜尚未产生合格选手。", locale)}<Arrow /></Link>}
        </div>
      </section>
      <section className={styles.dossierStarters} aria-labelledby="dossier-role-leaders-title">
        <header><span>{isEn ? 'ROLE LEADERS / PLAYER INDEX' : uiText("三大职责领跑者 / 选手索引", locale)}</span><strong id="dossier-role-leaders-title">{String(story.roleLeaders.length).padStart(2, '0')}</strong></header>
        <div>
          {story.roleLeaders.map(entry => <Link key={entry.entryKey} to={playerFilePath(entry)}>
            <b>{rankNumber(entry.roleRank)}</b>
            <span><strong>{playerLabel(entry)}</strong><small>{isEn ? `${entry.role} LEADER` : uiText("{0}榜第 {1} 名", locale, [uiText(getRoleLabel(entry.role), locale), entry.roleRank])} · {entryTeamName(entry)} · {formatOwHeroName(presentationHero(entry), locale)}</small></span>
            <em>{formatEntrySeasonOvr(entry)} OVR</em>
            <Arrow />
          </Link>)}
          {!story.roleLeaders.length ? <Link to={leaderboardPath}><b>—</b><span><strong>{isEn ? 'RANKINGS PENDING' : uiText("榜单待更新", locale)}</strong><small>{isEn ? 'OPEN THE LEADERBOARD' : uiText("查看完整数据排行", locale)}</small></span><em>—</em><Arrow /></Link> : null}
        </div>
      </section>
    </div>
    <div className={styles.dossierFooter}>
      <span><i />{isEn ? 'Official ranking requires' : uiText("正式排名门槛", locale)} / {formatSeasonSampleRequirements(story.rankingMinTimeMins, locale)}</span>
      <span>{story.roleLeaders.length} {isEn ? 'ROLE LEADERS · SEASON OVR' : uiText("名职责领跑者 · 依据赛季 OVR", locale)}</span>
    </div>
  </section>

  const reviewSection = isHybrid && includeReview ? <section className={styles.seasonReview} id="archive-season-review" data-archive-section aria-labelledby="hybrid-season-review-title">
    <SectionSignal chapter={String(reviewChapter).padStart(2, '0')} label="SEASON REVIEW" code={code} tone="dark" />
    <span className={styles.seasonReviewBackdrop} aria-hidden="true">REVIEW</span>
    <header className={styles.seasonReviewHeading}>
      <span>{String(reviewChapter).padStart(2, '0')} / SEASON REVIEW</span>
      <h2 id="hybrid-season-review-title">{isEn ? 'A season deserves more than a final score.' : uiText("这一季，值得再次走进。", locale)}</h2>
      <p>{isEn ? 'The tournament, its champions, its players and the people behind the broadcast return as one connected archive.' : uiText("赛事、冠军、选手与幕后人物，在同一份赛季档案里重新相遇。", locale)}</p>
      <div className={styles.seasonReviewChapters} aria-label={isEn ? 'Review story types' : uiText("回顾故事类型", locale)}>
        <span>{isEn ? 'TOURNAMENT' : uiText("赛事故事", locale)}</span>
        <span>{isEn ? 'TEAMS & PLAYERS' : uiText("队伍与选手", locale)}</span>
        <span>{isEn ? 'BEHIND THE SCENES' : uiText("幕后人物", locale)}</span>
      </div>
    </header>
    <Link className={styles.seasonReviewPortal} to={withSeason('/review')}>
      <img className={styles.seasonReviewLogo} src="/logos/fries-cup-symbol.png" alt="" aria-hidden="true" />
      <span className={styles.seasonReviewMeta}><small>FRIES CUP / {code}</small><small>{isEn ? 'ARCHIVE MODE' : uiText("赛季典藏模式", locale)}</small></span>
      <strong>{isEn ? <>This time,<em>it is more than data.</em></> : <>{uiText("这一次，", locale)}<em>{uiText("不只是看数据。", locale)}</em></>}</strong>
      <span className={styles.seasonReviewCta}>{isEn ? 'ENTER SEASON REVIEW' : uiText("进入赛季回顾", locale)}<Arrow /></span>
    </Link>
  </section> : null

  // This view owns its translations. Legacy DOM translation must not restore
  // a previous Chinese player name when the next selected name is Latin.
  return (
    <div ref={archiveRootRef} className={`${styles.archive} ${isHybrid ? styles.hybrid : ''}`} data-kpr-immersive-archive data-kpr-hybrid-archive={isHybrid ? 'true' : undefined} data-reduced-motion={reducedMotion} data-active-chapter={activeChapter} data-i18n-ignore>
      {isHybrid ? <nav className={styles.archiveRail} aria-label={isEn ? 'Season archive chapters' : uiText("赛季档案章节", locale)}>
        <span className={styles.railBrand}><img src="/logos/fries-cup-symbol.png" alt="" /><small>DATA SIGNAL</small></span>
        {chapterItems.map(item => <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={activeChapter === item.id ? 'location' : undefined}
          onClick={event => { event.preventDefault(); scrollToChapter(item.id) }}
        ><b>{item.number}</b><span>{item.label}</span></a>)}
        <span className={styles.railMeter}><b>{String(activeChapterIndex + 1).padStart(2, '0')} / {String(chapterItems.length).padStart(2, '0')}</b><i><span /></i><small>ARCHIVE</small></span>
      </nav> : null}
      <section className={styles.track} id="archive-champions" ref={trackRef} data-archive-section data-act={act} data-reduced-motion={reducedMotion} aria-label={isEn ? 'Interactive champion archive' : uiText("冠军互动档案", locale)}>
        {isHybrid ? <MobileSeasonArchive archive={archive} story={story} summary={summary} code={code} seasonId={seasonId} locale={locale} withSeason={withSeason} finalResult={finalResult} includeReview={includeReview} /> : null}
        <div className={styles.stage} ref={stageRef}>
          <div className={styles.darkSurface} aria-hidden="true" />
          <div className={styles.paper} aria-hidden="true" />
          <div className={styles.grid} aria-hidden="true" />
          <div className={styles.horizon} aria-hidden="true" />
          <div className={styles.giantType} aria-hidden="true">CHAMPIONS</div>
          <div className={styles.sceneDisc} aria-hidden="true"><span /><i /><b>FRIES CUP / {year || code}</b></div>
          <span className={styles.crossLeft} aria-hidden="true">+</span>
          <span className={styles.crossRight} aria-hidden="true">+</span>

          <div className={styles.topline}>
            <span><i />{code}<b>/</b>{isEn ? 'THE SEASON ARCHIVE' : uiText("赛季典藏", locale)}</span>
            <span className={styles.edition}>{isHybrid ? 'THE TEAM. THEN THE PLAYER.' : 'KEEP THE MOMENT.'}</span>
            <button type="button" className={styles.motionButton} onClick={() => setMotionPaused(!motionPaused)} aria-pressed={reducedMotion} disabled={prefersReducedMotion}>
              <i aria-hidden="true">{reducedMotion ? 'Ⅱ' : '◉'}</i>{reducedMotion ? (isEn ? 'MOTION OFF' : uiText("动态关闭", locale)) : (isEn ? 'MOTION ON' : uiText("动态开启", locale))}
            </button>
          </div>

          {isHybrid ? <div className={styles.ensembleScene} aria-hidden={act !== 0} inert={act !== 0}>
            <div className={styles.ensembleIntro}>
              <span className={styles.kicker}>01 <b>/</b> {isEn ? 'THE TITLE BELONGS TO ALL OF THEM' : uiText("这一季，属于他们。", locale)}</span>
              <h1><span className={styles.srOnly}>{isEn ? 'Season champions: ' : uiText("赛季总冠军：", locale)}</span>CHAMPIONS<i>+</i></h1>
            </div>
            <div className={styles.ensembleFigures} role="group" aria-label={isEn ? 'Choose a champion player' : uiText("选择冠军选手进入人物镜头", locale)}>
              {ensembleCast.map(({ entry, slot }, index) => <button
                key={entry.entryKey}
                type="button"
                className={styles.ensembleFigure}
                style={{ '--ensemble-order': index }}
                data-slot={slot}
                data-role={entry.role}
                data-hero={presentationHero(entry)}
                onClick={() => openRecord(entry)}
                aria-label={isEn ? `Open ${playerLabel(entry)} player scene` : uiText("进入人物镜头：{0}", locale, [playerLabel(entry)])}
                aria-pressed={subject?.entryKey === entry.entryKey}
              >
                <HeroArtwork hero={presentationHero(entry)} variant="spotlight" className={styles.ensembleArt} decorative priority={!isPhoneArchive && index < 3} locale={locale} />
                <span className={styles.ensembleName}><small>{String(index + 1).padStart(2, '0')} / {formatOwHeroName(presentationHero(entry), locale)}</small><strong>{playerLabel(entry)}</strong></span>
              </button>)}
            </div>
            <div className={styles.ensembleTeam} title={championFileMeta}>
              <TeamLogo team={archive.champion} seasonId={seasonId} className={styles.teamLogo} />
              <div className={styles.ensembleTeamIdentity}>
                <small>{isEn ? `CHAMPION FILE / ${code}` : uiText("冠军档案 / {0}", locale, [code])}</small>
                <strong>{story.championName}</strong>
                <span>{formatTeamFullName(archive.champion)}</span>
                <em className={styles.ensembleTeamMetaFull}>{championFileMeta}</em>
                <em className={styles.ensembleTeamMetaBrief}>{championFileBrief}</em>
              </div>
              <Link className={styles.ensembleTeamLink} to={teamPath} aria-label={isEn ? `Open champion file. ${championFileMeta}` : uiText("打开冠军档案。{0}", locale, [championFileMeta])}>
                <small>{isEn ? 'OPEN FILE' : uiText("冠军档案", locale)}</small><Arrow />
              </Link>
            </div>
          </div> : <div className={styles.championCopy} aria-hidden={act !== 0} inert={act !== 0}>
              <span className={styles.kicker}>01 <b>/</b> {isEn ? 'THE TITLE BELONGS TO' : uiText("这一季，属于他们。", locale)}</span>
              <h1 data-long-name={story.championName.length > 5}><span className={styles.srOnly}>{isEn ? 'Season champions: ' : uiText("赛季总冠军：", locale)}</span>{story.championName}<i>.</i></h1>
              <div className={styles.championIdentity}>
                <TeamLogo team={archive.champion} seasonId={seasonId} className={styles.teamLogo} />
                <div><strong>{formatTeamFullName(archive.champion)}</strong><span>{isEn ? 'SEASON CHAMPIONS' : uiText("赛季总冠军", locale)} <b>/</b> {year || code}</span></div>
              </div>
              <Link className={styles.primaryLink} to={teamPath}>{isEn ? 'Meet the champions' : uiText("走进冠军队伍", locale)}<Arrow /></Link>
            </div>}

          <div className={styles.figure} data-scene-subject={subject?.player_id}>
            <div className={styles.figureShadow} aria-hidden="true" />
            <div key={subject?.entryKey || 'empty'} className={styles.figureReveal}>
              <HeroArtwork hero={presentationHero(subject)} variant="spotlight" className={styles.heroArt} decorative priority={!isPhoneArchive} locale={locale} />
            </div>
          </div>

          <div className={styles.subjectCaption} aria-hidden={isHybrid && act === 0} inert={isHybrid && act === 0}>
            <span className={styles.captionLine} aria-hidden="true" />
            <span className={styles.captionIndex}>FOCUS <b>/ {subjectNumber}</b></span>
            <strong>{name}</strong>
            <span>{roleLabel || '—'} <i>/</i> {heroName}</span>
            <small>{isEn ? 'CHAMPION TEAM SELECTION' : uiText("冠军队伍选择英雄", locale)}</small>
            <button type="button" onClick={() => goToAct(act === 0 ? 1 : 0)}>{act === 0 ? (isEn ? 'Player spotlight' : uiText("进入选手镜头", locale)) : (isEn ? 'Back to champions' : uiText("回到冠军舞台", locale))}<Arrow /></button>
          </div>

          {finalResult && finalId ? <Link className={styles.finalScore} aria-hidden={act !== 0} inert={act !== 0} to={withSeason(`/matches/${encodeURIComponent(finalId)}`)}>
            <span>GRAND FINAL<small>{finalDate.slice(0, 10).replaceAll('-', '.')}</small></span>
            <strong><b>{finalResult.score}</b><i>:</i><b>{finalResult.opponentScore}</b></strong>
            <span><b><span>{formatTeamName(finalResult.own)}</span><em>VS</em><span>{formatTeamName(finalResult.opponent)}</span></b><small>{isEn ? 'Open final record' : uiText("查看决赛档案", locale)} <Arrow /></small></span>
          </Link> : null}

          <div className={styles.spotlightCopy} aria-hidden={act !== 1} inert={act !== 1}>
            <span className={styles.kicker}>02 <b>/</b> {isOfficialFmvpSubject ? 'FINALS MVP' : 'PLAYER SPOTLIGHT'}</span>
            <span className={styles.awardTag}>{isOfficialFmvpSubject ? (isEn ? 'OFFICIAL FINALS MVP' : uiText("官方总决赛最有价值选手", locale)) : (isEn ? 'CHAMPION PLAYER SPOTLIGHT' : uiText("冠军选手人物镜头", locale))}</span>
            <h2 data-long-name={hasLongName}>{name}<i>.</i></h2>
            <p className={styles.playerIdentity}>{subject?.team_short_name || story.championName}<b>/</b>{roleLabel || '—'}</p>
            <p className={styles.playerDescription}>{isOfficialFmvpSubject ? (isEn ? 'The player behind a defining moment.' : uiText("让这一刻，有了一个名字。", locale)) : (isEn ? 'One of the players behind the title.' : uiText("冠军背后的一个名字。", locale))}</p>
            <PlayerMetrics entry={subject} isEn={isEn} />
            <Link to={playerPath} className={styles.playerLink}>{isEn ? 'Explore player record' : uiText("查看完整选手档案", locale)}<Arrow /></Link>
          </div>

          <div className={styles.rosterDock} aria-hidden={isHybrid && act === 0} inert={isHybrid && act === 0}>
            <div className={styles.dockLabel}><span>THE ROSTER</span><small>{isEn ? 'SELECT A PLAYER' : uiText("点选，切换主镜头", locale)}</small></div>
            <div className={styles.dockPlayers} role="group" aria-label={isEn ? 'Select champion player' : uiText("选择冠军选手", locale)}>
              {story.cast.map((entry, index) => <button key={entry.entryKey} type="button" onClick={() => setSubjectKey(entry.entryKey)} aria-label={isEn ? `Focus on ${playerLabel(entry)}` : uiText("切换主镜头：{0}", locale, [playerLabel(entry)])} aria-pressed={subject?.entryKey === entry.entryKey}>
                <span className={styles.dockNumber}>{String(index + 1).padStart(2, '0')}</span>
                <HeroArtwork hero={presentationHero(entry)} variant="roster" className={styles.dockPortrait} decorative locale={locale} />
                <span className={styles.dockName}><strong>{playerLabel(entry)}</strong><small>{isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)}</small></span>
                <span className={styles.dockArrow} aria-hidden="true">↗</span>
              </button>)}
            </div>
            <span className={styles.srOnly} aria-live="polite">{isEn ? 'Current player: ' : uiText("当前选手：", locale)}{name}{isEn ? ', ' : '，'}{heroName}</span>
          </div>

          <div className={styles.chapterBar}>
            <nav aria-label={isEn ? 'Archive chapters' : uiText("典藏章节", locale)}>
              <button type="button" onClick={() => goToAct(0)} aria-current={act === 0 ? 'step' : undefined}><b>01</b>{isHybrid ? (isEn ? 'ENSEMBLE' : uiText("冠军群像", locale)) : (isEn ? 'CHAMPIONS' : uiText("冠军", locale))}</button>
              <button type="button" onClick={() => goToAct(1)} aria-current={act === 1 ? 'step' : undefined}><b>02</b>{isEn ? 'PLAYER' : uiText("人物镜头", locale)}</button>
              <button type="button" onClick={showSeasonAtlas}><b>03</b>{isEn ? 'SEASON ATLAS' : uiText("赛季图谱", locale)}</button>
            </nav>
            <span className={styles.scrollHint}>{isHybrid ? (isEn ? 'SELECT A HERO · OR SCROLL TO CONTINUE' : uiText("点击英雄进入人物镜头 · 向下滚动继续", locale)) : (isEn ? 'SCROLL TO CHANGE THE SCENE' : uiText("向下滚动，让镜头继续", locale))}<b aria-hidden="true">↓</b></span>
          </div>
          <div className={styles.progressRail} aria-hidden="true"><span /></div>
        </div>
      </section>

      {isHybrid ? <div className={styles.signalGate} aria-hidden="true">
        <span className={styles.signalGateBrand}><img src="/logos/fries-cup-symbol.png" alt="" /><b>FC / ARCHIVE LINK</b></span>
        <span className={styles.signalGateTrack}><i>FRIES CUP SERIES · COMPETITION DATA · {code} · THE TEAM · THE PLAYER · </i><i>FRIES CUP SERIES · COMPETITION DATA · {code} · THE TEAM · THE PLAYER · </i></span>
        <strong>01 → {seriesArchive ? '02' : String(atlasChapter).padStart(2, '0')}</strong>
      </div> : null}

      {seriesSection}

      {isHybrid ? <section className={styles.seasonAtlas} id="archive-season-atlas" ref={atlasRef} data-archive-section aria-labelledby="hybrid-season-atlas-title">
        <SectionSignal chapter={String(atlasChapter).padStart(2, '0')} label="SEASON ATLAS" code={code} />
        <header className={styles.seasonAtlasHeading}>
          <div>
            <span>{String(atlasChapter).padStart(2, '0')} / SEASON ATLAS / {code}</span>
            <h2 id="hybrid-season-atlas-title">{isEn ? <>The whole season,<span>in one system.</span></> : <>{uiText("把整个赛季，", locale)}<span>{uiText("装进一张图谱。", locale)}</span></>}</h2>
          </div>
          <p>{isEn ? 'Every route begins at the same archive core: bracket, matches, teams and player data.' : uiText("晋级、赛程、队伍与选手数据，都从同一个赛季核心向外展开。", locale)}</p>
        </header>
        <div className={styles.atlasCanvas}>
          <div className={styles.atlasOrbit} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.atlasCore}>
            <img src="/logos/fries-cup-symbol.png" alt="" aria-hidden="true" />
            <small>FRIES CUP / ARCHIVE CORE</small>
            <strong>{code}</strong>
            <span>{story.championName}</span>
            <em>{isEn ? 'SEASON CHAMPION' : uiText("赛季总冠军", locale)}</em>
          </div>
          <nav className={styles.atlasNodes} aria-label={isEn ? 'Season data atlas' : uiText("赛季数据图谱", locale)}>
            <Link data-node="bracket" to={withSeason('/advance')}><span><b>01</b>BRACKET</span><strong>{isEn ? 'PLAYOFF' : uiText("晋级图", locale)}</strong><small>{isEn ? 'ROAD TO THE TITLE' : uiText("查看完整晋级路径", locale)}<Arrow /></small></Link>
            <Link data-node="matches" to={withSeason('/matches')}><span><b>02</b>MATCHES</span><strong>{summary.matches ?? '—'}</strong><small>{isEn ? 'RECORDED MATCHES' : uiText("场比赛档案", locale)}<Arrow /></small></Link>
            <Link data-node="field" to={withSeason('/teams')}><span><b>03</b>THE FIELD</span><strong>{summary.teams ?? '—'}<i>/</i>{summary.players ?? '—'}</strong><small>{isEn ? 'TEAMS / PLAYERS' : uiText("支队伍 / 名选手", locale)}<Arrow /></small></Link>
            <Link data-node="data" to={withSeason('/leaderboard')}><span><b>04</b>DATA</span><strong>{summary.maps ?? '—'}</strong><small>{isEn ? 'MAP RECORDS' : uiText("张地图数据", locale)}<Arrow /></small></Link>
          </nav>
        </div>
        {includeReview ? <Link className={styles.atlasReviewSignal} to={withSeason('/review')}><span><i />{String(reviewChapter).padStart(2, '0')} / REVIEW CHANNEL READY</span><strong>{isEn ? 'Season stories are now available.' : uiText("赛季故事档案已开放。", locale)}</strong><Arrow /></Link> : null}
      </section> : rosterSection}

      <section className={styles.journeySection} id="archive-title-road" ref={journeyRef} data-archive-section data-chapter={String(journeyChapter).padStart(2, '0')} aria-labelledby="immersive-journey-title">
        <SectionSignal chapter={String(journeyChapter).padStart(2, '0')} label="TITLE ROAD" code={code} />
        <header className={styles.journeyHeading}>
          <div className={styles.sectionHeading}><span>{String(journeyChapter).padStart(2, '0')} / THE ROAD TO THE TITLE</span><h2 id="immersive-journey-title">{isEn ? 'Every round led here.' : uiText("每一步，通向此刻。", locale)}</h2></div>
          <span>{isEn ? 'THE LAST THREE COMPLETED MATCHES' : uiText("冠军最后三场已完成比赛", locale)}</span>
        </header>
        <div className={styles.journeyRoute}>
          <span className={styles.journeyLine} aria-hidden="true"><i /></span>
          {story.journey.map((match, index) => {
            const result = getChampionResult(match, archive.champion)
            const matchId = match.match_id || match.id
            const isFinal = matchId === finalId
            return <Link key={matchId} to={withSeason(`/matches/${encodeURIComponent(matchId)}`)} className={isFinal ? styles.finalJourney : ''} data-step={index + 1}>
              <span className={styles.journeyNode}><i /><b>{String(index + 1).padStart(2, '0')}</b></span>
              <header><span>{isFinal ? 'GRAND FINAL' : match.round || match.stage || 'MATCH'}</span><Arrow /></header>
              <div className={styles.matchResult}><span>{formatTeamName(result.own)}</span><strong>{result.score}<i>:</i>{result.opponentScore}</strong><span>{formatTeamName(result.opponent)}</span></div>
              <footer><time>{formatMatchDate(match).slice(0, 10).replaceAll('-', '.')}</time><span>{isEn ? 'OPEN MATCH RECORD' : uiText("进入比赛档案", locale)}</span></footer>
            </Link>
          })}
        </div>
      </section>

      {isHybrid ? dossierSection : null}

      {reviewSection}

      <footer className={styles.archiveFooter}>
        <div><span>BEYOND THE MOMENT</span><h2>{isEn ? 'The story continues in the data.' : uiText("高光之后，数据继续。", locale)}</h2><p>{summary.teams ?? '—'} {isEn ? 'TEAMS' : uiText("支队伍", locale)}<b>/</b>{summary.players ?? '—'} {isEn ? 'PLAYERS' : uiText("名选手", locale)}<b>/</b>{summary.maps ?? '—'} {isEn ? 'MAPS' : uiText("张地图", locale)}</p></div>
        <nav aria-label={isEn ? 'Continue exploring' : uiText("继续浏览", locale)}>
          <Link to={withSeason('/leaderboard')}>{isEn ? 'Explore rankings' : uiText("进入数据排行榜", locale)}<Arrow /></Link>
          {!isHybrid || !includeReview ? <Link to={withSeason(includeReview ? '/review' : '/matches')}>{includeReview ? (isEn ? 'Season archive' : uiText("查看完整赛季回顾", locale)) : (isEn ? 'Match results' : uiText("赛程赛果", locale))}<Arrow /></Link> : null}
        </nav>
      </footer>
      <div className={styles.credits}>
        <span>{isEn ? 'Unofficial community site. Overwatch artwork © Blizzard Entertainment.' : uiText("非官方社区网站。守望先锋美术素材版权归 Blizzard Entertainment 所有。", locale)}</span>
        <span className={styles.creditsResources}>{isEn ? 'Uses ' : uiText("使用字体：", locale)}<a href="/fonts/harmonyos/LICENSE.txt" target="_blank" rel="noreferrer">HarmonyOS Sans</a> / <a href="/fonts/barlow-condensed/OFL.txt" target="_blank" rel="noreferrer">Barlow Condensed</a><b>·</b><a href="https://ambientcg.com/view?id=Paper001" target="_blank" rel="noreferrer">Paper 001 / CC0</a></span>
        {isHybrid ? <span className={styles.creditsStatus} data-archive-data-status data-source={dataStatus?.key}><span>{dataStatus?.label || (isEn ? 'Updated' : uiText("数据更新于", locale))}</span><time>{updatedAtText || '—'}</time></span> : null}
      </div>
    </div>
  )
}
