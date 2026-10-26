import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getArchiveMapRecords } from './teamArchiveContent.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import { buildSeasonChronicle, getChronicleChapterLabel, getSeasonStoryChapters } from './teamSeasonChronicle.js'
import { TEAM_SEASON_ANCHOR } from './teamArchiveRoutes.js'
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

function ChronicleChapter({ chapter, context, advanceState, runs = true }) {
  const { en, locale, team, seasonId, selectedId } = context
  const grouped = chapter.kind === 'opening' && chapter.records.length > 1
  const rematch = chapter.kind === 'return' && chapter.previous
  const final = chapter.kind === 'champion' || chapter.kind === 'latest'
  return <>
    {runs ? <CompactRun rows={chapter.before} context={context} label={en ? 'Along the way' : uiText("沿途的比赛", locale)} /> : null}
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

// 票 2.42: the 展厅's "这一季" — the season told in a few chapters. The complete ledger is the
// 数据 page's "赛程赛果"; this section links there instead of repeating it.
export default function TeamSeasonChronicle({ team, seasonId, locale, rows, advanceState, matchId, onMatchChange, ledgerHref, viewState, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const chronicle = useMemo(() => buildSeasonChronicle(rows, advanceState, locale), [rows, advanceState, locale])
  const story = useMemo(() => getSeasonStoryChapters(chronicle, locale), [chronicle, locale])
  const select = id => onMatchChange(id === matchId ? null : id)
  const context = { en, team, seasonId, locale, selectedId: matchId, select, withSeason, returnState, onLeave }
  const t = (zh, english, ko, tw) => pickUiLocale(locale, zh, english, ko, tw)
  const intro = story.mode === 'chapters'
    ? t('首场、转折与最近的比赛，按时间读这一季。', 'The first match, the turns and the latest result, in order.', '첫 경기와 전환점, 최근 경기까지 순서대로 읽는 이번 시즌.', '首場、轉折與最近的比賽，按時間讀這一季。')
    : story.mode === 'first'
      ? t('比赛还不多，先从首场看起。', 'Only a few matches so far — it starts with the first one.', '아직 경기가 많지 않아 첫 경기부터 소개합니다.', '比賽還不多，先從首場看起。')
      : advanceState.isArchived
        ? t('本季没有实际交手记录。', 'No played matches on record this season.', '이번 시즌에는 실제 경기 기록이 없습니다.', '本季沒有實際交手記錄。')
        : t('第一场比赛结束后，这里会写下开篇。', 'The story starts after the first completed match.', '첫 경기가 끝나면 이곳에 이야기가 시작됩니다.', '第一場比賽結束後，這裡會寫下開篇。')
  return <section id={TEAM_SEASON_ANCHOR} className={styles.season} data-season-story={story.mode} tabIndex={-1} aria-labelledby="team-season-title">
    <header className={styles.seasonHeading}>
      <div><h2 id="team-season-title">{t('这一季', 'This season', '이번 시즌', '這一季')}</h2><p>{intro}</p></div>
      {chronicle.rows.length ? <Link to={ledgerHref} state={viewState}>{t(`全部 ${chronicle.rows.length} 条赛程赛果`, `All ${chronicle.rows.length} schedule entries`, `일정과 결과 ${chronicle.rows.length}건 모두 보기`, `全部 ${chronicle.rows.length} 條賽程賽果`)} <span aria-hidden="true">↗</span></Link> : null}
    </header>
    {story.chapters.length ? <div className={styles.storyChapters}>{story.chapters.map(chapter => <ChronicleChapter key={chapter.id} chapter={chapter} context={context} advanceState={advanceState} runs={false} />)}</div> : null}
    {story.mode === 'chapters' ? <TeamSeasonRecords rows={chronicle.rows} archived={advanceState.isArchived} locale={locale} withSeason={withSeason} returnState={returnState} onLeave={onLeave} /> : null}
  </section>
}
