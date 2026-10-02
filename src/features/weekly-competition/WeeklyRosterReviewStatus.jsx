import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { rosterReviewPresentation, rosterReviewIssueLabels } from './rosterReviewPresentation.js'
import styles from '../account-ui/SignalWeeklyTeam.module.css'

export default function WeeklyRosterReviewStatus({ roster, dirty, automatic, players = [], deadline }) {
  const locale = useUiLocale()
  const state = rosterReviewPresentation(roster, { dirty, automatic })
  const deadlineAt = Date.parse(deadline || '')
  return <div role="status" className={styles.rosterReviewStatus} data-status={state.status}>
    <strong>{uiText(state.title, locale)}</strong><p>{uiText(state.detail, locale)}</p>
    {Number.isFinite(deadlineAt) && roster?.status !== 'LOCKED' && <p>{uiText('名单截止', locale)} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(deadlineAt)} (UTC+8)</p>}
    {state.issues.length > 0 && <ul>{state.issues.map((issue, index) => {
      const names = (issue.playerIds || []).map(id => players.find(player => player.id === id)?.nickname || players.find(player => player.id === id)?.displayName).filter(Boolean)
      return <li key={`${issue.code}:${index}`}>{names.length > 0 && <b>{[...new Set(names)].join(' / ')} · </b>}{uiText(rosterReviewIssueLabels[issue.code] || '名单需要管理员进一步核对。', locale)}</li>
    })}</ul>}
  </div>
}
