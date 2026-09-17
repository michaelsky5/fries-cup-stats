import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPlayerSpaceDossier, getTeamMatchHistory, shouldExposeTeamSpace } from '../src/lib/mySpaceSelectors.js'
import {
  buildMyEventsView,
  buildPlayerEventEligibility,
  buildPlayerEventHistory,
  buildTeamEventJourney,
  buildTeamEventView
} from '../src/features/my-space/myEventsModel.js'
import { buildMyMatchesView } from '../src/features/my-space/myMatchesModel.js'
import { buildManagerWorkspaceStatus, getPrimarySpaceIdentityType } from '../src/features/my-space/managerWorkspaceModel.js'
import { buildPlayerWorkspaceStatus } from '../src/features/my-space/playerWorkspaceModel.js'
import { buildPlayerStatsWorkspace } from '../src/features/my-space/playerStatsWorkspaceModel.js'

const banana = {
  team_id: 'team-banana',
  team_short_name: 'BANANA',
  team_name: 'Team Banana'
}

const db = {
  teams: [
    banana,
    { team_id: 'ihan', team_short_name: 'IH', team_name: 'IHAN' },
    { team_id: 'fries', team_short_name: 'FRIES', team_name: 'Fries Club' }
  ],
  matches: [
    {
      match_id: 'finished-loss',
      scheduled_at: '2026-07-05T19:30:00+08:00',
      status: 'COMPLETE',
      team_a: { id: 'team-banana', short: 'BANANA', score: 0 },
      team_b: { id: 'ihan', short: 'IH', score: 2 }
    },
    {
      match_id: 'finished-win',
      scheduled_at: '2026-07-12T19:30:00+08:00',
      status: 'COMPLETED',
      team_a: { id: 'fries', short: 'FRIES', score: 1 },
      team_b: { id: 'team-banana', short: 'BANANA', score: 2 }
    },
    {
      match_id: 'pending-match',
      scheduled_at: '2026-07-13T21:30:00+08:00',
      status: 'PENDING',
      team_a: { id: 'team-banana', short: 'BANANA' },
      team_b: { id: 'ihan', short: 'IH' }
    },
    {
      match_id: 'unrelated',
      scheduled_at: '2026-07-13T19:30:00+08:00',
      status: 'PENDING',
      team_a: { id: 'ihan', short: 'IH' },
      team_b: { id: 'fries', short: 'FRIES' }
    }
  ]
}

const history = getTeamMatchHistory(db, banana, 8)

assert.equal(history.length, 3, 'only matches involving the verified team should be returned')
assert.equal(history[0].matchId, 'pending-match', 'matches should be sorted newest first')
assert.equal(history[0].resultText, '', 'a pending match without scores must not be labeled as a draw')
assert.equal(history[1].ownSide, 'b', 'the verified team side should be resolved across aliases')
assert.equal(history[1].opponent.short, 'FRIES')
assert.equal(history[1].resultText, '胜')
assert.equal(history[2].resultText, '负')
assert.equal(getTeamMatchHistory(db, banana, 1).length, 1, 'the result limit should be honored')
assert.deepEqual(getTeamMatchHistory(db, null), [], 'missing identity should return an empty history')

const pendingPlayerDossier = buildPlayerSpaceDossier({
  identity: { identityType: 'PLAYER', targetId: 'profile-pending', battleTag: 'Sky#1234', teamId: 'team-banana' },
  user: { displayName: 'Sky' }
})
assert.equal(pendingPlayerDossier.isPublished, false)
assert.equal(pendingPlayerDossier.identity.displayName, 'Sky')
assert.equal(pendingPlayerDossier.identity.battleTag, 'Sky#1234')
assert.equal(pendingPlayerDossier.identity.teamShort, 'team-banana')
assert.deepEqual(pendingPlayerDossier.roleEntries, [], 'an unpublished player should keep an empty performance state instead of becoming a viewer')

const publishedPlayerDossier = buildPlayerSpaceDossier({ publicDossier: { identity: { playerId: 'player-1' }, roles: ['DPS'] } })
assert.equal(publishedPlayerDossier.isPublished, true)
assert.equal(publishedPlayerDossier.identity.playerId, 'player-1')

assert.equal(shouldExposeTeamSpace({ isVerifiedPlayer: true }), true, 'verified players keep the registration-result workspace even after final roster exclusion')
assert.equal(shouldExposeTeamSpace({ hasVerifiedTeamIdentity: true, hasCapabilitySnapshot: true }), true, 'long-term managers and coaches can enter the team workspace before event registration')
assert.equal(shouldExposeTeamSpace({ hasCapabilitySnapshot: true, hasTeamOperations: true }), true)
assert.equal(shouldExposeTeamSpace({ hasCapabilitySnapshot: true, hasTeamOperations: false, hasPendingTeamWorkflow: true }), true, 'pending team invitations must expose the response workspace before identity activation')
assert.equal(shouldExposeTeamSpace({ hasCapabilitySnapshot: true, hasTeamOperations: false, sectionEnabled: true }), false)
assert.equal(shouldExposeTeamSpace({ sectionEnabled: true }), true)

const managerEventView = buildMyEventsView({
  seasonId: 'FCR26',
  primaryIdentityType: 'MANAGER',
  identities: [{ id: 'manager', type: 'MANAGER', isPrimary: true }],
  teamContexts: [],
  staffContext: {},
  overview: { tasks: [] }
})
assert.equal(managerEventView.currentAction.headline, '本届尚未提交队伍报名')
assert.equal(managerEventView.currentAction.url, '/me?section=team')
assert.equal(managerEventView.facts[1].value, '0')

assert.equal(getPrimarySpaceIdentityType({
  primaryIdentityType: 'PLAYER',
  identities: [
    { id: 'player', type: 'PLAYER' },
    { id: 'manager', type: 'MANAGER', isPrimary: true }
  ]
}), 'MANAGER', 'the explicit primary identity must win when a multi-role account chooses its workspace')

const unregisteredManagerStatus = buildManagerWorkspaceStatus({
  primaryIdentityType: 'MANAGER',
  identities: [{ id: 'manager', type: 'MANAGER', isPrimary: true }],
  teamContexts: [],
  overview: { openTaskCount: 0, tasks: [] }
})
assert.equal(unregisteredManagerStatus.headline, '提交本届队伍报名')
assert.equal(unregisteredManagerStatus.actionUrl, '/me?section=team')
assert.equal(unregisteredManagerStatus.steps[0].state, 'current')

const recruitingManagerStatus = buildManagerWorkspaceStatus({
  primaryIdentityType: 'MANAGER',
  teamContexts: [{
    registrationId: 'manager-registration',
    registrationStatus: 'APPROVED',
    roles: ['MANAGER'],
    seasonTeam: { shortName: 'BAN', name: 'Banana' },
    capabilities: { canManageTeam: true },
    applicationSummary: { pendingCount: 2, totalCount: 5 },
    roster: { status: 'DRAFT', memberCount: 4 },
    matches: []
  }],
  overview: { openTaskCount: 2, tasks: [] }
})
assert.equal(recruitingManagerStatus.teamLabel, 'BAN')
assert.equal(recruitingManagerStatus.headline, '审核 2 条选手申请')
assert.equal(recruitingManagerStatus.pendingApplicationCount, 2)
assert.deepEqual(recruitingManagerStatus.steps.map(step => step.state), ['done', 'done', 'current', 'waiting', 'waiting'])

const lockedManagerStatus = buildManagerWorkspaceStatus({
  primaryIdentityType: 'MANAGER',
  teamContexts: [{
    registrationId: 'manager-registration',
    registrationStatus: 'LOCKED',
    roles: ['MANAGER'],
    seasonTeam: { shortName: 'BAN', name: 'Banana' },
    capabilities: { canManageTeam: true },
    applicationSummary: { pendingCount: 0, totalCount: 8 },
    roster: { status: 'LOCKED', memberCount: 7 },
    nextMatch: { id: 'next-manager-match' },
    matches: [{ id: 'next-manager-match' }]
  }],
  overview: { openTaskCount: 0, tasks: [] }
})
assert.equal(lockedManagerStatus.headline, '正式名单已锁定，准备下一场比赛')
assert.equal(lockedManagerStatus.actionUrl, '/me?section=matches')
assert.equal(lockedManagerStatus.completedCount, 5)
assert.equal(lockedManagerStatus.steps.every(step => step.state === 'done'), true)

const playerTeamContext = {
  registrationId: 'registration-1',
  registrationStatus: 'APPROVED',
  roles: ['PLAYER'],
  seasonTeam: { shortName: 'BAN', name: 'Banana' },
  roster: { status: 'DRAFT', ownMember: { role: 'SUP' } },
  matches: [{ id: 'match-1' }]
}
const playerEventView = buildMyEventsView({
  seasonId: 'FCR26',
  identities: [{ id: 'player', type: 'PLAYER', isPrimary: true }],
  teamContexts: [playerTeamContext],
  staffContext: {},
  overview: { tasks: [] }
})
assert.equal(playerEventView.currentAction.headline, '已进入 BAN 候选阵容')
assert.equal(playerEventView.facts[0].value, 'BAN')
assert.equal(playerEventView.facts[1].value, '候选资格')
assert.equal(playerEventView.facts[3].value, '1')
assert.equal(playerEventView.playerEligibility.key, 'candidate')
assert.equal(buildTeamEventView({ ...playerTeamContext, roster: { status: 'LOCKED', ownMember: { role: 'SUP' } } }).headline, '本届注册名单已锁定')
assert.equal(playerEventView.journey.currentStep.key, 'roster')
assert.deepEqual(playerEventView.journey.steps.map(step => step.state), ['done', 'done', 'current', 'waiting'])

const scheduledJourney = buildTeamEventJourney({
  ...playerTeamContext,
  roster: { status: 'LOCKED', ownMember: { role: 'SUP' } },
  nextMatch: { stage: 'SWISS', roundLabel: 'ROUND 6' }
})
assert.equal(scheduledJourney.currentStep.key, 'schedule')
assert.equal(scheduledJourney.completedCount, 3)
assert.equal(scheduledJourney.steps[3].detail, 'SWISS · ROUND 6 · 已安排')

const lockedPlayerContext = {
  seasonId: 'FCR26',
  identities: [{ id: 'player', type: 'PLAYER', isPrimary: true }],
  teamContexts: [{
    ...playerTeamContext,
    registrationStatus: 'LOCKED',
    roster: { status: 'LOCKED', ownMember: { role: 'TANK' } }
  }],
  eventHistory: {
    playerSeasons: [
      { seasonId: 'FCR26', seasonName: 'FCR 2026', isCurrent: true, assignmentStatus: 'LOCKED', mapsPlayed: 0, roster: { role: 'TANK' }, team: { shortName: 'BAN' } },
      { seasonId: 'FCA26', seasonName: 'FCA 2026', seasonStatus: 'ARCHIVED', startsAt: '2026-01-01T00:00:00Z', registrationId: 'registration-old', assignmentStatus: 'LOCKED', mapsPlayed: 8, transferCount: 1, finalRank: '3', roster: { role: 'SUP' }, team: { shortName: 'FRI' } }
    ]
  },
  staffContext: {},
  overview: { tasks: [] }
}
const lockedEligibility = buildPlayerEventEligibility(lockedPlayerContext)
assert.equal(lockedEligibility.key, 'eligible')
assert.equal(lockedEligibility.rosterLabel, '注册名单成员 · 重装')
assert.equal(lockedEligibility.appearanceLabel, '尚未参加正式地图')
const archivedSeasons = buildPlayerEventHistory(lockedPlayerContext)
assert.equal(archivedSeasons.length, 1)
assert.equal(archivedSeasons[0].teamLabel, 'FRI')
assert.equal(archivedSeasons[0].roleLabel, '支援')
assert.equal(archivedSeasons[0].appearanceLabel, '8 张正式地图')
assert.equal(archivedSeasons[0].finalRankLabel, '最终 第 3 名')
const lockedPlayerEventView = buildMyEventsView(lockedPlayerContext)
assert.equal(lockedPlayerEventView.facts[1].value, '正式参赛')
assert.equal(lockedPlayerEventView.playerHistory.length, 1)

const unregisteredEligibility = buildPlayerEventEligibility({ seasonId: 'FCR26', teamContexts: [] })
assert.equal(unregisteredEligibility.key, 'unregistered')
assert.equal(unregisteredEligibility.shortLabel, '尚未报名')

const taskFirstEventView = buildMyEventsView({
  identities: [{ id: 'player', type: 'PLAYER', isPrimary: true }],
  teamContexts: [playerTeamContext],
  staffContext: {},
  overview: { tasks: [{ id: 'task-1', title: '确认队伍邀请', actionUrl: '/me?section=tasks' }] }
})
assert.equal(taskFirstEventView.currentAction.headline, '1 项本届事项等待处理')
assert.equal(taskFirstEventView.currentAction.label, '处理当前待办')

const casterEventView = buildMyEventsView({
  identities: [{ id: 'caster', type: 'CASTER', isPrimary: true }],
  teamContexts: [],
  staffContext: {
    casterAssignments: [{ id: 'assignment-1', match: { id: 'match-2', status: 'PENDING', scheduledAt: '2026-07-20T12:00:00Z' } }],
    participations: [{ role: 'CASTER', status: 'APPROVED' }]
  },
  overview: { tasks: [] }
})
assert.equal(casterEventView.currentAction.headline, '有 1 场解说排班待执行')
assert.equal(casterEventView.staffViews[0].statusLabel, '1 场正式排班')
assert.equal(casterEventView.staffViews[0].upcomingAssignmentCount, 1)
assert.equal(casterEventView.staffViews[0].nextAssignment.id, 'assignment-1')
assert.equal(casterEventView.journey.currentStep.key, 'service')

const completedCasterEventView = buildMyEventsView({
  identities: [{ id: 'caster', type: 'CASTER', isPrimary: true }],
  teamContexts: [],
  staffContext: {
    casterAssignments: [
      { id: 'assignment-complete', match: { id: 'match-complete', status: 'COMPLETE', scheduledAt: '2026-07-20T12:00:00Z' } },
      { id: 'assignment-cancelled', match: { id: 'match-cancelled', status: 'CANCELLED', scheduledAt: '2026-07-21T12:00:00Z' } }
    ],
    participations: [{ role: 'CASTER', status: 'ACTIVE' }]
  },
  overview: { tasks: [] }
})
assert.equal(completedCasterEventView.staffViews[0].assignmentCount, 2)
assert.equal(completedCasterEventView.staffViews[0].upcomingAssignmentCount, 0)
assert.equal(completedCasterEventView.staffViews[0].nextAssignment, null)
assert.equal(completedCasterEventView.currentAction.headline, '本届 2 场解说排班已结束')
assert.equal(completedCasterEventView.journey.steps.at(-1).state, 'done')

const viewerEventView = buildMyEventsView({ identities: [], teamContexts: [], staffContext: {}, overview: { tasks: [] } })
assert.equal(viewerEventView.journey.title, '本届观赛参与路径')
assert.equal(viewerEventView.journey.steps[0].label, '关注赛事')

const myMatchesContext = {
  identities: [{ id: 'player', type: 'PLAYER', isPrimary: true }],
  teamContexts: [{
    registrationId: 'registration-1',
    roles: ['PLAYER'],
    capabilities: { canNegotiateSchedule: false, canEnterMatchRoom: true },
    matches: [
      { id: 'next', status: 'PENDING', scheduledAt: '2026-07-20T12:00:00Z', stage: 'SWISS', roundLabel: 'ROUND 6', teamA: { shortName: 'BAN' }, teamB: { shortName: 'IH' } },
      { id: 'later', status: 'PENDING', scheduledAt: '2026-07-21T12:00:00Z', stage: 'PLAYOFFS', roundLabel: 'SEMI', teamA: { shortName: 'BAN' }, teamB: { shortName: 'FRI' } },
      { id: 'history', status: 'COMPLETE', scheduledAt: '2026-07-18T12:00:00Z', scoreA: 2, scoreB: 0, teamA: { shortName: 'BAN' }, teamB: { shortName: 'OWL' } }
    ]
  }],
  overview: { tasks: [] }
}
const myMatchesView = buildMyMatchesView(myMatchesContext, { now: new Date('2026-07-20T00:00:00Z') })
assert.equal(myMatchesView.nextMatch.id, 'next')
assert.equal(myMatchesView.nextMatch.timeState.key, 'soon')
assert.equal(myMatchesView.nextMatch.scheduleAccess.label, '选手只读')
assert.match(myMatchesView.nextMatch.scheduleAccess.detail, /不代表队伍确认/)
assert.equal(myMatchesView.nextMatch.roomAccess.state, 'LOCKED')
assert.equal(myMatchesView.nextMatch.roomAccess.openMinutesBefore, 15)
assert.equal(myMatchesView.negotiableMatches.length, 0)
assert.equal(myMatchesView.upcomingMatches.length, 1)
assert.equal(myMatchesView.historyMatches[0].score, '2 : 0')
assert.equal(myMatchesView.historyMatches[0].roomAccess.isReadOnly, true)
assert.equal(myMatchesView.historyMatches[0].roomAccess.canEnter, true)
assert.equal(myMatchesView.facts[0].value, '3')

const captainMatchesContext = {
  ...myMatchesContext,
  teamContexts: [{
    ...myMatchesContext.teamContexts[0],
    roles: ['PLAYER', 'CAPTAIN'],
    capabilities: { canNegotiateSchedule: true, canEnterMatchRoom: true }
  }]
}
const captainMatchesView = buildMyMatchesView(captainMatchesContext, { now: new Date('2026-07-20T11:50:00Z') })
assert.equal(captainMatchesView.nextMatch.scheduleAccess.label, '队长可操作')
assert.equal(captainMatchesView.nextMatch.roomAccess.state, 'OPEN')
assert.equal(captainMatchesView.nextMatch.roomAccess.canEnter, true)
assert.equal(captainMatchesView.negotiableMatches.length, 2)

const negotiationTaskView = buildMyMatchesView({
  ...captainMatchesContext,
  overview: { tasks: [{ id: 'schedule-task', title: '确认新的候选比赛时间', actionUrl: '/me?section=team' }] }
}, { now: new Date('2026-07-20T00:00:00Z') })
assert.equal(negotiationTaskView.currentAction.headline, '赛程变更等待你确认')
assert.equal(negotiationTaskView.currentAction.url, '/me?section=matches#schedule-negotiation')

const coachMatchesView = buildMyMatchesView({
  ...myMatchesContext,
  identities: [{ id: 'coach', type: 'COACH', isPrimary: true }],
  teamContexts: [{
    ...myMatchesContext.teamContexts[0],
    roles: ['COACH'],
    capabilities: { canNegotiateSchedule: false, canEnterMatchRoom: false }
  }]
}, { now: new Date('2026-07-20T11:50:00Z') })
assert.equal(coachMatchesView.nextMatch.scheduleAccess.label, '教练只读')
assert.equal(coachMatchesView.nextMatch.roomAccess.canEnter, false)
assert.equal(coachMatchesView.nextMatch.roomAccess.label, '教练无比赛房权限')
assert.equal(coachMatchesView.nextMatch.roomAccess.actionLabel, '教练无比赛房权限')

const emptyManagerMatches = buildMyMatchesView({
  identities: [{ id: 'manager', type: 'MANAGER', isPrimary: true }],
  teamContexts: [],
  overview: { tasks: [] }
})
assert.equal(emptyManagerMatches.currentAction.headline, '等待本届对阵生成')
assert.equal(emptyManagerMatches.currentAction.url, '/me?section=team')

const waitingPlayerStatus = buildPlayerWorkspaceStatus({ teamContexts: [] }, pendingPlayerDossier)
assert.equal(waitingPlayerStatus.key, 'WAITING_TEAM')
assert.equal(waitingPlayerStatus.actionUrl, '/me?section=team')
assert.equal(waitingPlayerStatus.teamLabel, '尚未加入', 'long-term team identity must not be presented as a current-season relationship')
assert.equal(waitingPlayerStatus.rosterLabel, '未进入候选阵容')

const lockedRosterStatus = buildPlayerWorkspaceStatus({
  teamContexts: [{
    registrationStatus: 'APPROVED',
    roles: ['PLAYER'],
    seasonTeam: { shortName: 'BAN' },
    roster: { status: 'LOCKED', ownMember: { role: 'DPS', status: 'ACTIVE' } },
    nextMatch: { id: 'next' },
    matches: [{ id: 'next' }, { id: 'history' }]
  }]
}, pendingPlayerDossier)
assert.equal(lockedRosterStatus.key, 'LOCKED_ROSTER')
assert.equal(lockedRosterStatus.headline, '本届注册名单已锁定')
assert.equal(lockedRosterStatus.matchCount, 2)
assert.equal(lockedRosterStatus.actionUrl, '/me?section=matches')
assert.equal(lockedRosterStatus.teamLabel, 'BAN')
assert.equal(lockedRosterStatus.roleLabel, '输出')

const excludedPlayerStatus = buildPlayerWorkspaceStatus({
  teamContexts: [{
    registrationStatus: 'APPROVED',
    roles: ['PLAYER'],
    seasonTeam: { shortName: 'BAN' },
    roster: { status: 'LOCKED', ownMember: null },
    matches: []
  }]
}, pendingPlayerDossier)
assert.equal(excludedPlayerStatus.key, 'NOT_ROSTERED')
assert.equal(excludedPlayerStatus.tone, 'attention')
assert.match(excludedPlayerStatus.description, /转会期或人工豁免/)

const rosterReviewStatus = buildPlayerWorkspaceStatus({
  teamContexts: [{
    registrationStatus: 'APPROVED',
    roles: ['PLAYER'],
    seasonTeam: { shortName: 'BAN' },
    roster: { status: 'SUBMITTED', ownMember: { role: 'SUPPORT', status: 'ACTIVE' } },
    matches: []
  }]
}, pendingPlayerDossier)
assert.equal(rosterReviewStatus.key, 'ROSTER_REVIEW')
assert.equal(rosterReviewStatus.rosterLabel, '提交名单 · 待审核')

const rankedStatsWorkspace = buildPlayerStatsWorkspace({
  isPublished: true,
  minTimeMins: 30,
  roleEntries: [
    {
      role: 'TANK',
      summary: { role: 'TANK', roleLabel: '重装', roleEn: 'TANK', maps: 5, timeMins: 42, timeLabel: '42 分钟', scoreLabel: '78', eligible: true, rankLabel: '第 3 / 12', scorePercentileLabel: '前 25%', primaryHero: '莱因哈特' },
      heroPool: [{ hero: '莱因哈特' }, { hero: '温斯顿' }],
      recentMatches: [{ matchId: 'match-1' }, { matchId: 'match-2' }]
    },
    {
      role: 'DPS',
      summary: { role: 'DPS', roleLabel: '输出', roleEn: 'DAMAGE', maps: 2, timeMins: 18, timeLabel: '18 分钟', scoreLabel: '—', eligible: false, rankLabel: '—', scorePercentileLabel: '样本不足', primaryHero: '猎空' },
      heroPool: [{ hero: '猎空' }, { hero: '温斯顿' }],
      recentMatches: [{ matchId: 'match-2' }]
    }
  ]
})
assert.equal(rankedStatsWorkspace.status.key, 'RANKED')
assert.equal(rankedStatsWorkspace.primaryRole.key, 'TANK')
assert.equal(rankedStatsWorkspace.totals.maps, 7)
assert.equal(rankedStatsWorkspace.totals.timeLabel, '1 小时 0 分')
assert.equal(rankedStatsWorkspace.totals.heroes, 3)
assert.equal(rankedStatsWorkspace.totals.recentMatches, 2)
assert.equal(rankedStatsWorkspace.roles[1].remainingMinutes, 12)
assert.equal(rankedStatsWorkspace.roles[1].sampleLabel, '还需 12 分钟进入职责排行')

const noAppearanceStatsWorkspace = buildPlayerStatsWorkspace({
  isPublished: true,
  minTimeMins: 30,
  roleEntries: [{ role: 'SUPPORT', summary: { role: 'SUPPORT', roleLabel: '支援', maps: 0, timeMins: 0, eligible: false } }]
})
assert.equal(noAppearanceStatsWorkspace.status.key, 'NO_APPEARANCE')
assert.match(noAppearanceStatsWorkspace.status.description, /一张正式地图/)
assert.equal(buildPlayerStatsWorkspace(pendingPlayerDossier).status.key, 'PENDING')

const identityPanelSource = readFileSync(new URL('../src/features/my-space/IdentitySpacePanels.jsx', import.meta.url), 'utf8')
const mySpacePageSource = readFileSync(new URL('../src/pages/me/MySpacePage.jsx', import.meta.url), 'utf8')
const sectionHeaderSource = readFileSync(new URL('../src/features/my-space/WorkspaceSectionHeader.jsx', import.meta.url), 'utf8')
const followingEmptyStateSource = readFileSync(new URL('../src/components/following/FollowingEmptyState.jsx', import.meta.url), 'utf8')

for (const duplicateHeading of ['<h1>我的赛事</h1>', '<h1>我的比赛</h1>', '<h1>赛管任务</h1>', '<h1>解说安排</h1>']) {
  assert.equal(identityPanelSource.includes(duplicateHeading), false, `${duplicateHeading} must use the shared section heading level`)
}
for (const duplicateHeading of ['<h1>我的关注</h1>', '<h1>我的数据</h1>']) {
  assert.equal(mySpacePageSource.includes(duplicateHeading), false, `${duplicateHeading} must use the shared section heading level`)
}
assert.equal(sectionHeaderSource.includes('<h2>{title}</h2>'), true, 'shared workspace headers must preserve one page-level h1')
assert.match(followingEmptyStateSource, /<h2\b[^>]*>[\s\S]*?<\/h2>/, 'nested following empty states must retain a section heading across locales')
assert.doesNotMatch(followingEmptyStateSource, /<h1\b/, 'nested following empty states must not add another page-level h1')
assert.equal((identityPanelSource.match(/<WorkspaceSectionHeader/g) || []).length, 4, 'all identity workspaces must share the same section header')
assert.equal(mySpacePageSource.includes('open={active}'), false, 'direct navigation must not expand a submenu over the workspace heading')
assert.equal(mySpacePageSource.includes("data-active={active ? 'true' : 'false'}"), true, 'a collapsed group must still indicate the active section')
assert.equal(mySpacePageSource.includes("closest('details')?.removeAttribute('open')"), true, 'choosing an item must close the grouped navigation')
assert.equal(/<SpaceIdentity\b[^>]*context=\{effectiveSpaceContext\}/.test(mySpacePageSource), true, 'all account identities must use one compact space header')
assert.equal(identityPanelSource.includes("withSeason('/me?section=team')}>赛程协商"), false, 'match scheduling actions must stay inside My Matches')
assert.equal(identityPanelSource.includes('/me?section=matches#schedule-negotiation'), true, 'match scheduling actions must target the on-page workspace')
assert.equal(identityPanelSource.includes('nextMatch.roomAccess.canEnter'), true, 'next match must expose the room lifecycle action')
assert.equal(identityPanelSource.includes('本届正式参赛资格已确认'), false, 'eligibility copy must come from the event model rather than be hard-coded into the page')
assert.equal(identityPanelSource.includes('PLAYER EVENT ARCHIVE'), true, 'player events must expose a read-only season archive')
assert.equal(identityPanelSource.includes('OFFICIAL APPEARANCE'), true, 'player eligibility must distinguish formal map appearances from roster membership')
assert.equal(mySpacePageSource.includes('relationLabel="本人"'), false, 'the player stats page must not repeat the owner as a followed-player card')
assert.equal(mySpacePageSource.includes('ROLE SAMPLE'), true, 'player stats must explain the independent role sample methodology')
assert.equal(mySpacePageSource.includes('切换职责档案'), true, 'multi-role players must be able to switch role files')

assert.equal(mySpacePageSource.includes("getHydratedSeasonTeamLabel(effectiveSpaceContext, 'PLAYER')"), true, 'player summaries must prefer the hydrated season-team label')
assert.equal(mySpacePageSource.includes("getHydratedSeasonTeamLabel(effectiveSpaceContext, 'MANAGER')"), true, 'manager summaries must prefer the hydrated season-team label')

const scheduleWorkspaceSource = readFileSync(new URL('../src/features/schedule-negotiation/ScheduleNegotiationWorkspace.jsx', import.meta.url), 'utf8')
assert.equal(scheduleWorkspaceSource.includes('id="schedule-negotiation"'), true, 'the schedule workspace must expose a stable page anchor')

console.log('My Space selector assertions passed.')

assert.equal(mySpacePageSource.includes('const seasonId = competition.id'), true, 'account APIs must use the selected account competition');
