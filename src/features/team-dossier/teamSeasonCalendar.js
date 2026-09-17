import { getTeamSeasonChapters } from './teamEditorialContent.js'
import { getDossierStageLabel } from './teamDossierPresentation.js'

export function calendarDate(row, locale = 'zh-CN') {
  const match = String(row.timeLabel || '').match(/^(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/)
  const sourceDate = new Date(row.match?.scheduled_at || '')
  const year =
    String(row.match?.scheduled_date || '').match(/^(\d{4})-/)?.[1] ||
    (Number.isFinite(sourceDate.getTime()) ? String(sourceDate.getFullYear()) : null)
  if (!match || !year)
    return { key: 'undated', date: null, month: '—', day: '—', time: '', weekday: '', timestamp: null }
  const date = `${year}-${match[1]}-${match[2]}`
  const timestamp = Date.parse(`${date}T12:00:00Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date)
    return { key: 'undated', date: null, month: '—', day: '—', time: '', weekday: '', timestamp: null }
  return {
    key: `${year}-${match[1]}`,
    date,
    month: match[1],
    day: match[2],
    time: match[3] || '',
    timestamp,
    weekday: new Intl.DateTimeFormat(locale === 'en-US' ? 'en-US' : 'zh-CN', {
      weekday: 'short',
      timeZone: 'UTC'
    }).format(timestamp)
  }
}

export function buildSeasonCalendar(rows, advanceState, locale = 'zh-CN') {
  const chapters = getTeamSeasonChapters(rows, advanceState, locale)
  const milestones = new Map(
    chapters.map((chapter) => [
      chapter.row.match.match_id,
      chapter.kind === 'opening' && chapter.records.length > 1
        ? {
            ...chapter,
            title: `${getDossierStageLabel(chapter.row.match.stage, locale)} · ${chapter.records.length} ${locale === 'en-US' ? 'played series' : '场交手'}`
          }
        : chapter
    ])
  )
  const unique = [...new Map(rows.map((row) => [row.match.match_id, row])).values()]
  const entries = unique
    .map((row) => ({
      row,
      date: calendarDate(row, locale),
      milestone: milestones.get(row.match.match_id) || null
    }))
    .sort(
      (a, b) =>
        (a.date.timestamp ?? Infinity) - (b.date.timestamp ?? Infinity) ||
        String(a.row.match.scheduled_at || '').localeCompare(String(b.row.match.scheduled_at || ''))
    )
  const months = []
  for (const entry of entries) {
    let group = months.find((item) => item.key === entry.date.key)
    if (!group) {
      const previous = months.at(-1)?.entries.at(-1)?.date.timestamp
      group = {
        key: entry.date.key,
        month: entry.date.month,
        entries: [],
        gap:
          previous !== undefined && previous !== null && entry.date.timestamp !== null
            ? Math.round((entry.date.timestamp - previous) / 86400000)
            : null
      }
      months.push(group)
    }
    group.entries.push(entry)
  }
  return { months, entries, chapters }
}
