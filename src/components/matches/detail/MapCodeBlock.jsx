import { useEffect, useState } from 'react'
import styles from './MatchDetail.module.css'

export default function MapCodeBlock({ code, t }) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 1800)
    return () => window.clearTimeout(timer)
  }, [message])

  async function handleCopy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setMessage(t('matchDetail.codeCopied', 'Match code copied'))
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textArea)
      setMessage(copied
        ? t('matchDetail.codeCopied', 'Match code copied')
        : t('matchDetail.codeCopyFailed', 'Copy failed. Please copy it manually.'))
    }
  }

  return (
    <div>
      <div className={styles.codeBlock}>
        <span className={styles.codeValue}>{code || t('matchDetail.noCode', 'No match code yet')}</span>
        {code ? (
          <button
            type="button"
            className={styles.codeButton}
            onClick={handleCopy}
            aria-label={`${t('matchDetail.copyCode', 'Copy Code')} ${code}`}
          >
            {t('matchDetail.copyCode', 'Copy Code')}
          </button>
        ) : null}
      </div>
      {message ? <div className={styles.toast} role="status">{message}</div> : null}
    </div>
  )
}
