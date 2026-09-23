import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatOwHeroName, formatOwMapMode, formatOwMapName, getOwMap } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import { systemPageUrl } from './roomResultLinks.js'
import styles from './RoomMatchFrame.module.css'
import { getRoomStageIndex, ROOM_STAGES } from './weeklyRoomFlow.js'

const teamName = team => team?.shortName || team?.name || '队伍待定'
const numericScore = value => typeof value === 'number' && Number.isFinite(value)
const isDraw = map => map.status === 'COMPLETE' && numericScore(map.scoreA) && numericScore(map.scoreB) && map.scoreA === map.scoreB

export function RoomMatchHeader({ data, phaseLabel, returnPath, busy, error, refresh, accountControl }) {
  const uiLocale = useUiLocale()
  const completed = data.maps.filter(map => map.status === 'COMPLETE')
  const official = data.result?.official
  const score = official ? data.result : completed.length ? data.series : null
  const hasScore = score && numericScore(score.scoreA) && numericScore(score.scoreB)
  const forfeit = data.forfeit?.record
  if (forfeit) phaseLabel = forfeit.status === 'PENDING_REVIEW' ? '弃权待复核' : `${teamName(forfeit.forfeitedSide === 'A' ? data.match.teamA : data.match.teamB)} 弃权 · ${teamName(forfeit.winnerSide === 'A' ? data.match.teamA : data.match.teamB)} 获判胜`
  return <>
    <header className={styles.masthead} data-room-slot="header" data-opening={Boolean(data.opening && !data.opening.complete)}>
      <Link to={returnPath} className={styles.brand}><img src="/logos/fries-cup-symbol.png" alt="" /><span><b>FRIES CUP</b><small>{uiText("赛事中心 / 比赛房", uiLocale)}</small></span></Link>
      <div className={styles.headerMatch}><div className={styles.headerTeams}><strong>{teamName(data.match.teamA)}</strong><b>{hasScore ? `${score.scoreA} : ${score.scoreB}` : 'VS'}</b><strong>{teamName(data.match.teamB)}</strong></div><div className={styles.headerMeta}><span>{data.match.seasonName}</span><span>{data.match.weekLabel}</span><span>{data.match.format === 'RR5' ? uiText("RR5 · 固定五局", uiLocale) : data.match.format || uiText("赛制待确认", uiLocale)}</span><span>{data.match.scheduledAt ? new Date(data.match.scheduledAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : uiText("比赛时间待定", uiLocale)}</span><em data-phase={data.phase}>{phaseLabel}</em></div></div>
      <div className={styles.tools}><button type="button" disabled={busy} onClick={() => refresh({ force: true })}><span aria-hidden="true">↻</span>{uiText(" 重新同步", uiLocale)}</button>{accountControl}</div>
    </header>
    <div className={styles.matchFacts} data-room-slot="facts"><div><span>{uiText("游戏房间", uiLocale)}<b>{data.preparation.brief?.roomName || uiText("等待赛管发布", uiLocale)}</b></span><span>{uiText("比赛房间设置码", uiLocale)}<b className={styles.mono}>{data.preparation.brief?.roomCode || uiText("未设置", uiLocale)}</b></span><span>{uiText("本场赛管", uiLocale)}<b>{data.staff.map(item => item.name).join(' / ') || uiText("等待指派", uiLocale)}</b></span></div><span className={styles.sync} data-error={!!error}>{error ? uiText("同步中断 · 上次记录", uiLocale) : data.syncedAt ? uiText("最近同步 {0}", uiLocale, [new Date(data.syncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })]) : uiText("同步时间待确认", uiLocale)}</span></div>
  </>
}

export function RoomSeriesRail({ data, phaseLabel }) {
  const uiLocale = useUiLocale()
  const [selected, setSelected] = useState(null)
  const dialog = useRef(null)
  const selectedMap = data.maps.find(map => map.order === selected)
  useEffect(() => { if (selectedMap) dialog.current?.showModal(); else dialog.current?.close() }, [selectedMap])
  const completed = data.maps.filter(map => map.status === 'COMPLETE')
  const drawCount = completed.filter(isDraw).length
  const total = data.match.format === 'RR5' ? 5 : Math.max(1, ...data.maps.map(map => map.order))
  // Do not discard an unexpected server record beyond RR5's configured five maps.
  const count = Math.max(total, ...data.maps.map(map => map.order))
  const selectedImage = selectedMap && getOwMap(selectedMap.name) ? getMapImage(selectedMap.type, selectedMap.name) : null
  return <>
    <section className={styles.series} data-room-slot="series" aria-label={uiText("整场地图进程", uiLocale)}>
      <div className={styles.seriesLabel}><strong>{data.match.format === 'RR5' ? uiText("本场五局", uiLocale) : uiText("整场地图", uiLocale)}</strong><small>{completed.length}{data.match.format === 'RR5' ? ' / 5' : ''}{uiText(" 已完成", uiLocale)}{drawCount ? uiText(" · {0} 平", uiLocale, [drawCount]) : ''}</small></div>
      <ol className={styles.mapRail} style={{ '--map-count': count }}>
        {Array.from({ length: count }, (_, index) => {
          const map = data.maps.find(item => item.order === index + 1)
          const current = map?.order === data.map?.order
          const label = map?.status === 'COMPLETE' ? `${map.scoreA ?? '—'} : ${map.scoreB ?? '—'}${isDraw(map) ? ' · 平局' : ''}` : data.forfeit?.record ? data.forfeit.record.status === 'APPROVED' ? map?.status === 'LIVE' ? '因弃权未完成' : '因弃权未进行' : '弃权记录待复核' : current ? phaseLabel : '尚未开始'
          const banSummary = `${teamName(data.match.teamA)}：${formatOwHeroName(map?.banA) || uiText("待定", uiLocale)} / ${teamName(data.match.teamB)}：${formatOwHeroName(map?.banB) || uiText("待定", uiLocale)}`
          const content = <><span>{String(index + 1).padStart(2, '0')}</span><b>{formatOwMapName(map?.name) || (current ? uiText("等待选图", uiLocale) : uiText("地图待定", uiLocale))}</b><small>{map?.name ? `${map?.status === 'COMPLETE' ? `${label} · ` : ''}${banSummary}` : label}</small></>
          return <li key={index} data-current={!!current} data-complete={map?.status === 'COMPLETE'}>{map?.name ? <button type="button" aria-label={uiText("查看第 {0} 图 {1} · {2}", uiLocale, [index + 1, formatOwMapName(map.name), label])} onClick={() => setSelected(map.order)}>{content}</button> : <div>{content}</div>}</li>
        })}
      </ol>
    </section>
    <dialog ref={dialog} className={styles.recordDialog} onCancel={() => setSelected(null)} aria-labelledby="room-map-record-title">
      {selectedMap && <><header><div><small>MAP {String(selectedMap.order).padStart(2, '0')}{uiText(" / 地图记录", uiLocale)}</small><h2 id="room-map-record-title">{formatOwMapName(selectedMap.name)}</h2></div><button type="button" aria-label={uiText("关闭地图记录", uiLocale)} onClick={() => setSelected(null)}>×</button></header>
        <div className={styles.recordMap} style={selectedImage ? { backgroundImage: `linear-gradient(90deg,#181a17cf,#181a1780),url("${selectedImage}")` } : undefined}><span>{teamName(data.match.teamA)}</span><strong>{selectedMap.status === 'COMPLETE' ? `${selectedMap.scoreA ?? '—'} : ${selectedMap.scoreB ?? '—'}` : 'VS'}</strong><span>{teamName(data.match.teamB)}</span></div>
        <p>{formatOwMapMode(selectedMap.type)} · {selectedMap.status === 'COMPLETE' ? isDraw(selectedMap) ? uiText("平局{0}", uiLocale, [data.match.format === 'RR5' ? ' · 计入固定五局' : '']) : uiText("本图已完成", uiLocale) : uiText("本图尚未完成", uiLocale)}{uiText(" · 赛管工作记录", uiLocale)}</p>
        <dl className={styles.recordBans}><div><dt>{teamName(data.match.teamA)}{uiText(" 禁用", uiLocale)}</dt><dd>{formatOwHeroName(selectedMap.banA) || uiText("尚未记录", uiLocale)}</dd></div><div><dt>{teamName(data.match.teamB)}{uiText(" 禁用", uiLocale)}</dt><dd>{formatOwHeroName(selectedMap.banB) || uiText("尚未记录", uiLocale)}</dd></div></dl>
        <p>{uiText("此处显示赛中地图记录。正式审核与积分结算以整场赛果为准。", uiLocale)}</p></>}
    </dialog>
  </>
}

export function RoomStageRail({ data, selectedStage, onStageSelect }) {
  const uiLocale = useUiLocale()
  const map = data.map
  const current = getRoomStageIndex(data)
  const labels = ROOM_STAGES
  const submissionUrl = systemPageUrl(data.result?.handoff?.path)
  const lineupSummary = side => (map?.[`lineup${side}`] || []).map(player => player.battleTag || player.name).join('、') || uiText("待确认", uiLocale)
  const view = selectedStage === null ? current : selectedStage
  const liveSummary = map && view >= 5 ? `${formatOwMapName(map.name) || uiText("地图待定", uiLocale)} · ${data.match.teamA.shortName || data.match.teamA.name} Ban ${formatOwHeroName(map.banA) || uiText("待定", uiLocale)} · ${data.match.teamB.shortName || data.match.teamB.name} Ban ${formatOwHeroName(map.banB) || uiText("待定", uiLocale)} · ${uiText("首发", uiLocale)} ${lineupSummary('A')} / ${lineupSummary('B')}` : ''
  const completedMaps = data.maps.filter(item => item.status === 'COMPLETE').map(item => `${item.order}. ${formatOwMapName(item.name) || uiText("地图待定", uiLocale)} ${item.scoreA ?? '—'}:${item.scoreB ?? '—'}`).join(' · ')
  const selectedSetup = data.opening?.setup || (map?.name ? { name: map.name, type: map.type, chooserSide: map.chooserSide, attackFirstSide: map.attackFirstSide, firstBanSide: map.firstBanSide, banA: map.banA, banB: map.banB } : null)
  const chooser = selectedSetup?.chooserSide === 'A' ? data.match.teamA : selectedSetup?.chooserSide === 'B' ? data.match.teamB : null
  const attackFirst = selectedSetup?.attackFirstSide === 'A' ? data.match.teamA : selectedSetup?.attackFirstSide === 'B' ? data.match.teamB : null
  const playedNames = new Set(data.maps.filter(item => item.status === 'COMPLETE').map(item => item.name))
  const mapTypes = data.opening?.typeCycle?.types || []
  const mapPool = data.opening?.rules?.maps || []
  const mapSelectionPage = view === 1 && view !== current ? <section className={styles.mapSelectionPage} data-room-slot="stage-record" aria-label={uiText("地图选择", uiLocale)}>
    <header><div><small>02 / MAP SELECTION</small><h2>{uiText("地图选择", uiLocale)}</h2></div><span>{uiText("只读查看本场选图记录", uiLocale)}</span></header>
    <div className={styles.mapSelectionFacts}><span><b>{uiText("选图方", uiLocale)}</b>{chooser?.shortName || chooser?.name || uiText("待定", uiLocale)}</span><span><b>{uiText("首攻方", uiLocale)}</b>{['Hybrid', 'Escort'].includes(selectedSetup?.type) ? attackFirst?.shortName || attackFirst?.name || uiText("待定", uiLocale) : uiText("无需选择攻防", uiLocale)}</span><span><b>{uiText("当前地图", uiLocale)}</b>{formatOwMapName(selectedSetup?.name) || uiText("待定", uiLocale)}</span></div>
    <div className={styles.mapTypeRail}>{mapTypes.map(item => <div key={item.type} data-used={item.used}><strong>{formatOwMapMode(item.type)}</strong><small>{item.used ? uiText("已使用", uiLocale) : item.remaining ? uiText("{0} 张可选", uiLocale, [item.remaining]) : uiText("无可用地图", uiLocale)}</small></div>)}</div>
    <div className={styles.mapPoolReadonly}>{mapPool.filter(item => playedNames.has(item.name) || item.name === selectedSetup?.name).map(item => <div key={item.name} data-played={playedNames.has(item.name)} data-selected={item.name === selectedSetup?.name} data-disabled={Boolean(item.reason)}><strong>{formatOwMapName(item.name)}</strong><span>{formatOwMapMode(item.type)}</span><small>{playedNames.has(item.name) ? uiText("已打过", uiLocale) : item.reason || item.name === selectedSetup?.name ? item.name === selectedSetup?.name ? uiText("本图已选择", uiLocale) : item.reason : uiText("可选", uiLocale)}</small></div>)}</div>
    <button type="button" onClick={() => onStageSelect(null)}>{uiText("返回当前步骤", uiLocale)}</button><p className={styles.mapSelectionNote}>{uiText("地图选择页面为只读记录；重新选择或更正需要由赛管通过更正流程处理。", uiLocale)}</p>
  </section> : null
  const readOnlySummary = view !== current ? view === 1 ? formatOwMapName(selectedSetup?.name) || uiText("地图尚未确定", uiLocale) : view === 6 ? completedMaps || uiText("本图结果尚未记录", uiLocale) : view === 7 ? submissionUrl ? uiText("战报提交入口已生成，请点击第 08 步打开。", uiLocale) : uiText("整场地图完成后，由赛管生成 System 战报提交入口。", uiLocale) : `${labels[view]} · ${formatOwMapName(map?.name) || uiText("当前地图", uiLocale)} · ${uiText("只读查看，当前操作仍在第 {0} 步", uiLocale, [String(current + 1).padStart(2, '0')])}` : null
  return <>
    <ol className={styles.stageRail} data-room-slot="stages" aria-label={uiText("本图比赛进度", uiLocale)}>{labels.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} data-done={index < current} data-selected={index === selectedStage}><button type="button" onClick={() => onStageSelect(index)} aria-label={uiText("查看第 {0} 步 {1}", uiLocale, [index + 1, label])}><span>{index < current ? '✓' : `0${index + 1}`}</span>{index === 7 && submissionUrl ? <span>{label} ↗</span> : uiText(label, uiLocale)}</button></li>)}</ol>
    {view !== current && liveSummary && <p className={styles.stageSummary} data-room-slot="stage-summary">{liveSummary}</p>}
    {mapSelectionPage}
    {readOnlySummary && !mapSelectionPage && <div className={`${styles.stageViewer} ${view === 1 ? styles.stageViewerMap : ''}`} role="status"><strong>{labels[view]} · {uiText("只读查看", uiLocale)}</strong><span>{readOnlySummary}{view === 7 && submissionUrl ? <> <a href={submissionUrl} target="_blank" rel="noopener noreferrer">{uiText("打开赛果提交", uiLocale)} ↗</a></> : null}</span><button type="button" onClick={() => onStageSelect(null)}>{uiText("返回当前步骤", uiLocale)}</button></div>}
  </>
}
