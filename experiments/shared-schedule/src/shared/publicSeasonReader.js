import { getSeasonById, SEASONS } from './publicSeasons.js'
import { validatePublicSnapshot } from './publicSnapshot.js'
import { createPublicScheduleReader } from './publicScheduleReader.js'

export function createPublicSeasonReader({ request, origin = 'https://admin.fries-cup.com', timeoutMs, now }) {
  const readers = new Map()
  return function read(force = false, seasonId = 'FCW26') {
    if (!SEASONS.some(item => [item.id, item.publicCode].includes(String(seasonId).toUpperCase()))) return Promise.reject(new Error('未知公开赛事'))
    const season = getSeasonById(seasonId)
    if (!readers.has(season.id)) readers.set(season.id, createPublicScheduleReader({ request, url: `${origin}/api/public/seasons/${season.id}/publish/latest/data`, timeoutMs, now, validate: raw => validatePublicSnapshot(raw, season) }))
    return readers.get(season.id)(force)
  }
}
