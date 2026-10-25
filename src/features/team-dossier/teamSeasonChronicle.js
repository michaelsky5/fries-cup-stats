import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { getArchiveMatchReading } from './teamArchiveContent.js'
import { getTeamSeasonChapters } from './teamEditorialContent.js'
import { getDossierSceneRows, getDossierSeasonStory } from './teamDossierScenes.js'
import { buildDossierSummary } from './teamDossierPresentation.js'
import { calendarDate } from './teamSeasonCalendar.js'

export function buildSeasonChronicle(source, advanceState, locale = 'zh-CN') {
  const rows = getDossierSceneRows([...new Map(source.map(row => [row.match.match_id, row])).values()])
  const assigned = new Set()
  const chapters = getTeamSeasonChapters(rows, advanceState, locale).map((chapter, index) => {
    const end = rows.indexOf(chapter.row)
    const start = rows.indexOf(chapter.records[0])
    const records = rows.slice(0, end + 1).filter(row => !assigned.has(row.match.match_id))
    for (const row of records) assigned.add(row.match.match_id)
    const firstDate = calendarDate(chapter.records[0], locale)
    const date = calendarDate(chapter.row, locale)
    const previousDate = chapter.previous ? calendarDate(chapter.previous, locale) : null
    return {
      ...chapter,
      id: chapter.row.match.match_id,
      number: String(index + 1).padStart(2, '0'),
      before: records.filter(row => rows.indexOf(row) < start),
      entries: records.filter(row => rows.indexOf(row) >= start),
      firstDate, date,
      elapsedDays: previousDate?.timestamp != null && date.timestamp != null ? Math.round((date.timestamp - previousDate.timestamp) / 86400000) : null,
      summary: buildDossierSummary(chapter.records)
    }
  })
  return {
    rows, chapters,
    tail: rows.filter(row => !assigned.has(row.match.match_id)),
    played: rows.filter(row => row.decided && !row.bye && !row.administrative),
    story: getDossierSeasonStory(rows, advanceState, locale)
  }
}

// 票 2.42: the 展厅's "这一季" tells at most four chapters, always keeping the closing one. Below
// three played matches there is no arc to tell, so it shows the first match alone rather than
// padding chapters; the full ledger stays on the 数据 page.
export const SEASON_STORY_MAX_CHAPTERS = 4
export const SEASON_STORY_MIN_PLAYED = 3

export function getSeasonStoryChapters(chronicle, locale = 'zh-CN') {
  const played = chronicle?.played || []
  if (!played.length) return { mode: 'empty', chapters: [] }
  if (played.length < SEASON_STORY_MIN_PLAYED) {
    const row = played[0]
    const date = calendarDate(row, locale)
    return { mode: 'first', chapters: [{
      id: row.match.match_id, kind: 'opening', number: '01', row, records: [row], before: [], entries: [row],
      title: locale === 'en-US' ? 'First match' : formatUiText('首场比赛', locale),
      reading: getArchiveMatchReading(row, chronicle.rows, locale),
      firstDate: date, date, elapsedDays: null, summary: buildDossierSummary([row])
    }] }
  }
  const all = chronicle.chapters
  const chapters = all.length > SEASON_STORY_MAX_CHAPTERS ? [...all.slice(0, SEASON_STORY_MAX_CHAPTERS - 1), all.at(-1)] : all
  return { mode: 'chapters', chapters: chapters.map((chapter, index) => ({ ...chapter, number: String(index + 1).padStart(2, '0') })) }
}

export function getChronicleChapterLabel(kind, locale = 'zh-CN') {
  const labels = { opening: ['启程', 'Opening'], setback: ['转折', 'Turning point'], return: ['重逢', 'Rematch'], stage: ['下一程', 'Next stage'], champion: ['定格', 'Champions'], latest: ['最近一章', 'Latest entry'] }
  return formatUiText((labels[kind] || labels.latest)[locale === 'en-US' ? 1 : 0], locale)
}
