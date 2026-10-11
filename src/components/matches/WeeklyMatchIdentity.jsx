import { useState } from 'react'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { getMatchDisplayCode, getWeeklyMatchIdentityLabel } from '../../lib/weeklyMatchIdentity.js'
import styles from './WeeklyMatchIdentity.module.css'

export default function WeeklyMatchIdentity({ match, locale = 'zh-CN', copyable = false, showContext = true }) {
  const [copiedCode, setCopiedCode] = useState('')
  const [failedCode, setFailedCode] = useState('')
  const label = getWeeklyMatchIdentityLabel(match, locale)
  const code = getMatchDisplayCode(match)
  const en = String(locale).startsWith('en')
  if (!label) return null
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopiedCode(code); setFailedCode('') }
    catch { setFailedCode(code); setCopiedCode('') }
  }
  return <div className={styles.root} data-weekly-match-identity>
    {showContext ? <span className={styles.context}>{label}</span> : null}
    {code ? <div className={styles.codeRow}><code>{code}</code>{copyable ? <button type="button" onClick={copy} aria-label={en ? `Copy match number ${code}` : uiText('复制比赛编号 {0}', locale, [code])}>{copiedCode === code ? en ? 'Copied' : uiText('已复制', locale) : en ? 'Copy number' : uiText('复制编号', locale)}</button> : null}</div> : null}
    {copyable && code ? <span className={styles.feedback} role="status">{failedCode === code ? en ? 'Select the number to copy it.' : uiText('请选中编号手动复制', locale) : copiedCode === code ? en ? 'Match number copied.' : uiText('比赛编号已复制', locale) : ''}</span> : null}
  </div>
}
