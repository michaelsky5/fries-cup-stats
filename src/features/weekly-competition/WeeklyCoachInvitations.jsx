import { useCallback, useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from '../event-registration/registrationDraftGuard.jsx'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './WeeklyTeamAdditions.module.css'

const statusLabels = { PENDING: '待教练本人确认', ACCEPTED: '已确认绑定', REVOKED: '已撤销', EXPIRED: '已过期' }
export default function WeeklyCoachInvitations({ teamId, coaches, disabled, onChanged }) {
  const locale = useUiLocale(), t = key => uiText(key, locale)
  const base = `/me/weekly-teams/${encodeURIComponent(teamId)}/coaches/account-links`
  const [invitations, setInvitations] = useState(null), [targetId, setTargetId] = useState(''), [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [issued, setIssued] = useState(null), [receipt, setReceipt] = useState('')
  const mounted = useRef(false), lock = useRef(false)
  useRegistrationDraft(Boolean(email), { label: '教练账号邀请', busy, discard: () => { setEmail(''); setTargetId('') } })
  const refresh = useCallback(async signal => {
    try { const result = await platformRequest(base, { signal }); if (mounted.current && !signal?.aborted) { setInvitations(result.invitations); setError(''); return true } }
    catch (failure) { if (mounted.current && !signal?.aborted) setError(failure.message) }
    return false
  }, [base])
  useEffect(() => { mounted.current = true; const controller = new AbortController(); refresh(controller.signal); return () => { mounted.current = false; controller.abort() } }, [refresh])
  const writable = !disabled && !busy
  async function refreshStatus() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { if (await refresh()) { setIssued(null); onChanged?.() } }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  async function issue(event) {
    event.preventDefault()
    if (!writable || lock.current) return
    lock.current = true; setBusy(true); setError(''); setIssued(null); setReceipt('')
    try {
      const result = await platformRequest(base, { method: 'POST', body: { targetType: 'COACH', targetId, email } })
      if (!mounted.current) return
      setIssued(result.invitation); setEmail(''); setTargetId(''); await refresh(); onChanged?.()
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  async function revoke(invitationId) {
    if (!writable || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await platformRequest(`${base}/${encodeURIComponent(invitationId)}/revoke`, { method: 'PATCH' }); if (mounted.current) { if (issued?.id === invitationId) setIssued(null); await refresh(); onChanged?.() } }
    catch (failure) { if (mounted.current) setError(failure.message) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const unlinked = coaches.filter(coach => !coach.accountLinked && !coach.id.startsWith('legacy-'))
  return <section className={styles.invitationPanel} aria-label={t('教练账号绑定')}>
    <header><div><h4>{t('教练账号绑定')}</h4><p>{t('负责人邀请 → 教练本人确认 → 关联本队。教练可查看本队比赛房，操作仍以本场代表权限为准。')}</p></div><button type="button" disabled={busy || disabled} onClick={refreshStatus}>{t('刷新绑定状态')}</button></header>
    {error && <p role="alert" className={styles.error}>{t(error)}</p>}
    {!invitations ? <p>{t('正在读取教练邀请；读取失败时请刷新。')}</p> : <>
      {unlinked.length > 0 ? <form onSubmit={issue}>
        <div className={styles.fields}><label>{t('选择教练')}<select required disabled={!writable} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">{t('请选择')}</option>{unlinked.map(coach => <option key={coach.id} value={coach.id}>{coach.displayName} · {coach.battleTag}</option>)}</select></label><label>{t('教练账号邮箱')}<input type="email" required autoComplete="off" maxLength={254} value={email} disabled={!writable} onChange={event => setEmail(event.target.value)} /></label></div>
        <p>{t('请教练先注册并验证邮箱。新邀请会撤销这位教练尚未确认的旧邀请；修改教练 BattleTag 后也需要重新邀请。')}</p>
        <button type="submit" disabled={!writable || !targetId}>{t(busy ? '正在生成…' : '生成教练绑定邀请')}</button>
      </form> : <p>{t('请先保存待绑定的教练资料；已绑定的教练无需再次邀请。')}</p>}
      {issued?.activationUrl && <div className={styles.invitationLink} role="status"><strong>{t('邀请已生成，等待教练本人确认')}</strong><p>{issued.maskedEmail} · {t('有效至：')}{new Date(issued.expiresAt).toLocaleString(locale)}</p><p>{t('将此链接私发给这位教练，请勿公开。教练确认前不会获得本队权限。')}</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(issued.activationUrl); setReceipt('绑定邀请链接已复制。') } catch { setReceipt('复制失败，请手动复制。') } }}>{t('复制教练邀请链接')}</button><input aria-label={t('教练邀请链接')} readOnly value={issued.activationUrl} onFocus={event => event.target.select()} />{receipt && <p>{t(receipt)}</p>}</div>}
      {invitations.length > 0 && <ul className={styles.records}>{invitations.map(invitation => <li key={invitation.id}><strong>{invitation.target.label} · {t(statusLabels[invitation.status] || invitation.status)}</strong><p>{invitation.maskedEmail} · {t('有效至：')}{new Date(invitation.expiresAt).toLocaleString(locale)}</p>{invitation.status === 'PENDING' && <button type="button" disabled={!writable} onClick={() => revoke(invitation.id)}>{t('撤销邀请')}</button>}</li>)}</ul>}
    </>}
  </section>
}
