import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import styles from './OpeningSelectionPanel.module.css'

export default function OpeningMethodControl({ opening, disabled, send }) {
  const uiLocale = useUiLocale()
  const method = opening.firstPick || { mode: 'RPS', modeLabel: '石头剪刀布', configuredMode: 'INHERIT', sourceLabel: '赛季默认' }
  const [mode, setMode] = useState(method.configuredMode), [reason, setReason] = useState('')
  const configureBlocked = opening.access.configureBlocked === '比赛操作开放后，赛管可调整本场方式。'
    ? pickUiLocale(uiLocale, '比赛操作开放后，赛管可调整本场方式。', 'Referees can adjust this method once match operations open.', '경기 조작이 열리면 심판이 이 방식을 조정할 수 있습니다.', '比賽操作開放後，賽管可調整本場方式。')
    : opening.access.configureBlocked === '公共故障处理中，恢复后才能调整本场方式。'
      ? pickUiLocale(uiLocale, '公共故障处理中，恢复后才能调整本场方式。', 'Resolve the public outage before adjusting this method.', '공통 장애가 복구된 후에 이 방식을 조정할 수 있습니다.', '公共故障處理中，恢復後才能調整本場方式。')
      : uiText(opening.access.configureBlocked || '', uiLocale)
  return <div className={styles.method}>
    <div><span>{uiText("首图选择权", uiLocale)}</span><strong>{method.modeLabel}</strong><small>{method.sourceLabel}</small></div>
    {opening.access.canConfigure ? <details><summary>{uiText("调整本场方式", uiLocale)}</summary><form onSubmit={async event => { event.preventDefault(); await send('CONFIGURE', { mode, reason: reason.trim() }) }}>
      <label>{uiText("本场采用", uiLocale)}<select value={mode} onChange={event => setMode(event.target.value)} disabled={disabled}><option value="INHERIT">{uiText("沿用赛季默认", uiLocale)}</option><option value="REAL_1V1">{uiText("实际游戏 1V1", uiLocale)}</option><option value="RPS">{uiText("石头剪刀布", uiLocale)}</option><option value="HIGH_SEED">{uiText("高种子优先", uiLocale)}</option><option value="MANUAL">{uiText("赛管指定 / 记录其他方式", uiLocale)}</option></select></label>
      <label>{uiText("调整原因 · 双方可见", uiLocale)}<input value={reason} onChange={event => setReason(event.target.value)} required minLength={2} maxLength={500} disabled={disabled} placeholder={uiText("例如：本轮按高种子顺位确定选择权", uiLocale)} /></label>
      <small>{uiText("首图流程开启后锁定，后续各图沿用败方选择与平局保留规则。", uiLocale)}</small>
      <button type="submit" className={styles.primary} disabled={disabled || reason.trim().length < 2}>{uiText("保存本场方式", uiLocale)}</button>
    </form></details> : <small>{configureBlocked || uiText(method.mode === 'RPS' ? '按本场规则进行石头剪刀布，队伍不能更改方式。' : '本场方式已锁定', uiLocale)}</small>}
  </div>
}
