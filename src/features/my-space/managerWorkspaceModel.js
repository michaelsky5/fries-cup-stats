const REGISTRATION_LABELS = {
  DRAFT: '报名草稿',
  SUBMITTED: '报名审核中',
  APPROVED: '报名已通过',
  LOCKED: '赛事关系已锁定',
  REJECTED: '报名已退回',
  WITHDRAWN: '报名已撤回'
}

const ROSTER_LABELS = {
  DRAFT: '名单草稿',
  SUBMITTED: '名单审核中',
  LOCKED: '正式名单已锁定',
  REJECTED: '名单已退回',
  SUPERSEDED: '历史名单'
}

const STEP_DEFINITIONS = [
  { key: 'registration', label: '队伍报名' },
  { key: 'recruitment', label: '选手加入' },
  { key: 'review', label: '经理审核' },
  { key: 'roster', label: '正式名单' },
  { key: 'operations', label: '锁定发布' }
]

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

function rolesOf(teamContext) {
  return (Array.isArray(teamContext?.roles) ? teamContext.roles : []).map(normalized)
}

function teamLabel(teamContext) {
  const team = teamContext?.seasonTeam || teamContext?.teamOrganization || {}
  return team.shortName || team.name || '本届队伍'
}

function makeSteps(currentIndex, values, { attentionIndex = -1, completed = false } = {}) {
  return STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    detail: values[index] || '等待前序阶段',
    state: completed || index < currentIndex
      ? 'done'
      : index === attentionIndex
        ? 'attention'
        : index === currentIndex
          ? 'current'
          : 'waiting'
  }))
}

export function getPrimarySpaceIdentityType(context, fallbackType = 'VIEWER') {
  const identities = Array.isArray(context?.identities) ? context.identities : []
  const selected = identities.find(identity => identity?.isPrimary)
  return normalized(selected?.type || selected?.identityType || context?.primaryIdentityType || identities[0]?.type || identities[0]?.identityType || fallbackType) || 'VIEWER'
}

export function buildManagerWorkspaceStatus(context) {
  const teamContexts = (Array.isArray(context?.teamContexts) ? context.teamContexts : [])
    .filter(teamContext => rolesOf(teamContext).includes('MANAGER') || teamContext?.capabilities?.canManageTeam)
  const activeTeam = teamContexts.find(teamContext => ['APPROVED', 'LOCKED'].includes(normalized(teamContext?.registrationStatus)))
    || teamContexts[0]
    || null
  const registrationStatus = normalized(activeTeam?.registrationStatus)
  const rosterStatus = normalized(activeTeam?.roster?.status)
  const candidateCount = Number(activeTeam?.roster?.memberCount || 0)
  const pendingApplicationCount = Number(activeTeam?.applicationSummary?.pendingCount || 0)
  const matchCount = Array.isArray(activeTeam?.matches) ? activeTeam.matches.length : 0
  const openTaskCount = Number(context?.overview?.openTaskCount || 0)
  const currentTeamLabel = activeTeam ? teamLabel(activeTeam) : '尚未建立本届关系'
  if (context?.competitionKind === 'WEEKLY') {
    const steps = [
      { key: 'identity', label: '账号身份', detail: '队伍负责人身份已关联', state: 'done' },
      { key: 'team', label: '赛季队伍', detail: activeTeam ? currentTeamLabel : '等待赛管关联队伍', state: activeTeam ? 'done' : 'waiting' },
      { key: 'weekly', label: '每周参赛', detail: '参赛与名单按当周安排确认', state: activeTeam ? 'current' : 'waiting' }
    ]
    return {
      teamContexts, activeTeam, teamCount: teamContexts.length, teamLabel: currentTeamLabel,
      registrationStatus: '', registrationLabel: activeTeam ? '周赛队伍已关联' : '队伍待关联',
      rosterStatus: '', rosterLabel: '以当周锁定名单为准', candidateCount: 0, pendingApplicationCount: 0,
      matchCount, openTaskCount, nextMatch: activeTeam?.nextMatch || null,
      headline: activeTeam ? '周赛队伍已关联' : '等待赛管关联周赛队伍',
      description: '周赛按周期管理参赛队伍；已关联的队伍无需走常规赛报名流程。',
      actionLabel: matchCount ? '查看我的比赛' : '查看周赛安排',
      actionUrl: matchCount ? '/me?section=matches' : '/me?section=team',
      tone: activeTeam ? 'done' : 'pending', steps, completedCount: steps.filter(step => step.state === 'done').length
    }
  }
  const registrationLabel = REGISTRATION_LABELS[registrationStatus] || (activeTeam ? '报名状态待同步' : '尚未报名')
  const rosterLabel = ROSTER_LABELS[rosterStatus] || (activeTeam?.roster ? '名单状态待同步' : '尚未建立')
  const values = [
    activeTeam ? registrationLabel : '提交本届赛事报名',
    activeTeam && ['APPROVED', 'LOCKED'].includes(registrationStatus) ? `${candidateCount} 名候选选手` : '报名通过后开放',
    pendingApplicationCount ? `${pendingApplicationCount} 条申请待审核` : activeTeam ? '当前没有待审核申请' : '等待队伍报名',
    rosterStatus === 'LOCKED' ? '注册名单已锁定' : rosterStatus === 'SUBMITTED' ? '等待 System 审核' : rosterStatus === 'REJECTED' ? '按反馈修改名单' : activeTeam?.roster ? '配置 5–7 人注册名单' : '等待候选阵容',
    rosterStatus === 'LOCKED' || registrationStatus === 'LOCKED' ? '已同步赛事数据' : '名单通过后自动发布'
  ]

  let headline = '提交本届队伍报名'
  let description = '长期经理身份已经生效，但每届赛事仍需重新提交队伍和阵容。'
  let actionLabel = '进入队伍报名'
  let actionUrl = '/me?section=team'
  let tone = 'pending'
  let steps = makeSteps(0, values)

  if (activeTeam && ['DRAFT', 'SUBMITTED'].includes(registrationStatus)) {
    const submitted = registrationStatus === 'SUBMITTED'
    headline = submitted ? '本届报名正在等待审核' : '完善并提交本届队伍报名'
    description = submitted ? '审核期间可以查看资料；通过后将开放选手申请审核与正式名单。' : '确认招募方式、队伍信息和本届参赛负责人后提交审核。'
    actionLabel = submitted ? '查看报名状态' : '继续填写报名'
  } else if (activeTeam && ['REJECTED', 'WITHDRAWN'].includes(registrationStatus)) {
    headline = '队伍报名需要重新处理'
    description = '查看 System 反馈，调整资料后重新提交本届报名。'
    actionLabel = '处理报名反馈'
    tone = 'attention'
    steps = makeSteps(0, values, { attentionIndex: 0 })
  } else if (activeTeam && ['APPROVED', 'LOCKED'].includes(registrationStatus)) {
    if (pendingApplicationCount > 0) {
      headline = `审核 ${pendingApplicationCount} 条选手申请`
      description = '申请通过后进入候选阵容；正式名单提交前仍可继续调整。'
      actionLabel = '处理选手申请'
      steps = makeSteps(2, values)
    } else if (!['LOCKED', 'SUBMITTED'].includes(rosterStatus) && candidateCount < 5) {
      headline = '继续建立候选阵容'
      description = `当前有 ${candidateCount} 名候选选手，正式名单至少需要 5 人。`
      actionLabel = '招募与邀请选手'
      steps = makeSteps(1, values)
    } else if (rosterStatus === 'REJECTED') {
      headline = '正式名单需要修改'
      description = '根据 System 反馈调整 5–7 人注册名单、职责和队长。'
      actionLabel = '修改正式名单'
      tone = 'attention'
      steps = makeSteps(3, values, { attentionIndex: 3 })
    } else if (rosterStatus === 'SUBMITTED') {
      headline = '正式名单正在等待审核'
      description = '审核期间名单已冻结；通过后会自动同步到赛事数据。'
      actionLabel = '查看名单状态'
      steps = makeSteps(3, values)
    } else if (rosterStatus === 'LOCKED' || registrationStatus === 'LOCKED') {
      headline = activeTeam.nextMatch ? '正式名单已锁定，准备下一场比赛' : '本届报名与名单已经完成'
      description = activeTeam.nextMatch ? '队伍关系、本届注册名单和下一场安排均已同步。' : '等待赛事方生成对阵；后续变更仅在开放窗口内处理。'
      actionLabel = activeTeam.nextMatch ? '查看我的比赛' : '查看正式名单'
      actionUrl = activeTeam.nextMatch ? '/me?section=matches' : '/me?section=team'
      tone = 'done'
      steps = makeSteps(4, values, { completed: true })
    } else {
      headline = '配置并提交正式名单'
      description = '从候选阵容中确认 5–7 名本届注册选手、职责与比赛队长。'
      actionLabel = '配置正式名单'
      steps = makeSteps(3, values)
    }
  }

  return {
    teamContexts,
    activeTeam,
    teamCount: teamContexts.length,
    teamLabel: currentTeamLabel,
    registrationStatus,
    registrationLabel,
    rosterStatus,
    rosterLabel,
    candidateCount,
    pendingApplicationCount,
    matchCount,
    openTaskCount,
    nextMatch: activeTeam?.nextMatch || context?.overview?.nextTeamMatch || null,
    headline,
    description,
    actionLabel,
    actionUrl,
    tone,
    steps,
    completedCount: steps.filter(step => step.state === 'done').length
  }
}
