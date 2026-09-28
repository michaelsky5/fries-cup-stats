import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useLocaleDomTranslation } from '../../hooks/useLocaleDomTranslation.js'
import { translateUiText } from '../../lib/uiText.js'
import { PlatformApiError } from '../../features/auth/platformApi.js'
import { WeeklyRoomView } from '../../features/weekly-competition/WeeklyLiveRoomPage.jsx'
import useWeeklyLiveRoom from '../../features/weekly-competition/useWeeklyLiveRoom.js'
import { RoomTransportProvider } from '../../features/weekly-competition/RoomTransport.jsx'
import { buildRoomPractice, createPracticeSession, createPracticeTransport, PRACTICE_ID } from '../../features/room-guide/roomPractice.js'
import copy from '../../features/room-guide/roomGuideCopy.json'
import styles from './WeeklyRoomNetworkPreview.module.css'

// Development-only fault controls use the real synchronization hook and room UI.
// All room reads and writes stay in this local synthetic session.
function NetworkRoom({ scene, locale, text }) {
  const [session] = useState(() => createPracticeSession('representative', scene))
  const faults = useRef({ down: false, write: '' }), room = useRef(null)
  const [mode, setMode] = useState('正常'), [writes, setWrites] = useState([]), [toolsOpen, setToolsOpen] = useState(true)
  useLocaleDomTranslation(locale, room, translateUiText)
  useEffect(() => { const timer = setInterval(() => session.tick(), 500); return () => clearInterval(timer) }, [session])
  const read = useMemo(() => async () => {
    if (faults.current.down) throw new PlatformApiError('Local service unavailable', { status: 503 })
    return buildRoomPractice(session.getSnapshot(), text)
  }, [session, text])
  const controller = useWeeklyLiveRoom(PRACTICE_ID, read)
  const transport = useMemo(() => {
    const local = createPracticeTransport(session.getSnapshot, session.apply, code => text[`room.error.${code}`] || text['room.error.unsupported'])
    const wrap = operation => async (...args) => {
      const body = args.at(-1), failure = faults.current.write
      faults.current.write = ''
      setWrites(items => [...items, body.clientKey || body.action || 'message'])
      setMode('正常')
      if (failure === 'before') throw new TypeError('Local request did not arrive')
      const result = await operation(...args)
      if (failure === 'after') throw new TypeError('Local response was lost after commit')
      return result
    }
    return { ...local, liveRoomWrite: wrap(local.liveRoomWrite), coordinationWrite: wrap(local.coordinationWrite) }
  }, [session, text])
  const failRead = () => { faults.current.down = true; setMode('接口中断'); void controller.refresh({ force: true }) }
  const restore = () => { faults.current.down = false; setMode('正常，等待自动重连') }
  const failWrite = when => { faults.current.write = when; setMode(when === 'before' ? '下次提交未送达' : '下次回应丢失') }
  return <div className={styles.page} data-tools={toolsOpen}>
    {toolsOpen && <aside className={styles.tools} data-i18n-ignore aria-label="本地网络故障演练">
      <strong>本地断线演练 · 不访问真实比赛</strong><button className={styles.hide} onClick={() => setToolsOpen(false)}>隐藏演练工具</button>
      <div><button onClick={failRead}>模拟接口中断</button><button onClick={restore}>恢复接口（等待自动重连）</button><button onClick={() => failWrite('before')}>下次提交未送达</button><button onClick={() => failWrite('after')}>下次提交已保存但丢失回应</button></div>
      <output>接口：{mode} · 写入尝试：{writes.length} · {writes.length > 1 && writes.at(-1) === writes.at(-2) ? '最近两次沿用同一提交编号' : '未重复提交'}</output>
    </aside>}
    <div ref={room}><RoomTransportProvider value={transport}><WeeklyRoomView preview matchId={PRACTICE_ID} controller={controller} returnPathOverride="/guides/weekly-room" returnLabelOverride="返回操作指南" accountControl={<span>本地队长</span>} /></RoomTransportProvider></div>
  </div>
}

export default function WeeklyRoomNetworkPreview() {
  const locale = useUiLocale(), [params] = useSearchParams(), scene = params.get('scene') || 'choosing'
  return <NetworkRoom key={locale + scene} scene={scene} locale={locale} text={copy[locale] || copy['zh-CN']} />
}
