import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getSeasonReportDefinition, SEASON_REPORT_IDS } from '../src/features/scouting/seasonReports/seasonReportCatalog.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const readFlag = name => {
  const inline = process.argv.find(value => value.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : null
}

if (process.argv.includes('--list')) {
  for (const seasonId of SEASON_REPORT_IDS) {
    const report = getSeasonReportDefinition(seasonId)
    console.log(`${seasonId}\t${report.renderer}\t${report.eventLabel}`)
  }
  process.exit(0)
}

const seasonId = String(readFlag('season') || '').toUpperCase()
const report = getSeasonReportDefinition(seasonId)
if (!report) throw new Error(`Unknown season report: ${seasonId || '(missing)'}. Use --list to inspect registered seasons.`)

const command = process.argv.includes('--check') ? report.verifyCommand : report.buildCommand
if (!command) throw new Error(`${seasonId}: ${process.argv.includes('--check') ? 'verification' : 'build'} command is not registered.`)
const [runtime, script, ...args] = command.split(' ')
if (runtime !== 'node' || !/^scripts\/[A-Za-z0-9.-]+\.mjs$/.test(script)) throw new Error(`${seasonId}: unsafe report command registration.`)

console.log(`${process.argv.includes('--check') ? 'Verifying' : 'Generating'} ${report.eventLabel} (${seasonId})…`)
const child = spawn(process.execPath, [path.join(root, script), ...args], { cwd: root, stdio: 'inherit', shell: false })
child.once('error', error => { throw error })
child.once('exit', (code, signal) => {
  if (signal) throw new Error(`${seasonId}: report command stopped by ${signal}.`)
  process.exitCode = code ?? 1
})
