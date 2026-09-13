import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  identityTypeLabel,
  findTaskDetail,
  resolveWorkflowActionUrl
} from './taskNotificationModel.js'
import styles from './TaskNotificationCenter.module.css'

const TASK_STATUS = {
  OPEN: '待处理',
  COMPLETED: '已完成',
  EXPIRED: '已过期',
  CANCELLED: '已取消'
}

const PRIORITY_LABEL = {
  LOW: '一般',
  NORMAL: '普通',
  HIGH: '重要',
  URGENT: '紧急',
  IMPORTANT: '重要'
}

function formatTime(value) {
  if (!value) return '无截止时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待确认'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function formatRecordedTime(value) {
  if (!value) return '时间未记录'
  return formatTime(value)
}

function HistoryEmptyState({ weekly }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.emptyState}>
      <span>HISTORY EMPTY</span>
      <strong>{uiText("暂时没有处理记录", uiLocale)}</strong>
      <p>{weekly ? uiText("这里展示已记录的赛事任务。周赛确认和名单记录可在对应的队伍、比赛流程内查看。", uiLocale) : uiText("你完成、撤销或失效的赛事任务会按时间保留在这里。", uiLocale)}</p>
    </div>
  )
}

function TaskCard({ task, index, workingId, onComplete, withSeason, history = false, focused = false }) {
  const uiLocale = useUiLocale()
  const actionUrl = resolveWorkflowActionUrl(task.resolvedActionUrl, withSeason)
  const deadline = task.deadline
  const resolution = history ? task.closure : task.actionMode
  return (
    <article className={styles.item} data-status={task.status} data-deadline={deadline.key} key={task.id}>
      <div className={styles.itemOrder} aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className={styles.itemMain}>
        <div className={styles.itemMeta}>
          <span>{task.status === 'OPEN' ? deadline.label : TASK_STATUS[task.status] || task.status}</span>
          <em>{PRIORITY_LABEL[task.priority] || task.priority}</em>
          <b>{task.workflow.label}</b>
          <b>{identityTypeLabel(task.identityType)}</b>
          {task.teamOrganization?.shortName || task.teamOrganization?.name ? <b>{task.teamOrganization.shortName || task.teamOrganization.name}</b> : null}
        </div>
        <h3>{task.title}</h3>
        {task.body ? <p>{task.body}</p> : null}
        {resolution && !(history && focused) ? <div className={styles.itemResolution} data-kind={resolution.key}><strong>{resolution.label}</strong><span>{resolution.detail}</span></div> : null}
        <small>{task.status === 'OPEN' ? task.dueAt ? uiText("截止 {0}", uiLocale, [formatTime(task.dueAt)]) : uiText("无固定截止时间", uiLocale) : `${TASK_STATUS[task.status] || '创建'} · ${formatRecordedTime(task.completedAt || task.updatedAt || task.createdAt)}`}</small>
      </div>
      <div className={styles.itemAction}>
        {task.status === 'OPEN' && actionUrl ? <Link to={actionUrl}>{task.requiresSourceResolution === false ? uiText("查看详情", uiLocale) : uiText("进入流程", uiLocale)}</Link> : null}
        {task.status === 'OPEN' && task.requiresSourceResolution === false ? (
          <button type="button" disabled={workingId === task.id} onClick={() => onComplete(task)}>{workingId === task.id ? uiText("提交中", uiLocale) : uiText("确认完成", uiLocale)}</button>
        ) : null}
        {history && !focused ? <span>{task.closure.label}{uiText(" · 只读", uiLocale)}</span> : null}
      </div>
    </article>
  )
}

function PlayerTaskFlow({ stages, withSeason }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.playerTaskFlow} aria-labelledby="player-task-flow-title">
      <header>
        <div>
          <span>PLAYER EVENT FLOW</span>
          <strong id="player-task-flow-title">{uiText("选手赛事流程", uiLocale)}</strong>
          <p>{uiText("这里只显示需要你亲自处理的节点；“当前无需操作”不代表流程已经结束。", uiLocale)}</p>
        </div>
        <em>3 STAGES</em>
      </header>
      <div className={styles.flowStages}>
        {stages.map(stage => (
          <article key={stage.key} data-state={stage.state}>
            <div className={styles.flowOrder}>{stage.order}</div>
            <div className={styles.flowMain}>
              <span>{stage.eyebrow}</span>
              <strong>{stage.title}</strong>
              <p>{stage.nextTask?.title || stage.description}</p>
            </div>
            <div className={styles.flowState}>
              <b>{stage.stateLabel}</b>
              <Link to={resolveWorkflowActionUrl(stage.actionUrl, withSeason)}>{stage.taskCount ? uiText("立即处理", uiLocale) : uiText("查看流程", uiLocale)} →</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function TaskNotificationCenter({ activity, identityType = 'VIEWER', standalone = false, withSeason = null, communicationsVisible = true, weekly = false, progressAction, children }) {
  const uiLocale = useUiLocale()
  progressAction ??= { url: '/me?section=overview', label: uiText('返回空间概览', uiLocale) }
  const [searchParams, setSearchParams] = useSearchParams()
  const receiptRef = useRef(null)
  const view = searchParams.get('view') === 'history' ? 'history' : 'open'
  const { taskView, workingId, completeTask } = activity
  const loading = activity.status === 'loading'
  const synchronized = activity.status === 'ready'
  const historyReady = !communicationsVisible || activity.sources.tasks?.status === 'ready'
  const error = activity.message || activity.actionError
  const primaryTask = taskView.primaryTask
  const primaryActionUrl = resolveWorkflowActionUrl(primaryTask?.resolvedActionUrl, withSeason)
  const isPlayer = !weekly && String(identityType || '').toUpperCase() === 'PLAYER'
  const requestedTask = searchParams.get('task')
  const selectedTask = requestedTask ? findTaskDetail(taskView, requestedTask) : null
  const selectedStatus = selectedTask?.status
  useEffect(() => {
    if (!selectedStatus || selectedStatus === 'OPEN') return
    receiptRef.current?.focus({ preventScroll: true })
    receiptRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [requestedTask, selectedStatus])
  const finishTask = task => {
    if (requestedTask !== task.id) {
      const next = new URLSearchParams(searchParams)
      next.set('task', task.id)
      next.delete('view')
      setSearchParams(next)
    }
    return completeTask(task)
  }

  if (requestedTask) return <section className={styles.center} aria-label={uiText("待办详情", uiLocale)}>
    <header className={styles.header}><div><span>TASK DETAILS</span><h2>{uiText("待办详情", uiLocale)}</h2><p>{uiText("核对事项与处理身份，完成后继续查看当前队列。", uiLocale)}</p></div></header>
    <nav className={styles.detailNavigation} aria-label={uiText("待办返回", uiLocale)}><Link to={resolveWorkflowActionUrl('/me?section=overview', withSeason)}>{uiText("← 我的空间", uiLocale)}</Link><Link to={resolveWorkflowActionUrl('/me?section=tasks', withSeason)}>{uiText("全部待办 ↗", uiLocale)}</Link></nav>
    {error ? <div className={styles.error} role="alert"><strong>{uiText("状态尚未确认", uiLocale)}</strong><span>{error}</span><button type="button" onClick={activity.refresh} disabled={loading || Boolean(workingId)}>{uiText("重新同步", uiLocale)}</button></div> : null}
    {selectedTask ? <>
      {selectedTask.status !== 'OPEN' && <div ref={receiptRef} tabIndex={-1} className={styles.completion} role="status" data-status={selectedTask.status}><strong>{TASK_STATUS[selectedTask.status] || uiText("事项已结束", uiLocale)}</strong><span>{selectedTask.closure.detail}</span></div>}
      <TaskCard task={selectedTask} index={0} workingId={workingId} onComplete={finishTask} withSeason={withSeason} focused history={selectedTask.status !== 'OPEN'} />
      {selectedTask.status !== 'OPEN' && <div className={styles.detailNavigation}><Link to={resolveWorkflowActionUrl(synchronized && !taskView.openTasks.length ? progressAction.url : '/me?section=tasks', withSeason)}>{synchronized ? taskView.openTasks.length ? uiText("继续处理 {0} 项待办", uiLocale, [taskView.openTasks.length]) : progressAction.label : uiText("返回队列核对其余待办", uiLocale)} →</Link><Link to={resolveWorkflowActionUrl('/me?section=tasks&view=history', withSeason)}>{uiText("查看处理记录 ↗", uiLocale)}</Link></div>}
    </> : loading ? <p className={styles.loading} role="status">{uiText("正在核对这项待办…", uiLocale)}</p> : <div className={styles.emptyState}><strong>{synchronized ? uiText("这项待办当前不可用", uiLocale) : uiText("这项待办尚未同步", uiLocale)}</strong><p>{synchronized ? uiText("事项可能已经更新，或不属于当前账号与赛事。请从当前待办重新选择。", uiLocale) : uiText("同步完成后才能确认处理状态，请重新同步后核对。", uiLocale)}</p></div>}
  </section>

  return (
    <section className={`${styles.center} ${standalone ? styles.standalone : ''}`}>
      <header className={styles.header}>
        <div>
          <span>ACTION QUEUE</span>
          <h2>{uiText("任务中心", uiLocale)}</h2>
          <p>{uiText("按截止时间与优先级排列，先处理需要你回应的事项。", uiLocale)}</p>
        </div>
      </header>

      <nav className={styles.viewSwitch} aria-label={uiText("任务中心视图", uiLocale)}>
        <Link to={resolveWorkflowActionUrl('/me?section=tasks', withSeason)} preventScrollReset aria-current={view === 'open' ? 'page' : undefined} data-active={view === 'open'}>
          <span>{uiText("待处理任务", uiLocale)}</span><em>{synchronized ? taskView.openTasks.length : '—'}</em>
        </Link>
        <Link to={resolveWorkflowActionUrl('/me?section=tasks&view=history', withSeason)} preventScrollReset aria-current={view === 'history' ? 'page' : undefined} data-active={view === 'history'}>
          <span>{uiText("处理记录", uiLocale)}</span><em>{historyReady ? taskView.historyTasks.length : '—'}</em>
        </Link>
      </nav>

      {error ? <div className={styles.error} role="alert"><strong>{uiText("部分状态尚未确认", uiLocale)}</strong><span>{error}{uiText(" 已同步的事项仍可查看。", uiLocale)}</span></div> : null}
      {loading ? <div className={styles.loading} role="status">{uiText("正在同步报名、阵容、赛程与工作人员任务…", uiLocale)}</div> : null}

      {!loading || taskView.openTasks.length || (view === 'history' && historyReady) ? (
        <>
          {view === 'open' && <>
          {primaryTask ? (
            <section key={primaryTask.id} className={styles.priorityHero} data-deadline={primaryTask.deadline.key}>
              <div className={styles.priorityMain}>
                <div className={styles.priorityMeta}><span>{primaryTask.workflow.en} · {identityTypeLabel(primaryTask.identityType)}</span><em>{primaryTask.deadline.label}</em></div>
                <strong>{primaryTask.title}</strong>
                <p>{primaryTask.body || uiText("进入对应流程完成操作后，任务状态会自动同步。", uiLocale)}</p>
                <small>{primaryTask.dueAt ? uiText("截止 {0}", uiLocale, [formatTime(primaryTask.dueAt)]) : uiText("没有固定截止时间，但仍需要主动处理", uiLocale)}</small>
                <div className={styles.priorityActions}>
                  {primaryActionUrl ? <Link to={primaryActionUrl}>{uiText("现在处理 →", uiLocale)}</Link> : null}
                  {primaryTask.requiresSourceResolution === false ? <button type="button" disabled={workingId === primaryTask.id} onClick={() => finishTask(primaryTask)}>{workingId === primaryTask.id ? uiText("提交中", uiLocale) : uiText("确认完成", uiLocale)}</button> : null}
                </div>
              </div>
              <div className={styles.prioritySide}>
                <span>CURRENT ACTION</span>
                <strong>{primaryTask.actionMode.label}</strong>
                <em>{PRIORITY_LABEL[primaryTask.priority] || primaryTask.priority}</em>
                <p>{primaryTask.actionMode.detail}</p>
              </div>
            </section>
          ) : synchronized ? (
            <section key="clear" className={styles.priorityHero} data-clear="true">
              <div className={styles.priorityMain}>
                <div className={styles.priorityMeta}><span>QUEUE CLEAR</span><em>{identityTypeLabel(identityType)}</em></div>
                <strong>{taskView.emptyCopy.headline}</strong>
                <p>{taskView.emptyCopy.description}</p>
                <div className={styles.priorityActions}><Link to={resolveWorkflowActionUrl(progressAction.url, withSeason)}>{progressAction.label} →</Link></div>
              </div>
              <div className={styles.prioritySide}><span>CURRENT STATUS</span><strong>{uiText("无需操作", uiLocale)}</strong><em>{uiText("队列已清空", uiLocale)}</em><p>{uiText("新任务会自动同步", uiLocale)}</p></div>
            </section>
          ) : <div className={styles.loading}><strong>{uiText("待办状态尚未完整同步", uiLocale)}</strong><p>{uiText("刷新成功后才能确认是否还有需要处理的事项。", uiLocale)}</p></div>}

          {synchronized && <section className={styles.taskFactRail} aria-label={uiText("任务队列摘要", uiLocale)}>
            {taskView.facts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}
          </section>}

          {isPlayer ? <PlayerTaskFlow stages={taskView.playerTaskFlow} withSeason={withSeason} /> : null}
          </>}
          {(view === 'history' || primaryTask) && <div className={styles.panel} data-view={view}>
            {(view === 'history' || taskView.groups.length > 0) && <div className={styles.panelToolbar}>
              <div>
                <strong>{view === 'open' ? uiText("其他待办", uiLocale) : uiText("任务处理记录", uiLocale)}</strong>
                <p>{view === 'open' ? uiText("完成当前事项后，继续处理下面的任务。", uiLocale) : uiText("历史记录用于追溯，不计入当前待办。", uiLocale)}</p>
              </div>
              <span>{view === 'open' ? Math.max(taskView.openTasks.length - 1, 0) : historyReady ? taskView.historyTasks.length : '—'} ITEMS</span>
            </div>}

            {view === 'open' ? (
              taskView.groups.length ? <div className={styles.groupList}>{taskView.groups.map(group => (
                <section className={styles.queueGroup} data-group={group.key} key={group.key}>
                  <header><div><span>{group.eyebrow}</span><strong>{group.title}</strong><p>{group.description}</p></div><em>{group.tasks.length}</em></header>
                  <div className={styles.list}>{group.tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} workingId={workingId} onComplete={finishTask} withSeason={withSeason} />)}</div>
                </section>
              ))}</div> : primaryTask ? <div className={styles.queueComplete}><span>FOCUS MODE</span><strong>{synchronized ? uiText("只剩顶部这一项", uiLocale) : uiText("先处理已同步的事项", uiLocale)}</strong><p>{uiText("处理后返回这里，会重新同步并展示下一项。", uiLocale)}</p></div> : null
            ) : (
              taskView.historyTasks.length ? <div className={styles.list}>{taskView.historyTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} workingId={workingId} onComplete={completeTask} withSeason={withSeason} history />)}</div> : historyReady ? <HistoryEmptyState weekly={weekly} /> : <div className={styles.loading} role="status">{uiText("处理记录尚未完整同步，请刷新后核对。", uiLocale)}</div>
            )}
          </div>}
        </>
      ) : null}
      {view === 'open' && <>
        {communicationsVisible && <aside className={styles.taskGuide} aria-label={uiText("这里需要你操作", uiLocale)}><p>{uiText("在对应流程处理后，待办会自动同步。", uiLocale)}</p><Link to={resolveWorkflowActionUrl('/me?section=communications&view=messages', withSeason)}>{uiText("只需知道的内容在赛事消息 ↗", uiLocale)}</Link></aside>}
        {children}
      </>}
    </section>
  )
}
