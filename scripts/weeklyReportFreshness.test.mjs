import test from 'node:test'
import assert from 'node:assert/strict'
import { isNewspaperIssueWeek, latestNewspaperIssue, newspaperIssueDate, newspaperIssueStamp, newspaperIssueTitle, newspaperStageLabel, newspaperWeekLabel, unpublishedNewspaperWeeks } from '../src/features/weekly-report/weeklyReportPresentation.js'

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

// 票 2.49: four prelim issues and one 季后赛专刊; the 晋级加赛 belongs to the playoffs and is never due an issue.
test('finished weeks without an issue are listed in week order; the qualifier is never missing one', () => {
  assert.deepEqual(unpublishedNewspaperWeeks(weeks, issues).map(week => week.id), ['w6'])
  const live = weeks.map(week => week.id === 'w6' ? { ...week, status: 'IN_PROGRESS' } : week)
  assert.deepEqual(unpublishedNewspaperWeeks(live, issues), [], 'a week still being played is not missing an issue')
  assert.deepEqual(unpublishedNewspaperWeeks(weeks.slice(0, 4), issues), [])
  assert.deepEqual(unpublishedNewspaperWeeks(weeks, []).map(week => week.week_number), [1, 2, 3, 4, 6])
  assert.deepEqual(unpublishedNewspaperWeeks([{ id: 'm1', week_number: 1, status: 'CLOSED', phase: 'MAJOR' }], []), [], 'other stages have no rule for an issue')
  assert.deepEqual(['REGULAR', 'PLAYOFFS', 'QUALIFIER', 'MAJOR', undefined].map(phase => isNewspaperIssueWeek({ phase })), [true, true, false, false, true])
})

test('issue dates are Beijing-time month and day', () => {
  assert.equal(newspaperIssueDate('2026-10-14T07:30:53.345Z', 'zh-CN'), '10/14')
  assert.equal(newspaperIssueDate('2026-10-14T07:30:53.345Z', 'en-US'), '14/10')
  assert.equal(newspaperIssueDate('2026-10-13T17:00:00.000Z', 'zh-CN'), '10/14', 'after 16:00 UTC it is already the next day in UTC+8')
  for (const value of [null, '', 'soon']) assert.equal(newspaperIssueDate(value, 'zh-CN'), '')
})

test('issue labels: prelim weeks by number, the playoff edition by name, never 第 5/6 周', () => {
  assert.equal(newspaperWeekLabel(weeks[3], 'zh-CN'), '第 4 周')
  assert.equal(newspaperWeekLabel({ week_number: 4 }, 'zh-CN'), '第 4 周')
  assert.equal(newspaperWeekLabel(weeks[4], 'zh-CN'), '季后赛专刊')
  assert.equal(newspaperWeekLabel(weeks[4], 'en-US'), 'Playoff edition')
  assert.equal(newspaperWeekLabel(weeks[4], 'zh-TW'), '季後賽專刊')
  assert.equal(newspaperWeekLabel(weeks[4], 'ko-KR'), '플레이오프 특집')
  assert.equal(newspaperWeekLabel(weeks[5], 'zh-CN'), '晋级加赛')
  assert.equal(newspaperWeekLabel(weeks[3], 'ko-KR'), '4주차')
  assert.equal(newspaperWeekLabel(weeks[3], 'zh-TW'), '第 4 週')
  for (const locale of ['zh-CN', 'en-US', 'ko-KR', 'zh-TW']) for (const week of weeks.slice(4)) assert.doesNotMatch(newspaperWeekLabel(week, locale), /[56]/)
  assert.equal(newspaperIssueTitle(weeks[3], 'zh-CN'), '第 4 周周报')
  assert.equal(newspaperIssueTitle(weeks[3], 'en-US'), 'Week 4 report')
  assert.equal(newspaperIssueTitle(weeks[4], 'zh-CN'), '季后赛专刊')
  assert.equal(newspaperStageLabel(weeks[4], 'zh-CN'), '季后赛')
  assert.equal(newspaperStageLabel(weeks[3], 'zh-CN'), '第 4 周')
  assert.deepEqual(newspaperIssueStamp({ number: '04', week: weeks[3] }, 'zh-CN'), { value: '04', note: '周', edition: undefined })
  assert.deepEqual(newspaperIssueStamp({ number: '06', week: weeks[4] }, 'zh-CN'), { value: '季后赛', note: '专刊', edition: 'playoffs' })
})
