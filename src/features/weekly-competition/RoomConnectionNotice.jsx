import { useEffect, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './RoomConnectionNotice.module.css'

export default function RoomConnectionNotice({ connection, error, refresh }) {
  const locale = useUiLocale(), [now, setNow] = useState(Date.now)
  const active = connection && (connection.status !== 'connected' || connection.recoveredAt && now - connection.recoveredAt < 8000)
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active, connection?.status, connection?.recoveredAt])
  if (!active || connection.status === 'connecting' && !error) return null
  const recovered = connection.status === 'connected', blocked = connection.status === 'blocked'
  const remaining = Math.max(0, Math.ceil((connection.nextRetryAt - now) / 1000))
  const cooling = connection.retryAfterUntil > now
  const title = recovered ? '连接已恢复，已同步最新进度' : blocked ? '需要重新核对访问权限' : connection.status === 'offline' ? '网络已断开，页面内容已保留' : '连接暂时中断，正在自动重连'
  return <section className={styles.notice} data-room-slot="connection" data-recovered={recovered} aria-label={uiText('比赛房连接状态', locale)}>
    <div><strong role="status">{uiText(title, locale)}</strong>{!recovered && <p>{uiText(blocked ? error : '当前显示上次同步的内容，提交已暂停。断线不会暂停服务器倒计时。', locale)}</p>}</div>
    {!recovered && <div className={styles.retry}><small>{connection.syncing ? uiText('正在重新同步…', locale) : remaining ? uiText('{0} 秒后自动重试', locale, [remaining]) : connection.status === 'offline' ? uiText('联网后自动恢复，也可手动尝试', locale) : ''}</small><button type="button" disabled={connection.syncing || cooling} onClick={() => refresh({ force: true })}>{uiText(blocked ? '重新同步' : '立即重连', locale)}</button></div>}
  </section>
}
