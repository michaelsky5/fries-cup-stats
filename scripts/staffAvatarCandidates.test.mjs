import test from 'node:test'
import assert from 'node:assert/strict'
import { getStaffAvatar, getStaffAvatarCandidates } from '../src/lib/reviewAssets.js'

test('published avatars take precedence over verified local identity aliases', () => {
  const published = 'https://admin.fries-cup.com/api/media/avatars/public.webp'
  const local = getStaffAvatar('桑榆', { knownOnly: true })
  assert.ok(local)
  assert.deepEqual(getStaffAvatarCandidates({
    staff_name: '宇星', avatar: published, battle_tag: '桑榆#52192', aliases: ['桑榆']
  }), [published, local])
  assert.deepEqual(getStaffAvatarCandidates({ name: '宇星', avatar: published, battleTag: '桑榆#52192' }), [published, local])
})

test('missing public avatars never invent a local file or another identity', () => {
  for (const name of ['洛少爷', 'Rira', '啊哼讨厌']) assert.deepEqual(getStaffAvatarCandidates({ name }), [])
  assert.deepEqual(getStaffAvatarCandidates({ name: 'Unlisted staff', aliases: [null, {}, ''] }), [])
  assert.deepEqual(getStaffAvatarCandidates(), [])
})
