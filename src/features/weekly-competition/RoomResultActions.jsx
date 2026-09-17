import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import { systemPageUrl } from './roomResultLinks.js'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomResultActions({ data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const [report, setReport] = useState(null), [open, setOpen] = useState(false), [pointsA, setPointsA] = useState(''), [pointsB, setPointsB] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null), handoffPending = useRef(null)
  const [override, setOverride] = useState(false)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const result = data.result, admin = result.administration || {}, reviewUrl = systemPageUrl(admin.reviewPath)
  const versions = () => ({ expectedRevision: result.revision, fingerprint: result.fingerprint, confirmationVersion: result.confirmationVersion })
  const openSettlement = (byRuling = false) => {
    if (!pending.current) { viewed.current = versions(); setPointsA(result.forfeit ? String(result.forfeit.pointsA) : result.countsTowardStandings ? '' : '0'); setPointsB(result.forfeit ? String(result.forfeit.pointsB) : result.countsTowardStandings ? '' : '0'); setReason(''); setOverride(byRuling) }
    setError(''); setOpen(true)
  }
  async function act(action, extra, version = versions()) {
    pending.current ||= { action, ...extra, ...version, clientKey: crypto.randomUUID() }
    return mutate(async () => { try { const saved = await liveRoomWrite(data.match.id, '/result-actions', pending.current); pending.current = null; return saved } catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message); throw failure } }, action === 'SETTLE' ? '本场积分已结算。' : '双方确认已开放。')
  }
  return <>
    {data.access.staff && result.handoff && ['AWAITING_SUBMISSION', 'REPORT_IN_PROGRESS', 'RETURNED'].includes(result.phase) && <div className={styles.resultAction}>
      <button className={report ? undefined : styles.primary} disabled={disabled || !result.handoff.canHandoff || !systemPageUrl('/submit/check')} onClick={async () => {
        setError(''); handoffPending.current ||= { matchRevision: data.match.revision, draftRevision: result.handoff.draftRevision, clientKey: crypto.randomUUID() }
        const saved = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/result-handoff', handoffPending.current) } catch (failure) { if (failure.status && failure.status < 500) handoffPending.current = null; setError(failure.message); throw failure } }, '战报入口已准备好，提交后可返回比赛房。')
        if (saved) { handoffPending.current = null; setReport(saved) }
      }}>{report ? uiText("刷新战报入口", uiLocale) : result.handoff.createdAt ? uiText("继续整理战报", uiLocale) : uiText("整理战报并交接", uiLocale)}</button>
      {report && <a className={`${styles.resultLink} ${styles.primary}`} href={systemPageUrl(report.path + '?returnToRoom=1')} target="_blank" rel="noopener noreferrer">{uiText("打开战报并提交审核 ↗", uiLocale)}</a>}
      {result.handoff.reason && <small>{result.handoff.reason}</small>}
      {!systemPageUrl('/submit/check') && <small>{uiText("战报服务尚未接通，请赛事管理员检查入口配置。", uiLocale)}</small>}
    </div>}
    {admin.canOpen && <button className={styles.primary} disabled={disabled} onClick={() => { setError(''); act('OPEN_CONFIRMATIONS') }}>{uiText("开放双方赛果确认", uiLocale)}</button>}
    {admin.canSettle && <button className={styles.primary} disabled={disabled} onClick={() => openSettlement()}>{uiText("核对积分并结算", uiLocale)}</button>}
    {admin.canSettleByRuling && !admin.canSettle && <button disabled={disabled} onClick={() => openSettlement(true)}>{uiText("按裁定结算（需说明）", uiLocale)}</button>}
    {reviewUrl && ['REVIEWING', 'RECHECK', 'DISPUTED', 'RETURNED'].includes(result.phase) && <a className={styles.resultLink} href={reviewUrl} target="_blank" rel="noopener noreferrer">{result.phase === 'DISPUTED' ? uiText("打开战报，复核争议", uiLocale) : uiText("打开本场审核工作台", uiLocale)} ↗</a>}
    {result.eligibleAt && result.phase === 'AWAITING_SETTLEMENT' && !admin.canSettle && <small>{uiText("申诉等待期至 ", uiLocale)}{new Date(result.eligibleAt).toLocaleString('zh-CN')}{uiText("。到期后由管理员结算。", uiLocale)}</small>}
    {error && !open && <p role="alert">{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-label={uiText("核对本场积分并结算", uiLocale)} onCancel={() => setOpen(false)}><form onSubmit={async event => {
      event.preventDefault(); setError('')
      if (await act('SETTLE', { pointsA: Number(pointsA), pointsB: Number(pointsB), reason: reason.trim(), ...(override ? { overrideConfirmations: true } : {}) }, viewed.current)) setOpen(false)
    }}><h2>{override ? uiText("按管理员裁定结算", uiLocale) : uiText("核对本场积分并结算", uiLocale)}</h2><p>{data.match.teamA.name} / {data.match.teamB.name} · {override ? uiText("未齐双方确认或存在异议，将保留原响应并记录管理员裁定。", uiLocale) : uiText("双方已确认", uiLocale)}</p>
      <p>{!result.countsTowardStandings ? uiText("本周期不计入正式积分，双方均记 0 分。", uiLocale) : result.forfeit ? uiText("弃权方 0 分；对手保留已得积分，未完成地图每张补 1 分。以下积分由已审核记录计算。", uiLocale) : uiText("按本届规则填写双方应得积分。比分不等于积分。", uiLocale)}</p>
      <div className={styles.resultPoints}><label>{data.match.teamA.name}{uiText(" 积分", uiLocale)}<input type="number" min="0" max="1000" step="1" required value={pointsA} readOnly={!result.countsTowardStandings || !!result.forfeit} disabled={disabled} onChange={event => { setPointsA(event.target.value); pending.current = null }} /></label><label>{data.match.teamB.name}{uiText(" 积分", uiLocale)}<input type="number" min="0" max="1000" step="1" required value={pointsB} readOnly={!result.countsTowardStandings || !!result.forfeit} disabled={disabled} onChange={event => { setPointsB(event.target.value); pending.current = null }} /></label></div>
      <label>{uiText("结算依据", uiLocale)}<textarea required minLength={2} maxLength={2000} value={reason} disabled={disabled} onChange={event => { setReason(event.target.value); pending.current = null }} placeholder={uiText("填写适用积分规则及本场结算依据", uiLocale)} /></label>
      {error && <p role="alert">{error}</p>}<div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setOpen(false)}>{uiText("返回核对", uiLocale)}</button><button className={styles.primary} disabled={disabled || pointsA === '' || pointsB === '' || reason.trim().length < 2}>{uiText("确认结算本场积分", uiLocale)}</button></div>
    </form></dialog>
  </>
}
