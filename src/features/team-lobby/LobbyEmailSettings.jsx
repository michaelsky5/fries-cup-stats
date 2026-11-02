import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { ACCOUNT_SIGN_OUT_EVENT } from '../account-ui/accountNavigationGuard.js'
import { getLobbyEmailPreferences, saveLobbyEmailPreferences } from './lobbyApi.js'
import { lobbyText as t } from './lobbyCopy.js'
import { leavesLobbyPage } from './lobbyModel.js'
import styles from './LobbyEmailSettings.module.css'

const fields = ['emailEnabled', 'requestEmail', 'resultEmail', 'qqViewedEmail']
function validResponse(value, userId) {
  return value?.userId === userId && Number.isInteger(value?.preference?.revision)
    && fields.every(key => typeof value.preference[key] === 'boolean')
}
export default function LobbyEmailSettings({ user }) {
  useUiLocale()
  const [data, setData] = useState(null), [form, setForm] = useState(null), [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null)
  const alive = useRef(false), lock = useRef(false)
  const dirty = Boolean(data && form && fields.some(key => data.preference[key] !== form[key]))
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && leavesLobbyPage(currentLocation, nextLocation))
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!dirty && !busy) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    const preventSignOut = event => event.preventDefault()
    window.addEventListener('beforeunload', guard)
    window.addEventListener(ACCOUNT_SIGN_OUT_EVENT, preventSignOut)
    return () => { window.removeEventListener('beforeunload', guard); window.removeEventListener(ACCOUNT_SIGN_OUT_EVENT, preventSignOut) }
  }, [dirty, busy])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setNotice(null)
    getLobbyEmailPreferences({ signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return
      if (!validResponse(result, user.id)) throw new Error('INVALID_LOBBY_EMAIL_RESPONSE')
      setData(result); setForm(result.preference)
    }).catch(() => { if (!controller.signal.aborted) setNotice({ error: true, key: '未能读取邮件设置，请重新读取。' }) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user.id, attempt])
  const change = (key, checked) => { setForm(current => ({ ...current, [key]: checked })); setNotice(null) }
  async function save(event) {
    event.preventDefault()
    if (lock.current || !dirty) return
    lock.current = true; setBusy(true); setNotice(null)
    try {
      const result = await saveLobbyEmailPreferences(Object.fromEntries(['revision', ...fields].map(key => [key, form[key]])))
      if (!validResponse(result, user.id)) throw new Error('INVALID_LOBBY_EMAIL_RESPONSE')
      if (alive.current) { setData(result); setForm(result.preference); setNotice({ key: '邮件提醒设置已保存。' }) }
    } catch (error) {
      if (alive.current) setNotice({ error: true, key: error?.status === 409 ? '设置已在其他页面更新，请重新读取后再保存。' : '未能保存邮件设置，当前修改仍保留，请重试。' })
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  function reload() {
    if (dirty && !window.confirm(t('重新读取会放弃尚未保存的邮件设置，是否继续？'))) return
    setAttempt(value => value + 1)
  }
  const disabled = busy || loading
  return <section className={styles.panel} aria-labelledby="lobby-email-title">
    <header className={styles.header}><span>FRIES CUP · TEAM LOBBY</span><h2 id="lobby-email-title">{t('组队邮件提醒')}</h2><p>{t('不必一直守着大厅，有新进展时再回来。')}</p></header>
    <div className={styles.body}>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={styles.notice}>{t(notice.key)}</p>}
      {loading ? <p role="status">{t('读取邮件设置…')}</p> : !data ? <button type="button" onClick={reload}>{t('重新读取')}</button> : <>
        {!data.available && <p className={styles.notice}>{t('邮件提醒服务暂未启用，当前仍通过站内消息通知。')}</p>}
        {!data.emailVerified && <p>{t('先验证邮箱')} <Link to="/account/verify-email?returnTo=%2Flobby%2Fme%3Ftab%3Demail">{t('验证本人邮箱')} →</Link></p>}
        <form onSubmit={save}>
          <label className={styles.master}><span><strong>{t('开启组队邮件')}</strong><small>{t('发送到本人已验证的账号邮箱，随时可以关闭。')}</small></span><input type="checkbox" checked={form.emailEnabled} disabled={disabled || (!form.emailEnabled && (!data.available || !data.emailVerified))} onChange={event => change('emailEnabled', event.target.checked)} /></label>
          <fieldset disabled={disabled || !form.emailEnabled || !data.available}>
            <legend>{t('邮件提醒')}</legend>
            {[
              ['requestEmail', '收到联系请求', '有人希望与你联系时提醒你。'],
              ['resultEmail', '联系处理结果', '对方同意、婉拒、撤回，或联系结束时提醒你。'],
              ['qqViewedEmail', 'QQ 首次被查看', '每次联系只提醒一次，默认关闭；站内仍会通知。'],
            ].map(([key, title, detail]) => <label className={styles.option} key={key}><span><strong>{t(title)}</strong><small>{t(detail)}</small></span><input type="checkbox" checked={form[key]} onChange={event => change(key, event.target.checked)} /></label>)}
          </fieldset>
          <p className={styles.help}>{t('只提醒开启后新发生的事件，不补发历史邮件。邮件不包含 QQ 号码或联系留言。')}</p>
          <p className={styles.help}>{t('邮件提醒可能延迟，最新进展以站内记录为准。')}</p>
          <div className={styles.actions}><button className={styles.save} disabled={disabled || !dirty || (form.emailEnabled && (!data.available || !data.emailVerified))}>{t(busy ? '正在保存…' : '保存邮件设置')}</button><button type="button" onClick={reload} disabled={disabled}>{t('重新读取')}</button></div>
        </form>
      </>}
      {blocker.state === 'blocked' && <div className={styles.notice} role="alert"><p>{t('邮件设置尚未保存。')}</p><div className={styles.actions}><button type="button" disabled={busy} onClick={() => blocker.reset()}>{t('保留并继续设置')}</button><button type="button" disabled={busy} onClick={() => blocker.proceed()}>{t('放弃设置并离开')}</button></div></div>}
    </div>
  </section>
}
