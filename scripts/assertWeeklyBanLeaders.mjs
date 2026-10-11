import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listWeeklyReportPreviews } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildWeeklyNewspaper } from '../src/features/weekly-report/weeklyNewsroom.js'
const db=JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json',import.meta.url),'utf8'))
const reports=listWeeklyReportPreviews(db)

test('all three real weeks display three ranked Ban heroes, including the second week with a single leader',()=>{
  for(const report of reports) {
    const {banNews}=buildWeeklyNewspaper(report)
    assert.equal(banNews.highlights.length,3)
    assert.deepEqual(banNews.highlights.map(hero=>[hero.name,hero.count]),report.bans.slice(0,3).map(hero=>[hero.name,hero.count]))
    for(const hero of banNews.highlights) assert.equal(hero.rank,report.bans.filter(other=>other.count>hero.count).length+1)
  }
  const second=buildWeeklyNewspaper(reports.find(report=>report.week.week_number===2)).banNews
  assert.equal(second.tieCount,1)
  assert.equal(second.highlights[0].name,'Cassidy')
  assert.equal(second.highlights[0].count,4)
  assert.equal(second.highlights[1].count,3)
  assert.equal(second.highlights[2].count,3)
  assert.deepEqual(second.highlights.map(hero=>hero.rank),[1,2,2])
})
test('three displayed heroes keep honest tied ranks and account for boundary ties',()=>{
  const report=structuredClone(reports[0])
  report.bans=[{name:'Cassidy',count:5},{name:'Ana',count:3},{name:'Kiriko',count:3},{name:'Tracer',count:3},{name:'Bastion',count:1}]
  const {banNews}=buildWeeklyNewspaper(report)
  assert.deepEqual(banNews.highlights.map(hero=>hero.rank),[1,2,2])
  assert.equal(banNews.omittedTies,1)
})
test('an incomplete or empty Ban list never invents heroes or zero counts',()=>{
  for(const count of [0,1,2]) {
    const report=structuredClone(reports[0])
    report.bans=report.bans.slice(0,count)
    const {banNews}=buildWeeklyNewspaper(report)
    assert.equal(banNews.highlights.length,count)
    assert.equal(banNews.omittedTies,0)
  }
})
