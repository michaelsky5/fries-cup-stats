import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomRepresentative({ team, data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const side = data.representatives?.sides.find(item => item.teamId === team?.id)
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(''), [reason, setReason] = useState('')
  const [formError, setFormError] = useState(''), [saving, setSaving] = useState(false)
  const dialog = useRef(null), pending = useRef(null), openedRevision = useRef(0)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  if (!side) return null
  const roleLabel = { MANAGER: uiText("经理", uiLocale), LEADER: uiText("队长", uiLocale), COACH: uiText("教练", uiLocale), PLAYER: uiText("选手", uiLocale) }[side.role] || uiText("队员", uiLocale)
  const canSave = side.canAssign && !disabled && !saving && side.candidates.some(item => item.userId === selected) && selected !== side.userId && (!side.requiresReason || reason.trim().length >= 2)
  const titleId = `representative-${team.id}`
  function edit() { pending.current = null; setFormError('') }
  async function submit(event) {
    event.preventDefault()
    if (!canSave) return
    if (side.revision !== openedRevision.current && !pending.current) { setFormError('代表人选刚刚变化，请关闭后重新核对。'); return }
    pending.current ||= { teamId: team.id, userId: selected, expectedRevision: openedRevision.current, clientKey: crypto.randomUUID(), ...(reason.trim() ? { reason: reason.trim() } : {}) }
    setSaving(true)
    const result = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/representatives', pending.current, 'PUT') }
      catch (error) { setFormError(error.message || '提交结果尚未确认，请同步核对后重试。'); if (error.status && error.status < 500) pending.current = null; throw error }
    }, '本场操作代表已更新，双方可在比赛沟通中查看交接记录。')
    setSaving(false)
    if (result) { setOpen(false); pending.current = null }
  }
  return <div className={styles.representative} data-active={side.active} data-room-slot="representative">
    <div className={styles.representativeHeading}><small>{uiText("本场操作代表", uiLocale)}</small><div className={styles.representativeHeadingActions}>{side.isYou && <em>{uiText("你负责操作", uiLocale)}</em>}{side.canAssign ? <button type="button" disabled={disabled} onClick={() => { openedRevision.current = side.revision; setSelected(''); setReason(''); edit(); setOpen(true) }}>{side.userId ? uiText("更换", uiLocale) : uiText("指定", uiLocale)} <span aria-hidden="true">↗</span></button> : null}</div></div>
    <div className={styles.representativePerson}><strong>{side.name || uiText("尚未指定", uiLocale)}</strong>{side.name && <small>{[side.battleTag, side.role && roleLabel].filter(Boolean).join(' · ')}</small>}</div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { if (saving) event.preventDefault(); else setOpen(false) }}>
      <form onSubmit={submit}>
        <div><small>{team.shortName || team.name}{uiText(" · 本场权限", uiLocale)}</small><h2 id={titleId}>{side.userId ? uiText("转交本场操作代表", uiLocale) : uiText("指定本场操作代表", uiLocale)}</h2></div>
        <p>{side.requiresReason ? uiText("流程已开始，由赛管记录本次交接。已提交的选禁结果保留；尚未开赛时，新操作代表需要重新确认本队准备。", uiLocale) : uiText("从本队当前有权限的经理、教练或选手中选择一人。转交后，对方可以代表本队签到、选图、Ban、调整首发与确认准备。", uiLocale)}</p>
        {side.name && <p>{uiText("当前代表：", uiLocale)}<strong>{side.name}</strong></p>}
        <label>{uiText("新操作代表", uiLocale)}<select value={selected} required disabled={disabled || !side.canAssign} onChange={event => { setSelected(event.target.value); edit() }}><option value="">{uiText("选择本队成员", uiLocale)}</option>{side.candidates.filter(item => item.userId !== side.userId).map(item => <option key={item.userId} value={item.userId}>{item.name} · {item.role === 'COACH' ? uiText("教练", uiLocale) : item.role === 'PLAYER' ? uiText("选手", uiLocale) : uiText("经理", uiLocale)}</option>)}</select></label>
        {side.requiresReason && <label>{uiText("更换原因 · 双方可见", uiLocale)}<textarea value={reason} required minLength={2} maxLength={500} disabled={disabled || !side.canAssign} placeholder={uiText("例如：原代表断线，由经理接手", uiLocale)} onChange={event => { setReason(event.target.value); edit() }} /></label>}
        {!side.candidates.some(item => item.userId !== side.userId) && <p role="status">{uiText("暂无其他符合权限的本队成员。", uiLocale)}</p>}
        {!side.canAssign && <p role="alert">{uiText("比赛阶段或你的权限已变化，请关闭并核对最新状态。", uiLocale)}</p>}
        {formError && <p role="alert">{formError}</p>}
        <div className={styles.actions}><button type="button" disabled={saving} onClick={() => setOpen(false)}>{uiText("取消", uiLocale)}</button><button className={styles.primary} disabled={!canSave}>{saving ? uiText("正在保存…", uiLocale) : pending.current ? uiText("重试确认代表", uiLocale) : uiText("确认操作代表", uiLocale)}</button></div>
      </form>
    </dialog>
  </div>
}
