import assert from 'node:assert/strict'
import test from 'node:test'
import { partnerActivationTarget } from '../src/features/auth/partnerActivationTarget.js'

test('old Stats invitations keep only the token fragment and use the configured System origin', () => {
  const base = 'https://admin.example.test/ignored'
  const address = new URL(partnerActivationTarget({ base, search: '?token=old-token&returnTo=https://untrusted.example', hash: '#token=current-token' }))
  assert.equal(address.origin, 'https://admin.example.test')
  assert.equal(address.pathname, '/activate-partner')
  assert.equal(address.search, '')
  assert.equal(address.hash, '#token=current-token')
  assert.equal(new URL(partnerActivationTarget({ base, search: '?token=legacy-token' })).hash, '#token=legacy-token')
  assert.equal(new URL(partnerActivationTarget({ base, hash: '#token=one&token=two' })).hash, '')
  assert.equal(partnerActivationTarget({ base: 'javascript:alert(1)' }), '')
  assert.equal(partnerActivationTarget({ base: 'https://name:secret@example.test' }), '')
})
