import { useEffect, useId, useRef, useState } from 'react'
import styles from './WeeklyLiveRoomPage.module.css'
import workspace from './WeeklyRoomWorkspace.module.css'
import { canExtendRoomPreparation } from './roomPreparationExtension.js'

export default function RoomForceStartControl({ data, disabled, command, notice, onPreparationExtension }) {
  const [open, setOpen] = useState(false), [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false)
  const dialog = useRef(null), pending = useRef(null)
  const titleId = useId()
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  useEffect(() => { pending.current = null }, [data.revision, data.match.revision, data.draftRevision])
  if (!data.access.staff || data.phase !== 'PREPARING' || !data.startControl) return null
  const { required = [], overridable = [], canForceStart } = data.startControl
  const close = () => { if (!disabled) { setOpen(false); pending.current = null } }
  return <>
    <button type="button" disabled={disabled || data.timing?.startTimeBlocked} title={data.timing?.startBlockReason || undefined} onClick={() => setOpen(true)}>赛管接管 / 强制开始</button>
    <dialog ref={dialog} className={`${styles.dialog} ${workspace.forceDialog}`} onCancel={event => { if (disabled) event.preventDefault(); else close() }} aria-labelledby={titleId}>
      <form onSubmit={async event => {
        event.preventDefault()
        if (disabled || data.timing?.startTimeBlocked || !canForceStart || !confirmed || note.trim().length < 2) return
        pending.current ||= { clientKey: crypto.randomUUID(), expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision, note: note.trim(), actualStartConfirmed: true }
        if (await command('FORCE_START', pending.current)) { setOpen(false); setNote(''); setConfirmed(false); pending.current = null }
      }}>
        <h2 id={titleId}>赛管接管开赛</h2>
        <p>当场赛管可接管准备超时或网页确认卡住的情况。地图、双方首发及职责、Ban 记录须完整，且已到计划开赛时间；先在游戏内开始，再填写原因并记录实际开赛。</p>
        {required.length > 0 && <section><strong>仍需先处理</strong><ul>{required.map(item => <li key={item}>{item}</li>)}</ul><p>返回当前步骤可由赛管代为操作。正在被其他赛管编辑时，需要先交接。</p></section>}
        {overridable.length > 0 && <section><strong>本次接管的确认项</strong><ul>{overridable.map(item => <li key={item}>{item}</li>)}</ul></section>}
        {!required.length && !overridable.length && <p>当前已满足正常开赛条件，关闭此窗口后点击“记录本图开赛”即可。</p>}
        {canForceStart && <>
          <label>公开接管原因<textarea value={note} minLength={2} maxLength={500} required disabled={disabled} onChange={event => { pending.current = null; setNote(event.target.value) }} placeholder="例如：已在游戏内核对十人到场，网页签到未更新" /></label>
          <label className={workspace.forceConfirm}><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => { pending.current = null; setConfirmed(event.target.checked) }} />我已核对实际房间和双方人员，确认本图游戏已开赛</label>
          <small>操作人、原因、时间和跳过的确认项会向本场人员公开，并保留审计记录。</small>
        </>}
        {notice && <p role="status">{notice}</p>}
        <div className={styles.actions}><button type="button" disabled={disabled} onClick={close}>返回比赛房</button>{data.timing?.preparationOverdue && canExtendRoomPreparation(data) && onPreparationExtension && <button type="button" disabled={disabled} onClick={() => { dialog.current?.close(); close(); onPreparationExtension() }}>处理准备超时</button>}{canForceStart && <button className={styles.primary} disabled={disabled || data.timing?.startTimeBlocked || !confirmed || note.trim().length < 2}>确认强制开始本图</button>}</div>
      </form>
    </dialog>
  </>
}
