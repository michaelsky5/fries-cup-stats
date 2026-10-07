import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from './registrationDraftGuard.jsx'
import WeeklyEligibilityFields, { readWeeklyEligibility } from './WeeklyEligibilityFields.jsx'
import { describeRegistrationError, translateRegistrationError } from './registrationErrors.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './SharedRegistrationJoin.module.css'
import { canEditJoinApplication, canWithdrawJoinApplication, joinApplicationStatusLabel } from './registrationJoinModel.js'

const roles = { DPS: 'DPS', TANK: 'TANK', SUP: 'SUP', FLEX: 'FLEX', UNKNOWN: '待确定' }
const registrationPath = seasonId => `/seasons/${encodeURIComponent(seasonId)}/registration`
const openLogin = () => window.dispatchEvent(new Event('fries-cup:open-account'))

export function SharedRegistrationJoin({ token, seasonId }) {
  const locale = useUiLocale()
  const { user, isBootstrapping, refreshSession, requestEmailVerification, emailVerificationState } = useAuth()
  const [invitation, setInvitation] = useState(null)
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [refresh, setRefresh] = useState(0)
  const userId = user?.id
  useEffect(() => { setNotice('') }, [userId])
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    platformRequest('/registration/join-links/preview', { method: 'POST', body: { token }, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        if (result.invitation.seasonId !== seasonId) throw new Error('报名链接所属赛事不一致，请重新打开完整链接。')
        setInvitation(result.invitation)
      }).catch(failure => { if (!controller.signal.aborted) { setInvitation(null); setError(describeRegistrationError(failure)) } })
    return () => controller.abort()
  }, [token, seasonId, attempt])
  useEffect(() => {
    const controller = new AbortController()
    setState(null)
    if (userId && invitation) platformRequest('/registration/join-links/state', { method: 'POST', body: { token }, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setState(result); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(describeRegistrationError(failure)) })
    return () => controller.abort()
  }, [userId, invitation, token, refresh])
  const verify = async () => {
    setError('')
    try {
      const result = await requestEmailVerification()
      setNotice(result?.delivered ? '验证邮件已发送；完成验证后回到这里继续填写。' : '验证邮件未发送成功，请稍后重试。')
    } catch (failure) { setError(describeRegistrationError(failure)) }
  }
  const reload = async () => {
    setError('')
    try { await refreshSession(); setRefresh(value => value + 1); setAttempt(value => value + 1) }
    catch (failure) { setError(describeRegistrationError(failure)) }
  }
  async function submit(body) {
    if (lock.current) return false
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const result = await platformRequest('/registration/join-links/apply', { method: 'POST', body: { token, ...body } })
      setState(current => ({ ...current, application: result.application, prefill: result.application }))
      setNotice(invitation.joinMode === 'TEAM_ADDITION' ? '申请已提交，等待经理审核；之后仍需赛事管理员审核增员。' : invitation.joinMode === 'WAITING_REVIEW' ? '资料已提交。队伍报名正在审核，通过后经理可继续审核增员申请。' : '申请已提交，等待经理审核。通过后进入报名名单，整队仍需赛事资格审核。')
      return true
    } catch (failure) { setError(describeRegistrationError(failure)); return false }
    finally { lock.current = false; setBusy(false) }
  }
  async function withdraw() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      await platformRequest(`${registrationPath(seasonId)}/join-applications/${state.application.id}/withdraw`, {
        method: 'POST', body: { applicationRevision: state.application.revision }
      })
      setNotice('本人申请已撤回。'); setRefresh(value => value + 1)
    } catch (failure) { setError(describeRegistrationError(failure)) }
    finally { lock.current = false; setBusy(false) }
  }
  const application = state?.application
  const additionMode = invitation?.joinMode === 'TEAM_ADDITION'
  return <section className={styles.join} data-i18n-ignore>
    <header className={styles.hero}><div><span>TEAM REGISTRATION</span><h2>{invitation ? `${invitation.shortName} · ${invitation.teamName}` : uiText('队内报名', locale)}</h2><p>{invitation?.seasonName || uiText('正在核对报名链接…', locale)}</p></div><span className={styles.badge}>{uiText('本人填写 · 经理审核', locale)}</span></header>
    <ol className={styles.steps}>{['登录本人账号', '填写参赛资料', '经理审核入队', additionMode ? '赛事增员审核' : '整队资格审核'].map((label, index) => <li key={label}><b>0{index + 1}</b>{uiText(label, locale)}</li>)}</ol>
    {invitation?.joinMode === 'WAITING_REVIEW' && <p>{uiText('队伍报名正在审核，可以先提交本人资料；已送审名单不会改变。', locale)}</p>}
    {error && <p className={styles.error} role="alert">{translateRegistrationError(error, locale)}</p>}
    {notice && <p className={styles.success} role="status">{uiText(notice, locale)}</p>}
    {!invitation ? <button type="button" onClick={() => setAttempt(value => value + 1)}>{uiText('重新核对链接', locale)}</button>
      : isBootstrapping ? <p role="status">{uiText('正在确认登录状态…', locale)}</p>
        : !user ? <JoinAccount token={token} />
          : !user.emailVerifiedAt ? <section className={styles.card}><h3>{uiText('先验证本人邮箱', locale)}</h3><p>{user.email}</p><p>{uiText('验证后才能提交入队申请；你的普通账号不会因此获得队伍管理权限。', locale)}</p><div className={styles.actions}><button type="button" disabled={emailVerificationState.status === 'SENDING'} onClick={verify}>{uiText('发送验证邮件', locale)}</button><button type="button" onClick={reload}>{uiText('已验证，刷新状态', locale)}</button></div></section>
            : !state ? <p role="status">{uiText('正在读取本人申请资料…', locale)} <button onClick={reload}>{uiText('重新读取', locale)}</button></p>
              : state.memberConfirmed ? <section className={styles.card}><h3>{uiText(additionMode ? '已加入队内名单' : '已进入报名名单', locale)}</h3><p>{uiText(additionMode ? '你已在本队有效名单中，无需重复申请。出赛名单由负责人按周次安排。' : '队伍仍需统一提交赛事资格审核。你可以在报名工作区查看进度或修改本人资料。', locale)}</p><Link to={additionMode ? `/me?competition=${encodeURIComponent(seasonId)}&section=team` : `/participate/${encodeURIComponent(seasonId)}`}>{uiText(additionMode ? '查看队伍进度 →' : '进入报名工作区 →', locale)}</Link></section>
                : <>
                  {application && <section className={styles.card} data-status={application.status}><div className={styles.row}><h3>{uiText(joinApplicationStatusLabel(application), locale)}</h3><button type="button" disabled={busy} onClick={reload}>{uiText('刷新审核状态', locale)}</button></div><p>{application.displayName} · {application.battleTag} · {uiText(roles[application.role], locale)}</p>{application.reviewNote && <p className={styles.reviewNote}>{uiText('经理审核意见：', locale)}{application.reviewNote}</p>}{application.addition?.reviewNote && <p className={styles.reviewNote}>{uiText('审核说明：', locale)}{application.addition.reviewNote}</p>}{canWithdrawJoinApplication(application) && <button type="button" disabled={busy} onClick={withdraw}>{uiText('撤回本人申请', locale)}</button>}</section>}
                  {application?.status === 'PENDING'
                    ? <details className={styles.card}><summary>{uiText('修改已提交的本人资料', locale)}</summary><JoinApplicationForm key={application.revision} prefill={state.prefill} applicationRevision={application.revision} eligibilityRequired={invitation.policy.eligibilityRequired} rulebook={invitation.policy.rulebook} busy={busy} onSave={submit} /></details>
                    : canEditJoinApplication(application) && <JoinApplicationForm key={application?.revision ?? 'new'} prefill={state.prefill} applicationRevision={application?.revision} eligibilityRequired={invitation.policy.eligibilityRequired} rulebook={invitation.policy.rulebook} busy={busy} onSave={submit} />}
                </>}
    <footer className={styles.footer}><span>{uiText('申请只会发送给这支队伍的负责人。', locale)}</span><Link to={`/participate/${encodeURIComponent(seasonId)}`}>{uiText('查看本人报名进度 →', locale)}</Link></footer>
  </section>
}

function JoinAccount({ token }) {
  const locale = useUiLocale()
  const { refreshSession } = useAuth()
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const form = useRef(null)
  const lock = useRef(false)
  useRegistrationDraft(dirty, { label: '注册本人账号', busy, discard: () => { form.current?.reset(); setDirty(false) } })
  async function register(event) {
    event.preventDefault()
    if (lock.current) return
    const values = new FormData(event.currentTarget)
    if (values.get('password') !== values.get('confirmation')) { setError('两次输入的密码不一致。'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await platformRequest('/registration/join-links/register', { method: 'POST', body: {
        token, displayName: values.get('displayName').trim(), email: values.get('email').trim(), password: values.get('password'), consent: values.get('consent') === 'on'
      } })
      if (!result.user?.id) throw new Error('账号创建响应异常，请尝试登录刚刚注册的账号。')
      setDirty(false)
      await refreshSession()
    } catch (failure) { setError(describeRegistrationError(failure)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className={styles.card}><h3>{uiText('使用本人账号填写', locale)}</h3><p>{uiText('已有账号直接登录，参赛资料会自动带入。首次参加可在这里创建账号。', locale)}</p><div className={styles.actions}><button className={!creating ? styles.primary : ''} type="button" onClick={openLogin}>{uiText('已有账号，登录', locale)}</button><button type="button" onClick={() => setCreating(value => !value)}>{uiText(creating ? '收起注册' : '首次参加，创建账号', locale)}</button></div>
    {creating && <form ref={form} className={styles.form} onChange={() => setDirty(true)} onSubmit={register}>
      <div className={styles.fields}><label>{uiText('本人称呼', locale)}<input name="displayName" autoComplete="nickname" required maxLength={80} disabled={busy} /></label><label>{uiText('本人邮箱', locale)}<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label><label>{uiText('设置密码（至少 12 位）', locale)}<input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={busy} /></label><label>{uiText('再次输入密码', locale)}<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required disabled={busy} /></label></div>
      <label className={styles.check}><input name="consent" type="checkbox" required disabled={busy} />{uiText('我使用本人邮箱注册，并由本人填写参赛资料。', locale)}</label>{error && <p className={styles.error} role="alert">{translateRegistrationError(error, locale)}</p>}<button className={styles.primary} disabled={busy}>{uiText(busy ? '正在创建…' : '创建账号并验证邮箱', locale)}</button>
    </form>}
  </section>
}

function JoinApplicationForm({ prefill, applicationRevision, eligibilityRequired, rulebook, busy, onSave }) {
  const locale = useUiLocale()
  const [dirty, setDirty] = useState(false)
  const [reset, setReset] = useState(0)
  useRegistrationDraft(dirty, { label: '本人入队申请', busy, discard: () => { setReset(value => value + 1); setDirty(false) } })
  return <form key={reset} className={styles.form} onChange={() => setDirty(true)} onSubmit={async event => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const saved = await onSave({ displayName: values.get('displayName').trim(), battleTag: values.get('battleTag').trim(), role: values.get('role'),
      consent: values.get('consent') === 'on', ...(applicationRevision === undefined ? {} : { applicationRevision }),
      ...(eligibilityRequired ? { eligibility: readWeeklyEligibility(values) } : {}) })
    if (saved) setDirty(false)
  }}><h3>{uiText('本人参赛资料', locale)}</h3><div className={styles.fields}>
    <label>{uiText('本人称呼', locale)}<input name="displayName" defaultValue={prefill?.displayName || ''} required maxLength={80} disabled={busy} /></label>
    <label>{uiText('完整 BattleTag', locale)}<input name="battleTag" defaultValue={prefill?.battleTag || ''} placeholder={uiText('名称#12345', locale)} pattern={'\\s*[^\\s]+#[0-9]+\\s*'} required maxLength={80} disabled={busy} /></label>
    <label>{uiText('报名职责', locale)}<select name="role" defaultValue={prefill?.role || 'UNKNOWN'} disabled={busy}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{uiText(label, locale)}</option>)}</select></label>
  </div>{eligibilityRequired && <WeeklyEligibilityFields rulebook={rulebook} value={prefill?.eligibility} disabled={busy} />}
  <label className={styles.check}><input name="consent" type="checkbox" required disabled={busy} />{uiText('以上资料属于本人，我同意加入该队伍的本赛季报名，并提交经理审核。', locale)}</label><div className={styles.actions}><button className={styles.primary} disabled={busy}>{uiText(busy ? '正在提交…' : applicationRevision === undefined ? '提交经理审核' : '更新资料并提交经理审核', locale)}</button><span>{uiText('取得正式参赛资格前，仍需赛事管理员审核报名或增员申请。', locale)}</span></div></form>
}

export function RegistrationJoinManager({ record, seasonId, editable, busy, perform, onPendingChange }) {
  const locale = useUiLocale()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  const prefix = `/drafts/${record.id}`
  useEffect(() => {
    const controller = new AbortController()
    platformRequest(`${registrationPath(seasonId)}${prefix}/join-link`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        setData(result); setError('')
        onPendingChange(result.applications.filter(item => ['PENDING', 'RETURNED'].includes(item.status)).length)
      }).catch(failure => { if (!controller.signal.aborted) { setError(describeRegistrationError(failure)); onPendingChange(null) } })
    return () => controller.abort()
  }, [seasonId, prefix, record.revision, version, onPendingChange])
  async function action(kind) {
    if (kind === 'ROTATE' && !window.confirm(uiText('重新生成后，群内的旧链接将失效。已有申请会保留，是否继续？', locale))) return
    const result = await perform(`${prefix}/join-link`, { revision: record.revision, action: kind }, 'PUT', '共用报名链接')
    if (!result) return
    setData(result); setVersion(value => value + 1)
    setNotice(kind === 'CLOSE' ? '报名链接已关闭，已有申请仍可审核。' : '共用报名链接已准备好，可以发到队伍群。')
  }
  async function copy() {
    try { await navigator.clipboard.writeText(data.link.activationUrl); setNotice('共用报名链接已复制，可以发到队伍群。') }
    catch { setNotice('复制失败，请手动复制下方链接。') }
  }
  async function review(application, decision, reason) {
    const result = await perform(`${prefix}/join-applications/${application.id}/review`, {
      revision: record.revision, applicationRevision: application.revision, decision, reason
    }, 'POST', '入队申请审核')
    if (result) { setVersion(value => value + 1); setNotice(decision === 'ACCEPT' ? result.application?.addition ? '经理审核已通过，等待赛事管理员审核增员。' : '已通过申请，队员进入报名名单。' : '审核结果已发送给本人。'); return true }
    return false
  }
  const active = (data?.applications || []).filter(item => ['PENDING', 'RETURNED'].includes(item.status))
  const history = (data?.applications || []).filter(item => !['PENDING', 'RETURNED'].includes(item.status))
  const manageLink = data?.canManageLink ?? editable
  const reviewable = data?.canReviewApplications ?? editable
  const canAccept = data?.canAcceptApplications ?? editable
  const additionMode = data?.joinMode === 'TEAM_ADDITION'
  return <section className={styles.manager} data-i18n-ignore>
    <div className={styles.row}><div><span>TEAM JOIN LINK</span><h3>{uiText('队伍邀请链接', locale)}</h3><p>{uiText(additionMode ? '发到队伍群，让新队员本人填写；经理通过后提交赛事增员审核。' : '发到队伍群，让队员各自填写；审核通过后进入报名名单。', locale)}</p></div><b>{active.length} {uiText('待处理', locale)}</b></div>
    {error && <p className={styles.error} role="alert">{translateRegistrationError(error, locale)} <button type="button" disabled={busy} onClick={() => setVersion(value => value + 1)}>{uiText('重新读取', locale)}</button></p>}
    {!data && !error && <p role="status">{uiText('正在读取申请…', locale)}</p>}
    {notice && <p role="status" className={styles.success}>{uiText(notice, locale)}</p>}
    {data && <><div className={styles.actions}>{data.link?.activationUrl ? <><input aria-label={uiText('队内共用报名链接', locale)} readOnly value={data.link.activationUrl} /><button type="button" onClick={copy}>{uiText('复制共用链接', locale)}</button>{manageLink && <><button type="button" disabled={busy} onClick={() => action('OPEN')}>{uiText('延长链接有效期', locale)}</button><button type="button" disabled={busy} onClick={() => action('CLOSE')}>{uiText('关闭链接', locale)}</button><button type="button" disabled={busy} onClick={() => action('ROTATE')}>{uiText('重新生成报名链接', locale)}</button></>}</> : manageLink ? <button className={styles.primary} type="button" disabled={busy} onClick={() => action('OPEN')}>{uiText(data.link?.status === 'ACTIVE' ? '续期并保留原链接' : data.link ? '重新开放共用链接' : '生成队内共用链接', locale)}</button> : <span>{uiText('当前入口不接受新的入队申请。', locale)}</span>}</div>
      {data.link?.activationUrl && <p>{uiText('有效期至', locale)} {new Date(data.link.expiresAt).toLocaleString(locale)} · {uiText('刷新页面后仍可复制同一个链接。', locale)}</p>}
      {data.joinMode === 'WAITING_REVIEW' && <p>{uiText('队伍报名正在审核，可以先提交本人资料；已送审名单不会改变。', locale)}</p>}
      {active.length > 0 ? <div className={styles.applications}>{active.map(application => <JoinReview key={`${application.id}:${application.revision}`} application={application} editable={reviewable} canAccept={canAccept} additionMode={additionMode} busy={busy} onReview={review} />)}</div> : <p>{uiText('当前没有待审核的入队申请。', locale)}</p>}
      {active.length > 0 && data.joinMode !== 'WAITING_REVIEW' && !additionMode && <p>{uiText('请先处理所有待审核或待补充的申请，再统一提交队伍报名。', locale)}</p>}
      {history.length > 0 && <details className={styles.history}><summary>{uiText('已处理申请', locale)} · {history.length}</summary>{history.map(item => <p key={item.id}>{item.displayName} · {item.battleTag} · {uiText(joinApplicationStatusLabel(item), locale)}{item.reviewNote ? ` · ${item.reviewNote}` : ''}{item.addition?.reviewNote ? ` · ${item.addition.reviewNote}` : ''}</p>)}</details>}
    </>}
  </section>
}

function JoinReview({ application, editable, canAccept, additionMode, busy, onReview }) {
  const locale = useUiLocale()
  const [reason, setReason] = useState('')
  useRegistrationDraft(Boolean(reason), { label: '入队申请审核', busy, discard: () => setReason('') })
  const eligibility = application.eligibility
  return <article className={styles.review}><div className={styles.row}><div><strong>{application.displayName}</strong><p>{application.battleTag} · {uiText(roles[application.role], locale)} · {application.email}</p></div><span className={styles.badge}>{uiText(joinApplicationStatusLabel(application), locale)}</span></div>
    {eligibility && <dl className={styles.eligibility}><div><dt>{uiText('国籍／地区', locale)}</dt><dd>{eligibility.countryOrRegion || uiText(eligibility.countryGroup === 'CN_HMT' ? '中国（含港澳台）' : '待补充具体国家、地区', locale)}</dd></div><div><dt>OWCS 2026</dt><dd>{uiText(eligibility.owcs2026 === 'NONE' ? '没有参加' : eligibility.owcs2026 === 'QUALIFIERS' ? '仅海选／公开预选' : '进入正赛名单', locale)}</dd></div><div><dt>{uiText('当前段位', locale)}</dt><dd>T {eligibility.ranks?.tank} · D {eligibility.ranks?.damage} · S {eligibility.ranks?.support}</dd></div></dl>}
    {application.reviewNote && <p>{uiText('上次审核意见：', locale)}{application.reviewNote}</p>}
    {editable && <><label>{uiText('审核意见（退回补充时必填）', locale)}<input value={reason} maxLength={1000} disabled={busy} placeholder={uiText('例如：请核对战网 ID，或补充段位信息', locale)} onChange={event => setReason(event.target.value)} /></label><div className={styles.actions}>{application.status === 'PENDING' ? <><button className={styles.primary} type="button" disabled={busy || !canAccept} onClick={async () => { if (await onReview(application, 'ACCEPT', reason.trim())) setReason('') }}>{uiText(additionMode ? '经理通过并提交增员审核' : '审核通过并加入名单', locale)}</button><button type="button" disabled={busy || !reason.trim()} onClick={async () => { if (await onReview(application, 'RETURN', reason.trim())) setReason('') }}>{uiText('退回补充', locale)}</button></> : <span>{uiText('等待队员本人补充并重新提交。', locale)}</span>}<button type="button" disabled={busy} onClick={async () => { if (await onReview(application, 'REJECT', reason.trim())) setReason('') }}>{uiText('拒绝申请', locale)}</button></div></>}
  </article>
}

export function MyRegistrationJoinApplications({ seasonId }) {
  const locale = useUiLocale()
  const [applications, setApplications] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async signal => {
    try {
      const result = await platformRequest(`${registrationPath(seasonId)}/join-applications/me`, { signal })
      if (!signal?.aborted) { setApplications(result.applications); setError('') }
    } catch (failure) { if (!signal?.aborted) setError(describeRegistrationError(failure)) }
  }, [seasonId])
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort() }, [load])
  async function withdraw(item) {
    setBusy(true); setError('')
    try { await platformRequest(`${registrationPath(seasonId)}/join-applications/${item.id}/withdraw`, { method: 'POST', body: { applicationRevision: item.revision } }); await load() }
    catch (failure) { setError(describeRegistrationError(failure)) }
    finally { setBusy(false) }
  }
  if (applications?.length === 0 && !error) return null
  return <section className={styles.manager} data-i18n-ignore><div className={styles.row}><h3>{uiText('本人的入队申请', locale)}</h3><button type="button" disabled={busy} onClick={() => load()}>{uiText('刷新审核状态', locale)}</button></div>{error && <p role="alert" className={styles.error}>{uiText(error, locale)}</p>}{applications?.map(item => <article className={styles.review} key={item.id}><div className={styles.row}><strong>{item.shortName} · {item.teamName}</strong><span>{uiText(joinApplicationStatusLabel(item), locale)}</span></div><p>{item.displayName} · {item.battleTag}</p>{item.reviewNote && <p>{item.reviewNote}</p>}{item.addition?.reviewNote && <p>{item.addition.reviewNote}</p>}{canWithdrawJoinApplication(item) && <button type="button" disabled={busy} onClick={() => withdraw(item)}>{uiText('撤回本人申请', locale)}</button>}{canEditJoinApplication(item) && <p>{uiText('需要修改时，请重新打开队伍群内的共用链接。', locale)}</p>}</article>)}</section>
}
