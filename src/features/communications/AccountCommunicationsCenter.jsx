import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  acknowledgeAnnouncement,
  addAppealEvidence,
  createAppeal,
  fetchCommunicationCenter,
  markAllNotificationsRead,
  markAnnouncementRead,
  markNotificationRead,
  withdrawAppeal
} from './communicationApi.js'
import styles from './AccountCommunicationsCenter.module.css'
import {
  localizeWorkflowText,
  notificationTypeLabel,
  resolveNotificationActionUrl
} from '../tasks/taskNotificationModel.js'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  resolveCapabilityAccess
} from '../capabilities/capabilityUi.js'
import { buildCommunicationCenterView } from './communicationCenterModel.js'

const SEVERITY = { NORMAL: '普通公告', IMPORTANT: '重要公告', URGENT: '紧急公告', ACTION: '行动公告' }
const MESSAGE_PRIORITY = { LOW: '一般', NORMAL: '普通', HIGH: '重要', IMPORTANT: '重要', URGENT: '紧急' }
const APPEAL_STATUS = {
  OPEN: '待受理', TRIAGED: '已受理', UNDER_REVIEW: '审核中', AWAITING_EVIDENCE: '待补证',
  RESOLVED: '已裁定', REJECTED: '已驳回', WITHDRAWN: '已撤回'
}
const APPEAL_TYPES = [
  ['SCORE', '比分争议'], ['DATA', '出场数据'], ['RULE', '规则争议'], ['ELIGIBILITY', '选手资格违规'],
  ['IMPERSONATION', '冒名参赛'], ['CONDUCT', '严重行为'], ['OTHER', '其他']
]

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(value))
}

function teamName(team) {
  return team?.shortName || team?.name || 'TBD'
}

const EMPTY_APPEAL = { matchId: '', type: 'SCORE', description: '', evidenceType: 'LINK', evidenceDescription: '', evidenceUrl: '' }
const EMPTY_EVIDENCE = { evidenceType: 'LINK', description: '', url: '' }

function MessageCard({ notification, busy, onRead, withSeason }) {
  const uiLocale = useUiLocale()
  const actionUrl = resolveNotificationActionUrl(notification.resolvedActionUrl, withSeason)
  return (
    <article className={styles.message} data-priority={notification.priority} data-unread={!notification.readAt}>
      <div className={styles.rail} />
      <div className={styles.messageMain}>
        <div className={styles.messageMeta}>
          <span>{notification.readState.label}</span>
          <em>{MESSAGE_PRIORITY[notification.priority] || notification.priority}</em>
          <b>{notificationTypeLabel(notification.notificationType)}</b>
          {notification.teamOrganization?.shortName || notification.teamOrganization?.name ? <b>{notification.teamOrganization.shortName || notification.teamOrganization.name}</b> : null}
          {notification.emailDelivery ? <b>{uiText("邮件 ", uiLocale)}{localizeWorkflowText(notification.emailDelivery.status)}</b> : null}
        </div>
        <h3>{localizeWorkflowText(notification.title)}</h3>
        <p>{localizeWorkflowText(notification.body)}</p>
        <small>{formatTime(notification.visibleAt)}</small>
      </div>
      <div className={styles.messageActions}>
        {actionUrl ? <Link to={actionUrl} onClick={() => onRead(notification)}>{uiText("查看详情", uiLocale)}</Link> : null}
        {!notification.readAt ? <button type="button" disabled={Boolean(busy)} onClick={() => onRead(notification)}>{uiText("标为已读", uiLocale)}</button> : <span>{uiText("已归档", uiLocale)}</span>}
      </div>
    </article>
  )
}

function MessageHero({ notification, busy, onRead, withSeason }) {
  const uiLocale = useUiLocale()
  const actionUrl = resolveNotificationActionUrl(notification.resolvedActionUrl, withSeason)
  return (
    <section className={styles.messageHero} data-priority={notification.priority} data-unread={!notification.readAt}>
      <div className={styles.messageHeroMain}>
        <div className={styles.messageHeroMeta}>
          <span>{notification.category.eyebrow}</span>
          <em>{notification.readState.label}</em>
        </div>
        <strong>{localizeWorkflowText(notification.title)}</strong>
        <p>{localizeWorkflowText(notification.body)}</p>
        <small>{notification.readAt ? uiText("最近一条消息", uiLocale) : uiText("当前优先阅读", uiLocale)} · {formatTime(notification.visibleAt)}</small>
        <div className={styles.messageHeroActions}>
          {actionUrl ? <Link to={actionUrl} onClick={() => onRead(notification)}>{uiText("查看详情 →", uiLocale)}</Link> : null}
          {!notification.readAt ? <button type="button" disabled={Boolean(busy)} onClick={() => onRead(notification)}>{uiText("标为已读", uiLocale)}</button> : null}
        </div>
      </div>
      <div className={styles.messageHeroSide}>
        <span>{notification.readAt ? 'LATEST UPDATE' : 'READ NEXT'}</span>
        <strong>{notification.category.label}</strong>
        <em>{MESSAGE_PRIORITY[notification.priority] || notification.priority}</em>
        <p>{notification.teamOrganization?.shortName || notification.teamOrganization?.name || notificationTypeLabel(notification.notificationType)}</p>
      </div>
    </section>
  )
}

export default function AccountCommunicationsCenter({ seasonId, capabilitySnapshot = null, standalone = false, withSeason = null, onSummaryChange = null }) {
  const uiLocale = useUiLocale()
  const [searchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const [tab, setTab] = useState(['messages', 'announcements', 'appeals'].includes(requestedView) ? requestedView : searchParams.get('appeal') ? 'appeals' : 'messages')
  const [notifications, setNotifications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [appeals, setAppeals] = useState([])
  const [appealOptions, setAppealOptions] = useState([])
  const [appealForm, setAppealForm] = useState(EMPTY_APPEAL)
  const [evidenceAppealId, setEvidenceAppealId] = useState('')
  const [evidenceForm, setEvidenceForm] = useState(EMPTY_EVIDENCE)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await fetchCommunicationCenter(seasonId)
      setNotifications(data.notifications); setAnnouncements(data.announcements); setAppeals(data.appeals); setAppealOptions(data.appealOptions)
      setAppealForm(current => ({ ...current, matchId: data.appealOptions.some(item => item.id === current.matchId) ? current.matchId : data.appealOptions[0]?.id || '' }))
    } catch (loadError) { setError(loadError?.message || '公告与申诉状态暂时无法同步。') }
    finally { setLoading(false) }
  }, [seasonId])

  useEffect(() => { load() }, [load])

  const messageView = useMemo(() => buildCommunicationCenterView(notifications), [notifications])
  const unreadMessageCount = messageView.summary.unread
  const unreadAnnouncementCount = useMemo(() => announcements.filter(item => !item.receipt?.readAt).length, [announcements])
  const activeAppeals = useMemo(() => appeals.filter(item => !['RESOLVED', 'REJECTED', 'WITHDRAWN'].includes(item.status)).length, [appeals])
  const selectedAppealOption = useMemo(
    () => appealOptions.find(item => item.id === appealForm.matchId) || appealOptions[0] || null,
    [appealForm.matchId, appealOptions]
  )
  const appealCreateAccess = resolveCapabilityAccess(capabilitySnapshot, 'appeal.create', {
    registrationId: selectedAppealOption?.representation?.registrationId,
    matchId: selectedAppealOption?.id
  })

  useEffect(() => {
    if (loading) return
    onSummaryChange?.({ unreadNotificationCount: unreadMessageCount })
  }, [loading, onSummaryChange, unreadMessageCount])

  const updateReceipt = (id, receipt) => setAnnouncements(current => current.map(item => item.id === id ? { ...item, receipt } : item))

  const readNotification = async notification => {
    if (notification.readAt) return
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
    try { await markNotificationRead(notification.id) }
    catch (actionError) { setError(actionError?.message || '消息阅读状态同步失败。'); await load() }
  }

  const readAllNotifications = async () => {
    setBusy('read-all-messages')
    try {
      await markAllNotificationsRead(seasonId)
      setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
    } catch (actionError) { setError(actionError?.message || '消息阅读状态同步失败。') }
    finally { setBusy('') }
  }

  const readAnnouncement = async announcement => {
    if (announcement.receipt?.readAt) return
    setBusy(`read:${announcement.id}`)
    try { updateReceipt(announcement.id, await markAnnouncementRead(announcement.id)) }
    catch (actionError) { setError(actionError?.message || '阅读状态同步失败。') }
    finally { setBusy('') }
  }

  const acknowledge = async announcement => {
    setBusy(`ack:${announcement.id}`)
    try { updateReceipt(announcement.id, await acknowledgeAnnouncement(announcement.id)) }
    catch (actionError) { setError(actionError?.message || '公告确认失败。') }
    finally { setBusy('') }
  }

  const submitAppeal = async event => {
    event.preventDefault(); setBusy('create-appeal'); setError('')
    try {
      await createAppeal(appealForm.matchId, {
        type: appealForm.type,
        description: appealForm.description,
        evidence: [{
          evidenceType: appealForm.evidenceType,
          description: appealForm.evidenceDescription,
          url: appealForm.evidenceType === 'LINK' ? appealForm.evidenceUrl : null
        }]
      })
      setAppealForm(EMPTY_APPEAL); await load(); setTab('appeals')
    } catch (actionError) { setError(capabilityDeniedMessage(actionError) || actionError?.message || '申诉提交失败。') }
    finally { setBusy('') }
  }

  const supplementEvidence = async (event, appeal) => {
    event.preventDefault(); setBusy(`evidence:${appeal.id}`); setError('')
    try {
      await addAppealEvidence(appeal.id, [{ ...evidenceForm, url: evidenceForm.evidenceType === 'LINK' ? evidenceForm.url : null }])
      setEvidenceAppealId(''); setEvidenceForm(EMPTY_EVIDENCE); await load()
    } catch (actionError) { setError(actionError?.message || '证据补充失败。') }
    finally { setBusy('') }
  }

  const withdraw = async appeal => {
    setBusy(`withdraw:${appeal.id}`); setError('')
    try { await withdrawAppeal(appeal.id); await load() }
    catch (actionError) { setError(actionError?.message || '申诉撤回失败。') }
    finally { setBusy('') }
  }

  return (
    <section className={`${styles.center} ${standalone ? styles.standalone : ''}`}>
      <header className={styles.header}><div><span>EVENT COMMUNICATIONS</span><h2>{uiText("赛事消息", uiLocale)}</h2><p>{uiText("流程结果、定向公告和正式比赛申诉集中留档，但不会混入需要操作的任务队列。", uiLocale)}</p></div><button type="button" onClick={load} disabled={loading}>{loading ? uiText("同步中", uiLocale) : uiText("刷新消息", uiLocale)}</button></header>
      <div className={styles.tabs} role="tablist" aria-label={uiText("赛事消息分类", uiLocale)}>
        <button type="button" role="tab" aria-selected={tab === 'messages'} data-active={tab === 'messages'} onClick={() => setTab('messages')}><span>{uiText("流程消息", uiLocale)}</span><em>{unreadMessageCount}</em></button>
        <button type="button" role="tab" aria-selected={tab === 'announcements'} data-active={tab === 'announcements'} onClick={() => setTab('announcements')}><span>{uiText("赛事公告", uiLocale)}</span><em>{unreadAnnouncementCount}</em></button>
        <button type="button" role="tab" aria-selected={tab === 'appeals'} data-active={tab === 'appeals'} onClick={() => setTab('appeals')}><span>{uiText("比赛申诉", uiLocale)}</span><em>{activeAppeals}</em></button>
      </div>
      {error ? <div className={styles.error}><strong>{uiText("操作没有完成", uiLocale)}</strong><span>{error}</span></div> : null}
      {loading && !notifications.length && !announcements.length && !appeals.length ? <div className={styles.empty}>{uiText("正在同步账号消息、赛事公告与申诉状态…", uiLocale)}</div> : null}

      {tab === 'messages' && (!loading || notifications.length) ? (
        <div className={styles.messagePanel}>
          {messageView.primaryNotification ? <MessageHero notification={messageView.primaryNotification} busy={busy} onRead={readNotification} withSeason={withSeason} /> : null}

          {messageView.notifications.length ? <section className={styles.messageFacts} aria-label={uiText("流程消息摘要", uiLocale)}>
            {messageView.facts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}
          </section> : null}

          <section className={styles.communicationBoundary} aria-label={uiText("消息与任务的分工", uiLocale)}>
            <div><span>INFORMATION</span><strong>{uiText("这里记录结果与变化", uiLocale)}</strong><p>{uiText("报名审核、名单锁定、比赛排期和身份变化都保留在消息记录中。", uiLocale)}</p></div>
            <div><span>ACTION</span><strong>{uiText("需要回应时进入任务中心", uiLocale)}</strong><p>{uiText("邀请、名单确认、转会放行和赛程协商不会被未读消息代替。", uiLocale)}</p><Link to={resolveNotificationActionUrl('/me?section=tasks', withSeason)}>{uiText("前往任务中心 →", uiLocale)}</Link></div>
          </section>

          <div className={styles.messageToolbar}>
            <div><strong>{uiText("其余流程消息", uiLocale)}</strong><p>{uiText("未读优先、重要程度其次，再按发生时间排列；首要消息已经固定在上方。", uiLocale)}</p></div>
            {unreadMessageCount ? <button type="button" disabled={busy === 'read-all-messages'} onClick={readAllNotifications}>{uiText("全部已读", uiLocale)}</button> : null}
          </div>
          {messageView.groups.length ? <div className={styles.messageGroups}>{messageView.groups.map(group => (
            <section className={styles.messageGroup} key={group.key} data-category={group.key}>
              <header><div><span>{group.eyebrow}</span><strong>{group.label}</strong><p>{group.description}</p></div><em>{group.notifications.length}</em></header>
              <div className={styles.list}>{group.notifications.map(notification => <MessageCard key={notification.id} notification={notification} busy={busy} onRead={readNotification} withSeason={withSeason} />)}</div>
            </section>
          ))}</div> : messageView.primaryNotification ? <div className={styles.messageComplete}><span>ONE UPDATE</span><strong>{uiText("当前只有上方这一条消息", uiLocale)}</strong><p>{uiText("阅读后仍会保留在这里，不会因为已读而消失。", uiLocale)}</p></div> : <div className={styles.empty}><strong>{uiText("目前没有流程消息", uiLocale)}</strong><p>{uiText("报名、阵容、身份、赛程和竞猜状态变化后会显示在这里。", uiLocale)}</p></div>}
        </div>
      ) : null}

      {tab === 'announcements' && (!loading || announcements.length) ? <div className={styles.list}>{announcements.length ? announcements.map(announcement => <article className={styles.announcement} data-severity={announcement.severity} data-unread={!announcement.receipt?.readAt} key={announcement.id}><div className={styles.rail} /><header><div><span>{SEVERITY[announcement.severity]} · V{announcement.currentVersion.version}</span><h3>{announcement.currentVersion.title}</h3></div><b>{announcement.receipt?.acknowledgedAt ? uiText("已确认", uiLocale) : announcement.receipt?.readAt ? uiText("已读", uiLocale) : uiText("未读", uiLocale)}</b></header><p>{announcement.currentVersion.body}</p><footer><div><span>{uiText("发布 ", uiLocale)}{formatTime(announcement.publishedAt)}</span>{announcement.dueAt ? <span>{uiText("截止 ", uiLocale)}{formatTime(announcement.dueAt)}</span> : null}</div><div>{!announcement.receipt?.readAt ? <button type="button" disabled={Boolean(busy)} onClick={() => readAnnouncement(announcement)}>{uiText("标为已读", uiLocale)}</button> : null}{announcement.requiresAcknowledgement && !announcement.receipt?.acknowledgedAt ? <button className={styles.primary} type="button" disabled={Boolean(busy)} onClick={() => acknowledge(announcement)}>{uiText("确认已阅读", uiLocale)}</button> : null}{announcement.actionUrl ? <Link to={resolveNotificationActionUrl(announcement.actionUrl, withSeason)} onClick={() => readAnnouncement(announcement)}>{uiText("前往处理", uiLocale)}</Link> : null}</div></footer></article>) : <div className={styles.empty}><strong>{uiText("目前没有发给你的赛事公告", uiLocale)}</strong><p>{uiText("队伍、身份或全赛事公告发布后会显示在这里。", uiLocale)}</p></div>}</div> : null}

      {tab === 'appeals' && (!loading || appeals.length || appealOptions.length) ? <div className={styles.appealPanel}>
        {appealOptions.length && appealCreateAccess.allowed ? <form className={styles.appealForm} onSubmit={submitAppeal}><header><span>NEW MATCH APPEAL</span><h3>{uiText("提交正式比赛申诉", uiLocale)}</h3><p>{uiText("账号资格与本场代表关系已确认；普通争议仍须在赛果发布后 2 小时内完成。", uiLocale)}</p></header><label className={styles.wide}><span>{uiText("比赛", uiLocale)}</span><select required value={appealForm.matchId} onChange={event => setAppealForm(current => ({ ...current, matchId: event.target.value }))}>{appealOptions.map(match => <option key={match.id} value={match.id}>{teamName(match.teamA)} VS {teamName(match.teamB)} · {match.displayName}{uiText(" · 代表身份 ", uiLocale)}{match.representation.role}</option>)}</select></label><label><span>{uiText("申诉类型", uiLocale)}</span><select value={appealForm.type} onChange={event => setAppealForm(current => ({ ...current, type: event.target.value }))}>{APPEAL_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>{uiText("首项证据类型", uiLocale)}</span><select value={appealForm.evidenceType} onChange={event => setAppealForm(current => ({ ...current, evidenceType: event.target.value }))}><option value="LINK">{uiText("链接", uiLocale)}</option><option value="TEXT">{uiText("文字说明", uiLocale)}</option></select></label><label className={styles.wide}><span>{uiText("事实与申诉请求（至少 20 字）", uiLocale)}</span><textarea required minLength="20" rows="5" value={appealForm.description} onChange={event => setAppealForm(current => ({ ...current, description: event.target.value }))} /></label><label className={styles.wide}><span>{uiText("证据说明", uiLocale)}</span><textarea required minLength="3" rows="3" value={appealForm.evidenceDescription} onChange={event => setAppealForm(current => ({ ...current, evidenceDescription: event.target.value }))} /></label>{appealForm.evidenceType === 'LINK' ? <label className={styles.wide}><span>{uiText("证据链接", uiLocale)}</span><input required type="url" value={appealForm.evidenceUrl} onChange={event => setAppealForm(current => ({ ...current, evidenceUrl: event.target.value }))} /></label> : null}<button className={styles.primary} type="submit" disabled={busy === 'create-appeal' || !appealCreateAccess.allowed}>{busy === 'create-appeal' ? uiText("提交中…", uiLocale) : uiText("提交正式申诉", uiLocale)}</button></form> : <div className={styles.permissionNote}><strong>{appealOptions.length ? uiText("当前账号不能发起正式申诉", uiLocale) : uiText("当前没有可发起申诉的比赛", uiLocale)}</strong><p>{appealOptions.length ? capabilityBlockText(appealCreateAccess) : uiText("只有本场队伍经理、队长或副队长能在赛果发布后发起；已提交过的比赛不会重复出现。", uiLocale)}</p></div>}
        <div className={styles.list}>{appeals.length ? appeals.map(appeal => <article className={styles.appeal} data-blocked={appeal.blocksProgression} key={appeal.id}><header><div><span>{appeal.match.stage} / {appeal.representativeRole}</span><h3>{teamName(appeal.match.teamA)} VS {teamName(appeal.match.teamB)}</h3><p>{appeal.match.displayName}</p></div><b data-status={appeal.status}>{APPEAL_STATUS[appeal.status]}</b></header><div className={styles.flags}><span>{APPEAL_TYPES.find(item => item[0] === appeal.type)?.[1] || appeal.type}</span><span>{appeal.severity === 'SERIOUS' ? uiText("严重违规例外", uiLocale) : uiText("普通时限", uiLocale)}</span>{appeal.blocksProgression ? <strong>{uiText("后续编排已阻塞", uiLocale)}</strong> : null}</div><p className={styles.description}>{appeal.description}</p><div className={styles.evidenceList}><strong>{uiText("已提交证据 ", uiLocale)}{appeal.evidence.length}</strong>{appeal.evidence.map(item => <div key={item.id}><span>{item.evidenceType}</span><p>{item.description}</p>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{uiText("查看证据", uiLocale)}</a> : null}</div>)}</div>{appeal.resolution ? <div className={styles.resolution}><strong>{uiText("最终裁定", uiLocale)}</strong><p>{appeal.resolution}</p></div> : null}{evidenceAppealId === appeal.id ? <form className={styles.evidenceForm} onSubmit={event => supplementEvidence(event, appeal)}><select value={evidenceForm.evidenceType} onChange={event => setEvidenceForm(current => ({ ...current, evidenceType: event.target.value }))}><option value="LINK">{uiText("链接", uiLocale)}</option><option value="TEXT">{uiText("文字说明", uiLocale)}</option></select><textarea required minLength="3" placeholder={uiText("补充证据说明", uiLocale)} value={evidenceForm.description} onChange={event => setEvidenceForm(current => ({ ...current, description: event.target.value }))} />{evidenceForm.evidenceType === 'LINK' ? <input required type="url" placeholder="https://" value={evidenceForm.url} onChange={event => setEvidenceForm(current => ({ ...current, url: event.target.value }))} /> : null}<div><button className={styles.primary} type="submit">{uiText("提交证据", uiLocale)}</button><button type="button" onClick={() => setEvidenceAppealId('')}>{uiText("取消", uiLocale)}</button></div></form> : null}<footer>{appeal.canAddEvidence ? <button type="button" onClick={() => setEvidenceAppealId(appeal.id)}>{uiText("补充证据", uiLocale)}</button> : null}{appeal.canWithdraw ? <button type="button" disabled={Boolean(busy)} onClick={() => withdraw(appeal)}>{uiText("撤回申诉", uiLocale)}</button> : null}</footer></article>) : <div className={styles.empty}><strong>{uiText("尚无正式比赛申诉", uiLocale)}</strong><p>{uiText("提交后可在这里查看受理、补证和最终裁定记录。", uiLocale)}</p></div>}</div>
      </div> : null}
    </section>
  )
}
