import assert from 'node:assert/strict'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  findCapability,
  isCapabilityDeniedError,
  resolveCapabilityAccess
} from '../src/features/capabilities/capabilityUi.js'

const snapshot = {
  capabilities: [
    {
      key: 'roster.final.submit',
      scope: 'TEAM',
      granted: true,
      sources: [{ type: 'EVENT_TEAM_RELATION', registrationId: 'registration-1' }],
      requirement: '是该赛事报名的有效经理。',
      deniedReason: null
    },
    {
      key: 'player.team.apply',
      scope: 'SEASON',
      granted: true,
      sources: [{ type: 'IDENTITY', id: 'identity-player' }],
      deniedReason: null
    },
    {
      key: 'schedule.confirm',
      scope: 'TEAM',
      granted: false,
      sources: [],
      requirement: '是该队经理、队长或副队长。',
      deniedReason: '是该队经理、队长或副队长。'
    }
  ]
}

assert.equal(findCapability(snapshot, 'roster.final.submit')?.scope, 'TEAM')
assert.equal(resolveCapabilityAccess(snapshot, 'roster.final.submit', { registrationId: 'registration-1' }).allowed, true)
assert.equal(resolveCapabilityAccess(snapshot, 'roster.final.submit', { registrationId: 'registration-2' }).allowed, false)
assert.equal(resolveCapabilityAccess(snapshot, 'player.team.apply', { registrationId: 'registration-2' }).allowed, true)
assert.equal(resolveCapabilityAccess(null, 'roster.final.submit').allowed, true, 'missing snapshots stay backward compatible')
assert.equal(resolveCapabilityAccess(snapshot, 'new.server.capability').known, false)
assert.match(capabilityBlockText(resolveCapabilityAccess(snapshot, 'schedule.confirm')), /^账号权限：/)

const organizationSnapshot = {
  capabilities: [{
    key: 'team.manager.transfer',
    scope: 'ORGANIZATION',
    granted: true,
    sources: [{ type: 'TEAM_ORGANIZATION_RELATION', organizationId: 'org-1' }],
    requirement: '是该长期队伍的有效经理。',
    deniedReason: null
  }]
}
assert.equal(resolveCapabilityAccess(organizationSnapshot, 'team.manager.transfer', { organizationId: 'org-1' }).allowed, true)
assert.equal(resolveCapabilityAccess(organizationSnapshot, 'team.manager.transfer', { organizationId: 'org-2' }).allowed, false)

const deniedError = {
  data: {
    error: 'CAPABILITY_DENIED',
    details: {
      requiredCapability: 'schedule.confirm',
      deniedReason: '当前账号没有有效的队伍代表关系。'
    }
  }
}
assert.equal(isCapabilityDeniedError(deniedError), true)
assert.match(capabilityDeniedMessage(deniedError), /schedule\.confirm/)
assert.match(capabilityDeniedMessage(deniedError), /有效的队伍代表关系/)
assert.equal(capabilityDeniedMessage({ data: { error: 'SCHEDULE_WINDOW_CLOSED' } }), '')

console.log('Capability UI gating assertions passed.')
