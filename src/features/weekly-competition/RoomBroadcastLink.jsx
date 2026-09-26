import { useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import { roomBroadcastUrl } from './roomBroadcastLinks.js'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomBroadcastLink({ data, disabled }) {
  const [connection, setConnection] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const url = connection ? `${roomBroadcastUrl(connection.path)}#${connection.token}` : ''
  return <section className={styles.task} aria-label="导播自动跟随">
    <h3>连接 FD / FCBT</h3>
    <p>在导播工具的“比赛房跟随”中粘贴连接，先核对本场，再选择自动播出。两端使用同一份已确认的地图、首发、Ban 与比分。</p>
    <p>连接仅可读取本场播出资料，有效期 12 小时；生成者退出登录或失去本场权限后失效。请只交给本场导播。</p>
    <button type="button" disabled={disabled || busy || !roomBroadcastUrl('/api/weekly-broadcast/check')} onClick={async () => {
      setBusy(true); setMessage('')
      try { setConnection(await liveRoomWrite(data.match.id, '/broadcast-link', {})) } catch (error) { setMessage(error.message) }
      finally { setBusy(false) }
    }}>{busy ? '正在准备…' : '生成本场播出连接'}</button>
    {url && <><label>本场播出连接<input type="password" aria-label="本场播出连接" readOnly value={url} onFocus={event => event.target.select()} /></label><button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setMessage('已复制，在 FD 或 FCBT 中粘贴。') } catch { setMessage('请选中连接后手动复制。') }
    }}>复制连接</button><small>有效至 {new Date(connection.expiresAt).toLocaleString()}</small></>}
    {message && <p role="status">{message}</p>}
  </section>
}
