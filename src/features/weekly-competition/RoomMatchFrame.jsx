import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatOwHeroName, formatOwMapMode, formatOwMapName, getOwMap } from '../../lib/heroes.js'
import { getMapImage, getTeamLogoCandidates } from '../../lib/reviewAssets.js'
import styles from './RoomMatchFrame.module.css'

const teamName = team => team?.shortName || team?.name || '队伍待定'
const numericScore = value => typeof value === 'number' && Number.isFinite(value)
const isDraw = map => map.status === 'COMPLETE' && numericScore(map.scoreA) && numericScore(map.scoreB) && map.scoreA === map.scoreB

function RoomCrest({ team, seasonId }) {
  const uiLocale = useUiLocale()
  const candidates = getTeamLogoCandidates({ ...team, short: team?.shortName }, seasonId).filter(src => !/\/fc_logo\.png(?:$|\?)/.test(src))
  const [index, setIndex] = useState(0)
  const key = candidates.join('|')
  useEffect(() => setIndex(0), [key])
  return <span className={styles.crest}>{candidates[index] ? <img src={candidates[index]} alt={uiText("{0} 队徽", uiLocale, [teamName(team)])} onError={() => setIndex(value => value + 1)} /> : <b aria-label={uiText("{0} 暂无队徽", uiLocale, [teamName(team)])}>{teamName(team).slice(0,4)}</b>}</span>
}

export function RoomMatchHeader({ data, phaseLabel, returnPath, busy, error, refresh, accountControl }) {
  const uiLocale = useUiLocale()
  const completed = data.maps.filter(map => map.status === 'COMPLETE')
  const official = data.result?.official
  const score = official ? data.result : completed.length ? data.series : null
  const hasScore = score && numericScore(score.scoreA) && numericScore(score.scoreB)
  const forfeit = data.forfeit?.record
  const source = forfeit ? `已打 ${forfeit.completedMaps}/5 图 · ${forfeit.completedMaps ? '保留实际比分' : '尚无实际比分'}` : official ? data.result.phase === 'SETTLED' ? '正式赛果 · 已结算' : '已审核比分' : completed.length ? '赛中记录 · 待审核' : '比赛尚未产生比分'
  if (forfeit) phaseLabel = forfeit.status === 'PENDING_REVIEW' ? '弃权待复核' : `${teamName(forfeit.forfeitedSide === 'A' ? data.match.teamA : data.match.teamB)} 弃权 · ${teamName(forfeit.winnerSide === 'A' ? data.match.teamA : data.match.teamB)} 获判胜`
  return <>
    <header className={styles.masthead}>
      <Link to={returnPath} className={styles.brand}><img src="/logos/fries-cup-symbol.png" alt="" /><span><b>FRIES CUP</b><small>{uiText("赛事中心 / 比赛房", uiLocale)}</small></span></Link>
      <div className={styles.event}><strong>{data.match.seasonName}</strong><span>{data.match.weekLabel}</span><span>{data.match.format === 'RR5' ? uiText("RR5 · 固定五局", uiLocale) : data.match.format || uiText("赛制待确认", uiLocale)}</span><span>{data.match.scheduledAt ? new Date(data.match.scheduledAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : uiText("比赛时间待定", uiLocale)}</span></div>
      <div className={styles.tools}><button type="button" disabled={busy} onClick={() => refresh({ force: true })}><span aria-hidden="true">↻</span>{uiText(" 重新同步", uiLocale)}</button>{accountControl}</div>
    </header>
    <section className={styles.scoreboard} aria-label={uiText("本场对阵与比分", uiLocale)}>
      {[data.match.teamA, data.match.teamB].map((team, index) => <div key={team?.id || index} className={styles.teamIdentity} data-side={index === 0 ? 'A' : 'B'}>
        <RoomCrest team={team} seasonId={data.match.seasonId} />
        <div><small>TEAM {index === 0 ? 'A' : 'B'}{data.access.teamIds.includes(team?.id) ? uiText(" / 本队", uiLocale) : ''}</small><h2>{teamName(team)}</h2></div>
      </div>)}
      <div className={styles.scoreCore}><div className={styles.scoreValue} aria-label={hasScore ? uiText("{0} {1} 比 {2} {3}", uiLocale, [teamName(data.match.teamA), score.scoreA, score.scoreB, teamName(data.match.teamB)]) : uiText("比分尚未产生", uiLocale)}>{hasScore ? <><b>{score.scoreA}</b><span>:</span><b>{score.scoreB}</b></> : <b className={styles.vs}>VS</b>}</div><strong className={styles.phase} data-phase={data.phase}>{phaseLabel}</strong><small>{source}</small></div>
    </section>
    <div className={styles.matchFacts}><div><span>{uiText("游戏房间", uiLocale)}<b>{data.preparation.brief?.roomName || uiText("等待赛管发布", uiLocale)}</b></span><span>{uiText("口令", uiLocale)}<b className={styles.mono}>{data.preparation.brief?.roomCode || uiText("未设置", uiLocale)}</b></span><span>{uiText("本场赛管", uiLocale)}<b>{data.staff.map(item => item.name).join(' / ') || uiText("等待指派", uiLocale)}</b></span></div><span className={styles.sync} data-error={!!error}>{error ? uiText("同步中断 · 上次记录", uiLocale) : data.syncedAt ? uiText("最近同步 {0}", uiLocale, [new Date(data.syncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })]) : uiText("同步时间待确认", uiLocale)}</span></div>
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
    <section className={styles.series} aria-label={uiText("整场地图进程", uiLocale)}>
      <div className={styles.seriesLabel}><strong>{data.match.format === 'RR5' ? uiText("本场五局", uiLocale) : uiText("整场地图", uiLocale)}</strong><small>{completed.length}{data.match.format === 'RR5' ? ' / 5' : ''}{uiText(" 已完成", uiLocale)}{drawCount ? uiText(" · {0} 平", uiLocale, [drawCount]) : ''}</small></div>
      <ol className={styles.mapRail} style={{ '--map-count': count }}>
        {Array.from({ length: count }, (_, index) => {
          const map = data.maps.find(item => item.order === index + 1)
          const current = map?.order === data.map?.order
          const label = map?.status === 'COMPLETE' ? `${map.scoreA ?? '—'} : ${map.scoreB ?? '—'}${isDraw(map) ? ' · 平局' : ''}` : data.forfeit?.record ? data.forfeit.record.status === 'APPROVED' ? map?.status === 'LIVE' ? '因弃权未完成' : '因弃权未进行' : '弃权记录待复核' : current ? phaseLabel : '尚未开始'
          const content = <><span>{String(index + 1).padStart(2, '0')}</span><b>{formatOwMapName(map?.name) || (current ? uiText("等待选图", uiLocale) : uiText("地图待定", uiLocale))}</b><small>{label}</small></>
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

export function RoomStageRail({ data }) {
  const uiLocale = useUiLocale()
  const current = data.result || data.phase === 'ARCHIVED' ? 3 : data.phase === 'REVIEW' ? 2 : ['LIVE', 'PAUSED'].includes(data.phase) ? 1 : 0
  return <ol className={styles.stageRail} aria-label={uiText("本图比赛进度", uiLocale)}>{['准备确认', data.phase === 'PAUSED' ? '比赛暂停' : '比赛进行', '本图结果', '赛果交接'].map((label, index) => <li key={index} aria-current={index === current ? 'step' : undefined} data-done={index < current}><span>{index < current ? '✓' : `0${index + 1}`}</span>{label}</li>)}</ol>
}
