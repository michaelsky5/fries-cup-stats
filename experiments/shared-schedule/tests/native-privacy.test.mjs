import test from 'node:test'
import assert from 'node:assert/strict'
import { createNativePrivacyGuard, invokeNativePrivacyApi } from '../src/account/nativePrivacy.js'
test('callback-only native APIs wait for the actual privacy result and ignore duplicate completion', async () => {
  let complete
  const pending = invokeNativePrivacyApi(options => { complete = options.success })
  complete({ needAuthorization: false }); complete({ needAuthorization: true })
  assert.equal((await pending).needAuthorization, false)
  let approved = false
  await createNativePrivacyGuard({ getSetting: options => options.success({ needAuthorization: true }), authorize: options => { approved = true; options.success({}) } })()
  assert(approved)
})
test('a silent privacy settings callback exits with a bounded error', async () => {
  await assert.rejects(invokeNativePrivacyApi(() => undefined, 5), /超时/)
})
test('native privacy checks request authorization only when WeChat reports it is needed', async () => {
  let calls = 0
  await createNativePrivacyGuard({ getSetting: async () => ({ needAuthorization: false }), authorize: async () => calls++ })()
  assert.equal(calls, 0)
  await createNativePrivacyGuard({ getSetting: async () => ({ needAuthorization: true }), authorize: async () => calls++ })()
  assert.equal(calls, 1)
})
test('missing privacy capability, unavailable settings and denial cannot silently continue into login', async () => {
  await assert.rejects(createNativePrivacyGuard({})(), /更新微信/)
  await assert.rejects(createNativePrivacyGuard({ getSetting: async () => ({}), authorize: async () => {} })(), /核对隐私/)
  await assert.rejects(createNativePrivacyGuard({ getSetting: async () => ({ needAuthorization: true }), authorize: async () => { throw new Error('user-declined') } })(), /隐私指引/)
})
