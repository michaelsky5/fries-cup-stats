import { translateUiText as formatUiText } from '../../lib/uiText.js'
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

export function getChronicleChapterLabel(kind, locale = 'zh-CN') {
  const labels = { opening: ['启程', 'Opening'], setback: ['转折', 'Turning point'], return: ['重逢', 'Rematch'], stage: ['下一程', 'Next stage'], champion: ['定格', 'Champions'], latest: ['最近一章', 'Latest entry'] }
  return formatUiText((labels[kind] || labels.latest)[locale === 'en-US' ? 1 : 0], locale)
}
