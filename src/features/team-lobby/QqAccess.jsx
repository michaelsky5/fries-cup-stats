import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { accountFailure, uncertainWrite } from './lobbyModel.js'
import { readContactQq } from './lobbyApi.js'
import { qqChatUrl } from './lobbyQq.js'
import styles from './Lobby.module.css'

export default function QqAccess({ id, autoReveal = false }) {
  useUiLocale()
  const [qq, setQq] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(null), [copied, setCopied] = useState(false)
  const epoch = useRef(0), locked = useRef(false), alive = useRef(false)
  async function reveal(copy = false) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(null); setCopied(false)
    const requestEpoch = ++epoch.current
    try {
      const result = await readContactQq(id)
      if (!alive.current || requestEpoch !== epoch.current || document.hidden) return
      setQq(result.qq)
      if (copy) {
        try { await navigator.clipboard.writeText(result.qq); if (alive.current && requestEpoch === epoch.current) setCopied(true) }
        catch { if (alive.current && requestEpoch === epoch.current) setError(new Error(t('复制未成功，请手动复制上方号码。'))) }
      }
    } catch (failure) { if (alive.current && requestEpoch === epoch.current) { setQq(''); setError(failure) } }
    finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  const revealRef = useRef(reveal)
  useEffect(() => { revealRef.current = reveal })
  useEffect(() => {
    alive.current = true
    const invalidate = () => { epoch.current++ }
    const hide = () => { invalidate(); setQq(''); setCopied(false) }
    const visibility = () => { if (document.hidden) hide() }
    window.addEventListener('blur', hide); document.addEventListener('visibilitychange', visibility)
    const timer = autoReveal ? setTimeout(() => revealRef.current(), 0) : null
    return () => { alive.current = false; invalidate(); clearTimeout(timer); window.removeEventListener('blur', hide); document.removeEventListener('visibilitychange', visibility) }
  }, [id, autoReveal])
  useEffect(() => { if (!qq) return undefined; const timer = setTimeout(() => { epoch.current++; setQq(''); setCopied(false) }, 30000); return () => clearTimeout(timer) }, [qq])
  const chatUrl = qqChatUrl(qq, /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  return <div className={styles.contactAccess}><h3>{t('对方 QQ')}</h3>
    {error && <p role="alert" className={styles.error}>{accountFailure(error)}{uncertainWrite(error) && <> <Link to={`/lobby/me?tab=sent&requestId=${id}`}>{t('查看这次联系')}</Link></>}</p>}
    {qq ? <output aria-label={t('对方 QQ')}>{qq}</output> : <p>{t('查看时会通知对方，号码展示 30 秒。')}</p>}
    <div className={styles.actions}><button type="button" disabled={busy} onClick={() => reveal(false)}>{busy ? t('正在读取…') : t('查看 QQ 并通知对方')}</button>
      <button type="button" disabled={busy} onClick={() => reveal(true)}>{copied ? t('已复制') : t('复制 QQ')}</button>
      {chatUrl && <a className={styles.primary} href={chatUrl}>{t('尝试打开 QQ')}</a>}
    </div><p className={styles.finePrint}>{t('未能打开 QQ 时，请复制号码到 QQ 搜索添加。重复查看同一条联系不会重复通知。')}</p>
  </div>
}
