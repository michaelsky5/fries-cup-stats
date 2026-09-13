import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../TeamLogo.jsx'
import SignalMatchPlayers from './SignalMatchPlayers.jsx'
import SignalMapChapter from './SignalMapChapter.jsx'
import SignalMatchSpotlight from './SignalMatchSpotlight.jsx'
import SignalMatchResources from './SignalMatchResources.jsx'
import useCompactMatchLayout from './useCompactMatchLayout.js'
import { SignalRating } from './SignalPlayerData.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { getMatchDisplayTeams } from '../../../lib/matchesSelectors.js'
import { getScheduleRoundLabel, getScheduleStageLabel } from '../../../features/match-schedule/schedulePresentation.js'
import { getScheduleHighlightFact } from '../../../features/match-schedule/scheduleHighlights.js'
import { getMatchPath } from '../../../lib/matchDetailSelectors.js'
import { getMatchReviewPlayers, getMatchReviewProgress, getReviewFormat, REVIEW_METRICS } from '../../../lib/matchReviewSelectors.js'
import { getRestoreScrollState } from '../../../lib/navigationState.js'
import { formatInt } from '../../../lib/format.js'
import styles from './SignalMatchDetail.module.css'
import { getMatchAnalysisSearch, getMatchMapDataSearch } from './matchReadingState.js'
import { getMatchPhasePresentation } from './matchPhasePresentation.js'
import { SignalMatchPhaseProgress, SignalMatchPreparation } from './SignalMatchPhase.jsx'

function getMapOutcome(map, locale) {
  const en = locale === 'en-US'
  if (!map.hasResult) return en ? 'Pending' : uiText('待赛', locale)
  if (map.winnerTeam) return `${map.winnerTeam.short} ${map.raw?.is_administrative === true ? (en ? 'AWARDED WIN' : uiText('判胜', locale)) : (en ? 'WIN' : uiText('胜', locale))}`
  if (map.winnerSide === 'DRAW') return en ? 'Draw' : uiText('平局', locale)
  return map.winnerLabel || (en ? 'Result pending' : uiText('胜负待确认', locale))
}

function getRoundLabel(dossier, locale) {
  return getScheduleRoundLabel({ ...dossier.match, round: dossier.match.round || dossier.rawDisplayName }, locale)
}

function TeamIdentity({ team, logoTeam, side, seasonId, winner, withSeason, returnState, onNavigate, en }) {
  const uiLocale = useUiLocale()
  const path = team.id && !['TBD', 'UNKNOWN', '-'].includes(String(team.id).toUpperCase()) ? withSeason(`/teams/${encodeURIComponent(team.id)}`) : ''
  const content = <>
    <TeamLogo team={logoTeam || { id: team.id, short: team.short, name: team.full }} seasonId={seasonId} teamShortName={team.short} teamName={team.full} large className={styles.teamLogo} />
    <span><strong>{team.short}</strong><small>{team.full}</small></span>
    <em data-winner={winner} aria-hidden={!winner}>{winner ? (en ? 'WINNER' : uiText("获胜队伍", uiLocale)) : '\u00a0'}</em>
  </>
  return path ? <Link className={styles.teamIdentity} data-side={side} to={path} state={returnState} onClick={onNavigate}>{content}</Link> : <div className={styles.teamIdentity} data-side={side}>{content}</div>
}

function SeriesProgress({ maps, currentOrder, onSelectMap, en }) {
  const uiLocale = useUiLocale()
  if (maps.length < 2) return null
  return <div className={styles.progress}>
    <div className={styles.progressHeading}><strong>{en ? 'Series progression' : uiText("比赛走势", uiLocale)}</strong><span>{en ? 'After each map' : uiText("每图后的大比分", uiLocale)}</span></div>
    <nav className={styles.progressRail} aria-label={en ? 'Series progression' : uiText("系列赛走势", uiLocale)}>
      {maps.map(map => <button key={map.key} type="button" className={styles.progressStep} aria-current={currentOrder === map.order ? 'location' : undefined} onClick={() => onSelectMap(map.order)} aria-label={`${en ? 'View map' : uiText("查看第", uiLocale)} ${map.order}${en ? '' : uiText(" 图", uiLocale)} · ${map.name} · ${getMapOutcome(map, uiLocale)} · ${en ? 'Series score' : uiText("大比分", uiLocale)} ${map.cumulative}`}>
        <span className={styles.progressMap}><small>{map.orderLabel}</small><strong>{map.name}</strong></span>
        <span className={styles.progressResult}><b>{map.cumulative.replace(':', ' : ')}</b><span>{getMapOutcome(map, uiLocale)}</span></span>
      </button>)}
    </nav>
  </div>
}

function TeamComparison({ dossier, selectedMap, seasonId, en }) {
  const uiLocale = useUiLocale()
  const compact = useCompactMatchLayout()
  const [expanded, setExpanded] = useState(null)
  const open = expanded ?? !compact
  const rows = useMemo(() => getMatchReviewPlayers(dossier, selectedMap?.order), [dossier, selectedMap?.order])
  if (!rows.length) return null
  const totals = Object.fromEntries(['A', 'B'].map(side => [side, Object.fromEntries(REVIEW_METRICS.map(metric => [metric.key, rows.filter(row => row.side === side).reduce((total, row) => total + row[metric.key], 0)]))]))
  return <section className={styles.comparison} aria-label={en ? 'Full-match team comparison' : uiText("全场队伍数据对比", uiLocale)}>
    <details open={open} data-team-totals>
    <summary onClick={event => { event.preventDefault(); setExpanded(!open) }} aria-label={en ? `${open ? 'Collapse' : 'Expand'} team totals` : uiText("{0}双方总计", uiLocale, [open ? '收起' : '展开'])}><strong>{en ? 'Team totals' : uiText("双方数据总计", uiLocale)}</strong><span className={styles.comparisonLegend}>{['A', 'B'].map(side => <span key={side}><TeamLogo team={dossier.match[`team_${side.toLowerCase()}`]} seasonId={seasonId} teamShortName={dossier[`team${side}`].short} className={styles.comparisonLogo} />{dossier[`team${side}`].short}</span>)}</span><span className={styles.comparisonToggle} aria-hidden="true">{open ? '−' : '＋'}</span></summary>
    <div className={styles.comparisonGrid}>
      {REVIEW_METRICS.map(metric => {
        const a = totals.A[metric.key]
        const b = totals.B[metric.key]
        const label = en ? metric.en : uiText(metric.zh, uiLocale)
        return <div className={styles.comparisonRow} key={metric.key} role="group" aria-label={label} data-team-total={metric.key}>
          <strong className={styles.comparisonMetric}>{label}</strong>
          <dl className={styles.comparisonValues}>{['A', 'B'].map(side => <div key={side} data-side={side}>
            <dt>{dossier[`team${side}`].short}</dt>
            <dd>{formatInt(totals[side][metric.key], '—')}</dd>
          </div>)}</dl>
          <div className={styles.comparisonBar} aria-hidden="true"><i style={{ flex: a + b ? a : 1 }} /><i style={{ flex: a + b ? b : 1 }} /></div>
        </div>
      })}
    </div>
    </details>
  </section>
}

function RegisteredRosters({ dossier, withSeason, returnState, onNavigate, en }) {
  const uiLocale = useUiLocale()
  return <div className={styles.rosters}>{['A', 'B'].map(side => <div key={side}><strong>{dossier[`team${side}`].short}</strong>{dossier.rosters[`team${side}`].length ? dossier.rosters[`team${side}`].map(player => <div key={player.id || player.name}>{player.id ? <Link to={withSeason(`/players/${encodeURIComponent(player.id)}`)} state={returnState} onClick={onNavigate}>{player.name}</Link> : <span>{player.name}</span>}<small>{en ? getRoleEnLabel(player.role) : uiText(getRoleLabel(player.role), uiLocale)}</small></div>) : <p>{en ? 'Roster not published' : uiText("名单尚未发布", uiLocale)}</p>}</div>)}</div>
}

function PendingRoster({ dossier, withSeason, returnState, onNavigate, en }) {
  const uiLocale = useUiLocale()
  const forfeitNotice = dossier.state.isForfeit && dossier.hasMapRecords
    ? (en ? 'Completed map results are preserved below. The remaining maps were not played due to the forfeit.' : uiText('下方保留已完成地图的赛果，其余地图因弃权未进行。', uiLocale)) : ''
  return <div className={styles.pending}>
    <h2>{dossier.state.isForfeit ? (en ? 'Forfeit result' : uiText("弃权赛果", uiLocale)) : en ? dossier.statusEn : dossier.statusLabel}</h2>
    <p>{dossier.statusNote || forfeitNotice || (dossier.state.isUpcoming ? (en ? 'Published match arrangements are shown below. Player statistics will be available after results are published.' : uiText("以下为已发布的比赛安排，选手统计将在赛果发布后提供。", uiLocale)) : dossier.mapRecords?.length ? (en ? 'Map results are available below. Player statistics have not been published.' : uiText("下方可查看已发布的地图赛果，选手统计尚未提供。", uiLocale)) : (en ? 'No played-map or player statistics are available for this result.' : uiText("当前结果没有可供查看的实赛地图或选手统计。", uiLocale)))}</p>
    <h3>{en ? 'Registered rosters' : uiText("已登记队伍阵容", uiLocale)}</h3><p className={styles.rosterNote}>{en ? 'These are team rosters, not a confirmed match lineup.' : uiText("以下为队伍登记名单，本场实际出场名单以比赛记录为准。", uiLocale)}</p>
    <RegisteredRosters dossier={dossier} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} />
  </div>
}

function RoleStandouts({ dossier, selectedMap, withSeason, returnState, onNavigate, en }) {
  const uiLocale = useUiLocale()
  const rows = useMemo(() => getMatchReviewPlayers(dossier, selectedMap?.order), [dossier, selectedMap?.order])
  const leaders = selectedMap ? selectedMap.rating?.roleLeaders : dossier.roleLeaders
  const standouts = ['TANK', 'DPS', 'SUPPORT'].map(role => {
    const entry = leaders?.[role]
    return entry ? rows.find(row => row.role === role && row.ratingEntry === entry) : null
  }).filter(Boolean)
  if (!standouts.length) return null
  return <details className={styles.disclosure}><summary>{en ? 'Standouts by role' : uiText("各职责关键表现", uiLocale)}<small>{selectedMap ? (en ? `Map ${selectedMap.order}` : uiText("第 {0} 图", uiLocale, [selectedMap.order])) : (en ? 'Full match' : uiText("全场", uiLocale))}<span aria-hidden="true">＋</span></small></summary><div className={styles.standouts}>{standouts.map(row => {
    const content = <><small>{en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), uiLocale)} / {dossier[`team${row.side}`].short} · {row.maps.length} {en ? 'maps' : uiText("图", uiLocale)}{row.lowSample ? (en ? ' · Low sample' : uiText(" · 低样本", uiLocale)) : ''}</small><div className={styles.standoutName}><strong>{row.displayName}</strong><SignalRating value={row.rating} /></div><span>{(row.ratingEntry.coreStats || []).slice(0, 2).map(stat => `${en ? stat.metricId?.toUpperCase() || stat.label : uiText(stat.label, uiLocale)} ${formatInt(stat.value, '—')}`).join(' · ')}</span></>
    return row.playerId ? <Link key={row.key} to={withSeason(`/players/${encodeURIComponent(row.playerId)}?role=${row.role}`)} state={returnState} onClick={onNavigate}>{content}</Link> : <div key={row.key}>{content}</div>
  })}</div></details>
}

export default function SignalMatchDetail({ dossier, seasonId, locale, t, withSeason, returnState, onNavigate, backLabel, onBack, roomPath, onCopyLink, copyMessage, activeAnchor, onSelectMap, analysisRef, setMapRef, returnTo, returnScrollY, weeklyPeriod, isPreview }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const shellRef = useRef(null)
  const seriesRef = useRef(null)
  const navigationRef = useRef(null)
  const mapIndexRef = useRef(null)
  const playerSearchRef = useRef(null)
  const pendingAnalysisAction = useRef(null)
  const [navigationRequest, setNavigationRequest] = useState(0)
  const [visibleSection, setVisibleSection] = useState('overview')
  useEffect(() => {
    const shell = shellRef.current
    const header = shell?.closest('[data-design]')?.querySelector('header')
    if (!header) return undefined
    const measureHeader = () => {
      const top = Number.parseFloat(window.getComputedStyle(header).top) || 0
      shell.style.setProperty('--coach-header-offset', `${Math.ceil(top + header.getBoundingClientRect().height) + 8}px`)
      if (navigationRef.current) shell.style.setProperty('--coach-navigation-height', `${Math.ceil(navigationRef.current.getBoundingClientRect().height)}px`)
      if (mapIndexRef.current) shell.style.setProperty('--coach-rail-height', `${Math.ceil(mapIndexRef.current.getBoundingClientRect().height)}px`)
    }
    const observer = new ResizeObserver(measureHeader)
    observer.observe(header)
    if (navigationRef.current) observer.observe(navigationRef.current)
    if (mapIndexRef.current) observer.observe(mapIndexRef.current)
    window.addEventListener('resize', measureHeader)
    measureHeader()
    return () => { observer.disconnect(); window.removeEventListener('resize', measureHeader) }
  }, [dossier.internalId, dossier.mapRecords.length])
  const analysisExpanded = searchParams.get('analysis') === '1' || (searchParams.get('analysis') !== '0' && ['pquery', 'prole', 'pside', 'pview', 'compareA', 'compareB'].some(key => searchParams.has(key)))
  const toggleAnalysis = event => {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    next.set('analysis', analysisExpanded ? '0' : '1')
    setSearchParams(next, { replace: true, state: { ...location.state, restoreScrollY: undefined } })
  }
  const openAnalysis = (event, findPlayer = false) => {
    event.preventDefault()
    pendingAnalysisAction.current = { findPlayer }
    setSearchParams(getMatchAnalysisSearch(searchParams, { findPlayer }), { replace: true, state: { ...location.state, restoreScrollY: undefined } })
    setNavigationRequest(value => value + 1)
  }
  useEffect(() => {
    const action = pendingAnalysisAction.current
    if (!action || !analysisExpanded || (action.findPlayer && !playerSearchRef.current)) return undefined
    const frame = window.requestAnimationFrame(() => {
      if (pendingAnalysisAction.current !== action) return
      pendingAnalysisAction.current = null
      const target = action.findPlayer ? playerSearchRef.current?.closest('[data-player-search-target]') : seriesRef.current
      if (action.findPlayer) playerSearchRef.current?.focus({ preventScroll: true })
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [analysisExpanded, navigationRequest, searchParams])
  const selectSection = (event, section) => {
    if (section === 'analysis') return openAnalysis(event)
    event.preventDefault()
    shellRef.current?.querySelector(`[data-match-section="${section}"]`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }
  const scoreParts = dossier.scoreLabel.split(':').map(part => part.trim())
  const allProgress = useMemo(() => getMatchReviewProgress(dossier), [dossier])
  const phase = useMemo(() => getMatchPhasePresentation(dossier, allProgress, locale), [dossier, allProgress, locale])
  const progress = phase.active ? phase.records : allProgress
  const collapsibleOrders = progress.filter(map => map.hasStats).map(map => map.order)
  const collapsedKey = searchParams.get('collapsed') || ''
  const collapsedOrders = new Set(collapsedKey.split(','))
  const setAllMapData = expanded => setSearchParams(getMatchMapDataSearch(searchParams, collapsibleOrders, expanded), { replace: true, state: { ...location.state, restoreScrollY: undefined } })
  const chapterRefs = useRef(new Map())
  const railRef = useRef(null)
  const [visibleOrder, setVisibleOrder] = useState(null)
  const registerMap = useCallback((order, node) => {
    if (node) chapterRefs.current.set(order, node)
    else chapterRefs.current.delete(order)
    setMapRef(order, node)
  }, [setMapRef])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let order = progress[0]?.order
      const firstChapter = chapterRefs.current.get(progress[0]?.order)
      const chapterOffset = firstChapter ? Number.parseFloat(window.getComputedStyle(firstChapter).scrollMarginTop) || 0 : 0
      const activationLine = Math.max(Math.min(window.innerHeight / 3, 240), chapterOffset + 2)
      for (const map of progress) {
        if (chapterRefs.current.get(map.order)?.getBoundingClientRect().top <= activationLine) order = map.order
      }
      setVisibleOrder(order ?? null)
      const sectionLine = (shellRef.current?.querySelector('[data-match-navigation]')?.getBoundingClientRect().bottom || 0) + 24
      let section = 'overview'
      for (const node of shellRef.current?.querySelectorAll('[data-match-section]') || []) {
        if (node.getBoundingClientRect().top <= sectionLine) section = node.dataset.matchSection
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) section = [...(shellRef.current?.querySelectorAll('[data-match-section]') || [])].at(-1)?.dataset.matchSection || 'overview'
      setVisibleSection(section)
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [progress, analysisExpanded, collapsedKey])

  const currentOrder = visibleOrder ?? (typeof activeAnchor === 'number' ? activeAnchor : progress[0]?.order)
  useEffect(() => {
    const rail = railRef.current
    const active = rail?.querySelector('[aria-current="location"]')
    if (!active || rail.scrollWidth <= rail.clientWidth) return
    const offset = active.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft
    rail.scrollTo({ left: offset - (rail.clientWidth - active.clientWidth) / 2, behavior: 'auto' })
  }, [currentOrder])

  const canAnalyze = phase.canAnalyze
  const matchFact = useMemo(() => getScheduleHighlightFact(dossier.match, locale), [dossier.match, locale])
  const summary = !phase.active && dossier.state.canShowResults && !dossier.state.isForfeit && ['comeback', 'decider'].includes(matchFact.kind) ? matchFact.detail : ''
  const hasMissingPlayerStats = progress.some(map => map.hasResult && map.raw?.is_administrative !== true && (!map.teamAStats.length || !map.teamBStats.length))
  const status = phase.active ? phase.statusLabel : dossier.state.isForfeit ? (en ? 'FORFEIT' : uiText("弃权", locale)) : en ? dossier.statusEn : dossier.statusLabel
  const video = dossier.broadcast?.streamLinks.find(stream => stream.kind === 'replay') || dossier.broadcast?.streamLinks.find(stream => stream.kind === 'archive')
  const adjacentState = { returnTo, ...(Number.isFinite(Number(returnScrollY)) ? { returnScrollY } : {}) }

  return <div ref={shellRef} className={styles.shell} data-page-mode="index" data-match-design="signal-coach" data-match-phase={phase.key}>
    <div className={styles.toolbar}><button type="button" onClick={onBack}>← {backLabel}</button><div><button type="button" onClick={onCopyLink}>{en ? 'Copy link' : uiText("复制链接", locale)}</button>{!phase.active && video ? <a className={video.kind === 'replay' ? styles.primaryAction : undefined} href={video.url} target="_blank" rel="noreferrer">{video.kind === 'replay' ? (en ? 'Watch replay' : uiText("观看录像", locale)) : (en ? 'Video archive' : uiText("赛事录像库", locale))} ↗</a> : null}</div></div>
    {copyMessage ? <p className={styles.copyFeedback} role="status">{copyMessage}</p> : null}
    {isPreview ? <p className={styles.phasePreview}>{en ? 'Design preview · fictional fixtures, scores, staff and broadcast links' : uiText("设计样例 · 对阵、比分、工作人员与直播入口均为演示", locale)}</p> : null}
    <nav ref={navigationRef} className={styles.sectionNav} data-match-navigation aria-label={en ? 'Match sections' : uiText("比赛详情章节", locale)}>
      <div className={styles.sectionLinks}>{[
        ['overview', 'match-overview', en ? 'Overview' : uiText("比赛概况", locale)],
        ...(phase.active ? [['resources', 'match-resources', en ? 'Match info' : uiText("比赛安排", locale)]] : []),
        ...(progress.length ? [['maps', 'map-records', en ? 'Maps' : uiText("逐图战报", locale)]] : []),
        ...(canAnalyze ? [['analysis', 'series-analysis', en ? 'Players' : uiText("选手数据", locale)]] : []),
        ...(!phase.active ? [['resources', 'match-resources', en ? 'Replays' : uiText("录像资料", locale)]] : [])
      ].map(([section, id, label]) => <a key={section} href={`#${id}`} aria-current={visibleSection === section ? 'location' : undefined} onClick={event => selectSection(event, section)}>{label}</a>)}</div>
      <div className={styles.navTools}><span className={styles.navMatch} data-visible={visibleSection !== 'overview'} aria-hidden={visibleSection === 'overview'}>{dossier.teamA.short}<b>{dossier.scoreLabel}</b>{dossier.teamB.short}</span>{canAnalyze ? <button type="button" className={styles.findPlayer} onClick={event => openAnalysis(event, true)} aria-label={en ? 'Find a player in this match' : uiText("查找本场选手", locale)} title={en ? 'Find a player in this match' : uiText("查找本场选手", locale)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><span>{en ? 'Find player' : uiText("查找选手", locale)}</span></button> : null}</div>
    </nav>
    <section className={styles.hero} id="match-overview" data-match-section="overview" aria-labelledby="match-dossier-title">
      <div className={styles.cover}>
        <header className={styles.heroMeta}><span>{getScheduleStageLabel(dossier.match.stage, locale)} <b>/</b> {getRoundLabel(dossier, locale)}</span><strong data-live={dossier.state.isLive}>{status}</strong></header>
        <div className={styles.versus}>
          <TeamIdentity team={dossier.teamA} logoTeam={dossier.match.team_a} side="A" seasonId={seasonId} winner={dossier.hasSeriesScore && dossier.winnerSide === 'A'} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} />
          <div className={styles.scoreAxis}><span>{phase.scoreTitle}</span><h1 id="match-dossier-title" aria-label={dossier.title + ' · ' + dossier.scoreLabel}>{scoreParts.length === 2 ? <><span data-winner={dossier.winnerSide === 'A'}>{scoreParts[0]}</span><i>:</i><span data-winner={dossier.winnerSide === 'B'}>{scoreParts[1]}</span></> : 'VS'}</h1><span>{getReviewFormat(dossier.formatLabel, en)}</span></div>
          <TeamIdentity team={dossier.teamB} logoTeam={dossier.match.team_b} side="B" seasonId={seasonId} winner={dossier.hasSeriesScore && dossier.winnerSide === 'B'} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} />
        </div>
        {summary ? <p className={styles.matchSummary} data-match-summary={matchFact.kind}>{summary}</p> : null}
        {phase.active ? <><p className={styles.phaseCaption}>{phase.caption}</p><SignalMatchPhaseProgress phase={phase} onSelectMap={onSelectMap} en={en} /></> : <SeriesProgress maps={progress} currentOrder={currentOrder} onSelectMap={onSelectMap} en={en} />}
        <footer className={styles.heroFooter}><span>{en ? 'SCHEDULE' : uiText("比赛时间", locale)}<strong>{phase.active ? phase.scheduleLabel : dossier.scheduleLabel}</strong>{phase.active ? <small>UTC+8</small> : null}</span>{dossier.totalDurationLabel ? <span>{phase.active ? (en ? 'RECORDED TIME' : uiText("已记录时长", locale)) : (en ? 'IN-GAME TIME' : uiText("局内总时长", locale))}<strong>{dossier.totalDurationLabel}</strong></span> : null}{!phase.active || phase.recordedCount ? <span>{en ? 'MAPS RECORDED' : uiText("地图记录", locale)}<strong>{phase.active ? phase.recordedCount : dossier.mapRecords.length}</strong></span> : null}</footer>
        {!phase.active ? <SignalMatchSpotlight dossier={dossier} locale={locale} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} /> : null}
      </div>
    </section>

    {phase.active ? <SignalMatchPreparation dossier={dossier} phase={phase} weeklyPeriod={weeklyPeriod} locale={locale} withSeason={withSeason} roomPath={roomPath} hasRoster={dossier.rosters.teamA.length + dossier.rosters.teamB.length > 0} roster={<RegisteredRosters dossier={dossier} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} />} /> : null}
    {!phase.active && !canAnalyze && progress.length > 0 ? <div className={styles.emptyReview}><PendingRoster dossier={dossier} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} /></div> : null}
    {progress.length ? <section className={styles.review} id="map-records" data-match-section="maps" ref={analysisRef} aria-labelledby="map-records-title">
      <aside ref={mapIndexRef} className={styles.index}>
        <div className={styles.indexHeading}><span>MAP INDEX</span><strong>{en ? 'Map records' : uiText("逐图战报", locale)}</strong><small>{en ? 'Map scores · Select to jump' : uiText("本图比分 · 点选跳转", locale)}</small></div>
        <nav ref={railRef} className={styles.mapRail} aria-label={en ? 'Map navigation' : uiText("地图导航", locale)}>
          {progress.map(map => <button key={map.key} type="button" aria-current={currentOrder === map.order ? 'location' : undefined} onClick={() => onSelectMap(map.order)} aria-label={(en ? 'View map ' : uiText("查看第 ", locale)) + map.order + (en ? ' · ' : uiText(" 图 · ", locale)) + map.name + ' · ' + (en ? 'Map score ' : uiText("本图 ", locale)) + map.scoreA + ':' + map.scoreB + ' · ' + (en ? 'Series score ' : uiText("大比分 ", locale)) + map.cumulative}>
            <span className={styles.mapNumber}>{map.orderLabel}</span><strong>{map.name}</strong><span className={styles.indexScore}><b><span className={styles.indexMapScore}><small>{en ? 'Map ' : uiText("本图 ", locale)}</small>{map.scoreA} : {map.scoreB}</span><span className={styles.indexSeriesScore}>{map.cumulative.replace(':', ' : ')}</span></b><small>{getMapOutcome(map, locale)}</small></span>
          </button>)}
        </nav>
        {canAnalyze ? <a className={styles.analysisLink} href="#series-analysis" onClick={openAnalysis}>{en ? 'Series statistics' : uiText("全场统计与对比", locale)} ↘</a> : null}
      </aside>
      <div className={styles.chapters}>
        <header className={styles.recordsHeading}><div><h2 id="map-records-title">{en ? 'Map by map' : uiText("逐图战报", locale)}</h2><p>{en ? `${progress.length} map records · Follow the match in order` : uiText("{0} 张地图记录 · 按比赛顺序阅读", locale, [progress.length])}</p></div>{collapsibleOrders.length > 1 ? <div className={styles.mapDataControls} role="group" aria-label={en ? 'All map statistics' : uiText("全部地图数据", locale)}><button type="button" disabled={!collapsibleOrders.some(order => collapsedOrders.has(String(order)))} onClick={() => setAllMapData(true)}>{en ? 'Expand all' : uiText("展开全部", locale)}</button><button type="button" disabled={!collapsibleOrders.some(order => !collapsedOrders.has(String(order)))} onClick={() => setAllMapData(false)}>{en ? 'Collapse stats' : uiText("收起数据", locale)}</button></div> : null}</header>
        {canAnalyze && hasMissingPlayerStats ? <p className={styles.notice} role="status">{en ? 'Player statistics are incomplete. Only published records are shown below.' : uiText("选手统计尚未齐全，以下展示各图已发布的记录。", locale)}</p> : null}
        {progress.map((map, index) => <SignalMapChapter key={dossier.internalId + '-' + map.key} map={map} dossier={dossier} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} setMapRef={registerMap} video={video} previousMap={progress[index - 1]} nextMap={progress[index + 1]} onSelectMap={onSelectMap} activeMatch={phase.active} />)}
      </div>
    </section> : !phase.active ? <section className={styles.emptyReview} ref={analysisRef}><PendingRoster dossier={dossier} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} /></section> : null}

    {canAnalyze ? <details ref={seriesRef} className={styles.seriesAnalysis} id="series-analysis" data-match-section="analysis" open={analysisExpanded}>
      <summary onClick={toggleAnalysis}><span className={styles.sectionTitle}><small>SERIES ANALYSIS</small><strong>{en ? 'Full-match statistics & player comparison' : uiText("全场统计与选手对比", locale)}</strong></span><span className={styles.expandMark} aria-hidden="true">{analysisExpanded ? '−' : '＋'}</span></summary>
      <div className={styles.seriesBody}><div className={styles.analysisWorkspace} data-player-search-target><SignalMatchPlayers dossier={dossier} seasonId={seasonId} locale={locale} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} onSelectMap={onSelectMap} searchInputRef={playerSearchRef} /></div><TeamComparison dossier={dossier} seasonId={seasonId} en={en} /><RoleStandouts dossier={dossier} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} en={en} /></div>
    </details> : null}
    {!phase.active ? <SignalMatchResources dossier={dossier} roomPath={roomPath} en={en} onSelectMap={onSelectMap} /> : null}
    <nav className={styles.footerNav} aria-label={en ? 'More matches' : uiText("其他比赛", locale)}>{['previous', 'next'].map(direction => {
      const match = dossier.adjacent[direction]
      if (!match) return <div key={direction} />
      const teams = getMatchDisplayTeams(match)
      return <Link key={direction} to={withSeason(getMatchPath(match))} state={adjacentState}><span>{direction === 'previous' ? (en ? '← Previous match' : uiText("← 上一场比赛", locale)) : (en ? 'Next match →' : uiText("下一场比赛 →", locale))}</span><strong>{teams.teamA.short} <small>vs</small> {teams.teamB.short}</strong></Link>
    })}<Link className={styles.footerBack} to={returnTo} state={getRestoreScrollState(returnScrollY)}>{backLabel} ↗</Link></nav>
  </div>
}
