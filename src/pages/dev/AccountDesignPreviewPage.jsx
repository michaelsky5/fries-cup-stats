import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventRegistrationWorkspace from '../../features/event-registration/EventRegistrationWorkspace.jsx'
import {
  CasterWorkspace,
  GeneralSpaceOverview,
  MyEventsPanel,
  RefereeWorkspace
} from '../../features/my-space/IdentitySpacePanels.jsx'
import { buildManagerWorkspaceStatus } from '../../features/my-space/managerWorkspaceModel.js'
import { buildPlayerWorkspaceStatus } from '../../features/my-space/playerWorkspaceModel.js'
import {
  buildSpaceSections,
  SpaceTabs
} from '../me/MySpacePage.jsx'
import {
  ACCOUNT_PREVIEW_IDENTITIES,
  ACCOUNT_PREVIEW_SCENARIOS,
  buildAccountDesignPreviewFixture
} from './accountDesignPreviewFixtures.js'
import styles from './AccountDesignPreviewPage.module.css'
import spaceStyles from '../me/MySpacePage.module.css'
import SpaceOverview, { SpaceIdentity } from '../../features/account-ui/SpaceOverview.jsx'
import MatchRoomDesignPreview from './MatchRoomDesignPreview.jsx'

const VIEW_OPTIONS = [
  { id: 'overview', label: '身份空间首页' },
  { id: 'workspace', label: '身份工作台' },
  { id: 'team', label: '队伍与名单' },
  { id: 'room', label: '比赛房 · 各阶段' }
]

const DEVICE_OPTIONS = [
  { id: 'desktop', label: '桌面', width: '100%' },
  { id: 'tablet', label: '平板', width: '820px' },
  { id: 'mobile', label: '手机', width: '390px' }
]

function PreviewSurface({ scenarioId, viewId, identityType }) {
  const fixture = useMemo(() => buildAccountDesignPreviewFixture(scenarioId === 'matchday' ? 'locked' : scenarioId, identityType), [identityType, scenarioId])
  const managerStatus = useMemo(() => buildManagerWorkspaceStatus(fixture.spaceContext), [fixture])
  const playerStatus = useMemo(() => buildPlayerWorkspaceStatus(fixture.spaceContext, fixture.playerDossier), [fixture])
  const [navigationNotice, setNavigationNotice] = useState('')
  const [previewTime] = useState(() => Date.now())
  const context = useMemo(() => {
    const next = structuredClone(fixture.spaceContext)
    if (scenarioId !== 'matchday') return next
    const kickoff = new Date(previewTime + 10 * 60_000).toISOString()
    if (next.overview.nextTeamMatch) next.overview.nextTeamMatch.scheduledAt = kickoff
    for (const team of next.teamContexts || []) for (const match of team.matches || []) match.scheduledAt = kickoff
    next.overview.tasks = ['MANAGER', 'MULTI'].includes(identityType)
      ? [{ id: 'lineup', title: '确认本队首发名单', priority: 'HIGH', identityType: 'MANAGER', dueAt: kickoff, actionUrl: '/matches/DESIGN-PREVIEW/room' }]
      : identityType === 'PLAYER' ? [{ id: 'check-in', title: '查看本队比赛安排并签到', priority: 'HIGH', identityType: 'PLAYER', dueAt: kickoff, actionUrl: '/matches/DESIGN-PREVIEW/room' }]
        : ['REFEREE', 'CASTER'].includes(identityType) ? [{ id: 'assignment', title: '确认下一轮执赛安排', priority: 'NORMAL', identityType, actionUrl: `/me?section=${identityType.toLowerCase()}` }] : []
    if (identityType === 'MULTI') next.overview.tasks.push({ id: 'staff', title: '确认下一轮执赛安排', priority: 'NORMAL', identityType: 'CASTER', actionUrl: '/me?section=caster' })
    next.overview.openTaskCount = next.overview.tasks.length
    return next
  }, [fixture, scenarioId, identityType, previewTime])
  const withSeason = path => {
    const view = path.includes('/room') ? 'room' : path.includes('section=team') ? 'team' : path.includes('section=overview') ? 'overview' : path.includes('section=') ? 'workspace' : 'overview'
    return `/dev/account-preview?embed=1&identity=${identityType}&scenario=${scenarioId}&view=${view}`
  }
  const isManager = ['MANAGER', 'MULTI'].includes(identityType)
  const isPlayer = identityType === 'PLAYER'
  const sectionFlags = fixture.spaceContext.sections || {}
  const sections = useMemo(() => buildSpaceSections({
    player: Boolean(sectionFlags.player || identityType === 'MULTI'),
    team: Boolean(sectionFlags.team || identityType === 'MULTI'),
    referee: Boolean(sectionFlags.referee),
    caster: Boolean(sectionFlags.caster || identityType === 'MULTI')
  }), [identityType, sectionFlags.caster, sectionFlags.player, sectionFlags.referee, sectionFlags.team])
  const workspaceSection = identityType === 'REFEREE' ? 'referee' : identityType === 'CASTER' ? 'caster' : isManager ? 'team' : 'events'
  const activeSection = viewId === 'overview' ? 'overview' : viewId === 'team' ? 'team' : workspaceSection

  const interceptApplicationNavigation = event => {
    const anchor = event.target.closest('a')
    const href = anchor?.getAttribute('href') || ''
    if (!href.startsWith('/') || href.startsWith('/dev/account-preview')) return
    event.preventDefault()
    setNavigationNotice('设计预览：页面跳转已拦截。可使用上方“预览页面”切换当前区域。')
  }

  if (viewId === 'room') return <MatchRoomDesignPreview />

  return (
    <main data-design="signal" className={styles.previewSurface} onClickCapture={interceptApplicationNavigation}>
      {navigationNotice ? <div className={styles.previewNotice}>{navigationNotice}</div> : null}
      <div className={`${styles.spacePreview} ${spaceStyles.page}`}>
        <SpaceIdentity context={context} />
        <SpaceTabs activeSection={activeSection} withSeason={withSeason} sections={sections} overview={context.overview} />
        {viewId === 'overview' ? <SpaceOverview context={context} sections={sections} withSeason={withSeason} managerStatus={isManager ? managerStatus : null} playerStatus={isPlayer ? playerStatus : null} /> : null}
        {viewId === 'workspace' && isManager ? <EventRegistrationWorkspace seasonId="FCR26" existingTeams={fixture.existingTeams} identities={fixture.identities} teamContexts={fixture.teamContexts} previewData={fixture.eventRegistration} /> : null}
        {viewId === 'workspace' && identityType === 'REFEREE' ? <RefereeWorkspace context={fixture.spaceContext} withSeason={withSeason} preview /> : null}
        {viewId === 'workspace' && identityType === 'CASTER' ? <CasterWorkspace context={fixture.spaceContext} withSeason={withSeason} preview /> : null}
        {viewId === 'workspace' && ['PLAYER', 'COACH'].includes(identityType) ? <MyEventsPanel context={fixture.spaceContext} withSeason={withSeason} /> : null}
        {viewId === 'workspace' && identityType === 'VIEWER' ? <GeneralSpaceOverview context={fixture.spaceContext} withSeason={withSeason} /> : null}
        {viewId === 'team' && (isManager || ['PLAYER', 'COACH'].includes(identityType)) ? (isManager
          ? <EventRegistrationWorkspace seasonId="FCR26" existingTeams={fixture.existingTeams} identities={fixture.identities} teamContexts={fixture.teamContexts} previewData={fixture.eventRegistration} />
          : <MyEventsPanel context={fixture.spaceContext} withSeason={withSeason} />) : null}
        {viewId === 'team' && !isManager && !['PLAYER', 'COACH'].includes(identityType) ? <section className={styles.previewUnsupported}><span>CONDITIONAL ENTRY</span><strong>当前身份没有队伍工作区</strong><p>真实页面同样不会向该身份显示“队伍与名单”入口。</p></section> : null}
      </div>
    </main>
  )
}

export default function AccountDesignPreviewPage() {
  const [searchParams] = useSearchParams()
  const embedded = searchParams.get('embed') === '1'
  const embeddedScenario = searchParams.get('scenario') || 'locked'
  const embeddedView = VIEW_OPTIONS.some(option => option.id === searchParams.get('view')) ? searchParams.get('view') : 'overview'
  const embeddedIdentity = ACCOUNT_PREVIEW_IDENTITIES.some(option => option.id === searchParams.get('identity')) ? searchParams.get('identity') : 'MANAGER'
  const [identityType, setIdentityType] = useState('MANAGER')
  const [scenarioId, setScenarioId] = useState('matchday')
  const [viewId, setViewId] = useState('overview')
  const [deviceId, setDeviceId] = useState('desktop')

  if (embedded) return <PreviewSurface scenarioId={embeddedScenario} viewId={embeddedView} identityType={embeddedIdentity} />

  const device = DEVICE_OPTIONS.find(option => option.id === deviceId) || DEVICE_OPTIONS[0]
  const iframeUrl = `/dev/account-preview?embed=1&identity=${encodeURIComponent(identityType)}&scenario=${encodeURIComponent(scenarioId)}&view=${encodeURIComponent(viewId)}`

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarIntro}><span>DEV ONLY</span><strong>账号设计预览台</strong><p>固定假数据 · 无需登录 · 不调用真实提交接口</p></div>
        <label><span>预览身份</span><select value={identityType} onChange={event => setIdentityType(event.target.value)}>{ACCOUNT_PREVIEW_IDENTITIES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span>预览页面</span><select value={viewId} onChange={event => setViewId(event.target.value)}>{VIEW_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span>流程状态</span><select value={scenarioId} onChange={event => setScenarioId(event.target.value)}>{[{ id: 'matchday', label: '比赛日 · 待办与首发' }, ...ACCOUNT_PREVIEW_SCENARIOS].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span>设备宽度</span><select value={deviceId} onChange={event => setDeviceId(event.target.value)}>{DEVICE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      </header>
      <section className={styles.stage} data-device={deviceId}>
        <div className={styles.frameMeta}><span>{identityType} PREVIEW</span><strong>{VIEW_OPTIONS.find(option => option.id === viewId)?.label}</strong><em>{scenarioId === 'matchday' ? '比赛日' : ACCOUNT_PREVIEW_SCENARIOS.find(option => option.id === scenarioId)?.label} · {device.label}</em></div>
        <iframe key={iframeUrl} title="账号设计实时预览" src={iframeUrl} style={{ width: device.width }} />
      </section>
    </main>
  )
}
