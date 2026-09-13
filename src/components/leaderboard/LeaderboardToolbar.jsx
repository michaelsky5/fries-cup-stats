import { translateUiText as uiText } from '../../lib/uiText.js'
import ColumnPicker from './ColumnPicker.jsx'
import ImeSafeInput from '../common/ImeSafeInput.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatSeasonSampleRequirements } from '../../lib/seasonRatingPolicy.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

const ROLE_OPTIONS = [
  { value: 'ALL', label: '全部职责', en: 'ALL' },
  { value: 'TANK', label: '重装', en: 'TANK' },
  { value: 'DPS', label: '输出', en: 'DPS' },
  { value: 'SUPPORT', label: '支援', en: 'SUPPORT' }
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
    <section className={styles.toolbar} aria-label={uiText("排行榜筛选", locale)}>
      <div className={styles.toolbarPrimary}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>{uiText("搜索选手", locale)}</span>
          <ImeSafeInput
            value={filters.query}
            onValueChange={value => onFilterChange({ query: value })}
            placeholder={uiText("昵称 / BattleTag / 队伍", locale)}
          />
        </label>

        <label className={styles.field}>
          <span>{uiText("队伍", locale)}</span>
          <select
            value={filters.team}
            onChange={event => onFilterChange({ team: event.target.value })}
          >
            <option value="ALL">{uiText("全部队伍", locale)}</option>
            {options.teams.map(team => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>{uiText("职责", locale)}</span>
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
          <span>{uiText("只看关注", locale)}</span>
        </label>

        <button
          type="button"
          className={styles.toolbarButton}
          aria-expanded={advancedOpen}
          onClick={onAdvancedToggle}
        >{uiText("筛选 ", locale)}{filterCount ? `/${filterCount}` : ''}
        </button>

        <ColumnPicker visibleColumns={visibleColumns} onChange={onColumnsChange} />

        <button type="button" className={styles.resetButton} onClick={onReset}>{uiText("重置", locale)}</button>
      </div>

      <div className={styles.toolbarStatusRow}>
        <span className={styles.thresholdInline}>
          {formatSeasonSampleRequirements(minTimeMins, locale)}
        </span>
        <span>{uiText("当前筛选会即时同步到 URL，可刷新或分享当前视图。", locale)}</span>
      </div>

      {advancedOpen ? (
        <div className={styles.advancedFilters}>
          <label className={styles.field}>
            <span>{uiText("常用英雄", locale)}</span>
            <select
              value={filters.hero}
              onChange={event => onFilterChange({ hero: event.target.value })}
            >
              <option value="ALL">{uiText("全部英雄", locale)}</option>
              {options.heroes.map(hero => (
                <option key={hero} value={hero}>{formatOwHeroName(hero, locale)}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>{uiText("最低出场时间", locale)}</span>
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
            <span>{locale === 'en-US' ? 'Include provisional / unrated' : uiText("显示暂定与未评级", locale)}</span>
          </label>
        </div>
      ) : null}
    </section>
  )
}
