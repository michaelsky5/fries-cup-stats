import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectRegistrationLogoType } from '../src/features/event-registration/registrationLogoInput.js'
import { describeRegistrationError, translateRegistrationError } from '../src/features/event-registration/registrationErrors.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'

await Promise.all(['en-US', 'ko-KR', 'zh-TW'].map(ensureUiLocale))

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

test('shared-link and V3 eligibility copy is localized, including composed rank labels and notification titles', () => {
  const messages = ['队内共用报名链接', '提交经理审核', '修改已提交的本人资料', '等待经理审核',
    '国籍或国家、地区', 'OWCS 2026 参赛经历', '仅海选／公开预选，未进入正赛名单',
    '进入过任一赛区正赛大名单', '我已阅读规则，以上资料真实，且使用本人战网账号参赛。',
    '请填写真实国籍或国家、地区，不能只填“其他”。', '入队申请已通过', '入队申请需补充', '入队申请未通过',
    '本轮须使用 半决赛（PLAYOFFS） 阶段。', '本轮须使用 决赛（GRAND_FINAL） 阶段。',
    '上次审核名单', '曾列入审核名单', '与最近审核名单重合', '与最近一次审核通过名单比较']
  for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
    for (const message of messages) {
      const actual = translateUiText(message, locale)
      assert.notEqual(actual, message, `${locale}: missing registration copy ${message}`)
      if (locale !== 'zh-TW') assert.doesNotMatch(actual, /[\u4e00-\u9fff]/u)
    }
    const rank = translateUiText('{0}当前段位', locale, [translateUiText('重装', locale)])
    assert.doesNotMatch(rank, /当前段位/)
    const rulebook = translateUiText('阅读周赛 {0} 规则书', locale, ['V2.0'])
    assert.ok(rulebook.includes('V2.0'))
    assert.doesNotMatch(rulebook, /阅读周赛|规则书/)
    const notification = translateUiText('石头#12345 已提交 队伍原名 的本人参赛资料，请审核。', locale)
    assert.ok(notification.includes('石头#12345'))
    assert.ok(notification.includes('队伍原名'))
    if (locale === 'zh-TW') assert.match(notification, /本人參賽資料，請審核/)
    else assert.doesNotMatch(notification, /已提交|本人参赛资料|请审核/)
  }
})

test('multiline registration errors translate each field and issue while retaining values', () => {
  const message = describeRegistrationError({ message: '请检查必填信息、本人确认和格式。', data: { issues: [
    { path: ['eligibility', 'countryOrRegion'], code: 'custom', message: '请填写真实国籍或国家、地区，不能只填“其他”。' },
    { path: ['displayName'], code: 'too_small', minimum: 2, message: 'Too small' },
    { path: ['email'], code: 'invalid_format', format: 'email', message: 'Invalid email address' }
  ] } })
  assert.match(message, /本人参赛资格 \/ 国籍或国家、地区：/)
  for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
    const translated = translateRegistrationError(message, locale)
    assert.equal(translated.split('\n').length, 4)
    assert.ok(translated.includes('2'))
    assert.doesNotMatch(translated, /countryOrRegion|请检查|请填写|Too small|Invalid email/)
    if (locale !== 'zh-TW') assert.doesNotMatch(translated, /[\u4e00-\u9fff]/u)
    assert.equal(translateRegistrationError('UserName#12345: server-code', locale), 'UserName#12345: server-code')
  }
  assert.equal(translateRegistrationError(message, 'zh-CN'), message)
})
