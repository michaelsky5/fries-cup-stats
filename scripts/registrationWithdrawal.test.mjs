import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'

test('only owners of draft or returned registrations see withdrawal; approved teams and archived seasons stay protected', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { default: Action } = await vite.ssrLoadModule('/src/features/event-registration/RegistrationWithdrawalAction.jsx')
    const record = { id: 'duplicate-draft', name: 'Accidental duplicate', revision: 4, status: 'DRAFT' }
    const props = { record, owner: true, seasonStatus: 'ACTIVE', busy: false, perform: () => assert.fail('Rendering must never withdraw a registration') }
    const render = input => renderToStaticMarkup(createElement(Action, { ...props, ...input }))
    for (const status of ['DRAFT', 'RETURNED']) {
      const html = render({ record: { ...record, status } })
      assert.match(html, /撤回这份报名/)
      assert.match(html, /保留记录/)
      assert.match(html, /释放本赛季的负责人名额/)
    }
    for (const status of ['APPROVED', 'SUBMITTED', 'WITHDRAWN', 'UNKNOWN']) assert.equal(render({ record: { ...record, status } }), '')
    assert.equal(render({ owner: false }), '')
    assert.equal(render({ seasonStatus: 'ARCHIVED' }), '')
    assert.match(render({ busy: true }), /disabled=""/)
  } finally { await vite.close() }
})

test('withdrawal, retained history, the submitted-to-draft distinction and conflict recovery are translated', async () => {
  const sources = [
    '撤回这份报名？', '撤回这份报名', '保留报名', '确认撤回报名',
    '待确认的邀请将失效，报名记录和已填写资料保留。撤回后，你可以创建新的报名或接任其他队伍。',
    '本操作不会删除长期队伍，也不会退出你已加入的其他队伍。',
    '不再使用这份草稿？撤回后保留记录，并释放本赛季的负责人名额。',
    '报名已撤回，记录和资料已保留。你现在可以创建新的报名或接任其他队伍。',
    '报名已退回草稿，可修改后重新提交。若不再使用，请点击“撤回这份报名”释放负责人名额。',
    '这份报名已撤回，仅保留历史记录，不再占用本赛季的负责人名额。',
    '接任者已负责本赛季另一份报名。若只是误建草稿，请接任者进入本赛季报名页，点击“撤回这份报名”后重试；已通过的正式队伍请联系赛事管理员。'
  ]
  for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
    await ensureUiLocale(locale)
    for (const source of sources) {
      const translated = translateUiText(source, locale)
      assert.notEqual(translated, source, `${locale}: ${source}`)
      if (locale !== 'zh-TW') assert.doesNotMatch(translated, /[\u4e00-\u9fff]/u)
    }
  }
})
