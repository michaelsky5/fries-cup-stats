import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useId, useRef } from 'react'
import styles from './KprLeaderboard.module.css'

export default function KprDialog({ open, onClose, title, children, compact = false, locale = 'zh-CN', className = '' }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    if (!open) {
      if (dialog.open) dialog.close()
      return undefined
    }
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [open])
  return <dialog ref={dialogRef} className={`${styles.dialog} ${compact ? styles.compactDialog : ''} ${className}`} aria-labelledby={titleId} onClose={onClose}>
    <header className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label={locale === 'en-US' ? 'Close dialog' : uiText("关闭对话框", locale)}>×</button></header>
    {open ? children : null}
  </dialog>
}
