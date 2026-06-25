const OVR_ANCHORS = [
  [0, 60],
  [25, 70],
  [50, 78],
  [70, 83],
  [85, 88],
  [95, 94],
  [99, 98],
  [100, 99]
]

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function mapPercentileToOvr(percentile) {
  const value = toNumber(percentile)
  if (value === null) return null

  const clamped = Math.max(0, Math.min(100, value))
  for (let index = 1; index < OVR_ANCHORS.length; index += 1) {
    const [leftPct, leftOvr] = OVR_ANCHORS[index - 1]
    const [rightPct, rightOvr] = OVR_ANCHORS[index]
    if (clamped <= rightPct) {
      const span = rightPct - leftPct || 1
      const progress = (clamped - leftPct) / span
      return Math.round(leftOvr + (rightOvr - leftOvr) * progress)
    }
  }

  return 99
}

export function formatCardValue(value) {
  const number = toNumber(value)
  return number === null ? '—' : String(number).padStart(2, '0')
}
