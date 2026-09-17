const TEAM = {
  id: 'preview-team-banana',
  team_id: 'FCR26-T013',
  shortName: 'BANANA',
  team_short_name: 'BANANA',
  name: 'Team Banana',
  team_name: 'Team Banana',
  slug: 'team-banana',
  status: 'ACTIVE'
}

const MANAGER = {
  id: 'preview-manager',
  username: 'banana_manager',
  displayName: 'Mango'
}

const IDENTITY_LABELS = {
  MANAGER: '经理',
  PLAYER: '选手',
  COACH: '教练',
  REFEREE: '赛管',
  CASTER: '解说',
  VIEWER: '普通观众'
}

export const ACCOUNT_PREVIEW_IDENTITIES = [
  { id: 'MANAGER', label: '经理' },
  { id: 'PLAYER', label: '选手' },
  { id: 'COACH', label: '教练' },
  { id: 'REFEREE', label: '赛管' },
  { id: 'CASTER', label: '解说' },
  { id: 'VIEWER', label: '普通观众' },
  { id: 'MULTI', label: '多身份（经理 / 选手 / 解说）' }
]

const PLAYER_NAMES = [
  ['Sky', 'Sky#51764', 'DPS'],
  ['Lemon', 'Lemon#1024', 'SUP'],
  ['Kite', 'Kite#2048', 'TANK'],
  ['Mint', 'Mint#4096', 'DPS'],
  ['Nova', 'Nova#8192', 'SUP'],
  ['Panda', 'Panda#2333', 'FLEX'],
  ['Wave', 'Wave#7777', 'DPS'],
  ['Coral', 'Coral#6060', 'DPS'],
  ['Echo', 'Echo#9090', 'SUP']
]

function player(index) {
  const [displayName, battleTag, role] = PLAYER_NAMES[index]
  return {
    id: `preview-player-identity-${index + 1}`,
    userId: `preview-player-user-${index + 1}`,
    displayName,
    battleTag,
    role
  }
}

function rosterMembers(count) {
  return Array.from({ length: count }, (_, index) => {
    const identity = player(index)
    return {
      id: `preview-roster-member-${index + 1}`,
      status: 'ACTIVE',
      role: identity.role,
      source: index < 3 ? 'APPLICATION' : 'INVITATION',
      player: identity
    }
  })
}

const PENDING_APPLICATIONS = [
  {
    id: 'preview-application-1',
    status: 'PENDING',
    preferredRoles: ['DPS'],
    message: '周末两天都可以参赛，擅长长枪和机动输出，愿意参加赛前训练。',
    createdAt: '2026-07-19T10:00:00+08:00',
    player: { ...player(5) }
  },
  {
    id: 'preview-application-2',
    status: 'PENDING',
    preferredRoles: ['SUP', 'FLEX'],
    message: '主支援，也可以根据地图补位；周日最晚可以打到 23:00。',
    createdAt: '2026-07-20T09:30:00+08:00',
    player: { ...player(6) }
  },
  {
    id: 'preview-application-history',
    status: 'ACCEPTED',
    preferredRoles: ['TANK'],
    message: '已处理的历史申请。',
    createdAt: '2026-07-17T08:00:00+08:00',
    reviewedAt: '2026-07-17T12:00:00+08:00',
    player: { ...player(2) }
  }
]

const FREE_AGENTS = [
  { id: 'preview-agent-1', preferredRoles: ['DPS'], bio: '擅长长枪输出，可参加周末训练。', player: { ...player(7) } },
  { id: 'preview-agent-2', preferredRoles: ['SUP'], bio: '主支援，熟悉团队指挥与地图轮转。', player: { ...player(8) } }
]

const SCENARIO_CONFIG = {
  unregistered: { label: '尚未报名', registrationStatus: '', rosterStatus: '', count: 0, applications: [] },
  recruiting: { label: '招募未满', registrationStatus: 'APPROVED', rosterStatus: 'DRAFT', count: 3, applications: [] },
  applications: { label: '申请待审核', registrationStatus: 'APPROVED', rosterStatus: 'DRAFT', count: 5, applications: PENDING_APPLICATIONS },
  roster: { label: '配置注册名单', registrationStatus: 'APPROVED', rosterStatus: 'DRAFT', count: 6, applications: [] },
  submitted: { label: '名单审核中', registrationStatus: 'APPROVED', rosterStatus: 'SUBMITTED', count: 6, applications: [] },
  locked: { label: '名单已锁定', registrationStatus: 'LOCKED', rosterStatus: 'LOCKED', count: 7, applications: [] }
}

export const ACCOUNT_PREVIEW_SCENARIOS = Object.entries(SCENARIO_CONFIG).map(([id, config]) => ({ id, label: config.label }))

function registrationFor(config) {
  if (!config.registrationStatus) return null
  return {
    id: 'preview-registration',
    status: config.registrationStatus,
    recruitmentMode: config.rosterStatus === 'LOCKED' ? 'CLOSED' : 'OPEN',
    recruitmentNeeds: { roles: ['DPS', 'SUP'], count: Math.max(0, 7 - config.count), note: '优先补充输出与支援位置。' },
    applications: config.applications,
    manager: MANAGER,
    roster: {
      id: 'preview-roster',
      version: 1,
      status: config.rosterStatus,
      reviewNote: '',
      members: rosterMembers(config.count),
      officers: [{ role: 'CAPTAIN', userId: MANAGER.id }]
    }
  }
}

function mySpaceContext(registration, config) {
  const pendingCount = config.applications.filter(application => application.status === 'PENDING').length
  const nextMatch = config.rosterStatus === 'LOCKED' ? {
    id: 'preview-next-match',
    displayName: 'FCR2026 · ROUND 06',
    stage: 'SWISS',
    roundLabel: 'ROUND 06',
    status: 'PENDING',
    scheduledAt: '2026-07-26T19:30:00+08:00',
    teamA: { id: TEAM.id, shortName: TEAM.shortName, name: TEAM.name },
    teamB: { id: 'preview-opponent', shortName: 'IH', name: 'IHAN' }
  } : null
  return {
    seasonId: 'FCR2026',
    user: { id: MANAGER.id, displayName: MANAGER.displayName, username: MANAGER.username, emailVerified: true },
    identities: [{ id: 'preview-manager-identity', type: 'MANAGER', label: '经理', status: 'ACTIVE', isVerified: true, isPrimary: true, seasonContextCount: registration ? 1 : 0 }],
    primaryIdentityType: 'MANAGER',
    teamContexts: registration ? [{
      registrationId: registration.id,
      registrationStatus: registration.status,
      recruitmentMode: registration.recruitmentMode,
      teamOrganization: TEAM,
      seasonTeam: TEAM,
      roles: ['MANAGER'],
      roleLabels: ['经理'],
      capabilities: { canManageTeam: true, canReviewApplications: true, canSubmitRoster: true, canManageLeadership: true, canNegotiateSchedule: true, canSubmitAppeal: true, canEnterMatchRoom: true, canViewTeamOperations: true, readOnly: false },
      applicationSummary: { pendingCount, totalCount: config.applications.length },
      leadership: { captain: null, deputyCaptain: null, managerIsDefaultCaptain: true },
      roster: { id: registration.roster.id, version: 1, status: registration.roster.status, memberCount: config.count, ownMember: null },
      nextMatch,
      matches: nextMatch ? [nextMatch] : []
    }] : [],
    staffContext: { refereeAssignments: [], broadcastRefereeAssignments: [], casterAssignments: [], availability: [] },
    overview: {
      openTaskCount: pendingCount,
      unreadNotificationCount: pendingCount ? 2 : 0,
      tasks: pendingCount ? [{ id: 'preview-task', title: `审核 ${pendingCount} 条选手申请`, priority: 'HIGH', identityType: 'MANAGER', actionUrl: '/me?section=team' }] : [],
      nextTeamMatch: nextMatch,
      nextStaffAssignment: null
    },
    sections: { player: false, team: true, referee: false, caster: false, viewer: false }
  }
}

function identityCard(type, { primary = true, seasonContextCount = 1 } = {}) {
  return {
    id: `preview-${type.toLowerCase()}-identity`,
    type,
    identityType: type,
    label: IDENTITY_LABELS[type] || type,
    status: 'ACTIVE',
    isVerified: true,
    isPrimary: primary,
    seasonContextCount
  }
}

function roleSpaceContext(identityType, managerContext, registration) {
  if (identityType === 'MANAGER') return managerContext
  const nextMatch = managerContext.overview.nextTeamMatch
  const baseTeamContext = managerContext.teamContexts[0] || null
  const displayNames = { PLAYER: 'Sky', COACH: 'Coach Pine', REFEREE: 'Ref Nova', CASTER: 'Caster Lime', VIEWER: 'Fries Fan', MULTI: 'Mango' }
  const user = { id: `preview-${identityType.toLowerCase()}-user`, displayName: displayNames[identityType], username: `preview_${identityType.toLowerCase()}`, emailVerified: true }
  const emptyStaff = { refereeAssignments: [], broadcastRefereeAssignments: [], casterAssignments: [], availability: [] }

  if (identityType === 'MULTI') {
    const casterAssignment = nextMatch ? {
      id: 'preview-caster-assignment', role: 'CASTER', locked: true, match: nextMatch,
      plan: { id: 'preview-plan', name: 'FCR2026 周日主舞台', status: 'LOCKED' },
      streamUrl: 'https://example.com/live/fcr2026'
    } : null
    return {
      ...managerContext,
      user,
      identities: [identityCard('MANAGER'), identityCard('PLAYER', { primary: false }), identityCard('CASTER', { primary: false })],
      primaryIdentityType: 'MANAGER',
      staffContext: { ...emptyStaff, casterAssignments: casterAssignment ? [casterAssignment] : [], availability: [] },
      sections: { player: true, team: true, referee: false, caster: true, viewer: false }
    }
  }

  const isTeamRole = ['PLAYER', 'COACH'].includes(identityType)
  const teamContext = isTeamRole && baseTeamContext ? {
    ...baseTeamContext,
    roles: [identityType],
    roleLabels: [IDENTITY_LABELS[identityType]],
    capabilities: identityType === 'PLAYER'
      ? { canManageTeam: false, canReviewApplications: false, canSubmitRoster: false, canManageLeadership: false, canNegotiateSchedule: false, canSubmitAppeal: true, canEnterMatchRoom: true, canViewTeamOperations: true, readOnly: true }
      : { canManageTeam: false, canReviewApplications: false, canSubmitRoster: false, canManageLeadership: false, canNegotiateSchedule: false, canSubmitAppeal: false, canEnterMatchRoom: false, canViewTeamOperations: true, readOnly: true },
    roster: baseTeamContext.roster ? {
      ...baseTeamContext.roster,
      ownMember: identityType === 'PLAYER' ? { id: 'preview-player-member', status: 'ACTIVE', role: 'DPS', player: player(0) } : null
    } : null
  } : null

  const isStaffRole = ['REFEREE', 'CASTER'].includes(identityType)
  const staffAssignment = isStaffRole && nextMatch ? {
    id: `preview-${identityType.toLowerCase()}-assignment`,
    role: identityType,
    status: 'ASSIGNED',
    locked: true,
    match: nextMatch,
    plan: identityType === 'CASTER' ? { id: 'preview-plan', name: 'FCR2026 周日主舞台', status: 'LOCKED' } : null,
    streamUrl: identityType === 'CASTER' ? 'https://example.com/live/fcr2026' : null
  } : null
  const staffContext = {
    ...emptyStaff,
    refereeAssignments: identityType === 'REFEREE' && staffAssignment ? [staffAssignment] : [],
    casterAssignments: identityType === 'CASTER' && staffAssignment ? [staffAssignment] : [],
    availability: identityType === 'CASTER' ? [{ id: 'preview-availability', formTitle: '季后赛解说档期', formStatus: '已提交', submittedAt: '2026-07-20T10:00:00+08:00' }] : []
  }
  const staffTask = ['REFEREE', 'CASTER'].includes(identityType) && staffAssignment ? [{
    id: `preview-${identityType.toLowerCase()}-task`,
    title: identityType === 'REFEREE' ? '确认下一场执裁安排' : '确认下一场解说排班',
    priority: 'HIGH',
    identityType,
    actionUrl: `/me?section=${identityType === 'REFEREE' ? 'referee' : 'caster'}`
  }] : []

  return {
    seasonId: 'FCR26',
    user,
    identities: identityType === 'VIEWER' ? [] : [identityCard(identityType, { seasonContextCount: isTeamRole ? Number(Boolean(registration)) : Number(Boolean(staffAssignment)) })],
    primaryIdentityType: identityType,
    teamContexts: teamContext ? [teamContext] : [],
    staffContext,
    overview: {
      openTaskCount: staffTask.length,
      unreadNotificationCount: identityType === 'VIEWER' ? 1 : staffTask.length,
      tasks: staffTask,
      nextTeamMatch: teamContext ? nextMatch : null,
      nextStaffAssignment: staffAssignment ? { ...staffAssignment, assignmentType: identityType } : null
    },
    sections: {
      player: identityType === 'PLAYER',
      team: isTeamRole,
      referee: identityType === 'REFEREE',
      caster: identityType === 'CASTER',
      viewer: identityType === 'VIEWER'
    }
  }
}

export function buildAccountDesignPreviewFixture(scenarioId = 'applications', identityType = 'MANAGER') {
  const config = SCENARIO_CONFIG[scenarioId] || SCENARIO_CONFIG.applications
  const registration = registrationFor(config)
  const managerTeam = { team: TEAM, registration }
  const managerContext = mySpaceContext(registration, config)
  const spaceContext = roleSpaceContext(identityType, managerContext, registration)
  return {
    scenarioId,
    scenarioLabel: config.label,
    identityType,
    identities: spaceContext.identities,
    teamContexts: spaceContext.teamContexts,
    spaceContext,
    playerDossier: {
      identity: { displayName: 'Sky', playerId: 'preview-player', teamShort: TEAM.shortName },
      isPublished: true
    },
    eventRegistration: {
      context: { emailVerified: true, claims: [], managerTeams: [managerTeam], player: null },
      coachContext: { managedTeams: [{ team: TEAM, coaches: [], registration: registration ? { id: registration.id, coaches: [] } : null }], coach: { memberships: [] }, officialCoachLimit: 2 },
      managerTransferContext: { incoming: [], outgoing: [] },
      recruitingTeams: [],
      freeAgents: registration && registration.roster.status === 'DRAFT' ? FREE_AGENTS : [],
      privateContacts: Object.fromEntries(PLAYER_NAMES.map((_, index) => [`preview-player-user-${index + 1}`, { qqContact: `1000000${index + 1}`, discordContact: `${PLAYER_NAMES[index][0]}Preview` }]))
    },
    existingTeams: [TEAM]
  }
}
