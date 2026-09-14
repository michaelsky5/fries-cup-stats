import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { buildReviewEntryPath, getReviewEntryReturnPath, getReviewOverviewReturnState, buildReviewSceneUrl } from '../src/lib/reviewNavigation.js'
import { localizeReviewScenes, localizeReviewSearchResult, reviewText } from '../src/lib/reviewLocale.js'
import { getLocalizedReviewSeasonProfile, prepareReviewDb } from '../src/lib/reviewSeason.js'
import { buildPlayerStory, buildStaffStory, buildTeamStory, buildTournamentStory } from '../src/lib/reviewStoryBuilders.js'
import { buildStaffIndex, getReviewSearchResults } from '../src/lib/reviewSearch.js'

const db = prepareReviewDb(JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8')))
const locales = ['zh-CN', 'en-US', 'ko-KR']

test('the overview return keeps reading position through a language change without copying story or search parameters', () => {
  const state = getReviewOverviewReturnState({ returnTo: '/?season=FCR2026&design=kpr5&lang=zh', returnScrollY: 2800 }, 'FCR26', 'en-US', 'design=kpr5&lang=en&q=SKY&identity=admin&scene=3')
  const url = new URL(state.returnTo, 'https://review.invalid')
  assert.equal(url.pathname, '/')
  assert.deepEqual(Object.fromEntries(url.searchParams), { design: 'kpr5', lang: 'en', season: 'FCR2026' })
  assert.equal(state.returnScrollY, 2800)
})

test('the overview return ignores other events, non-home routes and external sources', () => {
  for (const returnTo of ['/players/one?season=FCR2026', '/?season=FCA2026', '//example.com/?season=FCR2026', 'https://example.com/?season=FCR2026', undefined]) {
    const state = getReviewOverviewReturnState({ returnTo, returnScrollY: 2800 }, 'FCR26', 'zh-CN', 'design=kpr5')
    assert.equal(new URL(state.returnTo, 'https://review.invalid').pathname, '/')
    assert.equal(state.returnScrollY, undefined)
  }
})

test('leaving a story restores its entry search in the current language and season', () => {
  const entry = buildReviewEntryPath('FCR26', 'zh-CN', 'design=kpr5&scene=3&as=coach&who=someone', { query: 'SKY#123 & FF', identity: 'admin' })
  const returned = new URL(getReviewEntryReturnPath(entry, 'FCR26', 'ko-KR', 'design=kpr5&scene=8&poster=film'), 'https://review.invalid')
  assert.equal(returned.pathname, '/review')
  assert.deepEqual(Object.fromEntries(returned.searchParams), {
    design: 'kpr5', lang: 'ko', q: 'SKY#123 & FF', identity: 'admin', season: 'FCR2026'
  })
  assert.equal(new URL(buildReviewEntryPath('FCR26', 'zh-CN', '', { identity: 'unknown' }), returned.origin).searchParams.has('identity'), false)
})

test('entry return paths reject external URLs, story routes, and a different season', () => {
  const fallback = buildReviewEntryPath('FCR26', 'en-US', 'design=original')
  for (const returnTo of [null, '//example.com/review?season=FCR2026', 'https://example.com/review?season=FCR2026', '/review/story/player/1?season=FCR2026', '/review?season=FCA2026&q=SKY', '/review?q=SKY']) {
    assert.equal(getReviewEntryReturnPath(returnTo, 'FCR26', 'en-US', 'design=original'), fallback)
  }
})

test('staff search subtitles translate complete role phrases before individual words', () => {
  for (const locale of ['en-US', 'ko-KR']) {
    for (const identity of ['admin', 'caster']) {
      const source = getReviewSearchResults(db, identity, '')[0]
      assert.ok(source)
      const result = localizeReviewSearchResult(source, locale)
      assert.equal(result.to, source.to)
      assert.equal(result.title, source.title)
      assert.doesNotMatch(result.subtitle, /赛管|解说|裁判|导播合并统计/)
    }
  }
})

test('chapter links retain the role and language, but drop modal and unrelated query state', () => {
  const href = 'https://stats.fries-cup.com/review/story/team/FCR26-T001?season=FCR2026&lang=ko&as=coach&who=Alice%23123&design=kpr5&poster=film&scene=2&token=private#draft'
  const link = new URL(buildReviewSceneUrl(href, 5))
  assert.equal(link.pathname, '/review/story/team/FCR26-T001')
  assert.deepEqual(Object.fromEntries(link.searchParams), { season: 'FCR2026', lang: 'ko', as: 'coach', who: 'Alice#123', design: 'kpr5', scene: '6' })
  assert.equal(link.hash, '')
  assert.equal(new URL(buildReviewSceneUrl(href, -3)).searchParams.get('scene'), '1')
})

test('editorial presentation keeps the same records in all languages and leaves source stories untouched', () => {
  const staff = buildStaffIndex(db).admins[0]
  assert.ok(staff)
  for (const source of [buildTournamentStory(db), buildStaffStory(db, 'admin', staff.staff_key), buildTeamStory(db, 'FCR26-T001', 'manager', '四季冬#51594')]) {
    const original = JSON.stringify(source)
    for (const locale of locales) {
      const result = localizeReviewScenes(source, locale, getLocalizedReviewSeasonProfile('FCR26', locale))
      assert.equal(result.length, source.length)
      assert.ok(result.some(scene => scene.recordNote))
      for (let index = 0; index < source.length; index += 1) {
        assert.equal(result[index].eyebrow, source[index].eyebrow)
        assert.equal(result[index].kind, source[index].kind)
        assert.deepEqual(result[index].witnessStats?.map(item => item.value), source[index].witnessStats?.map(item => item.value))
        if (result[index].recordNote) assert.ok(result[index].body.length > 0)
      }
    }
    assert.equal(JSON.stringify(source), original)
  }
})

test('roster-only players and late-joining coaches retain their essential story boundaries', () => {
  const roster = buildPlayerStory(db, 'FCR26-P0004')
  const lateCoach = buildTeamStory(db, 'FCR26-T017', 'coach', '老练的白鲸#55247')
  assert.ok(roster.some(scene => scene.eyebrow === 'BEYOND THE NUMBERS'))
  assert.ok(lateCoach.some(scene => scene.eyebrow === 'POSTSEASON ROSTER'))
  for (const locale of locales) {
    for (const source of [roster, lateCoach]) {
      const result = localizeReviewScenes(source, locale, getLocalizedReviewSeasonProfile('FCR26', locale))
      assert.equal(result.length, source.length)
      assert.equal(result.filter(scene => scene.recordNote).length, 0)
    }
  }
  assert.deepEqual(localizeReviewScenes(lateCoach, 'zh-CN'), lateCoach)
})

test('a cross-role partner remains the same person when the review language changes', () => {
  const source = buildStaffStory(db, 'admin', '照井龙')
  const original = source.find(scene => scene.eyebrow === 'STAFF PARTNERS')
  assert.ok(original.title.includes('Maverick'))
  for (const locale of locales) {
    const result = localizeReviewScenes(source, locale, getLocalizedReviewSeasonProfile('FCR26', locale))
    const partners = result.find(scene => scene.eyebrow === 'STAFF PARTNERS')
    assert.ok(partners.title.includes('Maverick'), `${locale}: partner title`)
    assert.ok(partners.body.includes('Maverick'), `${locale}: partner body`)
  }
})

test('new interactions and format explanations have copy in all review languages', () => {
  for (const locale of locales) {
    for (const key of ['storyNavigation', 'recordNote', 'keepsakeShort', 'witnessShort', 'letterShort', 'copyScene', 'sceneCopied', 'sceneCopyFailed', 'sceneLink', 'retryGenerate', 'ticketUse', 'posterUse', 'movieTicketUse', 'directorCutUse']) {
      assert.ok(reviewText(locale, key))
      assert.notEqual(reviewText(locale, key), key)
    }
  }
})
