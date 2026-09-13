import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildEventRegistrationJourney,
  buildManagerApplicationQueue,
  buildManagerPeopleWorkspace,
  buildManagerTeamOperationsView,
  buildPlayerRegistrationFlow,
  hasVerifiedIdentity
} from '../src/features/event-registration/eventRegistrationModel.js'
import { ACCOUNT_PREVIEW_IDENTITIES, ACCOUNT_PREVIEW_SCENARIOS, buildAccountDesignPreviewFixture } from '../src/pages/dev/accountDesignPreviewFixtures.js'

assert.equal(hasVerifiedIdentity([{ type: 'player', status: 'active' }], 'PLAYER'), true)
assert.equal(hasVerifiedIdentity([{ identityType: 'MANAGER', isVerified: true }], 'manager'), true)
assert.equal(hasVerifiedIdentity([{ type: 'PLAYER', status: 'PENDING' }], 'PLAYER'), false)

const pendingFlow = buildPlayerRegistrationFlow({
  applications: [
    { id: 'old', status: 'REJECTED', createdAt: '2026-07-01T00:00:00Z' },
    { id: 'current', status: 'PENDING', createdAt: '2026-07-10T00:00:00Z' }
  ],
  invitations: [{ id: 'invite', status: 'PENDING', createdAt: '2026-07-11T00:00:00Z' }]
})

assert.equal(pendingFlow.pendingApplication.id, 'current')
assert.equal(pendingFlow.pendingInvitations.length, 1)
assert.equal(pendingFlow.canApply, false)
assert.equal(pendingFlow.headlineStatus, 'INVITED', 'an actionable invitation must take priority over a passive pending application')
assert.equal(pendingFlow.steps[1].value, '确认队伍邀请')
assert.equal(pendingFlow.recentActivity[0].id, 'old')

const applicationOnlyFlow = buildPlayerRegistrationFlow({
  applications: [{ id: 'application-only', status: 'PENDING', createdAt: '2026-07-12T00:00:00Z' }],
  invitations: []
})
assert.equal(applicationOnlyFlow.headlineStatus, 'PENDING')
assert.equal(applicationOnlyFlow.steps[1].value, '等待经理审核')

const rosterFlow = buildPlayerRegistrationFlow({
  rosterMembership: { status: 'CANDIDATE', rosterStatus: 'LOCKED' },
  applications: [{ id: 'accepted', status: 'ACCEPTED', reviewedAt: '2026-07-12T00:00:00Z' }]
}, [{ registrationId: '', roster: { ownMember: { role: 'SUP' } } }])

assert.equal(rosterFlow.canApply, false)
assert.equal(rosterFlow.headlineStatus, 'LOCKED')
assert.equal(rosterFlow.steps[1].state, 'done')
assert.equal(rosterFlow.steps[2].state, 'done')
assert.equal(rosterFlow.membershipTitle, '本届注册名单')

const excludedFlow = buildPlayerRegistrationFlow({
  applications: [{
    id: 'accepted-but-excluded',
    status: 'ACCEPTED',
    reviewedAt: '2026-07-14T00:00:00Z',
    registration: { status: 'LOCKED', team: { shortName: 'BAN' } }
  }]
})

assert.equal(excludedFlow.selectionOutcome.isFinal, true)
assert.equal(excludedFlow.headlineStatus, 'NOT_SELECTED')
assert.equal(excludedFlow.steps[2].state, 'attention')
assert.equal(excludedFlow.canApply, true)

const reappliedFlow = buildPlayerRegistrationFlow({
  applications: [
    { id: 'old-accepted', status: 'ACCEPTED', reviewedAt: '2026-07-10T00:00:00Z' },
    { id: 'new-pending', status: 'PENDING', createdAt: '2026-07-16T00:00:00Z' }
  ]
})

assert.equal(reappliedFlow.selectionOutcome, null)
assert.equal(reappliedFlow.headlineStatus, 'PENDING')
assert.equal(reappliedFlow.steps[1].value, '等待经理审核')

const managerQueue = buildManagerApplicationQueue([
  { id: 'accepted', status: 'ACCEPTED', reviewedAt: '2026-07-12T00:00:00Z' },
  { id: 'pending', status: 'PENDING', createdAt: '2026-07-13T00:00:00Z' },
  { id: 'withdrawn', status: 'WITHDRAWN', createdAt: '2026-07-11T00:00:00Z' }
])

assert.deepEqual(managerQueue.pending.map(item => item.id), ['pending'])
assert.deepEqual(managerQueue.recent.map(item => item.id), ['accepted', 'withdrawn'])

const managerNoRegistration = buildManagerTeamOperationsView({
  team: { shortName: 'BAN', name: 'Banana' },
  registration: null
})
assert.equal(managerNoRegistration.focusKey, 'registration')
assert.equal(managerNoRegistration.headline, '提交本届队伍报名')
assert.equal(managerNoRegistration.facts[0].value, '尚未报名')

const managerApplicationAction = buildManagerTeamOperationsView({
  team: { shortName: 'BAN', name: 'Banana' },
  registration: {
    status: 'APPROVED',
    recruitmentMode: 'OPEN',
    applications: [{ id: 'pending-1', status: 'PENDING' }, { id: 'accepted-1', status: 'ACCEPTED' }],
    roster: {
      status: 'DRAFT',
      members: Array.from({ length: 5 }, (_, index) => ({ id: `candidate-${index}`, status: 'ACTIVE' }))
    }
  }
})
assert.equal(managerApplicationAction.focusKey, 'people')
assert.equal(managerApplicationAction.headline, '处理 1 条选手申请')
assert.equal(managerApplicationAction.recruitmentLabel, '公开招募')
assert.deepEqual(managerApplicationAction.facts.map(fact => fact.value), ['报名已通过', '1 条', '5 人', '名单草稿'])

const managerRosterAction = buildManagerTeamOperationsView({
  registration: {
    status: 'APPROVED',
    applications: [],
    roster: {
      status: 'DRAFT',
      members: Array.from({ length: 6 }, (_, index) => ({ id: `candidate-${index}`, status: 'ACTIVE' }))
    }
  }
})
assert.equal(managerRosterAction.focusKey, 'roster')
assert.equal(managerRosterAction.headline, '配置并提交正式名单')

const managerLockedAction = buildManagerTeamOperationsView({
  registration: {
    status: 'LOCKED',
    applications: [],
    roster: {
      status: 'LOCKED',
      members: Array.from({ length: 7 }, (_, index) => ({ id: `candidate-${index}`, status: 'ACTIVE' }))
    }
  }
})
assert.equal(managerLockedAction.tone, 'done')
assert.equal(managerLockedAction.headline, '本届报名和正式名单已经完成')
assert.equal(managerLockedAction.facts.every(fact => fact.state === 'done'), true)

const managerPeopleQueue = buildManagerPeopleWorkspace({
  status: 'APPROVED',
  applications: [
    { id: 'pending-1', status: 'PENDING' },
    { id: 'accepted-1', status: 'ACCEPTED' }
  ],
  roster: {
    status: 'DRAFT',
    members: [
      { id: 'active-1', status: 'ACTIVE' },
      { id: 'active-2', status: 'ACTIVE' },
      { id: 'removed-1', status: 'REMOVED' }
    ]
  }
})
assert.equal(managerPeopleQueue.headline, '1 条选手申请等待决定')
assert.equal(managerPeopleQueue.candidateCount, 2)
assert.equal(managerPeopleQueue.missingMinimum, 3)
assert.equal(managerPeopleQueue.availableSlots, 5)
assert.equal(managerPeopleQueue.removedMembers.length, 1)
assert.equal(managerPeopleQueue.canEditCandidates, true)

const managerPeopleFull = buildManagerPeopleWorkspace({
  status: 'APPROVED',
  applications: [],
  roster: {
    status: 'DRAFT',
    members: Array.from({ length: 7 }, (_, index) => ({ id: `full-${index}`, status: 'ACTIVE' }))
  }
})
assert.equal(managerPeopleFull.headline, '候选阵容已达到 7 人上限')
assert.equal(managerPeopleFull.availableSlots, 0)
assert.equal(managerPeopleFull.tone, 'done')

const managerPeopleFrozen = buildManagerPeopleWorkspace({
  status: 'APPROVED',
  applications: [{ id: 'pending-frozen', status: 'PENDING' }],
  roster: { status: 'SUBMITTED', members: Array.from({ length: 5 }, (_, index) => ({ id: `submitted-${index}`, status: 'ACTIVE' })) }
})
assert.equal(managerPeopleFrozen.headline, '正式名单审核期间已冻结人员调整')
assert.equal(managerPeopleFrozen.canEditCandidates, false)

const managerJourney = buildEventRegistrationJourney({
  hasManagerIdentity: true,
  managerTeams: [{
    team: { shortName: 'BAN', name: 'Banana' },
    registration: {
      status: 'APPROVED',
      applications: [{ id: 'pending-player', status: 'PENDING' }],
      roster: {
        status: 'DRAFT',
        members: Array.from({ length: 5 }, (_, index) => ({ id: `member-${index}`, status: 'ACTIVE' }))
      }
    }
  }]
})
assert.equal(managerJourney.mode, 'manager')
assert.equal(managerJourney.headline, '处理 1 条选手申请')
assert.deepEqual(managerJourney.stages.map(stage => stage.state), ['done', 'done', 'current', 'upcoming', 'upcoming'])

const newManagerJourney = buildEventRegistrationJourney({ hasManagerIdentity: true, managerTeams: [] })
assert.equal(newManagerJourney.stages[0].state, 'current')
assert.equal(newManagerJourney.headline, '先建立你的长期队伍')

const playerJourney = buildEventRegistrationJourney({ hasPlayerIdentity: true, playerFlow: pendingFlow })
assert.equal(playerJourney.mode, 'player')
assert.equal(playerJourney.headline, '确认队伍邀请')
assert.equal(playerJourney.stages[1].state, 'current')

const applicationPlayerJourney = buildEventRegistrationJourney({ hasPlayerIdentity: true, playerFlow: applicationOnlyFlow })
assert.equal(applicationPlayerJourney.stages[2].state, 'current')

const lockedPlayerJourney = buildEventRegistrationJourney({ hasPlayerIdentity: true, playerFlow: rosterFlow })
assert.equal(lockedPlayerJourney.stages.every(stage => stage.state === 'done'), true)

const invitedCoachJourney = buildEventRegistrationJourney({
  hasCoachIdentity: true,
  coachMemberships: [{
    status: 'ACTIVE',
    team: { shortName: 'BAN', name: 'Banana' },
    registration: { id: 'registration-1' },
    eventRelationship: { status: 'INVITED' }
  }]
})
assert.equal(invitedCoachJourney.mode, 'coach')
assert.equal(invitedCoachJourney.headline, '确认本届正式教练邀请')
assert.equal(invitedCoachJourney.stages[3].state, 'current')

const activeCoachJourney = buildEventRegistrationJourney({
  hasCoachIdentity: true,
  coachMemberships: [{
    status: 'ACTIVE',
    team: { shortName: 'BAN', name: 'Banana' },
    registration: { id: 'registration-1' },
    eventRelationship: { status: 'ACTIVE' }
  }]
})
assert.equal(activeCoachJourney.stages.every(stage => stage.state === 'done'), true)

const waitingCoachJourney = buildEventRegistrationJourney({ hasCoachIdentity: true, coachMemberships: [] })
assert.equal(waitingCoachJourney.stages[0].state, 'done')
assert.equal(waitingCoachJourney.stages[1].state, 'current')

assert.equal(buildEventRegistrationJourney().mode, 'viewer')

const accountPreviewFixture = buildAccountDesignPreviewFixture('applications')
assert.equal(accountPreviewFixture.spaceContext.primaryIdentityType, 'MANAGER')
assert.equal(accountPreviewFixture.eventRegistration.context.managerTeams[0].registration.applications.filter(item => item.status === 'PENDING').length, 2)
assert.equal(accountPreviewFixture.eventRegistration.freeAgents.some(agent => accountPreviewFixture.eventRegistration.context.managerTeams[0].registration.roster.members.some(member => member.player.id === agent.player.id)), false, 'preview free agents must not duplicate current candidates')
assert.deepEqual(ACCOUNT_PREVIEW_SCENARIOS.map(item => item.id), ['unregistered', 'recruiting', 'applications', 'roster', 'submitted', 'locked'])
assert.deepEqual(ACCOUNT_PREVIEW_IDENTITIES.map(item => item.id), ['MANAGER', 'PLAYER', 'COACH', 'REFEREE', 'CASTER', 'VIEWER', 'MULTI'])
assert.equal(buildAccountDesignPreviewFixture('locked', 'VIEWER').spaceContext.overview.nextStaffAssignment, null, 'viewer preview must not inherit a referee assignment')
assert.equal(buildAccountDesignPreviewFixture('locked', 'REFEREE').spaceContext.staffContext.refereeAssignments.length, 1, 'referee preview must expose only referee work')
assert.equal(buildAccountDesignPreviewFixture('locked', 'CASTER').spaceContext.staffContext.casterAssignments.length, 1, 'caster preview must expose only caster work')
assert.deepEqual(buildAccountDesignPreviewFixture('locked', 'MULTI').spaceContext.identities.map(item => item.type), ['MANAGER', 'PLAYER', 'CASTER'])

const registrationWorkspaceSource = readFileSync(new URL('../src/features/event-registration/EventRegistrationWorkspace.jsx', import.meta.url), 'utf8')
const mySpacePageSource = readFileSync(new URL('../src/pages/me/MySpacePage.jsx', import.meta.url), 'utf8')
const accountPreviewSource = readFileSync(new URL('../src/pages/dev/AccountDesignPreviewPage.jsx', import.meta.url), 'utf8')
const routerSource = readFileSync(new URL('../src/app/router.jsx', import.meta.url), 'utf8')
assert.equal(registrationWorkspaceSource.indexOf('className={styles.applicationNote}') < registrationWorkspaceSource.indexOf('className={styles.recruitingGrid}'), true, 'player application role and note must appear before the recruiting team cards')
assert.equal(registrationWorkspaceSource.includes('ScheduleNegotiationWorkspace'), false, 'schedule negotiation must not be embedded in the roster page')
assert.equal(mySpacePageSource.includes('<ScheduleNegotiationWorkspace seasonId={seasonId}'), true, 'schedule negotiation must live under relationship matches')
assert.equal(registrationWorkspaceSource.includes('managerOverviewFocus'), true, 'manager overview must expose one dynamic daily focus')
assert.equal(registrationWorkspaceSource.includes('managerTabs'), true, 'manager team work must be split into stable submenus')
assert.equal(registrationWorkspaceSource.includes("data-panel=\"overview\""), true, 'manager overview must remain the default daily workspace')
assert.equal(registrationWorkspaceSource.includes("data-panel=\"applications\""), true, 'player applications must have a dedicated submenu')
assert.equal(registrationWorkspaceSource.includes("data-panel=\"roster\""), true, 'season roster must have a dedicated submenu')
assert.equal(registrationWorkspaceSource.includes("data-panel=\"long-term\""), true, 'long-term relationships must have a dedicated submenu')
assert.equal(registrationWorkspaceSource.includes('managerPrimaryMode = hasRequiredAction ? \'task\' : nextMatch ? \'match\' : \'waiting\''), true, 'required work must override the next-match focus')
assert.equal(registrationWorkspaceSource.includes('managerPeopleWorkspace'), true, 'manager application review and candidate roster must share one decision workspace')
assert.equal(registrationWorkspaceSource.includes('previewData'), true, 'account design preview must bypass live event-context loading')
assert.equal(accountPreviewSource.includes('embed=1'), true, 'responsive preview must render inside a real-width iframe')
assert.equal(routerSource.includes("import.meta.env.DEV ?"), true, 'the account design preview route must remain development-only')

console.log('Event registration UI model assertions passed.')
