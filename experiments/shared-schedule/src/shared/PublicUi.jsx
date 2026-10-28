import { useState } from 'react'
import { Picker } from '@tarojs/components'
import { SEASONS, getSeasonName } from './publicSeasons'
import { changeSeason, backToCenter } from '../platform'
import { Heading, Pagination } from './CenterViews'
import { pageForCount } from './browseState'
import o from '../generated/StatsOverview.module.css'
import r from '../generated/StatsRoster.module.css'

import { nativeCopy } from './nativeCopy'
export { default as LanguageSwitcher } from './LanguageSwitcher'

export function Choice({ label, values, value, onChange, className = '' }) {
  const options = values.map(item => typeof item === 'string' ? { id: item, label: item } : item)
  return <Picker className={`public-choice ${className}`} range={options.map(item => nativeCopy(item.label))} value={Math.max(0, options.findIndex(item => item.id === value))} onChange={event => onChange(options[Number(event.detail.value)]?.id)}><span className='team-choice'><small>{label}</small><b>{options.find(item => item.id === value)?.label || options[0]?.label || '—'}⌄</b></span></Picker>
}
export function SeasonSwitcher({ season, view }) {
  const [error, setError] = useState('')
  return <div className='public-season-switcher'><Choice label='赛事' values={SEASONS.map(item => ({ id: item.id, label: `${getSeasonName(item)} · ${nativeCopy(item.lifecycle === 'ARCHIVED' ? '归档' : '进行中')}` }))} value={season.id} onChange={async id => { setError(''); try { await changeSeason(id, view) } catch (_) { setError('赛事切换失败，请重试。') } }} />{error ? <p role='alert'>{error}</p> : null}</div>
}
export function SectionTabs({ items, value, onChange }) {
  return <nav className={`${r.roleTabs} public-section-tabs`}>{items.map(([key, label]) => <button className={`public-section-${key} ${value === key ? 'shared-selected' : ''}`} key={key} onClick={() => onChange(key)}>{label}</button>)}</nav>
}
export function PublicHeading({ title, lead, code = 'ARCHIVE' }) { return <Heading {...{ title, lead }} eyebrow={`FRIES CUP / ${code}`} /> }
export function Section({ title, meta, children }) { return <section className='center-section public-section'><div className={o.sectionBar}><h2>{title}</h2>{meta ? <span>{meta}</span> : null}</div>{children}</section> }
export function Empty({ children = '暂无符合条件的公开记录。' }) { return <p className={`${r.empty} public-empty`}>{children}</p> }
export function Back({ view, selection }) { return <button className='center-back public-back' onClick={() => backToCenter(view, selection)}>← 返回{({ matches: '赛程', roster: '阵容', maps: '地图', heroes: '英雄', staff: '工作人员', review: '回顾' })[view] || '列表'}</button> }
export function Paged({ items, page: requested, onPage, render }) {
  const page = pageForCount(requested, items.length)
  return <>{items.slice(page * 20, (page + 1) * 20).map(render)}{!items.length ? <Empty /> : null}<Pagination page={page} count={items.length} onChange={onPage} /></>
}
export function PublicImage({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  const url = typeof src === 'string' ? src.startsWith('/') && !src.startsWith('//') ? `https://stats.fries-cup.com${src}` : /^https:\/\//.test(src) ? src : '' : ''
  return url && !failed ? <img className={`public-image ${className}`} src={url} alt={alt} onError={() => setFailed(true)} /> : null
}
