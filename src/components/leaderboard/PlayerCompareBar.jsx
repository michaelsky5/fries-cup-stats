import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function PlayerCompareBar({ selectedEntries, modeLabel, warning, onClear, onOpen }) {
  if (!selectedEntries.length) return null

  const role = selectedEntries[0]?.role

  return (
    <div className={styles.compareBar}>
      <div className={styles.compareBarMain}>
        <div className={styles.compareBarMeta}>
          <span>已选 {selectedEntries.length} / 4</span>
          <strong>{getRoleLabel(role)} / {getRoleEnLabel(role)}</strong>
          <em>{modeLabel}</em>
        </div>

        <div className={styles.compareChips}>
          {selectedEntries.map(entry => (
            <span key={entry.entryKey}>
              {entry.nickname || entry.display_name || entry.player_name}
              {!entry.eligible ? <b>样本不足</b> : null}
            </span>
          ))}
        </div>

        {warning ? <div className={styles.compareWarning}>{warning}</div> : null}
      </div>

      <div className={styles.compareActions}>
        <button type="button" onClick={onClear}>清空</button>
        <button type="button" className={styles.comparePrimary} onClick={onOpen}>开始比较</button>
      </div>
    </div>
  )
}
