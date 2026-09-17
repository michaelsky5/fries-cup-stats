import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildSeasonChronicle } from '../src/features/team-dossier/teamSeasonChronicle.js'
import { getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'
import { getArchiveJourneyHref, getArchiveStageHref } from '../src/features/team-dossier/teamArchiveContent.js'

const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const state = { isArchived: true, rank: 1 }
const flattened = chronicle => [...chronicle.chapters.flatMap(chapter => [...chapter.before, ...chapter.entries]), ...chronicle.tail].map(row => row.match.match_id)

test('AIP retains every fixture exactly once while foregrounding opening, setback, rematch and final', () => {
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const chronicle = buildSeasonChronicle([...rows, rows[0]], state)
  assert.deepEqual(chronicle.chapters.map(chapter => chapter.kind), ['opening', 'setback', 'return', 'champion'])
  assert.deepEqual(flattened(chronicle), chronicle.rows.map(row => row.match.match_id))
  assert.equal(new Set(flattened(chronicle)).size, rows.length)
  assert.equal(chronicle.played.length, 10)
  assert.equal(chronicle.chapters[0].records.length, 5)
  assert.equal(chronicle.chapters[2].elapsedDays, 6)
  assert.equal(chronicle.chapters[2].previous.match.match_id, chronicle.chapters[1].id)
  assert.equal(chronicle.chapters.at(-1).date.date, '2026-08-16')
})

test('every FCR26 team keeps its entire ordered season, including administrative and undated records', () => {
  const ids = new Set(db.matches.flatMap(match => [match.team_a?.id, match.team_b?.id]).filter(id => id && id !== 'BYE'))
  for (const id of ids) {
    const rows = getPerformanceRows(db.matches, id)
    const chronicle = buildSeasonChronicle(rows, { isArchived: true, rank: id === 'FCR26-T026' ? 1 : null })
    assert.deepEqual(flattened(chronicle), chronicle.rows.map(row => row.match.match_id), id)
    for (const chapter of chronicle.chapters) assert.ok(!chapter.row.bye && !chapter.row.administrative && chapter.row.decided, id)
  }
})

test('an administrative entry between opening-stage games keeps its position inside the chapter', () => {
  const aip = getPerformanceRows(db.matches, 'FCR26-T026')
  const admin = aip.find(row => row.administrative)
  const source = [aip[0], { ...admin, match: { ...admin.match, stage: 'SWISS' } }, aip[1], aip.find(row => row.match.stage === 'PLAYOFFS' && !row.administrative)]
  const chronicle = buildSeasonChronicle(source, { isArchived: false })
  assert.equal(chronicle.chapters[0].records.length, 2)
  assert.equal(chronicle.chapters[0].entries[1].match.match_id, admin.match.match_id)
  assert.deepEqual(flattened(chronicle), source.map(row => row.match.match_id))
})

test('active, unrecorded and single-match seasons never manufacture a comeback or duplicate chapter', () => {
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const active = buildSeasonChronicle(rows, { isArchived: false, rank: 1 }, 'en-US')
  assert.equal(active.story.comeback, false)
  assert.ok(active.chapters.every(chapter => chapter.kind !== 'champion'))
  const noPlay = buildSeasonChronicle(rows.filter(row => row.administrative || row.bye), state)
  assert.equal(noPlay.chapters.length, 0)
  assert.equal(noPlay.played.length, 0)
  assert.equal(noPlay.tail.length, 2)
  assert.equal(buildSeasonChronicle([rows[0]], { isArchived: true }).chapters.length, 1)
  assert.equal(buildSeasonChronicle([], state).rows.length, 0)
})

test('a missing rematch date cannot produce an invented elapsed time', () => {
  const rows = getPerformanceRows(db.matches, 'FCR26-T026').map(row => row.match.match_id === 'FCR26-PLAYOFFS-R1-M13' ? { ...row, timeLabel: '时间待定', match: { ...row.match, scheduled_at: null, scheduled_date: null } } : row)
  const rematch = buildSeasonChronicle(rows, state).chapters.find(chapter => chapter.kind === 'return')
  assert.equal(rematch.date.date, null)
  assert.equal(rematch.elapsedDays, null)
})

test('member deep links reveal their match even after the ledger was selected, while stage links open the ledger', () => {
  const url = new URL(getArchiveJourneyHref('/teams/A/journey?journeyView=records&season=S&design=kpr5&lang=en', 'M1', 'P1'), 'http://localhost')
  assert.equal(url.searchParams.has('journeyView'), false)
  assert.equal(url.searchParams.get('teamMatch'), 'M1')
  assert.equal(url.searchParams.get('member'), 'P1')
  assert.equal(url.searchParams.get('lang'), 'en')
  const stage = new URL(getArchiveStageHref(url.pathname + url.search, 'PLAYOFFS'), 'http://localhost')
  assert.equal(stage.searchParams.get('journeyView'), 'records')
  assert.equal(stage.searchParams.has('teamMatch'), false)
})
