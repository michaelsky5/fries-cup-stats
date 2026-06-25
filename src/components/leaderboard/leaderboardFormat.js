import { formatDecimal, formatInt } from '../../lib/format.js'

export function formatLeaderboardStat(value, mode, metricId) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  if (mode === 'total') return formatInt(num)
  if (metricId === 'elim' || metricId === 'ast' || metricId === 'dth') return formatDecimal(num, 1, '-')
  return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
