import { PERFORMANCE_METRICS } from './teamPerformance.js'

export function getPerformanceComparison(report, field, mode = 'field') {
  return PERFORMANCE_METRICS.map((metric) => {
    const own =
      mode === 'paired'
        ? report.paired[metric.id].own
        : mode === 'outcome'
          ? report.wins[metric.id]
          : report.metrics[metric.id]
    const reference =
      mode === 'paired'
        ? report.paired[metric.id].opponent
        : mode === 'outcome'
          ? report.losses[metric.id]
          : { value: field[metric.id].median, count: field[metric.id].samples.length }
    const difference =
      Number.isFinite(own.value) && Number.isFinite(reference.value) && reference.value > 0
        ? (own.value / reference.value - 1) * 100
        : null
    return { ...metric, own, reference, difference: Number.isFinite(difference) ? difference : null }
  })
}

export function getComparisonExtent(rows) {
  const maximum = Math.max(
    0,
    ...rows.map((row) => (Number.isFinite(row.difference) ? Math.abs(row.difference) : 0))
  )
  return Math.max(25, Math.ceil(maximum / 25) * 25)
}

export function comparisonPosition(difference, extent) {
  if (!Number.isFinite(difference) || !Number.isFinite(extent) || extent <= 0) return null
  return 50 + Math.max(-1, Math.min(1, difference / extent)) * 46
}

export function comparisonLabel(difference) {
  if (!Number.isFinite(difference)) return '—'
  const rounded = Math.round(difference * 10) / 10 || 0
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}
