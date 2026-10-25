const idOf = team => String(team?.id || team?.team_id || '')
const score = value => typeof value !== 'boolean' && value !== null && value !== undefined && String(value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null

export function verifiedSeriesMaps(match, maps) {
  const sides = [idOf(match.team_a), idOf(match.team_b)], scores = [score(match.team_a?.score), score(match.team_b?.score)]
  const target = Number(String(match.format || '').match(/^FT([234])$/i)?.[1]) || null
  const expected = target ? scores[0] + scores[1] : 5
  if (match.state !== 'complete' || sides.some(id => !id) || sides[0] === sides[1] || scores.some(value => value === null) ||
    scores[0] + scores[1] !== expected || maps.length !== expected ||
    target && (Math.max(...scores) !== target || Math.min(...scores) >= target) ||
    maps.some((map, index) => map.is_administrative || Number(map.order) !== index + 1 || !sides.includes(String(map.winner)))) return false
  const running = [0, 0]
  for (const [index, map] of maps.entries()) {
    running[sides.indexOf(String(map.winner))]++
    if (target && index < maps.length - 1 && running.some(value => value >= target)) return false
  }
  return scores.every((value, index) => value === running[index])
}
