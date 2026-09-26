import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roomBroadcastUrl } from '../src/features/weekly-competition/roomBroadcastLinks.js'

test('broadcast connections remain on the configured System origin and only point to the read-only feed', () => {
  assert.equal(roomBroadcastUrl('/api/weekly-broadcast/FCW26-M1', 'https://admin.fries-cup.com'), 'https://admin.fries-cup.com/api/weekly-broadcast/FCW26-M1')
  for (const path of ['//other.test/api/weekly-broadcast/a', '/api/weekly-live-rooms/a', '/api/weekly-broadcast/../admin', '/api/weekly-broadcast/a?token=secret']) assert.equal(roomBroadcastUrl(path, 'https://admin.fries-cup.com'), '')
  for (const origin of ['', 'https://user:secret@admin.fries-cup.com', 'javascript:alert(1)', 'not a URL']) assert.equal(roomBroadcastUrl('/api/weekly-broadcast/a', origin), '')
})
