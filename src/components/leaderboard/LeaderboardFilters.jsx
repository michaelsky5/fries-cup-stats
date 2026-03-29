import styles from './LeaderboardFilters.module.css'

function normalizeOption(option) {
  if (typeof option === 'string') return { value: option, label: option }
  if (option && typeof option === 'object') return {
    value: option.value ?? option.id ?? option.team_id ?? '',
    label: option.label ?? option.name ?? option.team_name ?? option.team_id ?? ''
  }
  return { value: '', label: '' }
}

function DualLabel({ cn, en }) {
  return (
    <span className={styles.labelText}>
      <span className={styles.labelCn}>{cn}</span>
      <span className={styles.labelEn}>{en}</span>
    </span>
  )
}

export default function LeaderboardFilters({ filters, onChange, teamOptions = [] }) {
  const update = patch => onChange(prev => ({ ...prev, ...patch }))

  const normalizedTeams = teamOptions
    .map(normalizeOption)
    .filter(item => item.value !== '' || item.label !== '')

  const roleOptions = [
    { value: 'ALL', label: '全部位置 / ALL ROLES' },
    { value: 'TANK', label: '重装 / TANK' },
    { value: 'DPS', label: '输出 / DPS' },
    { value: 'SUP', label: '支援 / SUPPORT' },
    { value: 'FLEX', label: '自由位 / FLEX' }
  ]

  return (
    <section className={styles.shell}>
      <div className={styles.topLine}>
        <div className={styles.panelTitleGroup}>
          <div className={styles.panelTitle}>筛选条件</div>
          <div className={styles.panelSubTitle}>FILTERS</div>
        </div>
        <div className={styles.panelMeta}>LEADERBOARD CONTROL PANEL</div>
      </div>

      <div className={styles.main}>
        <div className={styles.left}>
          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="位置" en="ROLE" />
            </label>
            <select
              className={styles.select}
              value={filters.role}
              onChange={e => update({ role: e.target.value })}
            >
              {roleOptions.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="战队" en="TEAM" />
            </label>
            <select
              className={styles.select}
              value={filters.team}
              onChange={e => update({ team: e.target.value })}
            >
              <option value="ALL">全部战队 / ALL TEAMS</option>
              {normalizedTeams.map(item => (
                <option key={item.value || item.label} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="最小时长" en="MIN TIME" />
            </label>
            <select
              className={styles.select}
              value={String(filters.minTime)}
              onChange={e => update({ minTime: Number(e.target.value) || 0 })}
            >
              <option value="0">不限时长 / ALL TIME</option>
              {[10, 20, 30, 40, 60, 90, 120].map(v => (
                <option key={v} value={v}>
                  ≥ {v} 分钟 / MIN
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.right}>
          <div className={`${styles.field} ${styles.searchField}`}>
            <label className={styles.label}>
              <DualLabel cn="检索" en="SEARCH" />
            </label>
            <input
              className={styles.input}
              value={filters.query}
              onChange={e => update({ query: e.target.value })}
              placeholder="输入选手 / 战队 / 英雄..."
            />
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => onChange(prev => ({ ...prev, role: 'ALL', team: 'ALL', minTime: 30, query: '' }))}
          >
            重置参数
            <span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>
      </div>
    </section>
  )
}