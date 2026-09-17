import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { acknowledgeAnnouncement, fetchMyAnnouncements } from './communicationApi.js'
import { getPendingAcknowledgementAnnouncements } from './mandatoryAnnouncementModel.js'
import styles from './UrgentAnnouncementGate.module.css'

const ANNOUNCEMENT_REFRESH_INTERVAL_MS = 60_000

export default function UrgentAnnouncementGate({ seasonId, isAuthenticated, detailsUrl }) {
  const uiLocale = useUiLocale()
  const [gateState, setGateState] = useState({ key: '', status: 'idle', announcements: [], error: '' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [retryNonce, setRetryNonce] = useState(0)
  const acknowledgedLocallyRef = useRef(new Set())
  const gateKey = isAuthenticated && seasonId ? String(seasonId) : ''

  useEffect(() => {
    let active = true
    acknowledgedLocallyRef.current = new Set()

    if (!gateKey) {
      setGateState({ key: '', status: 'idle', announcements: [], error: '' })
      return () => { active = false }
    }

    setGateState({ key: gateKey, status: 'loading', announcements: [], error: '' })
    setActionError('')

    const refreshAnnouncements = () => {
      if (document.visibilityState === 'hidden') return

      fetchMyAnnouncements(seasonId)
        .then(items => {
          if (!active) return
          const announcements = getPendingAcknowledgementAnnouncements(items)
            .filter(item => !acknowledgedLocallyRef.current.has(item.id))
          setGateState({ key: gateKey, status: 'ready', announcements, error: '' })
        })
        .catch(error => {
          if (!active) return

          // Announcement routes are optional during a staggered frontend/backend rollout.
          // A missing route means the capability is not enabled yet; all other failures
          // remain fail-closed so required notices cannot be silently skipped.
          if (error?.status === 404) {
            setGateState({ key: gateKey, status: 'ready', announcements: [], error: '' })
            return
          }

          setGateState(current => ({
            key: gateKey,
            status: 'error',
            announcements: current.key === gateKey ? current.announcements : [],
            error: error?.message || '必须确认的赛事公告暂时无法载入，请重试。'
          }))
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshAnnouncements()
    }

    refreshAnnouncements()
    const interval = globalThis.setInterval(refreshAnnouncements, ANNOUNCEMENT_REFRESH_INTERVAL_MS)
    globalThis.addEventListener('focus', refreshAnnouncements)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      globalThis.clearInterval(interval)
      globalThis.removeEventListener('focus', refreshAnnouncements)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [gateKey, retryNonce, seasonId])

  if (!gateKey) return null

  const stateIsCurrent = gateState.key === gateKey
  const announcement = stateIsCurrent ? gateState.announcements[0] : null
  const remainingCount = stateIsCurrent ? gateState.announcements.length : 0
  const isLoading = !stateIsCurrent || gateState.status === 'loading'
  const loadError = stateIsCurrent ? gateState.error : ''

  const acknowledge = async () => {
    if (!announcement) return
    setBusy(true)
    setActionError('')
    try {
      await acknowledgeAnnouncement(announcement.id)
      acknowledgedLocallyRef.current.add(announcement.id)
      setGateState(current => {
        if (current.key !== gateKey) return current
        const announcements = current.announcements.filter(item => item.id !== announcement.id)
        return {
          ...current,
          status: current.error ? 'error' : 'ready',
          announcements
        }
      })
    } catch (error) {
      setActionError(error?.message || '确认状态同步失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.backdrop} role="alertdialog" aria-modal="true" aria-labelledby="announcement-loading-title" aria-busy="true">
        <section className={styles.dialog} data-state="loading">
          <header><span>REQUIRED EVENT NOTICE</span><b>{uiText("正在核验", uiLocale)}</b></header>
          <h2 id="announcement-loading-title">{uiText("正在检查必须确认的公告", uiLocale)}</h2>
          <p>{uiText("完成核验后即可继续使用赛事数据中心。", uiLocale)}</p>
          <div className={styles.loader} aria-hidden="true" />
        </section>
      </div>
    )
  }

  if (!announcement && gateState.status === 'error') {
    return (
      <div className={styles.backdrop} role="alertdialog" aria-modal="true" aria-labelledby="announcement-load-error-title">
        <section className={styles.dialog} data-state="error">
          <header><span>REQUIRED EVENT NOTICE</span><b>{uiText("载入失败", uiLocale)}</b></header>
          <h2 id="announcement-load-error-title">{uiText("暂时无法核验赛事公告", uiLocale)}</h2>
          <p>{loadError}</p>
          <footer><button type="button" onClick={() => setRetryNonce(current => current + 1)}>{uiText("重新检查", uiLocale)}</button></footer>
        </section>
      </div>
    )
  }

  if (!announcement) return null

  return (
    <div className={styles.backdrop} role="alertdialog" aria-modal="true" aria-labelledby="required-announcement-title">
      <section className={styles.dialog}>
        <header><span>REQUIRED EVENT NOTICE</span><b>{uiText("必须确认", uiLocale)}{remainingCount > 1 ? uiText(" · {0} 则待确认", uiLocale, [remainingCount]) : ''}</b></header>
        <h2 id="required-announcement-title">{announcement.currentVersion?.title || uiText("赛事公告", uiLocale)}</h2>
        <p>{announcement.currentVersion?.body || uiText("请前往公告中心查看最新内容。", uiLocale)}</p>
        {announcement.dueAt ? <small>{uiText("确认截止：", uiLocale)}{new Date(announcement.dueAt).toLocaleString('zh-CN', { hour12: false })}</small> : null}
        {loadError ? <div className={styles.error}>{loadError}</div> : null}
        {actionError ? <div className={styles.error}>{actionError}</div> : null}
        <footer><Link to={detailsUrl}>{uiText("查看公告中心", uiLocale)}</Link><button type="button" disabled={busy} onClick={acknowledge}>{busy ? uiText("正在确认…", uiLocale) : uiText("我已阅读并确认", uiLocale)}</button></footer>
      </section>
    </div>
  )
}
