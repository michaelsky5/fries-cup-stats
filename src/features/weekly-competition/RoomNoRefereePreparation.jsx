import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { getPlatformApiUrl } from '../auth/platformApi.js'
import { useRoomTransport } from './RoomTransport.jsx'
import { canRecordPreparationIncident } from './roomNoRefereePreparation.js'
import styles from './RoomNoRefereePreparation.module.css'
import roomStyles from './WeeklyLiveRoomPage.module.css'

const time = (value, locale) => value ? new Date(value).toLocaleTimeString(locale, { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-'

export function RoomPreparationIncidents({ data }) {
  const locale = useUiLocale(), incidents = data.timing?.preparationIncidents || []
  if (!incidents.length) return null
  const canSee = data.access.staff || data.access.representativeTeams.length > 0
  return <div className={styles.records}>{incidents.map(item => <div key={`${item.teamId}:${item.mapOrder}`}>
    <strong>{uiText('第 {0} 图 · {1} 已留证结束等待', locale, [item.mapOrder, [data.match.teamA, data.match.teamB].find(team => team.id === item.teamId)?.name || item.teamId])}</strong>
    <small>{time(item.at, locale)} UTC+8 · {uiText('待赛事组核验，不判胜负', locale)}</small><p>{item.reason}</p>
    {canSee && <a href={getPlatformApiUrl(`/weekly-live-rooms/${encodeURIComponent(data.match.id)}/opening/evidence/${item.evidenceId}`)} target="_blank" rel="noopener noreferrer">{uiText('查看证据截图', locale)}</a>}
  </div>)}</div>
}

export default function RoomNoRefereePreparation({ data, disabled, onReport, onSupport }) {
  const locale = useUiLocale(), timing = data.timing
  if (!timing?.noRefereePolicy || data.phase !== 'PREPARING') return null
  const grace = timing.noRefereeGrace, currentGrace = grace?.mapOrder === (data.map?.order || 1)
  const recorded = timing.preparationIncidents?.some(item => item.mapOrder === (data.map?.order || 1) && data.access.representativeTeams.includes(item.teamId))
  return <aside role="region" className={styles.notice} data-room-slot="no-referee-preparation" data-overdue={timing.preparationOverdue} aria-label={uiText('无赛管准备规则', locale)}>
    <strong>{uiText(recorded ? '本队已留证结束等待，待赛事组核验' : timing.preparationOverdue ? data.captainAgreements?.preparation.agreed ? '准备超时，双方已同意继续' : '准备超时，完整准备后双方确认继续' : currentGrace ? '本场已使用单次 3 分钟准备补时' : '无赛管 · 单次准备补时规则', locale)}</strong>
    <dl><div><dt>{uiText('到场截止', locale)}</dt><dd>{time(timing.arrivalDueAt, locale)} UTC+8</dd></div>{currentGrace && <div><dt>{uiText('补时前截止', locale)}</dt><dd>{time(grace.originalDueAt, locale)} UTC+8</dd></div>}<div><dt>{uiText(currentGrace ? '补时后准备截止' : '准备截止', locale)}</dt><dd>{time(timing.preparationDueAt, locale)} UTC+8</dd></div></dl>
    {grace && !currentGrace && <p>{uiText('本场补时已在第 {0} 图使用，本图不再自动补时。', locale, [grace.mapOrder])}</p>}
    <details className={styles.details}>
      <summary>{uiText('补时规则与留证记录', locale)}</summary>
      <p>{uiText('双方在到场截止前声明五名锁定名单选手到齐，准备超时后整场自动补时一次 3 分钟，无需临时表决。到场截止、选图和 Ban 超时处罚不变。', locale)}</p>
      <p>{uiText('五人到齐且选禁完整后，双方代表可同意超时继续开赛，原截止和处罚保留；仍无法开赛或有异议时，可留证结束现场等待，赛事组稍后核验，不自动判负或弃权。', locale)}</p>
      <RoomPreparationIncidents data={data} />
      <small>{uiText('到场为双方站内声明，系统未接入游戏；迟到或声明有争议需截图、录像等证据，由赛事组裁定。', locale)}</small>
    </details>
    <div className={styles.actions}>{canRecordPreparationIncident(data) && <button type="button" disabled={disabled} onClick={onReport}>{uiText('留证并记录结束等待', locale)}</button>}{timing.preparationOverdue && <button type="button" onClick={onSupport}>{uiText('查看协助 / 补充说明', locale)}</button>}</div>
  </aside>
}

export function RoomPreparationIncidentForm({ data, disabled, mutate, onSaved }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport()
  const [reason, setReason] = useState(''), [image, setImage] = useState(''), [reading, setReading] = useState(false)
  const [confirmed, setConfirmed] = useState(false), [error, setError] = useState('')
  const pending = useRef(null), generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  async function fileChanged(file) {
    const token = ++generation.current
    pending.current = null; setImage(''); setError(''); setReading(false); setConfirmed(false)
    if (!file) return
    if (!file.size || file.size > 5 * 1024 * 1024) { setError(uiText('请选择不超过 5 MB 的截图。', locale)); return }
    setReading(true)
    try {
      const value = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      if (generation.current === token) setImage(value.slice(value.indexOf(',') + 1))
    } catch { if (generation.current === token) setError(uiText('截图无法读取，请重新选择。', locale)) }
    finally { if (generation.current === token) setReading(false) }
  }
  if (!canRecordPreparationIncident(data)) return <><p role="status">{uiText('截止或比赛状态已变化，请返回核对最新记录。', locale)}</p><RoomPreparationIncidents data={data} /></>
  const submit = async event => {
    event.preventDefault()
    if (disabled || reading || !image || !confirmed || reason.trim().length < 3) return
    pending.current ||= { teamId: data.access.representativeTeams[0], matchRevision: data.match.revision, draftRevision: data.draftRevision, openingRevision: data.opening.revision, clientKey: crypto.randomUUID(), reason: reason.trim(), image, screenshotConfirmed: true }
    const saved = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/preparation-timeout', pending.current) }
      catch (failure) { setError(failure.message || uiText('提交结果未确认，请同步核对后重试。', locale)); if (failure.status && failure.status < 500) pending.current = null; throw failure }
    }, uiText('已留证记录结束现场等待，进入赛事组协助队列；没有判胜负或弃权。', locale))
    if (saved) { pending.current = null; onSaved?.() }
  }
  return <form className={styles.form} onSubmit={submit}>
    <p>{uiText('本队记录结束现场等待，不是弃权或判负。已打地图不变；对方可保留不同陈述，赛事组稍后核验。', locale)}</p>
    <p>{uiText('准备截止', locale)} · <b>{time(data.timing.preparationDueAt, locale)} UTC+8</b></p>
    <label>{uiText('游戏房间截图 · 包含可辨认时间', locale)}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || reading} onChange={event => fileChanged(event.target.files?.[0])} /></label>
    <label>{uiText('情况说明 · 双方可见', locale)}<textarea required minLength={3} maxLength={1000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); pending.current = null }} /></label>
    <label className={styles.confirm}><input type="checkbox" checked={confirmed} required disabled={disabled} onChange={event => { setConfirmed(event.target.checked); pending.current = null }} />{uiText('截图包含实际游戏房间、人员列表与可辨认时间；本图尚未在游戏中开赛。', locale)}</label>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}><button className={roomStyles.primary} disabled={disabled || reading || !image || !confirmed || reason.trim().length < 3}>{uiText(reading ? '正在读取截图…' : '提交证据并记录结束等待', locale)}</button><Link to={`/me?section=matches&competition=${encodeURIComponent(data.match.seasonId)}`}>{uiText('返回我的比赛', locale)}</Link></div>
  </form>
}
