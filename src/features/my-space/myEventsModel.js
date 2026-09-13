const IDENTITY_META = {
  PLAYER: { label: '选手', en: 'PLAYER' },
  MANAGER: { label: '经理', en: 'MANAGER' },
  COACH: { label: '教练', en: 'COACH' },
  REFEREE: { label: '赛管', en: 'REFEREE' },
  CASTER: { label: '解说', en: 'CASTER' },
  VIEWER: { label: '普通观众', en: 'VIEWER' }
}

const PLAYER_ROLE_LABELS = {
  TANK: '重装',
  DPS: '输出',
  SUP: '支援',
  SUPPORT: '支援',
  FLEX: '补位',
  UNKNOWN: '职责待定'
}

const SEASON_STATUS_LABELS = {
  DRAFT: '尚未开始',
  ACTIVE: '进行中',
  ARCHIVED: '已归档'
}

export const EVENT_REGISTRATION_STATUS = {
  DRAFT: '报名草稿',
  SUBMITTED: '报名审核中',
  APPROVED: '报名已通过',
  LOCKED: '赛事关系已锁定',
  REJECTED: '报名已退回',
  WITHDRAWN: '报名已撤回'
}

export const EVENT_ROSTER_STATUS = {
  DRAFT: '名单草稿',
  SUBMITTED: '名单审核中',
  LOCKED: '正式名单已锁定',
  REJECTED: '名单已退回',
  SUPERSEDED: '历史名单'
}

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

const NEXT_EVENT_MATCH_STATUSES = new Set(['PENDING', 'IN_PROGRESS'])

function nextAssignmentOrder(left, right) {
  const leftPriority = normalized(left?.match?.status) === 'IN_PROGRESS' ? 0 : 1
  const rightPriority = normalized(right?.match?.status) === 'IN_PROGRESS' ? 0 : 1
  if (leftPriority !== rightPriority) return leftPriority - rightPriority

  const leftTime = left?.match?.scheduledAt ? new Date(left.match.scheduledAt).getTime() : Number.POSITIVE_INFINITY
  const rightTime = right?.match?.scheduledAt ? new Date(right.match.scheduledAt).getTime() : Number.POSITIVE_INFINITY
  if (leftTime !== rightTime) return leftTime - rightTime
  return String(left?.id || '').localeCompare(String(right?.id || ''))
}

function activeStaffAssignments(assignments = []) {
  return assignments
    .filter(item => item?.match && NEXT_EVENT_MATCH_STATUSES.has(normalized(item.match.status)))
    .sort(nextAssignmentOrder)
}

function identityMeta(type) {
  const normalizedType = normalized(type) || 'VIEWER'
  return { type: normalizedType, ...(IDENTITY_META[normalizedType] || { label: normalizedType, en: normalizedType }) }
}

function contextTeamName(teamContext) {
  const team = teamContext?.seasonTeam || teamContext?.teamOrganization || {}
  return team.shortName || team.name || '当前队伍'
}

function rolesOf(teamContext) {
  return (Array.isArray(teamContext?.roles) ? teamContext.roles : []).map(normalized)
}

function primaryIdentity(context) {
  const identities = Array.isArray(context?.identities) ? context.identities : []
  const preferredType = normalized(context?.primaryIdentityType)
  const selected = identities.find(identity => identity?.isPrimary)
    || identities.find(identity => normalized(identity?.type || identity?.identityType) === preferredType)
    || identities[0]
  return identityMeta(selected?.type || selected?.identityType || preferredType || 'VIEWER')
}

function teamContextPriority(teamContext, identityType) {
  const roles = rolesOf(teamContext)
  if (roles.includes(identityType)) return 0
  if (roles.includes('MANAGER')) return 1
  if (roles.includes('PLAYER')) return 2
  return 3
}

export function buildTeamEventView(teamContext) {
  const roles = rolesOf(teamContext)
  const registrationStatus = normalized(teamContext?.registrationStatus)
  const rosterStatus = normalized(teamContext?.roster?.status)
  const ownMember = teamContext?.roster?.ownMember || null
  const teamLabel = contextTeamName(teamContext)
  const canManage = Boolean(teamContext?.capabilities?.canManageTeam)
  const nextMatch = teamContext?.nextMatch || null

  let stage = '本届关系已建立'
  let headline = `已加入 ${teamLabel} 的本届赛事关系`
  let description = '报名、阵容和比赛信息会在这里持续同步。'
  let tone = 'active'

  if (['REJECTED', 'WITHDRAWN'].includes(registrationStatus)) {
    stage = EVENT_REGISTRATION_STATUS[registrationStatus]
    headline = canManage ? '队伍报名需要重新处理' : '当前赛事关系暂未生效'
    description = canManage ? '前往队伍与阵容查看 System 反馈并重新提交。' : '等待经理处理报名状态。'
    tone = 'attention'
  } else if (registrationStatus === 'SUBMITTED') {
    stage = EVENT_REGISTRATION_STATUS.SUBMITTED
    headline = '队伍报名正在等待审核'
    description = canManage ? '审核通过后将开放候选阵容与正式名单流程。' : '报名通过后会继续同步你的队伍关系。'
    tone = 'pending'
  } else if (rosterStatus === 'SUBMITTED') {
    stage = EVENT_ROSTER_STATUS.SUBMITTED
    headline = '正式名单正在等待审核'
    description = ownMember ? '你已包含在本次提交中，最终参赛资格以锁定名单为准。' : '审核期间名单已冻结，退回后经理可以修改。'
    tone = 'pending'
  } else if (rosterStatus === 'LOCKED') {
    stage = EVENT_ROSTER_STATUS.LOCKED
    headline = ownMember ? '本届注册名单已锁定' : '本届注册名单已经锁定'
    description = nextMatch ? '参赛关系已确认，可以查看下一场安排；单图出场阵容在比赛房间确认。' : '注册名单已经同步到本届赛事数据。'
    tone = 'done'
  } else if (ownMember) {
    stage = EVENT_ROSTER_STATUS[rosterStatus] || '候选阵容'
    headline = `已进入 ${teamLabel} 候选阵容`
    description = '经理仍可调整本届注册名单与登记职责，最终结果以锁定名单为准。'
  } else if (canManage && registrationStatus === 'APPROVED') {
    stage = EVENT_REGISTRATION_STATUS.APPROVED
    headline = teamContext?.roster ? '继续配置并提交正式名单' : '开始建立本届候选阵容'
    description = '先处理选手申请，再确认 5–7 人本届注册名单和登记职责。'
  } else if (roles.includes('COACH')) {
    stage = '本届教练关系已确认'
    headline = `以教练身份加入 ${teamLabel}`
    description = '你可以查看队伍报名、阵容和赛程，但提交操作仍由经理负责。'
  }

  return {
    registrationId: teamContext?.registrationId,
    teamLabel,
    roles,
    stage,
    headline,
    description,
    tone,
    nextMatch
  }
}

function staffAssignments(staffContext, role) {
  if (role === 'REFEREE') {
    return [
      ...(staffContext?.refereeAssignments || []),
      ...(staffContext?.broadcastRefereeAssignments || [])
    ]
  }
  return staffContext?.casterAssignments || []
}

function staffParticipation(staffContext, role) {
  return (staffContext?.participations || []).find(item => normalized(item?.role) === role) || null
}

function buildStaffView(context, role) {
  const staffContext = context?.staffContext || {}
  const assignments = staffAssignments(staffContext, role)
  const upcomingAssignments = activeStaffAssignments(assignments)
  const participation = staffParticipation(staffContext, role)
  const status = normalized(participation?.status)
  return {
    role,
    ...identityMeta(role),
    assignments,
    assignmentCount: assignments.length,
    upcomingAssignmentCount: upcomingAssignments.length,
    nextAssignment: upcomingAssignments[0] || null,
    participation,
    status,
    statusLabel: assignments.length
      ? `${assignments.length} 场正式排班`
      : status === 'PENDING'
        ? '本届参与申请审核中'
        : ['APPROVED', 'ACTIVE'].includes(status)
          ? '本届参与关系已确认'
          : status === 'REJECTED'
            ? '本届参与申请未通过'
            : '本届尚无正式关系',
    actionUrl: role === 'REFEREE' ? '/me?section=referee' : '/me?section=caster'
  }
}

function onboardingAction(identity) {
  switch (identity.type) {
    case 'MANAGER':
      return { headline: '本届尚未提交队伍报名', description: '长期经理身份仍然有效；每届赛事需要重新提交队伍和阵容。', label: '前往队伍报名', url: '/me?section=team', tone: 'pending' }
    case 'PLAYER':
      return { headline: '本届尚未加入参赛队伍', description: '申请开放招募队伍，或公开自由选手状态等待经理邀请。', label: '寻找本届队伍', url: '/me?section=team', tone: 'pending' }
    case 'COACH':
      return { headline: '等待本届教练关系确认', description: '长期教练身份不会自动进入每届赛事，需要经理邀请并由本人确认。', label: '查看队伍关系', url: '/me?section=team', tone: 'pending' }
    case 'REFEREE':
      return { headline: '本届尚无正式赛管排班', description: '长期赛管身份已保留，正式分配场次后才会获得比赛操作权限。', label: '查看赛管工作台', url: '/me?section=referee', tone: 'pending' }
    case 'CASTER':
      return { headline: '本届尚无正式解说排班', description: '提交本届档期并等待正式排班，长期解说身份不会自动获得场次。', label: '查看解说工作台', url: '/me?section=caster', tone: 'pending' }
    default:
      return { headline: '本届以观众身份参与', description: '可以关注队伍和选手、查看相关赛程、赛果与正式出场记录。', label: '查看我的关注', url: '/me?section=following', tone: 'viewer' }
  }
}

function teamRelationshipGuide(identity) {
  switch (identity.type) {
    case 'MANAGER':
      return { eyebrow: 'EVENT TEAM ENTRY', headline: '报名通过后建立本届经理关系', description: '先代表长期队伍提交本届报名；通过后再处理选手申请、正式名单和赛程。', label: '提交本届队伍报名' }
    case 'PLAYER':
      return { eyebrow: 'PLAYER ENTRY', headline: '通过申请或邀请加入本届队伍', description: '你可以主动申请公开招募队伍，也可以公开自由选手状态等待经理邀请。', label: '查看开放招募队伍' }
    case 'COACH':
      return { eyebrow: 'COACH ENTRY', headline: '经理邀请与本人确认缺一不可', description: '长期教练关系可以保留，但每届正式教练都需要经理邀请，并由教练本人再次确认。', label: '查看教练关系' }
    default:
      return null
  }
}

function registrationStep(teamContext) {
  const status = normalized(teamContext?.registrationStatus)
  if (['REJECTED', 'WITHDRAWN'].includes(status)) {
    return { key: 'registration', label: '队伍报名', detail: EVENT_REGISTRATION_STATUS[status], state: 'attention' }
  }
  if (['APPROVED', 'LOCKED'].includes(status)) {
    return { key: 'registration', label: '队伍报名', detail: EVENT_REGISTRATION_STATUS[status], state: 'done' }
  }
  if (status === 'SUBMITTED') {
    return { key: 'registration', label: '队伍报名', detail: '等待赛事方审核', state: 'current' }
  }
  return { key: 'registration', label: '队伍报名', detail: status === 'DRAFT' ? '报名资料尚未提交' : '等待提交本届报名', state: 'current' }
}

export function buildTeamEventJourney(teamContext = {}) {
  const registration = registrationStep(teamContext)
  const registrationReady = registration.state === 'done'
  const rosterStatus = normalized(teamContext?.roster?.status)
  const rosterReady = rosterStatus === 'LOCKED'
  const matches = Array.isArray(teamContext?.matches) ? teamContext.matches : []
  const nextMatch = teamContext?.nextMatch || null
  const roleLabels = (teamContext?.roleLabels || rolesOf(teamContext).map(role => identityMeta(role).label)).filter(Boolean)

  const relationship = {
    key: 'relationship',
    label: '赛事关系',
    detail: registrationReady ? `${roleLabels.join(' / ') || '队伍'}关系已确认` : '报名通过后自动建立',
    state: registrationReady ? 'done' : 'waiting'
  }

  let roster = { key: 'roster', label: '正式名单', detail: '赛事关系建立后开放', state: 'waiting' }
  if (registrationReady) {
    if (rosterStatus === 'LOCKED') roster = { ...roster, detail: '正式名单已锁定', state: 'done' }
    else if (rosterStatus === 'SUBMITTED') roster = { ...roster, detail: '名单正在等待审核', state: 'current' }
    else if (rosterStatus === 'REJECTED') roster = { ...roster, detail: '名单被退回，等待修改', state: 'attention' }
    else if (rosterStatus === 'DRAFT') roster = { ...roster, detail: '候选阵容正在组建', state: 'current' }
    else roster = { ...roster, detail: teamContext?.capabilities?.canManageTeam ? '开始建立候选阵容' : '等待经理提交名单', state: 'current' }
  }

  let schedule = { key: 'schedule', label: '比赛安排', detail: '名单锁定后进入赛程', state: 'waiting' }
  if (rosterReady) {
    const matchStage = [nextMatch?.stage, nextMatch?.roundLabel].filter(Boolean).join(' · ')
    schedule = {
      ...schedule,
      detail: nextMatch
        ? `${matchStage || '下一场'} · 已安排`
        : matches.length
          ? `${matches.length} 场比赛已关联`
          : '等待赛事方生成对阵',
      state: 'current'
    }
  }

  const steps = [registration, relationship, roster, schedule]
  const currentStep = steps.find(step => ['attention', 'current'].includes(step.state)) || steps.at(-1)
  return {
    eyebrow: 'EVENT JOURNEY',
    title: `${contextTeamName(teamContext)} 的本届参赛进度`,
    description: '队伍报名、赛事关系、正式名单和比赛安排依次生效。',
    steps,
    currentStep,
    completedCount: steps.filter(step => step.state === 'done').length,
    total: steps.length
  }
}

function buildStaffEventJourney(staffView) {
  const hasAssignments = staffView.assignmentCount > 0
  const hasUpcomingAssignments = staffView.upcomingAssignmentCount > 0
  const participationDone = hasAssignments || ['APPROVED', 'ACTIVE'].includes(staffView.status)
  const participationState = staffView.status === 'REJECTED'
    ? 'attention'
    : participationDone
      ? 'done'
      : 'current'
  const steps = [
    { key: 'identity', label: '长期身份', detail: `${staffView.label}身份有效`, state: 'done' },
    { key: 'participation', label: '本届参与', detail: staffView.statusLabel, state: participationState },
    { key: 'assignment', label: '正式排班', detail: hasAssignments ? `${staffView.assignmentCount} 场排班已确认` : '参与通过后等待分配', state: hasAssignments ? 'done' : participationDone ? 'current' : 'waiting' },
    { key: 'service', label: '场次执行', detail: hasUpcomingAssignments ? '查看最近场次与比赛资料' : hasAssignments ? '本届排班已结束，记录保留只读' : '排班后开放场次权限', state: hasUpcomingAssignments ? 'current' : hasAssignments ? 'done' : 'waiting' }
  ]
  const currentStep = steps.find(step => ['attention', 'current'].includes(step.state)) || steps.at(-1)
  return {
    eyebrow: 'EVENT STAFF JOURNEY',
    title: `${staffView.label}的本届工作流程`,
    description: '长期身份、本届参与和单场权限分别确认。',
    steps,
    currentStep,
    completedCount: steps.filter(step => step.state === 'done').length,
    total: steps.length
  }
}

function buildOnboardingJourney(identity) {
  const journeys = {
    MANAGER: [
      ['队伍报名', '提交本届队伍资料'],
      ['阵容组建', '审核选手申请与邀请'],
      ['名单锁定', '提交 5–7 人正式名单'],
      ['比赛安排', '进入本届赛程']
    ],
    PLAYER: [
      ['选择队伍', '申请队伍或等待邀请'],
      ['入队确认', '建立本届选手关系'],
      ['正式名单', '等待经理提交并锁定'],
      ['比赛安排', '进入本届赛程']
    ],
    COACH: [
      ['经理邀请', '等待本届教练邀请'],
      ['本人确认', '确认本届教练关系'],
      ['阵容查看', '查看正式名单状态'],
      ['比赛安排', '进入本届赛程']
    ],
    REFEREE: [
      ['本届参与', '提交赛管参与申请'],
      ['关系确认', '等待赛事方审核'],
      ['正式排班', '分配具体比赛场次'],
      ['场次执行', '获得单场操作权限']
    ],
    CASTER: [
      ['本届参与', '提交解说档期'],
      ['关系确认', '等待赛事方审核'],
      ['正式排班', '分配具体比赛场次'],
      ['场次执行', '查看直播与比赛资料']
    ],
    VIEWER: [
      ['关注赛事', '选择关注的队伍和选手'],
      ['查看赛程', '查看关注队伍的比赛时间'],
      ['跟进赛果', '查看已发布赛果与正式出场'],
      ['赛事回顾', '回看本届成绩与队伍档案']
    ]
  }
  const source = journeys[identity.type] || journeys.VIEWER
  const steps = source.map(([label, detail], index) => ({ key: `${identity.type}-${index}`, label, detail, state: index === 0 ? 'current' : 'waiting' }))
  return {
    eyebrow: identity.type === 'VIEWER' ? 'FAN JOURNEY' : 'EVENT JOURNEY',
    title: identity.type === 'VIEWER' ? '本届观赛参与路径' : `${identity.label}的本届参与流程`,
    description: identity.type === 'VIEWER' ? '没有参赛身份也可以完整参与赛事内容。' : '基础身份长期有效，但本届赛事关系需要重新建立。',
    steps,
    currentStep: steps[0],
    completedCount: 0,
    total: steps.length
  }
}

function playerTeamContext(teamContexts = []) {
  return teamContexts.find(teamContext => rolesOf(teamContext).includes('PLAYER') || teamContext?.roster?.ownMember) || null
}

export function buildPlayerEventEligibility(context = {}, teamContexts = context?.teamContexts || []) {
  const teamContext = playerTeamContext(teamContexts)
  const history = Array.isArray(context?.eventHistory?.playerSeasons) ? context.eventHistory.playerSeasons : []
  const officialRecord = history.find(record => record?.isCurrent || record?.seasonId === context?.seasonId) || null
  const ownMember = teamContext?.roster?.ownMember || officialRecord?.roster || null
  const rosterStatus = normalized(teamContext?.roster?.status)
  const registrationStatus = normalized(teamContext?.registrationStatus)
  const mapsPlayed = Number(officialRecord?.mapsPlayed || 0)
  const teamLabel = teamContext ? contextTeamName(teamContext) : officialRecord?.team?.shortName || officialRecord?.team?.name || '尚未加入'
  const roleLabel = PLAYER_ROLE_LABELS[normalized(ownMember?.role)] || ownMember?.role || '职责待确认'
  const rosterPosition = ownMember ? '注册名单成员' : '未进入名单'

  if ((officialRecord?.assignmentStatus === 'LOCKED' || rosterStatus === 'LOCKED') && ownMember) {
    return {
      key: 'eligible',
      tone: 'done',
      eyebrow: 'OFFICIAL PLAYER',
      headline: '本届正式参赛资格已确认',
      description: `你已进入 ${teamLabel} 的锁定名单，登记职责为${roleLabel}；每张地图的实际出场阵容由比赛房间确认。`,
      shortLabel: '正式参赛',
      teamLabel,
      registrationLabel: EVENT_REGISTRATION_STATUS[registrationStatus] || '赛事关系已确认',
      rosterLabel: `${rosterPosition} · ${roleLabel}`,
      roleLabel,
      mapsPlayed,
      appearanceLabel: mapsPlayed > 0 ? `已出场 ${mapsPlayed} 张正式地图` : '尚未参加正式地图',
      hasAppearance: mapsPlayed > 0
    }
  }

  if (ownMember) {
    return {
      key: 'candidate',
      tone: 'pending',
      eyebrow: 'ROSTER CANDIDATE',
      headline: '当前为候选选手，正式资格待锁定',
      description: `你已进入 ${teamLabel} 的候选阵容；最终参赛资格以 System 锁定名单为准，单图出场阵容在比赛房间确认。`,
      shortLabel: '候选资格',
      teamLabel,
      registrationLabel: EVENT_REGISTRATION_STATUS[registrationStatus] || '队伍关系已建立',
      rosterLabel: EVENT_ROSTER_STATUS[rosterStatus] || `${rosterPosition} · ${roleLabel}`,
      roleLabel,
      mapsPlayed: 0,
      appearanceLabel: '正式名单锁定后计算出场',
      hasAppearance: false
    }
  }

  if (teamContext) {
    return {
      key: 'relationship',
      tone: 'pending',
      eyebrow: 'TEAM RELATIONSHIP',
      headline: '本届队伍关系已建立，尚未进入正式名单',
      description: `你当前与 ${teamLabel} 存在本届选手关系，但只有进入锁定名单后才获得正式参赛资格。`,
      shortLabel: '等待名单',
      teamLabel,
      registrationLabel: EVENT_REGISTRATION_STATUS[registrationStatus] || '队伍关系已建立',
      rosterLabel: '未进入当前名单',
      roleLabel,
      mapsPlayed: 0,
      appearanceLabel: '尚无正式出场',
      hasAppearance: false
    }
  }

  return {
    key: 'unregistered',
    tone: 'attention',
    eyebrow: 'NO EVENT RELATIONSHIP',
    headline: '本届尚未建立选手参赛关系',
    description: '长期选手身份仍然有效；你需要申请已报名队伍或接受经理邀请，之后才能进入本届名单流程。',
    shortLabel: '尚未报名',
    teamLabel: '尚未加入',
    registrationLabel: '无本届关系',
    rosterLabel: '未进入名单',
    roleLabel: '职责待确认',
    mapsPlayed: 0,
    appearanceLabel: '尚无正式出场',
    hasAppearance: false
  }
}

export function buildPlayerEventHistory(context = {}) {
  return [...(context?.eventHistory?.playerSeasons || [])]
    .filter(record => !record?.isCurrent && record?.seasonId !== context?.seasonId)
    .sort((left, right) => new Date(right?.startsAt || right?.lockedAt || 0) - new Date(left?.startsAt || left?.lockedAt || 0))
    .map(record => ({
      ...record,
      teamLabel: record?.team?.shortName || record?.team?.name || '历史队伍',
      roleLabel: PLAYER_ROLE_LABELS[normalized(record?.roster?.role)] || record?.roster?.role || '职责未记录',
      rosterPosition: record?.roster ? '注册名单成员' : '名单位置未记录',
      seasonStatusLabel: SEASON_STATUS_LABELS[normalized(record?.seasonStatus)] || record?.seasonStatus || '状态未记录',
      appearanceLabel: Number(record?.mapsPlayed || 0) > 0 ? `${record.mapsPlayed} 张正式地图` : '正式名单 · 未出场',
      finalRankLabel: record?.finalRank ? `最终 ${String(record.finalRank).startsWith('第') ? record.finalRank : `第 ${record.finalRank} 名`}` : '最终名次未记录'
    }))
}

export function buildMyEventsView(context = {}) {
  const identity = primaryIdentity(context)
  const teamContexts = [...(context?.teamContexts || [])].sort((left, right) => (
    teamContextPriority(left, identity.type) - teamContextPriority(right, identity.type)
  ))
  const teamViews = teamContexts.map(buildTeamEventView)
  const staffViews = ['REFEREE', 'CASTER']
    .filter(role => identity.type === role
      || (context?.identities || []).some(item => normalized(item?.type || item?.identityType) === role)
      || staffAssignments(context?.staffContext, role).length
      || staffParticipation(context?.staffContext, role))
    .map(role => buildStaffView(context, role))
  const tasks = context?.overview?.tasks || []
  const staffAssignmentCount = staffViews.reduce((sum, item) => sum + item.assignmentCount, 0)
  const relatedMatches = new Set(teamContexts.flatMap(item => (item.matches || []).map(match => match?.id).filter(Boolean)))
  const playerEligibility = buildPlayerEventEligibility(context, teamContexts)
  const playerHistory = buildPlayerEventHistory(context)

  let currentAction = onboardingAction(identity)
  if (staffViews.some(item => item.upcomingAssignmentCount > 0) && !teamViews.length) {
    const staff = staffViews.find(item => item.upcomingAssignmentCount > 0)
    currentAction = { headline: `有 ${staff.upcomingAssignmentCount} 场${staff.label}排班待执行`, description: '优先确认最近场次、时间和比赛资料。', label: `打开${staff.label}工作台`, url: staff.actionUrl, tone: 'active' }
  } else if (staffViews.some(item => item.assignmentCount > 0) && !teamViews.length) {
    const staff = staffViews.find(item => item.assignmentCount > 0)
    currentAction = { headline: `本届 ${staff.assignmentCount} 场${staff.label}排班已结束`, description: '已结束场次保留为只读记录，不再占用下一项赛事安排。', label: '查看排班记录', url: staff.actionUrl, tone: 'done' }
  }
  if (teamViews.length) {
    const team = teamViews[0]
    currentAction = { headline: team.headline, description: team.description, label: team.nextMatch ? '查看我的比赛' : '查看队伍与阵容', url: team.nextMatch ? '/me?section=matches' : '/me?section=team', tone: team.tone }
  }
  if (tasks.length) {
    currentAction = { headline: `${tasks.length} 项本届事项等待处理`, description: tasks[0]?.title || '优先处理当前赛事待办。', label: '处理当前待办', url: tasks[0]?.actionUrl || '/me?section=tasks', tone: 'attention' }
  }

  const primaryStaffView = staffViews.find(item => item.role === identity.type && item.upcomingAssignmentCount > 0)
    || staffViews.find(item => item.role === identity.type && item.assignmentCount > 0)
    || staffViews.find(item => item.role === identity.type)
    || staffViews[0]
  const journey = teamContexts.length
    ? buildTeamEventJourney(teamContexts[0])
    : primaryStaffView
      ? buildStaffEventJourney(primaryStaffView)
      : buildOnboardingJourney(identity)

  const facts = identity.type === 'PLAYER'
    ? [
        { label: '本届队伍', value: playerEligibility.teamLabel, detail: '赛事关系' },
        { label: '参赛资格', value: playerEligibility.shortLabel, detail: '本届' },
        { label: '名单位置', value: playerEligibility.rosterLabel, detail: '当前' },
        { label: '关联比赛', value: String(relatedMatches.size), detail: '场' }
      ]
    : [
        { label: '当前身份', value: identity.label, detail: identity.en },
        { label: '队伍关系', value: String(teamContexts.length), detail: '本届' },
        { label: '关联比赛', value: String(relatedMatches.size), detail: '场' },
        { label: '工作人员排班', value: String(staffAssignmentCount), detail: '场' }
      ]

  return {
    seasonId: context?.seasonId || 'CURRENT',
    identity,
    currentAction,
    journey,
    relationshipGuide: teamRelationshipGuide(identity),
    teamContexts,
    teamViews,
    staffViews,
    playerEligibility,
    playerHistory,
    facts
  }
}
