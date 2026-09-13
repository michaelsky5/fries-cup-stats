import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SignalBattleTag } from './SignalPlayerData.jsx'
import useCompactMatchLayout from './useCompactMatchLayout.js'
import styles from './SignalMatchResources.module.css'

const STAFF_ROLES = {
  CASTER: ['解说', 'Casters'], REFEREE: ['赛管', 'Officials'],
  VOICE_REFEREE: ['语音裁判', 'Voice referees'], DIRECTOR: ['导播', 'Director'], OB: ['OB', 'Observers']
}

function MapReplayCode({ map, en, onSelectMap }) {
  const uiLocale = useUiLocale()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const hasCode = Boolean(map.lobbyCode && !['—', '-'].includes(map.lobbyCode))
  const rulingOnly = map.raw?.is_administrative === true && !map.hasStats
  const copy = async () => {
    try { await navigator.clipboard.writeText(map.lobbyCode); setCopied(true); setFailed(false) }
    catch { setFailed(true) }
  }
  return <li className={styles.mapCode}>
    <button type="button" className={styles.mapLink} onClick={() => onSelectMap(map.order)} aria-label={en ? `Review map ${map.order}: ${map.name}` : uiText("查看第 {0} 图{1}战报", uiLocale, [map.order, map.name])}><span>{map.orderLabel}</span><strong>{map.name}</strong></button>
    {hasCode ? <><code>{map.lobbyCode}</code><button type="button" className={styles.copy} onClick={copy} aria-label={en ? `Copy ${map.name} replay code` : uiText("复制{0}回放代码", uiLocale, [map.name])}>{copied ? (en ? 'Copied' : uiText("已复制", uiLocale)) : (en ? 'Copy' : uiText("复制", uiLocale))}</button></> : <span className={styles.noCode}>{rulingOnly ? (en ? 'Ruling · no replay' : uiText("裁决图 · 无回放", uiLocale)) : (en ? 'Not published' : uiText("未发布", uiLocale))}</span>}
    <span className={failed ? styles.copyError : styles.announcement} role="status">{failed ? (en ? 'Select code to copy' : uiText("可选中代码复制", uiLocale)) : copied ? `${map.name} ${en ? 'code copied' : uiText("代码已复制", uiLocale)}` : ''}</span>
  </li>
}

function destination(url) {
  try { const host = new URL(url).hostname; return host.endsWith('bilibili.com') ? 'BILIBILI' : host.replace(/^www\./, '') }
  catch { return '' }
}

export default function SignalMatchResources({ dossier, roomPath, en, onSelectMap }) {
  const uiLocale = useUiLocale()
  const compact = useCompactMatchLayout()
  const [staffExpanded, setStaffExpanded] = useState(null)
  const staffOpen = staffExpanded ?? !compact
  const links = dossier.broadcast?.streamLinks || []
  const groups = dossier.broadcast?.staffGroups || []
  const staffCount = groups.reduce((total, group) => total + group.people.length, 0)
  const primary = links.find(link => link.kind === 'replay') || links[0]
  const label = link => link.kind === 'archive' ? (en ? 'Tournament video archive' : uiText("赛事录像库", uiLocale)) : link.kind === 'replay' ? (en ? 'Watch this match' : uiText("观看本场录像", uiLocale)) : (en ? 'Watch live' : uiText("观看直播", uiLocale))
  return <section className={styles.resources} id="match-resources" data-match-section="resources" aria-labelledby="match-resources-title">
    <header className={styles.heading}><span>REPLAY & MATCH INFO</span><h2 id="match-resources-title">{en ? 'Video & match information' : uiText("录像与赛事信息", uiLocale)}</h2></header>
    <div className={styles.grid}>
      <div className={styles.replay}>
        {primary ? <a className={styles.video} href={primary.url} target="_blank" rel="noreferrer" data-video-kind={primary.kind || 'live'}>
          <span className={styles.videoMeta}><span>{primary.kind === 'archive' ? 'VIDEO ARCHIVE' : primary.kind === 'replay' ? 'MATCH REPLAY' : 'LIVE BROADCAST'}</span><span>{destination(primary.url)}</span></span>
          <strong>{label(primary)}<span aria-hidden="true">↗</span></strong>
          <span className={styles.matchCaption}>{dossier.teamA.short}<i>vs</i>{dossier.teamB.short}<small>{dossier.scheduleLabel}</small></span>
        </a> : <div className={styles.videoEmpty}><span>{en ? 'REPLAY' : uiText("比赛录像", uiLocale)}</span><strong>{en ? 'Video not published' : uiText("录像尚未发布", uiLocale)}</strong></div>}
        {links.length > 1 ? <div className={styles.extraLinks}>{links.filter(link => link !== primary).map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label || label(link)} ↗</a>)}</div> : null}
        {dossier.mapRecords.length ? <div className={styles.codes}><header><h3>{en ? 'Map replay codes' : uiText("地图回放代码", uiLocale)}</h3><span>{String(dossier.mapRecords.length).padStart(2, '0')} {en ? 'MAPS' : uiText("张地图", uiLocale)}</span></header><ol>{dossier.mapRecords.map(map => <MapReplayCode key={map.key} map={map} en={en} onSelectMap={onSelectMap} />)}</ol></div> : null}
      </div>
      <aside className={styles.info} aria-label={en ? 'Match staff and room' : uiText("比赛人员与房间", uiLocale)}>
        <details className={styles.staff} open={staffOpen} data-match-staff>
        <summary onClick={event => { event.preventDefault(); setStaffExpanded(!staffOpen) }}><h3>{en ? 'Match staff' : uiText("比赛人员", uiLocale)}</h3>{staffCount > 0 ? <span className={styles.staffCount}>{staffCount} {en ? 'people' : uiText("人", uiLocale)}</span> : null}<span className={styles.staffToggle} aria-hidden="true">{staffOpen ? '−' : '＋'}</span></summary>
        {groups.length ? <dl className={styles.crew}>{groups.map(group => <div key={group.role}><dt>{STAFF_ROLES[group.role]?.[en ? 1 : 0] || group.role}</dt><dd>{group.people.map(person => <div className={styles.person} key={`${person.name}:${person.battleTag}`}><strong>{person.name}</strong>{person.battleTag && person.battleTag !== person.name ? <small><SignalBattleTag value={person.battleTag} en={en} /></small> : null}</div>)}</dd></div>)}</dl> : <p className={styles.staffEmpty}>{en ? 'Staff not published' : uiText("人员尚未发布", uiLocale)}</p>}
        </details>
        <Link className={styles.room} to={roomPath}><span>{en ? 'PARTICIPANTS' : uiText("参赛入口", uiLocale)}</span><strong>{en ? 'Match room' : uiText("比赛房间", uiLocale)}<span aria-hidden="true">↗</span></strong></Link>
      </aside>
    </div>
  </section>
}
