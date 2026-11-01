import { useEffect, useRef } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { openingStartText, openingStartTime, openingStartReason, isOpeningStartRequestCurrent } from './openingStartPolicy.js'
import workspace from './WeeklyRoomWorkspace.module.css'
import surfaces from './RoomSurfaces.module.css'
import styles from './OpeningStartControl.module.css'

export function OpeningStartReadiness({ data, disabled, confirmReady, send, onRosterOpen, onSupport }) {
  const locale = useUiLocale(), consent = data.opening.startConsent
  if (!consent || data.opening.phase !== 'NOT_STARTED') return null
  const own = consent.sides.find(side => side.canConfirm)
  const name = teamId => [data.match.teamA, data.match.teamB].find(team => team.id === teamId)?.shortName || [data.match.teamA, data.match.teamB].find(team => team.id === teamId)?.name
  const text = (key, values) => openingStartText(locale, key, values)
  return <div className={styles.readiness} data-room-start-readiness>
    <div className={styles.status} aria-live="polite">{consent.sides.map(side => <span key={side.teamId}><strong>{name(side.teamId)}</strong><span>{text('arrived', [side.presentCount])}</span><span>{text(side.confirmed ? 'confirmed' : 'pending')}</span></span>)}</div>
    <div className={styles.controls}>
      {own && <button type="button" disabled={disabled || !own.confirmed && !own.rosterReady} onClick={() => own.confirmed ? send('SET_START_READY', { teamId: own.teamId, ready: false, startContext: own.context }) : confirmReady(own)}>{text(own.confirmed ? 'withdraw' : 'ready')}</button>}
      {own && own.presentCount < 5 && onRosterOpen && <button type="button" disabled={disabled} onClick={() => onRosterOpen(own.teamId)}>{text('roster')}</button>}
      {['ARRIVAL_OVERDUE', 'ROSTER_PENDING', 'SCHEDULE_PENDING'].includes(consent.reason) && onSupport && <button type="button" onClick={onSupport}>{text('support')}</button>}
    </div>
    <p>{text(openingStartReason(consent), [openingStartTime(consent.unilateralAt, locale)])}</p>
  </div>
}

export function OpeningStartDialog({ data, request, disabled, failed, close, confirm }) {
  const ref = useRef(null), locale = useUiLocale()
  useEffect(() => {
    const dialog = ref.current
    if (request && !dialog.open) dialog.showModal()
    else if (!request && dialog.open) dialog.close()
  }, [request])
  const text = (key, values) => openingStartText(locale, key, values)
  const preparing = request?.action === 'SET_START_READY'
  const valid = isOpeningStartRequestCurrent(data, request)
  return <dialog ref={ref} className={`${workspace.panelDialog} ${surfaces.paper} ${styles.dialog}`} data-room-start-dialog aria-label={text(preparing ? 'ready' : 'beginTitle')} onCancel={event => { event.preventDefault(); if (!disabled) close() }}>
    <header><h2>{text(preparing ? 'ready' : 'beginTitle')}</h2></header>
    {request && <div className={`${workspace.panelBody} ${styles.body}`}>
      <dl><div><dt>{text('scheduled')}</dt><dd>{openingStartTime(data.match.scheduledAt, locale)}</dd></div><div><dt>{text('due')}</dt><dd>{openingStartTime(data.opening.startConsent?.unilateralAt, locale)}</dd></div></dl>
      <p>{text(preparing ? 'readyBody' : 'beginBody', [data.phaseClock?.limits?.FIRST_MAP || 120])}</p>
      {!valid && <p role="alert">{text('changed')}</p>}{failed && <p role="alert">{text('failed')}</p>}
      <div className={styles.actions}><button type="button" disabled={disabled} onClick={close} autoFocus>{text('cancel')}</button><button type="button" className={styles.primary} disabled={disabled || !valid} onClick={confirm}>{text(preparing ? 'ready' : 'confirm')}</button></div>
    </div>}
  </dialog>
}
