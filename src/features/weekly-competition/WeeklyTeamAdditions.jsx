import { useCallback, useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from '../event-registration/registrationDraftGuard.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyTeamAdditions.module.css'

const empty = { displayName: '', email: '', battleTag: '', role: 'UNKNOWN' }
const labels = { INVITED: '待选手本人确认', SUBMITTED: '待管理员审核', APPROVED: '已加入队伍', REJECTED: '未通过', CANCELLED: '已取消' }
export default function WeeklyTeamAdditions({ seasonId, readOnly = false, onHasAdditions }) {
  const locale = useUiLocale(), t = text => uiText(text, locale)
  const [data, setData] = useState(null), [teamId, setTeamId] = useState(''), [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [link, setLink] = useState(null), [notice, setNotice] = useState('')
  const mounted = useRef(false), lock = useRef(false)
  const base = `/seasons/${encodeURIComponent(seasonId)}/registration`
  const dirty = Object.keys(empty).some(key => form[key] !== empty[key])
  useRegistrationDraft(dirty, { label: '新增队员', busy, discard: () => setForm(empty) })
  const refresh = useCallback(async signal => {
    try {
      const next = await platformRequest(`${base}/team-additions`, { signal })
      if (!signal?.aborted && mounted.current) { setData(next); onHasAdditions?.(next.additions.length > 0); setTeamId(current => next.teams.some(team => team.id === current) ? current : next.teams[0]?.id || '') }
    } catch (failure) { if (!signal?.aborted && mounted.current) { setData(null); setError(failure.message) } }
  }, [base, onHasAdditions])
  useEffect(() => { mounted.current = true; const controller = new AbortController(); refresh(controller.signal); return () => { mounted.current = false; controller.abort() } }, [refresh])
  const writable = data?.canWrite && !readOnly && !busy
  async function action(suffix, body, message, creating = false) {
    if (lock.current || !writable) return
    lock.current = true; setBusy(true); setError(''); setNotice(''); setLink(null)
    try {
      const result = await platformRequest(base + suffix, { method: 'POST', body })
      if (!mounted.current) return
      if (result.invitation) setLink(result.invitation)
      if (creating) setForm(empty)
      setNotice(message)
      await refresh()
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  if (data && !data.teams.length && !data.additions.length) return null
  return <section className={styles.panel} id="weekly-team-additions" aria-label={t('队伍自主增员')}>
    <header><div><h3>{t('队伍自主增员')}</h3><p>{t('负责人邀请 → 选手本人确认 → System 管理员审核 → 加入队内名单。')}</p></div><button type="button" disabled={busy} onClick={() => { setError(''); refresh() }}>{t('刷新增员记录')}</button></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status">{t(notice)}</p>}
    {!data ? <p>{t('正在读取增员记录；读取失败时可点击刷新。')}</p> : <>
      {data.teams.length > 0 && <details><summary>{t('邀请新队员')}</summary><form onSubmit={event => { event.preventDefault(); action(`/teams/${encodeURIComponent(teamId)}/additions`, form, '邀请已生成，选手确认后将进入 System 审核。', true) }}>
        <label>{t('队伍')}<select value={teamId} onChange={event => setTeamId(event.target.value)} disabled={!writable}>{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <div className={styles.fields}>{[['displayName', '选手称呼', 'text'], ['email', '选手本人邮箱', 'email'], ['battleTag', '完整 BattleTag', 'text']].map(([key, label, type]) => <label key={key}>{t(label)}<input type={type} value={form[key]} required maxLength={key === 'email' ? 254 : 80} pattern={key === 'battleTag' ? '[^\\s]+#[0-9]+' : undefined} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} disabled={!writable} /></label>)}<label>{t('职责')}<select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))} disabled={!writable}>{Object.entries({ UNKNOWN: '待确定', TANK: '重装', DPS: '输出', SUP: '支援', FLEX: '自由人' }).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label></div>
        <p>{t('增员通过后，请刷新周赛资料并选择当周出赛名单。已锁定的名单和历史赛绩不会自动改变。')}</p><button type="submit" disabled={!writable || !teamId}>{t('生成增员邀请')}</button>
      </form></details>}
      {!data.canWrite || readOnly ? <p>{t('当前入口仅可查看增员记录。')}</p> : null}
      {link && <div className={styles.link}><p>{t('将邀请链接交给该选手本人；重新生成后旧链接失效。')}</p><input readOnly aria-label={t('增员邀请链接')} value={link.activationUrl} onFocus={event => event.target.select()} /><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link.activationUrl); setNotice('邀请链接已复制。') } catch { setError(t('复制失败，请选中链接手动复制。')) } }}>{t('复制邀请链接')}</button></div>}
      {!data.additions.length ? <p>{t('暂无增员申请。')}</p> : <ul className={styles.records}>{data.additions.map(row => <li key={row.id}>
        <strong>{row.team.name} · {row.displayName}</strong><p>{row.battleTag} · {t(labels[row.status])}</p>
        {row.status === 'INVITED' && row.invitation && <p>{t('邀请有效至：')}{new Date(row.invitation.expiresAt).toLocaleString()}</p>}
        {row.reviewNote && <p>{t('审核说明：')}{row.reviewNote}</p>}
        {row.status === 'APPROVED' && <p>{t('已进入队内名单。队长可刷新周赛资料，选择开放周次的出赛名单。')}</p>}
        {['INVITED', 'SUBMITTED'].includes(row.status) && <div className={styles.actions}>{row.status === 'INVITED' && data.teams.some(team => team.id === row.teamId) && <button type="button" disabled={!writable} onClick={() => action(`/team-additions/${row.id}/resend`, { revision: row.revision }, '邀请已重新生成，旧链接失效。')}>{t('重新生成邀请')}</button>}<button type="button" disabled={!writable} onClick={() => action(`/team-additions/${row.id}/cancel`, { revision: row.revision }, '增员申请已取消。')}>{t('取消申请')}</button></div>}
      </li>)}</ul>}
    </>}
  </section>
}
