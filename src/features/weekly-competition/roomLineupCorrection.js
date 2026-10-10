export function getRoomLineupCorrection(data, teamId) {
  const view = data?.captainAgreements?.lineup
  if (!view || data.phase !== 'PREPARING' || !data.opening || data.opening.complete) return null
  const representative = data.access?.staff || data.access?.representativeTeams?.includes(teamId)
  const pending = Boolean(view.valid && view.status === 'PENDING')
  const canOperate = Boolean(view.withdrawTeams?.includes(teamId) || representative && (view.canRequest || view.canRespond || view.canCancel))
  if (!canOperate && !(pending && data.match?.[`team${view.proposerSide}`]?.id === teamId)) return null
  return { pending, canOperate }
}
