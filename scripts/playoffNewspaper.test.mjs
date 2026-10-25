import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'
import { buildWeeklyReportPreview } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildWeeklyNewspaper, buildMatchNews } from '../src/features/weekly-report/weeklyNewsroom.js'
import { createIssueDraft, validateIssueDraft, applyIssueEdits } from '../src/features/weekly-report/weeklyIssueVersions.js'
import { verifiedSeriesMaps } from '../src/features/weekly-report/weeklySeriesFacts.js'
import { playoffText } from '../src/features/weekly-report/weeklyPlayoffNewspaper.js'

const options = { cycleId: 'sample-cycle-1', weekId: 'sample-cycle-1-playoffs' }
const fixture = state => { const db = buildWeeklyPlayoffFixture(state); db.updated_at = '2026-10-19T00:00:00.000Z'; return db }
const reportOf = state => buildWeeklyReportPreview(fixture(state), options)

test('playoff issue freezes published bracket, champion and runner-up while bronze under review stays pending', () => {
  const db = fixture('medal-complete')
  const third = db.matches.find(match => match.round === 'THIRD_PLACE'); third.status = 'RESULT_REVIEW'
  const report = buildWeeklyReportPreview(db, options), paper = buildWeeklyNewspaper(report)
  assert.equal(paper.layout, 'playoffs')
  assert.deepEqual(paper.playoff.placements.map(p => p.rank), [1, 2])
  const bronze = paper.playoff.rounds.find(round => round.kind === 'THIRD_PLACE').items[0]
  assert.equal(bronze.winnerId, null); assert.equal(bronze.scores, null)
  assert.equal(paper.lead.id, 'PLAYOFF-FIXTURE-FINAL')
  const draft = createIssueDraft(report, 'FCW2026', 'zh-CN')
  assert.deepEqual(draft.paper.playoff, draft.report.playoff)
  const frozen = structuredClone(draft.report)
  third.status = 'COMPLETE'; draft.edits.headline = '季后赛专刊'
  applyIssueEdits(draft)
  assert.deepEqual(draft.report, frozen)
  assert.deepEqual(draft.paper.playoff.placements.map(p => p.rank), [1, 2])
})

test('pending/live finals, missing bracket and corrected semifinal never infer medals from seeds', () => {
  for (const state of ['pending-results', 'final-live', 'legacy', 'pending-seeds']) {
    const paper = buildWeeklyNewspaper(reportOf(state))
    assert.deepEqual(paper.playoff.placements, [], state)
    if (state === 'legacy') assert.equal(paper.playoff.bracketAvailable, false)
  }
  const db = fixture('medal-complete'), semi = db.matches.find(m => m.round === 'SEMIFINAL')
  semi.winner = semi.team_b.id; semi.team_a.score = 1; semi.team_b.score = 3
  assert.deepEqual(buildWeeklyReportPreview(db, options).playoff.placements, [])
})

test('cross-cycle or mismatched frozen bracket cannot be validated as this issue', () => {
  const report = reportOf('medal-complete'), draft = createIssueDraft(report, 'FCW2026', 'zh-CN')
  draft.paper.playoff.cycleId = 'another-cycle'
  assert.ok(validateIssueDraft(draft).errors.some(error => error.includes('Playoff')))
  const db = fixture('medal-complete'), cycle = db.weekly_competition.cycles.find(c => c.id === options.cycleId)
  cycle.elimination.rounds[0].week_id = 'unrelated-week'
  assert.deepEqual(buildWeeklyReportPreview(db, options).playoff.placements, [])
})

test('earlier playoff week never borrows later confirmed medal results', () => {
  const db = fixture('medal-complete'), cycle = db.weekly_competition.cycles.find(c => c.id === options.cycleId)
  const current = cycle.weeks.find(w => w.id === options.weekId), later = { ...current, id: 'later-week', week_number: 6, match_ids: [] }
  for (const match of db.matches.filter(m => ['FINAL', 'THIRD_PLACE'].includes(m.round))) {
    match.cycle_week_id = later.id; later.match_ids.push(match.raw_match_id)
  }
  current.match_ids = current.match_ids.filter(id => !later.match_ids.includes(id))
  cycle.weeks.push(later)
  for (const round of cycle.elimination.rounds.filter(r => r.kind !== 'SEMIFINAL')) round.week_id = later.id
  assert.deepEqual(buildWeeklyReportPreview(db, options).playoff.placements, [])
})

test('FT2 and FT3 render only verified played maps and stop at match point', () => {
  for (const [format, winners] of [['FT2', ['a','a']], ['FT2', ['a','b','a']], ['FT3', ['a','a','a']], ['FT3', ['b','a','a','a']], ['FT3', ['b','a','b','a','a']]]) {
    const match = { id: 'series', format, state: 'complete', team_a: { id:'a', name:'Alpha', score:winners.filter(x=>x==='a').length }, team_b: {id:'b',name:'Bravo',score:winners.filter(x=>x==='b').length} }
    const maps = winners.map((winner,index)=>({matchId:'series', order:index+1,winner,map_name:'Lijiang Tower',map_type:'Control',score_a:winner==='a'?2:0,score_b:winner==='b'?2:0}))
    assert.equal(verifiedSeriesMaps(match,maps),true)
    const report = reportOf('complete'); report.maps=maps
    for (const locale of ['zh-CN','zh-TW','en-US','ko-KR']) {
      const article=buildMatchNews(report,match,locale)
      assert.equal(article.sequence.length,winners.length)
      assert.deepEqual(article.sequence.at(-1).runningScore,[match.team_a.score,match.team_b.score])
      assert.ok(!article.brief.includes('five')&&!article.brief.includes('五图全胜'))
      assert.ok(!article.editorialMark?.label.includes('晋级'), 'Third-place wins do not imply advancement')
    }
    assert.equal(verifiedSeriesMaps(match,[...maps,{...maps[0],order:maps.length+1}]),false)
    assert.equal(verifiedSeriesMaps(match,maps.map((m,i)=>i===0?{...m,is_administrative:true}:m)),false)
  }
  const match={id:'x',state:'complete',format:'FT2',team_a:{id:'a',score:2},team_b:{id:'b',score:1}}
  assert.equal(verifiedSeriesMaps(match,['a','a','b'].map((winner,i)=>({order:i+1,winner}))),false)
})

test('official ruling uses no synthetic map timeline or played-game image', () => {
  const report=reportOf('complete'), match={...report.completed[0],state:'ruling'}
  const article=buildMatchNews(report,match,'en-US')
  assert.deepEqual(article.sequence,[]);assert.equal(article.image,null)
  assert.match(article.brief,/official ruling/)
})

test('missing or invalid series scores cannot produce a winner headline', () => {
  const report=reportOf('complete')
  for(const score of [null,undefined,'',false,-1]) {
    const match={...report.completed[0],team_a:{id:'a',name:'Alpha',score},team_b:{id:'b',name:'Bravo',score:1},state:'complete',format:'FT3'}
    const article=buildMatchNews(report,match,'en-US')
    assert.match(article.title,/result records pending/)
    assert.deepEqual(article.sequence,[])
    assert.equal(article.image,null)
  }
})

test('all four locales have playoff labels and old models without playoff facts keep their layout', () => {
  const report=reportOf('complete'); delete report.playoff
  const original=buildWeeklyNewspaper(report)
  assert.equal(original.playoff,undefined);assert.notEqual(original.layout,'playoffs')
  for (const locale of ['zh-CN','zh-TW','en-US','ko-KR']) {
    const draft=createIssueDraft(reportOf('medal-complete'),'FCW2026',locale)
    assert.deepEqual(validateIssueDraft(draft).errors,[],locale)
    assert.notEqual(playoffText('edition',locale),'edition')
  }
})
