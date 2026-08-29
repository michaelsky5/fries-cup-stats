import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getSeasonById } from '../src/config/seasons.js'
import { getPlayerShareCardModel } from '../src/features/player-share/playerShareSelectors.js'
import { buildTeamStory } from '../src/lib/reviewStoryBuilders.js'
import { getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { getTeamLogoCandidates as getReviewTeamLogoCandidates } from '../src/lib/reviewAssets.js'

const DATA_ROOT = path.resolve('public/data')
const DEFAULT_FILE_NAMES = new Set(['ow.png', 'tbd.png', 'fc_logo.png'])
const EXPECTED_QGCS4_CUSTOM_TEAMS = new Set([
  'QGCS4-T01',
  'QGCS4-T03',
  'QGCS4-T04',
  'QGCS4-T05',
  'QGCS4-T06',
  'QGCS4-T09',
  'QGCS4-T11',
  'QGCS4-T12',
  'QGCS4-T14',
  'QGCS4-T15',
  'QGCS4-T16',
  'QGCS4-T19'
])

function localAssetPath(url) {
  if (!String(url || '').startsWith('/logos/')) return ''
  return path.resolve('public', decodeURIComponent(url.slice(1)))
}

function firstExistingAsset(candidates) {
  return candidates.find(url => {
    if (/^https?:\/\//i.test(url)) return true
    const assetPath = localAssetPath(url)
    return assetPath && fs.existsSync(assetPath)
  }) || ''
}

function isDefaultAsset(url) {
  const assetPath = localAssetPath(url)
  return assetPath ? DEFAULT_FILE_NAMES.has(path.basename(assetPath).toLowerCase()) : false
}

function inferSeasonId(db) {
  const explicit = db?.meta?.season_id ||
    db?.meta?.seasonId ||
    db?.meta?.season_code ||
    db?.season?.id ||
    db?.season_id ||
    db?.season_code
  if (explicit) return String(explicit)
  return String(db?.teams?.[0]?.team_id || '').match(/^(.+?)-T(?:EAM)?\d/i)?.[1] || ''
}

const fixtureFiles = fs.readdirSync(DATA_ROOT, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => entry.name)
  .sort((left, right) => left.localeCompare(right, 'en'))

const auditRows = []

for (const fileName of fixtureFiles) {
  const filePath = path.join(DATA_ROOT, fileName)
  const db = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (!Array.isArray(db.teams) || !db.teams.length) continue
  const seasonId = inferSeasonId(db)
  assert.ok(seasonId, `${fileName}: season id must be discoverable`)

  for (const team of db.teams) {
    const label = `${fileName}:${team.team_id || team.team_short_name}`
    const rawAsset = firstExistingAsset(getTeamLogoCandidates(team, seasonId))
    const playerShareTeam = {
      team_id: team.team_id,
      team_short_name: team.team_short_name,
      team_name: team.team_name,
      team_logo: team.team_logo
    }
    const playerShareAsset = firstExistingAsset(getTeamLogoCandidates(playerShareTeam, seasonId))
    const reviewAsset = firstExistingAsset(getReviewTeamLogoCandidates(team, db))

    assert.ok(rawAsset, `${label}: raw team must resolve an existing asset`)
    assert.equal(playerShareAsset, rawAsset, `${label}: player share must match the canonical team logo`)
    assert.equal(reviewAsset, rawAsset, `${label}: review must match the canonical team logo`)
    const teamStory = buildTeamStory(db, team.team_id || team.team_short_name)
    assert.ok(Array.isArray(teamStory) && teamStory.length, `${label}: team review story exists`)
    assert.equal(teamStory[0]?.image, rawAsset, `${label}: rendered review cover must use the canonical team logo`)

    auditRows.push({ fileName, seasonId, team, asset: rawAsset })
  }
}

const qgcsRows = auditRows.filter(row => row.fileName === 'qgcs4_preseason_public.json')
assert.equal(qgcsRows.length, 19, 'QGCS4 team audit coverage')
assert.deepEqual(
  new Set(qgcsRows.filter(row => !isDefaultAsset(row.asset)).map(row => row.team.team_id)),
  EXPECTED_QGCS4_CUSTOM_TEAMS,
  'all QGCS4 teams with supplied artwork must resolve a dedicated logo'
)
assert.equal(qgcsRows.filter(row => isDefaultAsset(row.asset)).length, 7, 'QGCS4 teams without artwork use OW')

const qgcsDb = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'qgcs4_preseason_public.json'), 'utf8'))
const qgcsSeason = getSeasonById('QGCS4')
for (const teamId of EXPECTED_QGCS4_CUSTOM_TEAMS) {
  const player = qgcsDb.players.find(item => item.team_id === teamId)
  assert.ok(player, `${teamId}: share-model player fixture exists`)
  const model = getPlayerShareCardModel({
    db: qgcsDb,
    season: qgcsSeason,
    seasonId: 'QGCS4',
    playerId: player.player_id,
    role: player.role,
    updatedAtText: '',
    locale: 'zh'
  })
  assert.ok(model, `${teamId}: player share model exists`)
  assert.equal(model.identity.teamId, teamId, `${teamId}: player share preserves team id`)
  const modelAsset = firstExistingAsset(getTeamLogoCandidates({
    team_id: model.identity.teamId,
    team_short_name: model.identity.teamShortName,
    team_name: model.identity.teamName,
    team_logo: model.identity.teamLogo
  }, model.season.code))
  assert.equal(isDefaultAsset(modelAsset), false, `${teamId}: player share must not use OW`)
}

const directLogo = getTeamLogoCandidates({
  team_id: 'QGCS4-T06',
  team_short_name: 'SK',
  team_logo: 'https://assets.example/sk.svg'
}, 'QGCS4')
assert.equal(directLogo[0], 'https://assets.example/sk.svg', 'explicit team_logo has priority')
assert.ok(directLogo.includes('/logos/QGCS4/SK.png'), 'catalog asset remains a fallback')

const futureSeason = getTeamLogoCandidates({
  team_id: 'FCX27-T001',
  team_short_name: 'NOVA',
  team_name: 'Nova Club'
}, 'FCX27')
assert.equal(futureSeason[0], '/logos/FCX27/NOVA.png', 'future season follows directory convention')
assert.ok(futureSeason.includes('/logos/FCX27/OW.png'), 'future season keeps its OW fallback')
assert.equal(futureSeason.at(-1), '/logos/fc_logo.png', 'global fallback remains last')

const matchSelectorSource = fs.readFileSync('src/lib/matchesSelectors.js', 'utf8')
assert.doesNotMatch(matchSelectorSource, /QGCS4_TEAM_LOGO_FILES/, 'season-specific logo maps stay out of application code')

const uniqueAuditRows = Array.from(new Map(auditRows.map(row => [
  `${row.seasonId}:${row.team.team_id || row.team.team_short_name}`,
  row
])).values())
const summary = Map.groupBy(uniqueAuditRows, row => row.seasonId)
for (const [seasonId, rows] of summary) {
  const dedicated = rows.filter(row => !isDefaultAsset(row.asset)).length
  console.log(`${seasonId}: ${dedicated}/${rows.length} teams use dedicated artwork`)
}
console.log('Team logo resolution assertions passed')
