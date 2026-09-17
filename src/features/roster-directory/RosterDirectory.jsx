import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import { getLocationPath, getRestoreScrollY, getSavedReturnScroll, getReturnState, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import styles from './RosterDirectory.module.css'

export function DirectoryLink({ to, children, className, label }) {
  const location = useLocation()
  return <Link to={to} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} className={className} aria-label={label} title={label}>{children}</Link>
}

export function DirectoryHeading({ seasonCode, kicker, title, description, count, total, unit, action }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const scroll = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
    if (scroll !== null) restoreWindowScroll(scroll)
  }, [location, navigationType])
  return <header className={styles.heading} data-directory-heading>
    <div><span className={styles.eyebrow} aria-label={seasonCode + ' · ' + kicker}>{kicker}</span><h1>{title}</h1></div>
    <div className={styles.headingAside}><p>{description}</p><span><b>{count}</b>{count !== total ? ' / ' + total : ''} <em>{unit}</em></span>{action}</div>
  </header>
}

export function DirectoryControls({ tabs, searchLabel, searchPlaceholder, searchValue, onSearchChange, fields = [], advancedFields = [], activeFilters = [], onReset, locale, translate }) {
  const en = locale === 'en-US'
  const [expanded, setExpanded] = useState(false)
  const advancedId = useId()
  const labels = en ? { SORT: 'Sort', ROLE: 'Role', TEAM: 'Team', HERO: 'Hero', FOLLOWING: 'Following', FILTER: 'Roster filter' } : { SORT: uiText("排序", locale), ROLE: uiText("职责", locale), TEAM: uiText("队伍", locale), HERO: uiText("英雄", locale), FOLLOWING: uiText("关注", locale), FILTER: uiText("名单筛选", locale) }
  const fieldControl = field => <label className={styles.selectField} key={field.name}>
    <span>{labels[field.label] || field.label}</span>
    <select value={field.value} onChange={event => field.onChange(event.target.value)}>
      {field.options.map(option => <option key={option.value} value={option.value}>{translate ? translate(option.label, locale) : option.label}</option>)}
    </select>
  </label>
  return <div className={styles.controls} data-directory-controls>
    {tabs}
    <label className={styles.search}><span>{searchLabel}</span><ImeSafeInput value={searchValue} onValueChange={onSearchChange} aria-label={searchLabel} placeholder={searchPlaceholder} type="search" /><svg className={styles.searchMark} viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg></label>
    <div className={styles.filterLine}>{fields.map(fieldControl)}{advancedFields.length ? <button type="button" className={styles.moreFilters} aria-expanded={expanded} aria-controls={advancedId} onClick={() => setExpanded(value => !value)}>{en ? 'Filters' : uiText("更多筛选", locale)} <span aria-hidden="true">{expanded ? '−' : '+'}</span></button> : null}</div>
    {expanded && advancedFields.length ? <div className={styles.advanced} id={advancedId}>{advancedFields.map(fieldControl)}</div> : null}
    {activeFilters.length || onReset ? <div className={styles.activeFilters} aria-label={en ? 'Active filters' : uiText("已选筛选", locale)}>{activeFilters.map(filter => <button key={filter.key} type="button" onClick={filter.onRemove}>{translate ? translate(filter.label, locale) : filter.label} <span aria-hidden="true">×</span></button>)}{onReset ? <button type="button" onClick={onReset}>{en ? 'Clear all' : uiText("清除全部", locale)}</button> : null}</div> : null}
  </div>
}

export default function RosterDirectory({ kind, label, listTitle, items, focusedKey, getKey, getName, renderIdentity, getHref, previewLabel, archiveLabel, getArchiveText, onFocus, mobileExpanded, startIndex, resultCount, controls, pagination, emptyState, preview, emptyPreview, directoryRef, locale }) {
  const en = locale === 'en-US'
  const previewId = useId()
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  const firstKey = items.length ? getKey(items[0]) : ''
  const listRef = useRef(null)
  const previousPage = useRef(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = event => setIsCompact(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const selected = list.querySelector('[data-selected="true"]')
    if (selected && list.scrollHeight > list.clientHeight) {
      const top = selected.offsetTop
      const bottom = top + selected.offsetHeight
      if (previousPage.current !== firstKey || top < list.scrollTop) list.scrollTop = top
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
    }
    previousPage.current = firstKey
  }, [focusedKey, firstKey])
  const collapse = event => {
    const trigger = event.currentTarget.closest('[data-directory-item]')?.querySelector('[data-directory-preview]')
    onFocus('')
    requestAnimationFrame(() => {
      trigger?.focus({ preventScroll: true })
      if (isCompact) trigger?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    })
  }
  return <section ref={directoryRef} className={styles.workbench} data-roster-explorer={kind} aria-label={label}>
    <div className={styles.directory} data-directory-list>
      <div className={styles.directoryTop}><span>{listTitle}</span><b>{resultCount} <small>{en ? 'results' : uiText("条结果", locale)}</small></b></div>
      {controls}
      {items.length ? <ul className={styles.names} ref={listRef}>{items.map((item, index) => {
        const key = getKey(item)
        const selected = key === focusedKey
        const expanded = selected && mobileExpanded
        const active = isCompact ? expanded : selected
        const itemPreviewId = `${previewId}-${index}`
        const href = getHref(item)
        const destinationLabel = typeof archiveLabel === 'function' ? archiveLabel(item) : archiveLabel
        return <li key={key} data-selected={active} data-directory-item={key}>
          <div className={styles.nameRow}>
            <button type="button" data-directory-preview onClick={event => isCompact && expanded ? collapse(event) : onFocus(key)} aria-pressed={isCompact ? undefined : selected} aria-expanded={isCompact ? Boolean(expanded) : undefined} aria-controls={isCompact ? expanded ? itemPreviewId : undefined : previewId} aria-label={(isCompact && expanded ? en ? 'Collapse preview' : uiText("收起预览", locale) : previewLabel) + ' ' + getName(item)}>
              <span className={styles.serial}>{String(startIndex + index).padStart(3, '0')}</span>{renderIdentity(item)}<span className={styles.selectionMark} aria-hidden="true">{isCompact && expanded ? en ? 'Close' : uiText("收起", locale) : active ? en ? 'Viewing' : uiText("查看中", locale) : en ? 'Preview' : uiText("预览", locale)}</span>
            </button>
            {href ? <DirectoryLink className={styles.rowLink} to={href} label={destinationLabel + ' ' + getName(item)}><span>{getArchiveText ? getArchiveText(item) : en ? 'Archive' : uiText("档案", locale)}</span><span aria-hidden="true">↗</span></DirectoryLink> : null}
          </div>
          {isCompact && expanded ? <div className={styles.inlinePreview} data-directory-inline id={itemPreviewId}>
            <div className={styles.inlineToolbar}><span>{en ? 'Previewing' : uiText("正在预览", locale)} <strong>{getName(item)}</strong></span><button type="button" onClick={collapse} aria-label={(en ? 'Close preview' : uiText("关闭预览", locale)) + ' ' + getName(item)}>{en ? 'Close' : uiText("收起", locale)} <span aria-hidden="true">↑</span></button></div>
            {preview}<button type="button" className={styles.collapse} onClick={collapse} aria-label={(en ? 'Back to the list' : uiText("返回名单", locale)) + ' ' + getName(item)}>{en ? 'Back to the list' : uiText("收起，继续浏览名单", locale)} <span aria-hidden="true">↑</span></button>
          </div> : null}
        </li>
      })}</ul> : <div className={styles.empty}>{emptyState}</div>}
      <div className={styles.pagination}>{pagination}</div>
    </div>
    <div className={styles.feature} data-directory-feature id={previewId}>{!isCompact ? preview || <div className={styles.noSelection}><span>{emptyPreview.kicker}</span><h2>{emptyPreview.title}</h2><p>{emptyPreview.description}</p></div> : null}</div>
  </section>
}
