import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stats = path.resolve(trial, '../..')
const output = process.argv[2]
const catalog = JSON.parse(fs.readFileSync(path.join(trial, 'src/generated/seasons.json'), 'utf8'))
const report = await Promise.all(catalog.map(async season => {
  const url = `https://admin.fries-cup.com/api/public/seasons/${season.id}/publish/latest/data`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const body = await response.text()
    if (!response.ok) return { id: season.id, status: response.status, bytes: body.length }
    const data = JSON.parse(body)
    const file = path.join(output, `${season.id}-public.json`)
    fs.writeFileSync(file, body)
    return { id: season.id, status: response.status, bytes: Buffer.byteLength(body), season: data.season?.id || data.meta?.season_id,
      keys: Object.keys(data), teams: data.teams?.length, players: data.players?.length, matches: data.matches?.length, maps: data.matches?.reduce((sum, match) => sum + (match.maps?.length || 0), 0),
      firstMatchKeys: Object.keys(data.matches?.[0] || {}), firstMapKeys: Object.keys(data.matches?.find(match => match.maps?.length)?.maps?.[0] || {}), playerKeys: Object.keys(data.players?.[0] || {}), totalKeys: Object.keys(data.player_totals?.[0] || {}) }
  } catch (error) { return { id: season.id, error: error.message } }
}))
const locals = ['fcr2026_local_public.json', 'qgcs4_review_public.json', 'friescup_db_review_ready.json'].map(name => {
  const file = path.join(stats, 'public/data', name)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { name, bytes: fs.statSync(file).size, meta: data.meta?.season_id, teams: data.teams?.length, players: data.players?.length, matches: data.matches?.length }
})
fs.writeFileSync(path.join(output, 'public-inventory.json'), JSON.stringify({ report, locals }, null, 2))
console.log(JSON.stringify({ report, locals }, null, 2))
