import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildMatchNews, buildWeeklyNewspaper, selectMatchBriefs } from '../src/features/weekly-report/weeklyNewsroom.js'
import { buildWeeklyReportPreview } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildLeadIntro, buildLeadPrintNote, buildMatchBackground, collectWeeklyNewsContext, selectWeeklyLead, formatWeeklyMatchScope, buildMatchBrief } from '../src/features/weekly-report/weeklyEditorial.js'
import { buildWeeklyPeopleNews } from '../src/features/weekly-report/weeklyPeopleNews.js'
import { applyIssueEdits, createIssueDraft, validateIssueDraft } from '../src/features/weekly-report/weeklyIssueVersions.js'

const team = id => ({ id, name: id, short: id })
function fixture(weekNumber, aWins = 3, { a = 'A', b = 'B', state = 'complete', cycleId = 'cycle' } = {}) {
  const id = `match-${weekNumber}-${a}-${b}`
  const match = { id, state, scheduled_at: new Date(Date.parse('2026-09-01T12:00:00Z') + weekNumber * 7 * 86400_000).toISOString(), team_a: { ...team(a), score: aWins }, team_b: { ...team(b), score: 5 - aWins } }
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

test('missing dates and rescheduled matches out of week order cannot establish a winning run', () => {
  for (const date of [null,'2026-09-25T12:00:00Z']) {
    const first=fixture(1,4),second=fixture(2,5)
    first.overview.matches[0].scheduled_at=date
    const context=background(fixture(3,3,{a:'C',b:'A'}),[first,second])
    assert.ok(!context || context.kind==='previous-meeting')
  }
})

test('lead introduction distinguishes a unique close match within fully recorded results', () => {
  const current = fixture(3), close = buildMatchNews(current, current.completed[0])
  const ordinaryReport = fixture(3, 4, { a: 'C', b: 'D' }), ordinary = buildMatchNews(ordinaryReport, ordinaryReport.completed[0])
  assert.match(buildLeadIntro(close, [close, ordinary]), /2 场完整五图赛果中唯一的 3:2/)
  const closingLoss=fixture(3,3,{a:'E',b:'F'})
  closingLoss.maps.forEach((map,index)=>{map.winner=index<3?'E':'F';map.score_a=index<3?2:0;map.score_b=index<3?0:2})
  const anotherClose=buildMatchNews(closingLoss,closingLoss.completed[0])
  assert.equal(anotherClose.decisive,null)
  assert.doesNotMatch(buildLeadIntro(close, [close, anotherClose]), /唯一/)
  assert.doesNotMatch(buildLeadIntro({ ...close, sequence: [], decisive: null, brief: '赛果已确认。' }, [close]), /逆转|决胜|唯一/)
})

test('compact lead note uses the frozen match identity and excludes incomplete results and rulings', () => {
  const current = fixture(3), close = { ...buildMatchNews(current, current.completed[0]), state: 'complete' }
  const other = fixture(3, 4, { a: 'C', b: 'D' }), ordinary = { ...buildMatchNews(other, other.completed[0]), state: 'complete' }
  const frozen = JSON.stringify([close, ordinary])
  for (const locale of ['zh-CN','zh-TW','en-US','ko-KR']) {
    assert.match(buildLeadPrintNote(structuredClone(close), [close, ordinary], locale), /3:2/)
  }
  assert.equal(JSON.stringify([close, ordinary]), frozen)
  assert.equal(buildLeadPrintNote(close, [close]), '')
  assert.equal(buildLeadPrintNote(close, [close, { ...ordinary, sequence: [] }]), '')
  assert.equal(buildLeadPrintNote(close, [close, { ...ordinary, state: 'ruling' }]), '')
  assert.equal(buildLeadPrintNote(ordinary, [close, ordinary]), '')
  const another = fixture(3, 3, { a: 'E', b: 'F' }), secondClose = { ...buildMatchNews(another, another.completed[0]), state: 'complete' }
  assert.equal(buildLeadPrintNote(close, [close, secondClose]), '')
  assert.equal(buildLeadPrintNote({ ...close, state: 'ruling' }, [close, ordinary]), '')
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

test('paper briefs prioritize verified history, retain all played results and exclude ruling stories when space is available', () => {
  const article = (id, priority, state = 'complete') => ({ id, state, sequence: state === 'complete' ? Array(5).fill({}) : [], displayTeams: [team(id), team(id + '-opponent')], newsKind: 'ordinary', ...(priority ? { background: { priority } } : {}) })
  const lead = article('lead', 0), normal = article('normal', 0), firstWin = article('first-win', 80), ended = article('ended', 90), ruling = article('ruling', 999, 'ruling')
  assert.deepEqual(selectMatchBriefs([ruling,normal,firstWin,ended,lead],lead).map(a => a.id), ['ended','first-win','normal'])
})

test('played and ruling counts use only confirmed results in each frozen issue', () => {
  const scope = { completed: [{ state: 'complete' }, { state: 'complete' }, { state: 'ruling' }], pending: [{ state: 'pending' }] }
  assert.equal(formatWeeklyMatchScope(scope), '2 场实赛 + 1 场赛事判定')
  assert.equal(formatWeeklyMatchScope({ completed: [{ state: 'complete' }] }), '1 场实赛')
  for (const locale of ['zh-CN','zh-TW','en-US','ko-KR']) assert.ok(formatWeeklyMatchScope(scope,locale).includes('2'))
})

test('player prose counts unique map appearances and claims a map win only from a confirmed winner', () => {
  const report = buildWeeklyReportPreview(db), paper = buildWeeklyNewspaper(report)
  const cross = paper.peopleNews.people.find(person => person.kind === 'cross-role')
  assert.ok(cross.detail.includes(String(new Set(cross.sources.map(source => JSON.stringify([source.matchId,source.order]))).size)))
  const note = paper.peopleNews.people.find(person => person.kind === 'map-note')
  const copy = structuredClone(report), target = copy.maps.find(map => map.matchId === note.source.matchId && map.order === note.source.order)
  const notes = () => buildWeeklyPeopleNews(copy,{featuredIds:paper.dataStories.cards.map(story=>story.id)}).people.find(person=>person.id===note.id)
  target.winner = note.teamId
  assert.match(notes().detail,/队伍赢下/)
  target.winner = ''
  assert.doesNotMatch(notes().detail,/队伍赢下/)
  assert.match(notes().detail,new RegExp(note.value.toLocaleString('en-US')))
})

test('new award sample counts and eligibility are frozen without the candidate calculation graph', () => {
  const report = buildWeeklyReportPreview(db), draft = createIssueDraft(report,'FCW26','zh-CN')
  assert.equal(draft.report.awards.minimumMaps,report.awards.policy.minimumMaps)
  assert.equal(draft.report.awards.mvp[0].maps,report.awards.mvp[0].maps)
  for (const slot of draft.report.awards.bestFive) if (slot.player) assert.equal(slot.player.maps,report.awards.bestFive.find(item=>item.position===slot.position).player.maps)
  assert.equal(draft.report.awards.snapshot,undefined)
})

test('concise streak news retains the verified run count and language while the full context remains frozen', () => {
  const current = fixture(3,4,{a:'C',b:'A'}), full = background(current,[fixture(1,4),fixture(2,5)])
  const article = {...buildMatchNews(current,current.completed[0]),background:full}
  assert.equal(buildMatchBrief(article),'A此前的 2 场连胜就此终结。')
  for(const locale of ['zh-CN','zh-TW','en-US','ko-KR']) {
    assert.ok(buildMatchBrief(article,locale).includes('2'))
    assert.ok(buildMatchBrief(article,locale).includes('A'))
  }
  assert.equal(article.background.text,full.text)
  assert.equal(article.background.sources.length,2)
})
