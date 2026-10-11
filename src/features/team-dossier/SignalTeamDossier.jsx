import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getRestoreScrollY, getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { buildDossierSummary, formatDossierRecord, getDossierJourneyStages, getDossierMapPool, getDossierMatch } from './teamDossierPresentation.js'
import TeamGalleryScenes from './TeamGalleryScenes.jsx'
import TeamJourneyScenes from './TeamJourneyScenes.jsx'
import TeamArchiveNavigation from './TeamArchiveNavigation.jsx'
import TeamPerformanceReport from './TeamPerformanceReport.jsx'
import { getArchiveIdentity } from './teamArchiveContent.js'
import { getTeamResearch } from './teamDossierResearch.js'
import { getDossierView, getDossierViewHref } from './teamDossierScenes.js'
import sceneStyles from './TeamArchiveScenes.module.css'
import styles from './SignalTeamDossier.module.css'

const CHAPTERS = [
  { id: 'season-route', zh: '比赛现场', en: 'Match scene' },
  { id: 'roster', zh: '队伍阵容', en: 'Roster' },
  { id: 'journey', zh: '赛季征程', en: 'Journey' },
  { id: 'maps', zh: '地图足迹', en: 'Maps' },
  { id: 'records', zh: '战斗记录', en: 'Records' }
]
const percent = value => value === null ? '—' : `${Math.round(value * 100)}%`

function ChapterHeading({ index, title, code, note, dark = false }) {
  return <header className={styles.chapterHeading} data-dark={dark || undefined}>
    <span className={styles.chapterNumber}>{String(index).padStart(2, '0')}</span>
    <div><span className={styles.eyebrow}>{code}</span><h2>{title}</h2></div>
    {note ? <p>{note}</p> : null}
  </header>
}

function MatchRow({ row, seasonId, withSeason, returnState, onLeave, en, compact = false }) {
  const uiLocale = useUiLocale()
  return <Link className={styles.matchRow} data-compact={compact || undefined} to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)} state={returnState} onClick={onLeave}>
    <time className={styles.matchDate}>{row.timeLabel.split(' ')[0]}<small>{row.timeLabel.split(' ').slice(1).join(' ')}</small></time>
    <span className={styles.matchOpponent}><TeamLogo team={row.opponent} seasonId={seasonId} className={styles.opponentLogo} /><span><b><small>{en ? 'vs' : uiText("对阵", uiLocale)} </small>{row.opponentLabel}</b><small>{row.roundLabel}{row.note ? ` · ${row.note}` : ''}</small></span></span>
    <strong className={styles.matchScore}>{row.scoreLabel}</strong>
    <span className={styles.result} data-tone={row.tone}>{row.label}</span>
    <span className={styles.rowArrow} aria-hidden="true">↗</span>
  </Link>
}

function WinRateTrace({ rows, en }) {
  const uiLocale = useUiLocale()
  const decided = rows.filter(row => row.decided)
  if (!decided.length) return null
  let wins = 0
  const rates = []
  for (const row of decided) {
    if (row.tone === 'win') wins += 1
    rates.push(wins / (rates.length + 1))
  }
  const points = rates.map((rate, index) => `${12 + index / Math.max(1, rates.length - 1) * 264},${102 - rate * 88}`)
  const endY = 102 - rates.at(-1) * 88
  return <div className={styles.winTrace}>
    <span className={styles.eyebrow}>{en ? 'THE SEASON IN MOTION' : uiText("赛季轨迹", uiLocale)}</span>
    <h3>{en ? 'Cumulative win rate' : uiText("累计比赛胜率", uiLocale)}</h3>
    <svg viewBox="0 0 288 116" role="img" aria-label={en ? `Win rate after each decided series: ${rates.map(percent).join(', ')}` : uiText("每场有赛果的比赛之后，累计胜率依次为 {0}", uiLocale, [rates.map(percent).join('、')])}>
      <path d="M12 14H276M12 58H276M12 102H276" className={styles.traceGuides} />
      <polyline points={points.join(' ')} className={styles.traceLine} />
      {rates.map((rate, index) => <circle key={decided[index].match.match_id} cx={12 + index / Math.max(1, rates.length - 1) * 264} cy={102 - rate * 88} r="2.5" className={styles.traceDot} />)}
      <circle cx={rates.length > 1 ? 276 : 12} cy={endY} r="4" className={styles.traceEnd} />
    </svg>
    <div><span>{en ? 'First series' : uiText("首场", uiLocale)} / {decided[0].timeLabel.split(' ')[0]}</span><b>{percent(rates.at(-1))}</b></div>
    <p>{en ? 'One point per decided series, in schedule order. Includes administrative results.' : uiText("每个点对应一场已发布赛果，按赛程先后排列，包含判罚结果。", uiLocale)}</p>
  </div>
}

export default function SignalTeamDossier({ team, seasonId, locale, withSeason, rosterGroups, matchRows, allMatches, advanceState, onBack, onShare, onToggleFavorite, favorited, favoriteDisabled, sourceReturnState }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const rows = useMemo(() => matchRows.map(row => getDossierMatch(row, locale)), [matchRows, locale])
  const summary = useMemo(() => buildDossierSummary(rows), [rows])
  const stages = useMemo(() => getDossierJourneyStages(rows, locale), [rows, locale])
  const mapPool = useMemo(() => getDossierMapPool(rows, locale), [rows, locale])
  const roster = useMemo(() => rosterGroups.flatMap(group => [...group.rows].sort((a, b) => Number(b.raw_time_mins || 0) - Number(a.raw_time_mins || 0))), [rosterGroups])
  const research = useMemo(() => getTeamResearch(rows, roster, locale), [rows, roster, locale])
  const mapSamples = mapPool.reduce((sum, map) => sum + map.maps, 0)
  const next = rows.find(row => row.live) || rows.find(row => row.tone === 'pending')
  const focus = next
  const requestedStage = params.get('teamStage') || 'all'
  const selectedStage = stages.some(stage => stage.key === requestedStage) ? requestedStage : 'all'
  const requestedResult = params.get('result') || 'all'
  const selectedResult = ['all', 'win', 'loss', 'pending'].includes(requestedResult) ? requestedResult : 'all'
  const oldestFirst = params.get('teamOrder') === 'oldest'
  const matchingRows = rows.filter(row => (selectedStage === 'all' || row.match.stage === selectedStage) && (selectedResult === 'all' || (selectedResult === 'pending' ? ['pending', 'live'].includes(row.tone) : row.tone === selectedResult)))
  const orderedRows = oldestFirst ? matchingRows : [...matchingRows].reverse()
  const visibleRows = params.get('journey') === 'all' ? orderedRows : orderedRows.slice(0, 8)
  const chapter = params.get('chapter') || ({ matches: 'journey', stats: 'records' })[params.get('tab')]
  const view = getDossierView(location.pathname, location.search)
  const recordsMode = params.get('journeyView') === 'records' || (!params.has('journeyView') && chapter === 'journey')
  const viewState = { returnTo: sourceReturnState.returnTo, returnScrollY: sourceReturnState.returnScrollY }
  const galleryHref = getDossierViewHref(location.pathname, location.search, 'gallery')
  const journeyHref = getDossierViewHref(location.pathname, location.search, 'journey')
  const analysisHref = getDossierViewHref(location.pathname, location.search, 'analysis')
  const restoredScroll = getRestoreScrollY(location.state)
  const returnState = { ...getReturnState(location), ...(sourceReturnState.returnTo ? { parentReturnTo: sourceReturnState.returnTo, parentReturnScrollY: sourceReturnState.returnScrollY } : {}) }
  const onLeave = () => saveReturnScroll(location)
  const updateQuery = (values) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => value && value !== 'all' ? nextParams.set(key, value) : nextParams.delete(key))
    setParams(nextParams, { replace: true, state: location.state })
  }

  useEffect(() => {
    if (restoredScroll !== null || !CHAPTERS.some(item => item.id === chapter)) return undefined
    const timer = window.setTimeout(() => document.getElementById(`team-${chapter}`)?.scrollIntoView({ block: 'start', behavior: 'instant' }), 80)
    return () => window.clearTimeout(timer)
  }, [chapter, team.routeId, restoredScroll, view])


  const changeJourneyView = showRecords => {
    updateQuery({ journeyView: showRecords ? 'records' : null, chapter: null, tab: null })
    document.querySelector('[data-journey-cover]')?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const shareDossier = () => {
    const mapWins = mapPool.reduce((sum, map) => sum + map.wins, 0)
    const mapLosses = mapPool.reduce((sum, map) => sum + map.losses, 0)
    onShare({ matchRecordLabel: summary.administrative ? (en ? `W/L · incl. ${summary.administrative} admin` : uiText("比赛胜负 · 含 {0} 场判罚", locale, [summary.administrative])) : (en ? 'Series W/L' : uiText("比赛胜负", locale)), matchRecord: `${summary.wins}-${summary.losses}`, completedLabel: `${summary.completed} ${en ? 'completed series' : uiText("场已完成", locale)}`, mapRecord: `${mapWins}-${mapLosses}`, mapWinRate: `${mapSamples ? percent(mapWins / mapSamples) : '—'} ${en ? 'map win rate' : uiText("地图胜率", locale)}` })
  }
  const openedEvidence = (params.get('teamEvidence') || '').split(',').filter(Boolean)
  const toggleEvidence = id => {
    const next = openedEvidence.includes(id) ? openedEvidence.filter(key => key !== id) : [...openedEvidence, id]
    updateQuery({ teamEvidence: next.join(',') })
  }

  return <article className={styles.dossier} data-team-dossier="signal" data-archive-view={view} data-page-mode={view === 'analysis' ? 'index' : 'archive'} style={getArchiveIdentity()} data-i18n-ignore>
    <TeamArchiveNavigation team={team} seasonId={seasonId} locale={locale} view={view} galleryHref={galleryHref} journeyHref={journeyHref} analysisHref={analysisHref} viewState={viewState} onBack={onBack} onShare={shareDossier} />
    {view === 'gallery' ? <>
      <TeamGalleryScenes team={team} seasonId={seasonId} locale={locale} roster={roster} rows={rows} advanceState={advanceState} research={research} memberId={params.get('member')} onMemberChange={member => updateQuery({ member })} journeyHref={journeyHref} analysisHref={analysisHref} withSeason={withSeason} returnState={returnState} viewState={viewState} onLeave={onLeave} favorited={favorited} favoriteDisabled={favoriteDisabled} onToggleFavorite={onToggleFavorite} />
    </> : view === 'analysis' ? <>
      <TeamPerformanceReport team={team} seasonId={seasonId} rows={rows} roster={roster} allMatches={allMatches} locale={locale} params={params} updateQuery={updateQuery} opened={openedEvidence} onToggle={toggleEvidence} withSeason={withSeason} returnState={returnState} onLeave={onLeave} journeyHref={journeyHref} />
    </> : <>
      <TeamJourneyScenes key={team.routeId + seasonId} team={team} seasonId={seasonId} locale={locale} rows={rows} summary={summary} advanceState={advanceState} matchId={params.get('teamMatch')} journalMatchId={params.get('journalMatch')} onMatchChange={teamMatch => updateQuery({ teamMatch, journalMatch: null, chapter: null })} recordsMode={recordsMode} onViewChange={changeJourneyView} withSeason={withSeason} returnState={returnState} onLeave={onLeave} restoreScroll={restoredScroll} />

    {recordsMode ? <section id="team-journey" className={styles.chapter} data-dossier-chapter="journey">
      <ChapterHeading index={1} code="A SEASON, MATCH BY MATCH" title={en ? 'The complete match ledger.' : uiText("完整比赛记录。", locale)} note={en ? `${rows.length} schedule records` : uiText("{0} 条赛程记录", locale, [rows.length])} />
      <div className={styles.journeyGrid}>
        <aside className={styles.journeyAside}>
          <div className={styles.stageRail}>{stages.map((stage, index) => <button type="button" key={stage.key} aria-pressed={selectedStage === stage.key} onClick={() => updateQuery({ teamStage: selectedStage === stage.key ? 'all' : stage.key, journey: null })}><span className={styles.stageIndex}>0{index + 1}</span><span><b>{stage.label}</b><small>{stage.summary.completed ? formatDossierRecord(stage.summary, locale) : en ? 'Awaiting results' : uiText("等待赛果", locale)}{stage.summary.byes ? ` · ${stage.summary.byes} ${en ? 'bye' : uiText("轮空", locale)}` : ''}</small></span><span aria-hidden="true">↗</span></button>)}</div>
          {focus ? <Link className={styles.focusMatch} to={withSeason(`/matches/${encodeURIComponent(focus.match.match_id)}`)} state={returnState} onClick={onLeave}><span className={styles.eyebrow}>{focus.live ? (en ? 'LIVE NOW' : uiText("正在进行", locale)) : (en ? 'NEXT MATCH' : uiText("下一场比赛", locale))}</span><p>{focus.roundLabel}</p><div><TeamLogo team={focus.opponent} seasonId={seasonId} className={styles.focusLogo} /><b>{en ? 'vs' : uiText("对阵", locale)} {focus.opponentLabel}</b></div><strong>{focus.scoreLabel}</strong><footer><span>{focus.timeLabel}</span><span aria-hidden="true">↗</span></footer></Link> : null}
          <WinRateTrace rows={rows} en={en} />
        </aside>
        <div className={styles.journeyLedger}>
          <div className={styles.matchControls}><div role="group" aria-label={en ? 'Filter results' : uiText("筛选赛果", locale)}>{[['all', '全部', 'All'], ['win', '胜场', 'Wins'], ['loss', '负场', 'Losses'], ['pending', '待赛', 'Upcoming']].map(([id, zh, english]) => <button type="button" key={id} aria-pressed={selectedResult === id} onClick={() => updateQuery({ result: id, journey: null })}>{en ? english : zh}</button>)}</div><select aria-label={en ? 'Match order' : uiText("比赛排序", locale)} value={oldestFirst ? 'oldest' : 'newest'} onChange={event => updateQuery({ teamOrder: event.target.value === 'oldest' ? 'oldest' : null })}><option value="newest">{en ? 'Newest first' : uiText("最新比赛在前", locale)}</option><option value="oldest">{en ? 'Oldest first' : uiText("从赛季起点看", locale)}</option></select></div>
          {selectedStage !== 'all' ? <div className={styles.activeFilter}><span>{stages.find(stage => stage.key === selectedStage)?.label} · {matchingRows.length} {en ? 'records' : uiText("条记录", locale)}</span><button type="button" onClick={() => updateQuery({ teamStage: null, journey: null })}>{en ? 'All stages ×' : uiText("查看全部阶段 ×", locale)}</button></div> : null}
          <div className={styles.matchList}>{visibleRows.map(row => <MatchRow key={row.match.match_id} row={row} seasonId={seasonId} withSeason={withSeason} returnState={returnState} onLeave={onLeave} en={en} />)}</div>
          {!matchingRows.length ? <div className={styles.empty}><p>{en ? 'No matches match this selection.' : uiText("这个条件下暂无比赛。", locale)}</p>{selectedStage !== 'all' || selectedResult !== 'all' ? <button type="button" onClick={() => updateQuery({ teamStage: null, result: null })}>{en ? 'Clear filters' : uiText("清除筛选", locale)}</button> : null}</div> : null}
          {visibleRows.length < matchingRows.length ? <button className={styles.showAll} type="button" onClick={() => { const nextParams = new URLSearchParams(params); nextParams.set('journey', 'all'); setParams(nextParams, { replace: true, state: location.state }) }}>{en ? `Show all ${matchingRows.length} records` : uiText("展开全部 {0} 条记录", locale, [matchingRows.length])} ↓</button> : null}
          <div className={styles.ledgerFoot}><span>{visibleRows.length} / {matchingRows.length}</span><Link to={withSeason(`/matches?view=list&tab=all&team=${encodeURIComponent(team.shortName)}&teamId=${encodeURIComponent(team.routeId)}`)} state={returnState} onClick={onLeave}>{en ? 'Open match index' : uiText("前往赛程索引", locale)} ↗</Link></div>
        </div>
      </div>
    </section> : null}

      <Link className={sceneStyles.nextPage} to={analysisHref} state={viewState}><span>{en ? 'Read the team through data' : uiText("从比赛，走向表现分析", locale)}</span><b>{en ? 'Results, people and team performance.' : uiText("一起看战绩、成员与团队表现。", locale)}</b><span aria-hidden="true">↗</span></Link>
    </>}
    <footer className={styles.pageFoot}><Link to={withSeason('/teams')}>← {en ? 'Explore more teams' : uiText("继续浏览其他队伍", locale)}</Link><span>{team.shortName} / {seasonId}</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>{en ? 'Back to top' : uiText("回到封面", locale)} ↑</button></footer>
  </article>
}
