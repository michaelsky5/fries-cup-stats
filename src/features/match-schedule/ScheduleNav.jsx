import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useOutletContext } from 'react-router-dom'
import styles from './Schedule.module.css'

export default function ScheduleNav({ active, archived = true }) {
  const { withSeason, locale = 'zh-CN' } = useOutletContext()
  const en = locale === 'en-US'
  const items = [
    { key: 'featured', to: '/matches', label: archived ? en ? 'Match highlights' : uiText("赛事精选", locale) : en ? 'Match hub' : uiText("赛程总览", locale), code: 'FEATURED' },
    { key: 'list', to: '/matches?view=list', label: en ? 'Full schedule' : uiText("完整赛程", locale), code: 'ALL MATCHES' }
  ]
  return <nav className={styles.nav} aria-label={en ? 'Schedule sections' : uiText("赛程赛果导航", locale)} data-schedule-nav data-i18n-ignore>
    {items.map(item => <Link key={item.key} to={withSeason(item.to)} state={{ restoreScrollY: 0 }} aria-current={active === item.key ? 'page' : undefined}><span>{item.label}</span>{!en ? <small aria-hidden="true">{item.code}</small> : null}</Link>)}
  </nav>
}
