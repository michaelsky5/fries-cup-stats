import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMatchReminders } from './reminderApi.js'
import { reminderCopy, reminderTime } from './reminderCopy.js'
import styles from './MatchReminders.module.css'

export default function MatchReminderSummary({ userId, locale, withSeason }) {
  const copy = reminderCopy(locale)
  const [state, setState] = useState({ userId, loading: true })
  useEffect(() => {
    const controller = new AbortController()
    fetchMatchReminders(controller.signal).then(data => {
      if (controller.signal.aborted) return
      if (data.userId !== userId || !data.preference) throw new Error('INVALID_REMINDER_RESPONSE')
      setState({ userId, data })
    }).catch(() => { if (!controller.signal.aborted) setState({ userId, error: true }) })
    return () => controller.abort()
  }, [userId])
  const current = state.userId === userId ? state : { loading: true }
  const enabled = current.data?.preference?.emailEnabled && current.data?.emailVerified
  return <aside className={styles.summary} aria-label={copy.title} data-i18n-ignore>
    <div><span className={styles.eyebrow}>MATCH REMINDERS</span><strong>{current.loading ? copy.loading : current.error ? copy.loadFailed : !current.data?.available ? copy.unavailable : enabled ? copy.on : copy.off}</strong></div>
    <Link to={withSeason('/account#reminders')}>{current.data?.available && !enabled ? copy.enable : copy.manage} <span aria-hidden="true">→</span></Link>
  </aside>
}

export function MatchCountdown({ match, now, locale }) {
  const copy = reminderCopy(locale)
  const start = Date.parse(match?.scheduledAt)
  if (!Number.isFinite(start) || ['COMPLETE', 'LOCKED', 'CANCELLED'].includes(match.status)) return null
  const minutes = Math.max(0, Math.ceil((start - Number(now)) / 60000))
  const label = minutes >= 60 ? Math.floor(minutes / 60) + ' ' + copy.hours + ' ' + minutes % 60 + ' ' + copy.minutes : minutes + ' ' + copy.minutes
  return <div className={styles.countdown} data-soon={minutes <= 60} data-i18n-ignore>
    <strong>{minutes ? copy.next + ' ' + label : copy.live}</strong>
    {match.roomAccess?.opensAt && <span>{copy.openAt} {reminderTime(match.roomAccess.opensAt, locale)} · UTC+8</span>}
  </div>
}
