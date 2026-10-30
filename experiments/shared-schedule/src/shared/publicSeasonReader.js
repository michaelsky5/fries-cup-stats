import { getSeasonById, SEASONS } from './publicSeasons.js'
import { validatePublicSnapshot } from './publicSnapshot.js'
import { createPublicScheduleReader } from './publicScheduleReader.js'

export function createPublicSeasonReader({ request, origin = 'https://admin.fries-cup.com', pathPrefix = '/api/public', fallbackOrigin, timeoutMs, now, storageForSeason }) {
  const readers = new Map()
  function reader(seasonId) {
    if (!SEASONS.some(item => [item.id, item.publicCode].includes(String(seasonId).toUpperCase()))) throw new Error('未知公开赛事')
    const season = getSeasonById(seasonId)
    if (!readers.has(season.id)) readers.set(season.id, createPublicScheduleReader({ request, url: `${origin}${pathPrefix}/seasons/${season.id}/publish/latest/data`, fallbackUrls: fallbackOrigin ? [`${fallbackOrigin}/api/public/seasons/${season.id}/publish/latest/data`] : [], timeoutMs, now, storage: storageForSeason?.(season.id), validate: raw => validatePublicSnapshot(raw, season) }))
    return readers.get(season.id)
  }
  async function read(force = false, seasonId = 'FCW26') { return reader(seasonId)(force) }
  read.cached = async seasonId => reader(seasonId).cached()
  return read
}
