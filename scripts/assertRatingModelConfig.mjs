import assert from 'node:assert/strict'

import { PROFILE_WEIGHTS, RATING_METRICS } from '../src/config/ratingModelConfig.js'
import {
  getHeroSubrole,
  getHeroSubroleConfig,
  resolveHeroSubrole,
  listHeroSubroleEntries
} from '../src/lib/heroSubroleSelectors.js'
import {
  getPer10Stats,
  getSurvivalPercentile,
  mapRawScoreToMapRating,
  mapRawScoreToOVR
} from '../src/lib/ratingModel.js'

function sumWeights(weights) {
  return RATING_METRICS.reduce((sum, metric) => sum + Number(weights?.[metric] || 0), 0)
}

Object.entries(PROFILE_WEIGHTS).forEach(([profile, config]) => {
  assert.equal(sumWeights(config.weights), 100, `${profile} weights must sum to 100`)
})

listHeroSubroleEntries().forEach(hero => {
  assert.ok(
    PROFILE_WEIGHTS[hero.scoringProfile],
    `${hero.canonicalHeroName} scoringProfile ${hero.scoringProfile} must exist in PROFILE_WEIGHTS`
  )
})

assert.equal(getHeroSubrole('Sierra'), 'HITSCAN')
assert.equal(getHeroSubrole('西拉'), 'HITSCAN')
assert.equal(getHeroSubroleConfig('Sierra').scoringProfile, 'poke_hitscan')

const shion = resolveHeroSubrole('Shion')
const shionAlias = resolveHeroSubrole('死怨')
assert.equal(shion.resolvedSubrole, 'FLEX_DPS')
assert.equal(shion.scoringProfile, 'projectile_flex')
assert.ok(shion.secondarySubroles.includes('HITSCAN'))
assert.equal(shionAlias.canonicalHeroName, 'Shion')
assert.equal(shionAlias.resolvedSubrole, 'FLEX_DPS')
assert.equal(shionAlias.scoringProfile, 'projectile_flex')
assert.ok(shionAlias.secondarySubroles.includes('HITSCAN'))

assert.equal(resolveHeroSubrole('Symmetra').resolvedSubrole, 'FLEX_DPS')
assert.equal(resolveHeroSubrole('Symmetra').scoringProfile, 'barrier_utility_flex')
assert.equal(resolveHeroSubrole('Sombra').resolvedSubrole, 'FLEX_DPS')
assert.equal(resolveHeroSubrole('Sombra').scoringProfile, 'flanker_flex')
assert.equal(resolveHeroSubrole('Domina').resolvedSubrole, 'TANK')
assert.equal(resolveHeroSubrole('Domina').scoringProfile, 'poke_tank')
assert.equal(resolveHeroSubrole('金驭').canonicalHeroName, 'Domina')
assert.equal(resolveHeroSubrole('金驭').resolvedSubrole, 'TANK')
assert.equal(resolveHeroSubrole('金驭').scoringProfile, 'poke_tank')
assert.equal(resolveHeroSubrole('Pharah').resolvedSubrole, 'FLEX_DPS')
assert.equal(resolveHeroSubrole('Pharah').scoringProfile, 'projectile_flex')
assert.equal(resolveHeroSubrole('Lúcio').resolvedSubrole, 'MAIN_SUPPORT')
assert.equal(resolveHeroSubrole('Lúcio').scoringProfile, 'tempo_main_support')
assert.equal(resolveHeroSubrole('Kiriko').resolvedSubrole, 'FLEX_SUPPORT')
assert.equal(resolveHeroSubrole('Kiriko').scoringProfile, 'utility_flex_support')

const per10 = getPer10Stats({
  playtimeMinutes: 5,
  totals: {
    elims: 10,
    assists: 5,
    deaths: 2,
    damage: 2000,
    healing: 500,
    blocked: 1000
  }
})

assert.deepEqual(per10, {
  elims: 20,
  assists: 10,
  deaths: 4,
  damage: 4000,
  healing: 1000,
  blocked: 2000
})

const deathsBaseline = {
  key: 'synthetic',
  metrics: {
    deathsPer10: {
      rawPercentiles: { p10: 2, p25: 4, p50: 6, p75: 8, p90: 10, p95: 12, mean: 6, max: 14 },
      winsorizedPercentiles: { p10: 2, p25: 4, p50: 6, p75: 8, p90: 10, p95: 12, mean: 6, max: 12 }
    }
  }
}

assert.ok(getSurvivalPercentile(3, deathsBaseline) > getSurvivalPercentile(9, deathsBaseline))
assert.equal(mapRawScoreToOVR(80, 80, { sampleStatus: 'LOW_SAMPLE' }), 'UNRATED')
assert.ok(mapRawScoreToMapRating(101) <= 9.8)
assert.ok(mapRawScoreToMapRating(-10) >= 5.5)

console.log('Rating model config assertions passed.')
