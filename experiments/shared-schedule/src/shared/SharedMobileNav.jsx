import { useEffect, useRef, useState } from 'react'
import { View, ScrollView } from '@tarojs/components'
import { useDidHide } from '@tarojs/taro'
import navigation from '../generated/navigation.json'
import styles from '../generated/StatsMobileNav.module.css'
import dialogStyles from '../generated/StatsDialog.module.css'
import { getActiveLocale } from './nativeLocales.js'
import './navigation-adapter.css'

export default function SharedMobileNav({ onSchedule, activeGroup = 'matches', onNavigate }) {
  const locale = getActiveLocale()
  // Stats deliberately uses short dock labels and different full menu labels.
  // Select its authored translations instead of translating the Chinese label.
  const dockLabel = item => locale === 'en-US' ? item.en : locale === 'ko-KR' ? item.ko : item.zh
  const destinationLabel = item => locale === 'en-US' ? (item.en || item.cn) : locale === 'ko-KR' ? (item.ko || item.cn) : item.cn
  const [panel, setPanel] = useState(null)
  const surface = useRef(null)
  const opener = useRef(null)
  const close = () => setPanel(null)
  const publicDestinations = [...navigation.destinations, ...[['maps', '地图图谱'], ['heroes', '英雄档案'], ['staff', '工作人员'], ['review', '赛事回顾'], ['history', '历史赛事'], ['classic', '经典经理']].map(([group, cn]) => ({ group, cn }))]
  const moreOpen = panel?.kind === 'more' || panel?.origin === 'more'
  const moreActive = !navigation.dock.some(item => item.group === activeGroup)
  useDidHide(close)
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5' || !panel) return undefined
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    surface.current?.querySelector('button')?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab') return
      const buttons = [...surface.current.querySelectorAll('button')]
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus?.()
    }
  }, [panel])

  const select = (item, origin = 'dock') => {
    if (onNavigate) { close(); onNavigate(item.group) }
    else if (item.group === activeGroup) {
      close()
      onSchedule?.()
    } else setPanel({ kind: 'pending', item, origin })
  }
  const rememberOpener = event => { if (process.env.TARO_ENV === 'h5') opener.current = event.currentTarget }
  const dismiss = () => { close(); opener.current?.focus?.() }
  return <>
    <nav className={`${styles.dock} shared-mobile-dock`} aria-label='手机赛事导航'>
      {navigation.dock.map(item => <button key={item.group} type='button'
        className={`shared-nav-${item.group} ${item.group === activeGroup ? 'shared-current' : ''}`}
        aria-current={item.group === activeGroup ? 'page' : undefined}
        onClick={event => { rememberOpener(event); select(navigation.destinations.find(target => target.group === item.group)) }}>
        <img className='shared-tag-svg' src={`/assets/navigation/${item.group}${item.group === activeGroup ? '-active' : ''}.png`} alt='' />
        <span>{dockLabel(item)}</span>
      </button>)}
      <button className={`shared-nav-more ${moreOpen ? 'shared-expanded' : ''} ${moreActive ? 'shared-current' : ''}`} type='button' aria-haspopup='dialog' aria-expanded={moreOpen} aria-current={moreActive ? 'page' : undefined}
        onClick={event => { rememberOpener(event); setPanel(current => current ? null : { kind: 'more' }) }}>
        <img className='shared-tag-svg' src={`/assets/navigation/more${moreOpen || moreActive ? '-active' : ''}.png`} alt='' /><span>更多</span>
      </button>
    </nav>
    {panel ? <View className='shared-nav-overlay' catchMove>
      <button className='shared-nav-backdrop' type='button' aria-label='关闭菜单' tabIndex={-1} onClick={dismiss} />
      <section ref={surface} role='dialog' aria-modal='true' aria-labelledby='shared-nav-title'
        className={`${dialogStyles.dialog} ${dialogStyles.compactDialog} ${styles.sheet} shared-nav-surface`}>
        <header className={dialogStyles.dialogHeader}><h2 id='shared-nav-title'>{panel.kind === 'more' ? '继续逛薯条杯' : destinationLabel(panel.item)}</h2><button className='shared-nav-close' type='button' onClick={dismiss} aria-label='关闭对话框'>×</button></header>
        {panel.kind === 'more' ? <ScrollView scrollY className='shared-more-scroll'><nav className={styles.destinations} aria-label='全部赛事页面'>
          {publicDestinations.map((item, index) => <button type='button' key={item.group}
            className={`shared-tag-a shared-destination-${item.group} ${item.group === activeGroup ? 'shared-current' : ''}`}
            aria-current={item.group === activeGroup ? 'page' : undefined} onClick={() => select(item, 'more')}>
            <small>{String(index + 1).padStart(2, '0')} · {onNavigate ? (item.group === 'space' ? '本机关注' : item.group === 'classic' ? '本机模拟' : '公开查询') : item.group === activeGroup ? '已接入' : '尚未接入'}</small><strong>{destinationLabel(item)}</strong><span aria-hidden='true'>↗</span>
          </button>)}
        </nav></ScrollView> : <div className='shared-nav-pending'>
          <p>「{panel.item.cn}」尚未接入小程序。</p>
          <p className='shared-nav-note'>当前可查询公开赛程、赛果和五局记录。</p>
          {panel.origin === 'more' ? <button className='shared-nav-return-menu' type='button' onClick={() => setPanel({ kind: 'more' })}>返回全部入口</button> : null}
          <button className='shared-nav-continue' type='button' onClick={() => { close(); onSchedule?.() }}>继续查看赛程</button>
        </div>}
      </section>
    </View> : null}
  </>
}
