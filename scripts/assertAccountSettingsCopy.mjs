import assert from 'node:assert/strict'
import { translateAccountSettingsText as translate } from '../src/features/account-ui/accountSettingsCopy.js'
import { translateLegacyValue } from '../src/lib/legacyTranslationState.js'

const original = translateLegacyValue('账号概览', null, 'en-US', translate)
assert.equal(original.rendered, 'Overview')
assert.equal(translateLegacyValue(original.rendered, original, 'zh-CN', translate).rendered, '账号概览', 'Returning to Chinese must restore the original source')
const count = translateLegacyValue('2 条有效登录', null, 'en-US', translate)
assert.equal(translateLegacyValue('1 条有效登录', count, 'en-US', translate).rendered, '1 active sign-ins', 'A refreshed API count must replace the old translated value')
assert.equal(translate('状态待确认', 'en-US'), 'Status unknown')
assert.equal(translate('暂未同步', 'en-US'), 'Unavailable')
assert.equal(translate('验证邮件未投递，请稍后重试或联系赛事负责人。', 'en-US'), 'The verification email was not delivered. Try again later or contact the organizer.')
assert.equal(translate('已结束其他 2 条登录，当前设备保持登录。', 'en-US'), 'Ended 2 other sign-ins. This device stays signed in.')
assert.equal(translate('显示确认新密码', 'en-US'), 'Show confirm new password')
assert.equal(translate('你自己的昵称', 'en-US'), '你自己的昵称')
assert.equal(translate('2 条有效登录', 'zh-CN'), '2 条有效登录')
assert.equal(translateLegacyValue('赛事总览', null, 'en-US').rendered, 'Overview', 'Existing callers keep the default translator')
console.log('Account settings copy passed: language restoration, fresh device counts, unknown states, delivery failures and default translation compatibility.')
