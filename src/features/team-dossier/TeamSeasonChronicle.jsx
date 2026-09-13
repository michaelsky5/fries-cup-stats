import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getArchiveMapRecords } from './teamArchiveContent.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import { buildSeasonChronicle, getChronicleChapterLabel } from './teamSeasonChronicle.js'
import { calendarDate } from './teamSeasonCalendar.js'
import TeamSeasonRecords from './TeamSeasonRecords.jsx'
import styles from './TeamSeasonChronicle.module.css'

const shortDate = date => date.date ? date.date.slice(5).replace('-', '.') : '—'

function MatchEvidence({ row, locale, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const maps = getArchiveMapRecords([row], locale)
  return <div className={styles.evidence} id="team-season-route" tabIndex={-1} data-chronicle-evidence={row.match.match_id}>
    <header><h3>{en ? 'Inside this match' : uiText("这一场，逐图回看", locale)}</h3><Link to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)} state={returnState} onClick={onLeave}>{en ? 'Match details' : uiText("进入比赛详情", locale)} ↗</Link></header>
    {maps.length ? <><p>{en ? 'Team scores are shown on the left.' : uiText("本队比分在左。", locale)}</p><ol>{maps.map(map => <li key={map.mapIndex}><Link to={withSeason(getDossierMapMatchPath(map))} state={returnState} onClick={onLeave}><small>{String(map.mapOrder).padStart(2, '0')}</small><b>{map.mapName}</b><strong>{map.mapScore}</strong><span>{map.mapOutcome === 'win' ? (en ? 'W' : uiText("胜", locale)) : map.mapOutcome === 'loss' ? (en ? 'L' : uiText("负", locale)) : (en ? 'D' : uiText("平", locale))} ↗</span></Link></li>)}</ol></> : <p>{row.bye ? (en ? 'A bye, without a played match.' : uiText("本次为轮空，没有实际交手。", locale)) : row.administrative ? (en ? 'An administrative result, without played-map evidence.' : uiText("本场为判罚结果，不作为实际交手的地图证据。", locale)) : (en ? 'Map records have not been published.' : uiText("逐图记录暂未发布。", locale))}</p>}
  </div>
}

function MatchTicket({ row, previous = false, context }) {
  const { en, locale, team, seasonId, selectedId, select, withSeason, returnState, onLeave } = context
  const date = calendarDate(row, locale)
  const content = <>
    <span className={styles.ticketDate}><time dateTime={date.date || undefined}>{date.date || (en ? 'Date unrecorded' : uiText("日期未记录", locale))}</time><span>{previous ? (en ? 'PREVIOUS MEETING' : uiText("上一次交手", locale)) : row.roundLabel}</span></span>
    <span className={styles.ticketTeams}><span>{team.shortName} <small>{en ? 'vs' : uiText("对阵", locale)}</small></span><TeamLogo team={row.opponent} seasonId={seasonId} className={styles.teamLogo} /><b>{row.opponentLabel}</b></span>
    <strong className={styles.ticketScore}>{row.scoreLabel}</strong>
    <span className={styles.ticketAction}>{previous ? (en ? 'Revisit that match' : uiText("回看上次交手", locale)) : selectedId === row.match.match_id ? (en ? 'Close map records' : uiText("收起逐图记录", locale)) : (en ? 'Open map records' : uiText("展开逐图记录", locale))}<i aria-hidden="true">{previous ? '↗' : selectedId === row.match.match_id ? '−' : '+'}</i></span>
  </>
  return previous ? <Link className={styles.ticket} data-previous to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)} state={returnState} onClick={onLeave}>{content}</Link> : <button type="button" className={styles.ticket} onClick={() => select(row.match.match_id)} aria-expanded={selectedId === row.match.match_id} aria-controls={selectedId === row.match.match_id ? 'team-season-route' : undefined} data-chronicle-record={row.match.match_id}>{content}</button>
}

function CompactRun({ rows, context, label }) {
  if (!rows.length) return null
  const { en, locale, selectedId, select } = context
  return <div className={styles.run}>
    {label ? <p className={styles.runLabel}>{label}</p> : null}
    <ol>{rows.map(row => <li key={row.match.match_id}>
      <button type="button" onClick={() => select(row.match.match_id)} aria-expanded={selectedId === row.match.match_id} aria-controls={selectedId === row.match.match_id ? 'team-season-route' : undefined} data-chronicle-record={row.match.match_id}>
        <time>{shortDate(calendarDate(row, locale))}</time><span><b>{row.opponentLabel || (en ? 'TBA' : uiText("待定", locale))}</b><small>{row.roundLabel}</small></span><strong>{row.bye ? '—' : row.scoreLabel}</strong><span className={styles.runResult}>{row.bye ? (en ? 'BYE' : uiText("轮空", locale)) : row.administrative ? (en ? 'ADMIN' : uiText("判罚", locale)) : row.label}</span><i aria-hidden="true">{selectedId === row.match.match_id ? '−' : '+'}</i>
      </button>
      {selectedId === row.match.match_id ? <MatchEvidence row={row} {...context} /> : null}
    </li>)}</ol>
  </div>
}

function ChronicleChapter({ chapter, context, advanceState }) {
  const { en, locale, team, seasonId, selectedId } = context
  const grouped = chapter.kind === 'opening' && chapter.records.length > 1
  const rematch = chapter.kind === 'return' && chapter.previous
  const final = chapter.kind === 'champion' || chapter.kind === 'latest'
  return <>
    <CompactRun rows={chapter.before} context={context} label={en ? 'Along the way' : uiText("沿途的比赛", locale)} />
    <section id={`journey-chapter-${chapter.id}`} className={styles.chapter} data-kind={chapter.kind} data-chronicle-chapter={chapter.id} tabIndex={-1}>
      <header className={styles.chapterMast}><span><b>{chapter.number}</b> {getChronicleChapterLabel(chapter.kind, locale)}</span><span>{shortDate(chapter.firstDate)}{chapter.firstDate.date !== chapter.date.date ? ` — ${shortDate(chapter.date)}` : ''}</span></header>
      <div className={styles.chapterComposition}>
        <div className={styles.reading}>
          <h2>{chapter.title}</h2><p>{chapter.reading}</p>
          {grouped ? <div className={styles.openingRecord}><strong>{String(chapter.summary.wins).padStart(2, '0')}</strong><span>{en ? 'SERIES WINS' : uiText("场胜利", locale)}<small>{chapter.summary.losses} {en ? 'losses' : uiText("负", locale)}{chapter.summary.draws ? ` · ${chapter.summary.draws} ${en ? 'draws' : uiText("平", locale)}` : ''} / {chapter.records.length} {en ? 'played series' : uiText("场交手", locale)}</small></span></div> : null}
          {chapter.kind === 'setback' ? <div className={styles.turnMark} aria-hidden="true"><svg viewBox="0 0 240 75"><path d="M0 8H100Q120 8 120 28V48Q120 68 140 68H231" /><path d="m217 55 14 13-14 13" /></svg></div> : null}
          {final ? <div className={styles.finishSeal}><TeamLogo team={team} seasonId={seasonId} className={styles.teamLogo} /><span>{advanceState.heading}<b>{advanceState.label}</b></span></div> : null}
        </div>
        {grouped ? <CompactRun rows={chapter.entries} context={context} /> : rematch ? <div className={styles.rematch}><MatchTicket row={chapter.previous} previous context={context} /><div className={styles.between}><span>{chapter.elapsedDays > 0 ? (en ? `${chapter.elapsedDays} DAYS LATER` : uiText("{0} 天后", locale, [chapter.elapsedDays])) : (en ? 'MEET AGAIN' : uiText("再次交手", locale))}</span><b aria-hidden="true">→</b></div><MatchTicket row={chapter.row} context={context} /></div> : <MatchTicket row={chapter.row} context={context} />}
      </div>
      {!grouped && selectedId === chapter.id ? <MatchEvidence row={chapter.row} {...context} /> : null}
      {chapter.note && !rematch ? <p className={styles.chapterNote}>{chapter.note}</p> : null}
    </section>
  </>
}

export default function TeamSeasonChronicle({ team, seasonId, locale, rows, summary, advanceState, matchId, journalMatchId, onMatchChange, recordsMode, onViewChange, withSeason, returnState, onLeave, restoreScroll }) {
  const en = locale === 'en-US'
  const chronicle = useMemo(() => buildSeasonChronicle(rows, advanceState, locale), [rows, advanceState, locale])
  const rootRef = useRef(null)
  const [active, setActive] = useState(null)
  const initialMatch = useRef(matchId || journalMatchId)
  const selectedId = matchId || journalMatchId
  const storyTitle = !chronicle.played.length && advanceState.isArchived ? (en ? 'A place in\nthe archive.' : uiText("这一季，\n名字在这里。", locale)) : chronicle.story.title
  const select = id => onMatchChange(id === selectedId ? null : id)
  const context = { en, team, seasonId, locale, selectedId, select, withSeason, returnState, onLeave }
  useEffect(() => {
    if (recordsMode) return undefined
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.dataset.chronicleChapter)
    }, { rootMargin: '-25% 0px -50% 0px' })
    rootRef.current.querySelectorAll('[data-chronicle-chapter]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [chronicle, recordsMode])
  useEffect(() => {
    if (!initialMatch.current || recordsMode || restoreScroll != null) return undefined
    const frame = requestAnimationFrame(() => {
      const target = rootRef.current.querySelector('[data-chronicle-evidence]')
      if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start', behavior: 'instant' }); initialMatch.current = null }
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedId, recordsMode, restoreScroll])

  return <div ref={rootRef} className={styles.chronicle} data-season-chronicle>
    <header className={styles.cover} data-journey-cover data-records-mode={recordsMode}>
      <div className={styles.coverMast}><span>{team.shortName} / {seasonId}</span><span>02 / {en ? 'SEASON JOURNEY' : uiText("赛季征程", locale)}</span></div>
      <div className={styles.coverComposition}><div><span className={styles.eyebrow}>{recordsMode ? 'THE MATCH LEDGER' : 'A SEASON, IN CHAPTERS'}</span><h1>{recordsMode ? (en ? 'Every match.\nOn record.' : uiText("逐场，\n回到现场。", locale)) : storyTitle}</h1><p>{recordsMode ? (en ? 'Filter by stage or result. Open a match to inspect its record.' : uiText("按阶段或赛果检索，进入比赛查看完整记录。", locale)) : (en ? 'Follow the meetings that shaped this season. Every chapter leads back to a match.' : uiText("沿着比赛留下的转折，重走这一季。每一章，都能回到现场。", locale))}</p></div>
        {!recordsMode && chronicle.chapters.length ? <nav className={styles.coverRoute} aria-label={en ? 'Season chapters' : uiText("赛季章节", locale)}><span>{en ? 'FOLLOW THEIR ROUTE' : uiText("沿着这条路", locale)}</span>{chronicle.chapters.map(chapter => <a key={chapter.id} href={`#journey-chapter-${chapter.id}`}><small>{chapter.number}</small><b>{getChronicleChapterLabel(chapter.kind, locale)}</b><time>{shortDate(chapter.firstDate)}{chapter.firstDate.date !== chapter.date.date ? `–${shortDate(chapter.date)}` : ''} </time><i aria-hidden="true">↘</i></a>)}<p>{chronicle.played.length} {en ? 'played series' : uiText("场实际交手", locale)}<span>{summary.administrative} {en ? 'admin' : uiText("场判罚", locale)} · {summary.byes} {en ? 'byes' : uiText("次轮空", locale)}</span></p></nav> : null}
      </div>
      <div className={styles.viewSwitch} role="group" aria-label={en ? 'Journey reading mode' : uiText("征程阅读方式", locale)}><button type="button" aria-pressed={!recordsMode} onClick={() => onViewChange(false)}>{en ? 'Season chronicle' : uiText("赛季纪事", locale)}<span>↗</span></button><button type="button" aria-pressed={recordsMode} onClick={() => onViewChange(true)}>{en ? 'All match records' : uiText("全部比赛记录", locale)}<small>{chronicle.rows.length}</small><span>↗</span></button></div>
    </header>
    {!recordsMode ? <div className={styles.body} data-empty={!chronicle.chapters.length}>
      {chronicle.chapters.length ? <nav className={styles.rail} aria-label={en ? 'Chapter navigation' : uiText("章节导航", locale)}>{chronicle.chapters.map(chapter => <a key={chapter.id} href={`#journey-chapter-${chapter.id}`} aria-current={(active || chronicle.chapters[0].id) === chapter.id ? 'step' : undefined}><b>{chapter.number}</b><span>{getChronicleChapterLabel(chapter.kind, locale)}</span></a>)}</nav> : null}
      <div className={styles.pages}>{chronicle.chapters.map(chapter => <ChronicleChapter key={chapter.id} chapter={chapter} context={context} advanceState={advanceState} />)}<CompactRun rows={chronicle.tail} context={context} label={chronicle.chapters.length ? (en ? 'Also on the season record' : uiText("赛季里，还有这些记录", locale)) : (en ? 'The schedule so far' : uiText("已发布的赛程", locale))} />
        {!chronicle.played.length ? <div className={styles.empty}><span>{advanceState.heading} / {advanceState.label}</span><h2>{advanceState.isArchived ? (en ? 'No played results on record.' : uiText("本季暂无实际交手记录。", locale)) : (en ? 'The first chapter is still ahead.' : uiText("第一章，还在前方。", locale))}</h2><p>{advanceState.isArchived ? (en ? 'Published fixtures, byes and administrative results remain available in all match records.' : uiText("已发布的赛程、轮空和判罚结果仍保留在全部比赛记录中。", locale)) : (en ? 'Chapters begin with published, played results. The available schedule remains accessible above and in all match records.' : uiText("有实际交手的赛果发布后，这里会写下开篇。已发布的赛程仍可在上方及全部比赛记录中查阅。", locale))}</p></div> : null}
        <TeamSeasonRecords rows={chronicle.rows} archived={advanceState.isArchived} locale={locale} withSeason={withSeason} returnState={returnState} onLeave={onLeave} />
        <footer className={styles.end}><span>{en ? 'Every date has its record.' : uiText("每一段经历，都有记录可循。", locale)}</span><button type="button" onClick={() => onViewChange(true)}>{en ? 'Search all matches' : uiText("检索全部比赛", locale)} ↗</button></footer>
      </div>
    </div> : null}
  </div>
}
