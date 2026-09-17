import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  accessTeamPrivateContact,
  applyToTeam,
  cancelManagerTransfer,
  createTeamClaim,
  fetchCoachContext,
  fetchEventContext,
  fetchFreeAgents,
  fetchManagerTransferContext,
  fetchRecruitingTeams,
  initiateManagerTransfer,
  inviteEventCoach,
  inviteLongTermCoach,
  invitePlayer,
  leaveEventCoachRole,
  leaveLongTermCoachTeam,
  removeEventCoach,
  removeLongTermCoach,
  respondToEventCoachInvitation,
  respondToLongTermCoachInvitation,
  respondToManagerTransfer,
  respondToTeamInvitation,
  reviewTeamApplication,
  saveRosterConfiguration,
  saveFreeAgentProfile,
  submitOfficialRoster,
  submitTeamRegistration,
  updateRecruitment,
  withdrawOfficialRoster,
  withdrawTeamApplication
} from './eventRegistrationApi.js'
import originalStyles from './EventRegistrationWorkspace.module.css'
import signalStyles from '../account-ui/SignalWorkspace.module.css'
import { combineDesignStyles } from '../fd-design/designPreview.js'
const styles = combineDesignStyles(originalStyles, signalStyles)
import RosterChangeWorkspace from '../roster-change/RosterChangeWorkspace.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  resolveCapabilityAccess
} from '../capabilities/capabilityUi.js'
import {
  buildEventRegistrationJourney,
  buildManagerPeopleWorkspace,
  buildManagerTeamOperationsView,
  buildPlayerRegistrationFlow,
  hasVerifiedIdentity
} from './eventRegistrationModel.js'

const ROLE_OPTIONS = [
  { value: 'TANK', label: '重装' },
  { value: 'DPS', label: '输出' },
  { value: 'SUP', label: '支援' },
  { value: 'FLEX', label: '补位' }
]

function readImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择文件。'))
    reader.readAsDataURL(file)
  })
}

const STATUS_LABELS = {
  DRAFT: '草稿',
  SUBMITTED: '审核中',
  APPROVED: '已通过',
  REJECTED: '未通过',
  WITHDRAWN: '已撤回',
  LOCKED: '已锁定',
  PENDING: '待处理',
  ACCEPTED: '已接受',
  EXPIRED: '已失效',
  CLOSED: '已关闭',
  MATCHED: '已加入队伍',
  OPEN: '开放中',
  INVITED: '待本人确认',
  ACTIVE: '已生效',
  DECLINED: '已拒绝',
  LEFT: '已退出',
  REVOKED: '已撤销',
  CANCELLED: '已取消',
  NOT_SELECTED: '当前未入选',
  REMOVED: '未列入当前名单'
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—'
}

function roleLabel(role) {
  return ROLE_OPTIONS.find(option => option.value === role)?.label || role || '职责待定'
}

function teamId(team) {
  return String(team?.team_id || team?.id || '').trim()
}

function teamName(team) {
  return String(team?.team_name || team?.name || team?.team_short_name || team?.shortName || teamId(team)).trim()
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
}

function formatManagerMatchTime(value) {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function findManagerTeamContext(teamContexts, team, registration) {
  const registrationId = String(registration?.id || '')
  const organizationId = String(team?.id || team?.team_id || '')
  return teamContexts.find(teamContext => (
    (registrationId && String(teamContext?.registrationId || '') === registrationId)
    || (organizationId && [teamContext?.teamOrganization?.id, teamContext?.seasonTeam?.id]
      .some(id => String(id || '') === organizationId))
  )) || null
}

function managerMatchOpponent(match, team) {
  if (!match) return null
  const organizationId = String(team?.id || team?.team_id || '')
  const isOwnTeam = candidate => {
    const candidateId = String(candidate?.id || candidate?.teamId || candidate?.team_id || '')
    const candidateName = String(candidate?.shortName || candidate?.name || '').toUpperCase()
    return (organizationId && candidateId === organizationId)
      || candidateName === String(team?.shortName || '').toUpperCase()
  }
  if (isOwnTeam(match.teamA)) return match.teamB || null
  if (isOwnTeam(match.teamB)) return match.teamA || null
  return match.opponent || match.teamB || match.teamA || null
}

function managerSeasonPath(path, seasonId) {
  const [pathname, query = ''] = String(path || '/').split('?')
  const params = new URLSearchParams(query)
  if (seasonId) params.set('season', seasonId)
  const suffix = params.toString()
  return `${pathname}${suffix ? `?${suffix}` : ''}`
}

function errorText(error) {
  const capabilityMessage = capabilityDeniedMessage(error)
  if (capabilityMessage) return capabilityMessage
  const code = error?.data?.error || ''
  const copy = {
    EMAIL_VERIFICATION_REQUIRED: '请先完成邮箱验证。',
    TEAM_CLAIM_PENDING: '已有相同的队伍创建或认领申请正在审核。',
    TEAM_LOGO_INVALID: '图片无法读取，请重新选择 PNG、JPG 或静态 WebP。',
    TEAM_LOGO_FORMAT: '仅支持 PNG、JPG 和静态 WebP，不支持动图。',
    TEAM_LOGO_TOO_LARGE: '队伍 Logo 原图不能超过 2 MB。',
    TEAM_LOGO_TOO_COMPLEX: 'Logo 压缩后仍过大，请换一张更简单的图片。',
    TEAM_LOGO_STORAGE: '队伍 Logo 暂时无法保存，请稍后重试。',
    TEAM_ALREADY_CLAIMED: '这支历史队伍已经被认领。',
    TEAM_ALREADY_REGISTERED: '该长期队伍已经提交本届赛事报名。',
    PLAYER_APPLICATION_EXISTS: '你在本届赛事已有一个待处理的主动申请。',
    PLAYER_ALREADY_ON_EVENT_TEAM: '你已经进入本届赛事另一支队伍的候选阵容。',
    CROSS_TEAM_ROLE_FORBIDDEN: '同一账号本届赛事默认不能跨队担任选手、经理或教练。',
    TEAM_NOT_ACCEPTING_APPLICATIONS: '这支队伍当前不接受公开申请。',
    REGISTRATION_ACCESS_FORBIDDEN: '当前账号尚未获得本届报名权限。',
    REGISTRATION_READ_ONLY: '本届报名当前为只读状态，暂不能提交修改。',
    REGISTRATION_CLOSED: '本届报名入口已关闭，请联系赛事负责人处理。',
    REGISTRATION_DEADLINE: '报名已经截止，请联系赛事负责人处理补报或变更。',
    REGISTRATION_CHANGED: '报名资料刚刚发生变化，请刷新后再操作。',
    REGISTRATION_FROZEN: '这份报名已经提交或结束，当前不能直接修改。',
    ROSTER_FULL: '报名人数已达到上限，请先移除一名草稿成员。',
    MEMBER_ALREADY_CONFIRMED: '这名选手已经确认，需先撤回本人确认后才能修改。',
    MEMBER_NOT_FOUND: '报名中找不到这名选手，请刷新后重试。',
    OWNER_INVITATION_REQUIRED: '创建报名需要先接受本届负责人邀请。',
    PLAYER_CONSENT_REQUIRED: '所有选手都需要使用本人账号确认后才能提交。',
    DUPLICATE_PLAYER: '名单中存在重复选手或 BattleTag，请检查后重试。',
    INVALID_INPUT: '请检查必填信息、联系方式和格式。',
    INVALID_LOGO_URL: '队伍 Logo 必须使用有效的 http 或 https 图片地址。',
    PLAYER_INVITATION_EXISTS: '该选手已经收到本队尚未处理的邀请。',
    INVITATION_EXPIRED: '邀请已经过期。',
    APPLICATION_NOT_PENDING: '这条申请已经被处理，请查看最新状态。',
    INVITATION_NOT_PENDING: '这条邀请已经被处理，请查看最新状态。',
    REGISTRATION_NOT_RECRUITING: '这支队伍当前不能继续处理入队申请或邀请。',
    ROSTER_SIZE_INVALID: '本届注册名单必须包含 5–7 名选手。',
    ROSTER_VALIDATION_FAILED: '名单尚未满足提交规则，请检查人数、职责和队长设置。',
    PLAYER_ROLE_REQUIRED: '本届注册名单中的所有选手都必须设置主要职责。',
    CAPTAIN_NOT_ELIGIBLE: '队长必须是经理或本届注册名单选手。',
    DEPUTY_CAPTAIN_NOT_ELIGIBLE: '副队长必须是本届注册名单选手。',
    OFFICER_ROLE_CONFLICT: '队长和副队长不能是同一个账号。',
    PASSWORD_CONFIRMATION_FAILED: '当前密码不正确。',
    ROSTER_FROZEN: '名单已经提交，当前不能继续增减候选选手。',
    CONCURRENT_UPDATE: '名单状态刚刚发生变化，请刷新后重试。',
    SEASON_PLAYER_MISMATCH: '选手与本届赛事数据绑定不一致，请联系赛事管理员处理。',
    COACH_ACCOUNT_NOT_FOUND: '没有找到匹配该用户名或 BattleTag 的有效账号。',
    COACH_LOOKUP_AMBIGUOUS: '这个 BattleTag 匹配了多个账号，请改用精确用户名邀请。',
    COACH_INVITATION_EXISTS: '该账号已有待确认的长期教练邀请。',
    COACH_ALREADY_ON_TEAM: '该账号已经是这支队伍的长期教练。',
    COACH_IDENTITY_RESTRICTED: '该账号的教练身份已被暂停或撤销，不能通过邀请自动恢复。',
    EVENT_COACH_LIMIT_REACHED: '本届最多同时保留 2 名待确认或已生效的正式教练。',
    EVENT_COACH_INVITATION_EXISTS: '该教练已有待确认的本届邀请。',
    EVENT_COACH_ALREADY_ACTIVE: '该教练已经是本届正式教练。',
    EVENT_COACH_SYSTEM_REVOKED: '该本届教练关系已被 System 撤销，经理不能自行恢复。',
    ACTIVE_TEAM_COACH_REQUIRED: '需要先建立有效的长期教练关系。',
    MANAGER_TRANSFER_PENDING: '这支队伍已经有一项待确认的经理交接。',
    MANAGER_TRANSFER_EXPIRED: '经理交接已经过期，请由当前经理重新发起。',
    MANAGER_TRANSFER_NOT_PENDING: '这项经理交接已经被处理。',
    MANAGER_TRANSFER_SELF_FORBIDDEN: '不能把管理权转让给当前账号。',
    TARGET_ALREADY_TEAM_MANAGER: '该账号已经是这支队伍的经理。',
    MANAGER_IDENTITY_RESTRICTED: '目标账号的经理身份已被暂停或撤销，不能自动恢复。'
  }
  return copy[code] || error?.message || '操作失败，请稍后重试。'
}

function RoleSelect({ value, onChange, disabled = false, allowUnknown = false, ariaLabel = '' }) {
  const uiLocale = useUiLocale()
  return (
    <select aria-label={ariaLabel || undefined} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {allowUnknown ? <option value="UNKNOWN">{uiText("请选择职责", uiLocale)}</option> : null}
      {ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
    </select>
  )
}

function StatusChip({ status }) {
  return <em className={styles.statusChip} data-status={status}>{statusLabel(status)}</em>
}

function EmptyBlock({ title, children }) {
  return <div className={styles.emptyBlock}><strong>{title}</strong><span>{children}</span></div>
}

function PlayerFlowGroup({ eyebrow, title, description, badge = '', tone = 'default', children }) {
  return (
    <section className={styles.playerFlowGroup} data-tone={tone}>
      <header>
        <div><span>{eyebrow}</span><h4>{title}</h4><p>{description}</p></div>
        {badge ? <em>{badge}</em> : null}
      </header>
      <div className={styles.playerFlowGroupBody}>{children}</div>
    </section>
  )
}

function RegistrationJourney({ journey }) {
  const uiLocale = useUiLocale()
  const completedCount = journey.stages.filter(stage => stage.state === 'done').length
  const isComplete = completedCount === journey.stages.length
  const currentStage = journey.stages.find(stage => ['attention', 'current'].includes(stage.state)) || journey.stages.at(-1)
  const actionTarget = journey.mode === 'manager'
    ? 'manager-registration-flow'
    : journey.mode === 'player'
      ? 'player-registration-flow'
      : journey.mode === 'coach'
        ? 'coach-registration-flow'
        : ''
  return (
    <section className={styles.registrationJourney} data-mode={journey.mode} data-complete={isComplete ? 'true' : 'false'}>
      <header className={styles.journeyAction}>
        <div className={styles.journeyMain}>
          <span>CURRENT ACTION</span>
          <strong>{journey.headline}</strong>
          <p>{journey.description}</p>
          {actionTarget ? <a href={`#${actionTarget}`}>{completedCount === journey.stages.length ? uiText("查看本届关系", uiLocale) : uiText("前往当前操作", uiLocale)} ↓</a> : null}
        </div>
        <div className={styles.journeyContext}>
          <span>ACTIVE VIEW</span>
          <strong>{journey.perspectiveLabel}</strong>
          <small>{journey.teamLabel}</small>
          <em>{completedCount} / {journey.stages.length}{uiText(" 已完成 · ", uiLocale)}{currentStage?.label}</em>
        </div>
      </header>
      <ol aria-label={uiText("本届报名流程", uiLocale)}>
        {journey.stages.map((stage, index) => (
          <li key={stage.key} data-state={stage.state} aria-current={stage.state === 'current' ? 'step' : undefined}>
            <b>{String(index + 1).padStart(2, '0')}</b>
            <div><span>{stage.label}</span><small>{stage.value}</small></div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function createRosterForm(registration) {
  const roster = registration?.roster
  if (!roster) return null
  return {
    members: Object.fromEntries((roster.members || []).map(member => [member.id, {
      role: member.role || 'UNKNOWN',
      included: member.status === 'ACTIVE'
    }])),
    captainUserId: roster.officers?.find(officer => officer.role === 'CAPTAIN')?.userId || '',
    deputyCaptainUserId: roster.officers?.find(officer => officer.role === 'DEPUTY_CAPTAIN')?.userId || '',
    password: ''
  }
}

export default function EventRegistrationWorkspace({
  seasonId,
  existingTeams = [],
  identities = [],
  teamContexts = [],
  capabilitySnapshot = null,
  onContextChange = null,
  standalone = false,
  previewData = null
}) {
  const uiLocale = useUiLocale()
  const [context, setContext] = useState(previewData?.context || null)
  const [coachContext, setCoachContext] = useState(previewData?.coachContext || null)
  const [managerTransferContext, setManagerTransferContext] = useState(previewData?.managerTransferContext || null)
  const [recruitingTeams, setRecruitingTeams] = useState(previewData?.recruitingTeams || [])
  const [freeAgents, setFreeAgents] = useState(previewData?.freeAgents || [])
  const [isLoading, setIsLoading] = useState(!previewData)
  const [actionKey, setActionKey] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [privateContacts, setPrivateContacts] = useState({})
  const [claimForm, setClaimForm] = useState({
    requestType: 'CREATE',
    targetSeasonTeamId: '',
    name: '',
    shortName: '',
    slug: '',
    logoUrl: '',
    logoImage: '',
    proof: ''
  })
  const [registrationForms, setRegistrationForms] = useState({})
  const [coachInviteLookups, setCoachInviteLookups] = useState({})
  const [managerTransferForms, setManagerTransferForms] = useState({})
  const [managerTransferResponseForms, setManagerTransferResponseForms] = useState({})
  const [rosterForms, setRosterForms] = useState({})
  const [managerTabs, setManagerTabs] = useState({})
  const [applicationRole, setApplicationRole] = useState('FLEX')
  const [applicationMessage, setApplicationMessage] = useState('')
  const [freeAgentForm, setFreeAgentForm] = useState({
    preferredRole: 'FLEX',
    availability: '',
    bio: '',
    status: 'OPEN'
  })

  const hasManagerIdentity = hasVerifiedIdentity(identities, 'MANAGER')
  const hasPlayerIdentity = hasVerifiedIdentity(identities, 'PLAYER')
  const hasCoachIdentity = hasVerifiedIdentity(identities, 'COACH')
  const registrationCreateAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.registration.create')
  const playerApplyAccess = resolveCapabilityAccess(capabilitySnapshot, 'player.team.apply')
  const playerRespondAccess = resolveCapabilityAccess(capabilitySnapshot, 'player.roster.respond')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setPrivateContacts({})
    if (previewData) {
      const nextContext = previewData.context || {}
      setContext(nextContext)
      setRecruitingTeams(previewData.recruitingTeams || [])
      setCoachContext(previewData.coachContext || { managedTeams: [], coach: { memberships: [] }, officialCoachLimit: 2 })
      setManagerTransferContext(previewData.managerTransferContext || { incoming: [], outgoing: [] })
      setFreeAgents(previewData.freeAgents || [])
      setRosterForms(Object.fromEntries((nextContext.managerTeams || [])
        .map(item => [item.registration?.roster?.id, createRosterForm(item.registration)])
        .filter(([id, form]) => id && form)))
      setIsLoading(false)
      return
    }
    try {
      const [nextContext, nextRecruitingTeams, nextCoachContext, nextManagerTransferContext] = await Promise.all([
        fetchEventContext(seasonId),
        fetchRecruitingTeams(seasonId),
        fetchCoachContext(seasonId),
        fetchManagerTransferContext()
      ])
      setContext(nextContext)
      setRecruitingTeams(nextRecruitingTeams)
      setCoachContext(nextCoachContext)
      setManagerTransferContext(nextManagerTransferContext)
      setRosterForms(Object.fromEntries((nextContext.managerTeams || [])
        .map(item => [item.registration?.roster?.id, createRosterForm(item.registration)])
        .filter(([id, form]) => id && form)))

      const canReadFreeAgents = nextContext.managerTeams?.some(item => (
        item.registration && ['SUBMITTED', 'APPROVED'].includes(item.registration.status)
      ))
      setFreeAgents(canReadFreeAgents ? await fetchFreeAgents(seasonId) : [])

      const profile = nextContext.player?.freeAgentProfile
      if (profile) {
        setFreeAgentForm({
          preferredRole: profile.preferredRoles?.[0] || 'FLEX',
          availability: profile.availability || '',
          bio: profile.bio || '',
          status: profile.status === 'CLOSED' ? 'CLOSED' : 'OPEN'
        })
      }
    } catch (loadError) {
      setError(loadError)
    } finally {
      setIsLoading(false)
    }
  }, [previewData, seasonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runAction = async (key, task, successMessage) => {
    setActionKey(key)
    setError(null)
    setNotice('')
    if (previewData) {
      setNotice(`设计预览：${successMessage || '交互已触发，但不会写入真实数据。'}`)
      setActionKey('')
      return
    }
    try {
      await task()
      setNotice(successMessage)
      await refresh()
      await onContextChange?.()
    } catch (actionError) {
      setError(actionError)
    } finally {
      setActionKey('')
    }
  }

  const revealPrivateContact = async (registrationId, subjectUserId, purpose) => {
    const key = `${registrationId}:${subjectUserId}`
    setActionKey(`contact:${key}`)
    setError(null)
    setNotice('')
    if (previewData) {
      const contact = previewData.privateContacts?.[subjectUserId] || { qqContact: '123456789', discordContact: 'PreviewPlayer' }
      setPrivateContacts(current => ({ ...current, [key]: contact }))
      setNotice(`设计预览：已展示用于 ${purpose === 'APPLICATION_REVIEW' ? '申请审核' : '队伍运营'} 的模拟联系方式。`)
      setActionKey('')
      return
    }
    try {
      const result = await accessTeamPrivateContact(registrationId, subjectUserId, purpose)
      setPrivateContacts(current => ({ ...current, [key]: result?.contact || null }))
      setNotice('联系方式已按本次用途授权查看，并已写入访问记录。')
    } catch (actionError) {
      setError(actionError)
    } finally {
      setActionKey('')
    }
  }

  const privateContactLine = (registrationId, subjectUserId) => {
    const contact = privateContacts[`${registrationId}:${subjectUserId}`]
    if (!contact) return ''
    return [
      contact.qqContact ? `QQ ${contact.qqContact}` : '',
      contact.discordContact ? `Discord ${contact.discordContact}` : ''
    ].filter(Boolean).join(' · ')
  }

  const pendingClaim = context?.claims?.find(claim => claim.status === 'PENDING') || null
  const managerTeams = context?.managerTeams || []
  const managedCoachTeams = coachContext?.managedTeams || []
  const coachMemberships = coachContext?.coach?.memberships || []
  const officialCoachLimit = coachContext?.officialCoachLimit || 2
  const incomingManagerTransfers = managerTransferContext?.incoming || []
  const outgoingManagerTransfers = managerTransferContext?.outgoing || []
  const player = context?.player || null
  const playerFlow = useMemo(() => buildPlayerRegistrationFlow(player, teamContexts), [player, teamContexts])
  const registrationJourney = buildEventRegistrationJourney({
    managerTeams,
    playerFlow,
    coachMemberships,
    hasManagerIdentity,
    hasPlayerIdentity,
    hasCoachIdentity
  })
  const managerJourneyComplete = registrationJourney.mode === 'manager' && registrationJourney.stages.every(stage => stage.state === 'done')
  const pendingApplication = playerFlow.pendingApplication
  const claimableTeams = useMemo(
    () => existingTeams.filter(team => teamId(team)),
    [existingTeams]
  )

  const setRegistrationField = (organizationId, field, value) => {
    setRegistrationForms(current => ({
      ...current,
      [organizationId]: {
        mode: 'OPEN',
        role: 'FLEX',
        count: 2,
        note: '',
        ...(current[organizationId] || {}),
        [field]: value
      }
    }))
  }

  const setManagerTransferField = (organizationId, field, value) => {
    setManagerTransferForms(current => ({
      ...current,
      [organizationId]: {
        lookup: '',
        password: '',
        reason: '',
        ...(current[organizationId] || {}),
        [field]: value
      }
    }))
  }

  const setManagerTransferResponseField = (transferId, field, value) => {
    setManagerTransferResponseForms(current => ({
      ...current,
      [transferId]: {
        password: '',
        note: '',
        ...(current[transferId] || {}),
        [field]: value
      }
    }))
  }

  const registrationForm = organizationId => ({
    mode: 'OPEN',
    role: 'FLEX',
    count: 2,
    note: '',
    ...(registrationForms[organizationId] || {})
  })

  const setRosterField = (rosterId, field, value) => {
    setRosterForms(current => ({
      ...current,
      [rosterId]: { ...(current[rosterId] || {}), [field]: value }
    }))
  }

  const setRosterMemberField = (rosterId, memberId, field, value) => {
    setRosterForms(current => ({
      ...current,
      [rosterId]: {
        ...(current[rosterId] || {}),
        members: {
          ...(current[rosterId]?.members || {}),
          [memberId]: { ...(current[rosterId]?.members?.[memberId] || {}), [field]: value }
        }
      }
    }))
  }

  if (isLoading && !context) {
    return <section className={`${styles.workspace} ${standalone ? styles.standalone : ''}`}><EmptyBlock title={uiText("正在连接赛事报名", uiLocale)}>{uiText("加载长期队伍、申请和邀请状态…", uiLocale)}</EmptyBlock></section>
  }

  return (
    <section className={`${styles.workspace} ${standalone ? styles.standalone : ''}`} data-workspace-mode={registrationJourney.mode}>
      <header className={styles.workspaceHeader}>
        <div><span>TEAM &amp; ROSTER</span><h2>{uiText("队伍与名单", uiLocale)}</h2><p>{registrationJourney.mode === 'manager' ? uiText("优先查看下一场和今日待办；选手申请、本届名单与长期关系分开管理。", uiLocale) : uiText("从长期队伍到本届报名、选手加入和注册名单，在同一条流程中完成。", uiLocale)}</p></div>
        <button type="button" onClick={refresh} disabled={isLoading}>{previewData ? uiText("重置预览", uiLocale) : uiText("刷新状态", uiLocale)}</button>
      </header>

      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{errorText(error)}</div> : null}
      {context && !context.emailVerified ? <div className={styles.warning}>{uiText("完成邮箱验证后才能提交队伍或选手报名操作。", uiLocale)}</div> : null}
      {registrationJourney.mode === 'manager' ? null : <RegistrationJourney journey={registrationJourney} />}

      {hasManagerIdentity || managerTeams.length || pendingClaim ? (
        <div className={styles.roleSection} id="manager-registration-flow" data-complete={managerJourneyComplete ? 'true' : 'false'}>
          <div className={styles.sectionTitle}><div><span>MANAGER FLOW</span><h3>{uiText("经理报名流程", uiLocale)}</h3><p>{uiText("优先处理本届队伍报名、选手审核和注册名单；长期管理设置收纳在队伍卡片末尾。", uiLocale)}</p></div></div>

          {pendingClaim ? (
            <article className={styles.stateCard}>
              <div><span>{uiText("队伍", uiLocale)}{pendingClaim.requestType === 'CLAIM' ? uiText("认领", uiLocale) : uiText("创建", uiLocale)}{uiText("申请", uiLocale)}</span><strong>{pendingClaim.proposedShortName} / {pendingClaim.proposedName}</strong><p>{uiText("system 审核通过后会建立长期队伍和经理关系。", uiLocale)}</p></div>
              <StatusChip status={pendingClaim.status} />
            </article>
          ) : managerTeams.length === 0 ? (
            <form className={styles.formCard} onSubmit={event => {
              event.preventDefault()
              runAction('claim', () => createTeamClaim({
                ...claimForm,
                targetSeasonTeamId: claimForm.requestType === 'CLAIM' ? claimForm.targetSeasonTeamId : undefined,
                name: claimForm.requestType === 'CREATE' ? claimForm.name : undefined,
                shortName: claimForm.requestType === 'CREATE' ? claimForm.shortName : undefined,
                slug: claimForm.slug.trim() || undefined,
                logoUrl: claimForm.logoUrl.trim() || undefined,
                logoImage: claimForm.logoImage || undefined,
                proof: claimForm.proof.trim()
              }), '队伍申请已提交，等待 system 审核。')
            }}>
              <div className={styles.formHeading}><strong>{uiText("创建或认领长期队伍", uiLocale)}</strong><span>{uiText("首次通过后会建立长期经理关系。", uiLocale)}</span></div>
              <label><span>{uiText("申请类型", uiLocale)}</span><select value={claimForm.requestType} onChange={event => setClaimForm(current => ({ ...current, requestType: event.target.value }))}><option value="CREATE">{uiText("创建新队伍", uiLocale)}</option><option value="CLAIM">{uiText("认领历史队伍", uiLocale)}</option></select></label>
              {claimForm.requestType === 'CLAIM' ? (
                <label><span>{uiText("历史队伍", uiLocale)}</span><select required value={claimForm.targetSeasonTeamId} onChange={event => setClaimForm(current => ({ ...current, targetSeasonTeamId: event.target.value }))}><option value="">{uiText("请选择", uiLocale)}</option>{claimableTeams.map(team => <option key={teamId(team)} value={teamId(team)}>{teamName(team)}</option>)}</select></label>
              ) : (
                <><label><span>{uiText("队伍全称", uiLocale)}</span><input required value={claimForm.name} onChange={event => setClaimForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>{uiText("队伍简称", uiLocale)}</span><input required value={claimForm.shortName} onChange={event => setClaimForm(current => ({ ...current, shortName: event.target.value }))} /></label></>
              )}
              <label><span>{uiText("队伍标识", uiLocale)}</span><input placeholder={uiText("例如 team-banana", uiLocale)} value={claimForm.slug} onChange={event => setClaimForm(current => ({ ...current, slug: event.target.value }))} /></label>
              <label><span>{uiText("队伍 Logo URL（可选）", uiLocale)}</span><input type="url" placeholder="https://..." value={claimForm.logoUrl} onChange={event => setClaimForm(current => ({ ...current, logoUrl: event.target.value }))} /><small>{uiText("可填写公开可访问的 http/https 图片地址，也可以直接选择本地图片。", uiLocale)}</small></label>
              <label><span>{uiText("上传队伍 Logo（可选）", uiLocale)}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { const logoImage = await readImageAsBase64(file); setClaimForm(current => ({ ...current, logoImage, logoUrl: '' })) } catch (uploadError) { setError(uploadError) } }} /><small>{uiText("支持 PNG、JPG、静态 WebP，原图不超过 2 MB。", uiLocale)}</small></label>
              <label className={styles.wideField}><span>{uiText("证明或说明", uiLocale)}</span><textarea value={claimForm.proof} onChange={event => setClaimForm(current => ({ ...current, proof: event.target.value }))} /></label>
              <button type="submit" disabled={actionKey === 'claim' || !context?.emailVerified}>{actionKey === 'claim' ? uiText("提交中…", uiLocale) : uiText("提交队伍申请", uiLocale)}</button>
            </form>
          ) : null}

          {managerTeams.map(item => {
            const team = item.team
            const registration = item.registration
            const peopleView = buildManagerPeopleWorkspace(registration)
            const applicationQueue = peopleView.applicationQueue
            const coachTeamContext = managedCoachTeams.find(entry => entry.team?.id === team.id) || null
            const longTermCoaches = coachTeamContext?.coaches || []
            const eventCoaches = coachTeamContext?.registration?.coaches || []
            const occupiedCoachSlots = eventCoaches.filter(coach => ['INVITED', 'ACTIVE'].includes(coach.status)).length
            const coachLookup = coachInviteLookups[team.id] || ''
            const pendingManagerTransfer = outgoingManagerTransfers.find(transfer => transfer.team?.id === team.id && transfer.status === 'PENDING') || null
            const managerTransferForm = {
              lookup: '',
              password: '',
              reason: '',
              ...(managerTransferForms[team.id] || {})
            }
            const form = registrationForm(team.id)
            const roster = registration?.roster
            const operationsView = buildManagerTeamOperationsView(item)
            const operationsAnchor = `manager-team-${team.id}`
            const activeManagerTab = managerTabs[team.id] || 'overview'
            const setActiveManagerTab = tab => setManagerTabs(current => ({ ...current, [team.id]: tab }))
            const teamContext = findManagerTeamContext(teamContexts, team, registration)
            const nextMatch = teamContext?.nextMatch || null
            const opponent = managerMatchOpponent(nextMatch, team)
            const managerActionTab = operationsView.focusKey === 'people' ? 'applications' : 'roster'
            const registrationNeedsAction = !registration || ['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(registration?.status)
            const rosterNeedsAction = registration?.status === 'APPROVED' && ['DRAFT', 'REJECTED'].includes(roster?.status)
            const hasRequiredAction = registrationNeedsAction || rosterNeedsAction || applicationQueue.pending.length > 0
            const isSeasonReady = registration?.status === 'LOCKED' && roster?.status === 'LOCKED'
            const managerPrimaryMode = hasRequiredAction ? 'task' : nextMatch ? 'match' : 'waiting'
            const registrationManageAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.registration.submit', {
              registrationId: registration?.id
            })
            const applicationReviewAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.application.review', {
              registrationId: registration?.id
            })
            const rosterSubmitAccess = resolveCapabilityAccess(capabilitySnapshot, 'roster.final.submit', {
              registrationId: registration?.id
            })
            const managerTransferAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.manager.transfer', {
              organizationId: team.id
            })
            const longTermCoachManageAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.coach.relationship.manage', {
              organizationId: team.id
            })
            const eventCoachManageAccess = resolveCapabilityAccess(capabilitySnapshot, 'team.coach.manage', {
              registrationId: registration?.id
            })
            const rosterForm = roster ? (rosterForms[roster.id] || createRosterForm(registration)) : null
            const includedMembers = roster?.members?.filter(member => rosterForm?.members?.[member.id]?.included) || []
            const activeCandidateMembers = peopleView.activeMembers
            const excludedMembers = roster?.members?.filter(member => !rosterForm?.members?.[member.id]?.included) || []
            const pendingReleaseMembers = excludedMembers.filter(member => member.status !== 'REMOVED')
            const rolesComplete = includedMembers.every(member => rosterForm?.members?.[member.id]?.role && rosterForm.members[member.id].role !== 'UNKNOWN')
            const officerPlayers = includedMembers.map(member => member.player).filter(player => player?.userId)
            const playerLabelByUserId = userId => {
              const player = officerPlayers.find(candidate => candidate.userId === userId)
              return player?.displayName || player?.battleTag || '未设置'
            }
            const captainLabel = rosterForm?.captainUserId === registration?.manager?.id
              ? '经理（默认）'
              : playerLabelByUserId(rosterForm?.captainUserId)
            const deputyCaptainLabel = rosterForm?.deputyCaptainUserId
              ? playerLabelByUserId(rosterForm.deputyCaptainUserId)
              : '未设置'
            const rosterPayload = roster ? {
              members: roster.members.map(member => ({
                id: member.id,
                role: rosterForm?.members?.[member.id]?.role || 'UNKNOWN',
                included: Boolean(rosterForm?.members?.[member.id]?.included)
              })),
              captainUserId: rosterForm?.captainUserId || registration?.manager?.id || '',
              deputyCaptainUserId: rosterForm?.deputyCaptainUserId || null
            } : null
            return (
              <article className={styles.managerCard} key={team.id} data-registration-status={registration?.status || 'NONE'} data-roster-status={roster?.status || 'NONE'}>
                <div className={styles.teamHeading}>
                  <div className={styles.teamHeadingIdentity}>
                    <TeamLogo team={team} seasonId={seasonId} className={styles.managerTeamLogo} large />
                    <div><span>MANAGER TEAM</span><strong>{team.shortName}</strong><p>{team.name} · {seasonId}</p></div>
                  </div>
                  <em className={styles.managerSeasonState} data-state={isSeasonReady ? 'ready' : hasRequiredAction ? 'action' : 'progress'}>
                    {isSeasonReady ? uiText("本届已就绪", uiLocale) : hasRequiredAction ? uiText("有事项待处理", uiLocale) : registration ? uiText("流程进行中", uiLocale) : uiText("尚未报名", uiLocale)}
                  </em>
                </div>
                {!registrationCreateAccess.allowed && !registration ? <div className={styles.capabilityBlock}>{capabilityBlockText(registrationCreateAccess)}</div> : null}
                {registration && !registrationManageAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(registrationManageAccess)}</div> : null}

                <nav className={styles.managerTabs} aria-label={uiText("{0} 经理功能", uiLocale, [team.shortName || team.name])}>
                  <button type="button" aria-current={activeManagerTab === 'overview' ? 'page' : undefined} data-active={activeManagerTab === 'overview'} onClick={() => setActiveManagerTab('overview')}><span>{uiText("概览", uiLocale)}</span><small>{uiText("今日工作台", uiLocale)}</small></button>
                  <button type="button" aria-current={activeManagerTab === 'applications' ? 'page' : undefined} data-active={activeManagerTab === 'applications'} disabled={!registration} onClick={() => setActiveManagerTab('applications')}><span>{uiText("选手申请", uiLocale)}</span><small>{applicationQueue.pending.length ? uiText("{0} 条待审核", uiLocale, [applicationQueue.pending.length]) : roster?.status === 'LOCKED' ? uiText("本届已关闭", uiLocale) : uiText("申请与邀请", uiLocale)}</small></button>
                  <button type="button" aria-current={activeManagerTab === 'roster' ? 'page' : undefined} data-active={activeManagerTab === 'roster'} onClick={() => setActiveManagerTab('roster')}><span>{uiText("本届名单", uiLocale)}</span><small>{roster ? uiText("{0} 人 · {1}", uiLocale, [includedMembers.length, statusLabel(roster.status)]) : uiText("报名与名单", uiLocale)}</small></button>
                  <button type="button" aria-current={activeManagerTab === 'long-term' ? 'page' : undefined} data-active={activeManagerTab === 'long-term'} onClick={() => setActiveManagerTab('long-term')}><span>{uiText("长期队伍", uiLocale)}</span><small>{uiText("经理与教练", uiLocale)}</small></button>
                </nav>

                <section className={styles.managerPanel} data-panel="overview" hidden={activeManagerTab !== 'overview'}>
                  <section className={styles.managerOverviewFocus} data-mode={managerPrimaryMode} data-tone={operationsView.tone}>
                    {managerPrimaryMode === 'match' ? (
                      <>
                        <div className={styles.managerOverviewPrimary}>
                          <span>NEXT MATCH</span>
                          <strong>{team.shortName || team.name} <b>VS</b> {opponent?.shortName || opponent?.name || 'TBD'}</strong>
                          <p>{nextMatch.displayName || [nextMatch.stage, nextMatch.roundLabel].filter(Boolean).join(' · ') || uiText("下一场赛事安排", uiLocale)}</p>
                          <div className={styles.managerOverviewActions}>
                            <a href={managerSeasonPath(`/matches/${encodeURIComponent(nextMatch.id)}`, seasonId)}>{uiText("比赛资料 →", uiLocale)}</a>
                            <a href={managerSeasonPath('/me?section=matches', seasonId)}>{uiText("赛程与协商 →", uiLocale)}</a>
                          </div>
                        </div>
                        <aside className={styles.managerMatchTime}>
                          <span>{uiText("已排定", uiLocale)}</span>
                          <strong>{formatManagerMatchTime(nextMatch.scheduledAt)}</strong>
                          <p>{[nextMatch.stage, nextMatch.roundLabel].filter(Boolean).join(' · ') || uiText("阶段待定", uiLocale)}</p>
                          <small>{uiText("比赛房间将在开赛前 15 分钟开放", uiLocale)}</small>
                        </aside>
                      </>
                    ) : managerPrimaryMode === 'task' ? (
                      <>
                        <div className={styles.managerOverviewPrimary}>
                          <span>{operationsView.tone === 'attention' || applicationQueue.pending.length ? 'REQUIRES ACTION' : 'CURRENT WORK'}</span>
                          <strong>{operationsView.headline}</strong>
                          <p>{operationsView.description}</p>
                          <button type="button" onClick={() => setActiveManagerTab(managerActionTab)}>{operationsView.actionLabel} →</button>
                        </div>
                        <aside className={styles.managerTaskSide}>
                          <span>{uiText("今日待办", uiLocale)}</span>
                          <strong>{applicationQueue.pending.length + (registrationNeedsAction || rosterNeedsAction ? 1 : 0)}</strong>
                          <p>{applicationQueue.pending.length ? uiText("{0} 条选手申请等待决定", uiLocale, [applicationQueue.pending.length]) : uiText("完成当前阶段后，后续流程会自动开放。", uiLocale)}</p>
                        </aside>
                      </>
                    ) : (
                      <>
                        <div className={styles.managerOverviewPrimary}>
                          <span>WAITING FOR SCHEDULE</span>
                          <strong>{isSeasonReady ? uiText("等待下一轮对阵", uiLocale) : operationsView.headline}</strong>
                          <p>{isSeasonReady ? uiText("赛事方发布新一轮赛程后，对手、时间和协商入口会自动出现在这里。", uiLocale) : operationsView.description}</p>
                          <a href={managerSeasonPath('/me?section=matches', seasonId)}>{uiText("查看我的赛程 →", uiLocale)}</a>
                        </div>
                        <aside className={styles.managerTaskSide}>
                          <span>{uiText("当前状态", uiLocale)}</span>
                          <strong>{isSeasonReady ? 'READY' : 'SYNCING'}</strong>
                          <p>{isSeasonReady ? uiText("正式名单与赛事关系已同步", uiLocale) : uiText("等待赛事流程继续推进", uiLocale)}</p>
                        </aside>
                      </>
                    )}
                  </section>

                  <div className={styles.managerOverviewFacts}>
                    <button type="button" onClick={() => setActiveManagerTab('roster')}><span>{uiText("本届报名", uiLocale)}</span><strong>{registration ? statusLabel(registration.status) : uiText("尚未提交", uiLocale)}</strong><small>{uiText("查看流程 →", uiLocale)}</small></button>
                    <button type="button" onClick={() => setActiveManagerTab('applications')} disabled={!registration}><span>{uiText("待审核申请", uiLocale)}</span><strong>{applicationQueue.pending.length}</strong><small>{uiText("进入申请台 →", uiLocale)}</small></button>
                    <button type="button" onClick={() => setActiveManagerTab('roster')}><span>{uiText("正式名单", uiLocale)}</span><strong>{roster ? `${includedMembers.length} / 7` : uiText("未建立", uiLocale)}</strong><small>{roster ? `V${roster.version}` : uiText("报名后开放", uiLocale)} →</small></button>
                    <button type="button" onClick={() => setActiveManagerTab('long-term')}><span>{uiText("队伍关系", uiLocale)}</span><strong>{uiText("经理", uiLocale)}</strong><small>{longTermCoaches.length}{uiText(" 名长期教练 →", uiLocale)}</small></button>
                  </div>
                </section>

                <section className={styles.managerPanel} data-panel="long-term" hidden={activeManagerTab !== 'long-term'} id={`${operationsAnchor}-settings`}>
                  <header className={styles.managerPanelHeader}><div><span>LONG-TERM TEAM</span><strong>{uiText("长期队伍管理", uiLocale)}</strong><p>{uiText("这里的关系长期有效；本届阵容和赛事职责仍按每届单独确认。", uiLocale)}</p></div><small>{uiText("经理交接 · 教练关系", uiLocale)}</small></header>
                <section className={styles.managerControlPanel}>
                  <div className={styles.managerControlHeader}><div><span>TEAM CONTROL</span><h4>{uiText("经理管理权", uiLocale)}</h4><p>{uiText("交接需要双方确认。完成后，新经理立即接管长期队伍、本届报名和默认队长职责。", uiLocale)}</p></div>{pendingManagerTransfer ? <StatusChip status={pendingManagerTransfer.status} /> : <em>{uiText("当前由你管理", uiLocale)}</em>}</div>
                  {!managerTransferAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(managerTransferAccess)}</div> : null}
                  {pendingManagerTransfer ? (
                    <div className={styles.managerTransferPending}>
                      <div><span>{uiText("等待接任人确认", uiLocale)}</span><strong>{pendingManagerTransfer.toUser?.displayName || pendingManagerTransfer.toUser?.username}</strong><p>@{pendingManagerTransfer.toUser?.username || uiText("未设置用户名", uiLocale)} · {pendingManagerTransfer.reason || uiText("未填写交接说明", uiLocale)} · {formatDateTime(pendingManagerTransfer.expiresAt)}{uiText(" 到期", uiLocale)}</p></div>
                      <div className={styles.managerTransferCancel}><input disabled={!managerTransferAccess.allowed} type="password" autoComplete="current-password" placeholder={uiText("输入当前密码后取消", uiLocale)} value={managerTransferForm.password} onChange={event => setManagerTransferField(team.id, 'password', event.target.value)} /><button type="button" title={capabilityBlockText(managerTransferAccess)} disabled={!managerTransferAccess.allowed || !managerTransferForm.password || Boolean(actionKey)} onClick={() => runAction(`manager-transfer-cancel:${pendingManagerTransfer.id}`, async () => { await cancelManagerTransfer(pendingManagerTransfer.id, { password: managerTransferForm.password, reason: '当前经理主动取消交接' }); setManagerTransferForms(current => ({ ...current, [team.id]: { lookup: '', password: '', reason: '' } })) }, '经理交接已取消。')}>{uiText("取消交接", uiLocale)}</button></div>
                    </div>
                  ) : (
                    <form className={styles.managerTransferForm} autoComplete="off" onSubmit={event => {
                      event.preventDefault()
                      runAction(`manager-transfer:${team.id}`, async () => {
                        await initiateManagerTransfer(team.id, managerTransferForm)
                        setManagerTransferForms(current => ({ ...current, [team.id]: { lookup: '', password: '', reason: '' } }))
                      }, '经理交接已发出，等待接任人确认。')
                    }}>
                      <label><span>{uiText("接任人精确用户名或 BattleTag", uiLocale)}</span><input required disabled={!managerTransferAccess.allowed} name={`manager-transfer-target-${team.id}`} autoComplete="off" value={managerTransferForm.lookup} onChange={event => setManagerTransferField(team.id, 'lookup', event.target.value)} /></label>
                      <label><span>{uiText("交接说明", uiLocale)}</span><input disabled={!managerTransferAccess.allowed} name={`manager-transfer-reason-${team.id}`} autoComplete="off" value={managerTransferForm.reason} onChange={event => setManagerTransferField(team.id, 'reason', event.target.value)} /></label>
                      <label><span>{uiText("当前密码", uiLocale)}</span><input required disabled={!managerTransferAccess.allowed} type="password" name={`manager-transfer-password-${team.id}`} autoComplete="new-password" value={managerTransferForm.password} onChange={event => setManagerTransferField(team.id, 'password', event.target.value)} /></label>
                      <button type="submit" title={capabilityBlockText(managerTransferAccess)} disabled={!managerTransferAccess.allowed || !managerTransferForm.lookup.trim() || !managerTransferForm.password || Boolean(actionKey)}>{uiText("发起经理交接", uiLocale)}</button>
                    </form>
                  )}
                </section>

                <section className={styles.coachManagerPanel}>
                  <div className={styles.coachPanelHeader}>
                    <div><span>COACH RELATIONSHIPS</span><h4>{uiText("教练关系", uiLocale)}</h4><p>{uiText("长期教练可保留多人；本届正式教练需本人再次确认，最多 ", uiLocale)}{officialCoachLimit}{uiText(" 人。", uiLocale)}</p></div>
                    {registration ? <strong>{occupiedCoachSlots} / {officialCoachLimit}<small>{uiText("本届名额", uiLocale)}</small></strong> : null}
                  </div>
                  {!longTermCoachManageAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(longTermCoachManageAccess)}</div> : null}
                  <form className={styles.coachInviteForm} onSubmit={event => {
                    event.preventDefault()
                    runAction(
                      `coach-invite:${team.id}`,
                      async () => {
                        await inviteLongTermCoach(team.id, coachLookup)
                        setCoachInviteLookups(current => ({ ...current, [team.id]: '' }))
                      },
                      '长期教练邀请已发送，等待本人确认。'
                    )
                  }}>
                    <label><span>{uiText("精确用户名或 BattleTag", uiLocale)}</span><input required disabled={!longTermCoachManageAccess.allowed} placeholder={uiText("例如 sky 或 Player#1234", uiLocale)} value={coachLookup} onChange={event => setCoachInviteLookups(current => ({ ...current, [team.id]: event.target.value }))} /></label>
                    <button type="submit" title={capabilityBlockText(longTermCoachManageAccess)} disabled={!longTermCoachManageAccess.allowed || !coachLookup.trim() || actionKey === `coach-invite:${team.id}` || !context?.emailVerified}>{uiText("邀请长期教练", uiLocale)}</button>
                  </form>
                  {longTermCoaches.length ? (
                    <div className={styles.coachRelationshipList}>
                      {longTermCoaches.map(coach => {
                        const eventCoach = eventCoaches.find(entry => entry.user?.id === coach.user?.id) || null
                        const canInviteToEvent = registration && ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(registration.status) && coach.status === 'ACTIVE' && (!eventCoach || ['DECLINED', 'LEFT'].includes(eventCoach.status))
                        return (
                          <div className={styles.coachRelationshipRow} key={coach.id}>
                            <div><strong>{coach.user?.displayName || coach.user?.username || uiText("未命名账号", uiLocale)}</strong><span>@{coach.user?.username || uiText("未设置用户名", uiLocale)}{coach.user?.battleTag ? ` · ${coach.user.battleTag}` : ''}</span></div>
                            <div className={styles.coachStatuses}><StatusChip status={coach.status} />{eventCoach ? <><small>{uiText("本届", uiLocale)}</small><StatusChip status={eventCoach.status} /></> : <small>{uiText("本届未邀请", uiLocale)}</small>}</div>
                            <div className={styles.coachRowActions}>
                              {canInviteToEvent ? <button type="button" title={capabilityBlockText(eventCoachManageAccess)} disabled={!eventCoachManageAccess.allowed || occupiedCoachSlots >= officialCoachLimit || Boolean(actionKey)} onClick={() => runAction(`event-coach-invite:${registration.id}:${coach.id}`, () => inviteEventCoach(registration.id, coach.id), '本届正式教练邀请已发送。')}>{uiText("邀请本届", uiLocale)}</button> : null}
                              {eventCoach && ['INVITED', 'ACTIVE'].includes(eventCoach.status) ? <button type="button" title={capabilityBlockText(eventCoachManageAccess)} disabled={!eventCoachManageAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`event-coach-remove:${eventCoach.id}`, () => removeEventCoach(eventCoach.id), '本届教练关系已结束，长期关系保留。')}>{uiText("移出本届", uiLocale)}</button> : null}
                              <button type="button" className={styles.secondaryCoachAction} title={capabilityBlockText(longTermCoachManageAccess)} disabled={!longTermCoachManageAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`coach-remove:${coach.id}`, () => removeLongTermCoach(coach.id), '长期教练关系已结束。')}>{coach.status === 'INVITED' ? uiText("撤回长期邀请", uiLocale) : uiText("结束长期关系", uiLocale)}</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : <EmptyBlock title={uiText("暂无长期教练", uiLocale)}>{uiText("用精确用户名或 BattleTag 邀请；对方接受后才会建立教练身份。", uiLocale)}</EmptyBlock>}
                </section>
                </section>

                <section className={styles.managerPanel} data-panel="roster" hidden={activeManagerTab !== 'roster'} id={`${operationsAnchor}-registration`}>
                {!managerJourneyComplete ? <RegistrationJourney journey={registrationJourney} /> : null}
                {roster?.status !== 'LOCKED' ? <div className={styles.eventFlowHeading}>
                  <div><span>SEASON WORKFLOW</span><strong>{registration ? uiText("本届报名与注册名单", uiLocale) : uiText("开始本届赛事报名", uiLocale)}</strong><p>{registration ? uiText("审核选手、整理候选名单并提交 5–7 人注册名单。", uiLocale) : uiText("本届注册名单独立于长期队伍，每届赛事都需要重新提交。", uiLocale)}</p></div>
                  {registration ? <StatusChip status={registration.status} /> : <em>STEP 01</em>}
                </div> : null}
                {!registration ? (
                  <form className={styles.inlineForm} onSubmit={event => {
                    event.preventDefault()
                    runAction(`register:${team.id}`, () => submitTeamRegistration(seasonId, {
                      teamOrganizationId: team.id,
                      recruitmentMode: form.mode,
                      recruitmentNeeds: { roles: [form.role], count: Number(form.count), note: form.note }
                    }), `${team.shortName} 已提交本届赛事报名。`)
                  }}>
                    <label><span>{uiText("招募方式", uiLocale)}</span><select value={form.mode} onChange={event => setRegistrationField(team.id, 'mode', event.target.value)}><option value="OPEN">{uiText("公开招募", uiLocale)}</option><option value="INVITE_ONLY">{uiText("仅邀请", uiLocale)}</option><option value="CLOSED">{uiText("暂不招募", uiLocale)}</option></select></label>
                    <label><span>{uiText("主要需求", uiLocale)}</span><RoleSelect value={form.role} onChange={value => setRegistrationField(team.id, 'role', value)} /></label>
                    <label><span>{uiText("需求人数", uiLocale)}</span><input type="number" min="0" max="7" value={form.count} onChange={event => setRegistrationField(team.id, 'count', event.target.value)} /></label>
                    <label className={styles.wideField}><span>{uiText("招募说明", uiLocale)}</span><input value={form.note} onChange={event => setRegistrationField(team.id, 'note', event.target.value)} /></label>
                    <button type="submit" title={capabilityBlockText(registrationCreateAccess)} disabled={actionKey === `register:${team.id}` || !context?.emailVerified || !registrationCreateAccess.allowed}>{uiText("提交赛事报名", uiLocale)}</button>
                  </form>
                ) : (
                  <>
                    {roster?.status !== 'LOCKED' ? <div className={styles.registrationMeta}><span>{uiText("招募：", uiLocale)}{registration.recruitmentMode}</span><span>{uiText("当前候选：", uiLocale)}{activeCandidateMembers.length}{uiText(" 人", uiLocale)}</span><span>{uiText("申请：", uiLocale)}{applicationQueue.pending.length}{uiText(" 条待审核", uiLocale)}</span></div> : null}
                    {['SUBMITTED', 'APPROVED'].includes(registration.status) ? (
                      <div className={styles.recruitmentActions}>
                        {['OPEN', 'INVITE_ONLY', 'CLOSED'].map(mode => <button key={mode} type="button" data-active={registration.recruitmentMode === mode} title={capabilityBlockText(registrationManageAccess)} disabled={!registrationManageAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`mode:${registration.id}:${mode}`, () => updateRecruitment(registration.id, { recruitmentMode: mode, recruitmentNeeds: registration.recruitmentNeeds }), '招募状态已更新。')}>{mode === 'OPEN' ? uiText("公开招募", uiLocale) : mode === 'INVITE_ONLY' ? uiText("仅邀请", uiLocale) : uiText("停止招募", uiLocale)}</button>)}
                      </div>
                    ) : null}

                    {roster ? (
                      <section className={styles.rosterEditor} id={`${operationsAnchor}-roster`} data-status={roster.status}>
                        <div className={styles.rosterEditorHeader}>
                          <div>
                            <span>OFFICIAL ROSTER / V{roster.version}</span>
                            <h4>{uiText("本届注册名单", uiLocale)}</h4>
                            <p>{uiText("登记 5–7 名可参赛选手和主要职责；每张地图的实际五人由比赛房间锁定。队长可由经理或名单选手担任，副队长必须来自名单。", uiLocale)}</p>
                          </div>
                          <div className={styles.rosterCounts}>
                            <strong>{includedMembers.length}<small>{uiText("注册选手", uiLocale)}</small></strong>
                            <strong>{rolesComplete ? uiText("完整", uiLocale) : uiText("待补", uiLocale)}<small>{uiText("职责", uiLocale)}</small></strong>
                            {roster.status !== 'LOCKED' ? <StatusChip status={roster.status} /> : null}
                          </div>
                        </div>

                        {roster.reviewNote ? <div className={styles.rosterReviewNote}><strong>{uiText("system 审核意见", uiLocale)}</strong><span>{roster.reviewNote}</span></div> : null}

                        {excludedMembers.length ? (
                          <div className={styles.rosterExclusionNotice} data-pending={pendingReleaseMembers.length > 0}>
                            <strong>{pendingReleaseMembers.length ? uiText("{0} 名选手将在保存后解除候选关系", uiLocale, [pendingReleaseMembers.length]) : uiText("{0} 名选手当前未列入名单", uiLocale, [excludedMembers.length])}</strong>
                            <span>{excludedMembers.map(member => member.player?.displayName || member.player?.battleTag || '未命名选手').join('、')}{uiText("。解除后选手可以重新寻找队伍；正式提交前仍可重新勾选。", uiLocale)}</span>
                          </div>
                        ) : null}

                        {roster.status === 'LOCKED' ? (
                          <div className={styles.lockedRosterRegister}>
                            <div className={styles.lockedRosterRegisterHead}><span>{uiText("序号", uiLocale)}</span><span>{uiText("注册选手", uiLocale)}</span><span>{uiText("主要职责", uiLocale)}</span><span>{uiText("名单状态", uiLocale)}</span></div>
                            {includedMembers.map((member, index) => {
                              const memberForm = rosterForm?.members?.[member.id] || { role: member.role || 'UNKNOWN', included: true }
                              const displayName = member.player?.displayName || member.player?.battleTag || '未命名选手'
                              const role = roleLabel(memberForm.role)
                              return (
                                <article className={styles.lockedRosterRegisterRow} key={member.id} data-role={memberForm.role}>
                                  <span className={styles.lockedRosterIndex}>{String(index + 1).padStart(2, '0')}</span>
                                  <div className={styles.lockedRosterIdentity}>
                                    <span aria-hidden="true">{displayName.slice(0, 2).toUpperCase()}</span>
                                    <div><strong>{displayName}</strong><small>{member.player?.battleTag || uiText("已认证选手", uiLocale)}</small></div>
                                  </div>
                                  <b className={styles.lockedRosterRole}>{role}</b>
                                  <span className={styles.lockedRosterState}>{uiText("正式名单", uiLocale)}</span>
                                </article>
                              )
                            })}
                          </div>
                        ) : (
                          <div className={styles.rosterTable}>
                            <div className={styles.rosterTableHead}><span>{uiText("入选", uiLocale)}</span><span>{uiText("选手", uiLocale)}</span><span>{uiText("主要职责", uiLocale)}</span></div>
                            {roster.members?.map(member => {
                              const memberForm = rosterForm?.members?.[member.id] || { role: 'UNKNOWN', included: true }
                              const editable = rosterSubmitAccess.allowed && registration.status === 'APPROVED' && roster.status === 'DRAFT'
                              return (
                                <div className={styles.rosterTableRow} key={member.id} data-included={memberForm.included}>
                                  <label className={styles.checkField}><input type="checkbox" checked={memberForm.included} disabled={!editable} onChange={event => setRosterMemberField(roster.id, member.id, 'included', event.target.checked)} /><span>{uiText("正式", uiLocale)}</span></label>
                                  <div><strong>{member.player?.displayName || member.player?.battleTag}</strong><small>{member.player?.battleTag || uiText("已认证选手", uiLocale)}</small></div>
                                  {editable ? <RoleSelect ariaLabel={`${member.player?.displayName || member.player?.battleTag || '选手'}的主要职责`} allowUnknown value={memberForm.role} onChange={value => setRosterMemberField(roster.id, member.id, 'role', value)} /> : <span className={styles.rosterRoleValue}>{roleLabel(memberForm.role)}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {roster.status === 'LOCKED' ? (
                          <dl className={styles.officerSummary}>
                            <div><dt>{uiText("队长", uiLocale)}</dt><dd>{captainLabel}</dd></div>
                            <div><dt>{uiText("副队长", uiLocale)}</dt><dd>{deputyCaptainLabel}</dd></div>
                            <div><dt>{uiText("名单版本", uiLocale)}</dt><dd>V{roster.version}{uiText(" · 只读", uiLocale)}</dd></div>
                          </dl>
                        ) : (
                          <div className={styles.officerFields}>
                            <label><span>{uiText("队长", uiLocale)}</span><select disabled={!rosterSubmitAccess.allowed || registration.status !== 'APPROVED' || roster.status !== 'DRAFT'} value={rosterForm?.captainUserId || registration?.manager?.id || ''} onChange={event => setRosterField(roster.id, 'captainUserId', event.target.value)}><option value={registration?.manager?.id || ''}>{uiText("经理（默认）", uiLocale)}</option>{officerPlayers.filter(player => player.userId !== registration?.manager?.id).map(player => <option key={player.userId} value={player.userId}>{player.displayName || player.battleTag}</option>)}</select></label>
                            <label><span>{uiText("副队长", uiLocale)}</span><select disabled={!rosterSubmitAccess.allowed || registration.status !== 'APPROVED' || roster.status !== 'DRAFT'} value={rosterForm?.deputyCaptainUserId || ''} onChange={event => setRosterField(roster.id, 'deputyCaptainUserId', event.target.value)}><option value="">{uiText("不设置", uiLocale)}</option>{officerPlayers.filter(player => player.userId !== rosterForm?.captainUserId).map(player => <option key={player.userId} value={player.userId}>{player.displayName || player.battleTag}</option>)}</select></label>
                          </div>
                        )}

                        {registration.status === 'APPROVED' && roster.status === 'DRAFT' ? (
                          <div className={styles.rosterSubmitBar}>
                            <button type="button" title={capabilityBlockText(rosterSubmitAccess)} disabled={Boolean(actionKey) || !rosterSubmitAccess.allowed} onClick={() => runAction(`roster:${roster.id}:save`, () => saveRosterConfiguration(roster.id, rosterPayload), '名单草稿已保存。')}>{uiText("保存名单草稿", uiLocale)}</button>
                            <label><span>{uiText("提交前确认当前密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={rosterForm?.password || ''} onChange={event => setRosterField(roster.id, 'password', event.target.value)} /></label>
                            <button type="button" className={styles.primaryRosterAction} title={capabilityBlockText(rosterSubmitAccess)} disabled={Boolean(actionKey) || !rosterSubmitAccess.allowed || !rosterForm?.password || includedMembers.length < 5 || includedMembers.length > 7 || !rolesComplete} onClick={() => runAction(`roster:${roster.id}:submit`, async () => { await saveRosterConfiguration(roster.id, rosterPayload); await submitOfficialRoster(roster.id, rosterForm.password) }, '本届注册名单已提交，等待 system 审核。')}>{uiText("提交注册名单", uiLocale)}</button>
                          </div>
                        ) : roster.status === 'SUBMITTED' ? (
                          <div className={styles.rosterPendingBar}><span>{uiText("注册名单审核期间已冻结招募和名单编辑。", uiLocale)}</span><button type="button" title={capabilityBlockText(rosterSubmitAccess)} disabled={Boolean(actionKey) || !rosterSubmitAccess.allowed} onClick={() => runAction(`roster:${roster.id}:withdraw`, () => withdrawOfficialRoster(roster.id), '注册名单已撤回，可以继续编辑。')}>{uiText("撤回提交", uiLocale)}</button></div>
                        ) : roster.status === 'LOCKED' ? <div className={styles.rosterLocked}>{uiText("本届注册名单已锁定，并已同步到赛事数据；单图出场阵容将在比赛房间确认。", uiLocale)}</div> : null}
                      </section>
                    ) : null}
                  </>
                )}
                </section>

                {registration ? (
                  <section className={styles.managerPanel} data-panel="applications" hidden={activeManagerTab !== 'applications'} id={`${operationsAnchor}-people`}>
                    <section className={`${styles.twoColumns} ${styles.managerPeopleWorkspace}`} id={`${operationsAnchor}-people`} data-tone={peopleView.tone}>
                      <header className={styles.managerPeopleHeader}>
                        <div><span>PLAYER DECISION DESK</span><strong>{roster?.status === 'LOCKED' ? uiText("本届申请已关闭", uiLocale) : peopleView.headline}</strong><p>{roster?.status === 'LOCKED' ? uiText("正式名单已经锁定，申请和邀请记录保留只读；后续变更需等待开放窗口。", uiLocale) : peopleView.description}</p></div>
                        <dl>{peopleView.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
                      </header>

                      {applicationQueue.pending.length && (!applicationReviewAccess.allowed || roster?.status !== 'DRAFT') ? <div className={styles.peopleFrozenNotice}>{uiText("当前申请会继续保留，但名单处于只读或审核状态，暂时不能通过新申请。", uiLocale)}</div> : null}

                      <div className={styles.peopleColumns}>
                        <section className={styles.peoplePanel} data-priority={applicationQueue.pending.length ? 'true' : 'false'}>
                          <header><div><span>APPLICATION QUEUE</span><h4>{uiText("选手申请", uiLocale)}</h4><p>{uiText("通过后立即加入候选阵容；拒绝不会占用候选名额。", uiLocale)}</p></div><em>{applicationQueue.pending.length} PENDING</em></header>
                          <div className={styles.peoplePanelBody}>
                            {applicationQueue.pending.length ? applicationQueue.pending.map(application => (
                              <article className={styles.managerPersonRow} key={application.id}>
                                <div>
                                  <span>{uiText("申请职责 · ", uiLocale)}{application.preferredRoles?.join(' / ') || uiText("待协商", uiLocale)}</span>
                                  <strong>{application.player?.displayName || application.player?.battleTag}</strong>
                                  <p>{application.message || uiText("选手没有填写额外申请说明。", uiLocale)}</p>
                                  {privateContactLine(registration.id, application.player?.userId) ? <small className={styles.privateContactLine}>{privateContactLine(registration.id, application.player?.userId)}</small> : null}
                                </div>
                                <div>
                                  <button type="button" className={styles.privacyButton} disabled={!application.player?.userId || actionKey === `contact:${registration.id}:${application.player?.userId}`} onClick={() => revealPrivateContact(registration.id, application.player?.userId, 'APPLICATION_REVIEW')}>{uiText("联系方式", uiLocale)}</button>
                                  <button type="button" title={peopleView.availableSlots === 0 ? uiText("候选阵容已经达到 7 人上限。", uiLocale) : capabilityBlockText(applicationReviewAccess)} disabled={!applicationReviewAccess.allowed || roster?.status !== 'DRAFT' || peopleView.availableSlots === 0 || Boolean(actionKey)} onClick={() => runAction(`application:${application.id}:accept`, () => reviewTeamApplication(application.id, 'accept'), '选手已进入候选阵容。')}>{peopleView.availableSlots === 0 ? uiText("候选已满", uiLocale) : uiText("通过申请", uiLocale)}</button>
                                  <button type="button" className={styles.secondaryPeopleAction} title={capabilityBlockText(applicationReviewAccess)} disabled={!applicationReviewAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`application:${application.id}:reject`, () => reviewTeamApplication(application.id, 'reject'), '申请已拒绝。')}>{uiText("拒绝", uiLocale)}</button>
                                </div>
                              </article>
                            )) : <EmptyBlock title={uiText("暂无待审核申请", uiLocale)}>{roster?.status === 'LOCKED' ? uiText("本届招募已经结束；如开放名单变更窗口，新的申请会显示在这里。", uiLocale) : uiText("公开招募后，选手申请会显示在这里。", uiLocale)}</EmptyBlock>}
                            {applicationQueue.recent.length ? (
                              <details className={styles.applicationHistory}>
                                <summary>{uiText("最近已处理（", uiLocale)}{applicationQueue.recent.length}）</summary>
                                <div>
                                  {applicationQueue.recent.map(application => (
                                    <div className={styles.historyRow} key={application.id}>
                                      <span>{application.player?.displayName || application.player?.battleTag || uiText("未命名选手", uiLocale)}</span>
                                      <small>{formatDateTime(application.reviewedAt || application.createdAt)}</small>
                                      <StatusChip status={application.status} />
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </section>

                      </div>
                    </section>

                    {['SUBMITTED', 'APPROVED'].includes(registration.status) && roster?.status === 'DRAFT' && freeAgents.length ? (
                      <section className={`${styles.freeAgentList} ${styles.managerTalentPool}`}><header><div><span>FREE AGENT POOL</span><strong>{uiText("邀请自由选手", uiLocale)}</strong><p>{uiText("邀请需要选手本人确认；接受后才会占用候选阵容名额。", uiLocale)}</p></div><em>{freeAgents.length} AVAILABLE</em></header><div>{freeAgents.map(agent => <article className={styles.managerPersonRow} key={agent.id}><div><span>{agent.preferredRoles?.join(' / ') || uiText("职责开放", uiLocale)}</span><strong>{agent.player?.displayName || agent.player?.battleTag}</strong><p>{agent.bio || uiText("暂无公开简介", uiLocale)}</p></div><button type="button" title={peopleView.availableSlots === 0 ? uiText("候选阵容已经达到 7 人上限。", uiLocale) : capabilityBlockText(applicationReviewAccess)} disabled={!applicationReviewAccess.allowed || peopleView.availableSlots === 0 || Boolean(actionKey)} onClick={() => runAction(`invite:${registration.id}:${agent.player.id}`, () => invitePlayer(registration.id, { playerIdentityId: agent.player.id, preferredRoles: agent.preferredRoles || [] }), '邀请已发送，等待选手接受。')}>{peopleView.availableSlots === 0 ? uiText("候选已满", uiLocale) : uiText("发送邀请", uiLocale)}</button></article>)}</div></section>
                    ) : null}
                  </section>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}

      {incomingManagerTransfers.some(transfer => transfer.status === 'PENDING') ? (
        <div className={styles.roleSection}>
          <div className={styles.sectionTitle}><div><span>MANAGER HANDOVER</span><h3>{uiText("待确认的经理交接", uiLocale)}</h3></div><em>{incomingManagerTransfers.filter(transfer => transfer.status === 'PENDING').length}{uiText(" 项待处理", uiLocale)}</em></div>
          {incomingManagerTransfers.filter(transfer => transfer.status === 'PENDING').map(transfer => {
            const responseForm = { password: '', note: '', ...(managerTransferResponseForms[transfer.id] || {}) }
            const managerTransferRespondAccess = resolveCapabilityAccess(capabilitySnapshot, 'manager.transfer.respond', {
              organizationId: transfer.team?.id
            })
            return (
              <article className={styles.managerTransferCard} key={transfer.id}>
                <header><div><span>TEAM CONTROL INVITATION</span><strong>{transfer.team?.shortName} / {transfer.team?.name}</strong><p>{transfer.fromUser?.displayName || transfer.fromUser?.username}{uiText(" 邀请你接任经理。", uiLocale)}{transfer.reason ? uiText("说明：{0}", uiLocale, [transfer.reason]) : ''}</p></div><StatusChip status={transfer.status} /></header>
                <div className={styles.managerTransferFacts}><span>{uiText("发起时间：", uiLocale)}{formatDateTime(transfer.createdAt)}</span><span>{uiText("到期时间：", uiLocale)}{formatDateTime(transfer.expiresAt)}</span><span>{uiText("接受后立即同步所有进行中的赛事关系", uiLocale)}</span></div>
                {!managerTransferRespondAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(managerTransferRespondAccess)}</div> : null}
                <div className={styles.managerTransferResponse}>
                  <label><span>{uiText("确认当前密码", uiLocale)}</span><input disabled={!managerTransferRespondAccess.allowed} type="password" autoComplete="current-password" value={responseForm.password} onChange={event => setManagerTransferResponseField(transfer.id, 'password', event.target.value)} /></label>
                  <label><span>{uiText("回应说明（可选）", uiLocale)}</span><input disabled={!managerTransferRespondAccess.allowed} value={responseForm.note} onChange={event => setManagerTransferResponseField(transfer.id, 'note', event.target.value)} /></label>
                  <button type="button" title={capabilityBlockText(managerTransferRespondAccess)} disabled={!managerTransferRespondAccess.allowed || !responseForm.password || Boolean(actionKey)} onClick={() => runAction(`manager-transfer-accept:${transfer.id}`, () => respondToManagerTransfer(transfer.id, 'accept', responseForm), '经理交接已完成，你现在拥有队伍管理权。')}>{uiText("确认接任", uiLocale)}</button>
                  <button type="button" className={styles.secondaryCoachAction} title={capabilityBlockText(managerTransferRespondAccess)} disabled={!managerTransferRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`manager-transfer-reject:${transfer.id}`, () => respondToManagerTransfer(transfer.id, 'reject', { note: responseForm.note }), '已拒绝经理交接。')}>{uiText("拒绝", uiLocale)}</button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {hasCoachIdentity || coachMemberships.length ? (
        <div className={styles.roleSection} id="coach-registration-flow">
          <div className={styles.sectionTitle}><div><span>COACH FLOW</span><h3>{uiText("我的教练关系", uiLocale)}</h3></div><em>{coachMemberships.filter(membership => membership.status === 'INVITED' || membership.eventRelationship?.status === 'INVITED').length}{uiText(" 个待确认", uiLocale)}</em></div>
          {coachMemberships.length ? coachMemberships.map(membership => {
            const eventRelationship = membership.eventRelationship
            const coachRelationshipAccess = resolveCapabilityAccess(capabilitySnapshot, 'coach.invitation.respond', {
              organizationId: membership.team?.id
            })
            const eventCoachRespondAccess = resolveCapabilityAccess(capabilitySnapshot, 'coach.event.respond', {
              registrationId: eventRelationship?.registration?.id || membership.registration?.id
            })
            return (
              <article className={styles.coachSelfCard} key={membership.id}>
                <header><div><span>LONG-TERM COACH</span><strong>{membership.team?.shortName} / {membership.team?.name}</strong><p>{membership.status === 'INVITED' ? uiText("接受后会自动建立教练身份和长期队伍关系。", uiLocale) : uiText("长期关系已生效；每届正式教练仍需单独接受邀请。", uiLocale)}</p></div><StatusChip status={membership.status} /></header>
                {!coachRelationshipAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(coachRelationshipAccess)}</div> : null}
                {membership.status === 'INVITED' ? (
                  <div className={styles.coachSelfActions}><button type="button" title={capabilityBlockText(coachRelationshipAccess)} disabled={!coachRelationshipAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`coach-accept:${membership.id}`, () => respondToLongTermCoachInvitation(membership.id, 'accept'), '已接受邀请，长期教练关系和教练身份立即生效。')}>{uiText("接受长期邀请", uiLocale)}</button><button type="button" title={capabilityBlockText(coachRelationshipAccess)} disabled={!coachRelationshipAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`coach-reject:${membership.id}`, () => respondToLongTermCoachInvitation(membership.id, 'reject'), '已拒绝长期教练邀请。')}>{uiText("拒绝", uiLocale)}</button></div>
                ) : (
                  <>
                    <div className={styles.coachEventState}>
                      <div><span>{seasonId} OFFICIAL COACH</span><strong>{eventRelationship ? statusLabel(eventRelationship.status) : membership.registration ? uiText("等待经理邀请", uiLocale) : uiText("队伍尚未报名本届", uiLocale)}</strong><p>{eventRelationship?.status === 'INVITED' ? uiText("接受后立即成为本届正式教练，无需 System 审核。", uiLocale) : eventRelationship?.status === 'ACTIVE' ? uiText("当前为只读队伍权限，可查看赛事信息但不能代替经理提交。", uiLocale) : eventRelationship?.status === 'REVOKED' ? uiText("该关系已由 System 撤销，经理不能自行恢复。", uiLocale) : uiText("长期关系仍然保留。", uiLocale)}</p></div>
                      {eventRelationship ? <StatusChip status={eventRelationship.status} /> : null}
                    </div>
                    <div className={styles.coachSelfActions}>
                      {eventRelationship?.status === 'INVITED' ? <><button type="button" title={capabilityBlockText(eventCoachRespondAccess)} disabled={!eventCoachRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`event-coach-accept:${eventRelationship.id}`, () => respondToEventCoachInvitation(eventRelationship.id, 'accept'), '已接受邀请，本届正式教练关系立即生效。')}>{uiText("接受本届邀请", uiLocale)}</button><button type="button" title={capabilityBlockText(eventCoachRespondAccess)} disabled={!eventCoachRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`event-coach-reject:${eventRelationship.id}`, () => respondToEventCoachInvitation(eventRelationship.id, 'reject'), '已拒绝本届正式教练邀请。')}>{uiText("拒绝本届邀请", uiLocale)}</button></> : null}
                      {eventRelationship?.status === 'ACTIVE' ? <button type="button" title={capabilityBlockText(eventCoachRespondAccess)} disabled={!eventCoachRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`event-coach-leave:${eventRelationship.id}`, () => leaveEventCoachRole(eventRelationship.id), '已退出本届正式教练关系，长期关系保留。')}>{uiText("退出本届", uiLocale)}</button> : null}
                      <button type="button" className={styles.secondaryCoachAction} title={capabilityBlockText(coachRelationshipAccess)} disabled={!coachRelationshipAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`coach-leave:${membership.id}`, () => leaveLongTermCoachTeam(membership.id), '已退出长期教练关系，相关本届关系同步结束。')}>{uiText("退出长期队伍", uiLocale)}</button>
                    </div>
                  </>
                )}
              </article>
            )
          }) : <EmptyBlock title={uiText("等待长期队伍邀请", uiLocale)}>{uiText("教练身份已经保留；经理发出邀请后，会在这里确认长期关系和本届正式教练关系。", uiLocale)}</EmptyBlock>}
        </div>
      ) : null}

      {hasPlayerIdentity || player ? (
        <div className={styles.roleSection} id="player-registration-flow">
          <div className={styles.sectionTitle}><div><span>PLAYER FLOW</span><h3>{uiText("选手加入流程", uiLocale)}</h3><p>{playerFlow.headline}</p></div><StatusChip status={playerFlow.headlineStatus} /></div>
          {!playerApplyAccess.allowed && !player?.rosterMembership ? <div className={styles.capabilityBlock}>{capabilityBlockText(playerApplyAccess)}</div> : null}

          {player?.rosterMembership ? (
            <PlayerFlowGroup eyebrow="CURRENT RELATIONSHIP" title={uiText("当前队伍与名单", uiLocale)} description={uiText("这里只展示你本届已经成立的候选或注册名单关系。", uiLocale)} badge={playerFlow.membershipTitle} tone="active">
              <article className={styles.stateCard}><div><span>{playerFlow.membershipTitle}</span><strong>{player.rosterMembership.registration?.team?.shortName} / {player.rosterMembership.registration?.team?.name}</strong><p>{uiText("职责：", uiLocale)}{roleLabel(player.rosterMembership.role)}。{player.rosterMembership.rosterStatus === 'LOCKED' ? uiText("本届注册名单已由 System 审核锁定；每张地图的实际出场阵容由比赛房间确认。", uiLocale) : player.rosterMembership.rosterStatus === 'SUBMITTED' ? uiText("经理已提交本届注册名单，正在等待 System 审核。", uiLocale) : uiText("经理仍可调整本届注册名单。", uiLocale)}</p></div><StatusChip status={player.rosterMembership.rosterStatus || player.rosterMembership.status} /></article>
            </PlayerFlowGroup>
          ) : (
            <>
              {playerFlow.selectionOutcome ? (
                <PlayerFlowGroup eyebrow="ROSTER OUTCOME" title={uiText("最近一次名单结果", uiLocale)} description={uiText("历史入队关系不会覆盖你当前可执行的申请与邀请。", uiLocale)} badge={playerFlow.selectionOutcome.isFinal ? 'FINAL RESULT' : 'CURRENT STATE'} tone="attention">
                  <article className={styles.selectionOutcome} data-final={playerFlow.selectionOutcome.isFinal}>
                    <div><span>{playerFlow.selectionOutcome.isFinal ? 'FINAL ROSTER RESULT' : 'CURRENT ROSTER STATE'}</span><strong>{playerFlow.selectionOutcome.team?.shortName || playerFlow.selectionOutcome.team?.name || uiText("此前加入的队伍", uiLocale)}</strong><p>{playerFlow.selectionOutcome.isFinal ? uiText("该队本届注册名单已经锁定，你未进入本版名单。你可以继续申请其他仍开放招募的队伍。", uiLocale) : uiText("你的申请或邀请曾经通过，但目前不在该队候选名单中。经理在正式提交前仍可调整；你也可以申请其他开放招募队伍。", uiLocale)}</p></div><StatusChip status="NOT_SELECTED" />
                  </article>
                </PlayerFlowGroup>
              ) : null}

              {pendingApplication || playerFlow.pendingInvitations.length ? (
                <PlayerFlowGroup eyebrow="CURRENT ACTION" title={playerFlow.pendingInvitations.length ? uiText("需要你确认的队伍邀请", uiLocale) : uiText("正在等待的入队申请", uiLocale)} description={playerFlow.pendingInvitations.length ? uiText("队伍邀请需要本人接受或拒绝；等待中的主动申请仍可撤回。", uiLocale) : uiText("经理审核前可以撤回；同一时间只能保留一条主动申请。", uiLocale)} badge={playerFlow.pendingInvitations.length ? `${playerFlow.pendingInvitations.length} INVITES` : '1 APPLICATION'} tone="action">
                  {playerFlow.pendingInvitations.map(invitation => (
                    <article className={styles.invitationCard} key={invitation.id}><div><span>{uiText("队伍邀请", uiLocale)}</span><strong>{invitation.registration?.team?.shortName} / {invitation.registration?.team?.name}</strong><p>{invitation.message || uiText("经理邀请你加入本届候选阵容。", uiLocale)} · {invitation.preferredRoles?.join(' / ') || uiText("职责待协商", uiLocale)}</p>{!playerRespondAccess.allowed ? <small className={styles.capabilityInline}>{capabilityBlockText(playerRespondAccess)}</small> : null}</div><div><button type="button" title={capabilityBlockText(playerRespondAccess)} disabled={!playerRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`invitation:${invitation.id}:accept`, () => respondToTeamInvitation(invitation.id, 'accept'), '已接受邀请并进入候选阵容。')}>{uiText("接受", uiLocale)}</button><button type="button" title={capabilityBlockText(playerRespondAccess)} disabled={!playerRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`invitation:${invitation.id}:reject`, () => respondToTeamInvitation(invitation.id, 'reject'), '已拒绝邀请。')}>{uiText("拒绝", uiLocale)}</button></div></article>
                  ))}
                  {pendingApplication ? (
                    <article className={styles.invitationCard}>
                      <div><span>{uiText("待审核申请", uiLocale)}</span><strong>{pendingApplication.registration?.team?.shortName} / {pendingApplication.registration?.team?.name}</strong><p>{pendingApplication.preferredRoles?.join(' / ') || uiText("职责待定", uiLocale)} · {pendingApplication.message || uiText("无附言", uiLocale)}</p></div>
                      <button type="button" disabled={actionKey === `application:${pendingApplication.id}:withdraw`} onClick={() => runAction(`application:${pendingApplication.id}:withdraw`, () => withdrawTeamApplication(pendingApplication.id), '申请已撤回，你可以申请其他队伍。')}>{uiText("撤回申请", uiLocale)}</button>
                    </article>
                  ) : null}
                </PlayerFlowGroup>
              ) : null}

              <PlayerFlowGroup eyebrow="TEAM APPLICATION" title={uiText("申请开放招募队伍", uiLocale)} description={uiText("先填写本次申请使用的职责和说明，再选择目标队伍提交。", uiLocale)} badge={`${recruitingTeams.length} TEAMS`}>
                {recruitingTeams.length ? <div className={styles.applicationNote}><label><span>{uiText("申请职责", uiLocale)}</span><RoleSelect ariaLabel="申请职责（所有申请共用）" value={applicationRole} onChange={setApplicationRole} /></label><label><span>{uiText("给经理的申请说明", uiLocale)}</span><input placeholder={uiText("介绍可用时间、擅长英雄或训练安排", uiLocale)} value={applicationMessage} onChange={event => setApplicationMessage(event.target.value)} /></label></div> : null}
                <div className={styles.recruitingGrid}>
                  {recruitingTeams.length ? recruitingTeams.map(registration => (
                    <article key={registration.id}>
                      <div><span>OPEN RECRUITMENT</span><strong>{registration.team?.shortName}</strong><p>{registration.team?.name}</p></div>
                      <dl><div><dt>{uiText("候选阵容", uiLocale)}</dt><dd>{registration.candidateCount || 0}{uiText(" 人", uiLocale)}</dd></div><div><dt>{uiText("需求", uiLocale)}</dt><dd>{registration.recruitmentNeeds?.roles?.join(' / ') || uiText("开放", uiLocale)}</dd></div></dl>
                      <button type="button" title={capabilityBlockText(playerApplyAccess)} disabled={!playerApplyAccess.allowed || !playerFlow.canApply || actionKey === `apply:${registration.id}`} onClick={() => runAction(`apply:${registration.id}`, () => applyToTeam(registration.id, { preferredRoles: [applicationRole], message: applicationMessage }), '申请已提交，等待经理审核。')}>{pendingApplication?.registrationId === registration.id ? uiText("申请审核中", uiLocale) : pendingApplication ? uiText("已有待审核申请", uiLocale) : uiText("申请加入", uiLocale)}</button>
                    </article>
                  )) : <EmptyBlock title={uiText("暂无公开招募队伍", uiLocale)}>{uiText("队伍报名审核通过并开启公开招募后会显示在这里。", uiLocale)}</EmptyBlock>}
                </div>
                {pendingApplication ? <p className={styles.applicationRule}>{uiText("当前已有一条申请等待审核；撤回或收到结果后才能主动申请其他队伍。", uiLocale)}</p> : null}
              </PlayerFlowGroup>

              <PlayerFlowGroup eyebrow="FREE AGENT" title={uiText("公开自由选手状态", uiLocale)} description={uiText("不主动申请也可以公开职责、档期和简介，等待已报名队伍的经理邀请。", uiLocale)} badge={freeAgentForm.status === 'OPEN' ? 'OPEN' : 'CLOSED'}>
                <form className={styles.formCard} onSubmit={event => {
                  event.preventDefault()
                  runAction('free-agent', () => saveFreeAgentProfile(seasonId, {
                    preferredRoles: [freeAgentForm.preferredRole],
                    availability: freeAgentForm.availability,
                    bio: freeAgentForm.bio,
                    status: freeAgentForm.status,
                    shareContact: false
                  }), freeAgentForm.status === 'OPEN' ? '自由选手资料已开放。' : '自由选手资料已关闭。')
                }}>
                  <div className={styles.formHeading}><strong>{uiText("公开资料设置", uiLocale)}</strong><span>{uiText("这里只公开参赛资料，不直接展示账号联系方式。", uiLocale)}</span></div>
                  <label><span>{uiText("主要职责", uiLocale)}</span><RoleSelect value={freeAgentForm.preferredRole} onChange={value => setFreeAgentForm(current => ({ ...current, preferredRole: value }))} /></label>
                  <label><span>{uiText("状态", uiLocale)}</span><select value={freeAgentForm.status} onChange={event => setFreeAgentForm(current => ({ ...current, status: event.target.value }))}><option value="OPEN">{uiText("开放寻找队伍", uiLocale)}</option><option value="CLOSED">{uiText("暂时关闭", uiLocale)}</option></select></label>
                  <label className={styles.wideField}><span>{uiText("可用时间", uiLocale)}</span><input value={freeAgentForm.availability} onChange={event => setFreeAgentForm(current => ({ ...current, availability: event.target.value }))} /></label>
                  <label className={styles.wideField}><span>{uiText("简介", uiLocale)}</span><textarea value={freeAgentForm.bio} onChange={event => setFreeAgentForm(current => ({ ...current, bio: event.target.value }))} /></label>
                  <button type="submit" disabled={actionKey === 'free-agent' || !context?.emailVerified}>{uiText("保存自由选手状态", uiLocale)}</button>
                </form>
              </PlayerFlowGroup>
            </>
          )}

          {playerFlow.recentActivity.length ? (
            <section className={styles.playerHistory}>
              <div className={styles.playerHistoryHeading}><div><span>RECENT ACTIVITY</span><strong>{uiText("最近报名记录", uiLocale)}</strong></div><small>{uiText("当前状态以上方进度为准", uiLocale)}</small></div>
              <div>
                {playerFlow.recentActivity.map(activity => {
                  const team = activity.registration?.team
                  const isApplication = activity.activityType === 'APPLICATION'
                  const description = isApplication
                    ? activity.status === 'REJECTED'
                      ? '经理未通过本次申请，你仍可选择其他开放招募队伍。'
                      : activity.status === 'WITHDRAWN'
                        ? '你已主动撤回本次申请。'
                        : '本次申请已经处理。'
                    : activity.status === 'REJECTED'
                      ? '你已拒绝这次队伍邀请。'
                      : activity.status === 'EXPIRED'
                        ? '该邀请已过有效期。'
                        : '本次邀请已经处理。'
                  return (
                    <article className={styles.playerHistoryRow} key={`${activity.activityType}:${activity.id}`}>
                      <div><span>{isApplication ? uiText("我的申请", uiLocale) : uiText("队伍邀请", uiLocale)}</span><strong>{team?.shortName || team?.name || uiText("队伍记录", uiLocale)}</strong><p>{description}</p></div>
                      <div><small>{formatDateTime(activity.reviewedAt || activity.acceptedAt || activity.rejectedAt || activity.createdAt)}</small><StatusChip status={activity.status} /></div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!previewData ? <RosterChangeWorkspace seasonId={seasonId} capabilitySnapshot={capabilitySnapshot} /> : null}

      {!hasManagerIdentity && !hasPlayerIdentity && !managerTeams.length && !player && !coachMemberships.length && !incomingManagerTransfers.some(transfer => transfer.status === 'PENDING') ? <EmptyBlock title={uiText("普通账号也可以申请创建队伍", uiLocale)}>{uiText("提交并通过队伍创建或认领审核后，系统会自动建立经理身份。", uiLocale)}</EmptyBlock> : null}
    </section>
  )
}
