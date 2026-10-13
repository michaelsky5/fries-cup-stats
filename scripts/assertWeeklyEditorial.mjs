import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildMatchNews, buildWeeklyNewspaper } from '../src/features/weekly-report/weeklyNewsroom.js'
import { buildWeeklyReportPreview } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildLeadIntro, buildMatchBackground, collectWeeklyNewsContext, selectWeeklyLead } from '../src/features/weekly-report/weeklyEditorial.js'
import { applyIssueEdits, createIssueDraft, validateIssueDraft } from '../src/features/weekly-report/weeklyIssueVersions.js'

const team = id => ({ id, name: id, short: id })
function fixture(weekNumber, aWins = 3, { a = 'A', b = 'B', state = 'complete', cycleId = 'cycle' } = {}) {
  const id = `match-${weekNumber}-${a}-${b}`
  const match = { id, state, team_a: { ...team(a), score: aWins }, team_b: { ...team(b), score: 5 - aWins } }
  const winners = aWins === 3 ? [a, b, b, a, a] : aWins === 2 ? [b, a, a, b, b] : Array.from({ length: 5 }, (_, index) => index < aWins ? a : b)
  const maps = winners.map((winner, index) => ({ matchId: id, order: index + 1, map_name: 'Nepal', map_type: 'Control',
    winner, score_a: winner === a ? 2 : 0, score_b: winner === a ? 0 : 2 }))
  const week = { id: `week-${weekNumber}`, cycle_id: cycleId, week_number: weekNumber, match_ids: [id] }
  return { seasonId: 'FCW26', cycle: { id: cycleId }, week, sourceAt: '2026-10-12T02:31:00Z', maps,
    completed: ['complete', 'ruling'].includes(state) ? [match] : [], pending: ['complete', 'ruling', 'cancelled'].includes(state) ? [] : [match],
    overview: { matches: [match], weekEntries: [] } }
}
function background(current, previous, locale = 'zh-CN') {
  current.newsContext = collectWeeklyNewsContext(current, previous)
  return buildMatchBackground(buildMatchNews(current, current.completed[0], locale), current, locale)
}

test('ending a longer verified run can outrank another close score', () => {
  const current = fixture(4, 3, { a: 'C', b: 'A' })
  const context = background(current, [fixture(1, 4), fixture(2, 5),fixture(3, 4)])
  assert.equal(context.kind, 'streak-ended')
  assert.match(context.text, /A在此前连续 3 场实战获胜/)
  assert.equal(context.sources.length, 3)
  const important = { id: 'important', background: context }
  assert.equal(selectWeeklyLead([{ id: 'close' }, important], 'close'), important)
})

test('a short run supplies background without automatically displacing a close match', () => {
  const current=fixture(3, 4, {a:'C',b:'A'}),context=background(current,[fixture(1,4),fixture(2,5)])
  assert.equal(context.kind,'streak-ended')
  const close={id:'close'}
  assert.equal(selectWeeklyLead([close,{id:'ordinary',background:context}],'close'),close)
})

test('first played win requires a complete same-cycle history of actual losses', () => {
  const current = fixture(3, 4, { a: 'A', b: 'C' })
  const context = background(current, [fixture(1, 1), fixture(2, 2)])
  assert.equal(context.kind, 'first-played-win')
  assert.match(context.text, /此前 2 场均负/)
  assert.ok(context.sources.every(source => source.weekNumber < 3))
})

test('missing weeks, unresolved matches and rulings never establish a run or first played win', () => {
  for (const previous of [[fixture(2, 4)], [fixture(1, 1), fixture(2, 1, { state: 'upcoming' })], [fixture(1, 1), fixture(2, 0, { state: 'ruling' })]]) {
    const context = background(fixture(3, 4), previous)
    assert.ok(!context || context.kind === 'previous-meeting')
    assert.doesNotMatch(context?.text || '', /首次|连胜|连续赢下/)
  }
})

test('missing declared matches and contradicting winners block claims about the complete history', () => {
  const missing = fixture(2, 1)
  missing.week.match_ids.push('not-in-public-records')
  assert.equal(background(fixture(3, 4), [fixture(1, 1), missing])?.kind, 'previous-meeting')
  const conflicting = fixture(2, 1)
  conflicting.maps[0].winner = 'B'
  const context = background(fixture(3, 4), [fixture(1, 1), conflicting])
  assert.equal(context?.kind, 'previous-meeting')
  assert.deepEqual(context.sources.map(source => source.weekNumber), [1])
})

test('other cycles, seasons, future weeks and other source snapshots cannot enter the background', () => {
  const current = fixture(3)
  const wrongSeason = { ...fixture(1), seasonId: 'OTHER' }
  const laterSource = { ...fixture(2), sourceAt: '2026-10-13T02:00:00Z' }
  const context = collectWeeklyNewsContext(current, [fixture(1, 3, { cycleId: 'other' }), wrongSeason, laterSource, fixture(4)])
  assert.deepEqual(context.history, [])
})

test('a verified prior meeting is named by week without claiming unseen history', () => {
  const context = background(fixture(4, 3), [fixture(2, 1)])
  assert.equal(context.kind, 'previous-meeting')
  assert.match(context.text, /第 2 周.*A 1:4 B/)
  assert.doesNotMatch(context.text, /上次|首次|复仇|战术/)
})

test('multiple same-week appearances do not infer chronological streaks from identifier order', () => {
  const current = fixture(3)
  current.completed.push(fixture(3, 4, { a: 'A', b: 'C' }).completed[0])
  const context = background(current, [fixture(1, 1), fixture(2, 1)])
  assert.equal(context.kind, 'previous-meeting')
})

test('lead introduction distinguishes a unique close match within fully recorded results', () => {
  const current = fixture(3), close = buildMatchNews(current, current.completed[0])
  const ordinaryReport = fixture(3, 4, { a: 'C', b: 'D' }), ordinary = buildMatchNews(ordinaryReport, ordinaryReport.completed[0])
  assert.match(buildLeadIntro(close, [close, ordinary]), /2 场完整五图赛果中唯一的 3:2/)
  assert.doesNotMatch(buildLeadIntro(close, [close, { ...ordinary, decisive: ordinary.maps[4] }]), /唯一/)
  assert.doesNotMatch(buildLeadIntro({ ...close, sequence: [], decisive: null, brief: '赛果已确认。' }, [close]), /逆转|决胜|唯一/)
})

test('only published, scheduled next-week opponents enter the frozen preview', () => {
  const current = fixture(3)
  const future = fixture(4, 0, { state: 'upcoming' })
  future.completed = []
  const match = { ...future.pending[0], scheduled_at: '2026-10-17T12:00:00Z' }
  current.overview.weekEntries.push({ week: future.week, matches: [match, { ...match, id: 'cancelled', state: 'cancelled' }, { ...match, id: 'unscheduled', scheduled_at: null }] })
  const context = collectWeeklyNewsContext(current)
  assert.deepEqual(context.nextWeek.matches.map(item => item.id), [match.id])
  match.scheduled_at = '2026-10-18T12:00:00Z'
  assert.equal(context.nextWeek.matches[0].startAt, '2026-10-17T12:00:00Z')
  current.overview.weekEntries = []
  assert.equal(collectWeeklyNewsContext(current).nextWeek, null)
})

const db = JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json', import.meta.url), 'utf8'))
test('editorial copies and intros are generated in every supported language without mutating the source', () => {
  const report = buildWeeklyReportPreview(db), before = structuredClone(report)
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) {
    const paper = buildWeeklyNewspaper(report, locale)
    assert.ok(paper.lead.intro)
    assert.equal(paper.lead.background.kind, 'streak-ended')
    assert.doesNotMatch(paper.lead.intro, /精彩操作|采访|战术压制/)
    assert.ok(paper.peopleNews.people.every(person => person.description))
  }
  assert.deepEqual(report, before)
})

test('editing an intro creates consistent reading and paper copy while preserving facts', () => {
  const draft = createIssueDraft(buildWeeklyReportPreview(db), 'FCW26', 'zh-CN'), facts = structuredClone(draft.report)
  draft.edits.intro = 'MH 连取末两图，以 3:2 获胜。'
  draft.edits.briefs[draft.paper.briefs[0].id] = '本场赛果已经确认。'
  const edited = applyIssueEdits(draft)
  assert.equal(edited.lead.intro, draft.edits.intro)
  assert.equal(edited.articles.find(article => article.id === edited.lead.id).intro, draft.edits.intro)
  assert.equal(edited.articles.find(article => article.id === draft.paper.briefs[0].id).brief, '本场赛果已经确认。')
  assert.deepEqual(draft.report, facts)
  assert.deepEqual(validateIssueDraft(draft).errors, [])
  draft.edits.intro = ' '
  assert.ok(validateIssueDraft(draft).errors.some(error => /导语/.test(error)))
})

test('legacy frozen issues remain valid without an introduction or historical fact pack', () => {
  const draft = createIssueDraft(buildWeeklyReportPreview(db), 'FCW26', 'zh-CN')
  delete draft.edits.intro
  delete draft.report.newsContext
  delete draft.paper.lead.intro
  for (const article of [...draft.paper.articles,draft.paper.lead,...draft.paper.briefs,...draft.paper.otherResults]) delete article.background
  assert.deepEqual(validateIssueDraft(draft).errors, [])
  assert.equal(applyIssueEdits(draft).lead.intro, undefined)
})

test('unfrozen historical references and changed next-week fixtures are rejected', () => {
  const draft = createIssueDraft(buildWeeklyReportPreview(db), 'FCW26', 'zh-CN')
  draft.paper.articles[0].background = { sources: [{ weekId: 'other', weekNumber: 1, matchId: 'other-match' }] }
  assert.ok(validateIssueDraft(draft).errors.some(error => /历史赛果/.test(error)))
  draft.paper.nextWeek = { id: 'other-week', matches: [] }
  assert.ok(validateIssueDraft(draft).errors.some(error => /下周赛程/.test(error)))
})
