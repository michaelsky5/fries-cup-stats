const SEVERITY_ORDER = {
  URGENT: 0,
  IMPORTANT: 1,
  NORMAL: 2
}

function timestamp(value, fallback = Number.POSITIVE_INFINITY) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getPendingAcknowledgementAnnouncements(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item?.requiresAcknowledgement && !item?.receipt?.acknowledgedAt)
    .sort((left, right) => {
      const dueDifference = timestamp(left?.dueAt) - timestamp(right?.dueAt)
      if (dueDifference) return dueDifference

      const severityDifference = (SEVERITY_ORDER[String(left?.severity || '').toUpperCase()] ?? 3)
        - (SEVERITY_ORDER[String(right?.severity || '').toUpperCase()] ?? 3)
      if (severityDifference) return severityDifference

      return timestamp(right?.publishedAt, 0) - timestamp(left?.publishedAt, 0)
    })
}
