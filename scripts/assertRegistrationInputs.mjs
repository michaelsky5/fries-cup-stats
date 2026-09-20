import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectRegistrationLogoType } from '../src/features/event-registration/registrationLogoInput.js'
import { describeRegistrationError } from '../src/features/event-registration/registrationErrors.js'

test('image detection uses file content, including files without MIME metadata', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  const jpeg = Buffer.from('ffd8ffe000104a464946000101', 'hex')
  const webp = Buffer.from('52494646140000005745425056503820', 'hex')
  assert.equal(detectRegistrationLogoType(png), 'image/png')
  assert.equal(detectRegistrationLogoType(jpeg), 'image/jpeg')
  assert.equal(detectRegistrationLogoType(webp), 'image/webp')
})

test('renaming unsupported or empty files does not make them images', () => {
  for (const bytes of [Buffer.alloc(0), Buffer.from('<svg></svg>'), Buffer.from('GIF89a'), Buffer.from('RIFF----WAVE'), Buffer.from([137, 80, 78])]) {
    assert.equal(detectRegistrationLogoType(bytes), null)
  }
})

test('validation feedback identifies the field and explains server schema errors', () => {
  const message = describeRegistrationError({ message: '请检查必填信息和格式。', data: { issues: [
    { path: ['email'], code: 'invalid_format', format: 'email', message: 'Invalid email address' },
    { path: ['name'], code: 'too_small', minimum: 2, message: 'Too small' },
    { path: ['battleTag'], code: 'invalid_format', message: '请输入完整 BattleTag，包括 # 后的数字。' },
    { path: ['details', 'history'], code: 'too_big', maximum: 1000, message: 'Too big' }
  ] } })
  assert.match(message, /邮箱：请填写完整、有效的邮箱地址/)
  assert.match(message, /队伍名称：至少需要 2 个字符/)
  assert.match(message, /BattleTag：请输入完整 BattleTag/)
  assert.match(message, /队伍资料 \/ 历史赛事表现：不能超过 1000 个字符/)
  assert.doesNotMatch(message, /Invalid|Too small|Too big/)
})
