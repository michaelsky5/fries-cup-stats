import { useState } from 'react'
import ImeSafeInput from '../common/ImeSafeInput.jsx'
import styles from './RosterComponents.module.css'

function FieldControl({ field }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{field.label}</span>
      <select
        className={styles.select}
        value={field.value}
        onChange={event => field.onChange?.(event.target.value)}
      >
        {field.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
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
  compact = false
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const hasAdvanced = advancedFields.length > 0

  const actionControls = (
    <div className={styles.toolbarActions}>
      {resultLabel ? <span className={styles.resultPill}>{resultLabel}</span> : null}
      {actions}
      {hasAdvanced ? (
        <button
          type="button"
          className={`${styles.secondaryAction} ${advancedOpen ? styles.secondaryActionActive : ''}`}
          onClick={() => setAdvancedOpen(value => !value)}
          aria-expanded={advancedOpen}
        >
          高级筛选
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className={styles.secondaryAction} onClick={onReset}>
          清除筛选
        </button>
      ) : null}
    </div>
  )

  const formControls = (
    <div
      className={styles.formGrid}
      style={{ '--roster-toolbar-fields': Math.max(fields.length, 1) }}
    >
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{searchLabel}</span>
        <ImeSafeInput
          className={styles.input}
          value={searchValue}
          onValueChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </label>

      {fields.map(field => (
        <FieldControl key={field.name} field={field} />
      ))}
    </div>
  )

  const advancedPanel = hasAdvanced && advancedOpen ? (
    <div className={styles.advancedGrid}>
      {advancedFields.map(field => (
        <FieldControl key={field.name} field={field} />
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
          {filter.label} ×
        </button>
      ))}
      {onReset ? (
        <button type="button" className={styles.clearAllLink} onClick={onReset}>
          清除全部筛选 →
        </button>
      ) : null}
    </div>
  ) : null

  if (compact) {
    return (
      <section className={`${styles.toolbar} ${styles.toolbarCompact}`}>
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
    <section className={styles.toolbar}>
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
