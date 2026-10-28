import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { requestSignIn } from '../auth/signInRequest.js'
import { useLobbyMine } from './useLobbyState.js'
import { accountFailure, leavesLobbyPage, lobbyReadFailure, retryableRead, uncertainWrite, contactResultKind } from './lobbyModel.js'
import { reportInvalidField, revealAlert } from './lobbyFocus.js'
import * as api from './lobbyApi.js'
import styles from './Lobby.module.css'

// Preserve the existing production flow while System still returns the old card contract.
// The new card QQ controls are selected only after the server advertises qqMode.
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

export default function LegacyLobbyContact({ card }) {
  useUiLocale()

  const { user, isBootstrapping } = useAuth(), { data, error, refresh } = useLobbyMine()
  const [open, setOpen] = useState(false)
  const destination = `/lobby/cards/${card.publicId}`
  if (isBootstrapping) return <p role="status">{t("正在读取账号…")}</p>
  if (!user) return <><h2>{t("申请联系")}</h2><p>{t("登录后可以表达联系意愿，正式入队另行确认。")}</p><button type="button" onClick={requestSignIn}>{t("登录／注册后继续")}</button></>
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
  const alertRef = useRef(null), sent = useRef('')
  const resultKind = result && contactResultKind(result, sent.current)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  useEffect(() => { if (error) revealAlert(alertRef.current) }, [error])
  async function submit(event) {
    event.preventDefault(); if (locked.current || !consent) return
    if (!message.trim()) { reportInvalidField(event.currentTarget.elements.namedItem('message'), t("请填写「{0}」，不能只输入空格。", [t("简短留言")])); return }
    locked.current = true; setBusy(true); setError(null); sent.current = message.trim()
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
    {result ? <div className={styles.stack}>
        <h3>{resultKind === 'AWAITING_YOU' ? t("对方已经向你发出联系请求") : resultKind === 'CONNECTED' ? t("你们已经在联系中") : resultKind === 'EXISTING' ? t("你之前发出的联系请求仍在等待回应") : t("联系请求已发送")}</h3>
        <p>{resultKind === 'AWAITING_YOU' ? t("你们之间已有一条待你回应的联系。本次填写的留言和 QQ 没有发送，请在联系详情中回应。") : resultKind === 'CONNECTED' ? t("本次填写的留言和 QQ 没有发送；可以在联系详情查看本次授权。") : resultKind === 'EXISTING' ? t("本次填写的留言和 QQ 没有发送，原请求保持不变。") : t("对方最长 7 天内回应；双方都授权后才会看到本次 QQ。")}</p>
        <Link className={styles.primary} to={`/lobby/me?tab=${resultKind === 'AWAITING_YOU' ? 'received' : 'contacts'}&requestId=${result.id}`}>{resultKind === 'AWAITING_YOU' ? t("去回应这次联系") : t("查看这次联系")}</Link><button onClick={onClose}>{t("关闭")}</button></div>
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
