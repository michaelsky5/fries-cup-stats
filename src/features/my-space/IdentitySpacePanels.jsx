import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import EventStaffControl from '../event-staff/EventStaffControl.jsx'
import {
  buildMyEventsView,
  buildTeamEventView,
  EVENT_REGISTRATION_STATUS,
  EVENT_ROSTER_STATUS
} from './myEventsModel.js'
import { buildMyMatchesView } from './myMatchesModel.js'
import WorkspaceSectionHeader from './WorkspaceSectionHeader.jsx'
import originalStyles from './IdentitySpacePanels.module.css'
import signalStyles from '../account-ui/SignalWorkspace.module.css'
import { combineDesignStyles } from '../fd-design/designPreview.js'
const styles = combineDesignStyles(originalStyles, signalStyles)

const IDENTITY_COPY = {
  PLAYER: { label: '选手', en: 'PLAYER' },
  MANAGER: { label: '经理', en: 'MANAGER' },
  COACH: { label: '教练', en: 'COACH' },
  REFEREE: { label: '赛管', en: 'REFEREE' },
  CASTER: { label: '解说', en: 'CASTER' },
  VIEWER: { label: '普通观众', en: 'VIEWER' }
}

const TASK_PRIORITY = { URGENT: '紧急', HIGH: '重要', NORMAL: '普通', LOW: '低' }
const STAFF_MATCH_STATUS = {
  SUBMITTED: '结果审核中',
  COMPLETE: '比赛已结束',
  LOCKED: '比赛已归档',
  CANCELLED: '比赛已取消'
}
const HISTORICAL_MATCH_STATUSES = new Set(Object.keys(STAFF_MATCH_STATUS))

function formatTime(value, fallback = '时间待定') {
  return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : fallback
}

function formatSeasonRange(start, end) {
  const format = value => value ? new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' }) : ''
  const startLabel = format(start)
  const endLabel = format(end)
  return startLabel && endLabel ? `${startLabel} — ${endLabel}` : startLabel || endLabel || '时间未记录'
}

function teamName(team) {
  return team?.shortName || team?.name || 'TBD'
}

function matchTeams(match) {
  return `${teamName(match?.teamA)} VS ${teamName(match?.teamB)}`
}

export function IdentityContextStrip({ context, loading = false, error = '' }) {
  const uiLocale = useUiLocale()
  const identities = context?.identities || []
  const orderedIdentities = [...identities].sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))
  const primaryIdentity = orderedIdentities[0]
  const primaryCopy = IDENTITY_COPY[primaryIdentity?.type] || { label: primaryIdentity?.label || uiText("普通观众", uiLocale), en: primaryIdentity?.type || 'VIEWER' }
  return (
    <section className={styles.identityStrip} data-loading={loading} data-single={orderedIdentities.length <= 1 ? 'true' : 'false'}>
      <div>
        <span>CURRENT WORK IDENTITY</span>
        <strong>{loading ? uiText("正在同步工作身份…", uiLocale) : uiText("{0}视角", uiLocale, [primaryCopy.label])}</strong>
        <small>{error || (identities.length > 1 ? uiText("默认身份决定空间首页的优先内容，可在账号中心切换。", uiLocale) : uiText("身份与本届赛事关系已同步。", uiLocale))}</small>
      </div>
      <div className={styles.identityChips}>{orderedIdentities.length ? orderedIdentities.map(identity => { const copy = IDENTITY_COPY[identity.type] || { label: identity.label || identity.type, en: identity.type }; return <span key={identity.id || identity.type} data-type={identity.type} data-primary={identity.isPrimary ? 'true' : 'false'}><b>{copy.label}</b><em>{copy.en}</em><small>{identity.isPrimary ? uiText("当前默认 · ", uiLocale) : ''}{identity.seasonContextCount ? uiText("{0} 项本届关系", uiLocale, [identity.seasonContextCount]) : uiText("长期身份", uiLocale)}</small></span> }) : <span data-type="VIEWER" data-primary="true"><b>{uiText("普通观众", uiLocale)}</b><em>VIEWER</em><small>{uiText("当前默认账号视角", uiLocale)}</small></span>}</div>
    </section>
  )
}

function NextMatchCard({ match, label, withSeason }) {
  const uiLocale = useUiLocale()
  if (!match) return <div className={styles.miniEmpty}><strong>{uiText("暂无下一场安排", uiLocale)}</strong><p>{uiText("赛程或排班确认后会自动出现在这里。", uiLocale)}</p></div>
  return <article className={styles.nextCard}><header><span>{label}</span><em>{match.status}</em></header><h3>{matchTeams(match)}</h3><p>{match.displayName}</p><dl><div><dt>{uiText("时间", uiLocale)}</dt><dd>{formatTime(match.scheduledAt)}</dd></div><div><dt>{uiText("阶段", uiLocale)}</dt><dd>{match.stage} · {match.roundLabel || uiText("待定", uiLocale)}</dd></div></dl><Link to={withSeason(`/matches/${encodeURIComponent(match.id)}`)}>{uiText("查看比赛 →", uiLocale)}</Link></article>
}

function TeamContextCard({ teamContext, withSeason }) {
  const uiLocale = useUiLocale()
  const eventView = buildTeamEventView(teamContext)
  const team = teamContext.seasonTeam || teamContext.teamOrganization
  const permissions = teamContext.capabilities || {}
  const ownMember = teamContext.roster?.ownMember
  const rosterStatusLabel = EVENT_ROSTER_STATUS[teamContext.roster?.status] || teamContext.roster?.status
  const rosterSummary = !teamContext.roster
    ? '尚未提交'
    : ownMember
      ? `${rosterStatusLabel} · 已在名单`
      : `${rosterStatusLabel} · ${teamContext.roster.memberCount} 人 · V${teamContext.roster.version}`
  return (
    <article className={styles.teamCard} data-tone={eventView.tone}>
      <header>
        <div><span>{teamContext.roleLabels?.join(' / ') || uiText("赛事关系", uiLocale)}</span><h3>{teamName(team)}</h3><p>{team?.name || teamContext.teamOrganization?.name}</p></div>
        <em data-status={teamContext.registrationStatus}>{EVENT_REGISTRATION_STATUS[teamContext.registrationStatus] || teamContext.registrationStatus}</em>
      </header>
      <div className={styles.teamStage} data-tone={eventView.tone}><span>{eventView.stage}</span><strong>{eventView.headline}</strong><p>{eventView.description}</p></div>
      <dl>
        <div><dt>{uiText("本届报名", uiLocale)}</dt><dd>{EVENT_REGISTRATION_STATUS[teamContext.registrationStatus] || teamContext.registrationStatus}</dd></div>
        <div><dt>{ownMember ? uiText("我的名单状态", uiLocale) : uiText("注册名单", uiLocale)}</dt><dd>{rosterSummary}</dd></div>
        <div><dt>{uiText("队长", uiLocale)}</dt><dd>{teamContext.leadership?.managerIsDefaultCaptain ? uiText("经理默认兼任", uiLocale) : teamContext.leadership?.captain?.displayName || uiText("待指定", uiLocale)}</dd></div>
        <div><dt>{uiText("下一场", uiLocale)}</dt><dd>{teamContext.nextMatch ? formatTime(teamContext.nextMatch.scheduledAt) : uiText("暂无", uiLocale)}</dd></div>
      </dl>
      <div className={styles.actions}>{permissions.canManageTeam ? <Link to={withSeason('/me?section=team')}>{uiText("管理报名与阵容", uiLocale)}</Link> : <Link to={withSeason('/me?section=team')}>{uiText("查看队伍关系", uiLocale)}</Link>}{permissions.canNegotiateSchedule ? <Link to={withSeason('/me?section=matches')}>{uiText("赛程协商", uiLocale)}</Link> : null}{permissions.canSubmitAppeal ? <Link to={withSeason('/me?section=communications')}>{uiText("赛事申诉", uiLocale)}</Link> : null}</div>
      {permissions.readOnly ? <p className={styles.readOnly}>{uiText("当前关系为只读；教练可查看队伍赛事信息，但不能代替经理提交报名、阵容或申诉。", uiLocale)}</p> : null}
    </article>
  )
}

function StaffEventCard({ staffView, withSeason }) {
  const uiLocale = useUiLocale()
  const nextAssignment = staffView.nextAssignment || null
  return (
    <article className={styles.staffEventCard} data-role={staffView.role}>
      <header><div><span>{staffView.en} RELATION</span><strong>{staffView.label}{uiText("赛事关系", uiLocale)}</strong></div><em>{staffView.statusLabel}</em></header>
      <div className={styles.staffEventFacts}><div><span>{uiText("本届状态", uiLocale)}</span><strong>{staffView.statusLabel}</strong></div><div><span>{uiText("正式排班", uiLocale)}</span><strong>{staffView.assignmentCount}{uiText(" 场", uiLocale)}</strong></div><div><span>{uiText("下一项安排", uiLocale)}</span><strong>{nextAssignment?.match ? formatTime(nextAssignment.match.scheduledAt) : uiText("暂无", uiLocale)}</strong></div></div>
      <Link to={withSeason(staffView.actionUrl)}>{uiText("打开", uiLocale)}{staffView.label}{uiText("工作台 →", uiLocale)}</Link>
    </article>
  )
}

function PlayerEligibilityPanel({ eligibility, withSeason }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.playerEligibility} data-tone={eligibility.tone}>
      <div className={styles.playerEligibilityMain}>
        <span>{eligibility.eyebrow}</span>
        <strong>{eligibility.headline}</strong>
        <p>{eligibility.description}</p>
        <dl>
          <div><dt>{uiText("本届队伍", uiLocale)}</dt><dd>{eligibility.teamLabel}</dd></div>
          <div><dt>{uiText("报名关系", uiLocale)}</dt><dd>{eligibility.registrationLabel}</dd></div>
          <div><dt>{uiText("名单位置", uiLocale)}</dt><dd>{eligibility.rosterLabel}</dd></div>
        </dl>
        <div><Link to={withSeason('/me?section=team')}>{uiText("查看队伍与阵容 →", uiLocale)}</Link><Link to={withSeason('/me?section=communications&view=messages')}>{uiText("查看资格消息 →", uiLocale)}</Link></div>
      </div>
      <div className={styles.playerEligibilitySide}>
        <span>OFFICIAL APPEARANCE</span>
        <strong>{eligibility.mapsPlayed}</strong>
        <em>{uiText("张正式地图", uiLocale)}</em>
        <p>{eligibility.appearanceLabel}</p>
      </div>
    </section>
  )
}

function PlayerEventHistory({ records }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.playerEventHistory}>
      <header>
        <div><span>PLAYER EVENT ARCHIVE</span><h2>{uiText("历史届次", uiLocale)}</h2><p>{uiText("这里只保留已经锁定的正式选手关系；仅报名或候选但未进入正式名单的经历不会算作参赛档案。", uiLocale)}</p></div>
        <em>{records.length} SEASONS</em>
      </header>
      {records.length ? <div className={styles.playerEventHistoryGrid}>{records.map(record => (
        <article key={`${record.seasonId}-${record.registrationId}`} data-appearance={record.hasAppearance ? 'true' : 'false'}>
          <div className={styles.historySeason}><span>{record.seasonStatusLabel}</span><strong>{record.seasonName}</strong><small>{formatSeasonRange(record.startsAt, record.endsAt)}</small></div>
          <div className={styles.historyTeam}><span>OFFICIAL TEAM</span><strong>{record.teamLabel}</strong><p>{record.rosterPosition} · {record.roleLabel}</p></div>
          <dl>
            <div><dt>{uiText("正式出场", uiLocale)}</dt><dd>{record.appearanceLabel}</dd></div>
            <div><dt>{uiText("最终成绩", uiLocale)}</dt><dd>{record.finalRankLabel}</dd></div>
            <div><dt>{uiText("转会记录", uiLocale)}</dt><dd>{record.transferCount ? uiText("{0} 次", uiLocale, [record.transferCount]) : uiText("无", uiLocale)}</dd></div>
          </dl>
          <footer><span>{record.hasAppearance ? uiText("已形成正式出场记录", uiLocale) : uiText("正式名单成员 · 未出场", uiLocale)}</span><em>{uiText("只读档案", uiLocale)}</em></footer>
        </article>
      ))}</div> : <div className={styles.playerEventHistoryEmpty}><span>NO ARCHIVED SEASON</span><strong>{uiText("暂时没有往届正式参赛档案", uiLocale)}</strong><p>{uiText("当一届赛事的正式名单锁定后，该届队伍、职责、出场地图和最终成绩会保留在这里。", uiLocale)}</p></div>}
    </section>
  )
}

export function GeneralSpaceOverview({ context, withSeason, showNextEvent = true, playerStatus = null, managerStatus = null }) {
  const uiLocale = useUiLocale()
  const tasks = context?.overview?.tasks || []
  const nextStaff = context?.overview?.nextStaffAssignment
  const unreadNotifications = context?.overview?.unreadNotificationCount || 0
  return (
    <div className={styles.overviewGrid} data-layout={showNextEvent ? 'split' : 'action-only'} data-has-tasks={tasks.length ? 'true' : 'false'}>
      {tasks.length ? <section className={styles.priorityPanel} data-has-tasks="true">
        <header><div><span>ACTION FIRST</span><h2>{tasks.length ? uiText("优先处理", uiLocale) : uiText("当前状态正常", uiLocale)}</h2><p>{tasks.length ? uiText("只展示最需要你回应的事项，完整记录保留在任务中心。", uiLocale) : uiText("暂时没有必须回应的邀请、阵容、赛程或排班事项。", uiLocale)}</p></div><div className={styles.priorityActions}><Link to={withSeason('/me?section=tasks')}>{context?.overview?.openTaskCount || 0}{uiText(" 项待办 →", uiLocale)}</Link>{unreadNotifications ? <Link to={withSeason('/me?section=communications&view=messages')}>{unreadNotifications}{uiText(" 条未读 →", uiLocale)}</Link> : null}</div></header>
        <div className={styles.taskList}>{tasks.slice(0, 3).map(task => <Link key={task.id} to={withSeason(task.actionUrl || '/me?section=tasks')}><em data-priority={task.priority}>{TASK_PRIORITY[task.priority] || task.priority}</em><div><strong>{task.title}</strong><span>{task.identityType || uiText("账号", uiLocale)} · {formatTime(task.dueAt, '无固定截止')}</span></div><b>→</b></Link>)}</div>
      </section> : null}
      {showNextEvent ? <section className={styles.nextPanel}><header><span>NEXT EVENT</span><h2>{uiText("下一项赛事安排", uiLocale)}</h2></header>{context?.overview?.nextTeamMatch ? <NextMatchCard match={context.overview.nextTeamMatch} label="TEAM MATCH" withSeason={withSeason} /> : nextStaff?.match ? <NextMatchCard match={nextStaff.match} label={nextStaff.assignmentType === 'CASTER' ? 'CASTING' : 'REFEREE'} withSeason={withSeason} /> : <div className={styles.miniEmpty}><strong>{uiText("暂无比赛或工作人员排班", uiLocale)}</strong><p>{uiText("你仍可查看关注队伍的比赛与最新赛果。", uiLocale)}</p><Link to={withSeason('/me?section=following')}>{uiText("查看我的关注 →", uiLocale)}</Link></div>}</section> : null}
      {playerStatus ? <section className={styles.statRail} data-variant="player"><Link to={withSeason('/me?section=events')}><span>{uiText("本届队伍关系", uiLocale)}</span><strong>{playerStatus.key === 'WAITING_TEAM' ? playerStatus.teamLabel : uiText("已建立", uiLocale)}</strong><small>{uiText("查看详情 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=team')}><span>{uiText("名单状态", uiLocale)}</span><strong>{playerStatus.rosterLabel}</strong><small>{uiText("查看名单 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=matches')}><span>{uiText("关联比赛", uiLocale)}</span><strong>{playerStatus.matchCount}</strong><small>{uiText("场 · 查看 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=communications&view=messages')}><span>{uiText("未读消息", uiLocale)}</span><strong>{context?.overview?.unreadNotificationCount || 0}</strong><small>{uiText("查看 →", uiLocale)}</small></Link></section> : managerStatus ? <section className={styles.statRail} data-variant="manager"><Link to={withSeason('/me?section=team')}><span>{uiText("本届队伍关系", uiLocale)}</span><strong>{managerStatus.teamCount ? uiText("已建立", uiLocale) : managerStatus.teamLabel}</strong><small>{managerStatus.registrationLabel} →</small></Link><Link to={withSeason('/me?section=team')}><span>{uiText("候选阵容", uiLocale)}</span><strong>{managerStatus.candidateCount}</strong><small>{uiText("人 · 管理 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=team')}><span>{uiText("待审核申请", uiLocale)}</span><strong>{managerStatus.pendingApplicationCount}</strong><small>{uiText("条 · 处理 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=matches')}><span>{uiText("关联比赛", uiLocale)}</span><strong>{managerStatus.matchCount}</strong><small>{uiText("场 · 查看 →", uiLocale)}</small></Link></section> : <section className={styles.statRail}><div><span>{uiText("当前身份", uiLocale)}</span><strong>{context?.identities?.length || 1}</strong><small>{uiText("个", uiLocale)}</small></div><Link to={withSeason('/me?section=events')}><span>{uiText("赛事队伍关系", uiLocale)}</span><strong>{context?.teamContexts?.length || 0}</strong><small>{uiText("查看 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=communications&view=messages')}><span>{uiText("未读消息", uiLocale)}</span><strong>{context?.overview?.unreadNotificationCount || 0}</strong><small>{uiText("查看 →", uiLocale)}</small></Link><Link to={withSeason('/me?section=events')}><span>{uiText("工作人员任务", uiLocale)}</span><strong>{(context?.staffContext?.refereeAssignments?.length || 0) + (context?.staffContext?.casterAssignments?.length || 0)}</strong><small>{uiText("查看 →", uiLocale)}</small></Link></section>}
    </div>
  )
}

export function ManagerSpaceOverview({ context, managerStatus, withSeason }) {
  const uiLocale = useUiLocale()
  const tasks = context?.overview?.tasks || []
  const nextMatch = context?.overview?.nextTeamMatch
  const unreadNotifications = Number(context?.overview?.unreadNotificationCount || 0)
  const firstTask = tasks[0] || null
  const workflowComplete = managerStatus.steps.length > 0 && managerStatus.completedCount === managerStatus.steps.length
  return (
    <section className={styles.managerWorkspace} data-theme="operations">
      {firstTask ? (
        <section className={styles.managerAlertBar} data-priority={firstTask.priority}>
          <div><span>{TASK_PRIORITY[firstTask.priority] || firstTask.priority}{uiText("待办", uiLocale)}</span><strong>{firstTask.title}</strong><small>{formatTime(firstTask.dueAt, '无固定截止')}</small></div>
          <Link to={withSeason(firstTask.actionUrl || '/me?section=tasks')}>{uiText("现在处理 →", uiLocale)}</Link>
          {managerStatus.openTaskCount > 1 ? <Link to={withSeason('/me?section=tasks')}>{uiText("其余 ", uiLocale)}{managerStatus.openTaskCount - 1}{uiText(" 项", uiLocale)}</Link> : null}
        </section>
      ) : null}

      <section className={styles.managerMatchDay} data-mode={nextMatch ? 'match' : 'workflow'}>
        <div className={styles.managerMatchDayMain}>
          <header><span>{nextMatch ? 'NEXT TEAM MATCH' : 'CURRENT TEAM STEP'}</span><em>{nextMatch ? nextMatch.status || 'PENDING' : `${managerStatus.completedCount} / ${managerStatus.steps.length}`}</em></header>
          {nextMatch ? (
            <>
              <div className={styles.managerMatchDayTeams}><strong>{teamName(nextMatch.teamA)}</strong><b>VS</b><strong>{teamName(nextMatch.teamB)}</strong></div>
              <p>{nextMatch.displayName || `${nextMatch.stage || '赛事'} · ${nextMatch.roundLabel || '轮次待定'}`}</p>
              <time dateTime={nextMatch.scheduledAt || undefined}>{formatTime(nextMatch.scheduledAt)}</time>
              <Link className={styles.managerPrimaryAction} to={withSeason(`/matches/${encodeURIComponent(nextMatch.id)}`)}>{uiText("查看下一场比赛 →", uiLocale)}</Link>
            </>
          ) : (
            <>
              <strong className={styles.managerWorkflowTitle}>{managerStatus.headline}</strong>
              <p>{managerStatus.description}</p>
              <Link className={styles.managerPrimaryAction} to={withSeason(managerStatus.actionUrl)}>{managerStatus.actionLabel} →</Link>
            </>
          )}
        </div>
        <aside className={styles.managerMatchDayRail}>
          <Link to={withSeason('/me?section=communications&view=messages')}><span>{uiText("未读赛事消息", uiLocale)}</span><strong>{unreadNotifications}</strong><small>{unreadNotifications ? uiText("需要查看", uiLocale) : uiText("当前已读完", uiLocale)} →</small></Link>
          <Link to={withSeason('/me?section=following')}><span>{uiText("我的关注", uiLocale)}</span><strong>{uiText("比赛近况", uiLocale)}</strong><small>{uiText("查看关联比赛 →", uiLocale)}</small></Link>
          <Link to={withSeason('/me?section=team')}><span>{uiText("正式名单", uiLocale)}</span><strong>{managerStatus.rosterLabel}</strong><small>{uiText("队伍工作台 →", uiLocale)}</small></Link>
        </aside>
      </section>

      <section className={styles.managerSecondaryActions} aria-label={uiText("经理快捷入口", uiLocale)}>
        <Link to={withSeason('/me?section=matches')}><span>MATCHES</span><strong>{uiText("全部比赛与赛程协商", uiLocale)}</strong><b>→</b></Link>
        <Link to={withSeason('/me?section=tasks')}><span>TASKS</span><strong>{managerStatus.openTaskCount ? uiText("{0} 项待办", uiLocale, [managerStatus.openTaskCount]) : uiText("待办已处理完", uiLocale)}</strong><b>→</b></Link>
        <Link to={withSeason('/me?section=team')}><span>TEAM</span><strong>{uiText("报名、名单与长期队伍", uiLocale)}</strong><b>→</b></Link>
      </section>

      <details className={styles.managerJourneyDisclosure} open={!workflowComplete}>
        <summary><div><span>TEAM REGISTRATION PIPELINE</span><strong>{workflowComplete ? uiText("本届报名与名单流程已完成", uiLocale) : uiText("本届队伍流程", uiLocale)}</strong><small>{workflowComplete ? uiText("赛中阶段默认收起，需要时仍可查看完整记录。", uiLocale) : uiText("完成当前阶段后，系统会自动推进到下一步。", uiLocale)}</small></div><em>{managerStatus.completedCount} / {managerStatus.steps.length}{uiText(" 已完成", uiLocale)}</em><b aria-hidden="true">＋</b></summary>
        <ol>
          {managerStatus.steps.map((step, index) => <li key={step.key} data-state={step.state}><span>{String(index + 1).padStart(2, '0')}</span><div><em>{step.state === 'done' ? uiText("已完成", uiLocale) : step.state === 'attention' ? uiText("需要处理", uiLocale) : step.state === 'current' ? uiText("当前阶段", uiLocale) : uiText("等待前序", uiLocale)}</em><strong>{step.label}</strong><p>{step.detail}</p></div></li>)}
        </ol>
      </details>
    </section>
  )
}

export function MyEventsPanel({ context, withSeason }) {
  const uiLocale = useUiLocale()
  const view = buildMyEventsView(context)
  const teamIdentity = ['PLAYER', 'MANAGER', 'COACH'].includes(view.identity.type)
  const journey = view.journey
  return (
    <section className={`${styles.workspace} ${styles.eventsWorkspace}`}>
      <WorkspaceSectionHeader
        eyebrow="MY EVENTS"
        title={uiText("我的赛事", uiLocale)}
        description={uiText("查看本届实际参赛关系、当前阶段和下一步；长期身份不会自动获得每届赛事权限。", uiLocale)}
        badge={view.seasonId}
      />

      <section className={styles.eventHero} data-tone={view.currentAction.tone}>
        <div className={styles.eventHeroMain}><span>CURRENT SEASON ACTION</span><strong>{view.currentAction.headline}</strong><p>{view.currentAction.description}</p><Link to={withSeason(view.currentAction.url)}>{view.currentAction.label} →</Link></div>
        <div className={styles.eventHeroIdentity}><span>ACTIVE EVENT ROLE</span><strong>{view.identity.label}</strong><em>{view.identity.en}</em><p>{uiText("当前阶段：", uiLocale)}{journey.currentStep?.detail || uiText("等待本届赛事关系更新", uiLocale)}</p></div>
      </section>

      <div className={styles.eventFactRail}>{view.facts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}</div>

      {view.identity.type === 'PLAYER' ? <PlayerEligibilityPanel eligibility={view.playerEligibility} withSeason={withSeason} /> : null}

      <section className={styles.eventJourney} data-role={view.identity.type}>
        <header>
          <div><span>{journey.eyebrow}</span><h2>{journey.title}</h2><p>{journey.description}</p></div>
          <em>{journey.completedCount} / {journey.total}{uiText(" 已完成", uiLocale)}</em>
        </header>
        <ol className={styles.eventJourneySteps}>
          {journey.steps.map((step, index) => (
            <li key={step.key} data-state={step.state}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><em>{step.state === 'done' ? uiText("已完成", uiLocale) : step.state === 'attention' ? uiText("需要处理", uiLocale) : step.state === 'current' ? uiText("当前阶段", uiLocale) : uiText("等待前序", uiLocale)}</em><strong>{step.label}</strong><p>{step.detail}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {view.teamContexts.length ? (
        <section className={styles.eventRelationSection}>
          <header><div><span>TEAM RELATIONSHIPS</span><h2>{uiText("本届队伍关系", uiLocale)}</h2><p>{uiText("同一账号可以拥有多个身份，但每一张卡片只代表这一届已经成立的队伍关系。", uiLocale)}</p></div><em>{view.teamContexts.length} TEAMS</em></header>
          <div className={styles.teamGrid}>{view.teamContexts.map(teamContext => <TeamContextCard key={teamContext.registrationId} teamContext={teamContext} withSeason={withSeason} />)}</div>
        </section>
      ) : teamIdentity ? (
        <section className={styles.eventOnboarding} data-role={view.identity.type}><div><span>{view.relationshipGuide.eyebrow}</span><strong>{view.relationshipGuide.headline}</strong><p>{view.relationshipGuide.description}</p></div><Link to={withSeason('/me?section=team')}>{view.relationshipGuide.label} →</Link></section>
      ) : null}

      {view.staffViews.length ? (
        <section className={styles.eventRelationSection}>
          <header><div><span>EVENT STAFF RELATIONSHIPS</span><h2>{uiText("本届工作人员关系", uiLocale)}</h2><p>{uiText("长期身份、参与确认和单场排班分别计算；只有正式排班会授予对应场次权限。", uiLocale)}</p></div><em>{view.staffViews.reduce((sum, item) => sum + item.assignmentCount, 0)} ASSIGNMENTS</em></header>
          <div className={styles.staffEventGrid}>{view.staffViews.map(staffView => <StaffEventCard key={staffView.role} staffView={staffView} withSeason={withSeason} />)}</div>
        </section>
      ) : null}

      {view.identity.type === 'PLAYER' ? <PlayerEventHistory records={view.playerHistory} /> : null}

      {!view.teamContexts.length && !view.staffViews.length && !teamIdentity ? <section className={styles.viewerEventCard}><div><span>VIEWER PARTICIPATION</span><strong>{uiText("本届赛事仍然可以完整参与", uiLocale)}</strong><p>{uiText("关注队伍与选手、查看关联赛程、赛果与正式出场记录。", uiLocale)}</p></div><div><Link to={withSeason('/me?section=following')}>{uiText("管理我的关注 →", uiLocale)}</Link><Link to={withSeason('/matches')}>{uiText("查看赛事赛程 →", uiLocale)}</Link></div></section> : null}
    </section>
  )
}

export function RelationshipMatchesPanel({ context, withSeason }) {
  const uiLocale = useUiLocale()
  const view = buildMyMatchesView(context)
  const nextMatch = view.nextMatch
  return (
    <section className={`${styles.workspace} ${styles.matchesWorkspace}`}>
      <WorkspaceSectionHeader
        eyebrow="RELATIONSHIP MATCHES"
        title={uiText("我的比赛", uiLocale)}
        description={uiText("仅汇总你在本届赛事关系下关联的比赛；比赛房默认赛前 30 分钟开放，赛后保留只读记录。", uiLocale)}
        badge={`${view.facts[0].value} MATCHES`}
      />

      {view.negotiationTasks.length ? <section className={styles.matchAttention}><div><span>SCHEDULE ACTION</span><strong>{view.currentAction.headline}</strong><p>{view.currentAction.description}</p></div><Link to={withSeason(view.currentAction.url)}>{view.currentAction.label} →</Link></section> : null}

      {nextMatch ? (
        <section key={nextMatch.id} className={styles.nextMatchHero} data-state={nextMatch.timeState.key}>
          <div className={styles.nextMatchMain}>
            <span>NEXT MATCH</span>
            <strong>{nextMatch.matchup || matchTeams(nextMatch)}</strong>
            <p>{nextMatch.displayName || `${nextMatch.stage || '赛事阶段'} · ${nextMatch.roundLabel || '轮次待定'}`}</p>
            <div className={styles.nextMatchAccess}>
              <div data-state={nextMatch.roomAccess.isAuthorized ? nextMatch.roomAccess.state : 'READ_ONLY'}><span>{uiText("比赛房间", uiLocale)}</span><strong>{nextMatch.roomAccess.label}</strong><small>{nextMatch.roomAccess.detail}</small></div>
              <div data-state={nextMatch.scheduleAccess.key}><span>{uiText("赛程权限", uiLocale)}</span><strong>{nextMatch.scheduleAccess.label}</strong><small>{nextMatch.scheduleAccess.detail}</small></div>
            </div>
            <div className={styles.nextMatchActions}>
              <Link to={withSeason(`/matches/${encodeURIComponent(nextMatch.id)}`)}>{uiText("查看比赛资料 →", uiLocale)}</Link>
              {nextMatch.canNegotiateSchedule ? <Link to={withSeason('/me?section=matches#schedule-negotiation')}>{uiText("赛程协商 →", uiLocale)}</Link> : null}
            </div>
          </div>
          <div className={styles.nextMatchTime}><span>{nextMatch.timeState.label}</span><strong>{formatTime(nextMatch.scheduledAt)}</strong><em>{nextMatch.statusLabel}</em><p>{nextMatch.stage || uiText("阶段待定", uiLocale)} · {nextMatch.roundLabel || uiText("轮次待定", uiLocale)}</p></div>
        </section>
      ) : (
        <section key="empty" className={styles.matchEmptyHero}><div><span>NO RELATED MATCH</span><strong>{view.currentAction.headline}</strong><p>{view.currentAction.description}</p></div><Link to={withSeason(view.currentAction.url)}>{view.currentAction.label} →</Link></section>
      )}

      <div className={styles.matchFactRail}>{view.facts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}</div>

      {view.negotiableMatches.length ? <MatchCollection title={uiText("需要处理的赛程协商", uiLocale)} eyebrow="SCHEDULE NEGOTIATION" description={uiText("这些比赛已排定正式时间且你的赛事关系具备协商权限；是否处于开放窗口，以协商工作台为准。", uiLocale)} matches={view.negotiableMatches} withSeason={withSeason} negotiation /> : null}
      {view.upcomingMatches.length ? <MatchCollection title={uiText("接下来的比赛", uiLocale)} eyebrow="UPCOMING MATCHES" description={uiText("除主卡以外的后续关联比赛，按正式比赛时间排列。", uiLocale)} matches={view.upcomingMatches} withSeason={withSeason} /> : null}
      {view.historyMatches.length ? <MatchCollection title={uiText("历史比赛", uiLocale)} eyebrow="MATCH HISTORY" description={uiText("已完成、已锁定或已取消的本届关联比赛。", uiLocale)} matches={view.historyMatches} withSeason={withSeason} history /> : null}
    </section>
  )
}

function MatchCollection({ title, eyebrow, description, matches, withSeason, negotiation = false, history = false }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.matchCollection}>
      <header><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div><em>{matches.length} MATCHES</em></header>
      <div className={styles.matchCollectionList}>{matches.map(match => (
        <article key={match.id} data-state={match.timeState.key}>
          <div className={styles.matchCollectionTime}><span>{match.timeState.label}</span><strong>{formatTime(match.scheduledAt)}</strong></div>
          <div className={styles.matchCollectionTeams}><strong>{match.matchup}</strong><span>{match.displayName || `${match.stage || '赛事阶段'} · ${match.roundLabel || '轮次待定'}`}</span></div>
          <div className={styles.matchCollectionState}><em>{match.statusLabel}</em>{history && match.score ? <strong>{match.score}</strong> : <span>{match.roomAccess.label}</span>}</div>
          <div className={styles.matchCollectionActions}><Link to={withSeason(`/matches/${encodeURIComponent(match.id)}`)}>{uiText("比赛资料 →", uiLocale)}</Link>{negotiation ? <Link to={withSeason('/me?section=matches#schedule-negotiation')}>{uiText("协商工作台 →", uiLocale)}</Link> : null}</div>
        </article>
      ))}</div>
    </section>
  )
}

function StaffAssignmentList({ assignments, kind, withSeason }) {
  const uiLocale = useUiLocale()
  if (!assignments?.length) return <div className={styles.miniEmpty}><strong>{uiText("本届暂无", uiLocale)}{kind === 'CASTER' ? uiText("解说", uiLocale) : uiText("赛管", uiLocale)}{uiText("任务", uiLocale)}</strong><p>{uiText("长期身份已保留，只有被正式分配后才会获得单场操作权限。", uiLocale)}</p></div>
  return <div className={styles.staffList} data-kind={kind}>{assignments.map(assignment => {
    const match = assignment.match
    const isCaster = kind === 'CASTER'
    const isHistorical = HISTORICAL_MATCH_STATUSES.has(match?.status)
    const assignmentLabel = { ASSIGNED: '已分配', CONFIRMED: '已确认', PENDING: '等待确认', CANCELLED: '已取消' }[assignment.status] || '已分配'
    const statusLabel = STAFF_MATCH_STATUS[match?.status] || (assignment.locked ? '排班已锁定' : assignmentLabel)
    return <article key={assignment.id} data-history={isHistorical ? 'true' : 'false'}>
      <header><span>{kind}</span><em>{statusLabel}</em></header>
      <h3>{matchTeams(match)}</h3>
      <p>{match?.displayName} · {formatTime(match?.scheduledAt)}</p>
      <dl className={styles.staffAssignmentFacts}>
        {isCaster ? <><div><dt>{uiText("播出方案", uiLocale)}</dt><dd>{assignment.plan?.name || uiText("待配置", uiLocale)}</dd></div><div><dt>{uiText("直播入口", uiLocale)}</dt><dd>{assignment.streamUrl ? uiText("已配置", uiLocale) : uiText("待配置", uiLocale)}</dd></div></> : <><div><dt>{uiText("排班状态", uiLocale)}</dt><dd>{isHistorical ? uiText("只读归档", uiLocale) : assignmentLabel}</dd></div><div><dt>{uiText("比赛房间", uiLocale)}</dt><dd>{isHistorical ? uiText("保留赛后记录", uiLocale) : uiText("开放后从比赛页进入", uiLocale)}</dd></div></>}
      </dl>
      <div className={styles.actions}>
        <Link to={withSeason(`/matches/${encodeURIComponent(match?.id || '')}`)}>{isCaster ? uiText("查看比赛与播出资料", uiLocale) : uiText("查看比赛与执裁资料", uiLocale)}</Link>
        {isCaster && assignment.streamUrl ? <a href={assignment.streamUrl} target="_blank" rel="noreferrer">{uiText("打开直播地址", uiLocale)}</a> : null}
      </div>
    </article>
  })}</div>
}

export function RefereeWorkspace({ context, withSeason, onContextChange, preview = false }) {
  const uiLocale = useUiLocale()
  const direct = context?.staffContext?.refereeAssignments || []
  const broadcast = context?.staffContext?.broadcastRefereeAssignments || []
  return <section className={styles.workspace}><WorkspaceSectionHeader eyebrow="REFEREE DESK" title={uiText("赛管任务", uiLocale)} description={uiText("优先查看需要执裁的场次、时间与状态；比赛房间开放后再从比赛资料页进入。", uiLocale)} badge={`${direct.length + broadcast.length} ASSIGNMENTS`} />{preview ? null : <EventStaffControl seasonId={context?.seasonId} role="REFEREE" capabilitySnapshot={context?.capabilitySnapshot} onContextChange={onContextChange} />}<StaffAssignmentList assignments={[...direct, ...broadcast]} kind="REFEREE" withSeason={withSeason} /></section>
}

export function CasterWorkspace({ context, withSeason, onContextChange, preview = false }) {
  const uiLocale = useUiLocale()
  const assignments = context?.staffContext?.casterAssignments || []
  const availability = context?.staffContext?.availability || []
  return <section className={styles.workspace}><WorkspaceSectionHeader eyebrow="CASTER DESK" title={uiText("解说安排", uiLocale)} description={uiText("集中查看档期、正式排班、播出方案和直播入口，不显示与解说无关的比赛操作。", uiLocale)} badge={`${assignments.length} MATCHES`} />{preview ? null : <EventStaffControl seasonId={context?.seasonId} role="CASTER" capabilitySnapshot={context?.capabilitySnapshot} onContextChange={onContextChange} />}{availability.length ? <div className={styles.availability}>{availability.map(item => <div key={item.id}><span>{item.formTitle}</span><strong>{item.formStatus || uiText("已提交", uiLocale)}</strong><em>{formatTime(item.submittedAt)}</em></div>)}</div> : null}<StaffAssignmentList assignments={assignments} kind="CASTER" withSeason={withSeason} /></section>
}
