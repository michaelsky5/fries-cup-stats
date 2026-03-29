export function formatText(value, fallback = '-') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text ? text : fallback
}

export function formatScore(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

export function formatInt(value, fallback = '0') {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.round(num).toLocaleString()
}

export function formatDecimal(value, digits = 2, fallback = '0.00') {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return num.toFixed(digits)
}

export function formatUpdatedAt(value, fallback = '-') {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function formatDateOnly(value, fallback = '-') {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

export function formatStatus(value) {
  const status = String(value || 'PENDING').toUpperCase()
  if (status === 'COMPLETED') return 'COMPLETE'
  return status
}

export function formatMatchScore(match) {
  const a = formatScore(match?.team_a?.score)
  const b = formatScore(match?.team_b?.score)
  return `${a} : ${b}`
}

export function formatPlayerTime(row) {
  if (row?.total_time_played) return row.total_time_played
  const mins = Number(row?.raw_time_mins || 0)
  if (!Number.isFinite(mins) || mins <= 0) return '0m'
  if (mins < 60) return `${Math.round(mins)}m`

  const hrs = Math.floor(mins / 60)
  const rest = Math.round(mins % 60)
  return `${hrs}h ${rest}m`
}

export function getStatusClassName(status) {
  const normalized = formatStatus(status)
  if (normalized === 'COMPLETE') return 'complete'
  if (normalized === 'IN_PROGRESS') return 'progress'
  return 'pending'
}