// Bracket adapters retain the published record in `raw`; match details use it
// directly. Both surfaces must prefer that published format to layout defaults.
export function getMatchFormatLabel(match) {
  const published = String(match?.format || match?.raw?.format || '').trim()
  if (published) return published

  const firstTo = Number(match?.firstTo ?? match?.first_to ?? match?.raw?.firstTo ?? match?.raw?.first_to)
  if (Number.isInteger(firstTo) && firstTo > 0) return `FT${firstTo}`

  const bestOf = Number(match?.bestOf ?? match?.best_of ?? match?.raw?.bestOf ?? match?.raw?.best_of)
  if (Number.isInteger(bestOf) && bestOf > 0) return `BO${bestOf}`
  return '—'
}
