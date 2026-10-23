import test from 'node:test'
import assert from 'node:assert/strict'
import { localizePublishedPersonNote } from '../src/features/weekly-report/weeklyNewspaperPresentation.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'

test('older Korean generated notes retain identities, map facts and edited copy', () => {
  const person={id:'frozen-person',name:'辅助选手',kind:'cross-role',roles:[{role:'TANK',maps:1},{role:'SUP',maps:1}],
    sources:[{matchId:'m1',order:1},{matchId:'m1',order:2}],detail:'이번 주 2맵 출전: 돌격 1맵、辅助 1맵.'}
  person.description=`${person.name}: ${person.detail}`
  const before=structuredClone(person),display=localizePublishedPersonNote(person,'ko-KR')
  assert.equal(display.detail,'이번 주 2맵 출전: 돌격 1맵, 지원 1맵.')
  assert.equal(display.description,'辅助选手: 이번 주 2맵 출전: 돌격 1맵, 지원 1맵.')
  assert.deepEqual(display.roles,person.roles);assert.deepEqual(display.sources,person.sources)
  assert.deepEqual(person,before)
  const {roles,sources,...publicPerson}=person
  assert.ok(roles.length&&sources.length)
  assert.equal(localizePublishedPersonNote(publicPerson,'ko-KR').detail,display.detail,'Public projection omits source arrays')
  for(const locale of ['zh-CN','zh-TW','en-US'])assert.equal(localizePublishedPersonNote(person,locale),person)
  const edited={...person,detail:'이번 주 편집자가 확인한 특별 기록.',description:'편집 설명'}
  assert.equal(localizePublishedPersonNote(edited,'ko-KR'),edited)
})

test('Korean newspaper controls and numeric captions preserve dynamic values and names',async()=>{
  await ensureUiLocale('ko-KR')
  assert.equal(translateUiText('保存报纸 PDF','ko-KR'),'신문 PDF 저장')
  assert.equal(translateUiText('本周 15 图赛果 · 另 4 张并列','ko-KR'),'이번 주 15맵 결과 · 추가 맵 4개 공동')
  assert.equal(translateUiText('피해량：네온 정션 · 第 3 图','ko-KR'),'피해량: 네온 정션 · 3번째 맵')
  assert.equal(translateUiText('辅助选手','ko-KR'),'辅助选手','A player name is not interface copy')
})
