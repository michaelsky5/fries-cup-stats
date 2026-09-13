import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useId, useLayoutEffect, useRef } from 'react'
import styles from '../account-ui/SignalWeeklyTeam.module.css'

export default function WeeklyParticipationChangeDialog({ team, week, status, busy, onConfirm, onCancel }) {
  const uiLocale = useUiLocale()
  const ref = useRef(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className={styles.changeDialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
    <h2 id={titleId}>{status === 'WITHDRAWN' ? uiText("撤回本周参赛确认？", uiLocale) : uiText("确认本周不参赛？", uiLocale)}</h2>
    <strong>{team} · {week}</strong>
    <p>{uiText("保存后，本周名单将停止接受队伍修改。已保存记录仍然保留；确认窗口开放时，可以重新确认参赛。", uiLocale)}</p>
    <div className={styles.actionRow}><button type="button" autoFocus onClick={onCancel} disabled={busy} className={styles.secondaryButton}>{uiText("返回核对", uiLocale)}</button><button type="button" className={styles.dangerButton} disabled={busy} onClick={onConfirm}>{busy ? uiText("正在保存…", uiLocale) : status === 'WITHDRAWN' ? uiText("确认撤回参赛", uiLocale) : uiText("确认不参赛", uiLocale)}</button></div>
  </dialog>
}
