import { useEffect, useMemo, useState } from 'react'
import { SEASONS, getSeasonLabel } from '../../config/seasons.js'
import {
  createUserFeedback,
  createVerificationRequest,
  fetchContactPrivacy,
  fetchNotificationPreferences,
  fetchUserFeedback,
  fetchUserProfile,
  fetchVerificationRequests,
  updateNotificationPreferences,
  updateUserProfile
} from './userDataApi.js'
import { fetchMySpaceContext } from '../my-space/mySpaceApi.js'
import { getLocalizedOption, getRegionOption, REGION_GROUPS } from './regionOptions.js'
import styles from './AccountCenter.module.css'

const IDENTITY_OPTIONS = [
  { value: 'PLAYER', zh: '选手', en: 'Player', targetType: 'PLAYER' },
  { value: 'MANAGER', zh: '经理', en: 'Manager', targetType: 'TEAM' },
  { value: 'COACH', zh: '教练', en: 'Coach', targetType: 'TEAM' },
  { value: 'CASTER', zh: '解说', en: 'Caster', targetType: 'STAFF' },
  { value: 'REFEREE', zh: '赛管', en: 'Referee', targetType: 'STAFF' }
]

const TEAM_IDENTITY_TYPES = new Set(['PLAYER', 'MANAGER', 'COACH'])
const STAFF_IDENTITY_TYPES = new Set(['CASTER', 'REFEREE'])
const BATTLETAG_REQUIRED_TYPES = new Set(['PLAYER', 'MANAGER', 'COACH', 'CASTER', 'REFEREE'])

const STATUS_LABELS = {
  PENDING: { zh: '审核中', en: 'Pending' },
  APPROVED: { zh: '已通过', en: 'Approved' },
  REJECTED: { zh: '已驳回', en: 'Rejected' },
  CANCELLED: { zh: '已取消', en: 'Cancelled' }
}

const FEEDBACK_TARGET_OPTIONS = [
  { value: 'PLAYER', zh: '选手', en: 'Player' },
  { value: 'TEAM', zh: '队伍', en: 'Team' },
  { value: 'MATCH', zh: '比赛', en: 'Match' },
  { value: 'MAP', zh: '地图', en: 'Map' },
  { value: 'STAFF', zh: '工作人员', en: 'Staff' },
  { value: 'OTHER', zh: '其他', en: 'Other' }
]

const FEEDBACK_STATUS_LABELS = {
  OPEN: { zh: '新反馈', en: 'Open' },
  TRIAGED: { zh: '已分流', en: 'Triaged' },
  FIXING: { zh: '处理中', en: 'Fixing' },
  RESOLVED: { zh: '已解决', en: 'Resolved' },
  REJECTED: { zh: '已拒绝', en: 'Rejected' },
  DUPLICATE: { zh: '重复反馈', en: 'Duplicate' }
}

function ui(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function getIdentityOption(value) {
  return IDENTITY_OPTIONS.find(option => option.value === value) || IDENTITY_OPTIONS[0]
}

function getIdentityLabel(value, locale) {
  const option = getIdentityOption(value)
  return locale === 'en-US' ? option.en : option.zh
}

function getStatusLabel(status, locale) {
  const label = STATUS_LABELS[status]
  if (!label) return status || '-'
  return locale === 'en-US' ? label.en : label.zh
}

function getSeasonName(seasonId, locale) {
  const season = SEASONS.find(item => item.id === seasonId)
  return season ? getSeasonLabel(season, locale) : seasonId || '-'
}

function getParticipantLabel(identityType, locale) {
  if (identityType === 'PLAYER') return ui(locale, '参赛名', 'Player name')
  if (identityType === 'MANAGER') return ui(locale, '经理', 'Manager')
  if (identityType === 'COACH') return ui(locale, '教练', 'Coach')
  return ui(locale, '显示名', 'Name')
}

function getFeedbackTargetLabel(value, locale) {
  const option = FEEDBACK_TARGET_OPTIONS.find(item => item.value === value)
  if (!option) return value || '-'
  return locale === 'en-US' ? option.en : option.zh
}

function getFeedbackStatusLabel(status, locale) {
  const label = FEEDBACK_STATUS_LABELS[status]
  if (!label) return status || '-'
  return locale === 'en-US' ? label.en : label.zh
}

function formatDateTime(value, locale) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale === 'en-US' ? 'en-US' : 'zh-CN', { hour12: false })
}

function getInitial(user) {
  const source = user?.displayName || user?.username || user?.email || 'FC'
  return String(source).trim().slice(0, 1) || 'F'
}

function getProfileContact(profile, type) {
  if (!profile) return ''
  if (type === 'QQ') {
    return profile.qqContact || (profile.contactType === 'QQ' ? profile.contactValue : '')
  }
  return profile.discordContact || (profile.contactType === 'DISCORD' ? profile.contactValue : '')
}

function getPrivacyGrantLabel(grant, locale) {
  const labels = {
    APPLICATION_REVIEW: ui(locale, '报名申请审核', 'Application review'),
    TEAM_OPERATIONS: ui(locale, '本届队伍事务', 'Event team operations'),
    SYSTEM_REVIEW: ui(locale, '身份认证审核', 'Identity review')
  }
  return labels[grant?.grantType] || grant?.grantType || '-'
}

function getPrivacyEndLabel(value, locale) {
  const labels = {
    APPLICATION_RESOLVED: ui(locale, '申请通过、拒绝或撤回时结束', 'Ends when the application is resolved'),
    TEAM_RELATION_ENDED: ui(locale, '本届队伍关系结束时终止', 'Ends when the event team relationship ends'),
    REVIEW_RESOLVED: ui(locale, '认证审核完成时结束', 'Ends when the review is resolved')
  }
  return labels[value] || value || '-'
}

function getAccessPurposeLabel(value, locale) {
  const labels = {
    APPLICATION_REVIEW: ui(locale, '审核队伍申请', 'Review team application'),
    TEAM_OPERATIONS: ui(locale, '处理队伍事务', 'Handle team operations')
  }
  return labels[value] || value || ui(locale, '赛事审核', 'Event review')
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  operationsEmail: true,
  matchReminderInApp: true,
  matchReminderEmail: true,
  announcementInApp: true,
  announcementEmail: true,
  predictionInApp: true,
  predictionEmail: false
}

function createProfileForm(user, profile) {
  return {
    displayName: user?.displayName || profile?.nickname || '',
    avatarUrl: profile?.avatarUrl || '',
    regionCode: profile?.regionCode || 'CN',
    qqContact: getProfileContact(profile, 'QQ'),
    discordContact: getProfileContact(profile, 'DISCORD'),
    bio: profile?.bio || ''
  }
}

function getOnboardingSteps({ user, profile, identities, verification, spaceContext, locale }) {
  const activeTypes = (Array.isArray(identities) ? identities : [])
    .filter(identity => identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase()))
    .map(identity => String(identity.identityType || identity.type || '').toUpperCase())
  const staffOnly = activeTypes.length > 0 && activeTypes.every(type => ['CASTER', 'REFEREE'].includes(type))
  const primaryStaffType = String(spaceContext?.primaryIdentityType || '').toUpperCase()
  const staffWorkspaceHref = primaryStaffType === 'REFEREE' || (!activeTypes.includes('CASTER') && activeTypes.includes('REFEREE'))
    ? '/me?section=referee'
    : '/me?section=caster'
  const staff = spaceContext?.staffContext || {}
  const staffAssignments = [
    ...(staff.refereeAssignments || []),
    ...(staff.broadcastRefereeAssignments || []),
    ...(staff.casterAssignments || [])
  ]
  const teamContexts = spaceContext?.teamContexts || []
  const registrationComplete = teamContexts.some(context => ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(context.registrationStatus))
  const hasContact = Boolean(getProfileContact(profile, 'QQ') || getProfileContact(profile, 'DISCORD'))
  const baseSteps = [
    {
      key: 'email',
      label: ui(locale, '验证邮箱', 'Verify email'),
      detail: ui(locale, '启用身份、报名和竞猜', 'Unlock identity, registration, and predictions'),
      complete: Boolean(user?.emailVerified),
      tab: null
    },
    {
      key: 'profile',
      label: ui(locale, '完善资料', 'Complete profile'),
      detail: ui(locale, '地区和至少一种联系方式', 'Region and at least one contact'),
      complete: Boolean(user?.displayName && profile?.regionCode && hasContact),
      tab: 'profile'
    }
  ]

  if (activeTypes.length === 0 && !['pending', 'rejected'].includes(verification?.tone)) {
    return [
      ...baseSteps,
      {
        key: 'viewer',
        label: ui(locale, '普通观众空间', 'Viewer space'),
        detail: ui(locale, '关注、竞猜和赛事通知均可使用', 'Following, predictions, and event notices are available'),
        complete: Boolean(user?.emailVerified),
        href: '/me'
      }
    ]
  }

  return [
    ...baseSteps,
    {
      key: 'identity',
      label: ui(locale, '认证身份', 'Verify identity'),
      detail: ui(locale, '选手、经理、教练或工作人员', 'Player, manager, coach, or staff'),
      complete: activeTypes.length > 0 || verification?.tone === 'approved',
      tab: 'verification'
    },
    staffOnly ? {
      key: 'relationship',
      label: ui(locale, '提交本届档期', 'Submit availability'),
      detail: ui(locale, '建立本届工作人员关系', 'Create this event staff relationship'),
      complete: Boolean((staff.availability || []).length || staffAssignments.length),
      href: staffWorkspaceHref
    } : {
      key: 'relationship',
      label: ui(locale, '加入队伍', 'Join a team'),
      detail: ui(locale, '建立本届队伍关系', 'Create this event team relationship'),
      complete: teamContexts.length > 0,
      href: '/me?section=team'
    },
    staffOnly ? {
      key: 'event',
      label: ui(locale, '获得正式排班', 'Receive assignment'),
      detail: ui(locale, '进入本届正式赛事任务', 'Join an official event assignment'),
      complete: staffAssignments.length > 0,
      href: '/me?section=caster'
    } : {
      key: 'event',
      label: ui(locale, '完成本届报名', 'Complete registration'),
      detail: ui(locale, '队伍报名已提交或通过', 'Team registration submitted or approved'),
      complete: registrationComplete,
      href: '/me?section=team'
    }
  ]
}

function latestRequestByStatus(requests, status) {
  return [...(Array.isArray(requests) ? requests : [])]
    .filter(request => request.status === status)
    .sort((a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt || 0) - new Date(a.reviewedAt || a.updatedAt || a.createdAt || 0))[0] || null
}

function getVerifiedRequest(profile, requests) {
  const approved = (Array.isArray(requests) ? requests : []).filter(request => request.status === 'APPROVED')
  const matched = approved.find(request => (
    (!profile?.verifiedIdentityType || request.identityType === profile.verifiedIdentityType) &&
    (!profile?.verifiedTargetType || request.targetType === profile.verifiedTargetType) &&
    (!profile?.verifiedTargetId || request.targetId === profile.verifiedTargetId)
  ))

  if (matched) return matched
  if (approved.length > 0) return latestRequestByStatus(approved, 'APPROVED') || approved[0]

  if (profile?.verifiedAt || profile?.claimedPlayerVerified) {
    return {
      status: 'APPROVED',
      seasonId: profile.verifiedSeasonId,
      identityType: profile.verifiedIdentityType,
      targetType: profile.verifiedTargetType,
      targetId: profile.verifiedTargetId || profile.claimedPlayerId,
      reviewedAt: profile.verifiedAt
    }
  }

  return null
}

function getRequestMeta(request, locale) {
  if (!request) return []

  return [
    request.seasonId ? { label: ui(locale, '赛季', 'Season'), value: getSeasonName(request.seasonId, locale) } : null,
    request.teamId ? { label: ui(locale, '队伍', 'Team'), value: request.teamId } : null,
    request.targetId ? { label: getParticipantLabel(request.identityType, locale), value: request.targetId } : null,
    request.battleTag ? { label: 'BattleTag', value: request.battleTag } : null
  ].filter(Boolean)
}

function formatIdentityLine(request, locale) {
  if (!request) return ui(locale, '身份已通过后台审核', 'Identity approved')
  const parts = [
    request.identityType ? getIdentityLabel(request.identityType, locale) : null,
    request.teamId,
    request.targetId
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : ui(locale, '身份已通过后台审核', 'Identity approved')
}

function getVerificationSummary(profile, requests, locale, identities = []) {
  const activeIdentities = (Array.isArray(identities) ? identities : [])
    .filter(identity => identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase()))
  if (activeIdentities.length > 0) {
    return {
      label: ui(locale, `${activeIdentities.length} 个身份`, `${activeIdentities.length} identities`),
      tone: 'approved',
      detail: activeIdentities.map(identity => getIdentityLabel(identity.identityType || identity.type, locale)).join(' · '),
      facts: []
    }
  }

  const verifiedRequest = getVerifiedRequest(profile, requests)
  if (verifiedRequest) {
    return {
      label: ui(locale, '已认证', 'Verified'),
      tone: 'approved',
      detail: formatIdentityLine(verifiedRequest, locale),
      facts: getRequestMeta(verifiedRequest, locale)
    }
  }

  const pending = latestRequestByStatus(requests, 'PENDING')
  if (pending) {
    return {
      label: ui(locale, '审核中', 'Pending'),
      tone: 'pending',
      detail: `${formatIdentityLine(pending, locale)} · ${formatDateTime(pending.createdAt, locale)}`,
      facts: getRequestMeta(pending, locale)
    }
  }

  const rejected = latestRequestByStatus(requests, 'REJECTED')
  if (rejected) {
    return {
      label: ui(locale, '未通过', 'Rejected'),
      tone: 'rejected',
      detail: rejected.adminNote || ui(locale, '最近一次认证申请未通过，可以修改信息后重新提交。', 'The latest request was rejected. You can update the details and submit again.'),
      facts: getRequestMeta(rejected, locale)
    }
  }

  return {
    label: ui(locale, '普通观众', 'Viewer'),
    tone: 'muted',
    detail: ui(locale, '普通观众账号已可使用；只有参赛或承担赛事职责时才需要申请身份。', 'Your viewer account is ready. Apply for an identity only when competing or working an event role.'),
    facts: []
  }
}

function getRequestTarget(request) {
  const parts = [
    request.teamId,
    request.targetId,
    request.battleTag
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '-'
}

function getTeamOptionValue(team) {
  const id = String(team?.team_id || team?.id || '').trim()
  const shortName = String(team?.team_short_name || team?.shortName || team?.short || '').trim()
  const name = String(team?.team_name || team?.name || '').trim()

  if (shortName && name && shortName !== name) return `${shortName} / ${name}`
  return name || shortName || id
}

function getTeamOptions(teams) {
  const seen = new Set()

  return (Array.isArray(teams) ? teams : [])
    .map(team => {
      const value = getTeamOptionValue(team)
      if (!value) return null
      const key = value.toLocaleLowerCase()
      if (seen.has(key)) return null
      seen.add(key)
      return {
        value,
        label: String(team?.team_id || team?.id || '').trim()
      }
    })
    .filter(Boolean)
}

function getErrorText(error, locale) {
  const code = error?.data?.error
  if (code === 'CONTACT_REQUIRED') {
    return ui(locale, '账号资料里至少需要 QQ 或 Discord 联系方式。', 'Your profile needs at least one QQ or Discord contact.')
  }
  if (code === 'INVALID_QQ_CONTACT') {
    return ui(locale, 'QQ 需要填写 5–12 位数字。', 'QQ must be a 5–12 digit number.')
  }
  if (code === 'INVALID_DISCORD_CONTACT') {
    return ui(locale, 'Discord 联系方式至少需要 2 个字符。', 'Discord contact must contain at least 2 characters.')
  }
  if (code === 'REGION_REQUIRED') {
    return ui(locale, '请选择国家或地区。', 'Select a country or region.')
  }
  if (code === 'VERIFICATION_REQUEST_EXISTS') {
    return ui(locale, '同一身份已有待审核申请。', 'A pending request already exists for this identity.')
  }
  if (code === 'EVENT_STAFF_APPLICATION_PENDING') {
    return ui(locale, '这一届的工作人员申请正在审核中。', 'This event staff application is already under review.')
  }
  if (code === 'EVENT_STAFF_INVITATION_PENDING') {
    return ui(locale, '你已经收到这一届的工作人员邀请，请先到“我的空间”接受或拒绝。', 'You already have an event staff invitation. Respond from My Space first.')
  }
  if (code === 'EVENT_STAFF_ALREADY_ACTIVE') {
    return ui(locale, '这一届的工作人员关系已经生效，无需重复申请。', 'This event staff relationship is already active.')
  }
  if (code === 'TARGET_REQUIRED') {
    return ui(locale, '请填写参赛名或昵称。', 'Please enter the participant name.')
  }
  if (code === 'TEAM_REQUIRED') {
    return ui(locale, '请填写队伍名称。', 'Please enter the team name.')
  }
  if (code === 'BATTLETAG_REQUIRED') {
    return ui(locale, '请填写战网 ID。', 'Please enter BattleTag.')
  }
  if (code === 'EMAIL_VERIFICATION_REQUIRED') {
    return ui(locale, '请先完成邮箱验证，再提交身份认证。', 'Verify your email before requesting an identity.')
  }
  if (code === 'IDENTITY_STATUS_RESTRICTED') {
    return ui(locale, '该长期身份已被暂停或撤销，请先联系 System 处理，不能通过新申请自动恢复。', 'This long-term identity is suspended or revoked and cannot be restored through a new request.')
  }
  if (code === 'PRIMARY_IDENTITY_NOT_ACTIVE') {
    return ui(locale, '只能把当前有效的长期身份设为默认身份。', 'Only an active long-term identity can be selected as default.')
  }
  if (code === 'EMAIL_VERIFICATION_COOLDOWN') {
    return ui(locale, '验证邮件刚刚发送，请稍后再试。', 'A verification email was just sent. Please wait before retrying.')
  }
  if (error?.status === 404) {
    return ui(locale, '账号资料接口还没有启用。', 'Account profile API is not enabled yet.')
  }
  return error?.message || ui(locale, '请求失败，请稍后重试。', 'Request failed. Please try again.')
}

export default function AccountCenter({
  user,
  identities = [],
  primaryIdentity = null,
  emailVerificationState,
  locale,
  seasonId,
  teams = [],
  onAccountChange,
  onPrimaryIdentityChange,
  onRequestEmailVerification,
  onLogout
}) {
  const profileUserSeed = useMemo(() => ({
    id: user?.id || '',
    displayName: user?.displayName || '',
    username: user?.username || '',
    email: user?.email || ''
  }), [user?.displayName, user?.email, user?.id, user?.username])
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [spaceContext, setSpaceContext] = useState(null)
  const [profileForm, setProfileForm] = useState(() => createProfileForm(profileUserSeed, null))
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES)
  const [notificationMandatory, setNotificationMandatory] = useState(null)
  const [contactPrivacy, setContactPrivacy] = useState({ grants: [], recentAccesses: [] })
  const [notificationError, setNotificationError] = useState(null)
  const [notificationSuccess, setNotificationSuccess] = useState('')
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [requests, setRequests] = useState([])
  const [feedbackReports, setFeedbackReports] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingPrimaryIdentity, setIsSavingPrimaryIdentity] = useState('')
  const [identityPreferenceError, setIdentityPreferenceError] = useState(null)
  const [feedbackError, setFeedbackError] = useState(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [emailActionError, setEmailActionError] = useState(null)
  const [form, setForm] = useState(() => ({
    seasonId: seasonId || SEASONS[0]?.id || 'FCA26',
    identityType: 'PLAYER',
    teamText: '',
    participantName: '',
    battleTag: '',
    note: ''
  }))
  const [feedbackForm, setFeedbackForm] = useState(() => ({
    seasonId: seasonId || SEASONS[0]?.id || 'FCA26',
    targetType: 'PLAYER',
    targetId: '',
    issueType: '',
    description: ''
  }))

  useEffect(() => {
    setForm(current => ({
      ...current,
      seasonId: seasonId || current.seasonId
    }))
    setFeedbackForm(current => ({
      ...current,
      seasonId: seasonId || current.seasonId
    }))
  }, [seasonId])

  useEffect(() => {
    let alive = true
    if (!profileUserSeed.id) return undefined

    setIsLoading(true)
    setError(null)

    Promise.allSettled([
      fetchUserProfile(),
      fetchVerificationRequests(),
      fetchUserFeedback(),
      seasonId ? fetchMySpaceContext(seasonId) : Promise.resolve(null),
      fetchNotificationPreferences(),
      fetchContactPrivacy(seasonId || '')
    ])
      .then(results => {
        if (!alive) return
        const [profileResult, requestsResult, feedbackResult, spaceResult, notificationResult, privacyResult] = results
        const criticalFailure = [profileResult, requestsResult].find(result => result.status === 'rejected')
        if (criticalFailure) throw criticalFailure.reason
        const nextProfile = profileResult.value
        const nextRequests = requestsResult.value
        setProfile(nextProfile)
        setProfileForm(createProfileForm(profileUserSeed, nextProfile))
        setRequests(nextRequests)
        if (feedbackResult.status === 'fulfilled') setFeedbackReports(feedbackResult.value)
        else setFeedbackError(feedbackResult.reason)
        if (spaceResult.status === 'fulfilled') setSpaceContext(spaceResult.value)
        if (notificationResult.status === 'fulfilled') {
          setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(notificationResult.value.preference || {}) })
          setNotificationMandatory(notificationResult.value.mandatory)
        } else {
          setNotificationError(notificationResult.reason)
        }
        if (privacyResult.status === 'fulfilled') setContactPrivacy(privacyResult.value)
        Promise.resolve(onAccountChange?.()).catch(() => {})
      })
      .catch(err => {
        if (!alive) return
        setError(err)
      })
      .finally(() => {
        if (!alive) return
        setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [onAccountChange, profileUserSeed, seasonId])

  const verification = useMemo(
    () => getVerificationSummary(profile, requests, locale, identities),
    [identities, locale, profile, requests]
  )
  const onboardingSteps = useMemo(
    () => getOnboardingSteps({ user, profile, identities, verification, spaceContext, locale }),
    [identities, locale, profile, spaceContext, user, verification]
  )
  const completedOnboardingSteps = onboardingSteps.filter(step => step.complete).length
  const currentOnboardingStep = onboardingSteps.find(step => !step.complete) || null
  const hasActiveIdentity = identities.some(identity => (
    identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase())
  ))
  const isViewerMode = !hasActiveIdentity && !requests.some(request => request.status === 'PENDING')
  const regionLabel = profile?.regionCode
    ? getLocalizedOption(getRegionOption(profile.regionCode), locale)
    : '-'
  const qqContact = getProfileContact(profile, 'QQ')
  const discordContact = getProfileContact(profile, 'DISCORD')
  const selectedIdentity = getIdentityOption(form.identityType)
  const teamOptions = useMemo(() => getTeamOptions(teams), [teams])
  const requiresTeam = TEAM_IDENTITY_TYPES.has(form.identityType)
  const requiresBattleTag = BATTLETAG_REQUIRED_TYPES.has(form.identityType)
  const isStaffRequest = STAFF_IDENTITY_TYPES.has(form.identityType)
  const hasLongTermStaffIdentity = isStaffRequest && identities.some(identity => (
    String(identity?.identityType || identity?.type || '').toUpperCase() === form.identityType
    && (identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase()))
  ))
  const staffParticipation = isStaffRequest && String(spaceContext?.seasonId || '').toUpperCase() === String(form.seasonId || '').toUpperCase()
    ? (spaceContext?.staffContext?.participations || []).find(item => item.role === form.identityType) || null
    : null
  const staffRequestBlocked = ['PENDING', 'INVITED', 'ACTIVE'].includes(staffParticipation?.status)
  const participantLabel = form.identityType === 'PLAYER'
    ? ui(locale, '选手昵称 / 参赛名', 'Player name')
    : form.identityType === 'MANAGER'
      ? ui(locale, '经理昵称 / 参赛名', 'Manager name')
      : form.identityType === 'COACH'
        ? ui(locale, '教练昵称 / 参赛名', 'Coach name')
        : ui(locale, '昵称 / 显示名', 'Name')
  const emailVerified = Boolean(user?.emailVerified)
  const isSendingEmail = emailVerificationState?.status === 'SENDING'

  const handleEmailVerificationRequest = async () => {
    setEmailActionError(null)
    try {
      await onRequestEmailVerification?.()
    } catch (err) {
      setEmailActionError(err)
    }
  }

  const handleProfileFieldChange = (field, value) => {
    setProfileForm(current => ({ ...current, [field]: value }))
    setProfileError(null)
    setProfileSuccess('')
  }

  const handleProfileSubmit = async event => {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess('')
    setIsSavingProfile(true)
    try {
      const result = await updateUserProfile({
        displayName: profileForm.displayName.trim(),
        nickname: profileForm.displayName.trim(),
        avatarUrl: profileForm.avatarUrl.trim() || null,
        regionCode: profileForm.regionCode,
        qqContact: profileForm.qqContact.trim() || null,
        discordContact: profileForm.discordContact.trim() || null,
        bio: profileForm.bio.trim() || null
      })
      const nextProfile = result.profile || await fetchUserProfile()
      setProfile(nextProfile)
      setProfileForm(createProfileForm(result.user || user, nextProfile))
      if (seasonId) setSpaceContext(await fetchMySpaceContext(seasonId).catch(() => spaceContext))
      await Promise.resolve(onAccountChange?.()).catch(() => {})
      setProfileSuccess(ui(locale, '账号资料已更新；赛事选手名和正式阵容不会随之改变。', 'Profile updated. Official player names and rosters were not changed.'))
    } catch (err) {
      setProfileError(err)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleNotificationChange = (field, value) => {
    setNotificationPreferences(current => ({ ...current, [field]: value }))
    setNotificationError(null)
    setNotificationSuccess('')
  }

  const handleNotificationSubmit = async event => {
    event.preventDefault()
    setNotificationError(null)
    setNotificationSuccess('')
    setIsSavingNotifications(true)
    try {
      const result = await updateNotificationPreferences({
        emailEnabled: Boolean(notificationPreferences.emailEnabled),
        operationsEmail: Boolean(notificationPreferences.operationsEmail),
        matchReminderInApp: Boolean(notificationPreferences.matchReminderInApp),
        matchReminderEmail: Boolean(notificationPreferences.matchReminderEmail),
        announcementInApp: Boolean(notificationPreferences.announcementInApp),
        announcementEmail: Boolean(notificationPreferences.announcementEmail),
        predictionInApp: Boolean(notificationPreferences.predictionInApp),
        predictionEmail: Boolean(notificationPreferences.predictionEmail)
      })
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(result.preference || {}) })
      setNotificationMandatory(result.mandatory)
      setNotificationSuccess(ui(locale, '通知偏好已保存；将影响之后生成及尚未发送的可选通知。', 'Preferences saved. They apply to future and still-pending optional notifications.'))
    } catch (err) {
      setNotificationError(err)
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const handleFieldChange = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }))
    setSubmitError(null)
    setSubmitSuccess('')
  }

  const handlePrimaryIdentityChange = async identityType => {
    setIdentityPreferenceError(null)
    setIsSavingPrimaryIdentity(identityType)
    try {
      await onPrimaryIdentityChange?.(identityType)
    } catch (err) {
      setIdentityPreferenceError(err)
    } finally {
      setIsSavingPrimaryIdentity('')
    }
  }

  const handleFeedbackFieldChange = (field, value) => {
    setFeedbackForm(current => ({
      ...current,
      [field]: value
    }))
    setFeedbackError(null)
    setFeedbackSuccess('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess('')
    setIsSubmitting(true)

    try {
      const request = await createVerificationRequest({
        seasonId: form.seasonId,
        identityType: form.identityType,
        targetType: selectedIdentity.targetType,
        targetId: form.participantName.trim(),
        teamId: requiresTeam ? form.teamText.trim() : undefined,
        battleTag: form.battleTag.trim() || undefined,
        note: form.note.trim() || undefined
      })

      if (request) {
        setRequests(current => [request, ...current.filter(item => item.id !== request.id)])
      } else {
        setRequests(await fetchVerificationRequests())
      }
      Promise.resolve(onAccountChange?.()).catch(() => {})
      setSubmitSuccess(isStaffRequest
        ? ui(locale, '本届工作人员申请已提交，等待 System 审核。', 'Event staff application submitted for System review.')
        : ui(locale, '认证申请已提交，等待后台审核。', 'Verification request submitted.'))
      setForm(current => ({
        ...current,
        teamText: '',
        participantName: '',
        battleTag: '',
        note: ''
      }))
    } catch (err) {
      setSubmitError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFeedbackSubmit = async event => {
    event.preventDefault()
    setFeedbackError(null)
    setFeedbackSuccess('')
    setIsSubmittingFeedback(true)

    try {
      const feedback = await createUserFeedback({
        seasonId: feedbackForm.seasonId,
        targetType: feedbackForm.targetType,
        targetId: feedbackForm.targetId.trim() || undefined,
        issueType: feedbackForm.issueType.trim(),
        description: feedbackForm.description.trim()
      })

      if (feedback) {
        setFeedbackReports(current => [feedback, ...current.filter(item => item.id !== feedback.id)])
      } else {
        setFeedbackReports(await fetchUserFeedback())
      }
      setFeedbackSuccess(ui(locale, '数据反馈已提交，后台处理后会在这里显示状态。', 'Feedback submitted. Status updates will appear here.'))
      setFeedbackForm(current => ({
        ...current,
        targetId: '',
        issueType: '',
        description: ''
      }))
    } catch (err) {
      setFeedbackError(err)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <div className={styles.accountCenter}>
      <section className={styles.profileCard}>
        <span className={styles.accountAvatar} aria-hidden="true">
          {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : getInitial(user)}
        </span>
        <div className={styles.profileMain}>
          <div className={styles.profileTitle}>
            <strong>{user?.displayName || user?.username || user?.email}</strong>
            <em className={`${styles.statusBadge} ${styles[`status${verification.tone}`] || ''}`}>
              {verification.label}
            </em>
          </div>
          <span>{user?.username ? `@${user.username} · ` : ''}{user?.email}</span>
          <p>{verification.detail}</p>
          {verification.facts?.length > 0 ? (
            <dl className={styles.identityFacts}>
              {verification.facts.map(item => (
                <div key={`${item.label}:${item.value}`}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {!emailVerified ? (
        <section className={styles.emailVerificationPanel} data-status={emailVerificationState?.status || 'IDLE'}>
          <div>
            <strong>{ui(locale, '验证邮箱后启用赛事功能', 'Verify email to unlock event features')}</strong>
            <span>{ui(locale, '身份认证、赛事报名和竞猜需要已验证邮箱。', 'Identity requests, registration, and predictions require a verified email.')}</span>
          </div>
          <button type="button" onClick={handleEmailVerificationRequest} disabled={isSendingEmail}>
            {isSendingEmail
              ? ui(locale, '发送中…', 'Sending...')
              : emailVerificationState?.status === 'SENT'
                ? ui(locale, '重新发送验证邮件', 'Resend verification email')
                : ui(locale, '发送验证邮件', 'Send verification email')}
          </button>
          {emailVerificationState?.status === 'SENT' ? (
            <p className={styles.accountSuccess}>{ui(locale, '验证邮件已发送，请检查邮箱。', 'Verification email sent. Check your inbox.')}</p>
          ) : null}
          {emailVerificationState?.result?.debugUrl ? (
            <a href={emailVerificationState.result.debugUrl}>{ui(locale, '打开本地验证链接', 'Open local verification link')}</a>
          ) : null}
          {emailActionError || emailVerificationState?.error ? (
            <p className={styles.accountError}>{getErrorText(emailActionError || emailVerificationState.error, locale)}</p>
          ) : null}
        </section>
      ) : emailVerificationState?.status === 'VERIFIED' ? (
        <div className={styles.accountSuccess}>{ui(locale, '邮箱验证完成，赛事账号功能已启用。', 'Email verified. Event account features are now enabled.')}</div>
      ) : null}

      {isLoading ? (
        <div className={styles.accountNotice}>{ui(locale, '正在同步账号资料…', 'Loading account profile...')}</div>
      ) : error ? (
        <div className={styles.accountError}>{getErrorText(error, locale)}</div>
      ) : (
        <>
          <section className={styles.onboardingPanel}>
            <div className={styles.onboardingHead}>
              <div>
                <span>ACCOUNT START</span>
                <strong>{isViewerMode ? ui(locale, '普通观众账号进度', 'Viewer account progress') : ui(locale, '赛事账号进度', 'Event account progress')}</strong>
                <p>{isViewerMode
                  ? ui(locale, '普通观众不需要认证赛事身份；身份申请只在参赛或承担赛事职责时使用。', 'Viewer accounts do not need an event identity. Apply only when competing or working an event role.')
                  : ui(locale, '从账号注册走到具备本届赛事关系。', 'Move from account creation to an active event relationship.')}</p>
              </div>
              <em>{completedOnboardingSteps} / {onboardingSteps.length}</em>
            </div>
            <div className={styles.progressTrack}><i style={{ width: `${completedOnboardingSteps / onboardingSteps.length * 100}%` }} /></div>
            <div className={styles.onboardingSteps}>
              {onboardingSteps.map((step, index) => (
                <article key={step.key} data-complete={step.complete ? 'true' : 'false'} data-current={currentOnboardingStep?.key === step.key ? 'true' : 'false'}>
                  <span>{step.complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{step.label}</strong><small>{step.detail}</small></div>
                </article>
              ))}
            </div>
            {currentOnboardingStep ? (
              currentOnboardingStep.tab ? (
                <button type="button" className={styles.onboardingAction} onClick={() => setActiveTab(currentOnboardingStep.tab)}>
                  {ui(locale, `继续：${currentOnboardingStep.label}`, `Continue: ${currentOnboardingStep.label}`)} →
                </button>
              ) : currentOnboardingStep.key === 'email' ? (
                <button type="button" className={styles.onboardingAction} onClick={handleEmailVerificationRequest} disabled={isSendingEmail}>
                  {ui(locale, '发送邮箱验证邮件', 'Send verification email')} →
                </button>
              ) : (
                <a className={styles.onboardingAction} href={currentOnboardingStep.href}>
                  {ui(locale, `继续：${currentOnboardingStep.label}`, `Continue: ${currentOnboardingStep.label}`)} →
                </a>
              )
            ) : <p className={styles.onboardingComplete}>{isViewerMode
              ? ui(locale, '普通观众账号已经可以使用关注、竞猜和赛事通知；身份认证是可选项。', 'Your viewer account can use following, predictions, and event notices. Identity verification is optional.')
              : ui(locale, '账号已经具备本届赛事关系。', 'Your account is ready for this event.')}</p>}
          </section>

          <section className={styles.detailGrid} aria-label={ui(locale, '账号资料', 'Profile')}>
            <div>
              <span>{ui(locale, '国家 / 地区', 'Country / Region')}</span>
              <strong>{regionLabel}</strong>
            </div>
            <div>
              <span>QQ</span>
              <strong>{qqContact || '-'}</strong>
            </div>
            <div>
              <span>Discord</span>
              <strong>{discordContact || '-'}</strong>
            </div>
          </section>

          <div className={styles.centerTabs} role="tablist" aria-label={ui(locale, '账号功能', 'Account tools')}>
            <button
              type="button"
              className={`${styles.centerTab} ${activeTab === 'profile' ? styles.centerTabActive : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              {ui(locale, '账号资料', 'Profile')}
            </button>
            <button
              type="button"
              className={`${styles.centerTab} ${activeTab === 'verification' ? styles.centerTabActive : ''}`}
              onClick={() => setActiveTab('verification')}
            >
              {ui(locale, '身份认证', 'Verification')}
            </button>
            <button
              type="button"
              className={`${styles.centerTab} ${activeTab === 'feedback' ? styles.centerTabActive : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              {ui(locale, '数据反馈', 'Feedback')}
            </button>
            <button
              type="button"
              className={`${styles.centerTab} ${activeTab === 'notifications' ? styles.centerTabActive : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              {ui(locale, '通知偏好', 'Notifications')}
            </button>
            <button
              type="button"
              className={`${styles.centerTab} ${activeTab === 'privacy' ? styles.centerTabActive : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              {ui(locale, '隐私授权', 'Privacy')}
            </button>
          </div>

          {activeTab === 'profile' ? (
            <section className={styles.verifyPanel}>
              <div className={styles.sectionHeader}>
                <h3>{ui(locale, '编辑账号资料', 'Edit account profile')}</h3>
                <span>{ui(locale, '联系方式默认隐藏', 'Contacts private by default')}</span>
              </div>
              <div className={styles.namePolicy}>
                <div><span>{ui(locale, '账号标识', 'Account handle')}</span><strong>@{user?.username || '-'}</strong><small>{ui(locale, '固定且唯一，用于识别账号。', 'Fixed and unique account identifier.')}</small></div>
                <div><span>{ui(locale, '赛事选手名', 'Official player name')}</span><strong>{ui(locale, '由身份与阵容管理', 'Managed by identity and roster')}</strong><small>{ui(locale, '修改普通资料不会改变历史比赛和正式名单。', 'Profile edits never rewrite match history or official rosters.')}</small></div>
              </div>
              <form className={styles.verifyForm} onSubmit={handleProfileSubmit}>
                <div className={styles.formGrid}>
                  <label>
                    <span>{ui(locale, '显示名称', 'Display name')}</span>
                    <input type="text" minLength={1} maxLength={40} value={profileForm.displayName} onChange={event => handleProfileFieldChange('displayName', event.target.value)} required />
                  </label>
                  <label>
                    <span>{ui(locale, '国家 / 地区', 'Country / Region')}</span>
                    <select value={profileForm.regionCode} onChange={event => handleProfileFieldChange('regionCode', event.target.value)} required>
                      {REGION_GROUPS.map(group => (
                        <optgroup key={group.value} label={getLocalizedOption(group, locale)}>
                          {group.options.map(option => <option key={option.value} value={option.value}>{getLocalizedOption(option, locale)}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={styles.fullField}>
                  <span>{ui(locale, '头像地址', 'Avatar URL')}</span>
                  <input type="url" maxLength={500} value={profileForm.avatarUrl} onChange={event => handleProfileFieldChange('avatarUrl', event.target.value)} placeholder="https://…" />
                </label>
                <div className={styles.formGrid}>
                  <label>
                    <span>QQ</span>
                    <input type="text" inputMode="numeric" maxLength={12} value={profileForm.qqContact} onChange={event => handleProfileFieldChange('qqContact', event.target.value)} />
                  </label>
                  <label>
                    <span>Discord</span>
                    <input type="text" maxLength={80} value={profileForm.discordContact} onChange={event => handleProfileFieldChange('discordContact', event.target.value)} />
                  </label>
                </div>
                <p className={styles.privacyNote}>{ui(locale, '至少保留一种联系方式。QQ 和 Discord 不会出现在公开主页，只有待处理流程中的 System 审核人员或本届队伍经理可以按需查看。', 'Keep at least one contact method. QQ and Discord are never public; only System reviewers handling an active request or your current event team manager may reveal them when needed.')}</p>
                <label className={styles.fullField}>
                  <span>{ui(locale, '个人简介', 'Bio')}</span>
                  <textarea maxLength={280} rows={4} value={profileForm.bio} onChange={event => handleProfileFieldChange('bio', event.target.value)} placeholder={ui(locale, '可选；不会替代赛事报名信息。', 'Optional; does not replace event registration data.')} />
                </label>
                {profileError ? <p className={styles.accountError}>{getErrorText(profileError, locale)}</p> : null}
                {profileSuccess ? <p className={styles.accountSuccess}>{profileSuccess}</p> : null}
                <button type="submit" className={styles.primaryButton} disabled={isSavingProfile}>{isSavingProfile ? ui(locale, '保存中…', 'Saving...') : ui(locale, '保存账号资料', 'Save profile')}</button>
              </form>
            </section>
          ) : null}

          {activeTab === 'notifications' ? (
            <section className={styles.verifyPanel}>
              <div className={styles.sectionHeader}>
                <h3>{ui(locale, '通知偏好', 'Notification preferences')}</h3>
                <span>{ui(locale, '未来通知生效', 'Applies to future notices')}</span>
              </div>
              <form className={styles.notificationForm} onSubmit={handleNotificationSubmit}>
                <label className={styles.emailMaster}>
                  <div><strong>{ui(locale, '允许发送可选邮件', 'Allow optional email')}</strong><small>{ui(locale, '关闭后，普通赛程、提醒、公告和竞猜结果不再发送邮件。', 'Disable optional schedule, reminder, announcement, and prediction emails.')}</small></div>
                  <input type="checkbox" checked={Boolean(notificationPreferences.emailEnabled)} onChange={event => handleNotificationChange('emailEnabled', event.target.checked)} />
                  <i aria-hidden="true" />
                </label>

                <div className={styles.preferenceLegend}><span>{ui(locale, '通知类型', 'Notification type')}</span><em>{ui(locale, '站内', 'In-app')}</em><em>{ui(locale, '邮件', 'Email')}</em></div>
                <div className={styles.preferenceRows}>
                  <article>
                    <div><strong>{ui(locale, '赛事流程与待办', 'Event operations')}</strong><small>{ui(locale, '报名、阵容、赛程确认、申诉及审核结果', 'Registration, roster, schedule, appeal, and review results')}</small></div>
                    <label title={ui(locale, '核心赛事流程固定保留站内记录', 'Core event operations always keep an in-app record')}><input type="checkbox" checked readOnly disabled /><span>{ui(locale, '固定', 'Required')}</span></label>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.operationsEmail)} disabled={!notificationPreferences.emailEnabled} onChange={event => handleNotificationChange('operationsEmail', event.target.checked)} /><span>{ui(locale, '邮件', 'Email')}</span></label>
                  </article>
                  <article>
                    <div><strong>{ui(locale, '比赛提醒', 'Match reminders')}</strong><small>{ui(locale, '赛前 3 小时、1 小时和比赛房开放', '3 hours, 1 hour, and match-room opening')}</small></div>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.matchReminderInApp)} onChange={event => handleNotificationChange('matchReminderInApp', event.target.checked)} /><span>{ui(locale, '站内', 'In-app')}</span></label>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.matchReminderEmail)} disabled={!notificationPreferences.emailEnabled} onChange={event => handleNotificationChange('matchReminderEmail', event.target.checked)} /><span>{ui(locale, '邮件', 'Email')}</span></label>
                  </article>
                  <article>
                    <div><strong>{ui(locale, '赛事公告', 'Event announcements')}</strong><small>{ui(locale, '普通和重要公告；紧急或必须确认公告除外', 'Normal and important announcements; urgent or acknowledgement-required notices are mandatory')}</small></div>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.announcementInApp)} onChange={event => handleNotificationChange('announcementInApp', event.target.checked)} /><span>{ui(locale, '站内', 'In-app')}</span></label>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.announcementEmail)} disabled={!notificationPreferences.emailEnabled} onChange={event => handleNotificationChange('announcementEmail', event.target.checked)} /><span>{ui(locale, '邮件', 'Email')}</span></label>
                  </article>
                  <article>
                    <div><strong>{ui(locale, '竞猜结果', 'Prediction results')}</strong><small>{ui(locale, '结算得分、冲正和排行相关结果', 'Settlement points, reversals, and ranking results')}</small></div>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.predictionInApp)} onChange={event => handleNotificationChange('predictionInApp', event.target.checked)} /><span>{ui(locale, '站内', 'In-app')}</span></label>
                    <label><input type="checkbox" checked={Boolean(notificationPreferences.predictionEmail)} disabled={!notificationPreferences.emailEnabled} onChange={event => handleNotificationChange('predictionEmail', event.target.checked)} /><span>{ui(locale, '邮件', 'Email')}</span></label>
                  </article>
                </div>
                <p className={styles.mandatoryNotice}>{notificationMandatory?.urgentAnnouncements === false ? '' : ui(locale, '安全和必达规则：核心赛事待办始终保留站内记录；紧急公告和要求确认的公告始终通过站内与邮件送达。', 'Mandatory delivery: core event tasks always keep an in-app record; urgent and acknowledgement-required announcements always use both in-app and email.')}</p>
                {notificationError ? <p className={styles.accountError}>{getErrorText(notificationError, locale)}</p> : null}
                {notificationSuccess ? <p className={styles.accountSuccess}>{notificationSuccess}</p> : null}
                <button type="submit" className={styles.primaryButton} disabled={isSavingNotifications}>{isSavingNotifications ? ui(locale, '保存中…', 'Saving...') : ui(locale, '保存通知偏好', 'Save preferences')}</button>
              </form>
            </section>
          ) : null}

          {activeTab === 'privacy' ? (
            <section className={styles.verifyPanel}>
              <div className={styles.sectionHeader}>
                <h3>{ui(locale, '联系方式授权与访问记录', 'Contact grants and access history')}</h3>
                <span>{ui(locale, '联系方式不会公开展示', 'Contacts are never public')}</span>
              </div>
              <p className={styles.privacyNote}>{ui(locale, '只有当前申请对应的经理、仍与本届队伍有关联的经理，以及处理你认证申请的 System 管理员可以主动查看。每次实际查看都会留下记录。', 'Only the manager for an active application or event team relationship, and System admins reviewing your identity request, can reveal these contacts. Every reveal is logged.')}</p>
              <div className={styles.privacyColumns}>
                <section>
                  <h4>{ui(locale, '当前有效授权', 'Active grants')}</h4>
                  <div className={styles.privacyRecords}>
                    {contactPrivacy.grants.length ? contactPrivacy.grants.map(grant => (
                      <article key={grant.id}>
                        <div><strong>{getPrivacyGrantLabel(grant, locale)}</strong><em>{grant.seasonId || '-'}</em></div>
                        <span>{grant.teamOrganization ? `${grant.teamOrganization.shortName || grant.teamOrganization.name} · ` : ''}{grant.authorizedParty?.displayName || ui(locale, '赛事管理方', 'Event administration')}</span>
                        <small>{getPrivacyEndLabel(grant.endsWhen, locale)}</small>
                      </article>
                    )) : <div className={styles.emptyState}>{ui(locale, '当前没有任何角色获得你的联系方式查看权。', 'No role currently has permission to reveal your contacts.')}</div>}
                  </div>
                </section>
                <section>
                  <h4>{ui(locale, '最近查看记录', 'Recent access history')}</h4>
                  <div className={styles.privacyRecords}>
                    {contactPrivacy.recentAccesses.length ? contactPrivacy.recentAccesses.map(access => (
                      <article key={access.id}>
                        <div><strong>{access.viewer?.displayName || ui(locale, 'System 管理员', 'System administrator')}</strong><em>{formatDateTime(access.accessedAt, locale)}</em></div>
                        <span>{getAccessPurposeLabel(access.context?.purpose, locale)}{access.context?.teamName ? ` · ${access.context.teamName}` : ''}</span>
                        <small>{ui(locale, '查看字段', 'Fields')}: {(access.context?.fields || []).join(' / ') || '-'}</small>
                      </article>
                    )) : <div className={styles.emptyState}>{ui(locale, '暂时没有联系方式查看记录。', 'No contact access has been recorded yet.')}</div>}
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {activeTab === 'verification' ? (
            <>
              {identities.length > 0 ? (
                <section className={styles.identityPanel}>
                  <div className={styles.sectionHeader}>
                    <h3>{ui(locale, '长期基础身份', 'Long-term identities')}</h3>
                    <span>{identities.length}</span>
                  </div>
                  <div className={styles.identityList}>
                    {identities.map(identity => {
                      const identityType = String(identity.identityType || identity.type || '').toUpperCase()
                      const isActive = Boolean(identity.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity.status || '').toUpperCase()))
                      const isPrimary = identityType === String(primaryIdentity?.identityType || primaryIdentity?.type || '').toUpperCase()
                      return (
                        <article key={identity.id || identity.identityType} data-primary={isPrimary ? 'true' : 'false'}>
                          <strong>{getIdentityLabel(identityType, locale)}</strong>
                          <span>{identity.battleTag || identity.targetId || ui(locale, '长期有效', 'Long-term')}</span>
                          <em data-status={identity.status}>{identity.isSuspended ? ui(locale, '已暂停', 'Suspended') : identity.isRevoked ? ui(locale, '已撤销', 'Revoked') : identity.isVerified ? ui(locale, '已认证', 'Verified') : identity.status}</em>
                          {isActive ? <button type="button" className={styles.identityPrimaryAction} disabled={isPrimary || Boolean(isSavingPrimaryIdentity)} onClick={() => handlePrimaryIdentityChange(identityType)}>{isPrimary ? ui(locale, '默认身份', 'Default') : isSavingPrimaryIdentity === identityType ? ui(locale, '切换中…', 'Switching...') : ui(locale, '设为默认', 'Set default')}</button> : null}
                          {identity.statusReason ? <small>{identity.statusReason}</small> : null}
                        </article>
                      )
                    })}
                  </div>
                  {identityPreferenceError ? <p className={styles.accountError}>{getErrorText(identityPreferenceError, locale)}</p> : null}
                  {identities.filter(identity => identity?.isVerified).length > 1 ? <p className={styles.privacyNote}>{ui(locale, '默认身份决定首页和“我的关注”优先展示哪个工作视角，不会移除其他身份或改变其权限。', 'The default identity controls the preferred home and Following view. It does not remove other identities or change their permissions.')}</p> : null}
                </section>
              ) : null}

              <section className={styles.verifyPanel}>
                <div className={styles.sectionHeader}>
                  <h3>{isStaffRequest
                    ? ui(locale, hasLongTermStaffIdentity ? '本届工作人员申请' : '工作人员身份与本届申请', hasLongTermStaffIdentity ? 'Event staff application' : 'Staff identity and event application')
                    : ui(locale, '身份认证', 'Identity Verification')}</h3>
                  <span>{isStaffRequest ? ui(locale, '每届确认', 'Per event') : ui(locale, '人工审核', 'Manual review')}</span>
                </div>

                <form className={styles.verifyForm} onSubmit={handleSubmit}>
                  <div className={styles.formGrid}>
                    <label>
                      <span>{ui(locale, '赛季', 'Season')}</span>
                      <select value={form.seasonId} onChange={event => handleFieldChange('seasonId', event.target.value)}>
                        {SEASONS.map(season => (
                          <option key={season.id} value={season.id}>
                            {getSeasonLabel(season, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{ui(locale, '身份', 'Identity')}</span>
                      <select value={form.identityType} onChange={event => handleFieldChange('identityType', event.target.value)}>
                        {IDENTITY_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {locale === 'en-US' ? option.en : option.zh}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {requiresTeam ? (
                    <label className={styles.fullField}>
                      <span>{ui(locale, '队伍名称', 'Team')}</span>
                      <input
                        type="text"
                        list="fries-cup-verification-team-options"
                        value={form.teamText}
                        onChange={event => handleFieldChange('teamText', event.target.value)}
                        placeholder={ui(locale, '选择或输入队伍名称', 'Select or enter team name')}
                        required
                      />
                      {teamOptions.length > 0 ? (
                        <datalist id="fries-cup-verification-team-options">
                          {teamOptions.map(option => (
                            <option key={option.value} value={option.value} label={option.label || undefined} />
                          ))}
                        </datalist>
                      ) : null}
                    </label>
                  ) : null}

                  <label className={styles.fullField}>
                    <span>{participantLabel}</span>
                    <input
                      type="text"
                      value={form.participantName}
                      onChange={event => handleFieldChange('participantName', event.target.value)}
                      required
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>{requiresBattleTag ? 'BattleTag' : ui(locale, 'BattleTag（可选）', 'BattleTag (optional)')}</span>
                    <input
                      type="text"
                      value={form.battleTag}
                      onChange={event => handleFieldChange('battleTag', event.target.value)}
                      required={requiresBattleTag}
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>{ui(locale, '备注', 'Note')}</span>
                    <textarea
                      value={form.note}
                      onChange={event => handleFieldChange('note', event.target.value)}
                      rows={3}
                      placeholder={ui(locale, '可以补充队伍、职责、常用 ID 等便于审核的信息。', 'Add team, role, or ID details for review.')}
                    />
                  </label>

                  {isStaffRequest ? (
                    <p className={styles.accountNotice}>
                      {staffParticipation?.status === 'INVITED'
                        ? ui(locale, '你已经收到本届邀请，请到“我的空间”处理；接受后会自动激活长期身份并建立本届关系。', 'You already have an invitation for this event. Respond in My Space; accepting activates the long-term identity and this event relationship.')
                        : staffParticipation?.status === 'PENDING'
                          ? ui(locale, '本届申请正在由 System 审核。', 'This event application is under System review.')
                          : staffParticipation?.status === 'ACTIVE'
                            ? ui(locale, '你的本届工作人员关系已经生效。长期身份会保留，但下一届仍需重新申请或接受邀请。', 'Your event staff relationship is active. The long-term identity remains, but each future event requires a new application or invitation.')
                            : hasLongTermStaffIdentity
                              ? ui(locale, '你的长期身份已经认证；这次只确认所选赛事的工作人员关系。', 'Your long-term identity is already verified; this request only confirms the selected event relationship.')
                              : ui(locale, '首次审核通过后会同时建立长期身份和所选赛事的工作人员关系；下一届只需重新确认赛事关系。', 'First approval creates both the long-term identity and the selected event relationship. Future events only require relationship confirmation.')}
                    </p>
                  ) : null}

                  {submitError ? <p className={styles.accountError}>{getErrorText(submitError, locale)}</p> : null}
                  {submitSuccess ? <p className={styles.accountSuccess}>{submitSuccess}</p> : null}

                  {!emailVerified ? (
                    <p className={styles.accountNotice}>{ui(locale, '完成邮箱验证后才能提交身份认证。', 'Verify your email before submitting an identity request.')}</p>
                  ) : null}

                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting || !emailVerified || staffRequestBlocked}>
                    {isSubmitting
                      ? ui(locale, '提交中', 'Submitting')
                      : staffParticipation?.status === 'INVITED'
                        ? ui(locale, '请先处理本届邀请', 'Respond to invitation first')
                        : staffParticipation?.status === 'PENDING'
                          ? ui(locale, '本届申请审核中', 'Application under review')
                          : staffParticipation?.status === 'ACTIVE'
                            ? ui(locale, '本届关系已生效', 'Event relationship active')
                            : isStaffRequest
                              ? ui(locale, hasLongTermStaffIdentity ? '提交本届申请' : '提交身份与本届申请', hasLongTermStaffIdentity ? 'Submit event application' : 'Submit identity and event application')
                              : ui(locale, '提交认证申请', 'Submit Request')}
                  </button>
                </form>
              </section>

              <section className={styles.requestPanel}>
                <div className={styles.sectionHeader}>
                  <h3>{ui(locale, '申请记录', 'Requests')}</h3>
                  <span>{requests.length}</span>
                </div>
                {requests.length === 0 ? (
                  <div className={styles.emptyState}>{ui(locale, '还没有认证申请。', 'No verification requests yet.')}</div>
                ) : (
                  <div className={styles.requestList}>
                    {requests.slice(0, 5).map(request => (
                      <article className={styles.requestItem} key={request.id}>
                        <div>
                          <strong>{getIdentityLabel(request.identityType, locale)}</strong>
                          <span>{getRequestTarget(request)}</span>
                        </div>
                        <em className={`${styles.statusBadge} ${styles[`request${request.status}`] || ''}`}>
                          {getStatusLabel(request.status, locale)}
                        </em>
                        <dl className={styles.requestMeta}>
                          {getRequestMeta(request, locale).map(item => (
                            <div key={`${request.id}:${item.label}:${item.value}`}>
                              <dt>{item.label}</dt>
                              <dd>{item.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <time>{formatDateTime(request.createdAt, locale)}</time>
                        {request.adminNote ? (
                          <p>
                            <strong>{request.status === 'REJECTED' ? ui(locale, '拒绝原因', 'Rejection reason') : ui(locale, '后台备注', 'Admin note')}</strong>
                            <span>{request.adminNote}</span>
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : activeTab === 'feedback' ? (
            <>
              <section className={styles.verifyPanel}>
                <div className={styles.sectionHeader}>
                  <h3>{ui(locale, '数据反馈', 'Data Feedback')}</h3>
                  <span>{ui(locale, '后台处理', 'Admin queue')}</span>
                </div>

                <form className={styles.verifyForm} onSubmit={handleFeedbackSubmit}>
                  <div className={styles.formGrid}>
                    <label>
                      <span>{ui(locale, '赛季', 'Season')}</span>
                      <select value={feedbackForm.seasonId} onChange={event => handleFeedbackFieldChange('seasonId', event.target.value)}>
                        {SEASONS.map(season => (
                          <option key={season.id} value={season.id}>
                            {getSeasonLabel(season, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{ui(locale, '目标类型', 'Target')}</span>
                      <select value={feedbackForm.targetType} onChange={event => handleFeedbackFieldChange('targetType', event.target.value)}>
                        {FEEDBACK_TARGET_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {locale === 'en-US' ? option.en : option.zh}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className={styles.fullField}>
                    <span>{ui(locale, '目标名称 / ID', 'Target name / ID')}</span>
                    <input
                      type="text"
                      value={feedbackForm.targetId}
                      onChange={event => handleFeedbackFieldChange('targetId', event.target.value)}
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>{ui(locale, '问题类型', 'Issue type')}</span>
                    <input
                      type="text"
                      value={feedbackForm.issueType}
                      onChange={event => handleFeedbackFieldChange('issueType', event.target.value)}
                      placeholder={ui(locale, '例如：数据错误 / 队伍信息 / 比赛结果', 'Example: stats error / team info / match result')}
                      required
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>{ui(locale, '反馈内容', 'Description')}</span>
                    <textarea
                      value={feedbackForm.description}
                      onChange={event => handleFeedbackFieldChange('description', event.target.value)}
                      rows={4}
                      minLength={5}
                      maxLength={1000}
                      placeholder={ui(locale, '请写清楚哪里不对，以及你认为正确的信息。', 'Describe what is wrong and the correct information.')}
                      required
                    />
                  </label>

                  {feedbackError ? <p className={styles.accountError}>{getErrorText(feedbackError, locale)}</p> : null}
                  {feedbackSuccess ? <p className={styles.accountSuccess}>{feedbackSuccess}</p> : null}

                  <button type="submit" className={styles.primaryButton} disabled={isSubmittingFeedback}>
                    {isSubmittingFeedback ? ui(locale, '提交中', 'Submitting') : ui(locale, '提交数据反馈', 'Submit Feedback')}
                  </button>
                </form>
              </section>

              <section className={styles.requestPanel}>
                <div className={styles.sectionHeader}>
                  <h3>{ui(locale, '反馈记录', 'Feedback History')}</h3>
                  <span>{feedbackReports.length}</span>
                </div>
                {feedbackReports.length === 0 ? (
                  <div className={styles.emptyState}>{ui(locale, '还没有数据反馈。', 'No feedback yet.')}</div>
                ) : (
                  <div className={styles.requestList}>
                    {feedbackReports.slice(0, 5).map(report => (
                      <article className={styles.requestItem} key={report.id}>
                        <div>
                          <strong>{report.issueType}</strong>
                          <span>{getFeedbackTargetLabel(report.targetType, locale)} / {report.targetId || '-'}</span>
                        </div>
                        <em className={`${styles.statusBadge} ${styles[`feedback${report.status}`] || ''}`}>
                          {getFeedbackStatusLabel(report.status, locale)}
                        </em>
                        <time>{formatDateTime(report.createdAt, locale)}</time>
                        {report.adminReply ? <p>{report.adminReply}</p> : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </>
      )}

      <button type="button" className={styles.logoutButton} onClick={onLogout}>
        {ui(locale, '退出登录', 'Sign Out')}
      </button>
    </div>
  )
}
