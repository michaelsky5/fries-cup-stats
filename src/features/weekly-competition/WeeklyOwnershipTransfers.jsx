import { useCallback, useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from '../event-registration/registrationDraftGuard.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyTeamAdditions.module.css'

const labels = { PENDING: '待接任者确认', SUBMITTED: '待管理员审核', APPROVED: '交接已生效', REJECTED: '未通过', CANCELLED: '已取消', DECLINED: '接任者已拒绝', EXPIRED: '已过期' }
const empty = { email: '', password: '', reason: '', consent: false }
export default function WeeklyOwnershipTransfers({ seasonId, readOnly = false, onHasTransfers, onChanged }) {
  const locale = useUiLocale(), t = text => uiText(text, locale)
  const [data, setData] = useState(null), [teamId, setTeamId] = useState(''), [form, setForm] = useState(empty)
  const [responses, setResponses] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const mounted = useRef(false), lock = useRef(false)
  const base = `/seasons/${encodeURIComponent(seasonId)}/registration`
  useRegistrationDraft(Object.keys(empty).some(key => form[key] !== empty[key]) || Object.keys(responses).length > 0, { label: '队伍所有权转让', busy, discard: () => { setForm(empty); setResponses({}) } })
  const refresh = useCallback(async signal => {
    try {
      const next = await platformRequest(`${base}/ownership-transfers`, { signal })
      if (!signal?.aborted && mounted.current) { setData(next); setError(''); onHasTransfers?.(next.transfers.length > 0); setTeamId(current => next.teams.some(team => team.id === current) ? current : next.teams[0]?.id || '') }
    } catch (failure) { if (!signal?.aborted && mounted.current) { setData(null); setError(failure.message) } }
  }, [base, onHasTransfers])
  useEffect(() => { mounted.current = true; const controller = new AbortController(); refresh(controller.signal); return () => { mounted.current = false; controller.abort() } }, [refresh])
  const writable = data?.canWrite && !readOnly && !busy
  const team = data?.teams.find(item => item.id === teamId)
  async function action(suffix, body, message) {
    if (!writable || lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await platformRequest(base + suffix, { method: 'POST', body })
      if (!mounted.current) return
      setForm(empty); setResponses({}); setNotice(message)
      await refresh(); await onChanged?.()
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const responseField = (id, key, value) => setResponses(current => ({ ...current, [id]: { ...current[id], [key]: value } }))
  if (data && !data.teams.length && !data.transfers.length) return null
  return <section className={styles.panel} id="weekly-ownership-transfers" aria-label={t('队伍所有权转让')}>
    <header><div><h3>{t('队伍所有权转让')}</h3><p>{t('现负责人发起 → 接任者本人确认 → System 管理员审核生效。')}</p></div><button type="button" disabled={busy} onClick={() => refresh()}>{t('刷新交接记录')}</button></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status">{t(notice)}</p>}
    {!data ? <p>{t('正在读取交接记录；读取失败时请刷新。')}</p> : <>
      {data.teams.length > 0 && <details><summary>{t('发起所有权转让')}</summary><form onSubmit={event => { event.preventDefault(); action(`/teams/${encodeURIComponent(teamId)}/ownership-transfers`, { ...form, fingerprint: team.fingerprint }, '转让已发起，请接任者登录本赛季报名页确认。') }}>
        <label>{t('队伍')}<select value={teamId} disabled={!writable} onChange={event => { setTeamId(event.target.value); setForm(empty) }}>{data.teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {team?.unavailableReason ? <p role="alert">{team.unavailableReason}</p> : <><Scope scope={team?.scope} t={t} /><p>{t('交接生效后，原负责人的队伍管理权限将移交；已确认的出赛名单和赛果保留。原负责人尚未完成的增员申请将取消，由新负责人重新发起。')}</p>
          <div className={styles.fields}><label>{t('接任者账号邮箱')}<input type="email" required maxLength={254} value={form.email} autoComplete="off" disabled={!writable} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label><label>{t('当前账号密码')}<input type="password" required autoComplete="current-password" value={form.password} disabled={!writable} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></label></div>
          <p>{t('接任者须已有已验证账号，且能够进入这些赛季的报名页。')}</p>
          <label>{t('转让原因')}<input required minLength={2} maxLength={1000} value={form.reason} disabled={!writable} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} /></label>
          <label><input type="checkbox" required checked={form.consent} disabled={!writable} onChange={event => setForm(current => ({ ...current, consent: event.target.checked }))} /> {t('我已核对接任邮箱及交接范围，同意审核通过后移交管理权限。')}</label>
          <button type="submit" disabled={!writable || !team?.fingerprint || data.transfers.some(row => row.organizationId === team.organizationId && ['PENDING', 'SUBMITTED'].includes(row.status))}>{t('确认发起转让')}</button>
        </>}
      </form></details>}
      {(!data.canWrite || readOnly) && <p>{t('当前入口仅可查看交接记录。')}</p>}
      {!data.transfers.length ? <p>{t('暂无所有权转让申请。')}</p> : <ul className={styles.records}>{data.transfers.map(row => <li key={row.id}>
        <strong>{row.team.name} · {t(labels[row.status])}</strong><p>{row.fromName} → {row.toName} · {row.toEmail}</p><p>{t('转让原因')}：{row.reason}</p><Scope scope={row.scope} t={t} />
        {['PENDING', 'SUBMITTED'].includes(row.status) && <p>{t('确认和审核有效至：')}{new Date(row.expiresAt).toLocaleString()}</p>}
        {row.reviewNote && <p>{t('审核说明：')}{row.reviewNote}</p>}
        {row.status === 'APPROVED' && <p>{t('交接已生效。请刷新周赛资料和报名资料，查看当前管理权限。')}</p>}
        {row.status === 'PENDING' && row.toUserId === data.userId && <form onSubmit={event => { event.preventDefault(); action(`/ownership-transfers/${row.id}/respond`, { action: 'ACCEPT', revision: row.revision, ...responses[row.id] }, '接任已确认，等待 System 管理员审核。') }}>
          <p>{t('审核通过后，你将接管上述队伍及赛季报名。')}</p>
          <div className={styles.fields}><label>{t('当前账号密码')}<input type="password" required autoComplete="current-password" disabled={!writable} value={responses[row.id]?.password || ''} onChange={event => responseField(row.id, 'password', event.target.value)} /></label><label>{t('接任后的联系方式')}<input required minLength={3} maxLength={240} disabled={!writable} value={responses[row.id]?.contact || ''} onChange={event => responseField(row.id, 'contact', event.target.value)} /></label></div>
          <label><input type="checkbox" required checked={responses[row.id]?.consent || false} disabled={!writable} onChange={event => responseField(row.id, 'consent', event.target.checked)} /> {t('我已核对交接范围，同意接任队伍负责人并提交管理员审核。')}</label><button type="submit" disabled={!writable}>{t('本人确认接任')}</button>
        </form>}
        {['PENDING', 'SUBMITTED'].includes(row.status) && <div className={styles.actions}>
          {row.fromUserId === data.userId && <button type="button" disabled={!writable} onClick={() => action(`/ownership-transfers/${row.id}/respond`, { action: 'CANCEL', revision: row.revision }, '转让已撤回，队伍归属未改变。')}>{t('撤回转让')}</button>}
          {row.toUserId === data.userId && <button type="button" disabled={!writable} onClick={() => action(`/ownership-transfers/${row.id}/respond`, { action: 'DECLINE', revision: row.revision }, '已拒绝接任，队伍归属未改变。')}>{t('拒绝接任')}</button>}
        </div>}
      </li>)}</ul>}
    </>}
  </section>
}

function Scope({ scope = [], t }) {
  return <div><strong>{t('交接范围（队伍归属及以下未归档赛季）')}</strong><ul>{scope.map(item => <li key={item.registrationId}>{item.seasonName} · {item.teamName}</li>)}</ul></div>
}
