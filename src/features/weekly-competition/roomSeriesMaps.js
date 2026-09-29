// Reviewed results are authoritative for the visible series summary. Keep the
// original live-room records separate, especially for reports entered later.
export function roomSeriesMaps(data) {
  if (!data.result?.official) return data.maps || []
  return (data.result.maps || []).map(map => ({ ...map, status: 'COMPLETE' }))
}
