import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'
import surfaces from './RoomSurfaces.module.css'
import RoomForfeitRecovery, { ForfeitHistory } from './RoomForfeitRecovery.jsx'

export function ForfeitSummary({ data, expanded = false }) {
  const uiLocale = useUiLocale()
  const record = data.forfeit?.record
  if (!record) return null
  const team = side => side === 'A' ? data.match.teamA.name : data.match.teamB.name
  const opponentEarned = record.winnerSide === 'A' ? record.earnedA : record.earnedB
  const pendingReview = record.status === 'PENDING_REVIEW'
  return <section className={frame.forfeitSummary} aria-label={uiText("弃权裁定与积分依据", uiLocale)}>
    {pendingReview && record.correction && <div className={frame.recoveryProjection}><strong>{record.correction.hadSettlement ? uiText("原结算已冲正 · 更正待复核", uiLocale) : uiText("裁定更正待复核", uiLocale)}</strong><small>{uiText("旧审核与双方响应已失效。请按本次更正重新核对，当前预计积分尚未生效。", uiLocale)}</small></div>}
    <strong>{team(record.forfeitedSide)}{uiText(" 弃权", uiLocale)}{record.status === 'APPROVED' ? uiText(" · {0} 获判胜", uiLocale, [team(record.winnerSide)]) : uiText(" · 等待管理员复核", uiLocale)}</strong>
    <p>{uiText("已完成 ", uiLocale)}{record.completedMaps}{uiText(" / 5 图", uiLocale)}{record.completedMaps ? uiText("，实际比分 {0} : {1}", uiLocale, [record.scoreA, record.scoreB]) : uiText("，尚未产生实际比分", uiLocale)}{uiText("。剩余 ", uiLocale)}{record.remainingMaps}{uiText(" 图因弃权未完成，不生成小分或选手数据。", uiLocale)}</p>
    <dl><div><dt>{team(record.forfeitedSide)}</dt><dd>{pendingReview ? uiText("拟记 0 分 · 待复核", uiLocale) : uiText("0 分 · 全场弃权", uiLocale)}</dd></div><div><dt>{team(record.winnerSide)}</dt><dd>{pendingReview ? uiText("拟计：", uiLocale) : ''}{data.forfeit.countsTowardStandings ? uiText("{0} 已得积分 + {1} 未完成图补分 = {2} 分", uiLocale, [opponentEarned, record.remainingMaps, opponentEarned + record.remainingMaps]) : uiText("0 分 · 本周期不计入积分", uiLocale)}</dd></div></dl>
    <details open={expanded}><summary>{uiText("查看弃权原因与复核记录", uiLocale)}</summary><p>{uiText("公开原因：", uiLocale)}{record.reason}</p><small>{record.proposedBy} · {new Date(record.proposedAt).toLocaleString('zh-CN')}{record.reviewedBy ? uiText(" · {0} 已复核", uiLocale, [record.reviewedBy]) : ''}</small>
      {record.reviewReason && <p>{uiText("复核说明：", uiLocale)}{record.reviewReason}</p>}
    </details>
    <small>{data.result?.phase === 'SETTLED' ? uiText("积分已结算；已打地图的结果继续保留。", uiLocale) : uiText("积分在结算后生效；已打地图的结果继续保留。", uiLocale)}</small>
  </section>
}

export default function RoomForfeitControl({ data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const [action, setAction] = useState(''), [side, setSide] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null)
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close() }, [action])
  const access = data.forfeit
  if (!access?.canPropose && !access?.canReview && !access?.canCorrect && !access?.history?.length) return null
  const open = selected => {
    if (!pending.current) { viewed.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision }; setSide(''); setReason('') }
    setError(''); setAction(pending.current?.action || selected)
  }
  const projection = access.projections?.[side]
  return <div className={frame.forfeitActions}>
    <ForfeitHistory data={data} />
    <RoomForfeitRecovery data={data} disabled={disabled} mutate={mutate} />
    {access.canPropose && <><button disabled={disabled} onClick={() => open('PROPOSE')}>{uiText("记录全场弃权", uiLocale)}</button><small>{uiText("需填写公开原因，由管理员复核。", uiLocale)}</small></>}
    {access.canReview && <><button className={styles.primary} disabled={disabled} onClick={() => open('APPROVE')}>{uiText("复核并确认弃权", uiLocale)}</button><button disabled={disabled} onClick={() => open('REJECT')}>{uiText("撤回记录，重新核对比赛", uiLocale)}</button></>}
    <dialog ref={dialog} className={`${styles.dialog} ${surfaces.paper}`} aria-labelledby="rr5-forfeit-title" onCancel={event => { if (disabled) event.preventDefault(); else setAction('') }}><form onSubmit={async event => {
      event.preventDefault(); setError('')
      pending.current ||= { action, ...(action === 'PROPOSE' ? { forfeitedSide: side } : {}), reason: reason.trim(), ...viewed.current, clientKey: crypto.randomUUID() }
      const saved = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/forfeit', pending.current) } catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message || '提交结果未确认，请同步后核对。'); throw failure } }, action === 'PROPOSE' ? '弃权记录已提交复核，后续比赛操作已暂停。' : action === 'APPROVE' ? '弃权裁定已复核，下一步开放双方核对。' : '弃权记录已撤回，请核对游戏实际状态后继续。')
      if (saved) { pending.current = null; setAction('') }
    }}><h2 id="rr5-forfeit-title">{action === 'PROPOSE' ? uiText("记录全场弃权", uiLocale) : action === 'APPROVE' ? uiText("复核弃权裁定", uiLocale) : uiText("撤回弃权记录", uiLocale)}</h2>
      {action === 'PROPOSE' ? <><p>{uiText("仅在核实队伍退出后使用。提交后冻结后续选禁与开赛，等待管理员复核；不会立即结算。", uiLocale)}</p><label>{uiText("弃权队伍", uiLocale)}<select required value={side} disabled={disabled} onChange={event => { setSide(event.target.value); pending.current = null }}><option value="">{uiText("请选择弃权队伍", uiLocale)}</option><option value="A">{data.match.teamA.name}</option><option value="B">{data.match.teamB.name}</option></select></label>
        {projection && <div className={frame.resultConsequence}><strong>{uiText("保留 ", uiLocale)}{projection.completedMaps}{uiText("/5 图实际记录", uiLocale)}</strong><p>{data.match.teamA.name}：{access.countsTowardStandings ? projection.pointsA : 0}{uiText(" 分 · ", uiLocale)}{data.match.teamB.name}：{access.countsTowardStandings ? projection.pointsB : 0}{uiText(" 分", uiLocale)}</p><small>{uiText("剩余 ", uiLocale)}{projection.remainingMaps}{uiText(" 图只用于计算补分，不补造比分。", uiLocale)}</small></div>}</> : <><ForfeitSummary data={data} expanded />{action === 'REJECT' && <p>{uiText("恢复原有比赛进度，保留选禁与沟通记录。进行中的地图需重新核对恢复条件。", uiLocale)}</p>}</>}
      <label>{action === 'PROPOSE' ? uiText("公开弃权原因", uiLocale) : uiText("公开复核说明", uiLocale)}<textarea required minLength={2} maxLength={2000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); pending.current = null }} placeholder={uiText("说明核实情况与裁定依据，本场双方和工作人员可见", uiLocale)} /></label>
      {error && <p role="alert">{error}</p>}<div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setAction('')}>{uiText("返回核对", uiLocale)}</button><button className={styles.primary} disabled={disabled || reason.trim().length < 2 || action === 'PROPOSE' && !projection}>{action === 'PROPOSE' ? uiText("提交弃权记录，等待复核", uiLocale) : action === 'APPROVE' ? uiText("确认裁定，进入赛果核对", uiLocale) : uiText("确认撤回记录", uiLocale)}</button></div>
    </form></dialog>
  </div>
}
