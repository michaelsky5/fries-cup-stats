export function canExtendRoomPreparation(data) {
  return Boolean(data?.access?.staff && data.access.canWrite !== false && !data.simulation && !data.result && !data.archived
    && data.phase === 'PREPARING' && ['PENDING', 'IN_PROGRESS'].includes(data.match?.status)
    && data.timing?.preparationDueAt && !data.timing.publicFault?.active
    && !['LIVE', 'COMPLETE'].includes(data.map?.status))
}

export function preparationExtensionDeadline(data, seconds) {
  const due = Date.parse(data?.timing?.preparationDueAt)
  const now = Date.parse(data?.timing?.serverNow)
  return Number.isFinite(due) && Number.isFinite(now) ? new Date(Math.max(due, now) + seconds * 1000).toISOString() : null
}
