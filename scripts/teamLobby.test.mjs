import assert from 'node:assert/strict'
import test from 'node:test'
import { safeLobbyReturn, accountFailure, roleLabel, statusLabel, leavesLobbyPage, lobbyReadFailure, canPublishLobby, lobbyRegistrationMessage } from '../src/features/team-lobby/lobbyModel.js'
import { lobbyText, lobbyNoticeCopy, lobbyCopyRows } from '../src/features/team-lobby/lobbyCopy.js'

test('account continuation only retains a local lobby destination and public reading state', () => {
  assert.equal(safeLobbyReturn('/lobby/me/publish?type=person'), '/lobby/me/publish?type=person')
  assert.equal(safeLobbyReturn('/lobby?type=teams&role=SUP&page=2&qq=12345678&verifyEmail=secret'), '/lobby?type=teams&role=SUP&page=2')
  for (const value of ['https://outside.example/lobby', '//outside.example', '/lobby/../account', '/lobby\\outside', '/lobby\nnext', '', null]) assert.equal(safeLobbyReturn(value), '/lobby')
})
test('registration conflicts and uncertain submissions have actionable distinct explanations', () => {
  assert.match(accountFailure({ data: { error: 'USER_EXISTS' } }), /登录或找回/)
  assert.match(accountFailure({ data: { error: 'USERNAME_EXISTS' } }), /换一个/)
  assert.match(accountFailure({ data: { outcomeUnknown: true } }), /先查看账号或本人记录/)
  assert.match(accountFailure({ name: 'TypeError' }), /暂时无法确认/)
  assert.match(accountFailure({ data: { error: 'REGISTRATION_CAPACITY_REACHED', retryAfter: 60 } }), /已有账号仍可登录.*UTC\+8/)
  assert.match(accountFailure({ data: { code: 'EMAIL_QUOTA_RESERVED', retryAfter: 'invalid' } }), /邮件额度暂时不足/)
})
test('lobby labels retain non-official forming and lifecycle meaning', () => {
  assert.equal(roleLabel('SUP'), '支援')
  assert.equal(statusLabel('APPROVED'), '核对通过')
  assert.equal(statusLabel('RETURNED'), '退回修改')
  assert.equal(statusLabel('HIDDEN'), '管理员隐藏')
})

test('unavailable or read-only lobbies do not advertise publishing or leak server diagnostics', () => {
  const missingRoute = { status: 404, message: 'Route GET:/api/lobby/config not found' }
  const databaseFailure = { status: 500, message: 'database private connection diagnostic' }
  for (const failure of [missingRoute, databaseFailure, new TypeError('Failed to fetch')]) {
    assert.equal(lobbyReadFailure(failure), '组队大厅暂时无法读取，请稍后重试。已有记录会保留。')
    assert.equal(canPublishLobby({ mode: 'WRITE' }, failure), false)
  }
  assert.equal(lobbyReadFailure({ data: { error: 'LOBBY_OFF' } }), '组队大厅暂未开放')
  for (const config of [null, {}, { mode: 'OFF' }, { mode: 'READ_ONLY' }, { mode: 'UNKNOWN' }]) {
    assert.equal(canPublishLobby(config, null), false)
  }
  assert.equal(canPublishLobby({ mode: 'WRITE' }, null), true)
  assert.equal(lobbyRegistrationMessage(null), null)
  assert.equal(lobbyRegistrationMessage({}), null)
  assert.equal(lobbyRegistrationMessage({ selfRegistrationEnabled: false }), '普通注册暂未开放，已有账号仍可登录。')
  assert.equal(lobbyRegistrationMessage({ selfRegistrationEnabled: true }), '新人可以自行注册，无需先入队或报名。')
})

test('language-only navigation keeps a draft, while changing a record or tab prompts before leaving', () => {
  const here = { pathname: '/lobby/me', search: '?tab=contacts&requestId=one&lang=zh' }
  assert.equal(leavesLobbyPage(here, { ...here, search: '?lang=en&requestId=one&tab=contacts' }), false)
  assert.equal(leavesLobbyPage(here, { ...here, search: '?tab=contacts&requestId=two&lang=en' }), true)
  assert.equal(leavesLobbyPage(here, { ...here, pathname: '/lobby' }), true)
  const id = '12345678-1234-1234-1234-123456789abc'
  assert.equal(safeLobbyReturn(`/lobby/me?tab=contacts&requestId=${id}&qq=secret&lang=ko`), `/lobby/me?tab=contacts&lang=ko&requestId=${id}`)
})

test('localization preserves authored moderation reasons and interpolated names', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) {
    const original = '组队联系状态已更新'
    assert.equal(lobbyNoticeCopy({ type: 'LOBBY_MODERATION_RESULT', title: '大厅需求或权限已更新', body: original }, locale).body, original)
    assert.equal(lobbyNoticeCopy({ type: 'LOBBY_FORMATION_RESULT', title: '筹建招募需要修改', body: original }, locale).body, original)
    assert.equal(lobbyText('UNKNOWN ORIGINAL 用户留言', [], locale), 'UNKNOWN ORIGINAL 用户留言')
    assert.ok(lobbyText('{0}（组队中）', ['原始队名 <&>'], locale).includes('原始队名 <&>'))
  }
  assert.equal(lobbyNoticeCopy({ type: 'LOBBY_CONTACT_REQUEST', title: '收到新的组队联系', body: '请到我的组队查看需求，再决定是否愿意联系。' }, 'en-US').title, 'New team contact request')
  assert.equal(new Set(lobbyCopyRows.map(row => row[0])).size, lobbyCopyRows.length)
  for (const [source, ...values] of lobbyCopyRows) for (const value of values) {
    assert.ok(value.trim())
    assert.deepEqual([...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort(), [...source.matchAll(/\{\d+\}/g)].map(match => match[0]).sort())
  }
})
