import assert from 'node:assert/strict'
import {
  buildAccountIdentity,
  findVerifiedAccountIdentity,
  getAccountCapabilities,
  resolveAccountIdentityTarget
} from '../src/features/auth/accountIdentity.js'

const requests = [
  {
    id: 'old-player',
    seasonId: 'FCA26',
    status: 'APPROVED',
    identityType: 'PLAYER',
    targetType: 'PLAYER',
    targetId: 'player-1',
    teamId: 'TEAM-A',
    reviewedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'current-manager',
    seasonId: 'FCR26',
    status: 'APPROVED',
    identityType: 'manager',
    targetType: 'team',
    targetId: 'Manager Name',
    teamId: 'TEAM-B',
    reviewedAt: '2026-07-01T00:00:00Z'
  }
]

const identity = buildAccountIdentity({ requests, seasonId: 'FCR2026' })
assert.equal(identity.status, 'APPROVED')
assert.equal(identity.identityType, 'MANAGER')
assert.equal(identity.teamId, 'TEAM-B')

const capabilities = getAccountCapabilities(identity)
assert.equal(capabilities.canAccessTeamSpace, true)
assert.equal(capabilities.canAccessPlayerSpace, false)

const target = resolveAccountIdentityTarget(identity, {
  teams: [{ team_id: 'team-b', team_short_name: 'B', team_name: 'Team B' }],
  players: []
})
assert.equal(target.teamRouteId, 'team-b')

const academyIdentity = buildAccountIdentity({ requests, seasonId: 'FCA2026' })
assert.equal(academyIdentity.identityType, 'PLAYER')
assert.equal(academyIdentity.targetId, 'player-1')

const playerTarget = resolveAccountIdentityTarget(academyIdentity, {
  teams: [{ team_id: 'TEAM-A', team_short_name: 'A', team_name: 'Team A' }],
  players: [{ player_id: 'player-1', team_id: 'TEAM-A' }]
})
assert.equal(playerTarget.playerRouteId, 'player-1')
assert.equal(playerTarget.teamRouteId, 'TEAM-A')

const multiIdentity = {
  id: 'long-term-player',
  identityType: 'PLAYER',
  status: 'APPROVED',
  isVerified: true,
  seasonId: 'FCR26',
  targetType: 'PLAYER',
  targetId: 'current-player',
  teamId: 'TEAM-B',
  battleTag: 'player#1234',
  contexts: [
    {
      id: 'fcr-context',
      seasonId: 'FCR26',
      targetType: 'PLAYER',
      targetId: 'current-player',
      teamId: 'TEAM-B',
      reviewedAt: '2026-07-02T00:00:00Z'
    },
    {
      id: 'fca-context',
      seasonId: 'FCA26',
      targetType: 'PLAYER',
      targetId: 'academy-player',
      teamId: 'TEAM-A',
      reviewedAt: '2026-05-02T00:00:00Z'
    }
  ]
}

const academyContext = buildAccountIdentity({ primaryIdentity: multiIdentity, seasonId: 'FCA2026' })
assert.equal(academyContext.targetId, 'academy-player')
assert.equal(academyContext.teamId, 'TEAM-A')
assert.equal(academyContext.sourceRequestId, 'fca-context')

const aggregateCapabilities = getAccountCapabilities(academyContext, [
  multiIdentity,
  { identityType: 'MANAGER', status: 'APPROVED', isVerified: true }
])
assert.equal(aggregateCapabilities.canAccessPlayerSpace, true)
assert.equal(aggregateCapabilities.canAccessTeamSpace, true)

const nonPlayerPrimary = {
  identityType: 'REFEREE',
  status: 'ACTIVE',
  isVerified: true,
  reviewedAt: '2026-07-03T00:00:00Z'
}
const playerFromAllIdentities = findVerifiedAccountIdentity(
  [nonPlayerPrimary, multiIdentity],
  'PLAYER',
  'FCA2026'
)
assert.equal(playerFromAllIdentities.identityType, 'PLAYER')
assert.equal(playerFromAllIdentities.targetId, 'academy-player', 'a non-primary player identity should retain the requested season context')
assert.equal(playerFromAllIdentities.teamId, 'TEAM-A')

const nonPlayerTarget = resolveAccountIdentityTarget(playerFromAllIdentities, {
  teams: [{ team_id: 'TEAM-A', team_short_name: 'A' }],
  players: [{ player_id: 'academy-player', team_id: 'TEAM-A' }]
})
assert.equal(nonPlayerTarget.playerRouteId, 'academy-player', 'My Space should resolve the player target even when another identity is primary')
assert.equal(findVerifiedAccountIdentity([nonPlayerPrimary], 'PLAYER', 'FCA2026'), null)

const collectionOnlyCapabilities = getAccountCapabilities(null, [multiIdentity])
assert.equal(collectionOnlyCapabilities.canSubmitVerifiedFeedback, true, 'any verified identity should enable verified-account feedback')
assert.equal(collectionOnlyCapabilities.feedbackSourceLevel, 'VERIFIED')

console.log('Account identity assertions passed.')
