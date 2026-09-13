import { translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useState } from 'react'
import { rosterText } from '../../features/roster-index/rosterCopy.js'
import ImeSafeInput from '../common/ImeSafeInput.jsx'
import styles from './RosterComponents.module.css'

function FieldControl({ field, text = value => value }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{text(field.label)}</span>
      <select
        className={styles.select}
        value={field.value}
        onChange={event => field.onChange?.(event.target.value)}
      >
        {field.options.map(option => (
          <option key={option.value} value={option.value}>
            {text(option.label)}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function RosterToolbar({
  title = '搜索与筛选',
  subtitle = 'FILTERS',
  searchLabel = 'SEARCH',
  searchValue = '',
  searchPlaceholder = '',
  onSearchChange,
  fields = [],
  advancedFields = [],
  activeFilters = [],
  resultLabel = '',
  onReset,
  actions = null,
  leadingControls = null,
  compact = false,
  className = '',
  presentation = 'default',
  locale = 'zh-CN'
}) {
  const index = presentation === 'index'
  const text = value => {
    if (!index) return rosterText(value, locale)
    const labels = { FILTER: ['筛选', 'Filter'], SORT: ['排序', 'Sort'], ROLE: ['职责', 'Role'], TEAM: ['队伍', 'Team'], HERO: ['英雄', 'Hero'], FOLLOWING: ['关注', 'Following'] }
    return rosterText(labels[value]?.[locale === 'en-US' ? 1 : 0] || value, locale)
  }
  const advancedId = useId()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const hasAdvanced = advancedFields.length > 0

  const actionControls = resultLabel || actions || hasAdvanced || onReset ? (
    <div className={styles.toolbarActions}>
      {resultLabel ? <span className={styles.resultPill}>{resultLabel}</span> : null}
      {actions}
      {hasAdvanced ? (
        <button
          type="button"
          className={`${styles.secondaryAction} ${advancedOpen ? styles.secondaryActionActive : ''}`}
          onClick={() => setAdvancedOpen(value => !value)}
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
        >
          {text(uiText("高级筛选", locale))}
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className={styles.secondaryAction} onClick={onReset}>
          {text(uiText("清除筛选", locale))}
        </button>
      ) : null}
    </div>
  ) : null

  const formControls = (
    <div
      className={styles.formGrid}
      style={{ '--roster-toolbar-fields': Math.max(fields.length, 1) }}
    >
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{index ? (locale === 'en-US' ? 'Search' : uiText("搜索", locale)) : searchLabel}</span>
        <ImeSafeInput
          className={styles.input}
          value={searchValue}
          onValueChange={onSearchChange}
          placeholder={text(searchPlaceholder)}
        />
      </label>

      {fields.map(field => (
        <FieldControl key={field.name} field={field} text={text} />
      ))}
    </div>
  )

  const advancedPanel = hasAdvanced && advancedOpen ? (
    <div className={styles.advancedGrid} id={advancedId}>
      {advancedFields.map(field => (
        <FieldControl key={field.name} field={field} text={text} />
      ))}
    </div>
  ) : null

  const activeFilterPanel = activeFilters.length ? (
    <div className={styles.activeFilters} aria-label="Active roster filters">
      {activeFilters.map(filter => (
        <button
          key={`${filter.key}-${filter.label}`}
          type="button"
          className={styles.filterChip}
          onClick={filter.onRemove}
        >
          {text(filter.label)} ×
        </button>
      ))}
      {onReset ? (
        <button type="button" className={styles.clearAllLink} onClick={onReset}>
          {text(uiText("清除全部筛选", locale))} →
        </button>
      ) : null}
    </div>
  ) : null

  if (compact) {
    return (
      <section className={`${styles.toolbar} ${styles.toolbarCompact} ${index ? styles.toolbarIndex : ''} ${className}`.trim()} data-i18n-ignore={index || undefined}>
        <div className={`${styles.compactToolbarRow} ${leadingControls ? styles.compactToolbarRowWithLead : ''}`}>
          {leadingControls}
          {formControls}
          {actionControls}
        </div>
        {advancedPanel}
        {activeFilterPanel}
      </section>
    )
  }

  return (
    <section className={`${styles.toolbar} ${className}`.trim()}>
      <div className={styles.toolbarTop}>
        <div className={styles.toolbarTitleGroup}>
          <div className={styles.toolbarTitle}>{title}</div>
          <div className={styles.toolbarSubtitle}>{subtitle}</div>
        </div>
        {actionControls}
      </div>

      {formControls}
      {advancedPanel}
      {activeFilterPanel}
    </section>
  )
}
