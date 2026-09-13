import { translateUiText as uiText } from '../../lib/uiText.js'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

export default function PlayerCompareBar({ selectedEntries, modeLabel, warning, onClear, onOpen, locale = 'zh-CN' }) {
  if (!selectedEntries.length) return null

  const role = selectedEntries[0]?.role

  return (
    <div className={styles.compareBar}>
      <div className={styles.compareBarMain}>
        <div className={styles.compareBarMeta}>
          <span>{uiText("已选 ", locale)}{selectedEntries.length} / 4</span>
          <strong>{locale === 'en-US' ? getRoleEnLabel(role) : uiText(getRoleLabel(role), locale)}</strong>
          <em>{modeLabel}</em>
        </div>

        <div className={styles.compareChips}>
          {selectedEntries.map(entry => (
            <span key={entry.entryKey}>
              {entry.nickname || entry.display_name || entry.player_name}
              {!entry.eligible ? <b>{uiText("样本不足", locale)}</b> : null}
            </span>
          ))}
        </div>

        {warning ? <div className={styles.compareWarning}>{warning}</div> : null}
      </div>

      <div className={styles.compareActions}>
        <button type="button" onClick={onClear}>{uiText("清空", locale)}</button>
        <button type="button" className={styles.comparePrimary} onClick={onOpen}>{uiText("开始比较", locale)}</button>
      </div>
    </div>
  )
}
