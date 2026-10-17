import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'

function representativeHint(side, data, teamId, locale) {
  if (side.canAssign) return !side.active
    ? pickUiLocale(locale, '可以提前指定，无需等待比赛操作开放。', 'Appoint a representative before match operations open.', '경기 조작이 열리기 전에도 대표를 지정할 수 있습니다.', '可以提前指定，無需等待比賽操作開放。') : ''
  if (side.canClaim) return pickUiLocale(locale, '无需经理到场。确认后，由你负责本队本场操作。', 'No manager needs to join. Confirm to operate this match for your team.', '매니저 입장 없이 확인하면 이 경기의 팀 조작을 맡습니다.', '無需經理到場。確認後，由你負責本隊本場操作。')
  if (!data.access.teamIds.includes(teamId) && !data.access.staff) return !side.active
    ? pickUiLocale(locale, '等待对方队伍指定代表。', 'Waiting for the other team to appoint a representative.', '상대 팀의 대표 지정을 기다리는 중입니다.', '等待對方隊伍指定代表。') : ''
  if (side.assignBlockedCode === 'ROOM_CLOSED') return pickUiLocale(locale, '本场已关闭，不能再更换代表。', 'This room is closed. Representatives cannot be changed.', '종료된 경기에서는 대표를 변경할 수 없습니다.', '本場已關閉，不能再更換代表。')
  if (side.assignBlockedCode === 'READ_ONLY') return pickUiLocale(locale, '当前账号或赛事只允许查看。', 'This account or event is read-only.', '현재 계정 또는 대회는 조회만 가능합니다.', '目前帳號或賽事只允許查看。')
  if (data.representatives.locked && data.access.operatorMode === 'REFEREE') return pickUiLocale(locale, '选图流程已开始，更换代表请联系本场赛管。', 'Selection has started. Ask the match referee to change representatives.', '선택 절차가 시작되었습니다. 대표 변경은 경기 심판에게 요청하세요.', '選圖流程已開始，更換代表請聯繫本場賽管。')
  if (side.active) return pickUiLocale(locale, '更换代表请联系本队队长、经理或本场赛管。', 'Ask your captain, manager or match referee to change representatives.', '대표 변경은 팀장, 매니저 또는 경기 심판에게 요청하세요.', '更換代表請聯繫本隊隊長、經理或本場賽管。')
  return pickUiLocale(locale, '选图开始前，本场锁定名单内的选手或本队教练可自行担任，也可联系队长、经理指定。', 'Before selection starts, players on this match’s locked roster and team coaches can take this role. Your captain or manager can also appoint someone.', '선택 절차 시작 전 이 경기의 확정 명단 선수와 팀 코치는 직접 맡을 수 있습니다. 팀장이나 매니저도 지정할 수 있습니다.', '選圖開始前，本場鎖定名單內的選手或本隊教練可自行擔任，也可聯繫隊長、經理指定。')
}

export default function RoomRepresentative({ team, data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const side = data.representatives?.sides.find(item => item.teamId === team?.id)
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(''), [reason, setReason] = useState('')
  const [formError, setFormError] = useState(''), [saving, setSaving] = useState(false)
  const dialog = useRef(null), pending = useRef(null), openedRevision = useRef(0)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  if (!side) return null
  const roleLabels = { MANAGER: uiText("经理", uiLocale), LEADER: uiText("队长", uiLocale), COACH: uiText("教练", uiLocale), PLAYER: uiText("选手", uiLocale) }
  const roleLabel = roleLabels[side.role] || uiText("队员", uiLocale)
  const claiming = !side.canAssign && side.canClaim
  const canEdit = side.canAssign || side.canClaim
  const claimCandidate = side.candidates.find(item => item.userId === data.actor.id)
  const claimLabel = pickUiLocale(uiLocale, '我来担任', 'Take this role', '제가 맡겠습니다', '我來擔任')
  const actionLabel = claiming ? claimLabel : side.userId ? uiText('更换', uiLocale) : uiText('指定', uiLocale)
  const hint = representativeHint(side, data, team.id, uiLocale)
  const canSave = canEdit && !disabled && !saving && side.candidates.some(item => item.userId === selected) && selected !== side.userId && (!side.requiresReason || reason.trim().length >= 2)
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
  const changed = side.revision > 1 && Boolean(side.updatedAt)
  return <div className={styles.representative} data-active={side.active} data-room-slot="representative" data-personnel-changed={changed}>
    <div className={styles.representativeHeading}><small>{uiText("本场操作代表", uiLocale)}</small><div className={styles.representativeHeadingActions}>{side.isYou && <em>{uiText("你负责操作", uiLocale)}</em>}{canEdit ? <button type="button" disabled={disabled} data-self-claim={claiming || undefined} aria-label={`${team.shortName || team.name} · ${actionLabel}`} onClick={() => { openedRevision.current = side.revision; setSelected(claiming ? data.actor.id : ''); setReason(''); edit(); setOpen(true) }}>{actionLabel} <span aria-hidden="true">↗</span></button> : null}</div></div>
    <div className={styles.representativePerson}><strong>{side.name || uiText("尚未指定", uiLocale)}</strong>{side.name && <small>{[side.battleTag, side.role && roleLabel].filter(Boolean).join(' · ')}</small>}{changed && <small data-representative-changed>{uiText('代表已更换', uiLocale)} · {new Date(side.updatedAt).toLocaleTimeString(uiLocale, { hour: '2-digit', minute: '2-digit' })}{side.assignedBy && ` · ${side.assignedBy}`}</small>}</div>
    {side.name && !side.active && <p>{pickUiLocale(uiLocale, '原代表资格已失效，需要重新指定。', 'The previous representative is no longer eligible. Appoint a new one.', '기존 대표의 자격이 만료되었습니다. 다시 지정해 주세요.', '原代表資格已失效，需要重新指定。')}</p>}
    {hint && <p>{hint}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { if (saving) event.preventDefault(); else setOpen(false) }}>
      <form onSubmit={submit}>
        <div><small>{team.shortName || team.name}{uiText(" · 本场权限", uiLocale)}</small><h2 id={titleId}>{claiming ? pickUiLocale(uiLocale, '担任本场操作代表', 'Become this match’s representative', '이 경기의 조작 대표 맡기', '擔任本場操作代表') : side.userId ? uiText("转交本场操作代表", uiLocale) : uiText("指定本场操作代表", uiLocale)}</h2></div>
        <p>{claiming ? pickUiLocale(uiLocale, '确认后，你将代表本队选图、提交首发与到场情况、禁用英雄和确认赛果。请先与队友沟通；本队队长、经理或本场赛管可以按流程交接。', 'You will select maps, submit lineups and attendance, ban heroes and confirm results for your team. Coordinate with teammates first. Your captain, manager or referee can arrange a handover.', '팀을 대신해 맵 선택, 선발 및 출석 제출, 영웅 금지와 결과 확인을 담당합니다. 먼저 팀원과 상의하세요. 팀장, 매니저 또는 심판이 인계를 처리할 수 있습니다.', '確認後，你將代表本隊選圖、提交首發與到場情況、禁用英雄和確認賽果。請先與隊友溝通；本隊隊長、經理或本場賽管可以按流程交接。') : side.requiresReason ? uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? "无赛管时，本队队长或经理可记录交接原因。旧代表立即失去本场操作权限；已提交的选禁和计时保留，不重新补时。" : "流程已开始，由赛管记录本次交接。已提交的选禁结果和计时保留；尚未开赛时，新操作代表需要重新确认本队准备。", uiLocale) : uiText("从本队当前有权限的经理、教练或选手中选择一人。转交后，对方可以代表本队签到、选图、Ban、调整首发与确认准备。", uiLocale)}</p>
        {side.name && <p>{uiText("当前代表：", uiLocale)}<strong>{side.name}</strong></p>}
        {claiming ? <p><strong>{claimCandidate?.name}</strong> · {roleLabels[claimCandidate?.role]}</p> : <label>{uiText("新操作代表", uiLocale)}<select value={selected} required disabled={disabled || !canEdit} onChange={event => { setSelected(event.target.value); edit() }}><option value="">{uiText("选择本队成员", uiLocale)}</option>{side.candidates.filter(item => item.userId !== side.userId).map(item => <option key={item.userId} value={item.userId}>{item.name} · {roleLabels[item.role] || uiText('队员', uiLocale)}</option>)}</select></label>}
        {side.requiresReason && <label>{uiText("更换原因 · 双方可见", uiLocale)}<textarea value={reason} required minLength={2} maxLength={500} disabled={disabled || !side.canAssign} placeholder={uiText("例如：原代表断线，由经理接手", uiLocale)} onChange={event => { setReason(event.target.value); edit() }} /></label>}
        {canEdit && !side.candidates.some(item => item.userId !== side.userId) && <p role="status">{pickUiLocale(uiLocale, '暂无其他符合条件的成员。请核对该成员已绑定账号、验证邮箱，并具有有效的本队身份。', 'No other eligible members. Check that the member has a linked account, verified email and an active team identity.', '다른 적격 구성원이 없습니다. 계정 연동, 이메일 인증 및 유효한 팀 자격을 확인하세요.', '暫無其他符合條件的成員。請核對該成員已綁定帳號、驗證信箱，並具有有效的本隊身分。')}</p>}
        {!canEdit && <p role="alert">{uiText("比赛阶段或你的权限已变化，请关闭并核对最新状态。", uiLocale)}</p>}
        {formError && <p role="alert">{formError}</p>}
        <div className={styles.actions}><button type="button" disabled={saving} onClick={() => setOpen(false)}>{uiText("取消", uiLocale)}</button><button className={styles.primary} disabled={!canSave}>{saving ? uiText("正在保存…", uiLocale) : pending.current ? uiText("重试确认代表", uiLocale) : claiming ? pickUiLocale(uiLocale, '确认由我担任', 'Confirm and take this role', '확인하고 맡기', '確認由我擔任') : uiText("确认操作代表", uiLocale)}</button></div>
      </form>
    </dialog>
  </div>
}
