const list = value => Array.isArray(value) ? value : []

// A diagram can explain the published rules before fixtures exist. These nodes
// remain presentation placeholders; they never become seeds or match records.
export function buildWeeklyBracketPresentation(model) {
  const seededTeam = seed => {
    const row = model.seedsCurrent ? list(model.seeds).find(item => item.seed === seed) : null
    return row?.team ? { ...row.team, seed } : null
  }
  const semifinals = list(model.semifinals).flatMap(round => list(round.items))
  const finals = list(model.finals).flatMap(round => list(round.items))
  const thirdPlaces = list(model.thirdPlaces).flatMap(round => list(round.items))
  const directFinal = !semifinals.length && (finals.length > 0 || model.seedsCurrent && list(model.seeds).length > 0 && model.seeds.length <= 2)
  const placeholder = (id, a, b, sources, format) => ({
    id, type: 'PLACEHOLDER', state: 'unpublished', match: null,
    a, b, sources, format, scoreA: null, scoreB: null, winner: null
  })
  return {
    semifinals: directFinal ? [] : semifinals.length ? semifinals : [[1, 4], [2, 3]].map(([a, b], index) =>
      placeholder(`semifinal-placeholder-${index + 1}`, seededTeam(a), seededTeam(b),
        [{ kind: 'SEED', number: a }, { kind: 'SEED', number: b }], 'FT3')),
    finals: finals.length ? finals : [placeholder('final-placeholder',
      directFinal ? seededTeam(1) : model.finalists?.[0] || null,
      directFinal ? seededTeam(2) : model.finalists?.[1] || null,
      [1, 2].map(number => ({ kind: directFinal ? 'SEED' : 'SEMIFINAL_WINNER', number })), model.finalFormat)],
    thirdPlaces,
    hasPublishedMatches: semifinals.length > 0 || finals.length > 0 || thirdPlaces.length > 0,
    directFinal
  }
}
