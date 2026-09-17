import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import SpaceOverview from './SpaceOverview.jsx'
import ParticipationPreparation from './ParticipationPreparation.jsx'
import TaskNotificationCenter from '../tasks/TaskNotificationCenter.jsx'
import styles from './SpaceOverview.module.css'

export default function AccountActivityWorkspace({ view, activity, genericTasks, weeklyPreparation, weeklyRooms, roomsReadOnly, ...props }) {
  const uiLocale = useUiLocale()
  const { context, withSeason } = props
  const roomSource = activity.sources.rooms
  const weekly = weeklyRooms ? { status: roomSource?.status, workspace: roomSource?.data, readOnly: roomsReadOnly, message: roomSource?.message, retry: activity.refresh } : null
  const progressSection = (weeklyPreparation ? ['team', 'matches'] : ['events', 'matches', 'team']).find(id => props.sections?.some(section => section.id === id))
  const progressAction = { url: `/me?section=${progressSection || 'overview'}`, label: { team: uiText("查看队伍进度", uiLocale), matches: uiText("查看我的比赛", uiLocale), events: uiText("查看我的赛事", uiLocale) }[progressSection] || uiText("返回空间概览", uiLocale) }
  const preparation = <ParticipationPreparation compact summaryOnly={view === 'tasks'} locale={props.locale} plans={activity.preparation.plans} source={activity.sources.preparation} roomSource={roomSource} seasonId={context.seasonId} roomsReadOnly={roomsReadOnly} withSeason={withSeason} matchesVisible={Boolean(weeklyRooms)} />
  return <div className={styles.activity}>
    <div className={styles.activitySync} aria-label={uiText("参赛资料同步状态", uiLocale)}>
      <details key={activity.status} open={activity.status === 'error'}><summary><i data-status={activity.status} aria-hidden="true" />{activity.status === 'ready' ? uiText("参赛进度已同步", uiLocale) : activity.status === 'loading' ? uiText("正在同步参赛进度", uiLocale) : uiText("部分参赛进度未同步", uiLocale)}<span aria-hidden="true">⌄</span></summary><div>{Object.entries(activity.sources).map(([key, source]) => <span key={key} data-status={source.status}>{activity.sourceLabels[key]} · {source.status === 'ready' ? uiText("已同步", uiLocale) : source.status === 'loading' ? uiText("同步中", uiLocale) : uiText("未同步", uiLocale)}</span>)}</div></details>
      <button type="button" onClick={activity.refresh} disabled={activity.status === 'loading' || Boolean(activity.workingId)}>{activity.status === 'loading' ? uiText("同步中…", uiLocale) : uiText("刷新进度", uiLocale)}</button>
    </div>
    {view === 'tasks' ? <TaskNotificationCenter activity={activity} identityType={context.primaryIdentityType} withSeason={withSeason} communicationsVisible={genericTasks} weekly={weeklyPreparation || weeklyRooms} progressAction={progressAction}>{preparation}</TaskNotificationCenter>
      : <SpaceOverview {...props} activity={activity} weekly={weekly} preparation={preparation} />}
  </div>
}
