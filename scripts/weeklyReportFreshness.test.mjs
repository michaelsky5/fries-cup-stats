import test from 'node:test'
import assert from 'node:assert/strict'
import { latestNewspaperIssue, newspaperIssueDate, newspaperWeekLabel, unpublishedNewspaperWeeks } from '../src/features/weekly-report/weeklyReportPresentation.js'

// 票 2.28: the shape the public archive returns (report.week carries id and number only).
const issue = (id, week_number, publishedAt) => ({ publishedAt, report: { week: { id, week_number } } })
const issues = [
  issue('w3', 3, '2026-10-11T09:19:51.643Z'),
  issue('w4', 4, '2026-10-14T07:30:53.345Z'),
  issue('w1', 1, '2026-10-11T09:21:28.602Z'),
  issue('w2', 2, '2026-10-11T09:19:16.057Z')
]
const weeks = [
  { id: 'w1', week_number: 1, status: 'CLOSED', phase: 'REGULAR' },
  { id: 'w2', week_number: 2, status: 'CLOSED', phase: 'REGULAR' },
  { id: 'w3', week_number: 3, status: 'CLOSED', phase: 'REGULAR' },
  { id: 'w4', week_number: 4, status: 'CLOSED', phase: 'REGULAR' },
  { id: 'w6', week_number: 6, status: 'CLOSED', phase: 'PLAYOFFS' },
  { id: 'w5', week_number: 5, status: 'CLOSED', phase: 'QUALIFIER' }
]

test('the newest issue is the highest week, not the latest backfill', () => {
  assert.equal(latestNewspaperIssue(issues).report.week.id, 'w4')
  assert.equal(latestNewspaperIssue([]), null)
  assert.equal(latestNewspaperIssue([{ report: {} }]), null)
  const revised = issue('w4', 4, '2026-10-15T01:00:00.000Z')
  assert.equal(latestNewspaperIssue([...issues, revised]), revised, 'same week: the later publication wins')
})

test('finished weeks without an issue are listed in week order', () => {
  assert.deepEqual(unpublishedNewspaperWeeks(weeks, issues).map(week => week.id), ['w5', 'w6'])
  const live = weeks.map(week => week.id === 'w6' ? { ...week, status: 'IN_PROGRESS' } : week)
  assert.deepEqual(unpublishedNewspaperWeeks(live, issues).map(week => week.id), ['w5'], 'a week still being played is not missing an issue')
  assert.deepEqual(unpublishedNewspaperWeeks(weeks.slice(0, 4), issues), [])
  assert.deepEqual(unpublishedNewspaperWeeks(weeks, []).map(week => week.week_number), [1, 2, 3, 4, 5, 6])
})

test('issue dates are Beijing-time month and day', () => {
  assert.equal(newspaperIssueDate('2026-10-14T07:30:53.345Z', 'zh-CN'), '10/14')
  assert.equal(newspaperIssueDate('2026-10-14T07:30:53.345Z', 'en-US'), '14/10')
  assert.equal(newspaperIssueDate('2026-10-13T17:00:00.000Z', 'zh-CN'), '10/14', 'after 16:00 UTC it is already the next day in UTC+8')
  for (const value of [null, '', 'soon']) assert.equal(newspaperIssueDate(value, 'zh-CN'), '')
})

test('week labels name the phase when the week is not an ordinary prelim week', () => {
  assert.equal(newspaperWeekLabel(weeks[3], 'zh-CN'), '第 4 周')
  assert.equal(newspaperWeekLabel({ week_number: 4 }, 'zh-CN'), '第 4 周')
  assert.equal(newspaperWeekLabel(weeks[5], 'zh-CN'), '第 5 周（晋级加赛）')
  assert.equal(newspaperWeekLabel(weeks[4], 'zh-CN'), '第 6 周（季后赛）')
  assert.equal(newspaperWeekLabel(weeks[4], 'en-US'), 'Week 6 (Playoffs)')
  assert.equal(newspaperWeekLabel(weeks[3], 'ko-KR'), '4주차')
  assert.equal(newspaperWeekLabel(weeks[3], 'zh-TW'), '第 4 週')
  assert.equal(newspaperWeekLabel(weeks[5], 'ko-KR'), '5주차 (진출권 결정전)')
  assert.equal(newspaperWeekLabel(weeks[5], 'zh-TW'), '第 5 週（晉級加賽）')
  assert.equal(newspaperWeekLabel(weeks[4], 'zh-TW'), '第 6 週（季後賽）')
})
