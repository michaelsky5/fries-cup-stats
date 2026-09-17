import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { buildSeasonCalendar } from './teamSeasonCalendar.js'
import { getArchiveMapRecords, getArchiveMatchReading } from './teamArchiveContent.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import styles from './TeamSeasonCalendar.module.css'

function CalendarMatchDetail({ entry, rows, team, locale, withSeason, returnState, onLeave, onClose }) {
  const en = locale === 'en-US'
  const { row, milestone } = entry
  const maps = getArchiveMapRecords([row], locale)
  return (
    <div className={styles.dayDetail} id={`calendar-detail-${row.match.match_id}`} tabIndex={-1}>
      <div className={styles.detailTools}>
        <b>
          {entry.date.date || (en ? 'No date recorded' : uiText("日期未记录", locale))} · {team.shortName} /{' '}
          {row.opponentLabel}
        </b>
        <button type="button" onClick={onClose}>
          {en ? 'Close day' : uiText("收起当天记录", locale)} −
        </button>
      </div>
      <div className={styles.reading}>
        <span>{en ? 'ON THIS DAY' : uiText("这一天，留在记录里", locale)}</span>
        <h3>{milestone?.title || row.roundLabel}</h3>
        <p>{milestone?.reading || getArchiveMatchReading(row, rows, locale)}</p>
        {milestone?.note ? <small>{milestone.note}</small> : null}
        <Link
          to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)}
          state={returnState}
          onClick={onLeave}
        >
          {en ? 'Open full match' : uiText("进入比赛详情", locale)} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className={styles.mapRecords}>
        <header>
          <b>{en ? 'THE MATCH, MAP BY MAP' : uiText("把这场比赛，逐图翻开", locale)}</b>
          <span>
            {team.shortName} {en ? 'on the left' : uiText("比分在左", locale)}
          </span>
        </header>
        {maps.length ? (
          <div>
            {maps.map((map) => (
              <Link
                key={map.mapIndex}
                to={withSeason(getDossierMapMatchPath(map))}
                state={returnState}
                onClick={onLeave}
              >
                <span>
                  <small>
                    {en ? 'MAP' : uiText("第", locale)} {map.mapOrder}
                    {en ? '' : uiText(" 图", locale)}
                  </small>
                  <b>{map.mapName}</b>
                </span>
                <strong>{map.mapScore}</strong>
                <span>
                  {map.mapOutcome === 'win'
                    ? en
                      ? 'W'
                      : uiText("胜", locale)
                    : map.mapOutcome === 'loss'
                      ? en
                        ? 'L'
                        : uiText("负", locale)
                      : en
                        ? 'D'
                        : uiText("平", locale)}{' '}
                  <i aria-hidden="true">→</i>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p>
            {row.bye
              ? en
                ? 'A bye was recorded. There was no played map.'
                : uiText("本次记录为轮空，没有实际交手地图。", locale)
              : row.administrative
                ? en
                  ? 'An administrative result, without played-map evidence.'
                  : uiText("本场为判罚结果，不作为实际交手的地图证据。", locale)
                : en
                  ? 'Map records have not been published.'
                  : uiText("逐图记录暂未发布。", locale)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function TeamSeasonCalendar({
  team,
  seasonId,
  locale,
  rows,
  summary,
  advanceState,
  matchId,
  onMatchChange,
  journalMatchId,
  onOpenLedger,
  withSeason,
  returnState,
  onLeave
}) {
  const en = locale === 'en-US'
  const calendar = useMemo(
    () => buildSeasonCalendar(rows, advanceState, locale),
    [rows, advanceState, locale]
  )
  const dated = calendar.entries.filter((entry) => entry.date.date)
  const played = rows.filter((row) => row.decided && !row.bye && !row.administrative)
  const selectedId = matchId || journalMatchId
  const openRequested = useRef(false)
  useEffect(() => {
    if (!openRequested.current || !selectedId) return
    openRequested.current = false
    const target = document.getElementById('calendar-detail-' + selectedId)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [selectedId])
  const select = (id) => {
    openRequested.current = selectedId !== id
    onMatchChange(selectedId === id ? null : id)
  }
  const close = (id) => {
    onMatchChange(null)
    const card = document.getElementById('calendar-card-' + id)
    card?.querySelector('button')?.focus({ preventScroll: true })
    card?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  return (
    <div className={styles.calendar} data-season-calendar>
      <header className={styles.cover} data-journey-cover>
        <div className={styles.mast}>
          <span>02 / {en ? 'SEASON JOURNEY' : uiText("赛季征程", locale)}</span>
          <span>
            {team.shortName} <i>/</i> {seasonId}
          </span>
        </div>
        <div className={styles.coverGrid}>
          <div>
            <span className={styles.kicker}>
              {en ? 'A DATE. A MATCH. A MEMORY.' : uiText("一个日期，一场比赛，一段经历。", locale)}
            </span>
            <h1>
              {team.shortName}
              <br />
              {en ? 'The season, day by day.' : uiText("这一季，一天一天。", locale)}
            </h1>
            <p>
              {en
                ? 'Revisit every meeting, from the opening date to the latest record. Open a date card to see what happened.'
                : uiText("从第一次交手，到最近一份记录。翻开日期卡，重看那一天发生的比赛。", locale)}
            </p>
          </div>
          <aside className={styles.datebook}>
            <span>{en ? 'DATES ON RECORD' : uiText("留在记录中的日子", locale)}</span>
            <div>
              <time>{dated[0]?.date.date?.slice(5).replace('-', '.') || '—'}</time>
              <i aria-hidden="true">↓</i>
              <time>{dated.at(-1)?.date.date?.slice(5).replace('-', '.') || '—'}</time>
            </div>
            <p>
              {advanceState.heading}
              <b>{advanceState.label}</b>
            </p>
          </aside>
        </div>
        <div className={styles.coverFoot}>
          <span>
            <b>{played.length}</b> {en ? 'played series' : uiText("场实际交手", locale)} <i>/</i> {summary.administrative}{' '}
            {en ? 'administrative' : uiText("场判罚", locale)} <i>/</i> {summary.byes} {en ? 'byes' : uiText("次轮空", locale)}
          </span>
          <button type="button" onClick={onOpenLedger}>
            {en ? 'Search match records' : uiText("检索完整记录", locale)} <span aria-hidden="true">↓</span>
          </button>
        </div>
      </header>
      {calendar.entries.length ? (
        <>
          <nav className={styles.monthNav} aria-label={en ? 'Jump to a month' : uiText("跳转到月份", locale)}>
            <span>{en ? 'TURN TO' : uiText("翻到", locale)}</span>
            {calendar.months.map((month) => (
              <a href={`#calendar-month-${month.key}`} key={month.key}>
                {month.month === '—'
                  ? en
                    ? 'Undated'
                    : uiText("日期未记录", locale)
                  : en
                    ? `${month.month} / ${month.key.slice(0, 4)}`
                    : uiText("{0} 月", locale, [month.month])}{' '}
                <small>
                  {month.entries.length} {en ? 'records' : uiText("场", locale)}
                </small>
                <span aria-hidden="true">↓</span>
              </a>
            ))}
          </nav>
          {calendar.months.map((month) => (
            <section
              className={styles.month}
              id={`calendar-month-${month.key}`}
              key={month.key}
              aria-label={month.key}
            >
              <header className={styles.monthHeading}>
                <div>
                  <strong>{month.month}</strong>
                  <span>
                    {month.month === '—'
                      ? en
                        ? 'NO DATE RECORDED'
                        : uiText("日期未记录", locale)
                      : en
                        ? month.key.slice(0, 4)
                        : uiText("月", locale)}
                    <small>
                      {month.entries.length} {en ? 'records' : uiText("份比赛记录", locale)}
                    </small>
                  </span>
                </div>
                {month.gap >= 7 ? (
                  <p>
                    {en
                      ? `${month.gap} days after the previous recorded date.`
                      : uiText("距离上一份日期记录，相隔 {0} 天。", locale, [month.gap])}
                  </p>
                ) : null}
              </header>
              <div className={styles.days}>
                {month.entries.map((entry, index) => {
                  const { row, date, milestone } = entry
                  const open = selectedId === row.match.match_id
                  const status = row.bye
                    ? en
                      ? 'BYE'
                      : uiText("轮空", locale)
                    : row.administrative
                      ? en
                        ? 'ADMIN'
                        : uiText("判罚", locale)
                      : row.label
                  return (
                    <article
                      id={`calendar-card-${row.match.match_id}`}
                      className={styles.dayCard}
                      key={row.match.match_id}
                      data-kind={milestone?.kind}
                      data-selected={open}
                      style={{ '--calendar-card-index': index }}
                    >
                      <button
                        type="button"
                        className={styles.dayButton}
                        onClick={() => select(row.match.match_id)}
                        aria-expanded={open}
                        aria-controls={open ? `calendar-detail-${row.match.match_id}` : undefined}
                        aria-label={`${date.date || (en ? 'No date recorded' : uiText("日期未记录", locale))} · ${row.opponentLabel} · ${row.scoreLabel} · ${open ? (en ? 'Close day' : uiText("收起当天记录", locale)) : en ? 'Open day' : uiText("展开当天记录", locale)}`}
                      >
                        <span className={styles.dateLine}>
                          <time dateTime={date.date || undefined}>
                            <strong>{date.day}</strong>
                            <span>
                              {date.weekday}
                              <small>{date.time}</small>
                            </span>
                          </time>
                          <span
                            className={styles.resultStamp}
                            data-tone={row.administrative ? 'administrative' : row.tone}
                          >
                            {status}
                          </span>
                        </span>
                        <span className={styles.cardRound}>{row.roundLabel}</span>
                        <span className={styles.opponent}>
                          <TeamLogo team={row.opponent} seasonId={seasonId} />
                          <span>
                            <small>{en ? 'vs' : uiText("对阵", locale)}</small>
                            <b>{row.opponentLabel || (en ? 'To be confirmed' : uiText("待定", locale))}</b>
                          </span>
                          <strong>{row.bye ? '—' : row.scoreLabel}</strong>
                        </span>
                        <span className={styles.memory}>
                          {milestone?.title ||
                            (row.bye
                              ? en
                                ? 'A bye along the way.'
                                : uiText("赛程中的一次轮空。", locale)
                              : row.administrative
                                ? en
                                  ? 'An administrative entry.'
                                  : uiText("留在赛程里的判罚记录。", locale)
                                : `${team.shortName} / ${en ? 'MATCH RECORD' : uiText("比赛留档", locale)}`)}
                        </span>
                        <span className={styles.cardAction}>
                          {open ? (en ? 'Close day' : uiText("收起当天记录", locale)) : en ? 'Open day' : uiText("展开当天记录", locale)}
                          <i aria-hidden="true">{open ? '−' : '+'}</i>
                        </span>
                      </button>
                    </article>
                  )
                })}
              </div>
              {month.entries.some((entry) => entry.row.match.match_id === selectedId) ? (
                <div id="team-season-route" className={styles.detailAnchor}>
                  <CalendarMatchDetail
                    entry={month.entries.find((entry) => entry.row.match.match_id === selectedId)}
                    rows={rows}
                    team={team}
                    locale={locale}
                    withSeason={withSeason}
                    returnState={returnState}
                    onLeave={onLeave}
                    onClose={() => close(selectedId)}
                  />
                </div>
              ) : null}
            </section>
          ))}
        </>
      ) : (
        <p className={styles.empty}>
          {en
            ? 'The first published fixture will begin this calendar.'
            : uiText("第一场赛程发布后，这本日历将在这里写下开篇。", locale)}
        </p>
      )}
      <div className={styles.calendarEnd}>
        <span>{en ? 'THE RECORD CONTINUES IN EVERY MATCH.' : uiText("这些日子，都能回到一场比赛。", locale)}</span>
        <button type="button" onClick={onOpenLedger}>
          {en ? 'Filter the full record' : uiText("筛选全部比赛", locale)} <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  )
}
