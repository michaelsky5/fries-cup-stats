import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useSearchParams } from 'react-router-dom'


import { startVisiblePolling } from '../../lib/visiblePolling.js'

import { accountFailure, lobbyDate, leavesLobbyPage, lobbyReadFailure, retryableRead, contactStatus, contactReason } from './lobbyModel.js'
import { revealAlert } from './lobbyFocus.js'
import * as api from './lobbyApi.js'
import { contactPurpose, qqContactStatus, qqChatUrl } from './lobbyQq.js'
import QqAccess from './QqAccess.jsx'
import styles from './Lobby.module.css'

function useDraftGuard(dirty) {
  useUiLocale()

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && leavesLobbyPage(currentLocation, nextLocation))
  useEffect(() => {
    if (!dirty) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  return blocker.state === 'blocked' ? <div role="alert" className={styles.notice}><p>{t("尚有未发送内容。离开会清空本次 QQ 和留言。")}</p><button onClick={() => blocker.reset()}>{t("继续填写")}</button><button onClick={() => blocker.proceed()}>{t("放弃并离开")}</button></div> : null
}

export function FeedbackLink({ config }) {
  useUiLocale()
  const [copied, setCopied] = useState(false), [copyFailed, setCopyFailed] = useState(false)
  async function copyGroup() {
    setCopied(false); setCopyFailed(false)
    try { await navigator.clipboard.writeText(config.feedbackQqGroup); setCopied(true) }
    catch { setCopyFailed(true) }
  }
  return <details className={styles.feedback}><summary>{t('反馈大厅问题')}</summary>
    {config?.feedbackUrl && <p><a href={config.feedbackUrl} target="_blank" rel="noreferrer">{t('打开反馈入口')}</a></p>}
    {config?.feedbackQqGroup && <p>{t('赛事 QQ 群')} <strong>{config.feedbackQqGroup}</strong> <button onClick={copyGroup}>{copied ? t('已复制') : t('复制群号')}</button></p>}
    {copyFailed && <p role="status">{t('复制未成功，请手动复制上方群号。')}</p>}
    <p>{t('由赛事负责人处理。群内只提供记录编号和问题概述，不要公开密码、验证码或私人 QQ；敏感信息请与负责人私下核对。')}</p>
  </details>
}

export { default as ContactEntry } from './CardQqContact.jsx'

export function ContactInbox({ direction, config, onChanged }) {
  useUiLocale()

  const [query, setQuery] = useSearchParams(), requestId = query.get('requestId') || ''
  const page = Math.max(1, Math.min(10000, Number(query.get('contactPage')) || 1))
  const [data, setData] = useState(null), [error, setError] = useState(null), polling = useRef(null)
  useEffect(() => {
    setData(null); setError(null)
    if (requestId) return undefined
    const poll = startVisiblePolling(async ({ signal }) => {
      try { const value = await api.listContacts({ direction, page }, { signal }); if (!signal.aborted) { setData(value); setError(null) } }
      catch (failure) { if (!signal.aborted) setError(failure); throw failure }
    }, { intervalMs: 30000 })
    polling.current = poll
    return () => { poll.stop(); polling.current = null }
  }, [direction, page, requestId])
  const changed = useCallback(() => { polling.current?.refresh({ changed: true }); onChanged?.() }, [onChanged])
  function select(id) { setQuery(current => { if (id) current.set('requestId', id); else current.delete('requestId'); return current }) }
  if (requestId) return <ContactDetail key={requestId} id={requestId} config={config} onBack={() => select('')} onChanged={changed} />
  return <section aria-label={t("联系列表")}><div className={styles.sectionHeading}><h2>{direction === 'received' ? t("收到的联系") : direction === 'sent' ? t("发出的联系") : t("全部联系")}</h2><button onClick={() => polling.current?.refresh()}>{t("刷新记录")}</button></div>
    {error && <p role="alert" className={styles.error}>{lobbyReadFailure(error)}{data && <> {t("已显示的记录可能过时。")}</>}</p>}
    {!data && !error && <p role="status">{t("正在读取联系…")}</p>}
    {data && <>{data.pendingOnPage > 0 && <p>{t('本页有 {0} 条联系等待你回应。', [data.pendingOnPage])}</p>}
      {!data.contacts.length && <p className={styles.empty}>{t("暂无联系记录。可以先到大厅寻找合适的需求。")}</p>}
      {data.contacts.map(row => <article key={row.id} className={styles.progress}><div><h3>{row.flow === 'CARD_QQ' ? row.peerName : row.perspective === 'PERSON' ? row.teamName : row.personName}</h3><p>{row.flow === 'CARD_QQ' ? qqContactStatus(row, t) || contactStatus(row.status) : contactStatus(row.status)} · {row.received ? t("收到") : t("发出")}{row.perspective === 'TEAM' && row.teamName ? ` · ${row.teamName}` : ''} · {lobbyDate(row.createdAt)}</p>{row.flow === 'CARD_QQ' && <p>{contactPurpose(row.purpose, t)}{row.contextName ? ` · ${row.contextName}` : ''}</p>}{row.reason && <p>{contactReason(row.reason, row.received)}</p>}</div><button onClick={() => select(row.id)}>{t("查看联系")}</button></article>)}
      <div className={styles.pagination}><button disabled={page <= 1} onClick={() => setQuery(current => { current.set('contactPage', String(page - 1)); return current })}>{t("上一页")}</button><span>{t('第 {0} 页 · {1} 条', [page, data.total])}</span><button disabled={page * data.pageSize >= data.total} onClick={() => setQuery(current => { current.set('contactPage', String(page + 1)); return current })}>{t("下一页")}</button></div>
    </>}
  </section>
}

function ContactDetail({ id, config, onBack, onChanged }) {
  useUiLocale()

  // Reading the contact and acting on it fail in different ways; keep them apart.
  const [row, setRow] = useState(null), [readError, setReadError] = useState(null), [actionError, setActionError] = useState(null), [busy, setBusy] = useState(false)
  const [qq, setQq] = useState(''), [consent, setConsent] = useState(false), [revealed, setRevealed] = useState(''), [copied, setCopied] = useState(false)
  const locked = useRef(false), operation = useRef(null), alive = useRef(false), poller = useRef(null), readEpoch = useRef(0), alertRef = useRef(null)
  const guard = useDraftGuard(Boolean(qq || consent))
  const canAccept = Boolean(row?.canAccept)
  useEffect(() => { if (!canAccept) { setQq(''); setConsent(false) } }, [canAccept])
  useEffect(() => { if (actionError) revealAlert(alertRef.current) }, [actionError])
  useEffect(() => {
    alive.current = true
    const hide = () => { readEpoch.current++; setRevealed(''); setCopied(false) }
    const visibility = () => { if (document.visibilityState === 'hidden') hide() }
    window.addEventListener('blur', hide); document.addEventListener('visibilitychange', visibility)
    const poll = startVisiblePolling(async ({ signal }) => {
      const epoch = ++readEpoch.current
      try { const value = await api.getContact(id, { signal }); if (!signal.aborted && epoch === readEpoch.current) { setRow(value.contact); setReadError(null); if (!value.contact.canReadQq) hide() } }
      catch (failure) { if (!signal.aborted) { setReadError(failure); hide(); setRow(current => current && { ...current, canReadQq: false, canAccept: false }) }; throw failure }
    }, { intervalMs: 30000 })
    poller.current = poll
    return () => { alive.current = false; poll.stop(); window.removeEventListener('blur', hide); document.removeEventListener('visibilitychange', visibility) }
  }, [id])
  useEffect(() => { if (!revealed) return undefined; const timer = window.setTimeout(() => { readEpoch.current++; setRevealed(''); setCopied(false) }, 30000); return () => clearTimeout(timer) }, [revealed])
  async function act(action) {
    if (locked.current || !row) return
    locked.current = true; setBusy(true); setActionError(null); setRevealed(''); readEpoch.current++
    if (operation.current?.action !== action || operation.current?.revision !== row.revision) operation.current = { action, revision: row.revision, operationId: crypto.randomUUID() }
    try {
      const value = await api.changeContact(id, { ...operation.current, ...(action === 'ACCEPT' ? { qq, consent } : {}) })
      if (!alive.current) return
      setRow(value.contact); setQq(''); setConsent(false); operation.current = null; onChanged()
    } catch (failure) { if (alive.current) { setActionError(failure); poller.current?.refresh({ changed: true }) } }
    finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  async function reveal(copy = false) {
    if (locked.current) return
    locked.current = true; setBusy(true); setActionError(null); setCopied(false)
    const epoch = ++readEpoch.current
    try {
      const value = await api.readContactQq(id)
      if (!alive.current || epoch !== readEpoch.current || document.visibilityState === 'hidden') return
      setRevealed(value.qq)
      if (copy) { await navigator.clipboard.writeText(value.qq); if (alive.current) setCopied(true) }
    } catch (failure) { if (alive.current) { setRevealed(''); setActionError(failure); poller.current?.refresh({ changed: true }) } }
    finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  return <section><button onClick={onBack}>{t("← 返回联系列表")}</button>{guard}
    {readError && <p role="alert" className={styles.error}>{lobbyReadFailure(readError)}{retryableRead(readError) && <> <button onClick={() => poller.current?.refresh()}>{t("重新读取")}</button></>}</p>}
    {actionError && <p ref={alertRef} tabIndex={-1} role="alert" className={styles.error}>{accountFailure(actionError)}</p>}
    {!row && !readError && <p role="status">{t("正在读取本次联系…")}</p>}
    {row && <article className={styles.detail}><div className={styles.sectionHeading}><h2>{row.flow === 'CARD_QQ' ? row.peerName : `${row.personName} ↔ ${row.teamName}`}</h2><strong>{row.flow === 'CARD_QQ' ? qqContactStatus(row, t) || contactStatus(row.status) : contactStatus(row.status)}</strong></div>
      {row.flow === 'CARD_QQ' ? <><p>{contactPurpose(row.purpose, t)}{row.contextName ? ` · ${row.contextName}` : ''}</p>{row.contextName && <p className={styles.finePrint}>{t('队名由对方填写，不代表已取得队伍管理权限。')}</p>}<p>{t('相关需求：')}{row.cardTitle}</p>{row.peerCardPublicId && <p><Link to={`/lobby/cards/${row.peerCardPublicId}`}>{t('查看对方需求卡')}</Link></p>}</> : <p>{t("本次队伍处理人：")}{row.handlerName}</p>}<p className={styles.bodyCopy}>{row.message}</p>
      <p>{t("发起于")} {lobbyDate(row.createdAt)}{row.status === 'PENDING' && t(' · 回应期限 {0}', [lobbyDate(row.expiresAt)])}</p>
      {row.reason && <p className={styles.notice}>{contactReason(row.reason, row.received)}</p>}
      {row.canAccept && <form className={styles.stack} onSubmit={event => { event.preventDefault(); act('ACCEPT') }}>
        <label>{t("本次联系 QQ")}<input value={qq} onChange={event => setQq(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{4,11}" autoComplete="off" minLength={5} maxLength={12} required disabled={busy} /></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} required /><span>{t(row.flow === 'CARD_QQ' ? '我同意仅向本次请求人展示这个 QQ。' : "我愿意联系，并仅向本次对方授权展示这个 QQ。")}</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{t(row.flow === 'CARD_QQ' ? '同意查看 QQ' : "愿意联系并授权")}</button>
      </form>}
      {row.canReadQq && (row.flow === 'CARD_QQ' ? <QqAccess id={row.id} /> : <div className={styles.contactAccess}><h3>{t("本次授权的对方 QQ")}</h3>{revealed ? <output aria-label={t("对方 QQ")}>{revealed}</output> : <p>{t("点击后重新核对双方授权，30 秒后隐藏。")}</p>}<div className={styles.actions}><button disabled={busy} onClick={() => reveal(false)}>{t("查看对方 QQ")}</button><button disabled={busy} onClick={() => reveal(true)}>{copied ? t("已复制") : t("核对授权并复制")}</button>{qqChatUrl(revealed) && <a href={qqChatUrl(revealed)}>{t('尝试打开 QQ')}</a>}</div></div>)}
      {row.flow === 'CARD_QQ' && row.received && row.status === 'CONNECTED' && <p>{row.firstViewedAt ? t('对方已查看你的 QQ。') : t('已授权，对方尚未查看 QQ。')}</p>}
      <div className={styles.actions}>{row.canDecline && <button disabled={busy} onClick={() => act('DECLINE')}>{t("暂不联系")}</button>}{row.canWithdraw && <button disabled={busy} onClick={() => act('WITHDRAW')}>{t("撤回请求")}</button>}{row.canEnd && <button disabled={busy} onClick={() => act('END')}>{t("结束联系")}</button>}{row.canRevoke && <button disabled={busy} onClick={() => act('REVOKE')}>{t("撤销本次 QQ 授权")}</button>}</div>
      <p className={styles.notice}>{t("结束或撤销后停止后续 QQ 展示；对方已经看见的信息无法从其设备收回。")}</p>
      <h3>{t("准备正式入队或参赛")}</h3><p>{t("联系意愿不改变正式名单。请由队伍负责人提供当前有效的报名或入队链接，双方再按原流程确认；没有入口时先联系赛事工作人员。")}</p>
      <FeedbackLink config={config} /><small className={styles.recordId}>{t("记录编号：")}{row.id}</small>
    </article>}
  </section>
}
