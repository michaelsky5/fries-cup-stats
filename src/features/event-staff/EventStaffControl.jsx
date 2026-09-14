import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import {
  fetchEventStaffContext,
  respondToEventStaffInvitation,
  submitOwnEventStaffAvailability,
  withdrawEventStaffParticipation
} from './eventStaffApi.js'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  resolveCapabilityAccess
} from '../capabilities/capabilityUi.js'
import styles from './EventStaffControl.module.css'

const ROLE_LABELS = { REFEREE: '赛管', CASTER: '解说' }
const STATUS_LABELS = {
  PENDING: '审核中',
  INVITED: '待你确认',
  ACTIVE: '本届已生效',
  DECLINED: '已拒绝',
  REJECTED: '未通过',
  WITHDRAWN: '已退出',
  REVOKED: '已撤销'
}

function errorText(error) {
  const capabilityMessage = capabilityDeniedMessage(error)
  if (capabilityMessage) return capabilityMessage
  const code = error?.data?.error
  const copy = {
    EVENT_STAFF_ASSIGNMENT_ACTIVE: '你还有未结束的正式排班，请先联系 System 完成改派。',
    EVENT_STAFF_BATTLETAG_REQUIRED: '需要先补充并验证 BattleTag。',
    EVENT_STAFF_IDENTITY_RESTRICTED: '该长期身份已被暂停或撤销，不能通过邀请恢复。',
    AVAILABILITY_FORM_NOT_OPEN: '这份档期表已经停止填写。',
    AVAILABILITY_SLOT_INVALID: '选择的时间不在这份档期表范围内。'
  }
  return copy[code] || error?.message || '操作未完成，请稍后重试。'
}

function dateRange(start, end) {
  if (!start || !end) return []
  const result = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime()) || cursor > last) return []
  while (cursor <= last && result.length < 21) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    result.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return `${value.slice(5)} 周${'日一二三四五六'[date.getDay()]}`
}

function slotKey(slot) {
  return `${slot.date}__${slot.time}`
}

function AvailabilityCard({ form, staffContext, onSaved, capabilityAccess }) {
  const uiLocale = useUiLocale()
  const submission = form.submission
  const [selectedSlots, setSelectedSlots] = useState(() => new Set((submission?.slots || []).map(slotKey)))
  const [maxShifts, setMaxShifts] = useState(submission?.maxShifts ?? 2)
  const [rolePreference, setRolePreference] = useState(submission?.rolePreference || 'ANY')
  const [shiftPreference, setShiftPreference] = useState(submission?.shiftPreference || 'ANY')
  const [acceptsTriple, setAcceptsTriple] = useState(Boolean(submission?.acceptsTriple))
  const [acceptsBackup, setAcceptsBackup] = useState(Boolean(submission?.acceptsBackup))
  const [canBroadcast, setCanBroadcast] = useState(Boolean(submission?.canBroadcast))
  const [broadcastRoomUrl, setBroadcastRoomUrl] = useState(submission?.broadcastRoomUrl || staffContext?.staff?.broadcastRoomUrl || '')
  const [preferredPartnerIds, setPreferredPartnerIds] = useState(() => new Set(submission?.preferredPartnerIds || []))
  const [notes, setNotes] = useState(submission?.notes || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const dates = useMemo(() => dateRange(form.startsOn, form.endsOn), [form.endsOn, form.startsOn])

  const toggleSlot = (date, time) => {
    const key = `${date}__${time}`
    setSelectedSlots(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const togglePartner = id => {
    setPreferredPartnerIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!capabilityAccess.allowed) {
      setError(capabilityBlockText(capabilityAccess))
      return
    }
    if (!selectedSlots.size) {
      setError('至少选择一个可以工作的时间。')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await submitOwnEventStaffAvailability(form.id, {
        maxShifts: maxShifts === '' ? null : Number(maxShifts),
        acceptsTriple,
        acceptsBackup,
        canBroadcast,
        broadcastRoomUrl: canBroadcast ? broadcastRoomUrl : '',
        preferredPartnerIds: [...preferredPartnerIds],
        rolePreference,
        shiftPreference,
        slots: [...selectedSlots].map(key => {
          const [date, time] = key.split('__')
          return { date, time }
        }),
        notes
      })
      setNotice('档期已保存；再次提交会覆盖这份表中的旧记录。')
      await onSaved?.()
    } catch (submitError) {
      setError(errorText(submitError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.availabilityCard} onSubmit={handleSubmit}>
      <header><div><span>AVAILABILITY</span><h3>{form.title}</h3><p>{form.weekLabel || uiText("{0} 至 {1}", uiLocale, [form.startsOn || '—', form.endsOn || '—'])}</p></div><em>{submission ? uiText("已提交", uiLocale) : uiText("待填写", uiLocale)}</em></header>
      {form.notes ? <p className={styles.formNote}>{form.notes}</p> : null}
      {!capabilityAccess.allowed ? <p className={styles.capabilityBlock}>{capabilityBlockText(capabilityAccess)}</p> : null}
      <div className={styles.slotGrid} style={{ '--slot-count': form.slotTimes?.length || 3 }}>
        <div className={styles.slotCorner}>{uiText("日期 / 时间", uiLocale)}</div>
        {(form.slotTimes || []).map(time => <strong key={time}>{time}</strong>)}
        {dates.flatMap(date => [
          <b key={`${date}:label`}>{dateLabel(date)}</b>,
          ...(form.slotTimes || []).map(time => {
            const key = `${date}__${time}`
            return <button key={key} type="button" disabled={!capabilityAccess.allowed} data-selected={selectedSlots.has(key)} onClick={() => toggleSlot(date, time)}>{selectedSlots.has(key) ? uiText("可以", uiLocale) : '—'}</button>
          })
        ])}
      </div>
      <div className={styles.preferenceGrid}>
        <label><span>{uiText("最多场次", uiLocale)}</span><input type="number" min="0" max="21" value={maxShifts} onChange={event => setMaxShifts(event.target.value)} /></label>
        <label><span>{uiText("职责倾向", uiLocale)}</span><select value={rolePreference} onChange={event => setRolePreference(event.target.value)}><option value="ANY">{uiText("都可以", uiLocale)}</option>{staffContext?.staff?.roles?.includes('REFEREE') ? <option value="REFEREE">{uiText("更想赛管", uiLocale)}</option> : null}{staffContext?.staff?.roles?.includes('CASTER') ? <option value="CASTER">{uiText("更想解说", uiLocale)}</option> : null}</select></label>
        <label><span>{uiText("连班倾向", uiLocale)}</span><select value={shiftPreference} onChange={event => setShiftPreference(event.target.value)}><option value="ANY">{uiText("无所谓", uiLocale)}</option><option value="PREFER_CONSECUTIVE">{uiText("更想连着上", uiLocale)}</option><option value="AVOID_CONSECUTIVE">{uiText("尽量不连班", uiLocale)}</option></select></label>
      </div>
      <div className={styles.checkRow}><label><input type="checkbox" checked={acceptsTriple} onChange={event => setAcceptsTriple(event.target.checked)} />{uiText(" 可接受三连班", uiLocale)}</label><label><input type="checkbox" checked={acceptsBackup} onChange={event => setAcceptsBackup(event.target.checked)} />{uiText(" 接受替补", uiLocale)}</label><label><input type="checkbox" checked={canBroadcast} onChange={event => setCanBroadcast(event.target.checked)} />{uiText(" 可提供个人直播间", uiLocale)}</label></div>
      {canBroadcast ? <label className={styles.wideField}><span>{uiText("直播间地址", uiLocale)}</span><input type="url" value={broadcastRoomUrl} onChange={event => setBroadcastRoomUrl(event.target.value)} placeholder="https://..." /></label> : null}
      {staffContext?.partners?.length ? <div className={styles.partnerPicker}><span>{uiText("偏好搭档（最多 3 人）", uiLocale)}</span><div>{staffContext.partners.map(partner => <button key={partner.id} type="button" data-selected={preferredPartnerIds.has(partner.id)} onClick={() => togglePartner(partner.id)}>{partner.nickname} · {partner.roles.map(role => ROLE_LABELS[role]).join('/')}</button>)}</div></div> : null}
      <label className={styles.wideField}><span>{uiText("补充说明", uiLocale)}</span><textarea maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      {error ? <p className={styles.error}>{error}</p> : null}{notice ? <p className={styles.notice}>{notice}</p> : null}
      <button className={styles.primaryAction} type="submit" title={capabilityBlockText(capabilityAccess)} disabled={!capabilityAccess.allowed || busy || form.status !== 'OPEN'}>{busy ? uiText("保存中…", uiLocale) : submission ? uiText("更新档期", uiLocale) : uiText("提交档期", uiLocale)}</button>
    </form>
  )
}

export default function EventStaffControl(props) {
  return <EventStaffSession key={`${props.seasonId}:${props.role}`} {...props} />
}

function EventStaffSession({ seasonId, role, onContextChange, capabilitySnapshot = null }) {
  const uiLocale = useUiLocale()
  const text = (zh, en, ko, tw) => pickUiLocale(uiLocale, zh, en, ko, tw)
  const roleLabel = role === 'CASTER' ? text('解说', 'caster', '해설', '解說') : text('赛管', 'official', '운영', '賽管')
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const requestSequence = useRef(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setLoadError('')
    try {
      const next = await fetchEventStaffContext(seasonId)
      if (!Array.isArray(next?.participations) || next.seasonId !== seasonId) throw new Error('EVENT_STAFF_CONTEXT_INVALID')
      if (requestId === requestSequence.current) setContext(next)
    } catch (loadError) {
      if (requestId === requestSequence.current) setLoadError(errorText(loadError))
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [seasonId])

  useEffect(() => { refresh(); return () => { requestSequence.current += 1 } }, [refresh])
  const participation = context?.participations?.find(item => item.role === role) || null
  const relationshipAccess = resolveCapabilityAccess(capabilitySnapshot, 'staff.event.respond')
  const availabilityAccess = resolveCapabilityAccess(capabilitySnapshot, 'staff.availability.submit')
  const blocked = loading || Boolean(loadError) || Boolean(busy)
  const statusLabel = loading ? text('正在同步', 'Syncing', '동기화 중', '正在同步')
    : loadError ? text('状态未同步', 'Status unavailable', '상태 확인 불가', '狀態未同步')
      : participation ? (uiLocale === 'en-US' ? ({ PENDING: 'Under review', INVITED: 'Awaiting your response', ACTIVE: 'Active in this event', DECLINED: 'Declined', REJECTED: 'Not approved', WITHDRAWN: 'Withdrawn', REVOKED: 'Revoked' }[participation.status] || 'Status unknown') : uiText(STATUS_LABELS[participation.status] || '状态待确认', uiLocale))
        : text('暂无本届关系', 'Not linked to this event', '대회 역할 연결 없음', '暫無本屆關係')

  const runAction = async (key, task, success) => {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await task()
      setNotice(success)
      await refresh()
      await onContextChange?.()
    } catch (actionError) {
      setError(errorText(actionError))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className={styles.control}>
      <section className={styles.relationshipCard} data-event-staff-relation data-status={loading ? 'LOADING' : loadError ? 'ERROR' : participation?.status || 'NONE'} aria-busy={loading}>
        <header><div><span>EVENT STAFF / {seasonId}</span><h2>{uiLocale === 'en-US' ? `Your ${roleLabel} role` : text('本届', 'Event', '이번 대회 ', '本屆') + roleLabel + text('身份', ' role', ' 역할', '身份')}</h2></div><em role="status">{statusLabel}</em></header>
        {participation ? <div className={styles.relationshipBody}><dl><div><dt>{uiText("来源", uiLocale)}</dt><dd>{participation.source === 'SYSTEM_INVITE' ? text('赛事负责人邀请', 'Organizer invitation', '대회 담당자 초대', '賽事負責人邀請') : participation.source === 'SELF_APPLICATION' ? uiText("本人申请", uiLocale) : '—'}</dd></div><div><dt>BattleTag</dt><dd>{participation.battleTag || uiText("待补充", uiLocale)}</dd></div><div><dt>{uiText("提交时间", uiLocale)}</dt><dd>{participation.createdAt && Number.isFinite(Date.parse(participation.createdAt)) ? new Date(participation.createdAt).toLocaleString(uiLocale, { hour12: false }) : '—'}</dd></div></dl>{participation.applicationNote ? <p>{participation.applicationNote}</p> : null}{participation.reviewNote ? <p>{participation.reviewNote}</p> : null}</div> : !loading && !loadError ? <p>{text('本届身份由赛事负责人邀请关联。请联系负责人确认邀请，并使用受邀账号登录；收到邀请后，可在这里确认。', 'The organizer links your role by invitation. Confirm the invitation with them and sign in with the invited account; you can respond here when it arrives.', '대회 담당자의 초대로 역할을 연결합니다. 초대받은 계정으로 로그인하면 여기에서 확인할 수 있습니다.', '本屆身份由賽事負責人邀請關聯。請聯繫負責人確認邀請，並使用受邀帳號登入；收到邀請後，可在這裡確認。')}</p> : null}
        {participation && ['INVITED', 'ACTIVE'].includes(participation.status) && !relationshipAccess.allowed ? <p className={styles.capabilityBlock}>{capabilityBlockText(relationshipAccess)}</p> : null}
        {participation?.status === 'INVITED' ? <div className={styles.actions}><button type="button" title={capabilityBlockText(relationshipAccess)} disabled={!relationshipAccess.allowed || blocked} onClick={() => runAction('accept', () => respondToEventStaffInvitation(participation.id, 'accept'), text('已接受本届邀请。', 'Invitation accepted.', '초대를 수락했습니다.', '已接受本屆邀請。'))}>{uiText("接受邀请", uiLocale)}</button><button type="button" title={capabilityBlockText(relationshipAccess)} disabled={!relationshipAccess.allowed || blocked} onClick={() => runAction('reject', () => respondToEventStaffInvitation(participation.id, 'reject'), text('已拒绝邀请。', 'Invitation declined.', '초대를 거절했습니다.', '已拒絕邀請。'))}>{text("拒绝邀请", "Decline invitation", "초대 거절", "拒絕邀請")}</button></div> : null}
        {participation?.status === 'ACTIVE' ? <div className={styles.actions}><button type="button" className={styles.secondaryAction} title={capabilityBlockText(relationshipAccess)} disabled={!relationshipAccess.allowed || blocked} onClick={() => runAction('withdraw', () => withdrawEventStaffParticipation(participation.id, '本人退出本届工作人员关系'), text('已退出本届身份。', 'You have left this event role.', '대회 역할에서 탈퇴했습니다.', '已退出本屆身份。'))}>{text("退出本届", "Leave this event role", "대회 역할 탈퇴", "退出本屆")}</button></div> : null}
        {!loading && !loadError && ['DECLINED', 'REJECTED', 'WITHDRAWN', 'REVOKED'].includes(participation?.status) ? <p>{text('需要重新参与本届工作，请联系赛事负责人确认安排。', 'Contact the organizer if you need to rejoin this event’s staff.', '다시 참여하려면 대회 담당자에게 문의하세요.', '需要重新參與本屆工作，請聯繫賽事負責人確認安排。')}</p> : null}
        {loadError ? <p className={styles.error} role="alert">{context ? text('本次刷新未成功。下方保留上次记录，重新同步后才能操作。', 'Refresh failed. Previous records remain visible; sync again before taking action.', '새로고침에 실패했습니다. 이전 기록을 표시하며 다시 동기화한 후 작업할 수 있습니다.', '本次刷新未成功。下方保留上次記錄，重新同步後才能操作。') : text('暂时无法确认本届身份，请重新同步。', 'Your event role could not be checked. Please retry.', '대회 역할을 확인할 수 없습니다. 다시 시도하세요.', '暫時無法確認本屆身份，請重新同步。')}</p> : null}
        <button type="button" className={styles.refreshAction} disabled={loading || Boolean(busy)} onClick={refresh}>{loading ? text('正在同步…', 'Syncing…', '동기화 중…', '正在同步…') : text('重新同步身份', 'Refresh event role', '역할 다시 동기화', '重新同步身份')} <span aria-hidden="true">↻</span></button>
        {error ? <p className={styles.error}>{error}</p> : null}{notice ? <p className={styles.notice}>{notice}</p> : null}
      </section>
      {participation?.status === 'ACTIVE' ? <section className={styles.formsSection}><header><div><span>MY AVAILABILITY</span><h2>{uiText("本届档期", uiLocale)}</h2><p>{uiText("只填写你确定可以工作的时段；正式排班发布后会出现在上方任务列表。", uiLocale)}</p></div><em>{context?.forms?.filter(form => form.status === 'OPEN').length || 0} OPEN</em></header>{context?.forms?.length ? context.forms.map(form => <AvailabilityCard key={form.id} form={form} staffContext={context} capabilityAccess={blocked ? { ...availabilityAccess, allowed: false } : availabilityAccess} onSaved={refresh} />) : <div className={styles.empty}>{uiText("当前没有开放的档期表。", uiLocale)}</div>}</section> : null}
    </div>
  )
}
