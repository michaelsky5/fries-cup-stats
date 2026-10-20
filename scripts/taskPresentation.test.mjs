import assert from 'node:assert/strict'
import test from 'node:test'
import { taskTitle } from '../src/features/tasks/taskPresentation.js'
import { translateUiText } from '../src/lib/uiText.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'

await Promise.all(['zh-TW', 'en-US', 'ko-KR'].map(ensureUiLocale))

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
