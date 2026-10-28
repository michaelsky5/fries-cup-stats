// Start System's synthetic serve-lobby-qq-fixture.mjs and this frontend first.
// Uses only the isolated fixture's credentials; never accepts production origins.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const systemRoot = process.env.LOBBY_REVIEW_SYSTEM_ROOT
assert.ok(systemRoot, 'Set LOBBY_REVIEW_SYSTEM_ROOT to the isolated System fixture checkout.')
const fixture = JSON.parse(readFileSync(path.join(systemRoot, '.tmp/lobby-qq-review/fixture.json'), 'utf8'))
const { chromium } = createRequire(path.join(systemRoot, 'package.json'))('playwright-core')
const origin = 'http://127.0.0.1:55438', directory = '.tmp/lobby-qq-rollout'
mkdirSync(directory, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = [], errors = [], unsupportedCalls = []
async function page(legacy) {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 1000 } })
  const item = await context.newPage()
  item.setDefaultTimeout(15000)
  item.on('pageerror', error => errors.push(error.message))
  if (legacy) await context.route('**/api/platform/lobby/**', async route => {
    const request = route.request(), url = new URL(request.url())
    if (request.method() !== 'GET') {
      if (/\/cards\/[^/]+\/contact$|\/qq-settings$/.test(url.pathname)) unsupportedCalls.push(url.pathname)
      return route.continue()
    }
    const response = await route.fetch(), body = await response.json()
    if (body.card) delete body.card.qqMode
    if (body.cards) for (const card of body.cards) delete card.qqMode
    await route.fulfill({ response, json: body })
  })
  return item
}
async function login(item, who) {
  await item.goto(origin + '/account/login?returnTo=%2Flobby%2Fme')
  await item.getByLabel('邮箱', { exact: true }).fill(fixture.users[who].email)
  await item.getByLabel('密码', { exact: true }).fill(fixture.password)
  await item.getByRole('button', { name: '登录', exact: true }).click()
  await item.getByRole('heading', { name: '我的组队', exact: true }).waitFor()
}
async function step(name, run) { await run(); results.push(name); console.log('PASS rollout: ' + name) }
try {
  const oldApi = await page(true), newApi = await page(false)
  await step('old card responses keep the existing personal-card entry and hide unsupported QQ settings', async () => {
    await login(oldApi, 'viewer')
    await oldApi.goto(origin + '/lobby/me?tab=cards')
    await oldApi.getByRole('heading', { name: fixture.users.viewer.displayName, exact: true }).waitFor()
    assert.equal(await oldApi.getByRole('button', { name: '设置 QQ', exact: true }).count(), 0)
    await oldApi.goto(origin + '/lobby/cards/' + fixture.cards.direct.publicId)
    await oldApi.getByText('代表队伍联系需要负责人身份。', { exact: false }).waitFor()
    assert.equal(await oldApi.getByRole('button', { name: '查看 QQ 并通知对方', exact: true }).count(), 0)
  })
  await step('old API contract still sends the existing consented mutual-contact request', async () => {
    await oldApi.goto(origin + '/lobby/cards/' + fixture.cards.team.publicId)
    await oldApi.getByRole('button', { name: '申请联系', exact: true }).click()
    const dialog = oldApi.getByRole('dialog', { name: '联系 ' + fixture.cards.team.title, exact: true })
    await dialog.getByLabel('简短留言', { exact: false }).fill('希望了解周末招募安排。')
    await dialog.getByLabel('本次联系 QQ', { exact: true }).fill('12345678')
    await dialog.getByRole('checkbox').check()
    const [response] = await Promise.all([oldApi.waitForResponse(value => value.url().endsWith('/lobby/contacts') && value.request().method() === 'POST'), dialog.getByRole('button', { name: '发送联系请求', exact: true }).click()])
    assert.equal(response.status(), 200)
    assert.equal((await response.json()).contact.status, 'PENDING')
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await oldApi.screenshot({ path: directory + '/old-api-compatible.png', fullPage: true })
    assert.deepEqual(unsupportedCalls, [])
  })
  await step('new API contract enables ordinary-account QQ viewing and the publisher settings', async () => {
    await login(newApi, 'fresh')
    await newApi.goto(origin + '/lobby/cards/' + fixture.cards.direct.publicId)
    await newApi.getByRole('button', { name: '查看 QQ 并通知对方', exact: true }).click()
    const dialog = newApi.getByRole('dialog', { name: '联系 ' + fixture.cards.direct.title, exact: true })
    assert.equal(await dialog.locator('input[inputmode=numeric]').count(), 0)
    await dialog.getByRole('button', { name: '确认查看 QQ', exact: true }).click()
    await dialog.locator('output').waitFor()
    assert.equal(await dialog.locator('output').innerText(), '27182818')
    await newApi.screenshot({ path: directory + '/new-api-enabled.png', fullPage: true })
    const owner = await page(false)
    await login(owner, 'owner')
    await owner.getByRole('button', { name: '设置 QQ', exact: true }).waitFor()
  })
  assert.deepEqual(errors, [])
  writeFileSync(directory + '/results.json', JSON.stringify({ passed: results.length, results, pageErrors: errors, unsupportedCalls, syntheticOnly: true, oldContract: 'QQ mode omitted from genuine fixture API responses' }, null, 2))
  console.log('Rollout browser: 3/3 passed; no unsupported calls against the old contract.')
} finally { await browser.close() }
