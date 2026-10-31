// Reading preferences and synthetic exercise scoring only; never grant room access.
export const GUIDE_FORMATS = ['RR5', 'FT2', 'FT3']
export const guideFormat = value => GUIDE_FORMATS.includes(value) ? value : 'RR5'

export function guideCopyForFormat(text, format) {
  return format === 'RR5' ? text : { ...text, ...Object.fromEntries(Object.entries(text).filter(([key]) => key.startsWith('ft.')).map(([key, value]) => [key.slice(3), value])) }
}

export function practiceSeries(maps, format = 'RR5') {
  const winTarget = format === 'FT2' ? 2 : format === 'FT3' ? 3 : null
  const completed = maps.filter(map => map.status === 'COMPLETE')
  let scoreA = 0, scoreB = 0, drawCount = 0
  for (const map of completed) {
    if (map.isAdministrative && map.administrativeReason === 'MAP_FORFEIT') {
      if (map.forfeitedBySide === 'B') scoreA++
      else if (map.forfeitedBySide === 'A') scoreB++
    } else if (Number.isFinite(map.scoreA) && Number.isFinite(map.scoreB)) {
      if (map.scoreA > map.scoreB) scoreA++
      else if (map.scoreB > map.scoreA) scoreB++
      else drawCount++
    }
  }
  return { scoreA, scoreB, drawCount, completedMaps: completed.length, winTarget, mapLimit: winTarget ? null : 5,
    complete: winTarget ? Math.max(scoreA, scoreB) >= winTarget : completed.length >= 5 }
}
