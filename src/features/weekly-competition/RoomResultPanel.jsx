import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import RoomResultActions from './RoomResultActions.jsx'
import RoomForfeitControl, { ForfeitSummary } from './RoomForfeitControl.jsx'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'

const stages = {
  FORFEIT_REVIEW: ['弃权记录待复核', '后续选禁与比赛控制已暂停。请管理员核对队伍、已打记录及公开原因，确认后再进入赛果与积分处理。'],
  AWAITING_SUBMISSION: ['比赛结束，等待整理战报', '由赛管带入地图、Ban 和比分，补齐截图、回放与选手数据后提交审核。'],
  REPORT_IN_PROGRESS: ['赛管正在整理战报', '地图、Ban 和比分已带入；赛管补齐战报并提交审核后，双方再核对。'],
  RETURNED: ['战报已退回，等待更正', '管理员退回了当前战报。赛管需查看审核意见、补充资料并重新提交。'],
  REVIEWING: ['管理员审核中', '请等待赛果审核。当前地图记录可供核对，需要更正时请使用赛管协助。'],
  RECHECK: ['赛果需要重新复核', '赛果在审核或结算后发生变化，原响应不能直接用于新赛果。请等待管理员复核。'],
  AWAITING_CONFIRMATIONS: ['等待管理员开放确认', '正式赛果已通过审核，管理员开放后，双方本场操作代表可直接在本页响应。'],
  CONFIRMING: ['双方核对正式赛果', '请核对本场正式比分。有异议可说明涉及的地图和依据，提交后由管理员复核。'],
  DISPUTED: ['赛果争议处理中', '管理员正在核对队伍提出的异议。争议解决前不会显示为已结算。'],
  AWAITING_SETTLEMENT: ['双方已确认，等待结算', '双方响应已记录，积分仍由管理员按本届规则结算。'],
  SETTLED: ['本场已结算', '正式赛果与积分结算已记录。公开积分榜以管理员发布版本为准，沟通和地图记录继续保留。'],
  CANCELLED: ['本场已取消', '比赛控制已关闭，沟通记录保留。']
}
const responseNames = { NOT_OPEN: '尚未开放', PENDING: '待本队核对', CONFIRMED: '已确认', DISPUTED: '争议处理中', FINALIZED: '已结算', OVERRIDDEN: '按管理员裁定结算', EXPIRED: '等待重新确认' }

function ResponseControl({ side, data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const [open, setOpen] = useState(false), [status, setStatus] = useState('CONFIRMED'), [note, setNote] = useState(side.note || ''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  return <><button disabled={disabled} onClick={() => { if (!pending.current) { viewed.current = { expectedRevision: data.result.revision, fingerprint: data.result.fingerprint, confirmationUpdatedAt: side.updatedAt }; setStatus(side.status === 'DISPUTED' ? 'DISPUTED' : 'CONFIRMED') } setOpen(true) }}>{side.status === 'PENDING' ? uiText("核对并响应", uiLocale) : uiText("修改本队响应", uiLocale)}</button>
    <dialog ref={dialog} className={styles.dialog} aria-label={uiText("{0} 核对正式赛果", uiLocale, [side.team.name])} onCancel={() => setOpen(false)}><form onSubmit={async event => {
      event.preventDefault(); setError('')
      pending.current ||= { teamId: side.team.id, status, note: note.trim(), ...viewed.current, clientKey: crypto.randomUUID() }
      const saved = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/result-response', pending.current) } catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message || '提交尚未确认，请核对后重试。'); throw failure } }, '本队赛果响应已保存。')
      if (saved) { pending.current = null; setOpen(false) }
    }}><h2>{side.team.name}{uiText(" · 核对正式赛果", uiLocale)}</h2>{data.result.forfeit ? <ForfeitSummary data={data} /> : <p>{data.match.teamA.name} {data.result.scoreA} : {data.result.scoreB} {data.match.teamB.name}</p>}
      <label>{uiText("本队响应", uiLocale)}<select value={status} onChange={event => { setStatus(event.target.value); pending.current = null }} disabled={disabled}><option value="CONFIRMED">{data.result.forfeit ? uiText("记录无误，确认本队赛果", uiLocale) : uiText("比分无误，确认本队赛果", uiLocale)}</option><option value="DISPUTED">{uiText("赛果有异议，请管理员复核", uiLocale)}</option></select></label>
      {!!data.result.maps?.length && <ol className={styles.approvedMaps}>{data.result.maps.map(map => <li key={map.order}><span>{uiText("图 ", uiLocale)}{map.order} · {formatOwMapName(map.name)}</span><strong>{map.scoreA} : {map.scoreB}</strong></li>)}</ol>}
      <label>{uiText("核对说明", uiLocale)}{status === 'DISPUTED' ? uiText("（必填）", uiLocale) : uiText("（选填）", uiLocale)}<textarea value={note} onChange={event => { setNote(event.target.value); pending.current = null }} required={status === 'DISPUTED'} maxLength={2000} disabled={disabled} placeholder={uiText("涉及哪一图、存在什么问题、核对依据是什么", uiLocale)} /></label><p>{uiText("说明仅本队与赛管可见，对方和解说只看到响应状态。", uiLocale)}</p>
      {error && <p role="alert">{error}</p>}<div className={styles.actions}><button type="button" onClick={() => setOpen(false)}>{uiText("返回核对", uiLocale)}</button><button className={styles.primary} disabled={disabled || (status === 'DISPUTED' && note.trim().length < 2)}>{uiText("提交本队响应", uiLocale)}</button></div>
    </form></dialog></>
}

export default function RoomResultPanel({ data, disabled, mutate, correction }) {
  const uiLocale = useUiLocale()
  if (!data.result) return null
  const [title, description] = stages[data.result.phase] || ['正在核对赛果', '请等待本场最新状态。']
  const index = ['AWAITING_SUBMISSION', 'REPORT_IN_PROGRESS', 'RETURNED'].includes(data.result.phase) ? 0 : ['REVIEWING', 'RECHECK', 'FORFEIT_REVIEW'].includes(data.result.phase) ? 1 : ['SETTLED', 'AWAITING_SETTLEMENT'].includes(data.result.phase) ? 3 : 2
  const maps = data.result.official ? data.result.maps || [] : data.forfeit?.record?.maps || data.maps
  const byRuling = data.result.phase === 'SETTLED' && data.result.sides.some(side => side.status === 'OVERRIDDEN')
  return <div className={styles.resultProgress} aria-label={uiText("整场赛果进度", uiLocale)}>
    <ol className={styles.resultSteps}>{[data.result.forfeit ? '弃权记录' : '战报提交', '管理员审核', byRuling ? '响应已裁定' : '双方确认', '积分结算'].map((label, step) => <li key={label} aria-current={data.result.phase !== 'SETTLED' && step === index ? 'step' : undefined} data-done={data.result.phase === 'SETTLED' || step < index}><span>{data.result.phase === 'SETTLED' || step < index ? '✓' : `0${step + 1}`}</span>{label}</li>)}</ol>
    <strong className={styles.resultTitle}>{byRuling ? uiText("本场已按裁定结算", uiLocale) : title}</strong><p>{data.result.forfeit && ['AWAITING_CONFIRMATIONS', 'CONFIRMING'].includes(data.result.phase) ? data.result.phase === 'CONFIRMING' ? uiText("请核对弃权队伍、已打地图与积分依据。有异议可提交说明，由管理员复核。", uiLocale) : uiText("裁定已通过管理员复核，开放后双方可核对弃权队伍、实际记录及积分依据。", uiLocale) : description}</p>
    <ForfeitSummary data={data} />
    <RoomForfeitControl data={data} disabled={disabled} mutate={mutate} />
    {data.match.format === 'RR5' && data.series.complete && <div className={frame.seriesComplete}><strong>{uiText("5 / 5 图已完成", uiLocale)}</strong><span>{data.series.drawCount ? uiText("{0} 图平局 · ", uiLocale, [data.series.drawCount]) : ''}{data.series.scoreA === data.series.scoreB ? uiText("整场平局，正常进入赛果流程", uiLocale) : uiText("本场不再增加地图", uiLocale)}</span></div>}
    <div className={frame.resultMapTable}><table><caption>{data.result.official ? uiText("审核版本 · 逐图比分", uiLocale) : uiText("赛中工作记录 · 等待审核", uiLocale)}</caption><thead><tr><th scope="col">{uiText("局", uiLocale)}</th><th scope="col">{uiText("地图", uiLocale)}</th><th scope="col">{uiText("双方小分", uiLocale)}</th><th scope="col">{uiText("记录", uiLocale)}</th></tr></thead><tbody>{maps.map(map => {
      const hasScore = typeof map.scoreA === 'number' && Number.isFinite(map.scoreA) && typeof map.scoreB === 'number' && Number.isFinite(map.scoreB)
      const complete = data.result.official || !!data.forfeit?.record || map.status === 'COMPLETE'
      return <tr key={map.order}><td>{String(map.order).padStart(2, '0')}</td><th scope="row">{formatOwMapName(map.name) || uiText("地图待定", uiLocale)}</th><td>{complete && hasScore ? `${map.scoreA} : ${map.scoreB}` : '—'}</td><td>{complete && hasScore ? map.scoreA === map.scoreB ? uiText("平局", uiLocale) : uiText("已完成", uiLocale) : uiText("待确认", uiLocale)}</td></tr>
    })}</tbody></table>{!maps.length && <p>{data.result.forfeit ? uiText("本场未完成任何地图。", uiLocale) : uiText("地图记录尚未提供。", uiLocale)}</p>}</div>
    {data.result.official && <div className={styles.resultResponses}>{data.result.sides.map(side => <div key={side.team.id}><span><strong>{side.team.shortName || side.team.name}</strong><small>{data.result.phase === 'SETTLED' ? uiText("{0} 分 · 已结算", uiLocale, [data.result.points.find(item => item.teamId === side.team.id)?.points ?? '—']) : responseNames[side.status] || uiText("待核对", uiLocale)}</small></span>{side.canRespond && <ResponseControl key={data.result.fingerprint + side.team.id} side={side} data={data} disabled={disabled} mutate={mutate} />}</div>)}</div>}
    <div className={styles.resultControls}><RoomResultActions key={data.match.id + data.actor.id} data={data} disabled={disabled} mutate={mutate} />{correction}</div>
  </div>
}
