import { useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'

export default function RoomLobbyTools({ data, disabled, mutate }) {
  const locale = useUiLocale(), { coordinationWrite } = useRoomTransport()
  const dialog = useRef(null)
  const [receipt, setReceipt] = useState(''), [draft, setDraft] = useState(null)
  const brief = data.preparation.brief
  const copy = async (value, label) => {
    try { await navigator.clipboard.writeText(value); setReceipt(`${uiText(label, locale)} · ${uiText('已复制', locale)}`) }
    catch { setReceipt(uiText('复制失败，请手动复制', locale)) }
  }
  const edit = () => { setDraft({ ...brief, matchRevision: data.match.revision }); dialog.current?.showModal() }
  return <>
    <span className={frame.lobbyTools}>
      {brief?.roomCode && <button type="button" onClick={() => copy(brief.roomCode, '设置码')}>{uiText('复制设置码', locale)}</button>}
      <button type="button" onClick={() => copy(window.location.href, '比赛房链接')}>{uiText('复制房间链接', locale)}</button>
      {mutate && data.access.staff && data.preparation.canPublishBrief && data.match.status === 'PENDING' && <button type="button" disabled={disabled} onClick={edit}>{uiText(brief?.roomName ? '编辑房间' : '填写游戏房间', locale)}</button>}
      {receipt && <small role="status">{receipt}</small>}
    </span>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="room-lobby-title">
      {draft && <form onSubmit={async event => {
        event.preventDefault()
        if (await mutate(() => coordinationWrite('/brief', { weekId: data.match.weekId, matchId: data.match.id, expectedRevision: draft.revision, matchRevision: draft.matchRevision, roomName: draft.roomName.trim(), roomCode: draft.roomCode.trim(), instructions: draft.instructions || '' }, true, 'PUT'), '游戏房间已保存。')) dialog.current?.close()
      }}>
        <h2 id="room-lobby-title">{uiText('游戏房间', locale)}</h2>
        <label>{uiText('游戏房间名称', locale)}<input required maxLength={120} value={draft.roomName} onChange={event => setDraft({ ...draft, roomName: event.target.value })} /></label>
        <label>{uiText('比赛房间设置码', locale)}<input maxLength={120} value={draft.roomCode} onChange={event => setDraft({ ...draft, roomCode: event.target.value })} /></label>
        <div className={styles.actions}><button type="button" onClick={() => dialog.current?.close()}>{uiText('取消', locale)}</button><button disabled={disabled || !draft.roomName.trim()}>{uiText('保存', locale)}</button></div>
      </form>}
    </dialog>
  </>
}
