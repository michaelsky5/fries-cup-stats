import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { getRosterRoleLabel } from '../../lib/rosterSelectors.js'
import { getDossierPlayerKey, getDossierPlayerName } from './teamDossierScenes.js'
import { getArchiveJourneyHref } from './teamArchiveContent.js'
import styles from './TeamGalleryScenes.module.css'

export default function TeamMemberRecordDrawer({ player, member, team, locale, journeyHref, withSeason, returnState, viewState, onLeave, onClose }) {
  const en = locale === 'en-US'
  const dialogRef = useRef(null)
  const appearances = new Map()
  for (const record of member?.records || []) {
    const id = record.match.match_id
    if (!appearances.has(id)) appearances.set(id, { record, maps: 0 })
    appearances.get(id).maps += 1
  }
  const rawMinutes = player.raw_time_mins ?? player.roleTimeMins
  const minutes = member?.maps && rawMinutes != null && Number.isFinite(Number(rawMinutes)) ? Math.round(Number(rawMinutes)) : null
  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    const opener = document.activeElement
    const originalPath = window.location.pathname
    const originalScroll = { top: window.scrollY, left: window.scrollX, behavior: 'instant' }
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (window.location.pathname === originalPath) {
        window.scrollTo(originalScroll)
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
      }
    }
  }, [])

  return createPortal(<dialog ref={dialogRef} className={styles.drawer} aria-labelledby="member-record-title" data-design="signal" data-member-record-drawer data-i18n-ignore onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.drawerSheet}>
      <header className={styles.drawerTools}><span>{team.shortName} / {en ? 'PLAYER RECORD' : uiText("成员出场记录", locale)}</span><button type="button" onClick={onClose}>{en ? 'Close' : uiText("关闭", locale)} <span aria-hidden="true">×</span></button></header>
      <div className={styles.drawerIdentity}><span>{getRosterRoleLabel(player.role, locale)}</span><h2 id="member-record-title">{getDossierPlayerName(player)}</h2><p>{player.identity?.secondary || player.battle_tag || ''}</p><Link to={withSeason(`/players/${encodeURIComponent(getDossierPlayerKey(player))}`)} state={returnState} onClick={onLeave}>{en ? 'Open player archive' : uiText("进入选手档案", locale)} ↗</Link></div>
      {member?.maps ? <>
        <dl className={styles.recordFacts}><div><dt>{en ? 'Recorded time' : uiText("已记录时长", locale)}</dt><dd>{minutes === null ? '—' : minutes.toLocaleString()}<small>{en ? ' min' : uiText(" 分钟", locale)}</small></dd></div>{member.stages.map(stage => <div key={stage.key}><dt>{stage.label}</dt><dd>{stage.maps}<small>{en ? ' maps' : uiText(" 图", locale)}</small></dd></div>)}</dl>
        <div className={styles.recordHeading}><h3>{en ? 'Every appearance' : uiText("每一次出场", locale)}</h3><span>{appearances.size} {en ? 'series' : uiText("场比赛", locale)} · {member.maps} {en ? 'maps' : uiText("图", locale)}</span></div>
        <ol className={styles.recordList}>{[...appearances].map(([id, { record, maps }], index) => <li key={id}><Link to={getArchiveJourneyHref(journeyHref, id, member.playerId)} state={viewState} onClick={onLeave}><time>{record.timeLabel.split(' ')[0]}<small>{index === 0 ? (en ? 'First appearance' : uiText("首次出场", locale)) : index === appearances.size - 1 ? (en ? 'Latest appearance' : uiText("最近出场", locale)) : record.roundLabel}</small></time><span><b>{record.opponentLabel}</b><small>{maps} {en ? 'maps played' : uiText("图出场", locale)}</small></span><strong>{record.scoreLabel}<small>{record.label}</small></strong><i aria-hidden="true">↗</i></Link></li>)}</ol>
      </> : <div className={styles.noRecord}><span>—</span><h3>{en ? 'Their name is here.' : uiText("名字已经在这里。", locale)}</h3><p>{en ? 'Registered this season. No identifiable appearances have been published yet.' : uiText("这位成员已在本赛季注册，暂未发布可核对的出场记录。", locale)}</p></div>}
    </div>
  </dialog>, document.body)
}
