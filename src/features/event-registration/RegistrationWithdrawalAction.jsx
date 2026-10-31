import { useId, useLayoutEffect, useRef, useState } from 'react'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './SeasonParticipationPage.module.css'

function WithdrawalConfirmation({ record, onCancel, onConfirm }) {
  const locale = useUiLocale()
  const dialogRef = useRef(null)
  const titleId = useId(), descriptionId = useId()
  useLayoutEffect(() => {
    const dialog = dialogRef.current, returnFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={dialogRef} className={styles.guardDialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id={titleId}>{uiText('撤回这份报名？', locale)}</h2>
    <div id={descriptionId}><p><strong>{record.name}</strong></p><p>{uiText('待确认的邀请将失效，报名记录和已填写资料保留。撤回后，你可以创建新的报名或接任其他队伍。', locale)}</p><p>{uiText('本操作不会删除长期队伍，也不会退出你已加入的其他队伍。', locale)}</p></div>
    <footer><button autoFocus type="button" onClick={onCancel}>{uiText('保留报名', locale)}</button><button type="button" onClick={onConfirm}>{uiText('确认撤回报名', locale)}</button></footer>
  </dialog>
}

export default function RegistrationWithdrawalAction({ record, owner, seasonStatus, busy, perform }) {
  const locale = useUiLocale()
  const [confirming, setConfirming] = useState(false)
  if (!owner || seasonStatus === 'ARCHIVED' || !['DRAFT', 'RETURNED'].includes(record.status)) return null
  // Withdrawal remains available after the submission deadline, as in the existing API.
  // Approved teams must continue through the separate, protected withdrawal process.
  return <div className={styles.withdrawalAction}>
    <button type="button" disabled={busy} onClick={() => setConfirming(true)}>{uiText('撤回这份报名', locale)}</button>
    <p>{uiText('不再使用这份草稿？撤回后保留记录，并释放本赛季的负责人名额。', locale)}</p>
    {confirming && <WithdrawalConfirmation record={record} onCancel={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false)
      perform(`/drafts/${record.id}/withdraw`, { revision: record.revision })
    }} />}
  </div>
}
