import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { getSeasonById } from '../src/config/seasons.js'
import { createScoutingArtifacts } from '../src/features/scouting/scoutingArtifactModel.js'
import { buildScoutingReportModel } from '../src/features/scouting/scoutingReportModel.js'

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url))
const sourcePath = path.join(workspaceRoot, 'public', 'data', 'fcr2026_local_public.json')
const outputRoot = path.join(workspaceRoot, 'public', 'data', 'scouting', 'fcr26')
const playerOutputRoot = path.join(outputRoot, 'players')

const db = JSON.parse(await readFile(sourcePath, 'utf8'))
const model = buildScoutingReportModel(db, getSeasonById('FCR26'))
const artifacts = createScoutingArtifacts(model, db.meta)

await mkdir(playerOutputRoot, { recursive: true })

const expectedPlayerFiles = new Set(
  Object.keys(artifacts.details).map(playerId => `${playerId}.json`)
)
const stalePlayerFiles = (await readdir(playerOutputRoot, { withFileTypes: true }))
  .filter(entry => (
    entry.isFile() &&
    /^FCR26-P\d{4}\.json$/.test(entry.name) &&
    !expectedPlayerFiles.has(entry.name)
  ))

await Promise.all(stalePlayerFiles.map(entry => (
  unlink(path.join(playerOutputRoot, entry.name))
)))

const indexJson = `${JSON.stringify(artifacts.index)}\n`
await writeFile(path.join(outputRoot, 'index.json'), indexJson, 'utf8')

await Promise.all(Object.entries(artifacts.details).map(([playerId, detail]) => (
  writeFile(path.join(playerOutputRoot, `${playerId}.json`), `${JSON.stringify(detail)}\n`, 'utf8')
)))

const detailBytes = Object.values(artifacts.details)
  .map(detail => Buffer.byteLength(JSON.stringify(detail)))

console.log(JSON.stringify({
  reportVersion: artifacts.index.meta.reportVersion,
  selectedPlayers: artifacts.index.players.length,
  stalePlayerFilesRemoved: stalePlayerFiles.map(entry => entry.name),
  indexBytes: Buffer.byteLength(indexJson),
  largestPlayerBytes: Math.max(...detailBytes),
  totalPlayerBytes: detailBytes.reduce((sum, value) => sum + value, 0)
}, null, 2))
