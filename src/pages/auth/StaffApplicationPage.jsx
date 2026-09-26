import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'
import { platformRequest } from '../../features/auth/platformApi.js'
import { withAccountCompetition } from '../../features/my-space/accountCompetitionModel.js'
import { translateUiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyAdminInvitationPage.module.css'
import formStyles from './StaffApplicationPage.module.css'

const endpoint = '/auth/staff-applications'
const credential = () => new URLSearchParams(window.location.hash.slice(1)).get('verify') || ''
const roleNames = { REFEREE: '赛管', CASTER: '解说' }
export default function StaffApplicationPage() {
  const locale = useUiLocale(), [params] = useSearchParams()
  const t = (value, values) => translateUiText(value, locale, values)
  const seasonId = params.get('competition') || params.get('season') || ''
  const [token, setToken] = useState(credential)
  const [context, setContext] = useState(null), [application, setApplication] = useState(null)
  const [form, setForm] = useState({ accountMode: 'EXISTING', displayName: '', battleTag: '', email: '', password: '', confirmation: '', roles: ['REFEREE'] })
  const [step, setStep] = useState('form'), [delivery, setDelivery] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  const pending = useRef(false), heading = useRef(null)
  useEffect(() => {
    const changed = () => { const next = credential(); if (next) { setToken(next); setStep('form') } }
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  useEffect(() => {
    document.title = '工作人员申请 | 薯条杯'
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    const controller = new AbortController()
    setContext(null); setError('')
    if (!token && !seasonId) return () => controller.abort()
    const request = token ? platformRequest(endpoint + '/preview', { method: 'POST', body: { token }, signal: controller.signal })
      : platformRequest(endpoint + '?seasonId=' + encodeURIComponent(seasonId), { signal: controller.signal })
    request.then(result => {
      if (controller.signal.aborted) return
      if (result.application) { setApplication(result.application); setContext({ season: { id: result.application.seasonId, name: result.application.seasonName }, intake: { enabled: true } }) }
      else setContext(result)
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [seasonId, token, attempt])
  useEffect(() => { if (step !== 'form') heading.current?.focus() }, [step])
  const edit = patch => setForm(current => ({ ...current, ...patch }))
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    if (!token && form.accountMode === 'NEW' && form.password !== form.confirmation) { setError('两次输入的密码不一致。'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      if (token) {
        const result = await platformRequest(endpoint + '/complete', { method: 'POST', body: { token } })
        setApplication(result.application); setStep('done')
      } else {
        const { confirmation: _confirmation, ...body } = form
        const result = await platformRequest(endpoint + '/begin', { method: 'POST', body: { ...body, seasonId: context.season.id } })
        setApplication(result.application); setDelivery(result.emailDelivery); edit({ password: '', confirmation: '' })
        setStep(result.alreadySubmitted ? 'done' : 'email')
      }
    } catch (failure) { setError(failure.message) }
    finally { pending.current = false; setBusy(false) }
  }
  const stage = step === 'done' ? 3 : step === 'email' || token ? 2 : 1
  return <AccountFrame title={t('申请赛管与解说')} eyebrow="JOIN THE CREW" description={t('复用一个本人账号，参与赛事工作。')} compact>
    <section className={styles.card} aria-labelledby="staff-application-title">
      <ol className={styles.steps} aria-label={t('工作人员申请流程')}>{[t('填写申请'), t('验证邮箱'), t('等待审核')].map((name, index) => <li key={name} aria-current={stage === index + 1 ? 'step' : undefined}><span>0{index + 1}</span>{name}</li>)}</ol>
      <div className={styles.body}><p className={styles.kicker} data-i18n-ignore>{context?.season.name || t('工作人员申请')}</p>
        <h2 ref={heading} id="staff-application-title" tabIndex={-1}>{step === 'done' ? t(application?.status === 'APPROVED' ? '申请已审核通过' : '申请已提交，等待管理员审核') : step === 'email' ? t('请到邮箱确认申请') : token ? t('验证本人邮箱并提交申请') : t('选择你希望参与的职责')}</h2>
        {!seasonId && !token ? <p role="alert">{t('链接缺少赛事信息，请使用管理员分享的完整共用链接。')}</p> : !context ? <><p role={error ? 'alert' : 'status'}>{t(error || '正在读取申请入口…')}</p>{error && <button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>{t('重新读取入口')}</button>}</> : !context.intake.enabled ? <p role="status">{t('本届工作人员申请暂未开放，请联系赛事管理员。')}</p> : step === 'done' ? <>
          <p>{t(application.status === 'APPROVED' ? '本届职责已批准，具体场次按正式排班开放。' : '邮箱已验证，申请已进入审核列表。审核通过前不会获得赛管或解说权限。')}</p>
          <div className={styles.scope}><strong>{application.displayName} · {(application.status === 'APPROVED' ? application.approvedRoles : application.roles).map(role => t(roleNames[role])).join(' / ')}</strong>{application.reviewNote && <p data-i18n-ignore>{application.reviewNote}</p>}</div>
          <p>{t('已有选手身份、原密码和队伍关系均保留。请使用刚才的本人邮箱登录，在账号概览查看审核结果。')}</p>
          <Link className={styles.primary} to={withAccountCompetition('/account', context.season.id)}>{t('登录并查看申请状态 →')}</Link>
        </> : step === 'email' ? <>
          <p>{t('验证邮件已发送至 {0}。打开邮件链接后确认提交申请。', [application.maskedEmail])}</p>
          <p role={delivery?.delivered ? 'status' : 'alert'} className={!delivery?.delivered ? styles.error : undefined}>{t(delivery?.delivered ? '邮件服务已受理发送，请检查收件箱和垃圾邮件。' : '邮件投递未确认，申请尚未提交。请稍后重试或联系管理员。')}</p>
          <p className={styles.hint}>{t('邮箱确认链接 30 分钟内有效；重新发送后旧验证链接失效。')}</p>
          <button className={styles.secondary} onClick={() => { setStep('form'); setError('') }}>{t('返回 / 重新发送验证邮件')}</button>
        </> : <form onSubmit={submit}>
          {token ? <div className={styles.scope}><strong>{application.displayName} · {application.roles.map(role => t(roleNames[role])).join(' / ')}</strong><p>{t('确认邮箱 {0} 后，申请会交给本届管理员审核。', [application.maskedEmail])}</p></div> : <>
            <div className={formStyles.modes} aria-label={t('账号使用方式')}>{['EXISTING', 'NEW'].map(mode => <button type="button" key={mode} aria-pressed={form.accountMode === mode} disabled={busy} onClick={() => edit({ accountMode: mode, password: '', confirmation: '' })}>{t(mode === 'EXISTING' ? '使用已有账号' : '创建新账号')}</button>)}</div>
            <p className={styles.hint}>{t('已经是选手或工作人员，请使用原账号，无需重复注册。')}</p>
            <label className={styles.field}>{t('本人邮箱')}<input type="email" autoComplete="email" required maxLength={254} value={form.email} disabled={busy} onChange={event => edit({ email: event.target.value })} /></label>
            <label className={styles.field}>{t(form.accountMode === 'NEW' ? '设置账号密码' : '原账号密码')}<input type="password" autoComplete={form.accountMode === 'NEW' ? 'new-password' : 'current-password'} required minLength={form.accountMode === 'NEW' ? 12 : 8} maxLength={128} value={form.password} disabled={busy} onChange={event => edit({ password: event.target.value })} /></label>
            {form.accountMode === 'NEW' && <label className={styles.field}>{t('再次输入密码')}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.confirmation} disabled={busy} onChange={event => edit({ confirmation: event.target.value })} /><small>{t('新账号密码至少需要 12 个字符。')}</small></label>}
            <div className={styles.passwords}><label className={styles.field}>{t('工作人员称呼')}<input required maxLength={80} autoComplete="nickname" value={form.displayName} disabled={busy} onChange={event => edit({ displayName: event.target.value })} /></label><label className={styles.field}>BattleTag<input required minLength={3} maxLength={120} value={form.battleTag} disabled={busy} placeholder="Name#1234" onChange={event => edit({ battleTag: event.target.value })} /></label></div>
            <fieldset className={formStyles.roles} disabled={busy}><legend>{t('申请职责（可多选）')}</legend>{Object.entries(roleNames).map(([role, name]) => <label key={role}><input type="checkbox" checked={form.roles.includes(role)} onChange={event => edit({ roles: event.target.checked ? [...form.roles, role] : form.roles.filter(value => value !== role) })} />{t(name)}</label>)}</fieldset>
          </>}
          <p className={styles.hint}>{t('本届管理员会查看你的邮箱、称呼、BattleTag 和申请职责。身份审核通过后仍须安排具体场次；本队比赛保留参赛身份。')}</p>
          {error && <p role="alert" className={styles.error}>{t(error)}</p>}
          <button type="submit" className={styles.primary} disabled={busy || (!token && !form.roles.length)}>{t(busy ? '正在处理…' : token ? '验证邮箱并提交申请' : '发送本人邮箱验证 →')}</button>
        </form>}
      </div>
    </section>
  </AccountFrame>
}
