import { getSeasonRatingValue } from '../../lib/seasonRatingPolicy.js'

// A missing observation is not a zero. Keep that distinction in both the
// displayed values and the comparison's deltas / extrema.
export function getRankingValue(entry, metricId, mode = 'per10') {
  if (metricId === 'score') return getSeasonRatingValue(entry)
  const raw = entry?.metrics?.[mode]?.[metricId]
  if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function getComparisonCells(entries, metricId, mode, baselineKey) {
  const precision = metricId === 'score' || mode === 'total' ? 0 : 1
  const values = entries.map(entry => {
    const value = getRankingValue(entry, metricId, mode)
    return value === null ? null : Number(value.toFixed(precision))
  })
  const baselineIndex = Math.max(0, entries.findIndex(entry => entry.entryKey === baselineKey))
  const baseline = values[baselineIndex] ?? null
  const finite = values.filter(value => value !== null)
  const distinct = new Set(finite)
  const highlight = metricId === 'score' || mode !== 'total'
  const extreme = finite.length > 1 && distinct.size > 1 && highlight
    ? (metricId === 'dth' ? Math.min(...finite) : Math.max(...finite))
    : null
  const maximum = Math.max(1, ...finite.map(Math.abs))
  return values.map((value, index) => ({
    value,
    isBaseline: index === baselineIndex,
    delta: value === null || baseline === null ? null : Number((value - baseline).toFixed(precision)),
    isExtreme: value !== null && value === extreme,
    fraction: value === null ? 0 : Math.min(1, Math.abs(value) / maximum)
  }))
}

export function sanitizeComparisonKeys(keys, entryByKey) {
  const result = []
  let role = ''
  for (const key of keys) {
    const entry = entryByKey.get(key)
    if (!entry || result.includes(key) || (role && entry.role !== role)) continue
    role = entry.role
    result.push(key)
    if (result.length === 4) break
  }
  return result
}
