import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { DEFAULT_REGION_GROUP, REGION_GROUPS, getLocalizedOption, getRegionGroup, getRegionGroupValueForCode, getRegionOption } from './regionOptions.js'
import { findRegionOptions } from './regionPickerModel.js'
import styles from './RegionSelector.module.css'

const COPY = {
  'zh-CN': { placeholder: '请选择国家或地区', title: '选择国家 / 地区', search: '搜索中文、英文名称或代码', searchLabel: '搜索国家或地区', browse: '按洲浏览', results: '个国家或地区', all: '全部地区', empty: '没有找到匹配地区，试试其他名称或代码。', other: '其他 / 未列出地区', close: '关闭地区选择', selected: '当前选择', none: '尚未选择', hint: '搜索可查找全部地区，点选后立即应用。' },
  'zh-TW': { placeholder: '請選擇國家或地區', title: '選擇國家 / 地區', search: '搜尋中文、英文名稱或代碼', searchLabel: '搜尋國家或地區', browse: '按洲瀏覽', results: '個國家或地區', all: '全部地區', empty: '找不到符合的地區，請嘗試其他名稱或代碼。', other: '其他 / 未列出地區', close: '關閉地區選擇', selected: '目前選擇', none: '尚未選擇', hint: '搜尋可查找全部地區，點選後立即套用。' },
  'en-US': { placeholder: 'Select a country or region', title: 'Choose country / region', search: 'Search country name or code', searchLabel: 'Search countries or regions', browse: 'Browse by continent', results: 'countries or regions', all: 'All regions', empty: 'No matching region. Try another name or code.', other: 'Other / Not listed', close: 'Close region selector', selected: 'Current selection', none: 'Not selected', hint: 'Search all regions. Select one to apply.' },
  'ko-KR': { placeholder: '국가 또는 지역을 선택하세요', title: '국가 / 지역 선택', search: '국가 이름 또는 코드 검색', searchLabel: '국가 또는 지역 검색', browse: '대륙별 보기', results: '개 국가 또는 지역', all: '전체 지역', empty: '일치하는 지역이 없습니다. 다른 이름이나 코드를 검색해 보세요.', other: '기타 / 목록에 없음', close: '지역 선택 닫기', selected: '현재 선택', none: '선택하지 않음', hint: '검색은 모든 지역을 포함합니다. 선택하면 바로 적용됩니다.' }
}

export default function RegionSelector({ value = '', onChange, label, name, required = false, clearable = !required, disabled = false, locale: suppliedLocale }) {
  const uiLocale = useUiLocale()
  const locale = suppliedLocale || uiLocale
  const copy = COPY[locale] || COPY['zh-CN']
  const id = useId()
  const trigger = useRef(null)
  const nativeSelect = useRef(null)
  const dialog = useRef(null)
  const searchInput = useRef(null)
  const list = useRef(null)
  const [open, setOpen] = useState(false)
  const [groupValue, setGroupValue] = useState(DEFAULT_REGION_GROUP)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = getRegionOption(value)
  const options = useMemo(() => findRegionOptions({ query, groupValue }), [query, groupValue])
  const groups = REGION_GROUPS.filter(group => group.value !== 'OTHER')

  function showPicker() {
    const nextGroup = getRegionGroupValueForCode(value)
    setGroupValue(nextGroup === 'OTHER' ? DEFAULT_REGION_GROUP : nextGroup)
    setQuery('')
    setActiveIndex(Math.max(0, findRegionOptions({ groupValue: nextGroup }).findIndex(option => option.value === value)))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined
    const element = dialog.current
    const previousTrigger = trigger.current
    element.showModal()
    searchInput.current?.focus()
    const selectedElement = list.current?.querySelector('[aria-selected="true"]')
    selectedElement?.scrollIntoView({ block: 'nearest' })
    return () => {
      if (element.open) element.close()
      if (previousTrigger?.isConnected) previousTrigger.focus()
    }
  }, [open])

  function select(code) {
    // Bubble a real field change so surrounding registration forms mark their drafts dirty.
    nativeSelect.current.value = code
    nativeSelect.current.dispatchEvent(new Event('change', { bubbles: true }))
    setOpen(false)
  }

  function focusOption(index) {
    if (!options.length) return
    const nextIndex = (index + options.length) % options.length
    setActiveIndex(nextIndex)
    list.current?.querySelectorAll('[role="option"]')[nextIndex]?.focus()
  }

  return <div className={styles.field}>
    <label id={`${id}-label`} htmlFor={`${id}-trigger`}>{label}</label>
    <select ref={nativeSelect} className={styles.nativeSelect} name={name} value={value} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={event => onChange(event.target.value)} onInvalid={event => { event.preventDefault(); showPicker() }}>
      <option value="">{copy.placeholder}</option>
      {value && !REGION_GROUPS.some(group => group.options.some(option => option.value === value)) && <option value={value}>{getLocalizedOption(selected, locale)}</option>}
      {REGION_GROUPS.map(group => <optgroup key={group.value} label={getLocalizedOption(group, locale)}>{group.options.map(option => <option key={option.value} value={option.value}>{getLocalizedOption(option, locale)}</option>)}</optgroup>)}
    </select>
    <button ref={trigger} id={`${id}-trigger`} type="button" className={styles.trigger} onClick={showPicker} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`}>
      <span id={`${id}-value`} className={!value ? styles.placeholder : ''}>{selected ? getLocalizedOption(selected, locale) : copy.placeholder}</span>
      {value && <span className={styles.code}>{value === 'OTHER' ? '—' : value}</span>}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && createPortal(<dialog ref={dialog} id={`${id}-dialog`} data-design="signal" data-region-picker className={styles.dialog} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); setOpen(false) }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }} onKeyDown={event => {
      // Keep Escape/Tab in this native modal when it is opened inside the account dialog.
      if (['Escape', 'Tab'].includes(event.key)) event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    }}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>FRIES CUP / REGION</span><h2 id={`${id}-title`}>{copy.title}</h2></div>
          <button type="button" className={styles.close} aria-label={copy.close} onClick={() => setOpen(false)}>×</button>
        </header>
        <div className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input ref={searchInput} type="search" aria-label={copy.searchLabel} placeholder={copy.search} value={query} autoComplete="off" onChange={event => { event.stopPropagation(); setQuery(event.target.value); setActiveIndex(0) }} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusOption(event.key === 'ArrowDown' ? 0 : options.length - 1) }
            if (event.key === 'Enter') { event.preventDefault(); if (options.length === 1) select(options[0].value); else focusOption(0) }
          }} />
        </div>
        <div className={styles.body}>
          <nav className={styles.groups} aria-label={copy.browse}>
            {groups.map(group => <button key={group.value} type="button" aria-pressed={!query.trim() && groupValue === group.value} onClick={() => { setGroupValue(group.value); setQuery(''); setActiveIndex(0) }}>
              <span>{getLocalizedOption(group, locale)}</span><span className={styles.groupCount}>{group.options.length}</span>
            </button>)}
          </nav>
          <section className={styles.results}>
            <div className={styles.resultHeader} aria-live="polite"><strong>{query.trim() ? copy.all : getLocalizedOption(getRegionGroup(groupValue), locale)}</strong><span>{options.length} {copy.results}</span></div>
            <div ref={list} className={styles.list} role="listbox" aria-label={copy.title} onKeyDown={event => {
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                focusOption(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : activeIndex + (event.key === 'ArrowDown' ? 1 : -1))
              }
            }}>
              {options.length ? options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} tabIndex={index === activeIndex ? 0 : -1} className={styles.option} onFocus={() => setActiveIndex(index)} onClick={() => select(option.value)}>
                <span className={styles.optionName}><strong>{getLocalizedOption(option, locale)}</strong>{locale !== 'en-US' && <span lang="en">{option.en}</span>}</span>
                <span className={styles.code}>{option.value}</span><span className={styles.check} aria-hidden="true">{value === option.value ? '✓' : ''}</span>
              </button>) : <p className={styles.empty}>{copy.empty}</p>}
            </div>
          </section>
        </div>
        <footer className={styles.footer}>
          <div><span>{copy.selected} · {selected ? getLocalizedOption(selected, locale) : copy.none}</span><small>{copy.hint}</small></div>
          <div className={styles.footerActions}><button type="button" onClick={() => select('OTHER')}>{copy.other} ↗</button>{clearable && value && <button type="button" onClick={() => select('')}>{locale === 'en-US' ? 'Clear' : locale === 'zh-TW' ? '清除選擇' : locale === 'ko-KR' ? '선택 해제' : '清除选择'}</button>}</div>
        </footer>
      </div>
    </dialog>, document.body)}
  </div>
}
