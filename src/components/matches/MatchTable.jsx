import styles from './MapStatsTable.module.css'

function formatNum(num) {
  if (num === null || num === undefined || num === '') return '-'
  return Number(num).toLocaleString()
}

function display(val) {
  return val === null || val === undefined || val === '' ? '-' : val
}

// 🌟 修复核心：补齐标准数据名 DAMAGE 和 SUPPORT，确保排版顺序不会乱
const ROLE_ORDER = {
  TANK: 1,
  DAMAGE: 2, 
  DPS: 2,
  SUPPORT: 3,
  SUP: 3,
  FLEX: 4
}

function getRoleRank(role) {
  if (!role) return 99
  const upperRole = String(role).toUpperCase()
  return ROLE_ORDER[upperRole] || 99
}

function getRoleClass(role) {
  if (!role) return 'damage'
  const r = String(role).toUpperCase().trim()
  if (r === 'TANK') return 'tank'
  if (r === 'SUP' || r === 'SUPPORT') return 'support' // 兼容 SUPPORT
  if (r === 'DPS' || r === 'DAMAGE') return 'damage'   // 兼容 DAMAGE
  return 'damage'
}

function formatRoleText(role) {
  if (!role) return '-'
  const r = String(role).toUpperCase().trim()
  if (r === 'TANK') return '坦克'
  if (r === 'SUP' || r === 'SUPPORT') return '辅助'
  if (r === 'DAMAGE' || r === 'DPS') return '输出'
  return role
}

function HeadLabel({ cn, en, align = 'right' }) {
  const cls = [styles.headCellInner, align === 'left' ? styles.alignLeft : '', align === 'center' ? styles.alignCenter : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={cls}>
      <span className={styles.headCn}>{cn}</span>
      <span className={styles.headEn}>{en}</span>
    </span>
  )
}

export default function MapStatsTable({ title, rows = [], winner = false }) {
  // 按照 TANK -> DAMAGE -> SUPPORT 的顺序列出选手
  const sortedRows = [...rows].sort((a, b) => getRoleRank(a.role) - getRoleRank(b.role))

  return (
    <div className={styles.shell}>
      <div className={`${styles.titleBar} ${winner ? styles.titleWinner : ''}`}>
        <div className={styles.titleGroup}>
          <span className={styles.teamName}>{title}</span>
          <span className={styles.teamSub}>MAP PLAYER STATS</span>
        </div>
        {winner ? (
          <span className={styles.winnerBadge}>
            <span className={styles.winnerCn}>胜方</span>
            <span className={styles.winnerEn}>WINNER</span>
          </span>
        ) : null}
      </div>

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <HeadLabel cn="选手" en="PLAYER" align="left" />
              </th>
              <th>
                <HeadLabel cn="使用英雄" en="HEROES" align="left" />
              </th>
              <th className={styles.alignCenter}>
                <HeadLabel cn="位置" en="ROLE" align="center" />
              </th>
              <th className={styles.combatHead}>
                <HeadLabel cn="击杀" en="ELIM" />
              </th>
              <th className={styles.combatHead}>
                <HeadLabel cn="助攻" en="AST" />
              </th>
              <th className={styles.combatHead}>
                <HeadLabel cn="死亡" en="DTH" />
              </th>
              <th className={styles.dmgHead}>
                <HeadLabel cn="伤害" en="DMG" />
              </th>
              <th className={styles.healHead}>
                <HeadLabel cn="治疗" en="HEAL" />
              </th>
              <th className={styles.mitHead}>
                <HeadLabel cn="阻挡" en="MIT" />
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row, i) => (
                <tr key={row.player_id || i}>
                  <td className={styles.player}>{display(row.player_name)}</td>
                  <td className={styles.heroCell}>{display(row.heroes_played)}</td>
                  <td className={styles.alignCenter}>
                    <span className={`${styles.roleTag} ${styles[getRoleClass(row.role)] || ''}`}>
                      {formatRoleText(row.role)}
                    </span>
                  </td>

                  <td className={`${styles.dataCell} ${styles.cellCombat}`}>{display(row.eliminations)}</td>
                  <td className={`${styles.dataCell} ${styles.cellCombat}`}>{display(row.assists)}</td>
                  <td className={`${styles.dataCell} ${styles.cellCombat} ${styles.cellCombatDeath}`}>{display(row.deaths)}</td>

                  <td className={`${styles.dataCellStrong} ${styles.cellDmg}`}>{formatNum(row.damage)}</td>
                  <td className={`${styles.dataCellStrong} ${styles.cellHeal}`}>{formatNum(row.healing)}</td>
                  <td className={`${styles.dataCellStrong} ${styles.cellMit}`}>{formatNum(row.mitigation)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className={styles.empty}>
                  <span className={styles.emptyCn}>暂无选手对局数据</span>
                  <span className={styles.emptyEn}>NO PLAYER STATS</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}