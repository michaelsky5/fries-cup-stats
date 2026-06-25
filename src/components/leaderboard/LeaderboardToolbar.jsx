import ColumnPicker from './ColumnPicker.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

const ROLE_OPTIONS = [
  { value: 'ALL', label: '全部职责', en: 'ALL' },
  { value: 'TANK', label: '坦克', en: 'TANK' },
  { value: 'DPS', label: '输出', en: 'DPS' },
  { value: 'SUPPORT', label: '辅助', en: 'SUPPORT' }
]

function getFilterCount(filters) {
  return [
    filters.query,
    filters.team !== 'ALL',
    filters.role !== 'ALL',
    filters.hero !== 'ALL',
    filters.following,
    filters.minTimeMins,
    filters.showInsufficient === false
  ].filter(Boolean).length
}

export default function LeaderboardToolbar({
  filters,
  options,
  minTimeMins,
  visibleColumns,
  advancedOpen,
  onAdvancedToggle,
  onFilterChange,
  onReset,
  onColumnsChange,
  locale = 'zh-CN'
}) {
  const filterCount = getFilterCount(filters)

  return (
    <section className={styles.toolbar} aria-label="排行榜筛选">
      <div className={styles.toolbarPrimary}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>搜索选手</span>
          <input
            value={filters.query}
            onChange={event => onFilterChange({ query: event.target.value })}
            placeholder="昵称 / BattleTag / 队伍"
          />
        </label>

        <label className={styles.field}>
          <span>队伍</span>
          <select
            value={filters.team}
            onChange={event => onFilterChange({ team: event.target.value })}
          >
            <option value="ALL">全部队伍</option>
            {options.teams.map(team => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>职责</span>
          <select
            value={filters.role}
            onChange={event => onFilterChange({ role: event.target.value })}
          >
            {ROLE_OPTIONS.map(role => (
              <option key={role.value} value={role.value}>
                {role.label} / {role.en}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={filters.following}
            onChange={event => onFilterChange({ following: event.target.checked })}
          />
          <span>只看关注</span>
        </label>

        <button
          type="button"
          className={styles.toolbarButton}
          aria-expanded={advancedOpen}
          onClick={onAdvancedToggle}
        >
          筛选 {filterCount ? `/${filterCount}` : ''}
        </button>

        <ColumnPicker visibleColumns={visibleColumns} onChange={onColumnsChange} />

        <button type="button" className={styles.resetButton} onClick={onReset}>
          重置
        </button>
      </div>

      <div className={styles.toolbarStatusRow}>
        <span className={styles.thresholdInline}>
          FILTER / MINIMUM PLAYTIME &gt;= {minTimeMins} MIN
        </span>
        <span>当前筛选会即时同步到 URL，可刷新或分享当前视图。</span>
      </div>

      {advancedOpen ? (
        <div className={styles.advancedFilters}>
          <label className={styles.field}>
            <span>常用英雄</span>
            <select
              value={filters.hero}
              onChange={event => onFilterChange({ hero: event.target.value })}
            >
              <option value="ALL">全部英雄</option>
              {options.heroes.map(hero => (
                <option key={hero} value={hero}>{formatOwHeroName(hero, locale)}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>最低出场时间</span>
            <input
              type="number"
              min="0"
              step="5"
              value={filters.minTimeMins}
              onChange={event => onFilterChange({ minTimeMins: event.target.value })}
            />
          </label>

          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={filters.showInsufficient}
              onChange={event => onFilterChange({ showInsufficient: event.target.checked })}
            />
            <span>显示样本不足</span>
          </label>
        </div>
      ) : null}
    </section>
  )
}
