import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useLayoutEffect, useId, useRef } from 'react'
import styles from './WeeklyMatchRoomsWorkspace.module.css'

export default function WeeklyMatchResponseDialog({ pending, busy, onConfirm, onCancel }) {
  const uiLocale = useUiLocale()
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const isDispute = pending.input.status === 'DISPUTED'

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const returnFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
      <span className={styles.eyebrow}>{isDispute ? 'FREEZE RESULT SETTLEMENT' : 'CONFIRM OFFICIAL RESULT'}</span>
      <h2 id={titleId}>{isDispute ? uiText("代表 {0} 提出争议？", uiLocale, [pending.teamName]) : uiText("{0}确认 {1} 的赛果？", uiLocale, [pending.withdrawingDispute ? '撤回争议并' : '', pending.teamName])}</h2>
      <p id={descriptionId}>{isDispute
        ? uiText("争议会进入周赛管理员的收件箱，并冻结标准积分结算。这里不会直接改动正式比分。", uiLocale)
        : uiText("此操作表示本队接受当前已审核赛果，会记录账号与修订。积分仍由管理员按规则结算。", uiLocale)}</p>
      <div className={styles.dialogResult}><strong>{pending.matchup}</strong><span>{uiText("正式比分 ", uiLocale)}{pending.score} · REV {pending.input.expectedRevision}</span></div>
      {pending.input.note ? <p className={styles.dialogNote}>{pending.input.note}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy} autoFocus>{uiText("返回核对", uiLocale)}</button>
        <button type="button" className={isDispute ? styles.dangerButton : styles.primaryButton} onClick={onConfirm} disabled={busy}>{busy ? uiText("正在提交…", uiLocale) : isDispute ? uiText("确认提交争议", uiLocale) : uiText("确认提交赛果响应", uiLocale)}</button>
      </div>
    </dialog>
  )
}
