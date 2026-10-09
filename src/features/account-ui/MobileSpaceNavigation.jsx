import { Link, useLocation } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import { getRestoreScrollState, getReturnState, getSavedReturnScroll, saveReturnScroll } from '../../lib/navigationState.js'
import styles from './MobileSpaceNavigation.module.css'
import { SPACE_MOBILE_MENU_IDS, spaceSectionLabel } from '../my-space/spaceNavigation.js'

const label = spaceSectionLabel

export function MobileSpaceBack({ section, withSeason, locale }) {
  const home = withSeason('/me')
  const restore = getRestoreScrollState(getSavedReturnScroll(home))
  if (section === 'overview') return null
  return <nav className={styles.back} aria-label={pickUiLocale(locale, '我的页面导航', 'Personal page navigation', '개인 페이지 탐색', '我的頁面導覽')} data-i18n-ignore>
    <Link to={home} state={restore ? { ...restore, mobileTabRestore: true } : undefined}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg>
      {label('overview', locale)}
    </Link><strong>{label(section, locale)}</strong>
  </nav>
}

export default function MobileSpaceMenu({ sections, overview, withSeason, locale }) {
  const location = useLocation()
  const taskPending = ['loading', 'error'].includes(overview?.taskSyncStatus)
  const order = SPACE_MOBILE_MENU_IDS
  const ids = order.filter(id => sections.some(section => section.id === (id === 'progress' ? 'overview' : id)))
  const title = pickUiLocale(locale, '常用功能', 'Your services', '내 서비스', '常用功能')
  return <section className={styles.menu} aria-label={title} data-i18n-ignore>
    <h2>{title}</h2>
    <div>{ids.map(id => {
      const count = id === 'tasks' ? taskPending ? overview.taskSyncStatus === 'error' ? '!' : '…' : overview?.openTaskCount
        : id === 'communications' ? overview?.unreadNotificationCount : null
      const countLabel = id === 'tasks' && taskPending
        ? pickUiLocale(locale, '待办数量尚未同步', 'Task count not yet synced', '할 일 수 동기화 대기', '待辦數量尚未同步')
        : id === 'tasks' ? pickUiLocale(locale, '项待办', 'tasks to do', '할 일', '項待辦')
          : pickUiLocale(locale, '条未读消息', 'unread messages', '읽지 않은 메시지', '條未讀消息')
      const path = id === 'security' ? '/account' : id === 'progress' ? '/me?section=overview&progress=current' : '/me?section=' + id
      return <Link key={id} to={withSeason(path)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)}>
        <span>{label(id, locale)}</span><span className={styles.meta}>{count ? <b aria-label={taskPending && id === 'tasks' ? countLabel : count + ' ' + countLabel}>{count}</b> : null}<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></span>
      </Link>
    })}</div>
  </section>
}
