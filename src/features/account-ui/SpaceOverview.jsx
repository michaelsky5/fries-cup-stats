import AccountAvatar from './AccountAvatar.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { MATCH_STATUS_LABELS } from '../my-space/myMatchesModel.js'
import styles from './SpaceOverview.module.css'
import { buildSpaceOverview, getOverviewTaskAction, getSpaceOverviewPresentation } from './spaceOverviewModel.js'

const roleLabels = { PLAYER: '选手', MANAGER: '队长 / 经理', CAPTAIN: '队长', REFEREE: '裁判', CASTER: '解说', COACH: '教练', VIEWER: '观众' }
const priorities = { URGENT: '紧急', HIGH: '待处理', NORMAL: '待处理', LOW: '待处理' }
const formatTime = (value, fallback = '时间待定') => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : fallback
const teamName = team => team?.shortName || team?.short || team?.name || team?.full || '对手待定'

export function SpaceIdentity({ context, locale = 'zh-CN', following = false, withSeason = path => path }) {
  const { user: sessionUser } = useAuth()
  const user = { ...context?.user, ...(sessionUser?.id === context?.user?.id ? sessionUser : {}) }
  const identities = context?.identities || []
  const en = locale === 'en-US'
  const labels = en ? { PLAYER: 'Player', MANAGER: 'Captain / Manager', CAPTAIN: 'Captain', REFEREE: 'Referee', CASTER: 'Caster', COACH: 'Coach', VIEWER: 'Viewer' } : roleLabels
  const title = following ? locale === 'en-US' ? 'My Following' : uiText("我的关注", locale) : locale === 'en-US' ? 'My Space' : uiText("我的空间", locale)
  const name = user.displayName || (en ? 'Your account' : uiText("当前账号", locale))
  const emailPending = user.emailVerified === false
  const identityLabel = identities.length ? [...new Set(identities.map(item => labels[item.type] || item.label || (en ? 'Event member' : uiText("赛事成员", locale))))].join(' · ') : (en ? 'Account' : uiText("账号", locale))
  return <header className={styles.identity}>
    <div data-i18n-ignore><span className={styles.eyebrow}>{following ? 'MY FOLLOWING' : 'MY SPACE'}</span><h1>{title}</h1></div>
    <details className={styles.person} data-i18n-ignore>
      <summary aria-label={`${name} · ${en ? 'Account menu' : uiText("账号菜单", locale)}${emailPending ? en ? ' · Email unverified' : uiText(" · 邮箱待验证", locale) : ''}`}>
        <AccountAvatar className={styles.avatar} user={user}>{emailPending ? <i /> : null}</AccountAvatar>
        <span className={styles.accountName}><strong>{name}</strong><small>{en ? 'Account' : uiText("账号", locale)}</small></span>
        <svg className={styles.accountChevron} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </summary>
      <div className={styles.accountMenu}>
        <div className={styles.accountRoles}><span>{en ? 'Your roles' : uiText("账号身份", locale)}</span><p>{identityLabel}</p></div>
        <Link to={withSeason('/account')} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><span>{en ? 'Account settings' : uiText("账号设置", locale)}</span><span aria-hidden="true">→</span></Link>
        {emailPending ? <Link className={styles.emailAction} to={withSeason('/account#email')} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><span>{en ? 'Verify email' : uiText("验证邮箱", locale)}</span><small>{en ? 'Unverified' : uiText("待验证", locale)}</small></Link> : <div className={styles.emailStatus}>{user.emailVerified === true ? en ? 'Email verified' : uiText("邮箱已验证", locale) : en ? 'Email status not yet synced' : uiText("邮箱状态待同步", locale)}</div>}
      </div>
    </details>
  </header>
}

export default function SpaceOverview({ context, withSeason, sections, managerStatus, playerStatus, followingSummary, children, weekly, activity, preparation, locale = 'zh-CN' }) {
  const overview = context?.overview || {}
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer) }, [])
  const { tasks, taskCount: count, next, allowed } = buildSpaceOverview(context, { now, sections, weekly, activity })
  const archived = context?.season?.status === 'ARCHIVED'
  const en = locale === 'en-US'
  const match = next?.match
  const nextIsStaff = next?.isStaff
  const canEnter = next?.canEnterRoom
  const status = managerStatus || playerStatus
  const teams = context?.teamContexts || []
  const weeklyPending = weekly && weekly.status !== 'ready'
  const weeklyMessage = weekly?.status === 'error' ? weekly.message : '正在同步周赛比赛与赛果待办…'
  const tasksPending = activity ? activity.status !== 'ready' : weeklyPending
  const tasksMessage = activity ? activity.message || '正在同步参赛准备与赛事待办…' : weeklyMessage
  const presentation = getSpaceOverviewPresentation(context, { taskCount: count, tasksPending, next })
  const followingFirst = Boolean(followingSummary && presentation.followingFirst)
  return <div className={styles.overview}>
    {followingFirst ? followingSummary : null}
    {presentation.collapseTasks ? <div className={styles.clearTasks}><span><i aria-hidden="true">✓</i>{uiText("目前没有需要处理的待办", locale)}</span>{allowed('tasks') ? <Link to={withSeason('/me?section=tasks&view=history')}>{uiText("查看处理记录 ↗", locale)}</Link> : null}</div> : null}
    {!followingFirst ? <div className={styles.focusGrid} data-single={presentation.collapseTasks}>
      {!presentation.collapseTasks ? <section className={styles.tasks} aria-labelledby="space-tasks-title">
        <header className={styles.sectionHead}><div><span className={styles.eyebrow}>ACTION REQUIRED</span><h2 id="space-tasks-title">{uiText("当前待办 ", locale)}<b>{tasksPending ? count ? `${count}+` : '—' : String(count).padStart(2, '0')}</b></h2></div>{allowed('tasks') && <Link to={withSeason('/me?section=tasks')}>{uiText("全部待办 ↗", locale)}</Link>}</header>
        {tasks.length ? <div className={styles.taskList}>{tasks.slice(0, 3).map((task, index) => {
          const action = getOverviewTaskAction(task)
          return <Link key={task.id} to={withSeason(action.url)} className={styles.task} data-primary={index === 0} data-deadline={task.deadline?.key}>
            <div className={styles.taskMeta}><span data-priority={task.priority}>{index === 0 ? uiText("优先处理", locale) : uiText("接着处理", locale)} · {task.dueAt ? task.deadline?.label || uiText("待处理", locale) : task.priority === 'URGENT' ? uiText("紧急", locale) : task.workflow?.label || priorities[task.priority] || uiText("待处理", locale)}</span><span>{roleLabels[task.identityType] || uiText("账号", locale)}</span></div>
            <h3>{task.title}</h3>{index === 0 && task.body ? <p className={styles.taskDescription}>{task.body}</p> : null}
            <div className={styles.taskFoot}><time dateTime={task.dueAt || undefined}>{formatTime(task.dueAt, '无固定截止时间')}{task.dueAt ? uiText(" 截止 · 北京时间", locale) : ''}</time><strong>{action.label} →</strong></div>
          </Link>
        })}{count > 3 && allowed('tasks') ? <Link className={styles.moreTasks} to={withSeason('/me?section=tasks')}>{uiText("还有 ", locale)}{count - 3}{tasksPending ? '+' : ''}{uiText(" 项待办 · 查看完整队列 ↗", locale)}</Link> : null}</div> : <div className={styles.empty}>{!tasksPending && !count && <span className={styles.emptyMark} aria-hidden="true">✓</span>}<h3>{tasksPending ? uiText("待办状态尚未同步", locale) : count ? uiText("查看待办详情", locale) : uiText("目前没有需要处理的待办", locale)}</h3><p>{tasksPending ? tasksMessage : count ? uiText("待办内容可在任务中心查看。", locale) : uiText("新的名单确认、赛程安排与赛事通知会出现在这里。", locale)}</p>{allowed('tasks') && <Link to={withSeason(count || tasksPending ? '/me?section=tasks' : '/me?section=tasks&view=history')}>{count || tasksPending ? uiText("打开任务中心", locale) : uiText("查看处理记录", locale)} →</Link>}</div>}
      </section> : null}
      <section className={styles.match} aria-labelledby="space-match-title"><header className={styles.sectionHead}><div><span className={styles.eyebrow}>{archived ? 'MATCH ARCHIVE' : 'NEXT MATCH'}</span><h2 id="space-match-title">{archived ? en ? 'Competition records' : uiText("本届比赛记录", locale) : nextIsStaff ? uiText("下一场执赛安排", locale) : uiText("下一场比赛", locale)}</h2></div><span className={styles.status}>{match ? MATCH_STATUS_LABELS[match.status] || match.statusLabel || uiText("赛程已安排", locale) : archived ? en ? 'Archived' : uiText("已归档", locale) : weeklyPending ? uiText("待同步", locale) : uiText("等待安排", locale)}</span></header>
        {match ? <><div className={styles.matchFacts}><time dateTime={match.scheduledAt || undefined}>{formatTime(match.scheduledAt)}</time><span>{match.displayName || [match.stage, match.roundLabel].filter(Boolean).join(' · ') || uiText("轮次待定", locale)}{nextIsStaff ? ` · ${roleLabels[next.role] || '工作人员'}` : ''}</span></div><div className={styles.matchTeams}><div><TeamLogo team={{ ...match.teamA, short: teamName(match.teamA) }} seasonId={context.seasonId} className={styles.logo} /><strong>{teamName(match.teamA)}</strong></div><b>VS</b><div><TeamLogo team={{ ...match.teamB, short: teamName(match.teamB) }} seasonId={context.seasonId} className={styles.logo} /><strong>{teamName(match.teamB)}</strong></div></div><div className={styles.matchActions}><Link className={canEnter ? styles.primary : ''} to={withSeason(next.actionUrl || `/matches/${encodeURIComponent(match.id)}`)}>{next.actionLabel || uiText("查看比赛详情", locale)} ↗</Link>{allowed('matches') && <Link to={withSeason('/me?section=matches')}>{uiText("全部比赛", locale)}</Link>}</div>{match?.roomAccess?.isAuthorized && !canEnter && <p className={styles.roomHint}>{match.roomAccess.label} · {match.roomAccess.detail}</p>}</> : <div className={styles.empty}><h3>{archived ? en ? 'This event has been archived' : uiText("本届赛事已归档", locale) : weeklyPending ? uiText("周赛赛程尚未同步", locale) : uiText("下一场，等待赛程确认", locale)}</h3><p>{archived ? en ? 'Review your matches and participation records. This event is read only.' : uiText("你可以回看本届比赛与参赛记录。归档赛事仅供查看。", locale) : weeklyPending ? weeklyMessage : uiText("赛程发布后，会自动展示对手、时间和比赛入口。", locale)}</p><Link to={withSeason(allowed('matches') ? '/me?section=matches' : allowed('events') ? '/me?section=events' : allowed('team') ? '/me?section=team' : '/account')}>{allowed('matches') ? uiText("查看我的比赛", locale) : allowed('events') ? uiText("查看我的赛事", locale) : allowed('team') ? uiText("查看队伍进度", locale) : uiText("查看账号设置", locale)} →</Link></div>}
      </section>
    </div> : null}
    {(tasksPending || weeklyPending) && <div className={styles.syncNotice} role={activity?.status === 'error' || weekly?.status === 'error' ? 'alert' : 'status'}><span>{tasksPending ? tasksMessage : weeklyMessage}</span>{(activity?.status === 'error' || weekly?.status === 'error') && <button type="button" onClick={activity?.refresh || weekly?.retry}>{uiText("重新同步", locale)}</button>}</div>}
    {preparation}
    {!followingFirst ? followingSummary : null}
    <section className={styles.support} aria-label={uiText("赛事概况", locale)}><Link to={withSeason(allowed('events') ? '/me?section=events' : allowed('team') ? '/me?section=team' : '/account')}><span>{uiText("本届参赛关系", locale)}</span><strong>{status?.teamLabel || (teams.length ? teams.map(item => teamName(item.seasonTeam || item.teamOrganization)).join(' / ') : uiText("查看参与状态", locale))}</strong><small>{status?.registrationLabel || uiText("报名与身份关系", locale)} ↗</small></Link>{allowed('communications') && <Link to={withSeason('/me?section=communications')}><span>{uiText("赛事消息", locale)}</span><strong>{overview.unreadNotificationCount || 0}<em>{uiText("条未读", locale)}</em></strong><small>{uiText("通知与沟通 ↗", locale)}</small></Link>}{!followingSummary ? <Link to={withSeason('/me?section=following')}><span>{uiText("关注动态", locale)}</span><strong>{uiText("我的关注", locale)}</strong><small>{uiText("队伍与选手 ↗", locale)}</small></Link> : null}</section>
    {children}
  </div>
}
