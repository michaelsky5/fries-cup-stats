import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordPolicyHint, validateNewPassword } from '../src/features/auth/passwordPolicy.js'
import { validateAccountPassword } from '../src/features/account-security/accountFoundationSettings.js'
import { validateRecoveryPassword } from '../src/features/account-security/accountRecoveryModel.js'
import { validateWeeklyInvitationPassword } from '../src/features/auth/weeklyInvitationModel.js'
import { registerWithPassword, confirmPasswordReset } from '../src/features/auth/authService.js'
import { changeAccountPassword } from '../src/features/account-security/accountSecurityApi.js'

test('all new-password flows accept both boundaries and reject Unicode, whitespace and out-of-range input', () => {
  for (const password of ['a'.repeat(8), 'A'.repeat(64), 'English!123_-']) {
    assert.equal(validateNewPassword(password), '')
    assert.equal(validateAccountPassword({ currentPassword: '原有密码123!', newPassword: password, confirmation: password }), '')
    assert.equal(validateRecoveryPassword(password, password), '')
    assert.equal(validateWeeklyInvitationPassword({ password, confirmation: password, passwordMode: 'SET' }), '')
  }
  for (const password of ['a'.repeat(7), 'a'.repeat(65), 'a'.repeat(72), '中文密码12345', 'Ａbc123456', 'Emoji123😀', 'English 123', 'English123\n']) {
    assert.ok(validateNewPassword(password))
    assert.ok(validateAccountPassword({ currentPassword: '旧密码123!', newPassword: password, confirmation: password }))
    assert.ok(validateRecoveryPassword(password, password))
    assert.ok(validateWeeklyInvitationPassword({ password, confirmation: password, passwordMode: 'SET' }))
  }
  assert.equal(validateWeeklyInvitationPassword({ password: '原有中文密码123!', passwordMode: 'CONFIRM' }), '')
  assert.equal(validateWeeklyInvitationPassword({ password: 'A'.repeat(72), passwordMode: 'CONFIRM' }), '')
  assert.ok(validateNewPassword('12345678901', 'zh-CN', 12))
})

test('invalid new passwords never reach account APIs and are not silently truncated', async () => {
  const original = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests++; throw new Error('Unexpected request') }
  try {
    for (const password of ['a'.repeat(65), '中文12345', 'short']) {
      for (const operation of [() => registerWithPassword({ email: 'test@example.test', password }), () => confirmPasswordReset('fixture-reset-token', password), () => changeAccountPassword('Legacy密码123', password)]) {
        await assert.rejects(operation(), error => error.status === 400 && error.data.error === 'PASSWORD_POLICY')
      }
    }
    assert.equal(requests, 0)
  } finally { globalThis.fetch = original }
})

test('every supported locale explains the same new password policy', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) {
    assert.match(passwordPolicyHint(locale), /8–64/)
    assert.equal(validateNewPassword('短', locale), passwordPolicyHint(locale))
  }
  assert.doesNotMatch(passwordPolicyHint('en-US'), /[\u4e00-\u9fff]/)
  assert.doesNotMatch(passwordPolicyHint('ko-KR'), /[\u4e00-\u9fff]/)
})
