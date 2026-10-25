import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { startVisiblePolling } from '../../lib/visiblePolling.js'
import { useLobbyMine } from './useLobbyState.js'
import { accountFailure, lobbyDate, leavesLobbyPage, lobbyReadFailure, retryableRead, uncertainWrite } from './lobbyModel.js'
import { reportInvalidField, revealAlert } from './lobbyFocus.js'
import * as api from './lobbyApi.js'
import styles from './Lobby.module.css'

export const contactStatus = value => ({ PENDING: t("待回应"), CONNECTED: t("联系中"), DECLINED: t("暂不联系"), WITHDRAWN: t("已撤回"), ENDED: t("已结束"), EXPIRED: t("已到期") })[value] || value
export const contactReason = value => ({ AUTHORITY_CHANGED: t("账号、负责人或大厅权限已变化，请重新申请联系。"), CARD_UNAVAILABLE: t("原需求已关闭、到期或被隐藏。"),
  REQUEST_EXPIRED: t("对方未在有效期内回应。"), CONSENT_REVOKED: t("一方已撤销本次 QQ 授权。"), ENDED_BY_PARTY: t("一方已结束联系。"), DECLINED: t("对方暂不联系。"), WITHDRAWN: t("发起人已撤回。") })[value] || ''

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

export function ContactEntry({ card }) {
  useUiLocale()

  const { user, isBootstrapping } = useAuth(), { data, error, refresh } = useLobbyMine()
  const [open, setOpen] = useState(false)
  const destination = `/lobby/cards/${card.publicId}`
  if (isBootstrapping) return <p role="status">{t("正在读取账号…")}</p>
  if (!user) return <><h2>{t("申请联系")}</h2><p>{t("登录后可以表达联系意愿，正式入队另行确认。")}</p><Link to={`/account/login?returnTo=${encodeURIComponent(destination)}`}>{t("登录／注册后继续")}</Link></>
  if (!user.emailVerifiedAt) return <><h2>{t("先验证邮箱")}</h2><Link to={`/account/verify-email?returnTo=${encodeURIComponent(destination)}`}>{t("验证后继续联系")}</Link></>
  if (error) return <p role="alert">{lobbyReadFailure(error)}{retryableRead(error) && <> <button type="button" onClick={refresh}>{t("重新读取")}</button></>}</p>
  if (!data) return <p role="status">{t("正在读取联系权限…")}</p>
  const own = data.cards.some(item => item.publicId === card.publicId)
  const canContact = data.canWrite && data.config.contactEnabled
  return <><h2>{own ? t("这是你的需求卡") : t("申请联系")}</h2>
    {own ? <Link to="/lobby/me?tab=cards">{t("管理这张卡片")}</Link> : <>
      <p>{t("双方愿意联系并分别授权后，才会展示本次 QQ。接受联系不会加入正式名单。")}</p>
      {!canContact ? <p>{data.restriction || t("联系功能当前不可操作，已有记录仍保留。")}</p>
        : card.kind === 'PERSON' && !data.teams.length ? <p>{t("代表队伍联系需要负责人身份。")}<Link to="/lobby/me/formation">{t("申请筹建招募")}</Link></p>
          : <button className={styles.primary} onClick={() => setOpen(true)}>{card.kind === 'TEAM' ? t("申请联系") : t("代表队伍申请联系")}</button>}
      <p><Link to="/lobby/me?tab=contacts">{t("查看我的联系记录")}</Link></p>
    </>}
    {open && <ContactComposer card={card} teams={data.teams} onClose={() => setOpen(false)} />}
  </>
}

function ContactComposer({ card, teams, onClose }) {
  useUiLocale()

  const dialog = useRef(null), operation = useRef(crypto.randomUUID()), locked = useRef(false)
  const [teamId, setTeamId] = useState(teams[0]?.id || ''), [message, setMessage] = useState(''), [qq, setQq] = useState(''), [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [result, setResult] = useState(null), [discard, setDiscard] = useState(false)
  const dirty = !result && Boolean(message || qq || consent), guard = useDraftGuard(dirty)
  const close = useCallback(() => { if (!busy) { if (dirty) setDiscard(true); else onClose() } }, [busy, dirty, onClose])
  const alertRef = useRef(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  useEffect(() => { if (error) revealAlert(alertRef.current) }, [error])
  async function submit(event) {
    event.preventDefault(); if (locked.current || !consent) return
    if (!message.trim()) { reportInvalidField(event.currentTarget.elements.namedItem('message'), t("请填写「{0}」，不能只输入空格。", [t("简短留言")])); return }
    locked.current = true; setBusy(true); setError(null)
    try {
      const value = await api.createContact({ operationId: operation.current, targetCardPublicId: card.publicId,
        ...(card.kind === 'PERSON' ? { teamId } : {}), message: message.trim(), qq, consent })
      setResult(value.contact); setQq(''); setConsent(false); setMessage('')
    } catch (failure) { setError(failure) }
    finally { locked.current = false; setBusy(false) }
  }
  return <dialog className={styles.contactDialog} ref={dialog} aria-labelledby="lobby-contact-title" onCancel={event => { event.preventDefault(); close() }}>
    <div className={styles.dialogHeader}><h2 id="lobby-contact-title">{t("联系")} {card.title}</h2><button onClick={close} disabled={busy} aria-label={t("关闭联系表单")}>×</button></div>
    {guard}{error && <p ref={alertRef} tabIndex={-1} role="alert" className={styles.error}>{accountFailure(error)}{uncertainWrite(error) && <> <Link to="/lobby/me?tab=sent">{t("先核对已发记录")}</Link></>}</p>}
    {discard && <div role="alert" className={styles.notice}><p>{t("放弃未发送内容后，本次 QQ 和留言会清空。")}</p><button onClick={() => setDiscard(false)}>{t("继续填写")}</button><button onClick={onClose}>{t("放弃并关闭")}</button></div>}
    {result ? <div className={styles.stack}><h3>{t("联系记录已保存")}</h3><p>{contactStatus(result.status)}</p><p>{t("如已有同一联系，将直接使用原记录。")}</p><Link className={styles.primary} to={`/lobby/me?tab=contacts&requestId=${result.id}`}>{t("查看这次联系")}</Link><button onClick={onClose}>{t("关闭")}</button></div>
      : <form className={styles.stack} onSubmit={submit}>
        {card.kind === 'PERSON' && <label>{t("以哪支队伍联系")}<select value={teamId} onChange={event => setTeamId(event.target.value)} disabled={busy} required>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><small>{t("由当前登录负责人本人处理，不向其他队员共享 QQ。")}</small></label>}
        <label>{t("简短留言")}<textarea name="message" value={message} onChange={event => setMessage(event.target.value)} maxLength={500} rows={4} required disabled={busy} /><small>{t("请勿在留言中填写私人联系方式。")}</small></label>
        <label>{t("本次联系 QQ")}<input value={qq} onChange={event => setQq(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{4,11}" minLength={5} maxLength={12} autoComplete="off" required disabled={busy} /></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} required /><span>{t("我同意在对方愿意联系并授权后，仅向本次联系的对方展示这个 QQ。")}</span></label>
        <p>{t("对方同样需要授权。请求最长有效 7 天；正式入队另行确认。")}</p>
        <button className={styles.primary} disabled={busy || !consent}>{busy ? t("正在保存…") : t("发送联系请求")}</button>
      </form>}
  </dialog>
}

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
    {data && <><p>{t('本页 {0} 条可回应联系；标记已读不会代替回应。', [data.pendingOnPage])}</p>
      {!data.contacts.length && <p className={styles.empty}>{t("暂无联系记录。可以先到大厅寻找合适的需求。")}</p>}
      {data.contacts.map(row => <article key={row.id} className={styles.progress}><div><h3>{row.perspective === 'PERSON' ? row.teamName : row.personName}</h3><p>{contactStatus(row.status)} · {row.received ? t("收到") : t("发出")} · {lobbyDate(row.createdAt)}</p>{row.reason && <p>{contactReason(row.reason)}</p>}</div><button onClick={() => select(row.id)}>{t("查看联系")}</button></article>)}
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
    {row && <article className={styles.detail}><div className={styles.sectionHeading}><h2>{row.personName} ↔ {row.teamName}</h2><strong>{contactStatus(row.status)}</strong></div>
      <p>{t("本次队伍处理人：")}{row.handlerName}</p><p className={styles.bodyCopy}>{row.message}</p>
      <p>{t("发起于")} {lobbyDate(row.createdAt)}{row.status === 'PENDING' && t(' · 回应期限 {0}', [lobbyDate(row.expiresAt)])}</p>
      {row.reason && <p className={styles.notice}>{contactReason(row.reason)}</p>}
      {row.canAccept && <form className={styles.stack} onSubmit={event => { event.preventDefault(); act('ACCEPT') }}>
        <label>{t("本次联系 QQ")}<input value={qq} onChange={event => setQq(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{4,11}" autoComplete="off" minLength={5} maxLength={12} required disabled={busy} /></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} required /><span>{t("我愿意联系，并仅向本次对方授权展示这个 QQ。")}</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{t("愿意联系并授权")}</button>
      </form>}
      {row.canReadQq && <div className={styles.contactAccess}><h3>{t("本次授权的对方 QQ")}</h3>{revealed ? <output aria-label={t("对方 QQ")}>{revealed}</output> : <p>{t("点击后重新核对双方授权，30 秒后隐藏。")}</p>}<div className={styles.actions}><button disabled={busy} onClick={() => reveal(false)}>{t("查看对方 QQ")}</button><button disabled={busy} onClick={() => reveal(true)}>{copied ? t("已复制") : t("核对授权并复制")}</button></div></div>}
      <div className={styles.actions}>{row.canDecline && <button disabled={busy} onClick={() => act('DECLINE')}>{t("暂不联系")}</button>}{row.canWithdraw && <button disabled={busy} onClick={() => act('WITHDRAW')}>{t("撤回请求")}</button>}{row.canEnd && <button disabled={busy} onClick={() => act('END')}>{t("结束联系")}</button>}{row.canRevoke && <button disabled={busy} onClick={() => act('REVOKE')}>{t("撤销本次 QQ 授权")}</button>}</div>
      <p className={styles.notice}>{t("结束或撤销后停止后续 QQ 展示；对方已经看见的信息无法从其设备收回。")}</p>
      <h3>{t("准备正式入队或参赛")}</h3><p>{t("联系意愿不改变正式名单。请由队伍负责人提供当前有效的报名或入队链接，双方再按原流程确认；没有入口时先联系赛事工作人员。")}</p>
      <FeedbackLink config={config} /><small className={styles.recordId}>{t("记录编号：")}{row.id}</small>
    </article>}
  </section>
}
