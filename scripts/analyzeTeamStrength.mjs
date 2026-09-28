import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { prepareTeamStrengthData, auditCrossSeasonIdentities } from './lib/internalTeamStrengthData.mjs'
import { runTeamStrengthSeason, TEAM_STRENGTH_POLICY, fitPerformanceCoefficients } from './lib/internalTeamStrengthEngine.mjs'
import { evaluateSeasons } from './lib/internalTeamStrengthEvaluation.mjs'
import { renderTeamStrengthHtml, renderTeamStrengthMarkdown } from './lib/internalTeamStrengthReport.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.some((arg, index) => arg.startsWith('--') && (arg !== '--output' || !args[index + 1] || args[index + 1].startsWith('--')))) throw new Error('Usage: node scripts/analyzeTeamStrength.mjs [--output artifacts/<directory>]')
const output = path.resolve(root, args.includes('--output') ? args[args.indexOf('--output') + 1] : 'artifacts/internal-team-strength-20260926')
const relative = path.relative(path.join(root, 'artifacts'), output)
if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Output must be a child directory of artifacts/')
const inputFiles = [['FCA26', 'public/data/friescup_db_review_ready.json'], ['FCR26', 'public/data/fcr2026_local_public.json'], ['QGCS4', 'public/data/qgcs4_review_public.json']]
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex')
const sources = inputFiles.map(([seasonId, file]) => { const bytes = fs.readFileSync(path.join(root, file)); return { seasonId, path: file, sha256: sha256(bytes), data: prepareTeamStrengthData(JSON.parse(bytes), seasonId) } })
const modelFiles = ['scripts/analyzeTeamStrength.mjs', 'scripts/lib/internalTeamStrengthData.mjs', 'scripts/lib/internalTeamStrengthEngine.mjs', 'scripts/lib/internalTeamStrengthEvaluation.mjs', 'scripts/lib/internalTeamStrengthReport.mjs', 'scripts/team-strength-ui/report.js', 'scripts/team-strength-ui/report.css', 'src/lib/seasonOpponentStrength.js', 'src/lib/competitionDay.js', 'src/lib/heroes.js', 'src/lib/owTraditionalNames.js', 'src/lib/locales.js', 'src/lib/heroSubroleSelectors.js', 'src/config/heroSubroles.js']
const modelHashes = Object.fromEntries(modelFiles.map(file => [file, sha256(fs.readFileSync(path.join(root, file)))]))
const seasons = [], coefficientHistory = []
for (const source of sources) {
  const isValidation = source.seasonId === TEAM_STRENGTH_POLICY.validationSeason
  const result = runTeamStrengthSeason(source.data, isValidation ? { frozenCoefficients: fitPerformanceCoefficients(coefficientHistory) } : { coefficientHistory })
  if (!isValidation) coefficientHistory.push(...result.trainingRows)
  const { trainingRows: _trainingRows, ...saved } = result
  seasons.push(saved)
  console.log(`${source.seasonId}: ${result.audit.eligibleSeries} normal series, ${result.audit.verifiedLineupMaps} lineup maps, ${result.predictions.length} pre-day predictions`)
}
for (const source of sources) if (sha256(fs.readFileSync(path.join(root, source.path))) !== source.sha256) throw new Error(`Input changed during replay: ${source.path}`)
for (const [file, hash] of Object.entries(modelHashes)) if (sha256(fs.readFileSync(path.join(root, file))) !== hash) throw new Error(`Model changed during replay: ${file}`)
const report = { generatedAt: new Date().toISOString(), policy: TEAM_STRENGTH_POLICY,
  provenance: { inputs: sources.map(({ data: _data, ...source }) => source), modelHashes,
    parametersSelectedBeforeRun: true, sourceScope: 'Local archived public snapshots, not a live production fetch.' },
  evaluation: evaluateSeasons(seasons), identityAudit: auditCrossSeasonIdentities(sources.map(source => source.data)), seasons }
fs.mkdirSync(output, { recursive: true })
const json = (name, value) => fs.writeFileSync(path.join(output, name), `${JSON.stringify(value, null, 2)}\n`)
json('report.json', report)
json('predictions.json', seasons.flatMap(season => season.predictions))
json('ratings.json', seasons.flatMap(season => season.ratings.map(team => ({ seasonId: season.seasonId, ...team }))))
json('identity-candidates.json', report.identityAudit)
fs.writeFileSync(path.join(output, 'README.md'), renderTeamStrengthMarkdown(report))
fs.writeFileSync(path.join(output, 'index.html'), renderTeamStrengthHtml(report))
console.log(JSON.stringify({ output, developmentChoice: report.evaluation.developmentChoice, validationImprovesOverElo: report.evaluation.validationImprovesOverElo,
  metrics: report.evaluation.summaries.map(season => ({ season: season.seasonId, matches: season.all.matches, models: season.all.models })) }, null, 2))
