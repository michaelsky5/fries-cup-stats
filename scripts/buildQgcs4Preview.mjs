import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QGCS4_NATIONALITY_BY_PLAYER_ID } from '../src/features/scouting/qgcs4/qgcs4IdentityOverrides.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const readJson = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'))

export function resolveQgcs4BattleTag(players, candidate) {
  const matches = players.filter(player => player.player_id === candidate.id)
  assert.equal(matches.length, 1, `Expected one event identity: ${candidate.id}`)
  const identity = matches[0]
  assert.equal(identity.team_short_name, candidate.team, `Event team mismatch: ${candidate.id}`)
  const battleTag = String(identity.player_name || '').trim()
  assert.match(battleTag, /^[^#＃]+[#＃][0-9]{3,}$/, `Invalid recorded BattleTag: ${candidate.id}`)
  return battleTag
}

// This is a presentation projection, not another scoring run. Never publish the
// research artifact itself: it also contains duplicate inputs and audit traces.
export async function buildQgcs4Preview() {
  const [report, audit, notes, source] = await Promise.all([
    readJson('artifacts/qgcs4-scouting-review-v30/selection-v0.1-r3.json'),
    readJson('artifacts/qgcs4-scouting-review-v30/audit-v1.json'),
    fs.readFile(path.join(root, 'docs/scouting/qgcs4-selection-v0.1.md'), 'utf8'),
    readJson('artifacts/qgcs4-scouting-review-v30/source.json')
  ])
  assert.equal(report.source.season, 'QGCS4')
  assert.equal(report.source.publishVersion, 30)
  assert.equal(report.auditRevision, 3)
  assert.equal(report.source.parsedBodySha256, audit.source.parsedBodySha256)
  assert.equal(createHash('sha256').update(JSON.stringify(source)).digest('hex'), report.source.parsedBodySha256)
  const sections = new Map([...notes.matchAll(/^### (.+?) · (.+?)\r?\n([\s\S]*?)(?=^## |^### |$(?![\s\S]))/gm)]
    .map(([, name, team, text]) => [`${name}|${team}`, text]))
  const inputs = new Map(report.input.candidates.map(candidate => [candidate.id, candidate]))
  const stability = new Map(report.verification.stability.map(candidate => [candidate.id, candidate]))
  const sensitivity = new Map(report.verification.weightSensitivity.candidates.map(candidate => [candidate.id, candidate]))
  const players = report.candidates.map(candidate => {
    const input = inputs.get(candidate.id)
    const review = stability.get(candidate.id)
    const perturbation = sensitivity.get(candidate.id)
    const selectedEvidence = candidate.selected ? [...(sections.get(`${candidate.name}|${candidate.team}`) || '')
      .matchAll(/https:\/\/stats\.fries-cup\.com\/matches\/(QGCS4-[A-Z0-9-]+)\?season=QGCS4/g)].map(match => match[1]) : []
    if (candidate.selected) {
      assert.equal(selectedEvidence.length, 2, `Two reviewed matches required: ${candidate.name}`)
      assert(selectedEvidence.every(id => candidate.matches.some(match => match.id === id)))
    }
    return {
      id: candidate.id, name: candidate.name, team: candidate.team, position: candidate.position,
      battleTag: resolveQgcs4BattleTag(source.players, candidate),
      nationality: QGCS4_NATIONALITY_BY_PLAYER_ID[candidate.id] || null,
      selected: candidate.selected, rank: candidate.sharedRankInPool, poolSize: candidate.poolSize,
      score: candidate.score, factors: candidate.factors,
      contributions: candidate.contributions.map(({ key, value, weight, points }) => ({ key, value, weight, points })),
      scope: candidate.evidence.scope,
      analyzed: candidate.evidence.analyzed,
      metrics: candidate.metrics,
      heroes: candidate.heroes.map(({ hero, maps, matches, minutes }) => ({ hero, maps, matches, minutes })),
      stage: candidate.evidence.stage,
      phases: Object.fromEntries(Object.entries(input.stages).map(([key, phase]) => [key, {
        maps: phase.maps, matches: phase.matches, adjustedScore: phase.adjustedScore
      }])),
      context: {
        estimate: candidate.evidence.contextEstimate,
        interval90: candidate.evidence.contextInterval90,
        pressure: {
          maps: candidate.evidence.pressure.maps, matches: candidate.evidence.pressure.matches,
          adjustedScore: candidate.evidence.pressure.adjustedScore,
          eligible: candidate.evidence.pressure.eligible
        }
      },
      review: {
        retained: review.selectedRefits, total: review.fullRefits, ties: review.boundaryTieRefits,
        minRank: review.minRank, maxRank: review.maxRank,
        weightTrials: report.verification.weightSensitivity.trials, weightRetained: perturbation.selectedTrials
      },
      evidenceMatchIds: selectedEvidence,
      // Only the 20 dossier players need detailed matches in the UI payload.
      matches: candidate.selected ? candidate.matches.map(match => ({
        id: match.id, opponent: match.opponent, stage: match.stage, scheduledAt: match.scheduledAt,
        maps: match.maps, mapsUsed: match.mapsUsed, adjustedScore: match.adjustedScore,
        url: `https://stats.fries-cup.com/matches/${encodeURIComponent(match.id)}?season=QGCS4`
      })) : []
    }
  })
  return {
    schemaVersion: 1, modelVersion: report.modelVersion, auditRevision: report.auditRevision,
    source: report.source,
    counts: {
      realMatches: audit.counts.realMatches, realMaps: audit.counts.realMaps,
      adminMapsExcluded: audit.counts.adminMaps, playoffMatches: audit.counts.playoffMatches,
      references: report.referenceCount, dossiers: report.shortlistIds.length,
      retainedEveryRefit: players.filter(player => player.selected && player.review.retained === player.review.total).length
    },
    weights: report.weights, players
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = await buildQgcs4Preview()
  const target = path.join(root, 'src/features/scouting/qgcs4/qgcs4PreviewData.json')
  if (process.argv.includes('--check')) {
    assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), data, 'Preview projection is stale')
    console.log('QGCS4 preview data matches the fixed V30 / revision 3 artifact.')
  } else {
    await fs.mkdir(path.dirname(target), { recursive: true })
    const content = `${JSON.stringify(data)}\n`
    await fs.writeFile(target, content)
    console.log(`QGCS4 preview: ${data.counts.dossiers} dossiers, ${data.counts.references} references, ${Math.round(Buffer.byteLength(content) / 1024)} KiB. No public artifacts changed.`)
  }
}
