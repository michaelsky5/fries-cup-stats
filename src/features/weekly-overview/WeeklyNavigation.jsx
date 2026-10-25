import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { isChineseLocale, weeklyCycleCode, weeklyCycleTitle, weeklyStatusLabel, weeklyWeekHasNumber, weeklyWeekRailTitle } from './weeklyPresentation.js'
import styles from './WeeklyNavigation.module.css'
import sectionStyles from '../../components/navigation/SignalSectionNav.module.css'
import { SCROLL_FADE_SIZE } from '../../lib/scrollFades.js'

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
  const selectLabel = en ? 'Select cycle' : uiText('选择赛段', locale)
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
    <div className={styles.cycleField} data-weekly-cycle-field="true"><span>{en ? 'Cycle' : uiText('当前赛段', locale)}</span>
      <div className={styles.cycleControl}>
        {cycles.length > 1 ? <>
          <button ref={triggerRef} type="button" className={`${styles.cycleValue} ${styles.cycleTrigger}`} data-weekly-cycle-value="true" aria-label={`${selectLabel}：${title}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => { if (open) closeMenu(); else openMenu(selectedIndex) }} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(event.key === 'ArrowUp' ? cycles.length - 1 : selectedIndex) }
            else if (event.key === 'Escape' && open) { event.preventDefault(); closeMenu() }
          }}><span>{title}</span><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg></button>
          {open && <div id={menuId} className={styles.cycleMenu} role="menu" aria-label={selectLabel} onKeyDown={menuKeys}>
            {cycles.map((item, index) => <button type="button" key={item.id} ref={element => { optionRefs.current[index] = element }} role="menuitemradio" aria-checked={item.id === current?.id} tabIndex={-1} onClick={() => { closeMenu(); if (item.id !== current?.id) onChange(item.id) }}><span><strong>{weeklyCycleTitle(item, locale)}</strong><small>{[isChineseLocale(locale) && weeklyCycleCode(item), weeklyStatusLabel(item.status, locale)].filter(Boolean).join(' · ')}</small></span><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg></button>)}
          </div>}
        </> : <strong className={`${styles.cycleValue} ${!current ? styles.cyclePending : ''}`} data-weekly-cycle-value="true"><span>{title}</span></strong>}
      </div>
    </div>
    {dateRange && <small>{dateRange}</small>}
    <span>{current ? weeklyStatusLabel(current.status, locale) : en ? 'Schedule pending' : uiText("赛程待公布", locale)}{current?.counts_toward_standings === false && (en ? ' · No cycle points' : uiText(" · 不计赛段积分", locale))}</span>
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
      // and clear of the edge fades, so the selected week is never half hidden.
      if (box.left < bounds.left + SCROLL_FADE_SIZE) rail.scrollLeft += box.left - bounds.left - SCROLL_FADE_SIZE
      else if (box.right > bounds.right - SCROLL_FADE_SIZE) rail.scrollLeft += box.right - bounds.right + SCROLL_FADE_SIZE
    }
    reveal()
    const observer = new ResizeObserver(reveal)
    observer.observe(rail)
    observer.observe(active)
    return () => observer.disconnect()
  }, [selectedId, weeks])
  if (!weeks.length) return null
  const items = includeAll ? [{ id: 'all' }, ...weeks] : weeks
  return <nav ref={ref} className={`${styles.weekRail} ${sectionStyles.root}`} data-scroll-fades aria-label={en ? 'Published weeks' : uiText("已发布周次", locale)}>
    {items.map(item => <button type="button" key={item.id} className={`${styles.weekItem} ${sectionStyles.item}`} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => onChange(item.id)}>
      {/* 票 2.49: 晋级加赛 and 季后赛 are stages, not weeks 5 and 6, so they carry no number. */}
      <span>{item.id === 'all' ? <b>↔</b> : weeklyWeekHasNumber(item) ? <b>{String(item.week_number).padStart(2, '0')}</b> : null}{item.id === 'all' ? en ? 'Whole cycle' : uiText("整个赛段", locale) : weeklyWeekRailTitle(item, locale)}</span>
      {/* 票 2.30: a finished week needs no label of its own; only weeks still to come or in play say where they stand. */}
      {(item.id === 'all' || String(item.status).toUpperCase() !== 'CLOSED') && <small>{item.id === 'all' ? en ? 'Published only' : uiText("已公布赛程", locale) : weeklyStatusLabel(item.status, locale)}</small>}
    </button>)}
  </nav>
}
