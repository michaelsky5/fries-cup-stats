import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import styles from './SignalDataHeader.module.css'
import sectionStyles from '../navigation/SignalSectionNav.module.css'

const DATA_VIEWS = [
  { id: 'players', path: '/leaderboard', zh: '选手排行', en: 'Players', code: 'RANKING' },
  { id: 'heroes', path: '/heroes', zh: '英雄数据', en: 'Heroes', code: 'HEROES' },
  { id: 'maps', path: '/maps', zh: '地图数据', en: 'Maps', code: 'MAPS' }
]

export function SignalDataNav({ active, withSeason, isEn, backTo, backLabel, backState, activeHref }) {
  const uiLocale = useUiLocale()
  return <nav className={`${styles.nav} ${sectionStyles.root}`} aria-label={isEn ? 'Data navigation' : uiText("数据资料导航", uiLocale)} data-signal-data-nav data-i18n-ignore>
    <div className={styles.links}>{DATA_VIEWS.map(item => <Link
      key={item.id}
      className={sectionStyles.item}
      to={item.id === active ? activeHref || backTo || withSeason(item.path) : withSeason(item.path)}
      state={item.id === active && (!activeHref || activeHref === backTo) ? backState : undefined}
      aria-current={item.id === active ? 'page' : undefined}
    ><span>{isEn ? item.en : uiText(item.zh, uiLocale)}</span>{!isEn ? <small className={sectionStyles.code} aria-hidden="true">{item.code}</small> : null}</Link>)}</div>
    {backTo ? <Link to={backTo} state={backState} className={styles.back} aria-label={backLabel}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M20 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <span>{backLabel}</span>
    </Link> : null}
  </nav>
}

export function SignalDataHeading({ eyebrow, title, description, children, compact = false }) {
  return <header className={`${styles.heading} ${compact ? styles.compact : ''}`} data-signal-data-heading data-i18n-ignore>
    <div className={styles.intro}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
    {children ? <div className={styles.meta}>{children}</div> : null}
  </header>
}
