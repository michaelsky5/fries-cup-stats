import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'
import surfaces from './RoomSurfaces.module.css'

export function ForfeitHistory({ data }) {
  const uiLocale = useUiLocale()
  const history = data.forfeit?.history || []
  if (!history.length) return null
  const team = side => (side === 'A' ? data.match.teamA : data.match.teamB).name
  return <details className={frame.forfeitHistory}><summary>{uiText("裁定更正记录 · ", uiLocale)}{history.length}{uiText(" 次", uiLocale)}</summary><ol>{history.map((item, index) => <li key={`${item.at}-${index}`}>
    <strong>{item.action === 'WITHDRAW' ? uiText("撤销弃权裁定", uiLocale) : uiText("更正弃权裁定", uiLocale)} · {item.by}</strong>
    <small>{new Date(item.at).toLocaleString('zh-CN')}</small>
    <p>{uiText("原裁定：", uiLocale)}{team(item.forfeitedSide)}{uiText(" 弃权。", uiLocale)}{item.originalReason}</p>
    {item.reviewReason && <p>{uiText("原复核：", uiLocale)}{item.reviewedBy} · {item.reviewReason}</p>}
    <p>{uiText("更正说明：", uiLocale)}{item.reason}</p>
    <small>{item.reversedPoints.length ? uiText("原结算已冲正：{0}。", uiLocale, [item.reversedPoints.map(row => `${[data.match.teamA, data.match.teamB].find(t => t.id === row.teamId)?.name || '队伍'} ${row.points} 分`).join(' / ')]) : uiText("更正时尚未结算积分。", uiLocale)}{uiText("旧响应仅留作记录。", uiLocale)}</small>
  </li>)}</ol></details>
}

export default function RoomForfeitRecovery({ data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const [action, setAction] = useState(''), [side, setSide] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null)
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close() }, [action])
  if (!data.forfeit?.canCorrect) return null
  const open = chosen => {
    if (!pending.current) {
      viewed.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision, settlementVersion: data.result.settlementVersion, active: data.result.activeSettlement || [] }
      setSide(data.forfeit.record.forfeitedSide); setReason('')
    }
    setError(''); setAction(pending.current?.action || chosen)
  }
  const correction = action === 'CORRECT', projection = data.forfeit.projections?.[side]
  const active = viewed.current?.active || []
  return <>
    <details className={frame.forfeitManagement}><summary>{uiText("裁定有误？更正或撤销", uiLocale)}</summary><p>{uiText("由管理员填写原因。原裁定与响应留档，已结算积分会一并冲正。", uiLocale)}</p><div className={styles.actions}>
      <button disabled={disabled} onClick={() => open('CORRECT')}>{uiText("更正弃权裁定", uiLocale)}</button>
      <button disabled={disabled} onClick={() => open('WITHDRAW')}>{uiText("撤销弃权，恢复比赛", uiLocale)}</button>
    </div></details>
    <dialog ref={dialog} className={`${styles.dialog} ${surfaces.paper}`} aria-labelledby="rr5-recovery-title" onCancel={event => { if (disabled) event.preventDefault(); else setAction('') }}><form onSubmit={async event => {
      event.preventDefault(); setError('')
      const { active: _active, ...versions } = viewed.current
      pending.current ||= { action, ...versions, ...(correction ? { forfeitedSide: side } : {}), reason: reason.trim(), clientKey: crypto.randomUUID() }
      const saved = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/forfeit', pending.current) } catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message || '操作结果尚未确认，请同步后核对。'); throw failure } }, correction ? '更正已提交复核，原结算和旧确认已退出当前流程。' : '弃权裁定已撤销，请核对原比赛进度后继续。')
      if (saved) { pending.current = null; setAction('') }
    }}><small>{uiText("裁定更正 / 管理员", uiLocale)}</small><h2 id="rr5-recovery-title">{correction ? uiText("更正弃权裁定", uiLocale) : uiText("撤销弃权，恢复比赛", uiLocale)}</h2>
      <p>{correction ? uiText("修改弃权队伍或公开原因，重新进入管理员复核，再由双方确认。", uiLocale) : uiText("解除本场弃权状态，回到原比赛进度。若地图仍在进行，双方先确认恢复条件，再由赛管继续。", uiLocale)}</p>
      <div className={frame.recoveryImpact}><strong>{active.length ? uiText("本次操作同时撤销原积分结算", uiLocale) : uiText("本场尚无有效积分结算", uiLocale)}</strong>
        {active.length > 0 && <dl>{[data.match.teamA, data.match.teamB].map(team => <div key={team.id}><dt>{team.name}</dt><dd>{active.find(item => item.teamId === team.id)?.points ?? '—'}{uiText(" 分 ", uiLocale)}<span>{uiText("→ 原结算失效", uiLocale)}</span></dd></div>)}</dl>}
        <small>{active.length ? uiText("冲正记录保留；公开积分榜仍以管理员发布版本为准。", uiLocale) : uiText("本次仅撤销旧审核与确认，不产生冲正积分。", uiLocale)}{uiText("已打地图、Ban 和沟通记录保留。", uiLocale)}</small>
      </div>
      {correction && <><label>{uiText("更正后的弃权队伍", uiLocale)}<select required value={side} disabled={disabled} onChange={event => { setSide(event.target.value); pending.current = null }}><option value="A">{data.match.teamA.name}</option><option value="B">{data.match.teamB.name}</option></select></label>
        {projection && <div className={frame.recoveryProjection}><strong>{uiText("重新复核后预计积分", uiLocale)}</strong><span>{data.match.teamA.name} {data.forfeit.countsTowardStandings ? projection.pointsA : 0}{uiText(" 分 / ", uiLocale)}{data.match.teamB.name} {data.forfeit.countsTowardStandings ? projection.pointsB : 0}{uiText(" 分", uiLocale)}</span><small>{uiText("保留 ", uiLocale)}{projection.completedMaps}{uiText("/5 图", uiLocale)}{projection.completedMaps ? uiText("、实际比分 {0}:{1}", uiLocale, [projection.scoreA, projection.scoreB]) : uiText("，尚无实际比分", uiLocale)}{uiText("；此处为预计值，重新结算后才生效。", uiLocale)}</small></div>}</>}
      <label>{uiText("公开更正说明", uiLocale)}<textarea required minLength={2} maxLength={2000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); pending.current = null }} placeholder={uiText("说明原裁定哪里有误、核对依据及本次更正内容", uiLocale)} /></label>
      {error && <p role="alert">{error}</p>}<div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setAction('')}>{uiText("返回核对", uiLocale)}</button><button className={styles.primary} disabled={disabled || reason.trim().length < 2 || correction && !projection}>{correction ? uiText("提交更正，重新复核", uiLocale) : uiText("确认撤销，恢复比赛", uiLocale)}</button></div>
    </form></dialog>
  </>
}
