import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { TEAM_MATCHES_ANCHOR, TEAM_SEASON_ANCHOR, getDossierView, getDossierViewHref, getTeamArchiveRedirect } from '../src/features/team-dossier/teamArchiveRoutes.js'
import { SEASON_STORY_MAX_CHAPTERS, buildSeasonChronicle, getSeasonStoryChapters } from '../src/features/team-dossier/teamSeasonChronicle.js'
import { getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'

// 票 2.42: a team has two pages — 展厅 (/teams/:id) and 数据 (/teams/:id/analysis).
const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const redirect = (path, search = '', hash = '') => {
  const target = getTeamArchiveRedirect(path, search, hash)
  return target === null ? null : new URL(target, 'http://localhost')
}

test('the former 赛季征程 page splits: chronicle → 展厅 这一季, ledger → 数据 赛程赛果', () => {
  const chronicle = redirect('/teams/A/journey', '?season=FCW26&lang=en&design=kpr5&teamMatch=M1')
  assert.equal(chronicle.pathname, '/teams/A')
  assert.equal(chronicle.hash, `#${TEAM_SEASON_ANCHOR}`)
  assert.deepEqual(Object.fromEntries(chronicle.searchParams), { season: 'FCW26', lang: 'en', design: 'kpr5', teamMatch: 'M1' })
  for (const search of ['?journeyView=records&teamStage=PLAYOFFS&journey=all', '?chapter=journey&teamStage=PLAYOFFS&journey=all']) {
    const ledger = redirect('/teams/A/journey', search)
    assert.equal(ledger.pathname, '/teams/A/analysis', search)
    assert.equal(ledger.hash, `#${TEAM_MATCHES_ANCHOR}`, search)
    assert.equal(ledger.searchParams.get('teamStage'), 'PLAYOFFS', 'ledger filters survive the move')
    assert.equal(ledger.searchParams.get('journey'), 'all')
  }
  const scene = redirect('/teams/A', '?chapter=season-route&teamMatch=M2&member=P1')
  assert.equal(scene.pathname + scene.hash, `/teams/A#${TEAM_SEASON_ANCHOR}`)
  assert.equal(scene.searchParams.get('teamMatch'), 'M2', 'a member link still opens that match in 这一季 when it is a chapter')
})

test('redirect targets are final: no loops, no legacy keys, and current pages are left alone', () => {
  const cases = [['/teams/A/journey', ''], ['/teams/A/journey/', '?journeyView=records'], ['/teams/A', '?tab=matches'], ['/teams/A', '?tab=stats'], ['/teams/A/analysis', '?chapter=maps'], ['/teams/A', '?chapter=roster']]
  for (const [path, search] of cases) {
    const target = redirect(path, search)
    assert.ok(target, path + search)
    for (const key of ['chapter', 'tab', 'journeyView']) assert.equal(target.searchParams.has(key), false, path + search)
    assert.equal(getTeamArchiveRedirect(target.pathname, target.search, target.hash), null, 'the destination never redirects again: ' + path + search)
    assert.ok(['gallery', 'analysis'].includes(getDossierView(target.pathname)))
  }
  assert.equal(getTeamArchiveRedirect('/teams/A', '?season=S'), null)
  assert.equal(getTeamArchiveRedirect('/teams/A/analysis', '?season=S&analysisView=full'), null)
  assert.equal(redirect('/teams/A', '?chapter=maps', '#analysis-panel').hash, '#analysis-panel', 'an unrelated anchor is kept')
})

test('page links keep the site context and never point at the former journey page', () => {
  assert.equal(getDossierViewHref('/teams/A/analysis', '?season=S&lang=ko', 'gallery'), '/teams/A?season=S&lang=ko')
  assert.equal(getDossierViewHref('/teams/A', '?season=S', 'analysis', TEAM_MATCHES_ANCHOR), `/teams/A/analysis?season=S#${TEAM_MATCHES_ANCHOR}`)
  assert.equal(getDossierViewHref('/teams/A', '', 'journey'), '/teams/A')
  assert.equal(getDossierView('/teams/A/journey'), 'gallery')
})

test('这一季 tells at most four chapters and always keeps the closing one', () => {
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const chronicle = buildSeasonChronicle(rows, { isArchived: true, rank: 1 })
  const story = getSeasonStoryChapters(chronicle)
  assert.equal(story.mode, 'chapters')
  assert.ok(story.chapters.length <= SEASON_STORY_MAX_CHAPTERS)
  assert.equal(story.chapters.at(-1).kind, 'champion')
  const long = { ...chronicle, chapters: Array.from({ length: 6 }, (_, index) => ({ ...chronicle.chapters[0], id: `C${index}`, kind: index === 5 ? 'latest' : 'stage' })) }
  const limited = getSeasonStoryChapters(long)
  assert.deepEqual(limited.chapters.map(chapter => chapter.id), ['C0', 'C1', 'C2', 'C5'])
  assert.deepEqual(limited.chapters.map(chapter => chapter.number), ['01', '02', '03', '04'], 'chapters are renumbered after trimming')
})

test('with fewer than three played matches there is only a first-match card, never padded chapters', () => {
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const played = rows.filter(row => !row.administrative && !row.bye)
  for (const count of [1, 2]) {
    const chronicle = buildSeasonChronicle(played.slice(0, count), { isArchived: false })
    const story = getSeasonStoryChapters(chronicle)
    assert.equal(story.mode, 'first', `${count} played`)
    assert.equal(story.chapters.length, 1)
    assert.equal(story.chapters[0].row.match.match_id, chronicle.played[0].match.match_id)
    assert.equal(story.chapters[0].title, '首场比赛')
    assert.equal(getSeasonStoryChapters(chronicle, 'en-US').chapters[0].title, 'First match')
  }
  const none = getSeasonStoryChapters(buildSeasonChronicle(rows.filter(row => row.administrative || row.bye), { isArchived: true }))
  assert.deepEqual(none, { mode: 'empty', chapters: [] })
  assert.deepEqual(getSeasonStoryChapters(null), { mode: 'empty', chapters: [] })
})
