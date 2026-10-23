import assert from 'node:assert/strict'
import test from 'node:test'
import { taskTitle, taskBody } from '../src/features/tasks/taskPresentation.js'
import { accountDateTime } from '../src/features/account-ui/accountDateTime.js'
import { translateUiText } from '../src/lib/uiText.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'

await Promise.all(['zh-TW', 'en-US', 'ko-KR'].map(ensureUiLocale))

test('generated task bodies translate UI fragments while retaining custom names and manual notes', () => {
  const name = '全部待办'
  const task = { bodyCopy: { prefix: [name, { key: '第 {0} 周', values: [2] }], key: '提交出赛名单' } }
  assert.equal(taskBody(task, 'en-US'), `${name} · Week 2 · Submit the lineup`)
  assert.equal(taskBody({ body: '提交出赛名单' }, 'en-US'), '提交出赛名单')
  assert.equal(taskBody({ bodyCopy: { key: '{0} 已开放登记。登记后再按周选择是否参赛。', values: [name] } }, 'en-US'), `Registration for ${name} is open. After registering, choose whether to play each week.`)
})

test('account dates keep UTC+8 across locales and handle missing or invalid data', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) {
    const value = '2026-10-20T18:05:00Z'
    const expected = new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
    assert.equal(accountDateTime(value, locale), expected)
    assert.equal(accountDateTime('bad-date', locale), accountDateTime(null, locale))
  }
})

test('generated task labels localize without translating team names', () => {
  const team = '提交出赛名单'
  const task = { title: `${team} · 提交出赛名单`, titleCopy: { prefix: team, key: '提交出赛名单' } }
  assert.equal(taskTitle(task, 'zh-CN'), '提交出赛名单 · 提交出赛名单')
  assert.equal(taskTitle(task, 'zh-TW'), '提交出赛名单 · 提交出賽名單')
  assert.equal(taskTitle(task, 'en-US'), '提交出赛名单 · Submit the lineup')
  assert.equal(taskTitle(task, 'ko-KR'), '提交出赛名单 · 출전 명단 제출')
})
test('result review preserves match and team names and substitutes only UI text', () => {
  const task = { titleCopy: { prefix: '中文队 vs B', key: '核对 {0} 的本场赛果', values: ['中文队'] } }
  assert.equal(taskTitle(task, 'en-US'), '中文队 vs B · Review the match result for 中文队')
  assert.equal(taskTitle(task, 'zh-TW'), '中文队 vs B · 核對 中文队 的本場賽果')
  assert.equal(taskTitle({ title: '提交出赛名单' }, 'en-US'), '提交出赛名单', 'manually authored copy is not interpreted as UI')
})
test('new heading and guest copy exists in every non-default locale', () => {
  for (const key of ['邮箱管理', '赛事路径', '登录 / 注册 →', '登记参赛赛段', '登录后管理个人资料与账号安全。', '登录或注册账号，管理个人资料与安全设置。参赛身份通过邀请或报名关联。']) {
    for (const locale of ['zh-TW', 'en-US', 'ko-KR']) assert.notEqual(translateUiText(key, locale), key, key + ' / ' + locale)
  }
})
