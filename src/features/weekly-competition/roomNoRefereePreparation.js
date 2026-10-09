export function canRecordPreparationIncident(data) {
  return Boolean(data.canReportPreparationTimeout && data.access.canWrite && data.access.operatorMode === 'TEAM_CAPTAINS'
    && data.access.representativeTeams.length && !data.training && !data.timing?.publicFault?.active
    && data.timing?.preparationOverdue && ['PENDING', 'IN_PROGRESS'].includes(data.match.status)
    && !data.timing.preparationIncidents?.some(item => item.mapOrder === (data.map?.order || 1) && data.access.representativeTeams.includes(item.teamId)))
}
