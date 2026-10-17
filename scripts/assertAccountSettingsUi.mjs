import assert from 'node:assert/strict'
import { readRecoveryProgress, synchronizeAfterCredentialChange, validateRecoveryApplication, validateRecoveryPassword } from '../src/features/account-security/accountRecoveryModel.js'
import { accountSettingsError } from '../src/features/account-security/accountFoundationSettings.js'

// Retire assertions for the unused security panel, keep meaningful live input
// boundaries. Browser/API acceptance covers the actual new routes and forms.
assert.equal(validateRecoveryPassword('1234567', '1234567'), '新密码至少需要 8 位。')
assert.equal(validateRecoveryPassword('password1', 'password2'), '两次输入的新密码不一致。')
assert.equal(validateRecoveryPassword('密'.repeat(25), '密'.repeat(25)), '新密码不能超过 72 个 UTF-8 字节。')
assert.equal(validateRecoveryPassword('密'.repeat(24), '密'.repeat(24)), '')
assert.equal(validateRecoveryPassword('x'.repeat(72), 'x'.repeat(72)), '')
assert.equal(validateRecoveryPassword('x'.repeat(73), 'x'.repeat(73)), '新密码不能超过 72 个 UTF-8 字节。')
for (const code of ['EMAIL_ALREADY_IN_USE', 'EMAIL_UNCHANGED', 'EMAIL_VERIFICATION_REQUIRED', 'RECOVERY_TOKEN_INVALID', 'RECOVERY_TOKEN_EXPIRED', 'RECOVERY_ACCOUNT_CHANGED']) assert.notEqual(accountSettingsError({ data: { error: code } }), '操作未完成，请稍后重试。')
console.log('Account email and recovery input/error boundaries passed.')

assert.equal(await synchronizeAfterCredentialChange(async () => { throw { status: 401 } }), '')
assert.match(await synchronizeAfterCredentialChange(async () => { throw new TypeError('offline') }), /变更已完成/)
assert.match(validateRecoveryApplication({ currentEmail: 'Same@local.example.test', newEmail: 'same@local.example.test', reason: '足够详细的登录原因描述', evidence: '足够详细且可以通过原有渠道独立核验的账号线索说明' }), /不同/)
const tokens = new URLSearchParams({ verify: 'synthetic-verification', request: 'synthetic-status' }), verified = { current: false }
let attempts = 0, reads = 0
const transport = async path => {
  if (path.endsWith('/verify')) { attempts++; if (attempts === 1) throw new TypeError('offline'); return {} }
  reads++; return { request: { status: 'PENDING_REVIEW' } }
}
await assert.rejects(readRecoveryProgress(tokens, transport, verified), TypeError)
assert.equal((await readRecoveryProgress(tokens, transport, verified)).request.status, 'PENDING_REVIEW')
await readRecoveryProgress(tokens, transport, verified)
assert.equal(attempts, 2); assert.equal(reads, 2)
for (const code of ['RECOVERY_TOKEN_INVALID', 'RECOVERY_TOKEN_EXPIRED']) {
  const data = await readRecoveryProgress(tokens, async path => { if (path.endsWith('/verify')) throw { data: { error: code } }; return { request: { status: 'EXPIRED' } } }, { current: false })
  assert.equal(data.request.status, 'EXPIRED')
}
console.log('Recovery retry, consumed links and successful-write session synchronization passed.')
