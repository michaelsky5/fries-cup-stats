import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { platformRequest } from '../auth/platformApi.js'
import { RegistrationDraftGuard, useRegistrationDraft, useRegistrationDraftActions } from './registrationDraftGuard.jsx'
import styles from './SeasonParticipationPage.module.css'
import AccountFrame from '../account-ui/AccountFrame.jsx'

const statusLabels = { DRAFT: '报名草稿', RETURNED: '需要修改', SUBMITTED: '等待审核', APPROVED: '审核通过', WITHDRAWN: '已撤回', INVITED: '等待本人确认', CONFIRMED: '本人已确认' }
const emptyTeam = { name: '', shortName: '', contact: '', note: '', kind: 'LONG_TERM', organizationId: '' }
const emptyPlayer = { displayName: '', email: '', battleTag: '', role: 'UNKNOWN' }
const roleLabels = { TANK: '坦克', DPS: '输出', SUP: '支援', FLEX: '自由人', UNKNOWN: '待确定' }
const path = seasonId => `/seasons/${encodeURIComponent(seasonId)}/registration`

export default function SeasonParticipationPage() {
  const { seasonId } = useParams()
  const location = useLocation()
  return <RegistrationDraftGuard><ParticipationPage key={`${seasonId}:${location.key}:${location.hash}`} seasonId={seasonId} /></RegistrationDraftGuard>
}

function ParticipationPage({ seasonId }) {
  const uiLocale = useUiLocale()
  const { confirmDiscard } = useRegistrationDraftActions()
  const { user, isBootstrapping, logout } = useAuth()
  const [invitationToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invitation') || '')
  return <AccountFrame title={uiText("赛事报名", uiLocale)} eyebrow="EVENT REGISTRATION" description={uiText("组建本队名单，确认后提交赛事负责人审核。", uiLocale)}><div className={styles.page}>
    <header className={styles.header}>
      <div><span>{uiText("参赛账号", uiLocale)}</span><strong>{user?.displayName || uiText("等待登录", uiLocale)}</strong></div>
      <div className={styles.actions}>{user ? <><button type="button" onClick={async () => { if (await confirmDiscard()) await logout() }}>{uiText("退出账号", uiLocale)}</button></> : null}<Link to="/me">{uiText("我的空间", uiLocale)}</Link></div>
    </header>
    {invitationToken ? <Invitation key={invitationToken} token={invitationToken} seasonId={seasonId} />
      : isBootstrapping ? <p role="status">{uiText("正在确认登录状态…", uiLocale)}</p>
        : user ? <Workspace key={`${user.id}:${seasonId}`} user={user} seasonId={seasonId} /> : <Login />}
  </div></AccountFrame>
}

function Login() {
  const uiLocale = useUiLocale()
  return <section className={styles.login}><span className={styles.kicker}>JOIN THE COMPETITION</span><h2>{uiText("从你的参赛账号开始", uiLocale)}</h2><p>{uiText("已有账号可使用受邀邮箱登录。首次参加，请打开赛事负责人或队长提供的邀请链接。", uiLocale)}</p><button type="button" className={styles.primary} onClick={() => window.dispatchEvent(new Event('fries-cup:open-account'))}>{uiText("登录参赛账号 →", uiLocale)}</button></section>
}

function Invitation({ token, seasonId }) {
  const uiLocale = useUiLocale()
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    // The token is used only in request bodies and this page's memory.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    const controller = new AbortController()
    setError('')
    platformRequest('/auth/participation-invitations/preview', { method: 'POST', body: { token }, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        if (result.invitation.seasonId !== seasonId) throw new Error('邀请所属赛季与当前页面不一致，请重新打开完整链接。')
        setInvitation(result.invitation)
      }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [token, seasonId, attempt])
  async function accept(event) {
    event.preventDefault()
    if (lock.current) return
    const form = new FormData(event.currentTarget)
    if (invitation.passwordMode === 'SET' && form.get('password') !== form.get('confirmation')) { setError('两次输入的密码不一致。'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await platformRequest('/auth/participation-invitations/accept', { method: 'POST', body: { token, password: form.get('password'), consent: form.get('consent') === 'on' } })
      if (!result.accepted || result.seasonId !== seasonId) throw new Error('邀请确认响应异常，请重新登录查看状态。')
      window.location.assign(`/participate/${encodeURIComponent(seasonId)}`)
    } catch (failure) { setError(failure.message); lock.current = false; setBusy(false) }
  }
  return <section className={styles.login}><h2>{invitation?.kind === 'PLAYER' ? uiText("确认加入报名名单", uiLocale) : uiText("接受赛事邀请", uiLocale)}</h2>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!invitation ? <><p role="status">{error ? uiText("可重新核对；若邀请已失效，请联系邀请人。", uiLocale) : uiText("正在核对邀请…", uiLocale)}</p>{error && <button onClick={() => setAttempt(value => value + 1)}>{uiText("重新核对邀请", uiLocale)}</button>}</> : <>
      <p><strong>{invitation.seasonName}</strong> · {invitation.maskedEmail}</p>
      {invitation.kind === 'PLAYER' ? <p>{invitation.teamName}{uiText(" 邀请你以 ", uiLocale)}<strong>{invitation.displayName} · {invitation.battleTag}</strong>{uiText(" 参加报名。确认前请核对本人资料，报名仍需赛事负责人审核。", uiLocale)}</p> : <p>{uiText("接受后可以创建队伍报名、邀请选手本人确认，再提交审核。", uiLocale)}</p>}
      <form onSubmit={accept}>
        <label>{invitation.passwordMode === 'SET' ? uiText("设置账号密码（至少 12 位）", uiLocale) : uiText("受邀账号的现有密码", uiLocale)}<input name="password" type="password" autoComplete={invitation.passwordMode === 'SET' ? 'new-password' : 'current-password'} minLength={invitation.passwordMode === 'SET' ? 12 : 1} required /></label>
        {invitation.passwordMode === 'SET' && <label>{uiText("再次输入密码", uiLocale)}<input name="confirmation" type="password" autoComplete="new-password" required /></label>}
        <label className={styles.check}><input name="consent" type="checkbox" required />{invitation.kind === 'PLAYER' ? uiText("以上选手资料属于本人，我同意加入该队伍的本赛季报名。", uiLocale) : uiText("我将使用本人账号负责队伍报名。", uiLocale)}</label>
        <button className={styles.primary} disabled={busy}>{busy ? uiText("正在确认…", uiLocale) : uiText("本人确认并进入报名", uiLocale)}</button>
      </form>
    </>}
  </section>
}

function Workspace({ user, seasonId }) {
  const uiLocale = useUiLocale()
  const { confirmDiscard } = useRegistrationDraftActions()
  const [workspace, setWorkspace] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [link, setLink] = useState(null)
  const mutation = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    platformRequest(`${path(seasonId)}/me`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setWorkspace(data); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [seasonId, version])
  async function perform(suffix, body, method = 'POST', savingDraftLabel) {
    if (mutation.current) return false
    mutation.current = true
    if (suffix.startsWith('/drafts') && !await confirmDiscard({ exceptLabels: savingDraftLabel ? [savingDraftLabel] : [] })) { mutation.current = false; return false }
    setBusy(true); setError(''); setLink(null)
    try {
      const result = await platformRequest(path(seasonId) + suffix, { method, body })
      if (result.invitation?.activationUrl) setLink(result.invitation)
      setVersion(current => current + 1)
      return true
    } catch (failure) { setError(failure.message); return false } finally { mutation.current = false; setBusy(false) }
  }
  if (!workspace) return <section className={styles.panel}>{error ? <p role="alert" className={styles.error}>{error}</p> : <p role="status">{uiText("正在读取本赛季报名…", uiLocale)}</p>}<button type="button" onClick={() => setVersion(value => value + 1)}>{uiText("重新读取", uiLocale)}</button></section>
  const ownerRegistration = workspace.registrations.find(item => item.ownerUserId === user.id && item.status !== 'WITHDRAWN')
  return <>
    <div className={styles.context}><div><span>{uiText("当前赛季", uiLocale)}</span><strong>{workspace.season.name}</strong></div><div><span>{uiText("报名人数", uiLocale)}</span><strong>{workspace.policy.rosterMin}–{workspace.policy.rosterMax}{uiText(" 人", uiLocale)}</strong></div><div><span>{uiText("报名截止", uiLocale)}</span><strong>{workspace.policy.closesAt ? new Date(workspace.policy.closesAt).toLocaleString() : uiText("以赛事通知为准", uiLocale)}</strong></div><span>{workspace.canWrite ? uiText("报名开放", uiLocale) : uiText("当前只读", uiLocale)}</span></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {link && <InvitationLink invitation={link} />}
    {workspace.notices.some(item => item.requiresAck && !item.acknowledgedAt) && <section className={styles.panel}><h2>{uiText("需要确认", uiLocale)}</h2>{workspace.notices.filter(item => item.requiresAck && !item.acknowledgedAt).map(item => <div className={styles.notice} key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p></div><button disabled={busy} onClick={() => perform(`/notices/${item.id}/acknowledge`, {})}>{uiText("我已知悉", uiLocale)}</button></div>)}</section>}
    {!ownerRegistration && workspace.canCreate && <TeamForm organizations={workspace.organizations} busy={busy} onSave={input => perform('/drafts', input, 'POST', '队伍报名资料')} />}
    {workspace.registrations.map(record => <Registration key={`${record.id}:${record.revision}`} record={record} userId={user.id} owner={record.ownerUserId === user.id} canWrite={workspace.canWrite} busy={busy} perform={perform} onRefresh={async () => { if (await confirmDiscard()) setVersion(value => value + 1) }} />)}
    {!workspace.registrations.length && !workspace.canWrite && <section className={styles.panel}><h2>{uiText("尚无报名", uiLocale)}</h2><p>{uiText("本赛季报名当前没有开放，请等待赛事负责人通知。", uiLocale)}</p></section>}
    {workspace.notices.length > 0 && <details className={styles.panel}><summary>{uiText("报名通知 · ", uiLocale)}{workspace.notices.length}</summary>{workspace.notices.map(item => <div className={styles.notice} key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</details>}
  </>
}

function InvitationLink({ invitation }) {
  const uiLocale = useUiLocale()
  const [copied, setCopied] = useState(false)
  return <section className={styles.panel} aria-live="polite"><strong>{uiText("已为 ", uiLocale)}{invitation.email}{uiText(" 生成邀请", uiLocale)}</strong><p>{invitation.emailDelivery?.delivered ? uiText("邀请邮件已交给投递服务。", uiLocale) : uiText("邮件未送达，请将下方链接私下交给这名受邀者。", uiLocale)}{uiText("链接有效期至 ", uiLocale)}{new Date(invitation.expiresAt).toLocaleString()}。</p><div className={styles.actions}><input aria-label={uiText("本次邀请链接", uiLocale)} value={invitation.activationUrl} readOnly /><button onClick={async () => { try { await navigator.clipboard.writeText(invitation.activationUrl); setCopied(true) } catch { setCopied(false) } }}>{copied ? uiText("已复制", uiLocale) : uiText("复制邀请", uiLocale)}</button></div></section>
}

function TeamForm({ organizations = [], record, busy, onSave }) {
  const uiLocale = useUiLocale()
  const [form, setForm] = useState(record ? { name: record.name, shortName: record.shortName, contact: record.contact, note: record.note } : emptyTeam)
  const [dirty, setDirty] = useState(false)
  useRegistrationDraft(dirty, { label: uiText("队伍报名资料", uiLocale), busy: dirty && busy, discard: () => { setForm(record ? { name: record.name, shortName: record.shortName, contact: record.contact, note: record.note } : emptyTeam); setDirty(false) } })
  function set(field, value) { setForm(current => ({ ...current, [field]: value })); setDirty(true) }
  return <section className={styles.panel}><h2>{record ? uiText("修改报名资料", uiLocale) : uiText("创建队伍报名", uiLocale)}</h2><form onSubmit={async event => { event.preventDefault(); if (await onSave({ ...form, ...(form.organizationId ? {} : !record ? { organizationId: undefined } : {}), ...(record ? { revision: record.revision } : {}) })) setDirty(false) }}>
    {!record && organizations.length > 0 && <label>{uiText("复用长期队伍", uiLocale)}<select value={form.organizationId} onChange={event => { const organization = organizations.find(item => item.id === event.target.value); setForm(current => ({ ...current, organizationId: event.target.value, ...(organization ? { name: organization.name, shortName: organization.shortName } : {}) })); setDirty(true) }}><option value="">{uiText("创建新的队伍", uiLocale)}</option>{organizations.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
    <div className={styles.fields}><label>{uiText("队伍名称", uiLocale)}<input value={form.name} required minLength={2} maxLength={80} onChange={event => set('name', event.target.value)} /></label><label>{uiText("队伍简称", uiLocale)}<input value={form.shortName} required maxLength={24} onChange={event => set('shortName', event.target.value)} /></label>
      {!record && <label>{uiText("队伍类型", uiLocale)}<select value={form.kind} onChange={event => set('kind', event.target.value)} disabled={Boolean(form.organizationId)}><option value="LONG_TERM">{uiText("长期队伍", uiLocale)}</option><option value="TEMPORARY">{uiText("本赛季临时队伍", uiLocale)}</option></select></label>}
      <label>{uiText("负责人联系方式", uiLocale)}<input value={form.contact} required minLength={3} maxLength={240} placeholder={uiText("QQ 或 Discord，仅供赛事管理使用", uiLocale)} onChange={event => set('contact', event.target.value)} /></label></div>
    <label>{uiText("报名备注", uiLocale)}<textarea value={form.note} maxLength={1000} rows={2} onChange={event => set('note', event.target.value)} /></label>
    <button className={styles.primary} disabled={busy}>{busy ? uiText("正在保存…", uiLocale) : record ? uiText("保存报名资料", uiLocale) : uiText("保存草稿，继续邀请队员", uiLocale)}</button>
  </form></section>
}

function Registration({ record, userId, owner, canWrite, busy, perform, onRefresh }) {
  const uiLocale = useUiLocale()
  const [player, setPlayer] = useState(emptyPlayer)
  useRegistrationDraft(JSON.stringify(player) !== JSON.stringify(emptyPlayer), { label: uiText("选手邀请", uiLocale), busy, discard: () => setPlayer(emptyPlayer) })
  const editable = owner && canWrite && ['DRAFT', 'RETURNED'].includes(record.status)
  const prefix = `/drafts/${record.id}`
  const confirmed = record.members.length > 0 && record.members.every(member => member.status === 'CONFIRMED')
  const stage = record.status === 'APPROVED' ? 3 : record.status === 'SUBMITTED' || confirmed ? 2 : 1
  const stageLabels = ['队伍资料', '队员确认', record.status === 'SUBMITTED' ? '等待审核' : '提交审核', '参赛资格']
  return <section className={styles.panel}>
    <div className={styles.row}><div><h2>{record.name} <span className={styles.tag}>{statusLabels[record.status]}</span></h2><p>{owner ? uiText("你负责这份队伍报名", uiLocale) : uiText("队伍负责人：{0}", uiLocale, [record.ownerName])} · {record.members.filter(member => member.status === 'CONFIRMED').length}/{record.members.length}{uiText(" 人已确认", uiLocale)}</p></div><button disabled={busy} onClick={onRefresh}>{uiText("刷新确认状态", uiLocale)}</button></div>
    <ol className={styles.journey} aria-label={uiText("报名进度", uiLocale)}>{stageLabels.map((label, index) => <li key={index} data-state={record.status === 'WITHDRAWN' ? 'inactive' : index < stage || record.status === 'APPROVED' ? 'done' : index === stage ? 'current' : 'upcoming'} aria-current={record.status !== 'WITHDRAWN' && index === stage ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></li>)}</ol>
    {record.reviewNote && <p className={styles.feedback}>{uiText("审核意见：", uiLocale)}{record.reviewNote}</p>}
    {record.status === 'APPROVED' && <p className={styles.feedback}>{uiText("本赛季报名已通过。周期登记和每周名单请按赛事安排处理。", uiLocale)}</p>}
    {record.status === 'SUBMITTED' && <p>{uiText("报名已提交，正在等待赛事负责人审核。名单已冻结；需要修改时可撤回后重新提交。", uiLocale)}</p>}
    <div className={styles.tableScroll}><table><thead><tr><th>{uiText("选手", uiLocale)}</th><th>BattleTag</th><th>{uiText("职责", uiLocale)}</th><th>{uiText("本人确认", uiLocale)}</th>{editable && <th>{uiText("操作", uiLocale)}</th>}</tr></thead><tbody>{record.members.map(member => <tr key={member.id}><td>{member.displayName}</td><td>{member.battleTag}</td><td>{roleLabels[member.role]}</td><td>{statusLabels[member.status]}</td>{editable && <td><button disabled={busy} onClick={() => perform(`${prefix}/remove-member`, { revision: record.revision, memberId: member.id })}>{uiText("移出草稿", uiLocale)}</button></td>}</tr>)}</tbody></table></div>
    {!record.members.length && <p>{uiText("还没有选手。负责人兼任选手时，也需要将本人加入名单并确认。", uiLocale)}</p>}
    {editable && <>
      <form className={styles.playerForm} onSubmit={async event => { event.preventDefault(); if (await perform(`${prefix}/invitations`, { ...player, revision: record.revision }, 'POST', '选手邀请')) setPlayer(emptyPlayer) }}>
        <h3>{uiText("邀请选手本人确认", uiLocale)}</h3><div className={styles.fields}>
          <label>{uiText("选手称呼", uiLocale)}<input required value={player.displayName} maxLength={80} onChange={event => setPlayer(current => ({ ...current, displayName: event.target.value }))} /></label>
          <label>{uiText("选手邮箱", uiLocale)}<input type="email" required value={player.email} onChange={event => setPlayer(current => ({ ...current, email: event.target.value }))} /></label>
          <label>{uiText("完整 BattleTag", uiLocale)}<input required value={player.battleTag} placeholder={uiText("名称#12345", uiLocale)} onChange={event => setPlayer(current => ({ ...current, battleTag: event.target.value }))} /></label>
          <label>{uiText("游戏职责", uiLocale)}<select value={player.role} onChange={event => setPlayer(current => ({ ...current, role: event.target.value }))}><option value="UNKNOWN">{uiText("待确定", uiLocale)}</option><option value="TANK">{uiText("坦克", uiLocale)}</option><option value="DPS">{uiText("输出", uiLocale)}</option><option value="SUP">{uiText("支援", uiLocale)}</option><option value="FLEX">{uiText("自由人", uiLocale)}</option></select></label>
        </div><button disabled={busy}>{uiText("生成本人确认邀请", uiLocale)}</button>
      </form>
      <details className={styles.details}><summary>{uiText("修改队伍资料", uiLocale)}</summary><TeamForm record={record} busy={busy} onSave={input => perform(prefix, input, 'PATCH', '队伍报名资料')} /></details>
      <div className={styles.actions}><button className={styles.primary} disabled={busy || !record.members.length || record.members.some(member => member.status !== 'CONFIRMED')} onClick={() => perform(`${prefix}/submit`, { revision: record.revision })}>{uiText("提交赛事负责人审核", uiLocale)}</button><span>{uiText("全部队员确认且符合人数要求后可以提交。", uiLocale)}</span></div>
    </>}
    {owner && record.status === 'SUBMITTED' && <button disabled={busy} onClick={() => perform(`${prefix}/withdraw`, { revision: record.revision })}>{uiText("撤回报名", uiLocale)}</button>}
    {['DRAFT', 'RETURNED', 'SUBMITTED'].includes(record.status) && record.members.some(member => member.userId === userId && member.status === 'CONFIRMED') && <button disabled={busy} onClick={() => perform(`${prefix}/withdraw-consent`, { memberId: record.members.find(member => member.userId === userId).id })}>{uiText("撤回本人的入队确认", uiLocale)}</button>}
  </section>
}
