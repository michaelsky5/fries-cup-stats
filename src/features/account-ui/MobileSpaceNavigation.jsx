import { Link, useLocation } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import { getRestoreScrollState, getReturnState, getSavedReturnScroll, saveReturnScroll } from '../../lib/navigationState.js'
import styles from './MobileSpaceNavigation.module.css'

const EN = { overview: 'My', progress: 'Participation progress', tasks: 'To do', team: 'My team', matches: 'My matches', communications: 'Messages', following: 'Following', events: 'Participation records', stats: 'My stats', referee: 'Referee tasks', caster: 'Caster tasks', stream: 'Stream display', security: 'Account settings' }
const ZH = { overview: '我的', progress: '参赛进度', tasks: '待办', team: '我的队伍', matches: '我的比赛', communications: '消息', following: '我的关注', events: '参赛记录', stats: '我的数据', referee: '赛管任务', caster: '解说任务', stream: '直播展示', security: '账号设置' }
const KO = { overview: '내 정보', progress: '참가 진행 상황', tasks: '할 일', team: '내 팀', matches: '내 경기', communications: '메시지', following: '내 관심 목록', events: '참가 기록', stats: '내 기록', referee: '심판 업무', caster: '해설 업무', stream: '방송 화면', security: '계정 설정' }
const TW = { overview: '我的', progress: '參賽進度', tasks: '待辦', team: '我的隊伍', matches: '我的比賽', communications: '訊息', following: '我的關注', events: '參賽紀錄', stats: '我的資料', referee: '賽管任務', caster: '解說任務', stream: '直播展示', security: '帳號設定' }
const label = (id, locale) => pickUiLocale(locale, ZH[id], EN[id], KO[id], TW[id])

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
  const order = ['tasks', 'matches', 'team', 'progress', 'communications', 'following', 'events', 'stats', 'referee', 'caster', 'stream', 'security']
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
