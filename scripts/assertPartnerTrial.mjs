import assert from 'node:assert/strict'
import { getPartnerTrialConfig, assertTrialProxyTarget, buildTrialCatalog, assertTrialSnapshot, trialSeasonFromManifest } from '../src/config/partnerTrial.js'

assert.equal(getPartnerTrialConfig({}), null)
assert.throws(() => getPartnerTrialConfig({ VITE_PARTNER_TRIAL: '1' }))
assert.throws(() => getPartnerTrialConfig({ VITE_PARTNER_TRIAL: '1', VITE_PARTNER_TRIAL_SEASONS: 'FCR26' }))
assert.throws(() => assertTrialProxyTarget('https://admin.fries-cup.com'))
assert.doesNotThrow(() => assertTrialProxyTarget('http://127.0.0.1:4447'))
assert.doesNotThrow(() => assertTrialProxyTarget('https://test-admin.fries-cup.com'))
const catalog = buildTrialCatalog(getPartnerTrialConfig({ VITE_PARTNER_TRIAL: '1', VITE_PARTNER_TRIAL_SEASONS: 'TRIALA26,TRIALB26' }))
assert.equal(catalog.length, 2)
assert.ok(catalog.every(season => !season.dataUrl && !season.localDataUrl))
assert.throws(() => assertTrialSnapshot({ meta: { season_id: 'FCR26' } }, catalog[0]))
assert.throws(() => assertTrialSnapshot({ meta: { season_id: 'TRIALB26' } }, catalog[0]))
assert.doesNotThrow(() => assertTrialSnapshot({ meta: { season_id: 'TRIALA26' } }, catalog[0]))
const config = { ids: ['TRIALA26'] }
const personal = trialSeasonFromManifest(config, 'TRIALPERSON1', { seasonId: 'TRIALPERSON1', entrySeasonId: 'TRIALA26' })
assert.equal(personal.id, 'TRIALPERSON1')
assert.throws(() => trialSeasonFromManifest(config, 'TRIALPERSON1', { seasonId: 'TRIALPERSON2', entrySeasonId: 'TRIALA26' }))
assert.throws(() => trialSeasonFromManifest(config, 'TRIALPERSON1', { seasonId: 'TRIALPERSON1', entrySeasonId: 'TRIALB26' }))
assert.throws(() => assertTrialSnapshot({ meta: { season_id: 'TRIALPERSON1' } }, personal))
assert.doesNotThrow(() => assertTrialSnapshot({ season: { id: 'TRIALPERSON1', rules: { partnerTrial: { entrySeasonId: 'TRIALA26' } } } }, personal))
console.log('Partner trial catalog, proxy and snapshot isolation passed.')
