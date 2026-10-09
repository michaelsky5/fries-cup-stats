import PlayerStreamWorkspace from '../../features/weekly-competition/PlayerStreamWorkspace.jsx'
import RoomGuideLink from '../../features/room-guide/RoomGuideLink.jsx'
import SeasonRegistrationEntry from '../../features/event-registration/SeasonRegistrationEntry.jsx'
import { isWeeklyOverview } from '../../features/weekly-overview/weeklyOverviewModel.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import { withSeason as withPublicSeason } from '../../config/seasons.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import FollowingWorkspace, { FollowingDigest } from '../../features/following/FollowingWorkspace.jsx'
import FavoriteManagerDialog from '../../features/favorites/components/FavoriteManagerDialog.jsx'
import useFavoriteManagerNavigation from '../../features/favorites/useFavoriteManagerNavigation.js'
import {
  getPlayerFavoriteId,
  getTeamFavoriteId,
  sanitizeFavoritesForSeason
} from '../../features/favorites/index.js'
import {
  getPrimaryTeamOverview
} from '../../lib/followingSelectors.js'
import { buildPlayerSpaceDossier, shouldExposeTeamSpace } from '../../lib/mySpaceSelectors.js'
import { getPlayerDossier } from '../../lib/playerDetailSelectors.js'
import { formatStaffPerson, getTeamRosterPlayers, getTeamStaff } from '../../lib/rosterSelectors.js'
import ScheduleNegotiationWorkspace from '../../features/schedule-negotiation/ScheduleNegotiationWorkspace.jsx'
import { fetchNotificationSummary } from '../../features/tasks/taskNotificationApi.js'
import { mergeOperationalSummary } from '../../features/tasks/taskNotificationModel.js'
import AccountCommunicationsCenter from '../../features/communications/AccountCommunicationsCenter.jsx'
import WeeklyCompetitionWorkspace from '../../features/weekly-competition/WeeklyCompetitionWorkspace.jsx'
import WeeklyMatchRoomsWorkspace from '../../features/weekly-competition/WeeklyMatchRoomsWorkspace.jsx'
import {
  fetchAccountLaunchStatus,
  fetchMySpaceContext,
  hasAccountFeatureAccess
} from '../../features/my-space/mySpaceApi.js'
import { buildPlayerWorkspaceStatus } from '../../features/my-space/playerWorkspaceModel.js'
import { buildPlayerStatsWorkspace } from '../../features/my-space/playerStatsWorkspaceModel.js'
import { buildManagerWorkspaceStatus, getPrimarySpaceIdentityType } from '../../features/my-space/managerWorkspaceModel.js'
import WorkspaceSectionHeader from '../../features/my-space/WorkspaceSectionHeader.jsx'
import {
  CasterWorkspace,
  IdentityContextStrip,
  MyEventsPanel,
  RefereeWorkspace,
  RelationshipMatchesPanel
} from '../../features/my-space/IdentitySpacePanels.jsx'
import FollowingPage from '../following/FollowingPage.jsx'
import styles from './MySpacePage.module.css'
import { reminderCopy } from '../../features/match-reminders/reminderCopy.js'
import { SpaceIdentity } from '../../features/account-ui/SpaceOverview.jsx'
import MobileSpaceMenu, { MobileSpaceBack } from '../../features/account-ui/MobileSpaceNavigation.jsx'
import { getRestoreScrollY } from '../../lib/navigationState.js'
import AccountActivityWorkspace from '../../features/account-ui/AccountActivityWorkspace.jsx'
import useAccountActivity from '../../features/account-ui/useAccountActivity.js'
import { getAccountActivityAccess } from '../../features/account-ui/accountActivityModel.js'
import { isCompetitionMatchesEntry, requiresParticipationAccess } from '../../features/my-space/personalSpacePolicy.js'
import useAccountCompetition from '../../features/my-space/useAccountCompetition.js'
import AccountCompetitionBar from '../../features/my-space/AccountCompetitionBar.jsx'
import { rememberCompetition, withAccountCompetition } from '../../features/my-space/accountCompetitionModel.js'
import { SPACE_SECTION_DEFINITIONS, SPACE_PRIMARY_IDS, SPACE_NAV_GROUPS, SPACE_UTILITY_NAV, spaceSectionLabel, resolveSpaceEntry, registrationEntryPolicy } from '../../features/my-space/spaceNavigation.js'

export function buildSpaceSections({ player = false, team = false, manager = false, referee = false, caster = false, weekly = false, weeklyRooms = false, registration = false, administrativeTasks = false, publicStats = true, launch = null } = {}) {
  const communicationsVisible = !launch || hasAccountFeatureAccess(launch, 'communications')
  const teamOperationsVisible = !launch || hasAccountFeatureAccess(launch, 'teamOperations')
  const weeklyCompetitionVisible = !launch || hasAccountFeatureAccess(launch, 'weeklyCompetition')
  const matchRoomVisible = !launch || hasAccountFeatureAccess(launch, 'matchRoom')
  return [
    SPACE_SECTION_DEFINITIONS.overview,
    ...(administrativeTasks || communicationsVisible || (registration && teamOperationsVisible) || (weekly && (team || player || manager) && (weeklyCompetitionVisible || matchRoomVisible)) ? [SPACE_SECTION_DEFINITIONS.tasks] : []),
    ...(!weekly ? [SPACE_SECTION_DEFINITIONS.events] : []),
    ...(team || player || ((manager || weeklyRooms) && matchRoomVisible) ? [SPACE_SECTION_DEFINITIONS.matches] : []),
    ...(((team || registration) && teamOperationsVisible) || ((manager || player || (weekly && team)) && weeklyCompetitionVisible)
      ? [SPACE_SECTION_DEFINITIONS.team]
      : []),
    ...(referee ? [SPACE_SECTION_DEFINITIONS.referee] : []),
    ...(caster ? [SPACE_SECTION_DEFINITIONS.caster] : []),
    ...(player && weekly ? [SPACE_SECTION_DEFINITIONS.stream] : []),
    ...(player && publicStats ? [SPACE_SECTION_DEFINITIONS.stats] : []),
    SPACE_SECTION_DEFINITIONS.following,
    ...(communicationsVisible ? [SPACE_SECTION_DEFINITIONS.communications] : []),
    SPACE_SECTION_DEFINITIONS.security
  ]
}

function hasResolvedCapability(context, key) {
  return Boolean(context?.capabilitySnapshot?.grantedKeys?.includes(key))
}

function getHydratedSeasonTeamLabel(context, identityType) {
  const normalizedType = String(identityType || '').trim().toUpperCase()
  const teamContext = (context?.teamContexts || []).find(candidate => {
    const roles = (candidate?.roles || []).map(role => String(role || '').trim().toUpperCase())
    if (roles.includes(normalizedType)) return true
    if (normalizedType === 'PLAYER' && candidate?.roster?.ownMember) return true
    return normalizedType === 'MANAGER' && candidate?.capabilities?.canManageTeam
  })
  const team = teamContext?.seasonTeam || teamContext?.teamOrganization || null
  return team?.shortName || team?.name || ''
}

function buildSeasonLink(path, canonicalSeasonId, competitionId = '', currentSearch = '') {
  return withAccountCompetition(withPublicSeason(path, canonicalSeasonId, currentSearch), competitionId, currentSearch)
}

async function fetchSynchronizedSpaceContext(seasonId) {
  const context = await fetchMySpaceContext(seasonId)
  if (context?.contract === 'ACCOUNT_FOUNDATION_V1') return context
  let summary = null
  try {
    summary = await fetchNotificationSummary(seasonId)
  } catch {
    // Older API deployments may not expose the summary endpoint yet.
  }
  return mergeOperationalSummary(context, summary)
}

function AccountReleaseGate({ launch, loading = false, error = '', withSeason, onRetry }) {
  const uiLocale = useUiLocale()
  const content = error
    ? {
      eyebrow: 'RELEASE CHECK INTERRUPTED',
      title: uiText("暂时无法确认本届参赛权限", uiLocale),
      description: uiText("本届参赛工作区暂不可用，你仍可使用我的关注、账号设置和公开赛事资料。请稍后重试或联系赛管确认。", uiLocale)
    }
    : loading
      ? {
        eyebrow: 'CHECKING RELEASE ACCESS',
        title: uiText("正在确认本届参赛权限", uiLocale),
        description: uiText("正在核对账号与本届赛事的开放状态。", uiLocale)
      }
      : launch?.reason === 'EMAIL_VERIFICATION_REQUIRED'
        ? {
          eyebrow: 'EMAIL VERIFICATION REQUIRED',
          title: uiText("验证邮箱后继续参赛", uiLocale),
          description: uiText("本轮参赛内测需要验证邮箱。完成后会重新检查本届参赛权限，我的关注与账号设置仍可使用。", uiLocale)
        }
        : launch?.reason === 'NOT_ALLOWLISTED'
          ? {
            eyebrow: 'LIMITED SHADOW BETA',
            title: uiText("本届参赛功能正在小范围内测", uiLocale),
            description: uiText("本轮先由参赛选手、队伍人员和赛事工作人员参与真实流程，QQ 群与赛管仍是正式兜底。", uiLocale)
          }
          : {
            eyebrow: 'ACCOUNT PORTAL PAUSED',
            title: uiText("本届参赛工作区尚未开放", uiLocale),
            description: uiText("你仍可使用我的关注、账号设置和公开赛事资料；参赛功能开放后从这里进入。", uiLocale)
          }

  return (
    <main className={styles.releaseGate} aria-busy={loading}>
      <section>
        <div className={styles.releaseGateIndex}>MY SPACE</div>
        <div className={styles.releaseGateCopy}>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          {error ? <p role="alert">{error}</p> : null}
          <nav aria-label={uiText("参赛入口恢复", uiLocale)}>
            {!loading && onRetry ? <button type="button" onClick={onRetry}>{uiText("重新检查参赛权限", uiLocale)}</button> : null}
            {launch?.reason === 'EMAIL_VERIFICATION_REQUIRED' ? <Link to={withSeason('/account#email')}>{uiText("前往验证邮箱", uiLocale)}</Link> : null}
            <Link to={withSeason('/me?section=following')}>{uiText("查看我的关注", uiLocale)}</Link>
            <Link to={withSeason('/matches')}>{uiText("继续浏览赛事", uiLocale)}</Link>
            <Link to={withSeason('/account')}>{uiText("账号设置", uiLocale)}</Link>
          </nav>
        </div>
        <aside>
          <span>EVENT ARCHIVE</span>
          <strong>{uiText("公开赛事资料", uiLocale)}</strong>
          <small>{uiText("赛程 · 赛果 · 排名 · 数据", uiLocale)}</small>
        </aside>
      </section>
    </main>
  )
}

function ReadOnlyWorkspaceNotice({ title, description }) {
  return (
    <section className={styles.readOnlyWorkspaceNotice}>
      <span>SHADOW BETA / READ ONLY</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </section>
  )
}

function SpaceEntryNotice({ reason, locale, withSeason }) {
  const messages = {
    PARTICIPATION_RECORDS: '周赛参赛记录已归入“参赛进度”，已打开历史记录。',
    STAFF_MATCHES: '本届赛管与解说从“我的比赛”进入获指派场次。档期与工作人员身份可在账号设置中查看。',
    UNAVAILABLE_SECTION: '当前赛事或账号身份未开放这个栏目，已返回概览。可从上方入口选择可用功能。',
    UNKNOWN_SECTION: '这个栏目链接已失效，已返回概览。请从上方入口继续。'
  }
  if (!messages[reason]) return null
  return <aside className={styles.entryNotice} role="status"><p>{uiText(messages[reason], locale)}</p>{reason === 'STAFF_MATCHES' && <Link to={withSeason('/account')}>{uiText('账号设置', locale)} →</Link>}</aside>
}

function matchResultLabel(result) {
  const key = String(result || '').trim().toLowerCase()
  if (key === 'win' || key === '胜') return '胜'
  if (key === 'loss' || key === '负') return '负'
  if (key === 'draw' || key === '平') return '平'
  return '—'
}

function showSaveToast(locale) {
  const id = 'my-space-save-toast'
  document.getElementById(id)?.remove()
  const toast = document.createElement('div')
  toast.id = id
  toast.className = styles.saveToast
  toast.textContent = locale === 'en-US' ? 'Following saved in this browser.' : uiText("关注已保存到当前浏览器。", locale)
  toast.setAttribute('role', 'status')
  toast.setAttribute('data-i18n-ignore', '')
  document.body.appendChild(toast)
  window.setTimeout(() => toast.remove(), 2200)
}

export function PlayerSpaceHeader({ dossier }) {
  return <SpaceIdentity context={{ user: { displayName: dossier?.player?.name || dossier?.displayName }, identities: [{ type: 'PLAYER' }] }} />
}

export function ManagerSpaceHeader({ context }) { return <SpaceIdentity context={context} /> }
export function AccountSpaceHeader({ context }) { return <SpaceIdentity context={context} /> }

function SpaceHeader({ children }) {
  const header = useRef(null)
  useEffect(() => {
    const dismiss = event => {
      for (const details of header.current?.querySelectorAll('details[open]') || []) {
        if (!details.contains(event.target)) details.removeAttribute('open')
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('focusin', dismiss) }
  }, [])
  return <div ref={header} className={styles.spaceHeader} onKeyDown={event => {
    if (event.key !== 'Escape') return
    const details = event.target.closest('details[open]')
    if (details && event.currentTarget.contains(details)) {
      event.stopPropagation()
      details.removeAttribute('open')
      details.querySelector('summary')?.focus()
    }
  }}>{children}</div>
}

function NavChevron() {
  return <svg className={styles.navChevron} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
}

export function SpaceTabs({ activeSection, withSeason, sections, overview = null, locale = 'zh-CN' }) {
  const [expanded, setExpanded] = useState(false)
  const menuId = useId()
  const sectionLabel = section => spaceSectionLabel(section?.id, locale)
  const countLabel = (count, group) => locale === 'en-US' ? count + (group === 'tasks' ? ' tasks to do' : ' unread messages') : count + (group === 'tasks' ? uiText(' 项待办', locale) : uiText(' 条未读消息', locale))
  const operationalCount = Number(overview?.openTaskCount || 0)
  const taskPending = ['loading', 'error'].includes(overview?.taskSyncStatus)
  const taskBadge = taskPending ? (overview.taskSyncStatus === 'error' ? '!' : '…') : operationalCount || null
  const taskBadgeLabel = taskPending ? (locale === 'en-US' ? 'Task count not yet synced' : uiText('待办数量尚未同步', locale)) : countLabel(operationalCount, 'tasks')
  const unreadMessageCount = Number(overview?.unreadNotificationCount || 0)
  const quickNav = useRef(null)
  useEffect(() => {
    const nav = quickNav.current
    const revealCurrent = () => {
      const current = nav?.querySelector('[aria-current="page"]')
      if (!current || !nav.clientWidth) return
      const bounds = nav.getBoundingClientRect()
      const item = current.getBoundingClientRect()
      if (item.left < bounds.left) nav.scrollLeft += item.left - bounds.left
      else if (item.right > bounds.right) nav.scrollLeft += item.right - bounds.right
    }
    revealCurrent()
    const observer = new ResizeObserver(revealCurrent)
    if (nav) observer.observe(nav)
    return () => observer.disconnect()
  }, [activeSection, locale, taskBadge, unreadMessageCount])
  const activeDefinition = sections.find(section => section.id === activeSection) || sections[0]
  const availableGroups = definitions => definitions.map(group => ({
    ...group,
    items: group.sectionIds.map(id => sections.find(section => section.id === id)).filter(Boolean)
  })).filter(group => group.items.length)
  const groups = availableGroups(SPACE_NAV_GROUPS)
  const utilities = availableGroups(SPACE_UTILITY_NAV)
  const activeGroup = groups.find(group => group.items.length > 1 && group.items.some(section => section.id === activeSection))
  const quickSections = SPACE_PRIMARY_IDS.filter(id => sections.some(section => section.id === id))
  const renderGroup = (group, utility = false) => {
    const active = group.items.some(section => section.id === activeSection)
    const groupLabel = group.items.length === 1 ? sectionLabel(group.items[0]) : locale === 'en-US' ? group.english : uiText(group.label, locale)
    const count = group.id === 'tasks' ? taskBadge : group.id === 'communications' ? unreadMessageCount : 0
    if (group.items.length === 1) {
      const section = group.items[0]
      return <Link key={group.id} className={active ? styles.spaceTabActive : ''} aria-current={active ? 'page' : undefined} to={withSeason('/me?section=' + section.id)}>
        {utility ? <svg className={styles.utilityIcon} viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{group.id === 'tasks' ? <><path d="m3 5 1.5 1.5L7 4M9 5h8M3 11h3M9 11h8M3 16h3M9 16h8" /></> : <path d="M3 4h14v10H9l-4 3v-3H3V4Z" />}</svg> : null}
        <span>{groupLabel}</span>{count ? <b aria-label={group.id === 'tasks' ? taskBadgeLabel : countLabel(count, group.id)}>{count}</b> : null}
      </Link>
    }
    return <details key={group.id + ':' + activeSection} className={styles.spaceNavGroup} data-active={active ? 'true' : 'false'}>
      <summary aria-current={active ? 'true' : undefined}><span>{groupLabel}</span><NavChevron /></summary>
      <div className={styles.spaceNavMenu}>
        {group.items.map(section => <Link key={section.id} aria-current={activeSection === section.id ? 'page' : undefined} to={withSeason('/me?section=' + section.id)} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>
          <span>{sectionLabel(section)}</span><em>{section.en}</em>
        </Link>)}
      </div>
    </details>
  }
  return <nav className={styles.spaceTabs} aria-label={locale === 'en-US' ? 'My Space sections' : uiText('我的空间功能', locale)} data-i18n-ignore data-expanded={expanded} onKeyDown={event => {
    if (event.key !== 'Escape') return
    const openGroup = event.target.closest('details[open]')
    if (openGroup) {
      openGroup.removeAttribute('open')
      openGroup.querySelector('summary')?.focus()
    } else if (expanded) {
      event.currentTarget.querySelector('button')?.focus()
      setExpanded(false)
    }
  }}>
      <div ref={quickNav} className={styles.spaceQuickNav}>
        {quickSections.map(id => <Link key={id} to={withSeason(`/me?section=${id}`)} onClick={() => setExpanded(false)} aria-current={activeSection === id ? 'page' : undefined}>
          {spaceSectionLabel(id, locale)}
          {id === 'tasks' && taskBadge ? <b aria-label={taskBadgeLabel}>{taskBadge}</b> : null}
          {id === 'communications' && unreadMessageCount ? <b aria-label={countLabel(unreadMessageCount, 'messages')}>{unreadMessageCount}</b> : null}
        </Link>)}
      </div>
    <div className={styles.spaceNavBar}>
      <button type="button" className={styles.spaceNavToggle} aria-expanded={expanded} aria-controls={menuId} onClick={() => setExpanded(value => !value)}>
        <strong>{sectionLabel(activeDefinition)}</strong><span>{locale === 'en-US' ? 'Sections' : uiText('切换栏目', locale)} <NavChevron /></span>
      </button>
      {sections.some(section => section.id === 'matches') ? <Link className={styles.spaceRoomShortcut} aria-current={activeSection === 'matches' ? 'page' : undefined} to={withSeason('/me?section=matches')}>{sectionLabel(SPACE_SECTION_DEFINITIONS.matches)} <span aria-hidden="true">→</span></Link> : null}
    </div>
    <div className={styles.spaceNavRow} onClick={event => { if (event.target.closest('a')) setExpanded(false) }}>
      <div id={menuId} className={styles.spaceNavGroups}>{groups.map(group => renderGroup(group))}</div>
      {utilities.length ? <div className={styles.spaceNavUtilities} role="group" aria-label={uiText('待办与消息', locale)}>{utilities.map(group => renderGroup(group, true))}</div> : null}
    </div>
    {activeGroup ? <div className={styles.spaceSubnav} aria-label={locale === 'en-US' ? activeGroup.english + ' pages' : uiText('{0}分区', locale, [activeGroup.label])}>
      {activeGroup.items.map(section => <Link key={section.id} to={withSeason('/me?section=' + section.id)} aria-current={section.id === activeSection ? 'page' : undefined}>{sectionLabel(section)}</Link>)}
    </div> : null}
  </nav>
}

function getRoleMetrics(roleData) {
  if (!roleData) return []
  const role = roleData.summary?.role || ''
  const preferred = role === 'SUPPORT'
    ? ['heal', 'ast', 'dth']
    : role === 'TANK'
      ? ['block', 'dmg', 'dth']
      : ['dmg', 'elim', 'dth']
  return preferred.map(id => roleData.coreStats?.find(metric => metric.id === id)).filter(Boolean)
}

function PerformancePanel({ dossier, statsWorkspace = null, withSeason, expanded = false }) {
  const uiLocale = useUiLocale()
  const workspace = statsWorkspace || buildPlayerStatsWorkspace(dossier)
  const [selectedRoleKey, setSelectedRoleKey] = useState('')
  const effectiveRoleKey = workspace.roles.some(role => role.key === selectedRoleKey)
    ? selectedRoleKey
    : workspace.primaryRole?.key || workspace.roles[0]?.key || ''
  const selectedRole = workspace.roles.find(role => role.key === effectiveRoleKey) || workspace.primaryRole
  const roleData = selectedRole?.source || dossier?.selectedRoleData || dossier?.roleEntries?.[0]
  const summary = roleData?.summary
  const metrics = getRoleMetrics(roleData)
  const heroPool = roleData?.heroPool || []
  const recentMatches = roleData?.recentMatches || []
  const scoutingNotes = roleData?.scoutingNotes || []
  const achievements = roleData?.achievements || []
  const publicProfileUrl = dossier?.identity?.playerId ? withSeason(`/players/${encodeURIComponent(dossier.identity.playerId)}`) : ''

  if (!workspace.isPublished || !roleData) {
    return (
      <section className={styles.contentSection}>
        {!expanded ? <div className={styles.sectionHeading}><div><span>MY PERFORMANCE</span><h2>{uiText("本赛季个人表现", uiLocale)}</h2><p>{uiText("正式阵容发布并产生比赛数据后自动生成。", uiLocale)}</p></div></div> : null}
        <section className={styles.statsStatusHero} data-tone={workspace.status.tone}>
          <div><span>{workspace.status.eyebrow}</span><h3>{workspace.status.headline}</h3><p>{workspace.status.description}</p></div>
          <strong>{uiText("身份有效", uiLocale)}</strong>
        </section>
        {expanded ? <div className={styles.statsDataSteps}><article><span>01</span><strong>{uiText("正式名单发布", uiLocale)}</strong><p>{uiText("System 锁定本届阵容后，建立公开选手关联。", uiLocale)}</p></article><article><span>02</span><strong>{uiText("完成正式地图", uiLocale)}</strong><p>{uiText("至少实际参加一张正式地图，才计算本届出场。", uiLocale)}</p></article><article><span>03</span><strong>{uiText("形成职责样本", uiLocale)}</strong><p>{uiText("数据按实际职责独立累计，并在达到门槛后进入排名。", uiLocale)}</p></article></div> : <div className={styles.detailEmpty}>{uiText("当前赛季公开名单或比赛数据尚未关联；这里不会因此降级成普通观众空间。", uiLocale)}</div>}
      </section>
    )
  }

  return (
    <section className={styles.contentSection}>
      {!expanded ? <div className={styles.sectionHeading}>
        <div><span>MY PERFORMANCE</span><h2>{uiText("本赛季个人表现", uiLocale)}</h2><p>{uiText("核心指标会根据你的参赛职责自动调整。", uiLocale)}</p></div>
        {publicProfileUrl ? <Link to={publicProfileUrl}>{uiText("完整数据档案 →", uiLocale)}</Link> : null}
      </div> : null}

      {expanded ? <>
        <section className={styles.statsStatusHero} data-tone={workspace.status.tone}>
          <div><span>{workspace.status.eyebrow}</span><h3>{workspace.status.headline}</h3><p>{workspace.status.description}</p></div>
          {publicProfileUrl ? <Link to={publicProfileUrl}>{uiText("查看公开选手档案 →", uiLocale)}</Link> : <strong>{uiText("公开档案待同步", uiLocale)}</strong>}
        </section>
        <div className={styles.statsFactRail}>{workspace.facts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}</div>
        {workspace.roles.length > 1 ? <section className={styles.roleSwitcher}><header><div><span>ROLE FILES</span><h3>{uiText("切换职责档案", uiLocale)}</h3><p>{uiText("每个职责的 OVR、排名、指标和英雄池单独计算。", uiLocale)}</p></div><em>{workspace.roles.length} ROLES</em></header><div>{workspace.roles.map(role => <button type="button" key={role.key} data-active={role.key === effectiveRoleKey ? 'true' : 'false'} onClick={() => setSelectedRoleKey(role.key)}><span>{role.en}</span><strong>{role.label}</strong><small>{role.maps}{uiText(" 张地图 · ", uiLocale)}{role.timeLabel}</small><em>{role.sampleLabel}</em></button>)}</div></section> : null}
        <div className={styles.selectedRoleHeading}><div><span>{selectedRole?.en || 'ROLE'} PERFORMANCE</span><h3>{selectedRole?.label || summary?.roleLabel || uiText("职责", uiLocale)}{uiText("赛季表现", uiLocale)}</h3><p>{selectedRole?.primaryHero && selectedRole.primaryHero !== '尚无记录' ? uiText("主要英雄：{0}。", uiLocale, [selectedRole.primaryHero]) : uiText("主要英雄仍待正式地图数据。", uiLocale)}{uiText("以下指标均按该职责独立计算。", uiLocale)}</p></div><em data-eligible={selectedRole?.eligible ? 'true' : 'false'}>{selectedRole?.sampleLabel || uiText("等待职责样本", uiLocale)}</em></div>
      </> : null}

      <div className={styles.performanceGrid}>
        <article className={styles.ovrCard}><span>SEASON OVR</span><strong>{summary?.eligible ? summary.scoreLabel : '—'}</strong><em>{summary?.eligible ? summary?.roleLabel || uiText("职责", uiLocale) : uiText("样本不足", uiLocale)}</em></article>
        <article><span>{uiText("职责排名", uiLocale)}</span><strong>{summary?.rankLabel || '—'}</strong><em>{summary?.scorePercentileLabel || uiText("样本不足", uiLocale)}</em></article>
        <article><span>{uiText("出场地图", uiLocale)}</span><strong>{summary?.maps || 0}</strong><em>{summary?.timeLabel || uiText("暂无时长", uiLocale)}</em></article>
        {metrics.map(metric => (
          <article key={metric.id}><span>{metric.label}{uiText(" / 10 分钟", uiLocale)}</span><strong>{metric.valueLabel}</strong><em>{metric.percentile === null ? uiText("样本不足", uiLocale) : uiText("同职责 P{0}", uiLocale, [metric.percentile])}</em></article>
        ))}
      </div>
      {expanded ? (
        <>
          <div className={styles.heroPool}>
            <div><span>HERO POOL</span><h3>{selectedRole?.label || uiText("当前职责", uiLocale)}{uiText("常用英雄", uiLocale)}</h3></div>
            {heroPool.length ? heroPool.slice(0, 5).map(hero => (
              <article key={hero.hero}><strong>{hero.hero}</strong><span>{hero.timeLabel} · {hero.maps || 0}{uiText(" 图", uiLocale)}</span><em>{hero.usageLabel}</em></article>
            )) : <p>{uiText("当前职责还没有英雄使用记录。", uiLocale)}</p>}
          </div>

          <div className={styles.statsDetailGrid}>
            <section className={styles.recentPerformance}>
              <div className={styles.subsectionHeading}><span>RECENT OFFICIAL MATCHES</span><h3>{uiText("近期正式比赛", uiLocale)}</h3></div>
              {recentMatches.length ? (
                <div className={styles.recentPerformanceList}>
                  {recentMatches.slice(0, 5).map((match, index) => (
                    <article key={match.matchId || match.key || index}>
                      <em data-result={String(match.result || '').toLowerCase()}>{matchResultLabel(match.result)}</em>
                      <div><strong>VS {match.opponent?.short || match.opponent || uiText("对手待定", uiLocale)}</strong><span>{match.dateLabel || uiText("时间待定", uiLocale)} · {match.scoreLabel || uiText("比分待定", uiLocale)}</span></div>
                      <div><strong>{match.heroLabel || match.primaryHero || '—'}</strong><span>{match.mapsPlayed || 0}{uiText(" 张正式地图 · ", uiLocale)}{match.coreMetric?.label || uiText("核心指标", uiLocale)} {match.coreMetric?.valueLabel || match.coreMetric?.value || '—'}</span></div>
                      {match.matchId ? <Link to={withSeason(`/matches/${encodeURIComponent(match.matchId)}`)}>{uiText("比赛资料 →", uiLocale)}</Link> : null}
                    </article>
                  ))}
                </div>
              ) : <p className={styles.detailEmpty}>{uiText("比赛数据产生后，会在这里形成最近五场记录。", uiLocale)}</p>}
            </section>

            <section className={styles.analysisPanel}>
              <div className={styles.subsectionHeading}><span>PLAYER NOTES</span><h3>{uiText("表现提示", uiLocale)}</h3></div>
              <div className={styles.analysisCards}>
                {scoutingNotes.length ? scoutingNotes.map(note => (
                  <article key={`${note.type}-${note.text}`}><span>{note.type}</span><p>{note.text}</p></article>
                )) : <article><span>{uiText("样本提示", uiLocale)}</span><p>{uiText("当前公开样本不足，达到赛季最低出场时间后生成表现提示。", uiLocale)}</p></article>}
                {achievements.slice(0, 2).map(item => (
                  <article key={item.label} data-kind="achievement"><span>SEASON MARK</span><strong>{item.label}</strong><p>{item.value}</p></article>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.statsMethodRail}>
            <article><span>APPEARANCE</span><strong>{uiText("正式出场口径", uiLocale)}</strong><p>{uiText("至少参加一张正式地图；仅报名但未上场不计入出场。", uiLocale)}</p></article>
            <article><span>ROLE SAMPLE</span><strong>{uiText("职责独立计算", uiLocale)}</strong><p>{uiText("不同职责的地图、时长、OVR 与排名互不混算。", uiLocale)}</p></article>
            <article><span>RANKING GATE</span><strong>{uiText("最低 ", uiLocale)}{workspace.minTimeMins}{uiText(" 分钟", uiLocale)}</strong><p>{uiText("达到职责最低时长后，才进入该职责的正式排行榜。", uiLocale)}</p></article>
          </section>
        </>
      ) : null}
    </section>
  )
}

function TeamPanel({ db, teamOverview, seasonId, withSeason, compact = false }) {
  const uiLocale = useUiLocale()
  if (!teamOverview) return null
  const roster = getTeamRosterPlayers(db, teamOverview.team)
  const staff = getTeamStaff(teamOverview.team)
  return (
    <section className={styles.contentSection}>
      <div className={styles.sectionHeading}>
        <div><span>MY TEAM</span><h2>{uiText("我的队伍", uiLocale)}</h2><p>{uiText("所属队伍来自当前赛季认证关系，不占用关注名额。", uiLocale)}</p></div>
        <Link to={withSeason(`/teams/${encodeURIComponent(teamOverview.teamRouteId || teamOverview.teamId)}`)}>{uiText("完整队伍资料 →", uiLocale)}</Link>
      </div>
      <div className={styles.teamPanelGrid}>
        <article className={styles.ownTeamCard}>
          <TeamLogo className={styles.teamLogo} team={teamOverview.team} seasonId={seasonId} large />
          <div><span>VERIFIED TEAM</span><strong>{teamOverview.shortName}</strong><p>{teamOverview.fullName}</p><em>{teamOverview.advance?.played ? `${teamOverview.advance.label} · ${teamOverview.advance.zone}` : uiText("晋级状态待更新", uiLocale)}</em></div>
        </article>
        <div className={styles.rosterPreview}>
          <div><span>ROSTER</span><strong>{roster.length}{uiText(" 名选手", uiLocale)}</strong></div>
          <ul>
            {roster.slice(0, compact ? 5 : 10).map(player => (
              <li key={getPlayerFavoriteId(player)}><strong>{player.display_name || player.nickname || player.player_name || player.player_id}</strong><span>{player.role || 'FLEX'}</span></li>
            ))}
          </ul>
          <div className={styles.staffPreview}>
            <article><span>{uiText("经理 / MANAGER", uiLocale)}</span><strong>{staff.managers.map(formatStaffPerson).filter(Boolean).join('、') || uiText("暂未登记", uiLocale)}</strong></article>
            <article><span>{uiText("教练 / COACH", uiLocale)}</span><strong>{staff.coaches.map(formatStaffPerson).filter(Boolean).join('、') || uiText("暂未登记", uiLocale)}</strong></article>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function MySpacePage() {
  const [params] = useSearchParams()
  if (params.get('section') === 'predictions') {
    const next = new URLSearchParams(params)
    next.set('section', 'overview')
    return <Navigate replace to={`/me?${next}`} state={{ spaceEntryNotice: 'UNKNOWN_SECTION' }} />
  }
  if (params.get('section') === 'security') {
    const next = new URLSearchParams(params)
    for (const key of ['section', 'platformSeason']) next.delete(key)
    return <Navigate replace to={`/account${next.size ? `?${next}` : ''}`} />
  }
  return <MySpaceContent />
}

function MySpaceContent() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const context = useOutletContext() || {}
  const {
    db,
    season,
    canonicalSeasonId = season?.publicCode || 'FCR2026',
    locale = 'zh-CN',
    favorites = { primaryTeamId: null, favoriteTeamIds: [], favoritePlayerIds: [] },
    favoriteLimits = { teams: 5, players: 12 },
    saveFavorites,
    accountIdentity,
    accountIdentityTarget,
    accountIdentities = [],
    accountCapabilities = {},
    authUser,
    accountPlayerIdentity,
    accountPlayerIdentityTarget,
    isAuthenticated = false
  } = context
  const [searchParams] = useSearchParams()
  const competition = useAccountCompetition(season?.id || canonicalSeasonId)
  const seasonId = competition.id
  const hasMatchingPublicSeason = seasonId === season?.id
  const requestedSection = searchParams.get('section') || 'overview'
  const needsParticipationAccess = requiresParticipationAccess(requestedSection)
  const { managerOpen, managerTab, openManager: openManagerPage, closeManager } = useFavoriteManagerNavigation(isAuthenticated)
  const effectivePlayerIdentity = accountPlayerIdentity || (accountIdentity?.identityType === 'PLAYER' ? accountIdentity : null)
  const effectivePlayerTarget = hasMatchingPublicSeason ? accountPlayerIdentityTarget || (effectivePlayerIdentity === accountIdentity ? accountIdentityTarget : null) : null
  const isVerifiedPlayer = Boolean(effectivePlayerIdentity?.isVerified)
  const pageLink = useMemo(
    () => path => buildSeasonLink(path, canonicalSeasonId, seasonId, context.navigationSearch || searchParams.toString()),
    [canonicalSeasonId, seasonId, context.navigationSearch, searchParams]
  )
  const [spaceContext, setSpaceContext] = useState(null)
  const [spaceContextLoading, setSpaceContextLoading] = useState(false)
  const [spaceContextError, setSpaceContextError] = useState('')
  const [accountLaunch, setAccountLaunch] = useState(null)
  const [accountLaunchLoading, setAccountLaunchLoading] = useState(false)
  const [accountLaunchError, setAccountLaunchError] = useState('')
  const [accountLaunchAttempt, setAccountLaunchAttempt] = useState(0)
  const spaceRequest = useRef(0)

  const identityTeamId = getTeamFavoriteId(effectivePlayerTarget?.team) || effectivePlayerTarget?.teamRouteId || ''
  const identityPlayerId = getPlayerFavoriteId(effectivePlayerTarget?.player) || effectivePlayerTarget?.playerRouteId || ''
  const identityFavorites = useMemo(() => sanitizeFavoritesForSeason({
    primaryTeamId: identityTeamId,
    favoriteTeamIds: [identityTeamId].filter(Boolean),
    favoritePlayerIds: [identityPlayerId].filter(Boolean)
  }, db), [db, identityPlayerId, identityTeamId])
  const resolvedIdentityTeamId = identityFavorites.favoriteTeamIds[0] || ''
  const resolvedIdentityPlayerId = identityFavorites.favoritePlayerIds[0] || ''
  const manualFavorites = useMemo(() => {
    const clean = sanitizeFavoritesForSeason(favorites, db)
    const favoriteTeamIds = clean.favoriteTeamIds.filter(id => id !== resolvedIdentityTeamId)
    const favoritePlayerIds = clean.favoritePlayerIds.filter(id => id !== resolvedIdentityPlayerId)
    return sanitizeFavoritesForSeason({
      primaryTeamId: favoriteTeamIds.includes(clean.primaryTeamId) ? clean.primaryTeamId : favoriteTeamIds[0] || null,
      favoriteTeamIds,
      favoritePlayerIds
    }, db)
  }, [db, favorites, resolvedIdentityPlayerId, resolvedIdentityTeamId])
  const teamOverview = useMemo(() => getPrimaryTeamOverview(db, identityFavorites, season), [db, identityFavorites, season])
  const publicDossier = useMemo(() => identityPlayerId ? getPlayerDossier(db, identityPlayerId, '', season) : null, [db, identityPlayerId, season])
  const dossier = useMemo(() => buildPlayerSpaceDossier({
    publicDossier,
    identity: effectivePlayerIdentity,
    target: effectivePlayerTarget,
    user: authUser
  }), [authUser, effectivePlayerIdentity, effectivePlayerTarget, publicDossier])
  useEffect(() => {
    if (!isAuthenticated || !seasonId || competition.loading || competition.error || competition.issue) {
      setAccountLaunch(null)
      setAccountLaunchError('')
      return undefined
    }
    const controller = new AbortController()
    setAccountLaunch(null)
    setAccountLaunchLoading(true)
    setAccountLaunchError('')
    fetchAccountLaunchStatus(seasonId, { signal: controller.signal })
      .then(nextLaunch => { if (!controller.signal.aborted) setAccountLaunch({ ...nextLaunch, accountUserId: authUser?.id }) })
      .catch(error => {
        if (!controller.signal.aborted) setAccountLaunchError(error?.status === 404
          ? '暂未找到本届参赛入口，请联系周赛管理员核对赛事配置。'
          : error?.message || '参赛权限暂时无法读取，请重试。')
      })
      .finally(() => { if (!controller.signal.aborted) setAccountLaunchLoading(false) })
    return () => controller.abort()
  }, [accountLaunchAttempt, authUser?.id, isAuthenticated, seasonId, competition.loading, competition.error, competition.issue])

  const accountPortalAllowed = accountLaunch?.seasonId === seasonId && accountLaunch?.accountUserId === authUser?.id && Boolean(accountLaunch?.allowed)
  const taskCenterAllowed = accountLaunch?.seasonId === seasonId && accountLaunch?.accountUserId === authUser?.id && Boolean(accountLaunch?.taskCenterAllowed)
  const accountSpaceAllowed = accountPortalAllowed || taskCenterAllowed

  useEffect(() => {
    const requestId = ++spaceRequest.current
    if (!isAuthenticated || !seasonId || !accountSpaceAllowed) {
      setSpaceContext(null)
      return undefined
    }
    let cancelled = false
    setSpaceContextLoading(true)
    setSpaceContextError('')
    fetchSynchronizedSpaceContext(seasonId)
      .then(nextContext => { if (!cancelled && requestId === spaceRequest.current) setSpaceContext(nextContext) })
      .catch(error => { if (!cancelled && requestId === spaceRequest.current) setSpaceContextError(error?.message || '身份与赛事关系同步失败。') })
      .finally(() => { if (!cancelled && requestId === spaceRequest.current) setSpaceContextLoading(false) })
    return () => { cancelled = true; spaceRequest.current += 1 }
  }, [accountSpaceAllowed, authUser?.id, isAuthenticated, seasonId])

  const refreshSpaceContext = useCallback(async () => {
    if (!isAuthenticated || !seasonId || !accountSpaceAllowed) return
    const requestId = ++spaceRequest.current
    setSpaceContextLoading(true)
    setSpaceContextError('')
    try {
      const nextContext = await fetchSynchronizedSpaceContext(seasonId)
      if (requestId === spaceRequest.current) setSpaceContext(nextContext)
    } catch (error) {
      if (requestId === spaceRequest.current) setSpaceContextError(error?.message || '身份与赛事关系同步失败。')
    } finally {
      if (requestId === spaceRequest.current) setSpaceContextLoading(false)
    }
  }, [accountSpaceAllowed, isAuthenticated, seasonId])

  const handleTaskSummaryChange = useCallback(summary => {
    setSpaceContext(current => current ? {
      ...current,
      overview: { ...(current.overview || {}), ...summary }
    } : current)
  }, [])

  const verifiedIdentityTypes = useMemo(() => new Set(accountIdentities
    .filter(identity => identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase()))
    .map(identity => String(identity?.identityType || identity?.type || '').toUpperCase())), [accountIdentities])
  const fallbackPrimaryIdentityType = String(accountIdentity?.identityType || accountIdentity?.type || '').toUpperCase() || (isVerifiedPlayer ? 'PLAYER' : 'VIEWER')
  const currentSpaceContext = spaceContext?.seasonId === seasonId && spaceContext?.user?.id === authUser?.id ? spaceContext : null
  useEffect(() => {
    // Remember only server-confirmed context, scoped to the current account.
    if (!currentSpaceContext || !accountPortalAllowed) return
    try { rememberCompetition(authUser.id, seasonId, globalThis.sessionStorage) } catch { /* Navigation still works without storage. */ }
  }, [currentSpaceContext, accountPortalAllowed, authUser?.id, seasonId])
  const effectiveSpaceContext = useMemo(() => currentSpaceContext || {
    seasonId,
    user: {
      id: authUser?.id,
      displayName: authUser?.displayName || authUser?.username || '我的',
      username: authUser?.username || '',
      emailVerified: Boolean(authUser?.emailVerified || authUser?.emailVerifiedAt)
    },
    identities: verifiedIdentityTypes.size ? [...verifiedIdentityTypes].map(type => ({ id: type, type, label: type, isPrimary: type === fallbackPrimaryIdentityType, seasonContextCount: 0 })) : [],
    primaryIdentityType: fallbackPrimaryIdentityType,
    teamContexts: [],
    staffContext: { refereeAssignments: [], broadcastRefereeAssignments: [], casterAssignments: [], availability: [] },
    overview: { openTaskCount: 0, unreadNotificationCount: 0, tasks: [], nextTeamMatch: null, nextStaffAssignment: null },
    sections: {
      player: isVerifiedPlayer,
      team: Boolean(accountCapabilities.canAccessTeamSpace),
      referee: verifiedIdentityTypes.has('REFEREE'),
      caster: verifiedIdentityTypes.has('CASTER'),
      viewer: verifiedIdentityTypes.size === 0
    }
  }, [accountCapabilities.canAccessTeamSpace, authUser, currentSpaceContext, fallbackPrimaryIdentityType, isVerifiedPlayer, seasonId, verifiedIdentityTypes])
  const registrationPolicy = registrationEntryPolicy(effectiveSpaceContext, competition.selected, searchParams.get('team'))
  const canShowRegistrationEntry = effectiveSpaceContext.contract === 'ACCOUNT_FOUNDATION_V1' && hasAccountFeatureAccess(accountLaunch, 'teamOperations') && registrationPolicy.visible
  const spaceSections = useMemo(() => buildSpaceSections({
    administrativeTasks: Boolean(effectiveSpaceContext.sections?.tasks),
    registration: canShowRegistrationEntry,
    publicStats: hasMatchingPublicSeason,
    player: isVerifiedPlayer && (
      effectiveSpaceContext.capabilitySnapshot
        ? hasResolvedCapability(effectiveSpaceContext, 'player.profile.view')
        : true
    ),
    team: shouldExposeTeamSpace({
      isVerifiedPlayer,
      hasVerifiedTeamIdentity: accountCapabilities.canAccessTeamSpace || (effectiveSpaceContext.identities || []).some(identity => ['MANAGER', 'COACH'].includes(String(identity.type || identity.identityType || '').toUpperCase())),
      hasPendingTeamWorkflow: (effectiveSpaceContext.overview?.tasks || []).some(task => String(task.actionUrl || '').includes('section=team')),
      hasCapabilitySnapshot: Boolean(effectiveSpaceContext.capabilitySnapshot),
      hasTeamOperations: hasResolvedCapability(effectiveSpaceContext, 'team.operations.view'),
      sectionEnabled: effectiveSpaceContext.sections?.team
    }),
    manager: String(effectiveSpaceContext.primaryIdentityType || '').toUpperCase() === 'MANAGER' ||
      (effectiveSpaceContext.identities || []).some(identity => String(identity.type || identity.identityType || '').toUpperCase() === 'MANAGER'),
    referee: effectiveSpaceContext.capabilitySnapshot
      ? hasResolvedCapability(effectiveSpaceContext, 'staff.referee.workspace.view')
      : Boolean(effectiveSpaceContext.sections?.referee),
    caster: effectiveSpaceContext.capabilitySnapshot
      ? hasResolvedCapability(effectiveSpaceContext, 'staff.caster.workspace.view')
      : Boolean(effectiveSpaceContext.sections?.caster),
    weekly: effectiveSpaceContext.competitionKind === 'WEEKLY',
    weeklyRooms: Boolean(effectiveSpaceContext.sections?.weeklyRooms),
    launch: accountLaunch
  }), [accountCapabilities.canAccessTeamSpace, accountLaunch, effectiveSpaceContext, isVerifiedPlayer, hasMatchingPublicSeason, canShowRegistrationEntry])
  const playerWorkspaceStatusBase = buildPlayerWorkspaceStatus(effectiveSpaceContext, dossier)
  const hydratedPlayerTeamLabel = getHydratedSeasonTeamLabel(effectiveSpaceContext, 'PLAYER')
  const playerStatusTeamLabel = hydratedPlayerTeamLabel
    || (playerWorkspaceStatusBase.key !== 'WAITING_TEAM' ? dossier?.identity?.teamShort : '')
  const playerWorkspaceStatus = playerStatusTeamLabel
    ? { ...playerWorkspaceStatusBase, teamLabel: playerStatusTeamLabel }
    : playerWorkspaceStatusBase
  const playerStatsWorkspace = useMemo(() => buildPlayerStatsWorkspace(dossier), [dossier])
  const managerWorkspaceStatusBase = buildManagerWorkspaceStatus(effectiveSpaceContext)
  const hydratedManagerTeamLabel = getHydratedSeasonTeamLabel(effectiveSpaceContext, 'MANAGER')
  const managerActiveTeam = managerWorkspaceStatusBase.activeTeam?.seasonTeam || managerWorkspaceStatusBase.activeTeam?.teamOrganization || null
  const managerStatusTeamLabel = hydratedManagerTeamLabel || managerActiveTeam?.shortName || managerActiveTeam?.name || ''
  const managerWorkspaceStatus = managerStatusTeamLabel
    ? { ...managerWorkspaceStatusBase, teamLabel: managerStatusTeamLabel }
    : managerWorkspaceStatusBase
  const primarySpaceIdentityType = getPrimarySpaceIdentityType(effectiveSpaceContext, fallbackPrimaryIdentityType)
  const isPrimaryPlayer = primarySpaceIdentityType === 'PLAYER' && isVerifiedPlayer
  const isPrimaryManager = primarySpaceIdentityType === 'MANAGER'
  const spaceEntry = resolveSpaceEntry({ search: location.search, sections: spaceSections, weekly: effectiveSpaceContext.competitionKind === 'WEEKLY', staffRoles: competition.selected?.staffRoles || [] })
  const activeSection = spaceEntry.section
  const participationView = activeSection === 'overview' && (searchParams.has('journey') || searchParams.has('progress'))
  const pageView = `${activeSection}:${participationView}:${searchParams.get('manage') || ''}`
  const previousSection = useRef(pageView)
  useEffect(() => {
    if (previousSection.current !== pageView && navigationType !== 'POP' && getRestoreScrollY(location.state) === null) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    previousSection.current = pageView
  }, [pageView, location.state, navigationType])
  const showIdentityContext = spaceContextLoading || Boolean(spaceContextError)
  const registrationEntry = canShowRegistrationEntry ? <SeasonRegistrationEntry seasonId={seasonId} withSeason={pageLink} className={styles.spaceContextState} allowCreate={registrationPolicy.allowCreate} /> : null
  const activityAccess = getAccountActivityAccess(effectiveSpaceContext, accountLaunch)
  const { canViewWeeklyCompetition, canViewWeeklyMatchRooms } = activityAccess
  const canWriteWeeklyCompetition = !activityAccess.preparationReadOnly
  const canWriteMatchRooms = !activityAccess.roomsReadOnly
  const activityEnabled = isAuthenticated && accountSpaceAllowed && Boolean(currentSpaceContext)
  const activity = useAccountActivity({ seasonId, userId: authUser?.id, identityType: effectiveSpaceContext.primaryIdentityType,
    enabled: activityEnabled, view: activeSection, ...activityAccess })
  const navigationSummary = { ...effectiveSpaceContext.overview,
    openTaskCount: activityEnabled && activity.status === 'ready' ? activity.taskView.openTasks.length : null,
    taskSyncStatus: activityEnabled ? activity.status : 'loading' }
  const relationshipMatches = <RelationshipMatchesPanel context={effectiveSpaceContext} withSeason={pageLink} />
  const matchesWorkspace = canViewWeeklyMatchRooms
    ? <WeeklyMatchRoomsWorkspace key={`${seasonId}:${authUser?.id || ''}`} seasonId={seasonId} readOnly={!canWriteMatchRooms} withSeason={pageLink} onActivityChange={activity.refresh} tasksVisible={spaceSections.some(section => section.id === 'tasks')} preparationVisible={canViewWeeklyCompetition && spaceSections.some(section => section.id === 'team')}>{relationshipMatches}</WeeklyMatchRoomsWorkspace>
    : relationshipMatches
  const isWeekly = effectiveSpaceContext.competitionKind === 'WEEKLY'
  const canUseScheduleNegotiation = (isWeekly && canViewWeeklyMatchRooms) || hasAccountFeatureAccess(accountLaunch, 'scheduleNegotiation', 'WRITE')

  const openManager = tab => {
    openManagerPage(tab, 'following')
  }
  const handleSave = async nextFavorites => {
    if (typeof saveFavorites !== 'function') throw new Error('Following is unavailable')
    await saveFavorites(nextFavorites)
    showSaveToast(locale)
  }
  const publicSnapshotReady = !context.publicSnapshotState || context.publicSnapshotState === 'ready'
  const followingSummary = publicSnapshotReady
    ? <FollowingDigest scopeLabel={hasMatchingPublicSeason ? '' : locale === 'en-US' ? `Public archive · ${season?.name?.en || canonicalSeasonId}` : uiText("公开赛事档案 · {0}", locale, [season?.name?.zh || canonicalSeasonId])} db={db} favorites={manualFavorites} season={season} locale={locale} withSeason={pageLink} onManageTeams={() => openManager('teams')} onManagePlayers={() => openManager('players')} />
    : <section className={styles.spaceContextState} role="status" data-i18n-ignore>
      <strong>{locale === 'en-US' ? 'Following data is not ready' : uiText("关注赛事资料尚未就绪", locale)}</strong>
      <p>{locale === 'en-US'
        ? 'Your participation tasks are available above. Following updates will appear when public event data is loaded.'
        : uiText("你可以继续处理上方参赛事项，公开赛事资料载入后会显示关注动态。", locale)}</p>
      <Link to={pageLink('/me?section=following')}>{locale === 'en-US' ? 'View following data status' : uiText("查看关注资料状态", locale)}</Link>
    </section>

  const competitionBar = <AccountCompetitionBar competition={competition} locale={locale} withSeason={pageLink} />
  if (isAuthenticated && needsParticipationAccess && (competition.loading || competition.error || competition.issue)) {
    const entrySections = ['overview', 'events', 'following', 'security'].map(id => SPACE_SECTION_DEFINITIONS[id])
    const entrySection = requestedSection === 'overview' ? 'overview' : 'events'
    return <main className={styles.page} data-design="signal" data-page-mode="control" data-native-mobile>
      <SpaceHeader>
        <MobileSpaceBack section={entrySection} withSeason={pageLink} locale={locale} />
        <div className={entrySection === 'overview' ? styles.homeIdentity : styles.desktopIdentity}>
        <SpaceIdentity context={effectiveSpaceContext} locale={locale} withSeason={pageLink} />
        </div>
        <div className={styles.desktopSpaceNavigation}><SpaceTabs activeSection={entrySection} withSeason={pageLink} sections={entrySections} locale={locale} /></div>
      </SpaceHeader>
      {entrySection === 'overview' ? <MobileSpaceMenu sections={entrySections.filter(section => section.id !== 'overview')} withSeason={pageLink} locale={locale} /> : null}
      <AccountCompetitionBar competition={competition} locale={locale} withSeason={pageLink} entry mobileHome={entrySection === 'overview'} />
    </main>
  }

  if (isAuthenticated && needsParticipationAccess && (accountLaunchLoading || ((accountLaunch?.seasonId !== seasonId || accountLaunch?.accountUserId !== authUser?.id) && !accountLaunchError))) {
    return <>{competitionBar}<RoomGuideLink season={seasonId} scenario="access" label="无法操作？查看指南" /><AccountReleaseGate launch={accountLaunch} loading withSeason={pageLink} /></>
  }

  if (isAuthenticated && needsParticipationAccess && (accountLaunchError || !(accountPortalAllowed || taskCenterAllowed && ['overview', 'tasks'].includes(requestedSection)))) {
    return <>{competitionBar}<RoomGuideLink season={seasonId} scenario="access" label="无法操作？查看指南" /><AccountReleaseGate launch={accountLaunch} error={accountLaunchError} withSeason={pageLink} onRetry={() => setAccountLaunchAttempt(value => value + 1)} /></>
  }

  if (isAuthenticated && needsParticipationAccess && !currentSpaceContext) {
    return (
      <main className={styles.page} data-design="signal">
        <SpaceHeader>
          <SpaceIdentity context={effectiveSpaceContext} withSeason={pageLink} locale={locale} />
          {competitionBar}
        </SpaceHeader>
        <IdentityContextStrip context={effectiveSpaceContext} loading={spaceContextLoading || !spaceContextError} error={spaceContextError} />
        <section className={styles.spaceContextState} data-error={spaceContextError ? 'true' : 'false'}>
          <span>{spaceContextError ? 'SYNC INTERRUPTED' : 'SYNCING EVENT CONTEXT'}</span>
          <strong>{spaceContextError ? uiText("赛事账号暂时无法完成同步", locale) : uiText("正在读取你的赛事关系与待办", locale)}</strong>
          <p>{spaceContextError || uiText("同步完成前不会把未知状态显示成“没有待办”。", locale)}</p>
          {spaceContextError ? <button type="button" onClick={refreshSpaceContext}>{uiText("重新同步", locale)}</button> : null}
        </section>
      </main>
    )
  }

  if (!isAuthenticated && isCompetitionMatchesEntry({ pathname: '/me', search: searchParams.toString() })) {
    const copy = reminderCopy(locale)
    return <main className={styles.page} data-design="signal" data-i18n-ignore>
      <section className={styles.releaseGate}>
        <div className={styles.releaseGateCopy}>
          <span>MATCH REMINDERS</span>
          <h1>{copy.signInTitle}</h1>
          <p>{copy.signInDescription}</p>
          <nav aria-label={copy.title}>
            <button type="button" onClick={() => window.dispatchEvent(new Event('fries-cup:open-account'))}>{copy.signInAction}</button>
          </nav>
        </div>
      </section>
    </main>
  }
  if (!isAuthenticated && requestedSection === 'team' && isWeeklyOverview(db, season)) return <main className={styles.page} data-design="signal">
    <section className={styles.releaseGate}>
      <div className={styles.releaseGateCopy}>
        <span>WEEKLY / PARTICIPATION</span>
        <h1>{uiText('本周参赛确认', locale)}</h1>
        <p>{uiText('请先登录参赛账号，登录后继续确认本周参赛并提交出赛名单。', locale)}</p>
        <RoomGuideLink season={seasonId} role="manager" label="参赛与比赛指南" /><nav aria-label={uiText('报名与参赛', locale)}>
          <button type="button" onClick={() => window.dispatchEvent(new Event('fries-cup:open-account'))}>{uiText('登录参赛账号 →', locale)}</button>
          <Link to={pageLink(`/participate/${encodeURIComponent(seasonId)}`)}>{uiText('首次报名 / 继续报名', locale)}</Link>
        </nav>
      </div>
    </section>
  </main>
  if (!isAuthenticated) return <><div className={styles.guideEntry}><RoomGuideLink label="参赛与比赛指南" /></div><FollowingPage /></>
  if (currentSpaceContext && spaceEntry.replacement) return <Navigate replace to={spaceEntry.replacement} state={{ ...location.state, spaceEntryNotice: spaceEntry.notice }} />
  return (
    <main className={styles.page} data-design="signal" data-native-mobile data-page-mode={activeSection === 'following' ? 'index' : 'control'}>
      <SpaceHeader>
        <MobileSpaceBack section={participationView ? 'progress' : activeSection} withSeason={pageLink} locale={locale} />
        <div className={activeSection === 'overview' && !participationView ? styles.homeIdentity : styles.desktopIdentity}>
        <SpaceIdentity context={effectiveSpaceContext} locale={locale} withSeason={pageLink} following={activeSection === 'following'}
          contextContent={needsParticipationAccess ? <AccountCompetitionBar competition={competition} locale={locale} withSeason={pageLink} compact /> : null}
          actions={<RoomGuideLink season={seasonId} label="参赛指南" className={styles.spaceGuide} />} />
        </div>
        {showIdentityContext && needsParticipationAccess ? <IdentityContextStrip context={effectiveSpaceContext} loading={spaceContextLoading} error={spaceContextError} /> : null}
        <div className={styles.desktopSpaceNavigation}><SpaceTabs key={activeSection} activeSection={activeSection} withSeason={pageLink} sections={spaceSections} overview={navigationSummary} locale={locale} /></div>
      </SpaceHeader>
      {location.state?.spaceEntryNotice ? <SpaceEntryNotice reason={location.state.spaceEntryNotice} locale={locale} withSeason={pageLink} /> : null}
      {['overview', 'tasks'].includes(activeSection) ? <AccountActivityWorkspace key={`${seasonId}:${authUser?.id || ''}`} view={activeSection} activity={activity} locale={locale} participationView={participationView} quickEntries={activeSection === 'overview' ? <MobileSpaceMenu sections={spaceSections} overview={navigationSummary} withSeason={pageLink} locale={locale} /> : null} registrationEntry={activeSection === 'overview' && registrationPolicy.onHome ? registrationEntry : null} context={effectiveSpaceContext} withSeason={pageLink} sections={spaceSections} followingSummary={followingSummary} managerStatus={isPrimaryManager ? managerWorkspaceStatus : null} playerStatus={isPrimaryPlayer ? playerWorkspaceStatus : null} genericTasks={hasAccountFeatureAccess(accountLaunch, 'communications')} weeklyPreparation={isWeekly && canViewWeeklyCompetition && spaceSections.some(section => section.id === 'team')} weeklyRooms={isWeekly && canViewWeeklyMatchRooms && spaceSections.some(section => section.id === 'matches')} roomsReadOnly={!canWriteMatchRooms} /> : null}
      {activeSection === 'stream' ? <PlayerStreamWorkspace key={seasonId} seasonId={seasonId} /> : null}
      {activeSection === 'events' ? <MyEventsPanel context={effectiveSpaceContext} withSeason={pageLink} /> : null}
      {activeSection === 'communications' ? <AccountCommunicationsCenter seasonId={seasonId} capabilitySnapshot={effectiveSpaceContext.capabilitySnapshot} withSeason={pageLink} onSummaryChange={handleTaskSummaryChange} onActivityChange={activity.refresh} /> : null}
      {activeSection === 'matches' ? <>{matchesWorkspace}{canUseScheduleNegotiation ? <ScheduleNegotiationWorkspace seasonId={seasonId} capabilitySnapshot={effectiveSpaceContext.capabilitySnapshot} /> : null}</> : null}
      {activeSection === 'stats' ? <><WorkspaceSectionHeader eyebrow="MY STATS" title={uiText("我的数据", locale)} description={uiText("正式出场、职责样本、排名和英雄池都从本届公开比赛数据自动生成。", locale)} badge={playerStatsWorkspace.status.key === 'RANKED' ? `${playerStatsWorkspace.totals.rankedRoles} RANKED ROLES` : playerStatsWorkspace.status.key.replaceAll('_', ' ')} /><PerformancePanel dossier={dossier} statsWorkspace={playerStatsWorkspace} withSeason={pageLink} expanded /></> : null}
      {activeSection === 'team' ? <>{canViewWeeklyCompetition ? <WeeklyCompetitionWorkspace seasonId={seasonId} readOnly={!canWriteWeeklyCompetition} onActivityChange={activity.refresh} /> : null}{canShowRegistrationEntry ? registrationEntry : null}{!canViewWeeklyCompetition && !canShowRegistrationEntry ? <ReadOnlyWorkspaceNotice title={uiText("队伍与名单暂为只读", locale)} description={uiText("当前队伍资料仅供查看。如需更新参赛名单，请联系周赛管理员核对本届权限。", locale)} /> : null}{teamOverview?.team ? <TeamPanel db={db} teamOverview={teamOverview} seasonId={seasonId} withSeason={pageLink} /> : null}</> : null}
      {activeSection === 'referee' ? <RefereeWorkspace context={effectiveSpaceContext} withSeason={pageLink} onContextChange={refreshSpaceContext} /> : null}
      {activeSection === 'caster' ? <CasterWorkspace context={effectiveSpaceContext} withSeason={pageLink} onContextChange={refreshSpaceContext} /> : null}
      {activeSection === 'following' ? <FollowingWorkspace key={`${seasonId}:${authUser?.id || ''}`} db={db} favorites={manualFavorites} favoriteLimits={favoriteLimits} locale={locale} season={season} withSeason={pageLink} isAuthenticated accountId={authUser?.id} onSave={handleSave} excludedFavorites={identityFavorites} syncStatus={context.favoritesSyncStatus} syncError={context.favoritesSyncError} onManageTeams={() => openManager('teams')} onManagePlayers={() => openManager('players')} /> : null}

      <FavoriteManagerDialog open={managerOpen && publicSnapshotReady} db={db} favorites={manualFavorites} seasonId={canonicalSeasonId} accountId={authUser?.id} locale={locale} syncStatus={context.favoritesSyncStatus} excludedFavorites={identityFavorites} initialTab={managerTab} onClose={closeManager} onSave={handleSave} />
    </main>
  )
}
