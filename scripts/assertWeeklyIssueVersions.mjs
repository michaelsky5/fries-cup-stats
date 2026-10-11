import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listWeeklyReportPreviews } from '../src/features/weekly-report/weeklyReportPreview.js'
import { applyIssueEdits, createIssueDraft, draftFromVersion, importIssueVersion, issueStorageKey, readIssueVersions, saveIssueVersion, validateIssueDraft, verifyIssueVersion } from '../src/features/weekly-report/weeklyIssueVersions.js'

const db=JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json',import.meta.url),'utf8'))
const reports=listWeeklyReportPreviews(db,'cmu13l8dx000101mp8jr1prjy').sort((a,b)=>a.week.week_number-b.week.week_number)
const make=(week=3,locale='zh-CN')=>createIssueDraft(structuredClone(reports.find(report=>report.week.week_number===week)),'FCW2026',locale)
const now=()=> '2026-10-10T06:00:00.000Z'
class MemoryStorage {
  values=new Map()
  getItem(key) { return this.values.get(key)??null }
  setItem(key,value) { this.values.set(key,value) }
}

test('all three real weeks save valid independent Chinese and English issues',async()=>{
  const storage=new MemoryStorage(),sizes=[]
  for(const report of reports)for(const locale of ['zh-CN','en-US']) {
    const draft=createIssueDraft(report,'FCW2026',locale)
    assert.deepEqual(validateIssueDraft(draft).errors,[])
    const saved=await saveIssueVersion(storage,draft,0,{now})
    assert.equal(saved.version.revision,1)
    assert.equal(saved.version.payload.report.completed.length,report.completed.length)
    assert.equal(saved.version.payload.paper.generation.weekId,report.week.id)
    assert.equal((await readIssueVersions(storage,draft.scope)).length,1)
    sizes.push({week:report.week.week_number,locale,bytes:Buffer.byteLength(JSON.stringify(saved.version))})
  }
  assert.equal(storage.values.size,6)
  assert.ok(sizes.every(item => item.bytes > 1000))
})

test('editorial changes preserve raw scores, statistics and honours in the frozen snapshot',async()=>{
  const report=structuredClone(reports[2]),draft=createIssueDraft(report,'FCW2026','zh-CN')
  const facts=structuredClone(draft.report),paper=structuredClone(draft.paper)
  draft.edits.headline='MH 连取末两图，赢下第三周焦点战'
  const first=draft.paper.briefs[0]
  draft.edits.briefs[first.id]='Ateam 以 4:1 战胜 CSM。'
  const edited=applyIssueEdits(draft)
  assert.equal(edited.lead.title,draft.edits.headline)
  assert.equal(edited.briefs[0].brief,draft.edits.briefs[first.id])
  assert.deepEqual(edited.lead.sequence,paper.lead.sequence)
  assert.deepEqual(edited.awards,paper.awards)
  assert.deepEqual(edited.dataStories,paper.dataStories)
  report.completed[0].team_a.score=999
  report.maps[0].score_a=999
  assert.deepEqual(draft.report,facts)
  const saved=await saveIssueVersion(new MemoryStorage(),draft,0,{now})
  draft.edits.headline='Later unsaved edit'
  assert.equal(saved.version.payload.paper.lead.title,'MH 连取末两图，赢下第三周焦点战')
})

test('saving and reading an earlier revision never overwrites its facts or copy',async()=>{
  const storage=new MemoryStorage(),draft=make()
  const v1=await saveIssueVersion(storage,draft,0,{now})
  draft.edits.headline='MH 连取末两图，赢下第三周焦点战'
  const v2=await saveIssueVersion(storage,draft,1,{now})
  assert.equal(v2.version.revision,2)
  const history=await readIssueVersions(storage,draft.scope)
  assert.deepEqual(history[0],v1.version)
  const earlier=draftFromVersion(history[0]);earlier.reviewed=true
  const v3=await saveIssueVersion(storage,earlier,2,{now})
  assert.equal(v3.version.revision,3)
  assert.equal(v3.version.payload.paper.lead.title,v1.version.payload.paper.lead.title)
  assert.equal(v3.version.payload.reviewed,true)
  assert.deepEqual(v3.history[1],v2.version)
})

test('re-saving identical content does not manufacture another revision',async()=>{
  const storage=new MemoryStorage(),draft=make()
  draft.edits.headline='MH 连取末两图，赢下第三周焦点战'
  const first=await saveIssueVersion(storage,draft,0,{now})
  const repeated=await saveIssueVersion(storage,draftFromVersion(first.version),1,{now})
  assert.equal(repeated.created,false)
  assert.equal(repeated.history.length,1)
  assert.deepEqual(repeated.version,first.version)
})

test('stale writers fail without losing their unsaved text or the newer version',async()=>{
  const storage=new MemoryStorage(),draft=make()
  await saveIssueVersion(storage,draft,0,{now})
  const stale=make();stale.edits.headline='MH 在第三周以 3:2 战胜 404'
  const raw=storage.getItem(issueStorageKey(draft.scope))
  await assert.rejects(saveIssueVersion(storage,stale,0,{now}),/newer version/)
  assert.equal(storage.getItem(issueStorageKey(draft.scope)),raw)
  assert.equal(stale.edits.headline,'MH 在第三周以 3:2 战胜 404')
})

test('a shared browser lock serializes simultaneous saves for the same issue',async()=>{
  const storage=new MemoryStorage(),queued=new Map()
  const locks={request(key,callback){const previous=queued.get(key)||Promise.resolve();const next=previous.catch(()=>{}).then(callback);queued.set(key,next);return next}}
  const results=await Promise.allSettled([saveIssueVersion(storage,make(),0,{locks,now}),saveIssueVersion(storage,make(),0,{locks,now})])
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1)
  assert.equal(results.filter(result=>result.status==='rejected').length,1)
  assert.equal((await readIssueVersions(storage,make().scope)).length,1)
})

test('tampered numerical facts or copy fail integrity checking and import',async()=>{
  const draft=make(),saved=await saveIssueVersion(new MemoryStorage(),draft,0,{now})
  for(const tamper of [version=>version.payload.report.maps[0].score_a=999,version=>version.payload.paper.lead.title='Another headline']) {
    const bad=structuredClone(saved.version);tamper(bad)
    await assert.rejects(verifyIssueVersion(bad),/integrity/)
    const destination=new MemoryStorage()
    await assert.rejects(importIssueVersion(destination,JSON.stringify(bad),draft.scope,0,{now}),/integrity/)
    assert.equal(destination.values.size,0)
  }
})

test('a verified backup restores its own snapshot and cannot enter another week or language',async()=>{
  const source=new MemoryStorage(),draft=make(),saved=await saveIssueVersion(source,draft,0,{now})
  const raw=JSON.stringify(saved.version),destination=new MemoryStorage()
  const restored=await importIssueVersion(destination,raw,draft.scope,0,{now})
  assert.deepEqual(restored.version.payload,saved.version.payload)
  for(const scope of [make(2).scope,make(3,'en-US').scope,{...draft.scope,seasonId:'other-event'}]) {
    const wrong=new MemoryStorage()
    await assert.rejects(importIssueVersion(wrong,raw,scope,0,{now}),/Switch to the backup/)
    assert.equal(wrong.values.size,0)
  }
})

test('corrupt histories are preserved and block appending over unreadable records',async()=>{
  const draft=make(),key=issueStorageKey(draft.scope)
  for(const raw of ['{broken','null','{}','{"schema":"friescup-weekly-issue-store-v1","versions":[null]}']) {
    const storage=new MemoryStorage();storage.setItem(key,raw)
    await assert.rejects(readIssueVersions(storage,draft.scope))
    await assert.rejects(saveIssueVersion(storage,draft,0,{now}))
    assert.equal(storage.getItem(key),raw)
  }
})

test('a quota failure preserves the old history and leaves the draft editable',async()=>{
  const storage=new MemoryStorage(),draft=make()
  await saveIssueVersion(storage,draft,0,{now})
  const key=issueStorageKey(draft.scope),raw=storage.getItem(key)
  storage.setItem=()=>{throw new Error('QuotaExceededError')}
  draft.edits.headline='MH 连取末两图，赢下第三周焦点战'
  await assert.rejects(saveIssueVersion(storage,draft,1,{now}),/Local save failed/)
  assert.equal(storage.getItem(key),raw)
  assert.equal(applyIssueEdits(draft).lead.title,draft.edits.headline)
})

test('unconfirmed, cross-week and invalid copy drafts cannot be stored',async()=>{
  for(const alter of [draft=>draft.report.completed=[],draft=>draft.report.week.id='wrong-week',draft=>draft.paper.articles[0].id='other-week-match',draft=>draft.paper.dataStories.cards[0].stats[0].matchId='other-week-match',draft=>draft.edits.headline='',draft=>draft.edits.headline='题'.repeat(45),draft=>draft.edits.headline='两行\n标题',draft=>draft.edits.briefs[draft.paper.briefs[0].id]='文'.repeat(89)]) {
    const draft=make();alter(draft)
    assert.ok(validateIssueDraft(draft).errors.length)
    const storage=new MemoryStorage()
    await assert.rejects(saveIssueVersion(storage,draft,0,{now}))
    assert.equal(storage.values.size,0)
  }
  assert.ok(validateIssueDraft({report:{},paper:{}}).errors.length)
  await assert.rejects(importIssueVersion(new MemoryStorage(),'x'.repeat(4_000_001),make().scope,0,{now}),/size/)
})
