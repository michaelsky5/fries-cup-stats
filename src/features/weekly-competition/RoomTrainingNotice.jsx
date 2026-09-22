import { useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomTrainingNotice({ data, disabled }) {
  const locale = useUiLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const writing = useRef(false)
  if (!data.training) return null
  async function reset() {
    if (writing.current || !window.confirm(uiText('结束本次测试并重新开始？旧演练记录保留，不影响正式比赛。', locale))) return
    writing.current = true; setBusy(true); setError('')
    try {
      const next = await platformRequest(`/seasons/${encodeURIComponent(data.training.sourceSeasonId)}/weekly-training`, { method: 'POST', body: { reset: true, expectedMatchId: data.match.id } })
      if (!next.roomPath?.startsWith('/me/matches/')) throw new Error('新演练入口未返回，请回管理员赛程页刷新。')
      window.location.assign(next.roomPath)
    } catch (failure) { setError(failure.message || '重置失败，请刷新后重试。') }
    finally { writing.current = false; setBusy(false) }
  }
  return <aside className={styles.training} aria-label={uiText('管理员测试房间', locale)}>
    <div><strong>{uiText('测试演练 · 仅自己可操作', locale)}</strong><p>{uiText('虚拟队伍，不发布、不计正式积分。可代双方操作；先手权默认使用“赛管指定”。换人从本周 7 人名单选择 5 名首发。', locale)}</p>{error && <p role="alert">{error}</p>}</div>
    <button type="button" disabled={disabled || busy} onClick={reset}>{busy ? uiText('正在重开…', locale) : uiText('重置我的演练', locale)}</button>
  </aside>
}
