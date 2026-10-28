import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { lobbyText as t } from './lobbyCopy.js'
import { accountFailure } from './lobbyModel.js'
import { saveCardQqSettings } from './lobbyApi.js'
import styles from './Lobby.module.css'

export default function CardQqSettings({ card, disabled, onSaved }) {
  useUiLocale()
  const [open, setOpen] = useState(false), [mode, setMode] = useState(card.qqMode || 'REQUEST'), [qq, setQq] = useState(''), [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(null)
  const locked = useRef(false), operation = useRef(crypto.randomUUID()), alertRef = useRef(null)
  useEffect(() => { if (error) alertRef.current?.focus() }, [error])
  useEffect(() => {
    if (!qq && !consent) return undefined
    const before = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before)
  }, [qq, consent])
  async function submit(event) {
    event.preventDefault(); if (locked.current) return
    locked.current = true; setBusy(true); setError(null)
    try {
      await saveCardQqSettings(card.id, { operationId: operation.current, revision: card.revision, mode, ...(mode === 'VERIFIED' ? { qq, consent } : {}) })
      setQq(''); setConsent(false); setOpen(false); operation.current = crypto.randomUUID(); onSaved()
    } catch (failure) { setError(failure) }
    finally { locked.current = false; setBusy(false) }
  }
  return <section className={styles.qqSettings}>
    <div className={styles.sectionHeading}><h3>{t('QQ 联系方式')}</h3><button type="button" disabled={disabled || busy} aria-expanded={open} onClick={() => { setOpen(!open); if (open) { setQq(''); setConsent(false); setMode(card.qqMode || 'REQUEST') } }}>{open ? t('取消') : t('设置 QQ')}</button></div>
    <p>{card.qqMode === 'VERIFIED' ? t('已允许已验证用户查看；首次查看会通知你。') : t('逐次同意后，对方才能查看 QQ。')}</p>
    {open && <form className={styles.stack} onSubmit={submit}>
      {error && <p ref={alertRef} tabIndex={-1} role="alert" className={styles.error}>{accountFailure(error)}</p>}
      <label>{t('QQ 查看方式')}<select aria-label={t('QQ 查看方式')} value={mode} onChange={event => { setMode(event.target.value); setQq(''); setConsent(false) }} disabled={busy || disabled}><option value="REQUEST">{t('每次由我同意')}</option><option value="VERIFIED">{t('允许已验证用户查看并通知我')}</option></select></label>
      {mode === 'VERIFIED' && <>
        <label>{t('用于这张卡片的 QQ')}<input value={qq} onChange={event => setQq(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{4,11}" minLength={5} maxLength={12} autoComplete="off" required disabled={busy || disabled} /></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required disabled={busy || disabled} /><span>{t('我同意已登录并验证邮箱的用户查看此 QQ，每条联系首次查看时通知我。')}</span></label>
      </>}
      <p className={styles.finePrint}>{t('修改设置会使旧的查看授权失效；已经被看见的号码无法收回。')}</p>
      <button className={styles.primary} disabled={busy || disabled || (mode === 'VERIFIED' && !consent)}>{busy ? t('正在保存…') : t('保存联系方式设置')}</button>
    </form>}
  </section>
}
