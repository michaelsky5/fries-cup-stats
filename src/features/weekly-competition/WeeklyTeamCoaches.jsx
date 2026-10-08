import { useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from '../event-registration/registrationDraftGuard.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyTeamAdditions.module.css'
import WeeklyCoachInvitations from './WeeklyCoachInvitations.jsx'

const empty = { displayName: '', battleTag: '', contact: '' }
const messages = {
  WEEKLY_COACH_STALE: '教练或队伍资料已更新，请刷新后重试。',
  WEEKLY_COACH_DUPLICATE: '当前队伍已有相同 BattleTag 的教练。',
  WEEKLY_COACH_LINKED_IDENTITY: '已绑定账号的教练不能在这里更换 BattleTag，请先通过账号管理核对身份。',
  WEEKLY_COACH_NOT_FOUND: '这位教练不属于当前队伍，请刷新后核对。',
  TEAM_INACTIVE: '队伍已停用，不能补录教练。',
  SEASON_LOCKED: '当前赛季已经归档，只能查看教练资料。',
  WEEKLY_WRITE_CONFLICT: '教练或队伍资料已更新，请刷新后重试。'
}
const failureText = failure => messages[failure?.data?.error] || failure.message
export default function WeeklyTeamCoaches({ teamId, readOnly = false, onActivityChange }) {
  const locale = useUiLocale(), t = text => uiText(text, locale)
  const [data, setData] = useState(null), [form, setForm] = useState(empty), [editingId, setEditingId] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const mounted = useRef(true), lock = useRef(false)
  const base = `/me/weekly-teams/${encodeURIComponent(teamId)}/coaches`
  const reset = () => { setEditingId(''); setForm(empty) }
  const dirty = editingId ? Object.keys(empty).some(key => form[key] !== (data?.coaches.find(coach => coach.id === editingId)?.[key] || '')) : Object.values(form).some(Boolean)
  useRegistrationDraft(dirty, { label: '队伍教练资料', busy, discard: reset })
  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    platformRequest(base, { signal: controller.signal }).then(next => { if (mounted.current) setData(next) }).catch(failure => { if (mounted.current && !controller.signal.aborted) setError(failureText(failure)) })
    return () => { mounted.current = false; controller.abort() }
  }, [base])
  const writable = data?.canWrite && !readOnly && !busy
  async function refresh() {
    try { setData(await platformRequest(base)); setError('') } catch (failure) { setError(failureText(failure)) }
  }
  async function save(event) {
    event.preventDefault()
    if (!writable || lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const next = await platformRequest(base, { method: 'POST', body: { ...form, fingerprint: data.fingerprint, ...(editingId ? { id: editingId } : {}) } })
      if (mounted.current) { setData(next); reset(); setNotice('教练资料已保存。'); onActivityChange?.() }
    } catch (failure) { if (mounted.current) setError(failureText(failure)) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <section className={styles.panel} aria-label={t('队伍教练资料')}>
    <header><div><h3>{t('教练补录与资料维护')}</h3><p>{data?.team.name}</p></div><button type="button" disabled={busy || dirty} onClick={refresh}>{t('刷新资料')}</button></header>
    <p>{t('补录教练称呼、完整 BattleTag 和联系方式；保存后会显示在队伍职员资料中。')}</p>
    {error && <p role="alert" className={styles.error}>{t(error)}</p>}{notice && <p role="status">{t(notice)}</p>}
    {!data ? <p>{t('正在读取教练资料；读取失败时可点击刷新。')}</p> : <>
      {data.coaches.length ? <ul className={styles.records}>{data.coaches.map(coach => <li key={coach.id}><strong>{coach.displayName}</strong><p><code>{coach.battleTag || t('BattleTag 待补全')}</code>{coach.accountLinked ? ` · ${t('已绑定账号')}` : ''}</p><p>{coach.contact || t('未填写联系方式')}</p><button type="button" disabled={!writable || dirty} onClick={() => { setEditingId(coach.id); setForm({ displayName: coach.displayName, battleTag: coach.battleTag, contact: coach.contact }); setNotice('') }}>{t('编辑教练')}</button></li>)}</ul> : <p>{t('暂未录入教练。')}</p>}
      <form onSubmit={save}>
        <h4>{t(editingId ? '修改教练资料' : '补录教练')}</h4>
        <div className={styles.fields}>{[['displayName', '教练称呼'], ['battleTag', '完整 BattleTag'], ['contact', '联系方式（用于队内联络）']].map(([key, label]) => <label key={key}>{t(label)}<input value={form[key]} maxLength={key === 'contact' ? 240 : 80} required={key !== 'contact'} pattern={key === 'battleTag' ? '[^#\\s]+#[0-9]+' : undefined} disabled={!writable || (key === 'battleTag' && data.coaches.find(coach => coach.id === editingId)?.accountLinked)} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
        <div className={styles.actions}><button type="submit" disabled={!writable || !dirty}>{t(busy ? '保存中…' : '保存教练资料')}</button>{(editingId || dirty) && <button type="button" disabled={busy} onClick={reset}>{t('取消编辑')}</button>}</div>
      </form>
      {data.canWrite && !readOnly && <WeeklyCoachInvitations key={teamId} teamId={teamId} coaches={data.coaches} disabled={!writable || dirty} onChanged={() => { refresh(); onActivityChange?.() }} />}
    </>}
  </section>
}
