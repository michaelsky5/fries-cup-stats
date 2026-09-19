import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import styles from './OpeningSelectionPanel.module.css'

export default function OpeningMethodControl({ opening, disabled, send }) {
  const uiLocale = useUiLocale()
  const method = opening.firstPick || { mode: 'REAL_1V1', modeLabel: '实际游戏 1V1', configuredMode: 'INHERIT', sourceLabel: '赛季默认' }
  const [mode, setMode] = useState(method.configuredMode), [reason, setReason] = useState('')
  return <div className={styles.method}>
    <div><span>{uiText("首图选择权", uiLocale)}</span><strong>{method.modeLabel}</strong><small>{method.sourceLabel}</small></div>
    {opening.access.canConfigure ? <details><summary>{uiText("调整本场方式", uiLocale)}</summary><form onSubmit={async event => { event.preventDefault(); await send('CONFIGURE', { mode, reason: reason.trim() }) }}>
      <label>{uiText("本场采用", uiLocale)}<select value={mode} onChange={event => setMode(event.target.value)} disabled={disabled}><option value="INHERIT">{uiText("沿用赛季默认", uiLocale)}</option><option value="REAL_1V1">{uiText("实际游戏 1V1", uiLocale)}</option><option value="RPS">{uiText("石头剪刀布（旧流程）", uiLocale)}</option><option value="HIGH_SEED">{uiText("高种子优先", uiLocale)}</option><option value="MANUAL">{uiText("赛管指定 / 记录其他方式", uiLocale)}</option></select></label>
      <label>{uiText("调整原因 · 双方可见", uiLocale)}<input value={reason} onChange={event => setReason(event.target.value)} required minLength={2} maxLength={500} disabled={disabled} placeholder={uiText("例如：本轮按高种子顺位确定选择权", uiLocale)} /></label>
      <small>{uiText("首图流程开启后锁定，后续各图沿用败方选择与平局保留规则。", uiLocale)}</small>
      <button type="submit" className={styles.primary} disabled={disabled || reason.trim().length < 2}>{uiText("保存本场方式", uiLocale)}</button>
    </form></details> : <small>{opening.phase === 'NOT_STARTED' ? uiText("等待赛管确认", uiLocale) : uiText("本场方式已锁定", uiLocale)}</small>}
  </div>
}
