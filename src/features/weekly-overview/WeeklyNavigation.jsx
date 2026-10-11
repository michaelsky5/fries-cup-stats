import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { weeklyCycleTitle, weeklyStatusLabel, weeklyWeekTitle } from './weeklyPresentation.js'
import styles from './WeeklyNavigation.module.css'
import sectionStyles from '../../components/navigation/SignalSectionNav.module.css'

export function WeeklyCyclePicker({ cycles, cycle, locale, onChange, dateRange = '' }) {
  const en = String(locale).startsWith('en')
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const openingIndex = useRef(0)
  const current = cycles.find(item => item.id === cycle?.id) || cycles[0]
  const selectedIndex = Math.max(0, cycles.findIndex(item => item.id === current?.id))
  const title = current ? weeklyCycleTitle(current, locale) : en ? 'To be announced' : uiText('待公布', locale)
  const selectLabel = en ? 'Select cycle' : uiText('选择周期', locale)
  useLayoutEffect(() => {
    if (open) optionRefs.current[openingIndex.current]?.focus()
  }, [open, cycles.length])
  useEffect(() => {
    if (!open) return
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])
  const openMenu = index => {
    openingIndex.current = index
    setOpen(true)
  }
  const closeMenu = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const menuKeys = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = Math.max(0, optionRefs.current.findIndex(option => option === event.target))
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? cycles.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + cycles.length) % cycles.length
    optionRefs.current[next]?.focus()
  }
  return <div className={styles.cycleBar} ref={rootRef} data-weekly-cycle-picker="true" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <div className={styles.cycleField} data-weekly-cycle-field="true"><span>{en ? 'Cycle' : uiText('当前周期', locale)}</span>
      <div className={styles.cycleControl}>
        {cycles.length > 1 ? <>
          <button ref={triggerRef} type="button" className={`${styles.cycleValue} ${styles.cycleTrigger}`} data-weekly-cycle-value="true" aria-label={`${selectLabel}：${title}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => { if (open) closeMenu(); else openMenu(selectedIndex) }} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(event.key === 'ArrowUp' ? cycles.length - 1 : selectedIndex) }
            else if (event.key === 'Escape' && open) { event.preventDefault(); closeMenu() }
          }}><span>{title}</span><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg></button>
          {open && <div id={menuId} className={styles.cycleMenu} role="menu" aria-label={selectLabel} onKeyDown={menuKeys}>
            {cycles.map((item, index) => <button type="button" key={item.id} ref={element => { optionRefs.current[index] = element }} role="menuitemradio" aria-checked={item.id === current?.id} tabIndex={-1} onClick={() => { closeMenu(); if (item.id !== current?.id) onChange(item.id) }}><span><strong>{weeklyCycleTitle(item, locale)}</strong><small>{weeklyStatusLabel(item.status, locale)}</small></span><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg></button>)}
          </div>}
        </> : <strong className={`${styles.cycleValue} ${!current ? styles.cyclePending : ''}`} data-weekly-cycle-value="true"><span>{title}</span></strong>}
      </div>
    </div>
    {dateRange && <small>{dateRange}</small>}
    <span>{current ? weeklyStatusLabel(current.status, locale) : en ? 'Schedule pending' : uiText("赛程待公布", locale)}{current?.counts_toward_standings === false && (en ? ' · No cycle points' : uiText(" · 不计周期积分", locale))}</span>
  </div>
}

export function WeeklyWeekRail({ weeks, selectedId, locale, onChange, includeAll = false }) {
  const ref = useRef(null)
  const en = String(locale).startsWith('en')
  useEffect(() => {
    const rail = ref.current
    const active = rail?.querySelector('[aria-current]')
    if (!active) return
    const reveal = () => {
      const box = active.getBoundingClientRect()
      const bounds = rail.getBoundingClientRect()
      // Reveal a selected week within the rail without scrolling the page.
      if (box.left < bounds.left) rail.scrollLeft += box.left - bounds.left
      else if (box.right > bounds.right) rail.scrollLeft += box.right - bounds.right
    }
    reveal()
    const observer = new ResizeObserver(reveal)
    observer.observe(rail)
    observer.observe(active)
    return () => observer.disconnect()
  }, [selectedId, weeks])
  if (!weeks.length) return null
  const items = includeAll ? [{ id: 'all' }, ...weeks] : weeks
  return <nav ref={ref} className={`${styles.weekRail} ${sectionStyles.root}`} aria-label={en ? 'Published weeks' : uiText("已发布周次", locale)}>
    {items.map(item => <button type="button" key={item.id} className={`${styles.weekItem} ${sectionStyles.item}`} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => onChange(item.id)}>
      <span><b>{item.id === 'all' ? '↔' : String(item.week_number).padStart(2, '0')}</b>{item.id === 'all' ? en ? 'Whole cycle' : uiText("整个周期", locale) : weeklyWeekTitle(item, locale)}</span>
      <small>{item.id === 'all' ? en ? 'Published only' : uiText("已公布赛程", locale) : weeklyStatusLabel(item.status, locale)}</small>
    </button>)}
  </nav>
}
