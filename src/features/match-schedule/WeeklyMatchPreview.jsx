import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { eventCenterText } from '../../lib/eventCenterCopy.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { showsInlineTimeZone, weeklyFormatLabel, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle } from '../weekly-overview/weeklyPresentation.js'
import { getWeeklyScheduleScore } from './weeklyScheduleModel.js'
import WeeklyMatchMaps from './WeeklyMatchMaps.jsx'
import styles from './SignalWeeklySchedule.module.css'

export default function WeeklyMatchPreview({ id, match, week, locale, seasonId, withSeason, returnProps }) {
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : uiText(zh, locale)
  if (!match) return <aside className={styles.preview} id={id} aria-label={eventCenterText('matchPreview', locale)}>
    <header className={styles.previewHeader}>{eventCenterText('matchPreview', locale)}</header>
    <div className={styles.previewEmpty}><h3>{eventCenterText('matchPreviewEmpty', locale)}</h3><p>{eventCenterText('matchPreviewEmptyIntro', locale)}</p></div>
  </aside>

  const schedule = formatMatchSchedule(match, { locale, includeWeekday: true })
  const hint = match.state === 'ruling' ? t('按赛事判定', 'Event ruling applies')
    : match.state === 'review' ? t('结果待审核', 'Result under review')
      : match.state === 'postponed' ? t('新时间以公布为准', 'Awaiting the revised schedule') : ''
  return <aside className={styles.preview} id={id} data-schedule-preview={match.id} aria-label={`${eventCenterText('selectedMatch', locale)} ${weeklyTeamShort(match.team_a)} / ${weeklyTeamShort(match.team_b)}`}>
    <header className={styles.previewHeader}>
      <span>{weeklyWeekTitle(week, locale)} · {weeklyFormatLabel(match, locale)}</span>
      <span className={styles.state} data-state={match.state}><i aria-hidden="true" />{weeklyStatusLabel(match.state, locale)}</span>
    </header>
    <div className={styles.previewSummary}>
      <time>{schedule.hasSchedule ? schedule.label : t('时间待定', 'Time TBD')}{schedule.hasSchedule && showsInlineTimeZone(locale) && <span>UTC+8</span>}</time>
      <div className={styles.previewDuel}>
        <div className={styles.previewTeam}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.previewLogo} /><b>{weeklyTeamShort(match.team_a)}</b></div>
        <strong className={styles.previewScore}>{getWeeklyScheduleScore(match)}</strong>
        <div className={styles.previewTeam}><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.previewLogo} /><b>{weeklyTeamShort(match.team_b)}</b></div>
      </div>
      {hint && <p className={styles.previewHint}>{hint}</p>}
    </div>
    <div className={styles.previewMaps} key={match.id}><WeeklyMatchMaps match={match} locale={locale} withSeason={withSeason} returnProps={returnProps} preview /></div>
    <Link className={styles.previewDetails} to={withSeason(`/matches/${encodeURIComponent(match.id)}`)} {...returnProps}>{eventCenterText('matchDetails', locale)}<span aria-hidden="true">→</span></Link>
  </aside>
}
