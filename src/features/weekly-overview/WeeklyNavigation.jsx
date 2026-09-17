import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import { weeklyCycleTitle, weeklyStatusLabel, weeklyWeekTitle } from './weeklyPresentation.js'
import styles from './WeeklyNavigation.module.css'
import sectionStyles from '../../components/navigation/SignalSectionNav.module.css'

export function WeeklyCyclePicker({ cycles, cycle, locale, onChange }) {
  const en = String(locale).startsWith('en')
  return <div className={styles.cycleBar}>
    <label>{en ? 'Cycle' : uiText("当前周期", locale)}<select aria-label={en ? 'Select cycle' : uiText("选择周期", locale)} value={cycle?.id || ''} onChange={event => onChange(event.target.value)} disabled={!cycles.length}>
      {!cycles.length && <option value="">{en ? 'To be announced' : uiText("待公布", locale)}</option>}
      {cycles.map(item => <option key={item.id} value={item.id}>{weeklyCycleTitle(item, locale)}</option>)}
    </select></label>
    <span>{cycle ? weeklyStatusLabel(cycle.status, locale) : en ? 'Schedule pending' : uiText("赛程待公布", locale)}{cycle?.counts_toward_standings === false && (en ? ' · No cycle points' : uiText(" · 不计周期积分", locale))}</span>
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
