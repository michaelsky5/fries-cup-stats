import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'

export default function RoomConcession({ data, disabled, mutate }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport()
  const [open, setOpen] = useState(false), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const choice = data.forfeit?.concession
  if (!choice) return null
  const selfConfirmed = choice.requiresReferee === false
  const projection = choice.projection, team = data.match[`team${choice.side}`]
  const counted = data.forfeit.countsTowardStandings
  async function send(action) {
    pending.current ||= { action, confirmed: action === 'CONCEDE', forfeitedSide: choice.side, matchRevision: viewed.current?.matchRevision ?? data.match.revision, draftRevision: viewed.current?.draftRevision ?? data.draftRevision, clientKey: crypto.randomUUID(), reason: action === 'CONTINUE' ? '本队选择继续比赛' : `本队在 ${projection.playedScoreA}:${projection.playedScoreB} 后自愿放弃剩余 ${projection.remainingMaps} 张地图，申请按规则书第 3.2 条处理。` }
    const saved = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/forfeit', pending.current) }
      catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message); throw failure }
    }, uiText(action === 'CONTINUE' ? '本队已选择继续比赛。' : selfConfirmed ? '放弃剩余地图已生效，对方可知悉或提出异议。' : '已提交放弃剩余地图申请，等待赛管确认。', locale))
    if (saved) { pending.current = null; viewed.current = null; setOpen(false) }
  }
  return <div className={frame.resultConsequence} data-room-slot="concession">
    <strong>{uiText('{0} 可选择继续或放弃剩余 {1} 图', locale, [team.shortName || team.name, projection.remainingMaps])}</strong>
    <p>{choice.continued ? uiText('本队已选择继续；下一图后符合条件仍可再次选择。', locale) : uiText(selfConfirmed ? '当前没有赛管。落后方二次确认后生效，对方可提出异议，交管理员复核。' : '由落后方本场操作代表决定。放弃需赛管确认，已打地图与积分保留。', locale)}</p>
    {choice.canRequest && <div className={styles.actions}>
      {!choice.continued && <button type="button" disabled={disabled || !!pending.current && pending.current.action !== 'CONTINUE'} onClick={() => { viewed.current = null; setError(''); send('CONTINUE') }}>{uiText('继续比赛', locale)}</button>}
      <button type="button" disabled={disabled || !!pending.current && pending.current.action !== 'CONCEDE'} onClick={() => { if (!pending.current) viewed.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision }; setError(''); setOpen(true) }}>{uiText(selfConfirmed ? '放弃剩余地图' : '申请放弃剩余地图', locale)}</button>
    </div>}
    {error && !open && <p role="alert">{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="concession-title" onCancel={event => { if (disabled) event.preventDefault(); else setOpen(false) }}><form onSubmit={event => { event.preventDefault(); send('CONCEDE') }}>
      <h2 id="concession-title">{uiText(selfConfirmed ? '确认放弃剩余地图' : '确认申请放弃剩余地图', locale)}</h2>
      <p>{uiText(selfConfirmed ? '再次确认后立即生效，最终比分为 {0}:{1}。未打的 {2} 图记为判负，不生成小分、回放或选手数据。' : '赛管确认后，最终比分为 {0}:{1}。未打的 {2} 图记为判负，不生成小分、回放或选手数据。', locale, [projection.scoreA, projection.scoreB, projection.remainingMaps])}</p>
      <p>{data.match.teamA.shortName || data.match.teamA.name}：{counted ? projection.pointsA : 0} · {data.match.teamB.shortName || data.match.teamB.name}：{counted ? projection.pointsB : 0} {uiText('积分', locale)}</p>
      <p>{uiText(selfConfirmed ? '对方知悉确认不影响弃图生效。异议交管理员复核，积分仍按正常确认与结算流程处理。' : '提交后暂停后续比赛操作，等待赛管确认。纪律处罚另行处理。', locale)}</p>
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setOpen(false)}>{uiText('返回核对', locale)}</button><button className={styles.primary} disabled={disabled}>{uiText(selfConfirmed ? '已核对，确认放弃剩余地图' : '确认申请，交由赛管处理', locale)}</button></div>
    </form></dialog>
  </div>
}
