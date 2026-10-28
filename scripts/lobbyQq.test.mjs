import assert from 'node:assert/strict'
import test from 'node:test'
import { qqChatUrl, contactPurpose, qqContactStatus } from '../src/features/team-lobby/lobbyQq.js'
import { qqCopyRows } from '../src/features/team-lobby/lobbyQqCopy.js'

test('QQ link accepts only a number and never lets input choose a scheme', () => {
  for (const value of ['', '123', '0' + '123456', 'javascript:alert(1)', '12345&uin=99999', '1234567890123']) assert.equal(qqChatUrl(value), null)
  assert.match(qqChatUrl('12345678'), /^tencent:\/\/message\/\?uin=12345678&/)
  assert.match(qqChatUrl('12345678', true), /^mqqwpa:\/\/im\/chat\?chat_type=wpa&uin=12345678&/)
})
test('contact labels distinguish approval and an actual QQ view', () => {
  const identity = value => value
  assert.equal(qqContactStatus({ status: 'CONNECTED' }, identity), 'QQ 已授权')
  assert.equal(qqContactStatus({ status: 'CONNECTED', firstViewedAt: '2026-10-28' }, identity), 'QQ 已查看')
  assert.equal(contactPurpose('RECRUITING', identity), '帮队伍找人')
  assert.equal(qqContactStatus({ status: 'ENDED' }, identity), null)
})
test('all new contact copy has complete translations with matching placeholders', () => {
  const sources = new Set()
  for (const row of qqCopyRows) {
    assert.equal(row.length, 4); assert.equal(sources.has(row[0]), false, row[0]); sources.add(row[0])
    for (const value of row) { assert.ok(value.trim()); assert.deepEqual(value.match(/\{\d+\}/g) || [], row[0].match(/\{\d+\}/g) || []) }
  }
})
