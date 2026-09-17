import { buildPlayerEventEligibility, EVENT_REGISTRATION_STATUS, EVENT_ROSTER_STATUS } from './myEventsModel.js'

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

function rolesOf(teamContext) {
  return (Array.isArray(teamContext?.roles) ? teamContext.roles : []).map(normalized)
}

function teamLabel(teamContext) {
  const team = teamContext?.seasonTeam || teamContext?.teamOrganization || {}
  return team.shortName || team.name || '本届队伍待确认'
}

function uniqueMatchCount(teamContexts) {
  return new Set(teamContexts.flatMap(context => (
    Array.isArray(context?.matches) ? context.matches.map(match => match?.id).filter(Boolean) : []
  ))).size
}

function dossierRole(dossier) {
  return dossier?.selectedRoleData?.summary?.roleLabel
    || dossier?.roleEntries?.[0]?.summary?.roleLabel
    || '职责待定'
}

export function buildPlayerWorkspaceStatus(context = {}, dossier = {}) {
  const playerContexts = (Array.isArray(context?.teamContexts) ? context.teamContexts : [])
    .filter(teamContext => rolesOf(teamContext).includes('PLAYER'))
  const activeContext = playerContexts.find(teamContext => {
    const ownMember = teamContext?.roster?.ownMember
    return ownMember && normalized(ownMember.status) !== 'REMOVED'
  }) || playerContexts[0] || null
  const eligibility = buildPlayerEventEligibility(context, playerContexts)
  const matchCount = uniqueMatchCount(playerContexts)

  if (context?.competitionKind === 'WEEKLY') {
    return {
      key: activeContext ? 'WEEKLY_MEMBERSHIP' : 'WAITING_TEAM',
      tone: activeContext ? 'active' : 'pending',
      headline: activeContext ? `已关联周赛队伍 ${teamLabel(activeContext)}` : '等待关联周赛队伍',
      description: '参赛资格以当周锁定名单为准；选手可查看赛果，由队长或经理代表队伍确认。',
      teamLabel: activeContext ? teamLabel(activeContext) : '尚未加入',
      registrationLabel: activeContext ? '周赛队伍已关联' : '队伍待关联',
      rosterLabel: '以当周锁定名单为准', roleLabel: dossierRole(dossier), matchCount,
      actionLabel: matchCount ? '查看我的比赛' : '查看周赛安排',
      actionUrl: matchCount ? '/me?section=matches' : '/me?section=team'
    }
  }

  if (!activeContext) {
    return {
      key: 'WAITING_TEAM',
      tone: 'pending',
      headline: '本届尚未建立参赛关系',
      description: dossier?.identity?.teamShort
        ? `选手身份和长期所属 ${dossier.identity.teamShort} 已保留；本届仍需重新申请或接受经理邀请。`
        : '选手身份长期有效；本届可申请公开招募队伍，或等待经理邀请。',
      teamLabel: '尚未加入',
      registrationLabel: '本届关系待建立',
      rosterLabel: '未进入候选阵容',
      roleLabel: dossierRole(dossier),
      matchCount,
      actionLabel: '寻找本届队伍',
      actionUrl: '/me?section=team'
    }
  }

  const registrationStatus = normalized(activeContext.registrationStatus)
  const rosterStatus = normalized(activeContext?.roster?.status)
  const ownMember = activeContext?.roster?.ownMember || null
  const ownMemberRemoved = normalized(ownMember?.status) === 'REMOVED'
  const currentTeamLabel = eligibility.teamLabel || teamLabel(activeContext)
  const registrationLabel = EVENT_REGISTRATION_STATUS[registrationStatus] || '本届关系已建立'
  const registeredRole = eligibility.roleLabel || ownMember?.role || dossierRole(dossier)
  const base = {
    key: 'TEAM_RELATION',
    tone: 'active',
    headline: `已加入 ${currentTeamLabel} 的本届赛事关系`,
    description: '报名、阵容和赛程状态会随 System 审核结果自动更新。',
    teamLabel: currentTeamLabel,
    registrationLabel,
    rosterLabel: activeContext.roster ? EVENT_ROSTER_STATUS[rosterStatus] || rosterStatus : '正式名单待建立',
    roleLabel: registeredRole,
    matchCount,
    actionLabel: '查看我的赛事',
    actionUrl: '/me?section=events'
  }

  if (['REJECTED', 'WITHDRAWN'].includes(registrationStatus)) {
    return {
      ...base,
      key: 'REGISTRATION_INACTIVE',
      tone: 'attention',
      headline: '当前本届赛事关系未生效',
      description: '队伍报名已退回或撤回，等待经理处理后才能继续阵容流程。',
      rosterLabel: '名单流程未开放',
      actionLabel: '查看赛事关系'
    }
  }

  if (registrationStatus === 'SUBMITTED') {
    return {
      ...base,
      key: 'REGISTRATION_REVIEW',
      tone: 'pending',
      headline: `${currentTeamLabel} 报名审核中`,
      description: '报名通过后才会建立本届候选阵容和正式名单关系。',
      rosterLabel: '等待报名通过'
    }
  }

  if (rosterStatus === 'LOCKED') {
    if (!ownMember || ownMemberRemoved) {
      return {
        ...base,
        key: 'NOT_ROSTERED',
        tone: 'attention',
        headline: '未进入本届锁定名单',
        description: '当前不能以该队选手身份参加正式比赛；后续变化需通过开放的转会期或人工豁免处理。',
        rosterLabel: '未进入正式名单',
        actionLabel: '查看名单结果',
        actionUrl: '/me?section=team'
      }
    }
    return {
      ...base,
      key: 'LOCKED_ROSTER',
      tone: 'done',
      headline: '本届注册名单已锁定',
      description: activeContext.nextMatch ? '参赛资格已确认，下一场比赛安排已经同步；单图出场阵容在比赛房间确认。' : '参赛资格已确认，等待赛事方生成下一轮对阵；单图出场阵容在比赛房间确认。',
      rosterLabel: '本届注册名单成员',
      actionLabel: activeContext.nextMatch ? '查看下一场比赛' : '查看我的赛事',
      actionUrl: activeContext.nextMatch ? '/me?section=matches' : '/me?section=events'
    }
  }

  if (rosterStatus === 'SUBMITTED') {
    return {
      ...base,
      key: 'ROSTER_REVIEW',
      tone: 'pending',
      headline: '正式名单正在审核',
      description: ownMember ? '你已包含在提交名单中，最终参赛资格以 System 锁定版本为准。' : '名单审核期间不可修改，等待 System 发布最终结果。',
      rosterLabel: ownMember ? '提交名单 · 待审核' : '等待名单结果',
      actionLabel: '查看名单状态',
      actionUrl: '/me?section=team'
    }
  }

  if (rosterStatus === 'REJECTED') {
    return {
      ...base,
      key: 'ROSTER_REJECTED',
      tone: 'attention',
      headline: '正式名单已退回',
      description: '经理需要根据 System 意见调整名单；你的候选关系暂时保留。',
      actionLabel: '查看名单状态',
      actionUrl: '/me?section=team'
    }
  }

  if (ownMember && !ownMemberRemoved) {
    return {
      ...base,
      key: 'ROSTER_CANDIDATE',
      headline: `已进入 ${currentTeamLabel} 候选阵容`,
      description: '经理仍可调整本届注册名单和登记职责，最终参赛资格以锁定名单为准。',
      rosterLabel: '本届注册名单候选',
      actionLabel: '查看候选阵容',
      actionUrl: '/me?section=team'
    }
  }

  return {
    ...base,
    key: 'WAITING_ROSTER',
    tone: 'pending',
    headline: '等待进入本届候选阵容',
    description: '队伍关系已经建立，等待经理处理选手申请、邀请或候选名单。',
    actionLabel: '查看队伍关系',
    actionUrl: '/me?section=team'
  }
}
