import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { safeLobbyReturn, accountFailure, roleLabel, statusLabel, leavesLobbyPage, lobbyReadFailure, canPublishLobby, lobbyRegistrationMessage, lobbyCardCopy, needsLabel, ERROR_COPY, FIELD_COPY, retryableRead, uncertainWrite, contactReason, contactResultKind } from '../src/features/team-lobby/lobbyModel.js'
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

test('post fields say what a team needs and what a player offers, in every locale', () => {
  const team = lobbyCardCopy('TEAM', 'zh-CN'), player = lobbyCardCopy('PERSON', 'zh-CN')
  assert.equal(team.bio, '队伍介绍与招募要求')
  assert.match(team.bioPlaceholder, /^队伍现状：.*\n希望你：.*\n我们提供：/)
  assert.equal(team.levelLabel, '段位要求')
  // A team's rank requirement is not a claim about anyone's verified rank.
  assert.equal(team.levelNote, '')
  assert.equal(player.levelLabel, '段位')
  assert.equal(player.levelNote, '（非官方认证）')
  assert.match(team.availability, /北京时间/)
  const sources = new Set(lobbyCopyRows.map(row => row[0]))
  for (const kind of ['TEAM', 'PERSON']) {
    for (const value of Object.values(lobbyCardCopy(kind, 'zh-CN'))) if (value) assert.ok(sources.has(value), `missing copy row: ${value}`)
    for (const locale of ['en-US', 'ko-KR']) for (const value of Object.values(lobbyCardCopy(kind, locale))) assert.doesNotMatch(value, /[一-鿿]/)
  }
  assert.equal(needsLabel([{ role: 'TANK', count: 1 }, { role: 'SUP', count: 2 }]), '重装 1 人 · 支援 2 人')
  assert.equal(needsLabel(null), '')
})

test('every literal lobby interface string has a four-locale copy row', () => {
  const sources = new Set(lobbyCopyRows.map(row => row[0]))
  const directory = new URL('../src/features/team-lobby/', import.meta.url)
  const missing = []
  for (const name of readdirSync(directory).filter(file => /\.jsx?$/.test(file) && file !== 'lobbyCopy.js')) {
    const text = readFileSync(new URL(name, directory), 'utf8')
    for (const match of text.matchAll(/\b(?:t|say)\(\s*(["'])((?:\\.|(?!\1).)*)\1/g)) {
      const source = match[2].replace(/\\n/g, '\n').replace(/\\(["'\\])/g, '$1')
      if (!sources.has(source)) missing.push(`${name}: ${source}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('lobby errors speak our own words and never render a raw response body', () => {
  const gateway = '<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>'
  assert.equal(accountFailure({ status: 502, data: gateway, message: gateway }), '请求未完成，请稍后重试。')
  assert.equal(accountFailure({ status: 404, data: { error: 'CARD_UNAVAILABLE', message: '这张卡片已下线或暂不可联系。' } }), '这张卡片已下线或暂不可用。')
  assert.equal(accountFailure({ status: 400, data: { error: 'INVALID_INPUT', message: 'Too small: expected string to have >=1 characters',
    issues: [{ code: 'too_small', origin: 'string', path: ['availability'] }] } }), '请填写「可赛／训练时间（北京时间）」，不能只输入空格。')
  assert.equal(accountFailure({ status: 400, data: { error: 'INVALID_INPUT', message: '公开资料请勿填写私人联系方式或外部链接。' } }), '公开资料请勿填写私人联系方式或外部链接。')
  assert.equal(accountFailure({ status: 400, data: { error: 'INVALID_INPUT', issues: [{ code: 'custom', path: ['unknown'] }] } }), '提交的内容未通过检查，请修改后重试。')
  assert.equal(accountFailure({ status: 429, retryAfterMs: 90000, data: { error: 'RATE_LIMITED', message: 'Too many requests. Please retry shortly.' } }), '操作较频繁，请约 2 分钟后重试。')
  assert.equal(accountFailure({ status: 403, data: { error: 'LOBBY_RESTRICTED', message: '多次发布引流信息' } }), '大厅操作暂受限制：多次发布引流信息')
  assert.equal(accountFailure({ status: 401, data: { error: 'SOMETHING_NEW', message: 'Authentication required' } }), '登录状态已失效，请重新登录。')
  // Unknown codes keep the server's Chinese wording only in Simplified Chinese; English text never leaks.
  assert.equal(accountFailure({ status: 409, data: { error: 'SOMETHING_NEW', message: '服务端说明' } }), '服务端说明')
  assert.equal(accountFailure({ status: 409, data: { error: 'SOMETHING_NEW', message: 'Server diagnostic' } }), '请求未完成，请稍后重试。')
  assert.equal(accountFailure(new Error('请至少选择一个岗位。')), '请至少选择一个岗位。')
  const sources = new Set(lobbyCopyRows.map(row => row[0]))
  for (const value of [...Object.values(ERROR_COPY), ...Object.values(FIELD_COPY)]) assert.ok(sources.has(value), `missing copy row: ${value}`)
})

test('reads explain what happened without implying a write, and say when retrying helps', () => {
  assert.equal(lobbyReadFailure({ status: 404, data: { error: 'CARD_UNAVAILABLE' } }), '这张卡片已下线或暂不可用。')
  assert.equal(lobbyReadFailure({ status: 404, data: { error: 'NOT_FOUND' } }), '没有找到这条记录，请刷新后核对。')
  assert.equal(lobbyReadFailure({ status: 401, data: { error: 'UNAUTHORIZED' } }), '登录状态已失效，请重新登录。')
  assert.equal(lobbyReadFailure({ status: 502, data: '<html>' }), '组队大厅暂时无法读取，请稍后重试。已有记录会保留。')
  assert.equal(retryableRead({ data: { error: 'CARD_UNAVAILABLE' } }), false)
  assert.equal(retryableRead({ status: 500, data: { error: 'LOBBY_UNAVAILABLE' } }), true)
  assert.equal(uncertainWrite({ data: { error: 'INVALID_INPUT' } }), false)
  assert.equal(uncertainWrite({ data: { error: 'LOBBY_CONFLICT' } }), true)
  assert.equal(uncertainWrite(new TypeError('Failed to fetch')), true)
})

test('contact copy is written for the side reading it', () => {
  assert.equal(contactResultKind({ status: 'PENDING', received: false, message: '你好，想试训。' }, ' 你好，想试训。 '), 'SENT')
  // The server returns an existing open contact instead of saving the new message.
  assert.equal(contactResultKind({ status: 'PENDING', received: false, message: '上周发的留言' }, '你好，想试训。'), 'EXISTING')
  assert.equal(contactResultKind({ status: 'PENDING', received: true, message: '欢迎来试训' }, '你好，想试训。'), 'AWAITING_YOU')
  assert.equal(contactResultKind({ status: 'CONNECTED', received: true, message: '欢迎来试训' }, '你好'), 'CONNECTED')
  assert.equal(contactReason('REQUEST_EXPIRED', true), '你没有在有效期内回应，请求已到期。')
  assert.equal(contactReason('REQUEST_EXPIRED', false), '对方未在有效期内回应。')
  assert.equal(contactReason('DECLINED', true), '你已选择暂不联系。')
  assert.equal(contactReason('DECLINED', false), '对方暂不联系。')
  assert.equal(contactReason('UNKNOWN_REASON', true), '')
})
