import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { OW_HEROES, getOwHero, getOwHeroRole, getOwMap, getOwMapImageName } from '../src/lib/heroes.js'
import { resolveHeroSubrole, getHeroRatingBaselineKey } from '../src/lib/heroSubroleSelectors.js'
import { getHeroArtwork } from '../src/lib/heroArtwork.js'
import { buildRatingBaselinesFromPlayerLogs, getRuntimeHeroBaseline } from '../src/lib/ratingBaselines.js'
import { buildMapAtlas } from '../src/features/map-atlas/mapAtlasModel.js'
import { buildTeamPerformance, getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'

assert.equal(OW_HEROES.length, 54)
assert.equal(getOwHero('血律')?.id, 'doctrine')
assert.equal(getOwHeroRole('Doctrine'), 'support')
assert.equal(getOwHeroRole('Sombra'), 'support')
assert.equal(getOwHeroRole('黑影', { role: 'DPS' }), 'damage')
assert.equal(getOwHeroRole('Sombra', { role: 'SUP' }), 'support')
assert.equal(getOwHeroRole('Sombra', { scheduledAt: '2026-09-20T10:00:00Z' }), 'damage')
assert.equal(getOwHeroRole('Sombra', null), 'support')
assert.equal(getOwHeroRole('Sombra', { gameVersion: 'overwatch-pre-season5', scheduledAt: '2026-10-08' }), 'damage')
for (const alias of ['Watchpoint: Grímsvötn', 'Watchpoint: Grimsvotn', 'Grimsvotn', '格里姆火山']) {
  assert.equal(getOwMap(alias)?.id, 'watchpoint-grimsvotn')
  assert.equal(getOwMap(alias)?.mode, 'escort')
  assert.equal(getOwMapImageName(alias), 'Watchpoint_Grimsvotn')
}
const oldSombra = resolveHeroSubrole('Sombra', { role: 'DPS' })
const newSombra = resolveHeroSubrole('Sombra', { role: 'SUP' })
assert.equal(oldSombra.scoringProfile, 'flanker_flex')
assert.equal(oldSombra.officialRole, 'DAMAGE')
assert.equal(newSombra.officialRole, 'SUPPORT')
assert.equal(newSombra.scoringProfile, 'unknown_support')
assert.equal(getHeroRatingBaselineKey(oldSombra), 'Sombra')
assert.equal(getHeroRatingBaselineKey(newSombra), 'Sombra:SUPPORT')
assert.equal(resolveHeroSubrole('血律', { role: 'SUP' }).officialRole, 'SUPPORT')
const artwork = getHeroArtwork('Doctrine')
assert(artwork)
assert.match(artwork.src, /\/hero-artwork\/support\/doctrine-/)
for (const source of [artwork.src, artwork.original, artwork.thumbnail]) {
  assert(existsSync(fileURLToPath(new URL(`../public${source}`, import.meta.url))), source)
}

const totals = { eliminations: 10, assists: 5, deaths: 3, damage: 5000, healing: 100, mitigation: 0 }
const baselines = buildRatingBaselinesFromPlayerLogs([
  { player_id: 'old', role: 'DPS', match_logs: [{ match_id: 'old', map_order: 1, hero: 'Sombra', role: 'DPS', playtimeMinutes: 10, totals }] },
  { player_id: 'new', role: 'SUP', match_logs: [{ match_id: 'new', map_order: 1, hero: 'Sombra', role: 'SUP', playtimeMinutes: 10, totals: { ...totals, damage: 100, healing: 9000 } }] }
], { seasonId: 'SEASON5-REGRESSION', useFrozenBaselines: false })
assert(baselines.byHero.Sombra, 'Legacy Sombra baseline missing')
assert(baselines.byHero['Sombra:SUPPORT'], 'Support Sombra baseline missing')
assert.equal(baselines.byHero.Sombra.sampleLogs, 1)
assert.equal(baselines.byHero['Sombra:SUPPORT'].sampleLogs, 1)
assert.notStrictEqual(getRuntimeHeroBaseline({ baselines, heroName: 'Sombra', role: 'DPS' }), getRuntimeHeroBaseline({ baselines, heroName: 'Sombra', role: 'SUP' }))

const map = (id, role, date) => ({ match_id: id, scheduled_at: date, status: 'COMPLETE', team_a: { id: 'A' }, team_b: { id: 'B' }, maps: [{ map_name: 'Dorado', map_type: 'Escort', match_time: '10:00', score_a: 3, score_b: 2, team_a_stats: [{ player_id: id, heroes_played: 'Sombra', role }] }] })
const atlas = buildMapAtlas({ teams: [], matches: [map('old', 'DPS', '2026-09-20'), map('new', 'SUP', '2026-10-07')] })
assert.deepEqual(new Set(atlas.maps[0].heroStats.map(hero => hero.role)), new Set(['damage', 'support']))
assert(atlas.maps[0].records.every(record => record.heroKeys.has('sombra')), 'Existing hero links must keep matching both Sombra roles')

const teamMap = (id, date, heroes) => {
  const item = map(id, '', date)
  item.team_a = { id: 'A', score: 1 }
  item.team_b = { id: 'B', score: 0 }
  item.maps[0].team_a_stats = heroes.map((hero, index) => ({ player_id: `A${index}`, heroes_played: hero, role: index === 0 ? 'TANK' : index < 3 ? 'DPS' : 'SUP' }))
  return item
}
const team = buildTeamPerformance(getPerformanceRows([
  teamMap('old', '2026-09-20', ['D.Va', 'Ashe', 'Sombra', 'Ana', 'Kiriko']),
  teamMap('new', '2026-10-08', ['D.Va', 'Ashe', 'Tracer', 'Sombra', 'Doctrine'])
], 'A'), [])
assert.deepEqual(new Set(team.heroes.filter(hero => hero.hero === 'Sombra').map(hero => hero.role)), new Set(['DPS', 'SUP']))
assert.deepEqual(new Set(team.lineups.map(lineup => lineup.heroRoles.sombra)), new Set(['DPS', 'SUP']))
console.log('Season 5 Stats checks passed: catalogs, assets, historical roles, separate Sombra baselines and map atlas.')
