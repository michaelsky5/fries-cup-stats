import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { getTeamLogoCandidates as getReviewTeamLogoCandidates } from '../src/lib/reviewAssets.js'

function assertAssetExists(url, label) {
  assert.ok(url.startsWith('/logos/'), `${label}: expected a local logo URL`)
  const assetPath = path.resolve('public', decodeURIComponent(url.slice(1)))
  assert.equal(fs.existsSync(assetPath), true, `${label}: ${url} must exist`)
}

const skTeam = {
  team_id: 'QGCS4-T06',
  team_short_name: 'SK',
  team_name: 'Snack'
}
assert.equal(getTeamLogoCandidates(skTeam, 'QGCS4')[0], '/logos/QGCS4/SK.png')
assert.equal(getTeamLogoCandidates({ team_short_name: 'SK', team_name: 'Snack' }, 'QGCS4')[0], '/logos/QGCS4/SK.png')
assert.equal(getTeamLogoCandidates({ team_id: 'QGCS4-T06', team_name: 'Snack' }, 'QGCS4')[0], '/logos/QGCS4/SK.png')
assert.equal(getTeamLogoCandidates({ team_id: 'QGCS4-T05' }, 'QGCS4')[0], '/logos/QGCS4/HCM.jpg')
assert.equal(getTeamLogoCandidates({ team_short_name: 'WHGSPC' }, 'QGCS4')[0], '/logos/QGCS4/WHG%20X%20SPC.png')
assert.equal(getTeamLogoCandidates({ team_short_name: 'AIP' }, 'FCR26')[0], '/logos/FCR/AIP.png')
assert.equal(getTeamLogoCandidates({ team_short_name: 'SK' }, 'FCA26')[0], '/logos/FCA/SK.png')

const directLogo = getTeamLogoCandidates({
  team_id: 'QGCS4-T06',
  team_short_name: 'SK',
  team_logo: 'https://assets.example/sk.svg'
}, 'QGCS4')
assert.equal(directLogo[0], 'https://assets.example/sk.svg')
assert.ok(directLogo.includes('/logos/QGCS4/SK.png'))

const futureSeason = getTeamLogoCandidates({
  team_id: 'FCX27-T001',
  team_short_name: 'NOVA',
  team_name: 'Nova Club'
}, 'FCX27')
assert.equal(futureSeason[0], '/logos/FCX27/NOVA.png')
assert.ok(futureSeason.includes('/logos/FCX27/OW.png'))
assert.equal(futureSeason.at(-1), '/logos/fc_logo.png')

assert.equal(getReviewTeamLogoCandidates(skTeam, 'QGCS4')[0], '/logos/QGCS4/SK.png')
assertAssetExists(getTeamLogoCandidates(skTeam, 'QGCS4')[0], 'QGCS4 SK')
assertAssetExists(getTeamLogoCandidates({ team_id: 'QGCS4-T05' }, 'QGCS4')[0], 'QGCS4 HCM')

const playerShareSource = fs.readFileSync('src/features/player-share/PlayerShareCard.jsx', 'utf8')
assert.match(playerShareSource, /team_id:\s*model\.identity\.teamId/, 'player share must preserve team id')
assert.match(playerShareSource, /team_logo:\s*model\.identity\.teamLogo/, 'player share must preserve explicit team logo')
const playerShareSelectorSource = fs.readFileSync('src/features/player-share/playerShareSelectors.js', 'utf8')
assert.match(playerShareSelectorSource, /teamLogo:\s*identity\.teamLogo/, 'player share model must preserve explicit team logo')
const playerDetailSource = fs.readFileSync('src/lib/playerDetailSelectors.js', 'utf8')
assert.match(playerDetailSource, /teamLogo:\s*normalize\(team\?\.team_logo/, 'player dossier must preserve explicit team logo')
const matchSelectorSource = fs.readFileSync('src/lib/matchesSelectors.js', 'utf8')
assert.doesNotMatch(matchSelectorSource, /QGCS4_TEAM_LOGO_FILES/, 'season-specific logo maps must stay out of application code')

console.log('Team logo resolution assertions passed')
