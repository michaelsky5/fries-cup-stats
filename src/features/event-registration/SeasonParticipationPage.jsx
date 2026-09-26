import RoomGuideLink from '../room-guide/RoomGuideLink.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { platformRequest } from '../auth/platformApi.js'
import { getRegistrationStatusLabel } from '../my-space/myEventsModel.js'
import { RegistrationDraftGuard, useRegistrationDraft, useRegistrationDraftActions } from './registrationDraftGuard.jsx'
import styles from './SeasonParticipationPage.module.css'
import AccountFrame from '../account-ui/AccountFrame.jsx'
import RegistrationLogoField from './RegistrationLogoField.jsx'
import ApprovedTeamLogoEditor from './ApprovedTeamLogoEditor.jsx'
import WeeklyTeamAdditions from '../weekly-competition/WeeklyTeamAdditions.jsx'
import WeeklyOwnershipTransfers from '../weekly-competition/WeeklyOwnershipTransfers.jsx'
import WeeklyEligibilityFields, { MemberEligibilityEditor, readWeeklyEligibility } from './WeeklyEligibilityFields.jsx'
import { describeRegistrationError as describeError } from './registrationErrors.js'
const emptyDetails = { region: '', history: '', logoUrl: '', coachName: '', coachContact: '' }
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
  const [hasAdditions, setHasAdditions] = useState(false)
  const [hasTransfers, setHasTransfers] = useState(false)
  return <AccountFrame title={uiText("赛事报名", uiLocale)} eyebrow="EVENT REGISTRATION" description={uiText("组建本队名单，确认后提交赛事负责人审核。", uiLocale)}><div className={styles.page}>
    <header className={styles.header}>
      <div><span>{uiText("参赛账号", uiLocale)}</span><strong>{user?.displayName || uiText("等待登录", uiLocale)}</strong></div>
      <div className={styles.actions}><RoomGuideLink season={seasonId} role="manager" label="参赛与比赛指南" />{user ? <><button type="button" onClick={async () => { if (await confirmDiscard()) await logout() }}>{uiText("退出账号", uiLocale)}</button></> : null}<Link to="/me">{uiText("我的空间", uiLocale)}</Link></div>
    </header>
    {invitationToken ? <Invitation key={invitationToken} token={invitationToken} seasonId={seasonId} />
      : isBootstrapping ? <p role="status">{uiText("正在确认登录状态…", uiLocale)}</p>
        : user ? <><WeeklyTeamAdditions key={`additions:${user.id}:${seasonId}`} seasonId={seasonId} onHasAdditions={setHasAdditions} /><WeeklyOwnershipTransfers key={`transfers:${user.id}:${seasonId}`} seasonId={seasonId} onHasTransfers={setHasTransfers} /><Workspace key={`${user.id}:${seasonId}`} user={user} seasonId={seasonId} hasAdditions={hasAdditions || hasTransfers} /></> : <Login />}
  </div></AccountFrame>
}

function Login() {
  const uiLocale = useUiLocale()
  return <section className={styles.login}><span className={styles.kicker}>JOIN THE COMPETITION</span><h2>{uiText("从你的参赛账号开始", uiLocale)}</h2><p>{uiText("已有账号可使用受邀邮箱登录。首次参加，请打开赛事负责人或队长提供的邀请链接。", uiLocale)}</p><button type="button" className={styles.primary} onClick={() => window.dispatchEvent(new Event('fries-cup:open-account'))}>{uiText("登录参赛账号 →", uiLocale)}</button></section>
}

function Invitation({ token, seasonId }) {
  const uiLocale = useUiLocale()
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [accepted, setAccepted] = useState(false)
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
      }).catch(failure => { if (!controller.signal.aborted) setError(describeError(failure)) })
    return () => controller.abort()
  }, [token, seasonId, attempt])
  async function accept(event) {
    event.preventDefault()
    if (lock.current) return
    const form = new FormData(event.currentTarget)
    if (invitation.passwordMode === 'SET' && form.get('password') !== form.get('confirmation')) { setError('两次输入的密码不一致。'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await platformRequest('/auth/participation-invitations/accept', { method: 'POST', body: { token, password: form.get('password'), consent: form.get('consent') === 'on', ...(invitation.eligibilityRequired ? { eligibility: readWeeklyEligibility(form) } : {}) } })
      if (!result.accepted || result.seasonId !== seasonId) throw new Error('邀请确认响应异常，请重新登录查看状态。')
      setAccepted(true)
      await enterWorkspace()
    } catch (failure) { setError(describeError(failure)); lock.current = false; setBusy(false) }
  }
  async function enterWorkspace() {
    setBusy(true); setError('')
    try {
      const user = await refreshSession()
      if (!user) throw new Error('邀请已接受，登录状态尚未同步，请重试或重新登录。')
      navigate(`/participate/${encodeURIComponent(seasonId)}`, { replace: true })
    } catch (failure) { setError(describeError(failure)); setBusy(false) }
  }
  return <section className={styles.login}><h2>{['PLAYER', 'TEAM_ADDITION'].includes(invitation?.kind) ? uiText("确认加入报名名单", uiLocale) : uiText("接受赛事邀请", uiLocale)}</h2>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!invitation ? <><p role="status">{error ? uiText("可重新核对；若邀请已失效，请联系邀请人。", uiLocale) : uiText("正在核对邀请…", uiLocale)}</p>{error && <button onClick={() => setAttempt(value => value + 1)}>{uiText("重新核对邀请", uiLocale)}</button>}</> : <>
      <p><strong>{invitation.seasonName}</strong> · {invitation.maskedEmail}</p>
      {['PLAYER', 'TEAM_ADDITION'].includes(invitation.kind) ? <p>{invitation.teamName}{uiText(" 邀请你以 ", uiLocale)}<strong>{invitation.displayName} · {invitation.battleTag}</strong>{uiText(" 参加报名。确认前请核对本人资料，报名仍需赛事负责人审核。", uiLocale)}</p> : <p>{uiText("接受后可以创建队伍报名、邀请选手本人确认，再提交审核。", uiLocale)}</p>}
      {accepted ? <><p>{uiText("邀请已接受，正在同步登录状态。", uiLocale)}</p><button disabled={busy} onClick={enterWorkspace}>{uiText("重新同步并进入报名", uiLocale)}</button></> : <form onSubmit={accept}>
        <label>{invitation.passwordMode === 'SET' ? uiText("设置账号密码（至少 12 位）", uiLocale) : uiText("受邀账号的现有密码", uiLocale)}<input name="password" type="password" autoComplete={invitation.passwordMode === 'SET' ? 'new-password' : 'current-password'} minLength={invitation.passwordMode === 'SET' ? 12 : 1} required /></label>
        {invitation.passwordMode === 'SET' && <label>{uiText("再次输入密码", uiLocale)}<input name="confirmation" type="password" autoComplete="new-password" required /></label>}
        {invitation.eligibilityRequired && <WeeklyEligibilityFields rulebook={invitation.rulebook} disabled={busy} />}
        <label className={styles.check}><input name="consent" type="checkbox" required />{['PLAYER', 'TEAM_ADDITION'].includes(invitation.kind) ? uiText("以上选手资料属于本人，我同意加入该队伍的本赛季报名。", uiLocale) : uiText("我将使用本人账号负责队伍报名。", uiLocale)}</label>
        <button className={styles.primary} disabled={busy}>{busy ? uiText("正在确认…", uiLocale) : uiText("本人确认并进入报名", uiLocale)}</button>
      </form>}
    </>}
  </section>
}

function Workspace({ user, seasonId, hasAdditions }) {
  const uiLocale = useUiLocale()
  const { confirmDiscard } = useRegistrationDraftActions()
  const [workspace, setWorkspace] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [link, setLink] = useState(null)
  const [invitationLinks, setInvitationLinks] = useState({})
  const [notice, setNotice] = useState('')
  const feedback = useRef(null)
  useEffect(() => { if (error || notice) feedback.current?.focus() }, [error, notice])
  const mutation = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    platformRequest(`${path(seasonId)}/me`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setWorkspace(data); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(describeError(failure)) })
    return () => controller.abort()
  }, [seasonId, version])
  async function perform(suffix, body, method = 'POST', savingDraftLabel) {
    if (mutation.current) return false
    mutation.current = true
    if (suffix.startsWith('/drafts') && !suffix.endsWith('/remove-member') && !suffix.endsWith('/invitations') && !await confirmDiscard({ exceptLabels: savingDraftLabel ? [savingDraftLabel] : [] })) { mutation.current = false; return false }
    setBusy(true); setError(''); setNotice(''); setLink(null)
    try {
      const result = await platformRequest(path(seasonId) + suffix, { method, body })
      if (result.invitation?.activationUrl) {
        setLink(result.invitation)
        if (result.invitation.memberId) setInvitationLinks(current => ({ ...current, [result.invitation.memberId]: result.invitation }))
      }
      setNotice(suffix.endsWith('/logo') ? '队标已保存，报名与队员确认状态保持不变。' : suffix.endsWith('/submit') ? '报名已成功提交！现在等待赛事负责人审核，无需重复提交。' : suffix.endsWith('/eligibility') ? '本人的报名资料已保存。队伍仍需由负责人提交审核。' : method === 'PATCH' ? '队伍报名资料已保存。全部队员确认后，请继续提交赛事负责人审核。' : '')
      setVersion(current => current + 1)
      return result
    } catch (failure) { setError(describeError(failure)); return false } finally { mutation.current = false; setBusy(false) }
  }
  if (!workspace) return <section className={styles.panel}>{error ? <p role="alert" className={styles.error}>{error}</p> : <p role="status">{uiText("正在读取本赛季报名…", uiLocale)}</p>}<button type="button" onClick={() => setVersion(value => value + 1)}>{uiText("重新读取", uiLocale)}</button></section>
  const ownerRegistration = workspace.registrations.find(item => item.ownerUserId === user.id && item.status !== 'WITHDRAWN')
  return <>
    <div className={styles.context}><div><span>{uiText("当前赛季", uiLocale)}</span><strong>{workspace.season.name}</strong></div><div><span>{uiText("报名人数", uiLocale)}</span><strong>{workspace.policy.rosterMin}–{workspace.policy.rosterMax}{uiText(" 人", uiLocale)}</strong></div><div><span>{uiText("报名截止", uiLocale)}</span><strong>{workspace.policy.closesAt ? new Date(workspace.policy.closesAt).toLocaleString() : uiText("以赛事通知为准", uiLocale)}</strong></div><span>{workspace.canWrite ? uiText("报名开放", uiLocale) : uiText(workspace.canManageLogo && workspace.registrations.some(record => record.status === "APPROVED" && record.ownerUserId === user.id) ? "报名只读，队标可更新" : "当前只读", uiLocale)}</span></div>
    {workspace.policy.rulebook && <p><a className={styles.rulebookLink} href={workspace.policy.rulebook.url} target="_blank" rel="noreferrer">{uiText("当前规则书 {0} · 下载阅读", uiLocale, [workspace.policy.rulebook.label])} ↗</a></p>}
    {(error || notice) && <p ref={feedback} tabIndex={-1} role={error ? "alert" : "status"} className={error ? styles.error : styles.success}>{error || notice}</p>}
    {link && <InvitationLink invitation={link} />}
    {workspace.notices.some(item => item.requiresAck && !item.acknowledgedAt) && <section className={styles.panel}><h2>{uiText("需要确认", uiLocale)}</h2>{workspace.notices.filter(item => item.requiresAck && !item.acknowledgedAt).map(item => <div className={styles.notice} key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p></div><button disabled={busy} onClick={() => perform(`/notices/${item.id}/acknowledge`, {})}>{uiText("我已知悉", uiLocale)}</button></div>)}</section>}
    {!ownerRegistration && workspace.canCreate && <TeamForm eligibilityRequired={workspace.policy.eligibilityRequired} organizations={workspace.organizations} busy={busy} onSave={input => perform('/drafts', input, 'POST', '队伍报名资料')} />}
    {!hasAdditions && !workspace.registrations.length && workspace.canWrite && !workspace.canCreate && <section className={styles.panel}><h2>{uiText('需要队伍负责人邀请', uiLocale)}</h2><p>{uiText('请联系赛事负责人获取本赛季队伍负责人邀请链接，接受后即可创建报名。队员请使用队长发送的入队邀请链接。', uiLocale)}</p></section>}
    {workspace.registrations.map(record => <Registration rulebook={workspace.policy.rulebook} key={record.id} eligibilityRequired={workspace.policy.eligibilityRequired} record={record} userId={user.id} owner={record.ownerUserId === user.id} canWrite={workspace.canWrite} canManageLogo={workspace.canManageLogo} busy={busy} perform={perform} invitationLinks={invitationLinks} rosterMin={workspace.policy.rosterMin} rosterMax={workspace.policy.rosterMax} onRefresh={async () => { if (await confirmDiscard()) setVersion(value => value + 1) }} />)}
    {!hasAdditions && !workspace.registrations.length && !workspace.canWrite && <section className={styles.panel}><h2>{uiText("尚无报名", uiLocale)}</h2><p>{uiText("本赛季报名当前没有开放，请等待赛事负责人通知。", uiLocale)}</p></section>}
    {workspace.notices.length > 0 && <details className={styles.panel}><summary>{uiText("报名通知 · ", uiLocale)}{workspace.notices.length}</summary>{workspace.notices.map(item => <div className={styles.notice} key={item.id}><div><strong>{item.title}</strong><p>{item.message}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</details>}
  </>
}

function InvitationLink({ invitation }) {
  const uiLocale = useUiLocale()
  const [copied, setCopied] = useState(false)
  return <section className={styles.panel} aria-live="polite"><strong>{uiText("已为 ", uiLocale)}{invitation.email}{uiText(" 生成邀请", uiLocale)}</strong><p>{invitation.emailDelivery?.delivered ? uiText("邀请邮件已交给投递服务。", uiLocale) : uiText("邮件未送达，请将下方链接私下交给这名受邀者。", uiLocale)}{uiText("链接有效期至 ", uiLocale)}{new Date(invitation.expiresAt).toLocaleString()}。</p><div className={styles.actions}><input aria-label={uiText("本次邀请链接", uiLocale)} value={invitation.activationUrl} readOnly /><button onClick={async () => { try { await navigator.clipboard.writeText(invitation.activationUrl); setCopied(true) } catch { setCopied(false) } }}>{copied ? uiText("已复制", uiLocale) : uiText("复制邀请", uiLocale)}</button></div></section>
}

function TeamForm({ organizations = [], record, busy, onSave, eligibilityRequired }) {
  const initial = () => record ? { name: record.name, shortName: record.shortName, contact: record.contact, note: record.note, details: { ...emptyDetails, ...record.details } } : { ...emptyTeam, details: { ...emptyDetails } }
  const [form, setForm] = useState(initial)
  const [dirty, setDirty] = useState(false), [reading, setReading] = useState(false)
  const [sourceRevision, setSourceRevision] = useState(record?.revision)
  // A roster refresh must not remount and erase an unrelated team draft.
  if (sourceRevision !== record?.revision) {
    setSourceRevision(record?.revision)
    if (!dirty) setForm(initial())
  }
  useRegistrationDraft(dirty, { label: '队伍报名资料', busy: dirty && busy, discard: () => { setForm(initial()); setDirty(false) } })
  const set = (field, value) => { setForm(current => ({ ...current, [field]: value })); setDirty(true) }
  const detail = (field, value) => set('details', { ...form.details, [field]: value })
  return <section className={styles.panel}><h2>{record ? '修改报名资料' : '创建队伍报名'}</h2><form onSubmit={async event => {
    event.preventDefault()
    const payload = { ...form, name: form.name.trim(), shortName: form.shortName.trim(), contact: form.contact.trim(), note: form.note.trim(), details: Object.fromEntries(Object.entries(form.details).map(([key,value]) => [key, value.trim()])), ...(form.organizationId ? {} : !record ? { organizationId: undefined } : {}), ...(record ? { revision: record.revision } : {}) }
    if (await onSave(payload)) setDirty(false)
  }}>
    {!record && organizations.length > 0 && <label>复用长期队伍<select value={form.organizationId} onChange={event => { const organization = organizations.find(item => item.id === event.target.value); setForm(current => ({ ...current, organizationId: event.target.value, ...(organization ? { name: organization.name, shortName: organization.shortName } : {}) })); setDirty(true) }}><option value="">创建新的队伍</option>{organizations.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
    <div className={styles.fields}>
      <label>队伍名称<input name="name" value={form.name} required minLength={2} maxLength={80} onChange={event => set('name', event.target.value)} /></label>
      <label>队伍简称<input name="shortName" value={form.shortName} required maxLength={24} onChange={event => set('shortName', event.target.value)} /></label>
      {!record && <label>队伍类型<select value={form.kind} onChange={event => set('kind', event.target.value)} disabled={Boolean(form.organizationId)}><option value="LONG_TERM">长期队伍</option><option value="TEMPORARY">本赛季临时队伍</option></select></label>}
      <label>{eligibilityRequired ? '负责人 QQ' : '负责人联系方式'}<input name="contact" value={form.contact} required minLength={eligibilityRequired ? 5 : 3} maxLength={eligibilityRequired ? 12 : 240} inputMode={eligibilityRequired ? 'numeric' : 'text'} pattern={eligibilityRequired ? '[0-9]{5,12}' : undefined} title={eligibilityRequired ? '请填写 5 至 12 位 QQ 号码，只填数字' : undefined} placeholder={eligibilityRequired ? '只填写 QQ 号码，用于赛事联系' : '赛事联系账号'} onChange={event => set('contact', event.target.value.trim())} /></label>
      {eligibilityRequired && <label>队伍所属赛区<select name="region" required value={form.details.region} onChange={event => detail('region', event.target.value)}><option value="">请选择赛区</option><option value="CN">CN · 中国</option><option value="SEA">SEA · 东南亚</option><option value="OCE">OCE · 大洋洲</option><option value="KR">KR · 韩国</option><option value="JP">JP · 日本</option></select></label>}
    </div>
    {eligibilityRequired && <label>队伍历史赛事表现<textarea name="history" required rows={2} maxLength={1000} value={form.details.history} placeholder="赛事名称、成绩；没有参赛经历请填写“无”" onChange={event => detail('history', event.target.value)} /></label>}
    <RegistrationLogoField image={form.logoImage} url={form.details.logoUrl} disabled={busy} onReading={setReading} onChange={({ image, url }) => { setForm(current => ({ ...current, logoImage: image, details: { ...current.details, logoUrl: url } })); setDirty(true) }} />
    <label>报名备注<textarea value={form.note} maxLength={1000} rows={2} onChange={event => set('note', event.target.value)} /></label>
    <button className={styles.primary} disabled={busy || reading}>{busy ? '正在保存…' : record ? '保存报名资料' : '保存草稿，继续邀请队员'}</button>
  </form></section>
}

function Registration({ rulebook, eligibilityRequired, record, userId, owner, canWrite, canManageLogo, busy, perform, invitationLinks, rosterMin = 1, rosterMax = 7, onRefresh }) {
  const uiLocale = useUiLocale()
  const [player, setPlayer] = useState(emptyPlayer)
  const [copyNotice, setCopyNotice] = useState('')
  const [editingTeam, setEditingTeam] = useState(false)
  useRegistrationDraft(JSON.stringify(player) !== JSON.stringify(emptyPlayer), { label: uiText("选手邀请", uiLocale), busy, discard: () => setPlayer(emptyPlayer) })
  const editable = owner && canWrite && ['DRAFT', 'RETURNED'].includes(record.status)
  const prefix = `/drafts/${record.id}`
  const confirmed = record.members.length > 0 && record.members.every(member => member.status === 'CONFIRMED')
  const rosterFull = record.members.length >= rosterMax
  const rosterReady = record.members.length >= rosterMin && confirmed
  const stage = record.status === 'APPROVED' ? 3 : record.status === 'SUBMITTED' || confirmed ? 2 : 1
  const stageLabels = ['队伍资料', '队员确认', record.status === 'SUBMITTED' ? '等待审核' : '提交审核', '参赛资格']
  const statusLabel = value => getRegistrationStatusLabel(value, value)
  async function copyInvitation(member) {
    let invitation = invitationLinks?.[member.id]
    if (!invitation) {
      const result = await perform(`${prefix}/invitations`, { revision: record.revision, email: member.email, displayName: member.displayName, battleTag: member.battleTag, role: member.role }, 'POST', '选手邀请')
      invitation = result?.invitation
    }
    if (!invitation?.activationUrl) return
    try {
      await navigator.clipboard.writeText(invitation.activationUrl)
      setCopyNotice(`${member.displayName} 的邀请链接已复制。请发送本次链接；重新生成后旧链接会失效。`)
    } catch {
      setCopyNotice('复制失败，请从上方邀请框手动复制。')
    }
  }
  return <section className={styles.panel}>
    <div className={styles.row}><div><h2>{record.name} <span className={styles.tag}>{statusLabel(record.status)}</span></h2><p>{owner ? uiText("你负责这份队伍报名", uiLocale) : uiText("队伍负责人：{0}", uiLocale, [record.ownerName])} · {record.members.filter(member => member.status === 'CONFIRMED').length}/{record.members.length}{uiText(" 人已确认", uiLocale)}</p></div><button disabled={busy} onClick={onRefresh}>{uiText("刷新确认状态", uiLocale)}</button></div>
    {editable && <button type="button" disabled={busy} aria-expanded={editingTeam} onClick={() => setEditingTeam(value => !value)}>{uiText("修改队伍资料", uiLocale)}</button>}
    {editable && <div hidden={!editingTeam}><TeamForm eligibilityRequired={eligibilityRequired} record={record} busy={busy} onSave={input => perform(prefix, input, 'PATCH', '队伍报名资料')} /></div>}
    {owner && !editable && <p className={styles.feedback}>{uiText(record.status === 'SUBMITTED' ? '需要修改队伍资料？点击“撤回并修改”，修改后重新提交审核。' : record.status === 'APPROVED' ? (canManageLogo ? '队伍资料已审核。可在上方“队伍自主增员”邀请新队员，队标可在下方更新；每周出赛阵容在“队伍与报名”中管理。' : '队伍资料已审核。联系方式、队标或经历有变更时，请联系赛事管理员更新队伍资料；每周出赛阵容在“队伍与报名”中管理。') : '当前报名不可编辑，请核对报名开放时间或联系赛事管理员。', uiLocale)}</p>}
    {owner && canManageLogo && record.status === 'APPROVED' && <ApprovedTeamLogoEditor key={record.logoUrl || 'no-logo'} logoUrl={record.logoUrl || ''} busy={busy} onSave={input => perform(`${prefix}/logo`, input, 'PUT', '队伍队标')} />}
    <ol className={styles.journey} aria-label={uiText("报名进度", uiLocale)}>{stageLabels.map((label, index) => <li key={index} data-state={record.status === 'WITHDRAWN' ? 'inactive' : index < stage || record.status === 'APPROVED' ? 'done' : index === stage ? 'current' : 'upcoming'} aria-current={record.status !== 'WITHDRAWN' && index === stage ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></li>)}</ol>
    {record.reviewNote && <p className={styles.feedback}>{uiText("审核意见：", uiLocale)}{record.reviewNote}</p>}
    {record.status === 'APPROVED' && <p className={styles.feedback}>{uiText("本赛季报名已通过。周期登记和每周名单请按赛事安排处理。", uiLocale)}</p>}
    {record.status === 'SUBMITTED' && <p className={styles.success} role="status">{uiText("报名已提交，正在等待赛事负责人审核。名单已冻结；需要修改时可撤回后重新提交。", uiLocale)}</p>}
    {owner && editable && confirmed && <p className={styles.feedback} role="status">{uiText("全部队员已确认，但队伍报名尚未提交。请点击下方“提交赛事负责人审核”完成最后一步。", uiLocale)}</p>}
    <div className={styles.tableScroll}><table><thead><tr><th>{uiText("选手", uiLocale)}</th><th>BattleTag</th><th>{uiText("职责", uiLocale)}</th><th>{uiText("本人确认", uiLocale)}</th>{editable && <th>{uiText("操作", uiLocale)}</th>}</tr></thead><tbody>{record.members.map(member => <tr key={member.id}><td>{member.displayName}</td><td>{member.battleTag}</td><td>{roleLabels[member.role]}</td><td>{statusLabel(member.status)}</td>{editable && <td><div className={styles.memberActions}>{member.status === 'INVITED' ? <button type="button" disabled={busy} onClick={() => copyInvitation(member)}>{invitationLinks?.[member.id] ? uiText("复制链接", uiLocale) : uiText("生成并复制链接", uiLocale)}</button> : null}{member.status === 'DRAFT' || member.status === 'INVITED' ? <button type="button" disabled={busy} onClick={() => { if (window.confirm(uiText("确定从这份报名草稿中移出 {0} 吗？", uiLocale, [member.displayName]))) perform(`${prefix}/remove-member`, { revision: record.revision, memberId: member.id }) }}>{uiText("移出草稿", uiLocale)}</button> : null}</div></td>}</tr>)}</tbody></table></div>
    {owner && editable && record.members.some(member => member.status === 'CONFIRMED') ? <p className={styles.feedback} role="status">{uiText("已确认资料由选手本人修改。队伍提交审核后会冻结资料，需要负责人撤回报名后才能修改。", uiLocale)}</p> : null}
    {copyNotice && <p role="status" className={styles.feedback}>{copyNotice}</p>}
    {canWrite && ['DRAFT', 'RETURNED'].includes(record.status) && record.members.filter(member => member.userId === userId && member.status === 'CONFIRMED').map(member => <MemberEligibilityEditor rulebook={rulebook} key={`${member.id}:${member.confirmedAt}`} member={member} eligibilityRequired={eligibilityRequired} busy={busy} onSave={input => perform(`${prefix}/eligibility`, { revision: record.revision, ...input }, 'PUT', '本人参赛资料')} />)}
    {!record.members.length && <p>{uiText("还没有选手。负责人兼任选手时，也需要将本人加入名单并确认。", uiLocale)}</p>}
    {editable && <>
      <form className={styles.playerForm} onSubmit={async event => { event.preventDefault(); const payload = { ...player, displayName: player.displayName.trim(), email: player.email.trim(), battleTag: player.battleTag.trim(), revision: record.revision }; if (await perform(`${prefix}/invitations`, payload, 'POST', '选手邀请')) setPlayer(emptyPlayer) }}>
        <h3>{uiText("邀请选手本人确认", uiLocale)}</h3><div className={styles.fields}>
          <label>{uiText("选手称呼", uiLocale)}<input required disabled={busy || rosterFull} value={player.displayName} maxLength={80} onChange={event => setPlayer(current => ({ ...current, displayName: event.target.value }))} /></label>
          <label>{uiText("选手邮箱", uiLocale)}<input type="email" required disabled={busy || rosterFull} value={player.email} onChange={event => setPlayer(current => ({ ...current, email: event.target.value.trim() }))} /></label>
          <label>{uiText("完整 BattleTag", uiLocale)}<input required disabled={busy || rosterFull} value={player.battleTag} placeholder={uiText("名称#12345", uiLocale)} onChange={event => setPlayer(current => ({ ...current, battleTag: event.target.value }))} /></label>
          <label>{uiText("游戏职责", uiLocale)}<select disabled={busy || rosterFull} value={player.role} onChange={event => setPlayer(current => ({ ...current, role: event.target.value }))}><option value="UNKNOWN">{uiText("待确定", uiLocale)}</option><option value="TANK">{uiText("坦克", uiLocale)}</option><option value="DPS">{uiText("输出", uiLocale)}</option><option value="SUP">{uiText("支援", uiLocale)}</option><option value="FLEX">{uiText("自由人", uiLocale)}</option></select></label>
        </div>{rosterFull ? <p className={styles.warning} role="status">{uiText("当前名单已达到 {0} 人上限。请先移除一名草稿成员，再邀请其他选手。", uiLocale, [rosterMax])}</p> : null}<button disabled={busy || rosterFull}>{rosterFull ? uiText("名单已满", uiLocale) : uiText("生成本人确认邀请", uiLocale)}</button>
      </form>

      <div className={styles.actions}><button className={styles.primary} disabled={busy || !rosterReady} onClick={() => perform(`${prefix}/submit`, { revision: record.revision })}>{uiText("提交赛事负责人审核", uiLocale)}</button><span>{uiText("全部队员确认且达到本赛季人数要求后可以提交。", uiLocale)}</span></div>
    </>}
    {owner && record.status === 'SUBMITTED' && <button disabled={busy} onClick={() => perform(`${prefix}/withdraw`, { revision: record.revision })}>{uiText("撤回并修改", uiLocale)}</button>}
    {['DRAFT', 'RETURNED', 'SUBMITTED'].includes(record.status) && record.members.some(member => member.userId === userId && member.status === 'CONFIRMED') && <button disabled={busy} onClick={() => perform(`${prefix}/withdraw-consent`, { memberId: record.members.find(member => member.userId === userId).id })}>{uiText("撤回本人的入队确认", uiLocale)}</button>}
  </section>
}
