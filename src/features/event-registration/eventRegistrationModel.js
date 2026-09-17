const VERIFIED_IDENTITY_STATUSES = new Set(['ACTIVE', 'APPROVED'])

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

function activityTime(item) {
  return item.reviewedAt || item.acceptedAt || item.rejectedAt || item.updatedAt || item.createdAt || ''
}

function newestFirst(left, right) {
  const leftTime = Date.parse(activityTime(left)) || 0
  const rightTime = Date.parse(activityTime(right)) || 0
  return rightTime - leftTime
}

export function hasVerifiedIdentity(identities, expectedType) {
  const wantedType = normalized(expectedType)
  return (Array.isArray(identities) ? identities : []).some(identity => (
    normalized(identity?.identityType || identity?.type) === wantedType &&
    (identity?.isVerified === true || VERIFIED_IDENTITY_STATUSES.has(normalized(identity?.status)))
  ))
}

export function buildManagerApplicationQueue(applications) {
  const ordered = [...(Array.isArray(applications) ? applications : [])].sort(newestFirst)
  return {
    pending: ordered.filter(application => normalized(application?.status) === 'PENDING'),
    recent: ordered.filter(application => normalized(application?.status) !== 'PENDING').slice(0, 5)
  }
}

const MANAGER_REGISTRATION_LABELS = {
  DRAFT: '报名草稿',
  SUBMITTED: '报名审核中',
  APPROVED: '报名已通过',
  LOCKED: '赛事关系已锁定',
  REJECTED: '报名已退回',
  WITHDRAWN: '报名已撤回'
}

const MANAGER_ROSTER_LABELS = {
  DRAFT: '名单草稿',
  SUBMITTED: '名单审核中',
  LOCKED: '正式名单已锁定',
  REJECTED: '名单已退回'
}

export function buildManagerTeamOperationsView(item = {}) {
  const registration = item?.registration || null
  const roster = registration?.roster || null
  const registrationStatus = normalized(registration?.status)
  const rosterStatus = normalized(roster?.status)
  const candidateCount = (Array.isArray(roster?.members) ? roster.members : []).filter(member => normalized(member?.status) !== 'REMOVED').length
  const pendingApplicationCount = (Array.isArray(registration?.applications) ? registration.applications : []).filter(application => normalized(application?.status) === 'PENDING').length
  const registrationReady = ['APPROVED', 'LOCKED'].includes(registrationStatus)
  const rosterComplete = rosterStatus === 'LOCKED' || registrationStatus === 'LOCKED'
  const registrationLabel = MANAGER_REGISTRATION_LABELS[registrationStatus] || (registration ? '状态待同步' : '尚未报名')
  const rosterLabel = MANAGER_ROSTER_LABELS[rosterStatus] || (roster ? '状态待同步' : '尚未建立')

  let focusKey = 'registration'
  let headline = '提交本届队伍报名'
  let description = '选择本届招募方式和人员需求；长期队伍不会自动进入新的赛事届次。'
  let actionLabel = '填写本届报名'
  let tone = 'pending'

  if (registration && ['DRAFT', 'SUBMITTED'].includes(registrationStatus)) {
    const submitted = registrationStatus === 'SUBMITTED'
    headline = submitted ? '本届报名正在等待审核' : '继续完善本届报名'
    description = submitted ? '审核通过后会开放选手申请审核和正式名单流程。' : '完成招募方式与参赛需求后提交 System 审核。'
    actionLabel = submitted ? '查看报名状态' : '继续填写报名'
  } else if (registration && ['REJECTED', 'WITHDRAWN'].includes(registrationStatus)) {
    headline = '本届报名需要重新处理'
    description = '查看审核反馈并修改报名资料，重新提交后才能继续组建本届阵容。'
    actionLabel = '处理报名反馈'
    tone = 'attention'
  } else if (registrationReady) {
    if (pendingApplicationCount > 0) {
      focusKey = 'people'
      headline = `处理 ${pendingApplicationCount} 条选手申请`
      description = '先决定申请结果；通过的选手会进入候选阵容，再由你整理正式名单。'
      actionLabel = '前往申请审核'
    } else if (rosterStatus === 'REJECTED') {
      focusKey = 'roster'
      headline = '正式名单需要修改'
      description = '根据 System 意见调整本届注册选手、职责和队长后重新提交。'
      actionLabel = '修改正式名单'
      tone = 'attention'
    } else if (rosterStatus === 'SUBMITTED') {
      focusKey = 'roster'
      headline = '正式名单正在等待审核'
      description = '审核期间名单与招募已冻结；如需继续调整，可以先撤回提交。'
      actionLabel = '查看名单状态'
    } else if (rosterComplete) {
      focusKey = 'roster'
      headline = '本届报名和正式名单已经完成'
      description = '本届注册名单已同步到赛事数据；后续人员变更只能通过开放的名单变更窗口处理。'
      actionLabel = '查看锁定名单'
      tone = 'done'
    } else if (candidateCount < 5) {
      focusKey = 'people'
      headline = '继续建立候选阵容'
      description = `当前有 ${candidateCount} 名候选选手，正式名单至少需要 5 人。可以审核申请或邀请自由选手。`
      actionLabel = '管理候选选手'
    } else {
      focusKey = 'roster'
      headline = '配置并提交正式名单'
      description = '候选人数已经满足要求，接下来确认 5–7 人本届注册名单、职责和队长。'
      actionLabel = '配置正式名单'
    }
  }

  return {
    registration,
    roster,
    registrationStatus,
    registrationLabel,
    rosterStatus,
    rosterLabel,
    candidateCount,
    pendingApplicationCount,
    recruitmentLabel: registration?.recruitmentMode === 'OPEN' ? '公开招募' : registration?.recruitmentMode === 'INVITE_ONLY' ? '仅邀请' : registration ? '停止招募' : '尚未设置',
    focusKey,
    headline,
    description,
    actionLabel,
    tone,
    facts: [
      { key: 'registration', label: '本届报名', value: registrationLabel, state: ['REJECTED', 'WITHDRAWN'].includes(registrationStatus) ? 'attention' : registrationReady ? 'done' : 'current' },
      { key: 'applications', label: '待审核申请', value: `${pendingApplicationCount} 条`, state: pendingApplicationCount ? 'current' : registrationReady ? 'done' : 'waiting' },
      { key: 'candidates', label: '候选阵容', value: `${candidateCount} 人`, state: candidateCount >= 5 ? 'done' : registrationReady ? 'current' : 'waiting' },
      { key: 'roster', label: '正式名单', value: rosterLabel, state: rosterStatus === 'REJECTED' ? 'attention' : rosterComplete ? 'done' : rosterStatus === 'SUBMITTED' || (registrationReady && candidateCount >= 5) ? 'current' : 'waiting' }
    ]
  }
}

export function buildManagerPeopleWorkspace(registration = null) {
  const applicationQueue = buildManagerApplicationQueue(registration?.applications)
  const roster = registration?.roster || null
  const rosterStatus = normalized(roster?.status)
  const registrationStatus = normalized(registration?.status)
  const members = Array.isArray(roster?.members) ? roster.members : []
  const activeMembers = members.filter(member => normalized(member?.status) !== 'REMOVED')
  const removedMembers = members.filter(member => normalized(member?.status) === 'REMOVED')
  const candidateCount = activeMembers.length
  const missingMinimum = Math.max(0, 5 - candidateCount)
  const availableSlots = Math.max(0, 7 - candidateCount)
  const canEditCandidates = registrationStatus === 'APPROVED' && rosterStatus === 'DRAFT'

  let headline = '候选阵容等待建立'
  let description = '报名通过后，可以审核选手申请或邀请自由选手进入候选阵容。'
  let tone = 'pending'

  if (rosterStatus === 'LOCKED') {
    headline = '候选流程已经结束'
    description = '正式名单已锁定，当前人员关系保持只读；后续变更需要使用开放的名单变更窗口。'
    tone = 'done'
  } else if (rosterStatus === 'SUBMITTED') {
    headline = '正式名单审核期间已冻结人员调整'
    description = '可以查看申请与候选记录，但不能再通过申请或邀请新选手；撤回名单后才能继续调整。'
  } else if (rosterStatus === 'REJECTED') {
    headline = '先处理被退回的正式名单'
    description = '人员关系仍然保留；根据审核意见调整后重新提交，不需要选手重复申请。'
    tone = 'attention'
  } else if (applicationQueue.pending.length > 0) {
    headline = `${applicationQueue.pending.length} 条选手申请等待决定`
    description = '通过后选手立即进入候选阵容；正式名单提交前仍可继续调整。'
  } else if (missingMinimum > 0) {
    headline = `正式名单还缺至少 ${missingMinimum} 人`
    description = '继续开放申请或从自由选手池发送邀请；达到 5 人后才能提交正式名单。'
  } else if (availableSlots === 0) {
    headline = '候选阵容已达到 7 人上限'
    description = '如需接收其他选手，先从候选阵容中移除一人；正式名单最多保留 7 人。'
    tone = 'done'
  } else {
    headline = '候选人数已满足正式名单要求'
    description = `当前仍可再加入 ${availableSlots} 人，也可以直接前往注册名单确认选手、职责和队长。`
    tone = 'done'
  }

  return {
    applicationQueue,
    roster,
    rosterStatus,
    activeMembers,
    removedMembers,
    candidateCount,
    missingMinimum,
    availableSlots,
    canEditCandidates,
    headline,
    description,
    tone,
    facts: [
      { label: '待审核申请', value: `${applicationQueue.pending.length} 条` },
      { label: '当前候选', value: `${candidateCount} / 7` },
      { label: '最低人数', value: missingMinimum ? `还缺 ${missingMinimum} 人` : '已满足' }
    ]
  }
}

const EVENT_REGISTRATION_STAGES = [
  { key: 'team', label: '队伍报名' },
  { key: 'join', label: '选手加入' },
  { key: 'review', label: '经理审核' },
  { key: 'roster', label: '正式名单' },
  { key: 'lock', label: '锁定发布' }
]

const COACH_REGISTRATION_STAGES = [
  { key: 'identity', label: '教练身份' },
  { key: 'relationship', label: '长期关系' },
  { key: 'event-invite', label: '本届邀请' },
  { key: 'confirmation', label: '本人确认' },
  { key: 'access', label: '本届权限' }
]

function journeyStages(currentIndex, values, { attentionIndex = -1, completed = false, stages = EVENT_REGISTRATION_STAGES } = {}) {
  return stages.map((stage, index) => ({
    ...stage,
    value: values[index] || '等待前序阶段',
    state: completed || index < currentIndex
      ? 'done'
      : index === attentionIndex
        ? 'attention'
        : index === currentIndex
          ? 'current'
          : 'upcoming'
  }))
}

function managerRegistrationJourney(managerTeams) {
  const teams = Array.isArray(managerTeams) ? managerTeams : []
  const activeItem = teams.find(item => item?.registration) || teams[0] || null
  const team = activeItem?.team || null
  const registration = activeItem?.registration || null
  const registrationStatus = normalized(registration?.status)
  const roster = registration?.roster || null
  const rosterStatus = normalized(roster?.status)
  const candidateCount = (roster?.members || []).filter(member => normalized(member?.status) !== 'REMOVED').length
  const pendingApplications = (registration?.applications || []).filter(application => normalized(application?.status) === 'PENDING').length
  const teamLabel = team ? `${team.shortName || team.name}${team.name && team.shortName ? ` / ${team.name}` : ''}` : '尚未建立长期队伍'

  const values = [
    !team ? '创建或认领长期队伍' : !registration ? '提交本届赛事报名' : ['REJECTED', 'WITHDRAWN'].includes(registrationStatus) ? '报名需要调整' : ['APPROVED', 'LOCKED'].includes(registrationStatus) ? '本届报名已通过' : '等待 System 审核',
    registration ? `${candidateCount} 名候选选手` : '报名通过后开始招募',
    pendingApplications ? `${pendingApplications} 条申请待审核` : registration ? '当前没有待审核申请' : '等待队伍报名',
    rosterStatus === 'LOCKED' ? '注册名单已通过' : rosterStatus === 'SUBMITTED' ? '等待 System 审核' : roster ? '配置 5–7 人注册名单' : '等待候选阵容',
    rosterStatus === 'LOCKED' || registrationStatus === 'LOCKED' ? '已同步赛事数据' : '通过审核后自动发布'
  ]

  if (!team || !registration || !['APPROVED', 'LOCKED'].includes(registrationStatus)) {
    const needsAttention = ['REJECTED', 'WITHDRAWN'].includes(registrationStatus)
    return {
      mode: 'manager',
      perspectiveLabel: '经理流程',
      teamLabel,
      headline: !team ? '先建立你的长期队伍' : !registration ? '提交本届队伍报名' : needsAttention ? '调整并重新提交报名' : '等待本届报名审核',
      description: !team ? '创建或认领通过后，才能代表队伍报名本届赛事。' : !registration ? '选择招募方式和人员需求，建立本届独立报名关系。' : needsAttention ? '根据 System 反馈修改队伍报名资料。' : '审核期间可以查看状态，后续阶段将在通过后开放。',
      stages: journeyStages(0, values, { attentionIndex: needsAttention ? 0 : -1 })
    }
  }

  if (rosterStatus === 'LOCKED' || registrationStatus === 'LOCKED') {
    return {
      mode: 'manager',
      perspectiveLabel: '经理流程',
      teamLabel,
      headline: '本届报名流程已经完成',
      description: '正式名单已锁定并同步到赛事数据；后续变更需要在开放窗口内处理。',
      stages: journeyStages(4, values, { completed: true })
    }
  }

  let currentIndex = 3
  let headline = rosterStatus === 'SUBMITTED' ? '等待正式名单审核' : '配置并提交正式名单'
  let description = rosterStatus === 'SUBMITTED' ? '名单审核期间已冻结编辑；退回后可按意见修改。' : '从候选阵容中选择 5–7 人，登记主要职责和队长。'
  if (pendingApplications > 0) {
    currentIndex = 2
    headline = `处理 ${pendingApplications} 条选手申请`
    description = '先完成申请审核，再确认候选阵容和正式名单。'
  } else if (candidateCount < 5) {
    currentIndex = 1
    headline = '继续招募选手'
    description = `当前有 ${candidateCount} 名候选，正式名单至少需要 5 名选手。`
  }

  return {
    mode: 'manager',
    perspectiveLabel: '经理流程',
    teamLabel,
    headline,
    description,
    stages: journeyStages(currentIndex, values)
  }
}

function playerRegistrationJourney(playerFlow) {
  const flow = playerFlow || buildPlayerRegistrationFlow(null)
  const rosterStatus = normalized(flow.rosterMembership?.rosterStatus || flow.rosterMembership?.status)
  const team = flow.rosterMembership?.registration?.team || flow.selectionOutcome?.team || flow.pendingApplication?.registration?.team || flow.pendingInvitations?.[0]?.registration?.team || null
  const teamLabel = team ? `${team.shortName || team.name}${team.name && team.shortName ? ` / ${team.name}` : ''}` : '尚未选择本届队伍'
  const values = [
    team ? '目标队伍已确认' : '查看已报名队伍',
    flow.rosterMembership ? '已经进入候选阵容' : flow.pendingInvitations?.length ? '队伍邀请待确认' : flow.pendingApplications?.length ? '申请已提交' : '申请队伍或等待邀请',
    flow.rosterMembership || flow.selectionOutcome ? '经理审核已完成' : flow.pendingApplications?.length ? '等待经理审核' : '提交后由经理审核',
    rosterStatus === 'LOCKED' ? '进入本届注册名单' : flow.rosterMembership ? rosterStatus === 'SUBMITTED' ? '注册名单审核中' : '等待经理提交名单' : flow.selectionOutcome ? '当前未进入名单' : '等待加入候选阵容',
    rosterStatus === 'LOCKED' ? '名单结果已发布' : flow.selectionOutcome?.isFinal ? '本次未入选' : '等待正式名单锁定'
  ]

  if (rosterStatus === 'LOCKED') {
    return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: flow.headline, description: '本届注册名单已锁定；每张地图的实际出场阵容由比赛房间确认。', stages: journeyStages(4, values, { completed: true }) }
  }
  if (flow.selectionOutcome) {
    const attentionIndex = flow.selectionOutcome.isFinal ? 4 : 3
    return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: flow.headline, description: flow.selectionOutcome.isFinal ? '该队名单已经锁定，你可以继续申请仍开放招募的队伍。' : '经理仍可调整候选名单，你也可以寻找其他开放队伍。', stages: journeyStages(attentionIndex, values, { attentionIndex }) }
  }
  if (flow.rosterMembership) {
    return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: flow.headline, description: rosterStatus === 'SUBMITTED' ? '经理已经提交名单，等待 System 审核结果。' : '你已进入候选名单，经理仍可调整本届注册名单和登记职责。', stages: journeyStages(3, values) }
  }
  if (flow.pendingInvitations?.length) {
    return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: '确认队伍邀请', description: '这是需要本人处理的事项；接受后会立即进入该队候选阵容。', stages: journeyStages(1, values) }
  }
  if (flow.pendingApplications?.length) {
    return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: '等待经理审核申请', description: '同一时间只能保留一条主动申请；审核前可以主动撤回。', stages: journeyStages(2, values) }
  }
  return { mode: 'player', perspectiveLabel: '选手流程', teamLabel, headline: '选择一支已报名队伍', description: '可以主动申请开放招募队伍，也可以公开自由选手资料等待邀请。', stages: journeyStages(1, values) }
}

function coachRegistrationJourney(coachMemberships) {
  const memberships = Array.isArray(coachMemberships) ? coachMemberships : []
  const membership = memberships.find(item => normalized(item?.eventRelationship?.status) === 'INVITED')
    || memberships.find(item => normalized(item?.status) === 'INVITED')
    || memberships.find(item => normalized(item?.eventRelationship?.status) === 'ACTIVE')
    || memberships.find(item => normalized(item?.status) === 'ACTIVE')
    || memberships[0]
    || null
  const membershipStatus = normalized(membership?.status)
  const eventRelationship = membership?.eventRelationship || null
  const eventStatus = normalized(eventRelationship?.status)
  const team = membership?.team || null
  const teamLabel = team ? `${team.shortName || team.name}${team.name && team.shortName ? ` / ${team.name}` : ''}` : '尚未建立长期教练关系'
  const values = [
    '长期教练身份已认证',
    !membership ? '等待经理邀请' : membershipStatus === 'INVITED' ? '长期邀请待确认' : membershipStatus === 'ACTIVE' ? '长期关系已生效' : '长期关系当前不可用',
    eventRelationship ? '本届邀请已发送' : membership?.registration ? '等待经理邀请本届' : '队伍报名后开放',
    eventStatus === 'INVITED' ? '等待本人确认' : eventStatus === 'ACTIVE' ? '本届关系已确认' : eventStatus === 'DECLINED' ? '已拒绝本届邀请' : '收到邀请后确认',
    eventStatus === 'ACTIVE' ? '只读队伍权限已生效' : ['REVOKED', 'LEFT'].includes(eventStatus) ? '本届权限已结束' : '确认后自动生效'
  ]
  const options = { stages: COACH_REGISTRATION_STAGES }

  if (!membership) {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '等待长期队伍邀请', description: '经理先邀请长期教练；接受后，每届赛事仍需再次确认正式教练关系。', stages: journeyStages(1, values, options) }
  }
  if (membershipStatus === 'INVITED') {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '确认长期教练邀请', description: '接受后会建立长期教练身份和队伍关系，但不会自动进入每届赛事。', stages: journeyStages(1, values, options) }
  }
  if (membershipStatus !== 'ACTIVE') {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '长期教练关系需要处理', description: '当前长期关系无法继续建立本届教练权限。', stages: journeyStages(1, values, { ...options, attentionIndex: 1 }) }
  }
  if (!eventRelationship) {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: membership?.registration ? '等待经理邀请本届教练' : '等待队伍提交本届报名', description: membership?.registration ? '经理发送本届邀请后，需要由你本人再次确认。' : '长期教练关系已经保留，队伍报名通过后才能建立本届关系。', stages: journeyStages(2, values, options) }
  }
  if (eventStatus === 'INVITED') {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '确认本届正式教练邀请', description: '接受后立即获得本届队伍只读权限，无需 System 再次审核。', stages: journeyStages(3, values, options) }
  }
  if (eventStatus === 'ACTIVE') {
    return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '本届正式教练关系已生效', description: '可以查看队伍报名、阵容和赛程，但提交操作仍由经理负责。', stages: journeyStages(4, values, { ...options, completed: true }) }
  }

  const attentionIndex = eventStatus === 'DECLINED' ? 3 : 4
  return { mode: 'coach', perspectiveLabel: '教练流程', teamLabel, headline: '本届教练关系当前未生效', description: '长期教练关系仍保留；如需重新加入本届赛事，请联系经理重新邀请。', stages: journeyStages(attentionIndex, values, { ...options, attentionIndex }) }
}

export function buildEventRegistrationJourney({ managerTeams = [], playerFlow = null, coachMemberships = [], hasManagerIdentity = false, hasPlayerIdentity = false, hasCoachIdentity = false } = {}) {
  if (hasManagerIdentity || managerTeams.length) return managerRegistrationJourney(managerTeams)
  const hasPlayerFlowContext = Boolean(playerFlow && (
    playerFlow.rosterMembership
    || playerFlow.selectionOutcome
    || playerFlow.pendingApplications?.length
    || playerFlow.pendingInvitations?.length
    || playerFlow.recentActivity?.length
  ))
  if (hasPlayerIdentity || hasPlayerFlowContext) return playerRegistrationJourney(playerFlow)
  if (hasCoachIdentity || coachMemberships.length) return coachRegistrationJourney(coachMemberships)
  return {
    mode: 'viewer',
    perspectiveLabel: '账号视角',
    teamLabel: '尚未启用参赛身份',
    headline: '先完成参赛身份认证',
    description: '认证选手或经理身份后，这里会显示对应的报名流程和当前操作。',
    stages: journeyStages(0, ['完成身份认证', '等待身份生效', '等待身份生效', '等待身份生效', '等待身份生效'])
  }
}

export function buildPlayerRegistrationFlow(player, teamContexts = []) {
  const applications = [...(Array.isArray(player?.applications) ? player.applications : [])].sort(newestFirst)
  const invitations = [...(Array.isArray(player?.invitations) ? player.invitations : [])].sort(newestFirst)
  const pendingApplications = applications.filter(application => normalized(application?.status) === 'PENDING')
  const pendingInvitations = invitations.filter(invitation => normalized(invitation?.status) === 'PENDING')
  const rosterMembership = player?.rosterMembership || null
  const rosterStatus = normalized(rosterMembership?.rosterStatus || rosterMembership?.status)
  const rosterRegistrationId = rosterMembership?.registration?.id || ''
  const rosterContext = (Array.isArray(teamContexts) ? teamContexts : []).find(context => (
    context?.registrationId === rosterRegistrationId
  )) || null
  const ownMember = rosterContext?.roster?.ownMember || null
  const latestAcceptedRequest = [
    ...applications.map(application => ({ ...application, activityType: 'APPLICATION' })),
    ...invitations.map(invitation => ({ ...invitation, activityType: 'INVITATION' }))
  ].filter(item => normalized(item?.status) === 'ACCEPTED').sort(newestFirst)[0] || null
  const selectionOutcome = !rosterMembership && !pendingApplications.length && !pendingInvitations.length && latestAcceptedRequest ? {
    request: latestAcceptedRequest,
    isFinal: normalized(latestAcceptedRequest.registration?.status) === 'LOCKED',
    team: latestAcceptedRequest.registration?.team || null
  } : null

  const recentActivity = [
    ...applications
      .filter(application => normalized(application?.status) !== 'PENDING')
      .map(application => ({ ...application, activityType: 'APPLICATION' })),
    ...invitations
      .filter(invitation => normalized(invitation?.status) !== 'PENDING')
      .map(invitation => ({ ...invitation, activityType: 'INVITATION' }))
  ].sort(newestFirst).slice(0, 6)

  let headlineStatus = 'OPEN'
  let headline = '可以选择已开放招募的队伍'
  if (rosterMembership) {
    headlineStatus = rosterStatus || 'ACCEPTED'
    headline = rosterStatus === 'LOCKED'
      ? '已进入本届注册名单'
      : rosterStatus === 'SUBMITTED'
        ? '候选阵容已提交审核'
        : '已进入队伍候选阵容'
  } else if (pendingInvitations.length) {
    headlineStatus = 'INVITED'
    headline = `有 ${pendingInvitations.length} 个队伍邀请待确认`
  } else if (pendingApplications.length) {
    headlineStatus = 'PENDING'
    headline = '入队申请等待经理审核'
  } else if (selectionOutcome) {
    headlineStatus = 'NOT_SELECTED'
    headline = selectionOutcome.isFinal ? '本次未进入该队注册名单' : '目前未列入该队候选名单'
  }

  const rosterStep = selectionOutcome
    ? { state: 'attention', value: selectionOutcome.isFinal ? '本次未入选' : '未在当前名单' }
    : rosterStatus === 'LOCKED'
      ? { state: 'done', value: '注册名单已锁定' }
      : rosterMembership
        ? { state: 'current', value: rosterStatus === 'SUBMITTED' ? '等待 System 审核' : '等待经理提交' }
        : { state: 'upcoming', value: '尚未进入名单' }

  return {
    rosterMembership,
    rosterContext,
    ownMember,
    selectionOutcome,
    pendingApplications,
    pendingApplication: pendingApplications[0] || null,
    pendingInvitations,
    recentActivity,
    canApply: !rosterMembership && pendingApplications.length === 0,
    headline,
    headlineStatus,
    steps: [
      { key: 'identity', label: '选手身份', state: 'done', value: '已认证' },
      {
        key: 'team',
        label: '加入队伍',
        state: rosterMembership || selectionOutcome ? 'done' : 'current',
        value: rosterMembership
          ? '已加入候选阵容'
          : selectionOutcome
            ? '申请或邀请曾通过'
            : pendingInvitations.length
              ? '确认队伍邀请'
              : pendingApplications.length
                ? '等待经理审核'
                : '选择或等待邀请'
      },
      { key: 'roster', label: '注册名单', ...rosterStep }
    ],
    membershipTitle: rosterStatus === 'LOCKED'
      ? '本届注册名单'
      : rosterStatus === 'SUBMITTED'
        ? '注册名单审核中'
        : '当前候选名单'
  }
}
