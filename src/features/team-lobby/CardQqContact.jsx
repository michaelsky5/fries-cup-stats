import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { requestSignIn } from '../auth/signInRequest.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useLobbyMine } from './useLobbyState.js'
import { lobbyText as t } from './lobbyCopy.js'
import { accountFailure, leavesLobbyPage, lobbyReadFailure, retryableRead, uncertainWrite } from './lobbyModel.js'
import { createCardContact } from './lobbyApi.js'
import { contactPurpose } from './lobbyQq.js'
import QqAccess from './QqAccess.jsx'
import styles from './Lobby.module.css'

export default function CardQqContact({ card }) {
  useUiLocale()
  const { user, isBootstrapping } = useAuth(), { data, error, refresh } = useLobbyMine()
  const [open, setOpen] = useState(false)
  if (isBootstrapping) return <p role="status">{t('正在读取账号…')}</p>
  if (!user) return <><h2>{t('联系 TA')}</h2><p>{t('登录并验证邮箱后即可联系，无需先建队。')}</p><button type="button" className={styles.primary} onClick={requestSignIn}>{t('登录／注册后继续')}</button></>
  if (!user.emailVerifiedAt) return <><h2>{t('先验证邮箱')}</h2><Link to={`/account/verify-email?returnTo=${encodeURIComponent(`/lobby/cards/${card.publicId}`)}`}>{t('验证后继续联系')}</Link></>
  if (error) return <p role="alert">{lobbyReadFailure(error)}{retryableRead(error) && <button onClick={refresh}>{t('重新读取')}</button>}</p>
  if (!data) return <p role="status">{t('正在读取联系权限…')}</p>
  const own = data.cards.some(item => item.publicId === card.publicId), direct = card.qqMode === 'VERIFIED'
  return <><h2>{own ? t('这是你的需求卡') : t('联系 TA')}</h2>
    {own ? <Link to="/lobby/me?tab=cards">{t('管理卡片与 QQ')}</Link> : <>
      <p>{direct ? t('对方已允许已验证用户查看 QQ。查看后，对方会收到你的身份通知。') : t('对方会收到你的查看请求，同意后即可查看 QQ。')}</p>
      <p className={styles.finePrint}>{t('个人组队、帮队伍找人都可以，无需负责人身份。')}</p>
      {data.canWrite && data.config.contactEnabled ? <button className={styles.primary} onClick={() => setOpen(true)}>{direct ? t('查看 QQ 并通知对方') : t('请求查看 QQ')}</button>
        : <p>{data.restriction || t('联系功能当前不可操作，已有记录仍保留。')}</p>}
      <p><Link to="/lobby/me?tab=contacts">{t('查看我的联系记录')}</Link></p>
    </>}{open && <ContactForm key={card.publicId} card={card} direct={direct} onClose={() => setOpen(false)} />}
  </>
}

function ContactForm({ card, direct, onClose }) {
  const dialog = useRef(null), operationId = useRef(crypto.randomUUID()), locked = useRef(false)
  const [purpose, setPurpose] = useState(card.kind === 'TEAM' ? 'JOINING' : 'FORMING'), [contextName, setContextName] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [error, setError] = useState(null), [result, setResult] = useState(null), [discard, setDiscard] = useState(false)
  const dirty = !result && Boolean(contextName || message || purpose !== (card.kind === 'TEAM' ? 'JOINING' : 'FORMING'))
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && leavesLobbyPage(currentLocation, nextLocation))
  const alertRef = useRef(null)
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close() }, [])
  useEffect(() => { if (error) alertRef.current?.focus() }, [error])
  useEffect(() => {
    if (!dirty) return undefined
    const before = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before)
  }, [dirty])
  function close() { if (!busy) { if (dirty) setDiscard(true); else onClose() } }
  async function submit(event) {
    event.preventDefault(); if (locked.current) return
    locked.current = true; setBusy(true); setError(null)
    try { const value = await createCardContact(card.publicId, { operationId: operationId.current, purpose, contextName: purpose === 'RECRUITING' ? contextName.trim() : '', message: message.trim(), acknowledge: true }); setResult(value.contact); setMessage(''); setContextName('') }
    catch (failure) { setError(failure) }
    finally { locked.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className={styles.contactDialog} aria-labelledby="card-qq-title" onCancel={event => { event.preventDefault(); close() }}>
    <div className={styles.dialogHeader}><h2 id="card-qq-title">{t('联系')} {card.title}</h2><button type="button" disabled={busy} onClick={close} aria-label={t('关闭联系表单')}>×</button></div>
    {error && <p ref={alertRef} tabIndex={-1} role="alert" className={styles.error}>{accountFailure(error)}{uncertainWrite(error) && <> <Link to="/lobby/me?tab=sent">{t('先核对已发记录')}</Link></>}</p>}
    {(discard || blocker.state === 'blocked') && <div role="alert" className={styles.notice}><p>{t('放弃未发送的联系说明？')}</p><button onClick={() => { setDiscard(false); blocker.reset?.() }}>{t('继续填写')}</button><button onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); else onClose() }}>{t('放弃并关闭')}</button></div>}
    {result ? <div className={styles.stack}>
      <h3>{result.canReadQq ? t('可以查看对方 QQ') : result.status === 'PENDING' ? t('等待对方同意') : t('组队联系状态已更新')}</h3>
      <p>{contactPurpose(result.purpose, t)}{result.contextName ? ` · ${result.contextName}` : ''}</p>
      {result.canReadQq ? <QqAccess id={result.id} autoReveal /> : <p>{t('请在联系记录查看进度；重复提交会沿用已有的有效请求。')}</p>}
      <Link to={`/lobby/me?tab=sent&requestId=${result.id}`}>{t('查看这次联系')}</Link><button onClick={onClose}>{t('关闭')}</button>
    </div> : <form className={styles.stack} onSubmit={submit}>
      <label>{t('联系来意')}<select aria-label={t('联系来意')} value={purpose} onChange={event => setPurpose(event.target.value)} disabled={busy}>{['FORMING', 'RECRUITING', 'JOINING'].map(value => <option key={value} value={value}>{contactPurpose(value, t)}</option>)}</select></label>
      {purpose === 'RECRUITING' && <label>{t('队伍名称（本人说明，可选）')}<input aria-label={t('队伍名称（本人说明，可选）')} value={contextName} onChange={event => setContextName(event.target.value)} maxLength={60} disabled={busy} /><small>{t('队名由你填写，不代表已取得队伍管理权限。')}</small></label>}
      <label>{t('想说的话（可选）')}<textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={500} rows={3} disabled={busy} /><small>{t('请勿在留言中填写私人联系方式。')}</small></label>
      <p className={styles.finePrint}>{t('提交后，对方会看到你的账号名称、联系来意和说明。')}</p>
      <button className={styles.primary} disabled={busy}>{busy ? t('正在保存…') : direct ? t('确认查看 QQ') : t('发送查看请求')}</button>
      <p className={styles.finePrint}>{t('联系不改变正式队伍名单；本次无需填写你的 QQ。')}</p>
    </form>}
  </dialog>
}
