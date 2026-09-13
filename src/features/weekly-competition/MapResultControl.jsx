import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'

export default function MapResultControl({ data, disabled, mutate, correcting = false }) {
  const uiLocale = useUiLocale()
  const [open, setOpen] = useState(false), [scoreA, setScoreA] = useState(''), [scoreB, setScoreB] = useState(''), [error, setError] = useState(''), [note, setNote] = useState('')
  const dialog = useRef(null), pending = useRef(null), viewed = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const a = data.match.teamA, b = data.match.teamB, hasScores = scoreA !== '' && scoreB !== ''
  const fixedFive = data.match.format === 'RR5', lastMap = fixedFive && data.map.order === 5
  return <><button disabled={disabled || !(correcting ? data.canCorrectMapResult : data.canRecordMapResult)} onClick={() => { if (!pending.current) viewed.current = { expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision }; if (correcting && !pending.current) { setScoreA(String(data.map.scoreA)); setScoreB(String(data.map.scoreB)) } setOpen(true) }}>{correcting ? uiText("更正本图比分", uiLocale) : uiText("记录本图结果", uiLocale)}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="weekly-map-result-title" onCancel={() => setOpen(false)}><form onSubmit={async e => {
      e.preventDefault()
      setError('')
      pending.current ||= { action: correcting ? 'CORRECT_MAP_RESULT' : 'RECORD_MAP_RESULT', ...(correcting ? { note: note.trim() } : {}), scoreA: Number(scoreA), scoreB: Number(scoreB), ...viewed.current, clientKey: crypto.randomUUID() }
      const result = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/commands', pending.current) } catch (error) { if (error.status && error.status < 500) pending.current = null; setError(error.message || '提交结果未确认，请同步核对后重试。'); throw error } }, lastMap ? '第五图结果已保存。五图完成，请核对并整理战报。' : correcting ? '比分更正已保存，选择权已按最新结果重新计算。' : '本图赛中结果已保存，下一步按结果安排选禁。')
      if (result) { pending.current = null; setOpen(false) }
    }}><h2 id="weekly-map-result-title">{correcting ? uiText("更正", uiLocale) : uiText("记录", uiLocale)}{uiText("第 ", uiLocale)}{data.map.order}{uiText(" 图结果", uiLocale)}</h2><p>{formatOwMapName(data.map.name)}{uiText(" · 请核对游戏实际结束后的双方小分。", uiLocale)}{lastMap ? uiText("这是本场最后一图；保存后可整理整场战报，正式赛果仍需审核。", uiLocale) : uiText("此记录用于下一图选禁；整场正式赛果仍需审核。", uiLocale)}</p>
      <div className={styles.actions}><label>{a.name}{uiText(" 本图小分", uiLocale)}<input type="number" min="0" max="100" step="1" value={scoreA} required disabled={disabled} onChange={e => { setScoreA(e.target.value); pending.current = null }} /></label><label>{b.name}{uiText(" 本图小分", uiLocale)}<input type="number" min="0" max="100" step="1" value={scoreB} required disabled={disabled} onChange={e => { setScoreB(e.target.value); pending.current = null }} /></label></div>
      {correcting && <label>{uiText("公开更正原因", uiLocale)}<textarea value={note} onChange={e => { setNote(e.target.value); pending.current = null }} required minLength={2} maxLength={500} disabled={disabled} placeholder={uiText("例如：核对录像后发现双方小分录反", uiLocale)} /></label>}
      {hasScores && <div className={frame.resultConsequence} role="status"><strong>{Number(scoreA) === Number(scoreB) ? uiText("本图平局{0}", uiLocale, [fixedFive ? ' · 计入五图，胜场不增加' : '']) : uiText("{0} 赢下本图", uiLocale, [Number(scoreA) > Number(scoreB) ? a.name : b.name])}</strong><p>{lastMap ? uiText("确认后五图全部完成，进入整场战报与审核。总比分平局也正常结束，不增加第六图。", uiLocale) : Number(scoreA) === Number(scoreB) ? uiText("沿用本图选择方，下一图重新选未使用的地图和类型，并决定 Ban 顺序。", uiLocale) : uiText("{0} 将决定下一图地图和 Ban 先后。{1}", uiLocale, [Number(scoreA) > Number(scoreB) ? b.name : a.name, fixedFive ? `本图计入完成进度，之后还需完成 ${5 - data.map.order} 图。` : '整场达到获胜条件时进入赛果核对。'])}</p></div>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}><button type="button" onClick={() => setOpen(false)}>{uiText("返回核对", uiLocale)}</button><button className={styles.primary} disabled={disabled || !hasScores || (correcting && note.trim().length < 2)}>{correcting ? uiText("记录原因并更正比分", uiLocale) : uiText("确认本图结果", uiLocale)}</button></div>
    </form></dialog></>
}

export function NextMapControl({ data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const pending = useRef(null), next = data.opening?.next
  if (!next) return null
  const chooser = next.chooserSide === 'A' ? data.match.teamA : next.chooserSide === 'B' ? data.match.teamB : null
  const representative = data.representatives?.sides.find(side => side.teamId === chooser?.id)
  return <><div className={frame.nextMapSummary}><div><small>{data.match.format === 'RR5' ? uiText("RR5 · {0} / 5 图已完成", uiLocale, [data.series.completedMaps ?? data.maps.filter(map => map.status === 'COMPLETE').length]) : uiText("本图已记录", uiLocale)}</small><strong>{next.reason ? uiText("等待核对本场记录", uiLocale) : uiText("下一图 · {0}", uiLocale, [chooser?.shortName || chooser?.name || '选择方待确认'])}</strong></div><span>{next.reason ? uiText("请赛管核对", uiLocale) : next.rightsSource === 'DRAW_RETAINED_CHOOSER' ? uiText("平局 · 保留选择方", uiLocale) : uiText("败方选择地图与顺序", uiLocale)}</span></div><p>{next.reason || uiText("等待赛管开放第 {0} 图，随后由 {1} 选择地图与 Ban 先后。", uiLocale, [next.order, representative?.active ? representative.name : `${chooser?.name || '本队'} 操作代表`])}</p>
    {data.opening.access.canNext && <button className={styles.primary} disabled={disabled} onClick={async () => {
      pending.current ||= { action: 'NEXT_MAP', expectedRevision: data.opening.revision, clientKey: crypto.randomUUID() }
      await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/opening', pending.current) } catch (error) { if (error.status && error.status < 500) pending.current = null; throw error } }, '')
    }}>{uiText("开放第 ", uiLocale)}{next.order}{uiText(" 图 · ", uiLocale)}{chooser?.name || uiText("选择方待确认", uiLocale)}{uiText(" 选择", uiLocale)}</button>}</>
}
