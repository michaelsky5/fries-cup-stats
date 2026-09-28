import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { fetchMatchReminders, saveMatchReminders, sendReminderTest } from './reminderApi.js'
import { reminderCopy, reminderTime } from './reminderCopy.js'
import styles from './MatchReminders.module.css'

const fields = ['emailEnabled', 'scheduleEmail', 'hourEmail', 'roomEmail']
export default function MatchReminderSettings({ user, onDirtyChange }) {
  const locale = useUiLocale(), copy = reminderCopy(locale), location = useLocation()
  const [data, setData] = useState(null), [form, setForm] = useState(null), [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [notice, setNotice] = useState(null)
  const mounted = useRef(false), lock = useRef(false)
  const dirty = Boolean(data && form && fields.some(key => data.preference[key] !== form[key]))
  const readonly = ['GUEST', 'OPERATOR', 'TEAM'].includes(user.role)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setNotice(null)
    fetchMatchReminders(controller.signal).then(result => {
      if (controller.signal.aborted) return
      if (!result.preference || result.userId !== user.id) throw new Error('INVALID_REMINDER_RESPONSE')
      setData(result); setForm(result.preference)
    }).catch(() => { if (!controller.signal.aborted) setNotice({ error: true, key: 'loadFailed' }) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user.id, attempt])
  const change = (key, checked) => { setForm(current => ({ ...current, [key]: checked })); setNotice(null) }
  async function save(event) {
    event.preventDefault()
    if (lock.current || !dirty) return
    lock.current = true; setBusy('save'); setNotice(null)
    try {
      const result = await saveMatchReminders(form)
      if (!mounted.current) return
      if (result.userId !== user.id || !result.preference) throw new Error('INVALID_REMINDER_RESPONSE')
      setData(result); setForm(result.preference); setNotice({ key: 'saved' })
    } catch (error) {
      if (mounted.current) setNotice({ error: true, key: error?.status === 409 ? 'conflict' : 'saveFailed' })
    } finally { lock.current = false; if (mounted.current) setBusy('') }
  }
  async function test() {
    if (lock.current) return
    lock.current = true; setBusy('test'); setNotice(null)
    try {
      const result = await sendReminderTest()
      if (!result.delivery) throw new Error('INVALID_REMINDER_RESPONSE')
      if (mounted.current) {
        setNotice(['FAILED', 'SKIPPED', 'CANCELLED'].includes(result.delivery.status) ? { error: true, key: 'testFailed' } : { key: result.delivery.status === 'ACCEPTED' ? 'acceptedTest' : 'queued' })
        setData(current => ({ ...current, deliveries: [result.delivery, ...(current.deliveries || []).filter(item => item.id !== result.delivery.id)] }))
      }
    } catch { if (mounted.current) setNotice({ error: true, key: 'testFailed' }) }
    finally { lock.current = false; if (mounted.current) setBusy('') }
  }
  const disabled = Boolean(busy || loading || !data?.available || readonly)
  return <section className={styles.settings} aria-labelledby="reminder-settings-title" data-i18n-ignore>
    <header><span className={styles.eyebrow}>MATCH REMINDERS</span><h2 id="reminder-settings-title" tabIndex={-1}>{copy.title}</h2><p>{copy.description}</p></header>
    {notice && <p className={styles.notice} data-error={notice.error || undefined} role={notice.error ? 'alert' : 'status'}>{copy[notice.key]}</p>}
    {loading ? <p role="status">{copy.loading}</p> : !data ? <button onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button> : <>
      {!data.available && <p className={styles.notice}>{copy.unavailable}</p>}
      {!data.emailVerified && <p className={styles.notice}>{copy.unverified} <Link to={{ pathname: '/account', search: location.search, hash: '#email' }}>{copy.verify} →</Link></p>}
      {readonly && <p>{copy.readonly}</p>}
      <div className={styles.email} data-i18n-ignore>{user.email}</div>
      <form onSubmit={save}>
        <label className={styles.master}>
          <span><strong>{copy.master}</strong><small>{copy.detail}</small></span>
          <input type="checkbox" checked={form.emailEnabled} disabled={disabled || (!data.emailVerified && !form.emailEnabled)} onChange={event => change('emailEnabled', event.target.checked)} />
        </label>
        <fieldset disabled={disabled || !form.emailEnabled}>
          <legend className={styles.srOnly}>{copy.title}</legend>
          {[['scheduleEmail', 'schedule'], ['hourEmail', 'hour'], ['roomEmail', 'room']].map(([key, label]) => <label className={styles.option} key={key}>
            <span><strong>{copy[label]}</strong><small>{copy[label + 'Detail']}</small></span>
            <input type="checkbox" checked={form[key]} onChange={event => change(key, event.target.checked)} />
          </label>)}
        </fieldset>
        <p className={styles.help}>{copy.optIn}</p><p className={styles.help}>{copy.scope}</p>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={disabled || !dirty || (form.emailEnabled && !data.emailVerified)}>{busy === 'save' ? copy.saving : copy.save}</button>
          <button type="button" disabled={disabled || !data.emailVerified} onClick={test}>{busy === 'test' ? copy.testing : copy.test}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button>
        </div>
      </form>
      <section className={styles.history} aria-labelledby="reminder-history-title">
        <h3 id="reminder-history-title">{copy.recent}</h3><p className={styles.help}>{copy.deliveryHint}</p>
        {data.deliveries?.length ? <ul>{data.deliveries.slice(0, 6).map(item => <li key={item.id}>
          <div><strong>{copy[item.kind] || copy.title}</strong>{item.displayName && <span data-i18n-ignore>{item.displayName}</span>}<time dateTime={item.dueAt}>{reminderTime(item.dueAt, locale)} · UTC+8</time></div>
          <span className={styles.deliveryStatus} data-failed={item.status === 'FAILED'}>{copy[item.status] || copy.PENDING}</span>
        </li>)}</ul> : <p className={styles.help}>{copy.empty}</p>}
      </section>
    </>}
  </section>
}
