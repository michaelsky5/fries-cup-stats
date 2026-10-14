import assert from 'node:assert/strict'
import test from 'node:test'
import { getStaffMatchDisplay } from '../src/features/staff-credits/staffCreditsCopy.js'

const match = (status, a = null, b = null) => ({
  status,
  scheduled_date: '2026-10-11',
  scheduled_time: '21:00',
  team_a: { score: a },
  team_b: { score: b }
})

test('scheduled credits show upcoming even if a stale score is present', () => {
  for (const status of ['PENDING', 'SCHEDULED', 'PUBLISHED', 'READY', 'UPCOMING']) {
    assert.deepEqual(getStaffMatchDisplay(match(status), 'zh-CN'), { label: '待赛', isScore: false })
    assert.deepEqual(getStaffMatchDisplay(match(status, 0, 0), 'zh-CN'), { label: '待赛', isScore: false })
  }
})

test('completed, live and review records retain published scores including zero', () => {
  for (const status of ['COMPLETED', 'LIVE', 'RESULT_REVIEW', 'PENDING_REVIEW', 'ADMIN_COMPLETED', 'WALKOVER']) {
    assert.deepEqual(getStaffMatchDisplay(match(status, 0, 3), 'zh-CN'), { label: '0 : 3', isScore: true })
  }
})

test('cancelled and postponed records do not expose stale scores', () => {
  assert.deepEqual(getStaffMatchDisplay(match('CANCELLED', 4, 1), 'zh-CN'), { label: '已取消', isScore: false })
  assert.deepEqual(getStaffMatchDisplay(match('VOID', 4, 1), 'zh-CN'), { label: '已取消', isScore: false })
  assert.deepEqual(getStaffMatchDisplay(match('POSTPONED', 4, 1), 'zh-CN'), { label: '已延期', isScore: false })
})

test('missing results show their lifecycle rather than an empty score', () => {
  assert.deepEqual(getStaffMatchDisplay(match('LIVE'), 'zh-CN'), { label: '进行中', isScore: false })
  assert.deepEqual(getStaffMatchDisplay(match('RESULT_REVIEW'), 'zh-CN'), { label: '结果待审核', isScore: false })
  assert.deepEqual(getStaffMatchDisplay(match('COMPLETED'), 'zh-CN'), { label: '已结束', isScore: false })
  assert.deepEqual(getStaffMatchDisplay(match('UNCONFIRMED', 0, 0), 'zh-CN'), { label: '状态待更新', isScore: false })
})

test('upcoming labels follow the selected public locale', () => {
  assert.equal(getStaffMatchDisplay(match('PENDING'), 'en-US').label, 'Upcoming')
  assert.equal(getStaffMatchDisplay(match('PENDING'), 'ko-KR').label, '예정')
  assert.equal(getStaffMatchDisplay(match('PENDING'), 'zh-TW').label, '待賽')
})
