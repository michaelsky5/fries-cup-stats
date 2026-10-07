import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { canEditJoinApplication, canWithdrawJoinApplication, joinApplicationStatusLabel } from '../src/features/event-registration/registrationJoinModel.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'

test('manager acceptance is not final approval when the application creates an addition', () => {
  const pending = { status: 'ACCEPTED', addition: { status: 'SUBMITTED' } }
  assert.equal(joinApplicationStatusLabel(pending), '等待管理员审核增员')
  assert.equal(canEditJoinApplication(pending), false)
  assert.equal(canWithdrawJoinApplication(pending), true)
  const approved = { status: 'ACCEPTED', addition: { status: 'APPROVED' } }
  assert.equal(joinApplicationStatusLabel(approved), '已加入队内名单')
  assert.equal(canEditJoinApplication(approved), false)
  assert.equal(canWithdrawJoinApplication(approved), false)
})

test('returned, rejected and cancelled applications can be edited without withdrawing approved membership', () => {
  assert.equal(canEditJoinApplication(null), true)
  for (const status of ['PENDING', 'RETURNED', 'REJECTED', 'WITHDRAWN']) assert.equal(canEditJoinApplication({ status }), true)
  for (const status of ['REJECTED', 'CANCELLED']) {
    const application = { status: 'ACCEPTED', addition: { status } }
    assert.equal(canEditJoinApplication(application), true)
    assert.equal(canWithdrawJoinApplication(application), false)
  }
  assert.equal(canEditJoinApplication({ status: 'ACCEPTED', addition: null }), false)
  assert.equal(canWithdrawJoinApplication({ status: 'ACCEPTED', addition: null }), false)
})

test('original registration receipts preserve their existing states', () => {
  assert.equal(joinApplicationStatusLabel({ status: 'ACCEPTED' }), '已进入报名名单')
  assert.equal(joinApplicationStatusLabel({ status: 'RETURNED' }), '需要补充资料')
  assert.equal(joinApplicationStatusLabel({ status: 'WITHDRAWN', addition: { status: 'CANCELLED' } }), '增员申请已取消')
  assert.equal(canWithdrawJoinApplication(null), false)
  assert.equal(canWithdrawJoinApplication({ status: 'PENDING' }), true)
})

test('manager link visibility and acceptance use backend capabilities rather than the editable initial roster', () => {
  const source = readFileSync(new URL('../src/features/event-registration/SharedRegistrationJoin.jsx', import.meta.url), 'utf8')
  assert.ok(source.includes('data?.canManageLink ?? editable'))
  assert.ok(source.includes('data?.canAcceptApplications ?? editable'))
  assert.ok(source.includes('disabled={busy || !canAccept}'))
  assert.ok(source.includes("action('OPEN')"))
  assert.ok(source.includes('canEditJoinApplication(application)'))
  assert.ok(source.includes('canWithdrawJoinApplication(item)'))
  assert.ok(source.includes('result.application?.addition'))
})

test('long-lived invitation states and consent are localized', async () => {
  const messages = ['队伍邀请链接', '等待管理员审核增员', '经理通过并提交增员审核', '延长链接有效期', '续期并保留原链接',
    '队伍报名正在审核，可以先提交本人资料；已送审名单不会改变。', '取得正式参赛资格前，仍需赛事管理员审核报名或增员申请。']
  for (const locale of ['zh-TW', 'en-US', 'ko-KR']) {
    await ensureUiLocale(locale)
    for (const message of messages) assert.notEqual(translateUiText(message, locale), message, `${locale}: ${message}`)
  }
})
