const EVENT_TIME_ZONE = 'Asia/Shanghai'
const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function toPositiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : 0
}

function getExplicitCompetitionDay(match) {
  return toPositiveInteger(match?.competition_day ?? match?.competitionDay)
}

function getRoundCompetitionDay(match) {
  return toPositiveInteger(`${match?.round || ''}`.match(/\bDAY\s+(\d+)\b/i)?.[1])
}

export function getMatchScheduleDateKey(match) {
  const explicitDate = normalizeText(match?.scheduled_date || match?.match_date || match?.date)
  const explicitKey = explicitDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (explicitKey) return explicitKey

  const rawTimestamp = normalizeText(match?.scheduled_at || match?.starts_at || match?.start_time)
  if (!rawTimestamp) return ''

  const timestamp = new Date(rawTimestamp)
  if (!Number.isFinite(timestamp.getTime())) return ''

  const parts = Object.fromEntries(
    EVENT_DATE_FORMATTER.formatToParts(timestamp)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  )
  return parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : ''
}

function getScheduledDateKeys(matches) {
  return Array.from(new Set(safeArr(matches).map(getMatchScheduleDateKey).filter(Boolean))).sort()
}

export function getCompetitionDayNumber(matches, match) {
  const rows = safeArr(matches)
  const explicitDay = getExplicitCompetitionDay(match)
  if (explicitDay) return explicitDay

  const dateKey = getMatchScheduleDateKey(match)
  if (dateKey) {
    const dateIndex = getScheduledDateKeys(rows).indexOf(dateKey)
    if (dateIndex >= 0) return dateIndex + 1
  }

  return getRoundCompetitionDay(match)
}

export function getCompetitionDayCount(matches) {
  const rows = safeArr(matches)
  const explicitDays = rows.map(getExplicitCompetitionDay).filter(Boolean)
  if (explicitDays.length === rows.length && explicitDays.length) return Math.max(...explicitDays)

  const dateKeys = getScheduledDateKeys(rows)
  if (dateKeys.length) return dateKeys.length

  const roundDays = rows.map(getRoundCompetitionDay).filter(Boolean)
  return roundDays.length ? Math.max(...roundDays) : 0
}

export function getCompetitionDayMatches(matches, referenceMatch) {
  const rows = safeArr(matches)
  if (!referenceMatch) return []

  const explicitDay = getExplicitCompetitionDay(referenceMatch)
  const allRowsHaveExplicitDays = rows.length > 0 && rows.every(match => getExplicitCompetitionDay(match))
  if (explicitDay && allRowsHaveExplicitDays) {
    return rows.filter(match => getExplicitCompetitionDay(match) === explicitDay)
  }

  const dateKey = getMatchScheduleDateKey(referenceMatch)
  if (dateKey) return rows.filter(match => getMatchScheduleDateKey(match) === dateKey)

  const roundDay = getRoundCompetitionDay(referenceMatch)
  return roundDay ? rows.filter(match => getRoundCompetitionDay(match) === roundDay) : []
}
