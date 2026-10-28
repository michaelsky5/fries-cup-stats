import { lobbyText as t, lobbyNoticeCopy } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { requestSignIn } from '../auth/signInRequest.js'
import { useLobbyMine } from './useLobbyState.js'
import { ContactInbox, FeedbackLink } from './LobbyContacts.jsx'
import CardQqSettings from './CardQqSettings.jsx'
import { accountFailure, lobbyDate, statusLabel, lobbyReadFailure, lobbyRegistrationMessage } from './lobbyModel.js'
import * as api from './lobbyApi.js'
import { revealAlert } from './lobbyFocus.js'
import styles from './Lobby.module.css'
import navStyles from '../../components/navigation/SignalSectionNav.module.css'

const tabs = [['received', '收到的联系'], ['sent', '发出的联系'], ['contacts', '全部联系'], ['cards', '我的卡片'], ['formation', '筹建进度']]
export default function MyLobbyPage() {
  useUiLocale()

  const { user, isBootstrapping, authConfig } = useAuth(), [query, setQuery] = useSearchParams()
  const registrationMessage = lobbyRegistrationMessage(authConfig)
  const { data, error, refresh } = useLobbyMine()
  const [failure, setFailure] = useState(null), [busy, setBusy] = useState(false), lock = useRef(false), alertRef = useRef(null)
  useEffect(() => { if (failure) revealAlert(alertRef.current) }, [failure])
  const tab = tabs.some(([id]) => id === query.get('tab')) ? query.get('tab') : 'cards'
  // 票 2.73: on phones the tab row scrolls; keep the selected tab in view.
  const tabsRef = useRef(null)
  useEffect(() => {
    const row = tabsRef.current, item = row?.querySelector('[aria-pressed="true"]')
    if (!row || !item || row.scrollWidth <= row.clientWidth) return
    const box = row.getBoundingClientRect(), target = item.getBoundingClientRect()
    row.scrollLeft += target.left - box.left - (box.width - target.width) / 2
  }, [tab, data])
  async function act(action) {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure(null)
    try { await action(); refresh() }
    catch (problem) { setFailure(problem); if (problem.status === 409 || problem.data?.outcomeUnknown) refresh() }
    finally { lock.current = false; setBusy(false) }
  }
  if (isBootstrapping) return <p role="status">{t("正在读取账号…")}</p>
  if (!user) return <section className={styles.empty}><h1>{t("登录后管理我的组队")}</h1>{registrationMessage && <p>{registrationMessage}</p>}<button type="button" className={styles.primary} onClick={requestSignIn}>{t("登录／注册")}</button></section>
  return <><div className={styles.pageHeading}><div><h1>{t("我的组队")}</h1><p>{t("联系、卡片和筹建进度，集中在这里处理。")}</p></div>{data?.canWrite && !error && <Link className={styles.primary} to="/lobby/me/publish?type=person">{t("发布／编辑我的求队")}</Link>}</div>
    {(error || failure) && <p ref={alertRef} tabIndex={-1} role="alert" className={styles.error}>{error ? lobbyReadFailure(error) : accountFailure(failure)} <button onClick={() => { setFailure(null); refresh() }}>{t("重新读取")}</button></p>}
    {!data && !error && <p role="status">{t("正在读取本人记录…")}</p>}
    {data && <>
      {!data.canWrite && <p className={styles.notice}>{data.restriction || t("当前账号未验证邮箱或大厅尚不可操作。已有记录保留。")} {!user.emailVerifiedAt && <Link to="/account/verify-email?returnTo=%2Flobby%2Fme">{t("验证本人邮箱")}</Link>}</p>}
      <nav ref={tabsRef} className={`${navStyles.root} ${styles.lobbyTabs}`} aria-label={t("我的组队分类")}>{tabs.map(([id, label]) => <button key={id} type="button" className={navStyles.item} aria-pressed={tab === id} onClick={() => setQuery(current => { current.set('tab', id); current.delete('requestId'); current.delete('contactPage'); return current })}>{t(label)}</button>)}</nav>
      {['received', 'sent', 'contacts'].includes(tab) && <ContactInbox direction={tab === 'contacts' ? 'all' : tab} config={data.config} onChanged={refresh} />}
      {tab === 'cards' && <>
        <div className={styles.sectionHeading}><h2>{t("我的需求卡")}</h2><Link to="/lobby/me/publish?type=team">{t("队伍招募 →")}</Link></div>
        {!data.cards.length && <p className={styles.empty}>{t("还没有发布需求。可以先发布个人求队卡，或申请筹建招募。")}</p>}
        <div className={styles.cards}>{data.cards.map(card => <MyCard key={`${card.id}:${card.revision}`} card={card} canWrite={data.canWrite} busy={busy} act={act} onSaved={refresh} />)}</div>
      </>}
      {tab === 'formation' && <>
        <div className={styles.sectionHeading}><h2>{t("筹建招募进度")}</h2><Link to="/lobby/me/formation">{t("申请筹建招募 →")}</Link></div>
        {!data.formations.length && <p>{t("一个负责人即可申请，无需先有五名队员或报名记录。")}</p>}
        {data.formations.map(item => <article className={styles.progress} key={item.id}><div><h3>{item.name}</h3><p>{statusLabel(item.status)} · {lobbyDate(item.updatedAt)}</p>{item.reviewNote && <p>{item.reviewNote}</p>}</div><div className={styles.actions}>
          {item.status === 'RETURNED' && <Link to={`/lobby/me/formation?id=${item.id}`}>{t("修改并重提")}</Link>}
          {item.status === 'APPROVED' && <Link to={`/lobby/me/publish?type=team&team=${item.teamId}`}>{t("核对并发布招募")}</Link>}
          {['PENDING', 'RETURNED', 'APPROVED'].includes(item.status) && <button disabled={busy} onClick={() => act(() => api.withdrawFormation(item))}>{t("撤回筹建")}</button>}
        </div></article>)}
      </>}
      <details className={styles.noticeList}><summary>{t("大厅消息")}{data.unreadCount ? ` · ${t('{0} 条未读', [data.unreadCount])}` : ''}</summary>
        {!data.notices.length && <p>{t("暂无大厅消息。")}</p>}
        {data.notices.map(item => { const copy = lobbyNoticeCopy(item); return <article className={styles.progress} key={item.id}><div><h3><Link to={item.actionUrl}>{copy.title}</Link></h3><p>{copy.body}</p><small>{lobbyDate(item.createdAt)}</small></div>{!item.readAt && <button disabled={busy} onClick={() => act(() => api.readNotice(item.id))}>{t("标为已读")}</button>}</article> })}
      </details>
      {!query.get('requestId') && <FeedbackLink config={data.config} />}
    </>}
  </>
}

function MyCard({ card, canWrite, busy, act, onSaved }) {
  useUiLocale()

  const [reason, setReason] = useState('PAUSED')
  const offline = ['EXPIRED', 'CLOSED'].includes(card.state)
  // Stored close reasons stay in one language whatever the viewer's language.
  const storedReason = reason === 'PAUSED' ? '暂停需求' : card.kind === 'PERSON' ? '已找到队伍' : '已招满'
  return <article className={styles.card}><div className={styles.cardTop}><span>{card.kind === 'PERSON' ? t("个人求队") : t("队伍招募")}</span><strong>{statusLabel(card.state)}</strong></div>
    <h2>{card.state === 'ACTIVE' ? <Link to={`/lobby/cards/${card.publicId}`}>{card.title}</Link> : card.title}</h2>
    <p>{card.state === 'CLOSED' ? t("已关闭，不在大厅展示") : card.state === 'EXPIRED' ? t("已于 {0} 到期", [lobbyDate(card.expiresAt)]) : <>{t("有效至")} {lobbyDate(card.expiresAt)}</>}</p>{card.moderationReason && <p className={styles.error}>{card.moderationReason}</p>}
    <div className={styles.actions}><Link to={`/lobby/me/cards/${card.id}/edit`}>{t("编辑资料")}</Link>{card.state !== 'HIDDEN' && <button disabled={busy || !canWrite} onClick={() => act(() => api.changeCard(card.id, { action: 'RENEW', revision: card.revision, operationId: crypto.randomUUID() }))}>{offline ? t("重新发布，展示 14 天") : t("确认仍有需求，续期 14 天")}</button>}</div>
    <CardQqSettings card={card} disabled={busy || !canWrite || card.state === 'HIDDEN'} onSaved={onSaved} />
    {card.state !== 'CLOSED' && <div className={styles.closeCard}><label>{t("关闭原因")}<select value={reason} onChange={event => setReason(event.target.value)} disabled={busy}><option value="PAUSED">{t("暂停需求")}</option><option value="FILLED">{card.kind === 'PERSON' ? t("已找到队伍") : t("已招满")}</option></select></label><button disabled={busy} onClick={() => act(() => api.changeCard(card.id, { action: 'CLOSE', reason: storedReason, revision: card.revision, operationId: crypto.randomUUID() }))}>{t("关闭需求")}</button></div>}
  </article>
}
