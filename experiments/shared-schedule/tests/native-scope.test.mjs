import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import app from '../src/app.config.js'
import {publicNativeRoute} from '../src/shared/nativeDesignModel.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')

test('native account entry stays credential-free while Web writes and disabled products remain blocked',()=>{
  for(const route of ['/account/reset-password','/account/verify-email','/login','/register','/lobby','/participate/FCW26','/room/M1','/support','/classic','/reports'])assert.equal(publicNativeRoute(route).unavailable,true,route)
  for(const route of ['/account','/account?token=not-forwarded&season=FCW26','/me?section=team&competition=FCW26','/me?section=matches&token=not-forwarded'])assert.deepEqual(publicNativeRoute(route),{account:true})
  assert.equal(publicNativeRoute('/play').view,'play')
  assert.equal(publicNativeRoute('/me?section=following').view,'space')
  assert.equal(publicNativeRoute('/following').view,'space')
  assert.equal(publicNativeRoute('/matches/M1').id,'M1')
  assert.ok(!app.subPackages.some(pack=>['classic','poster'].includes(pack.root)))
})

test('every registered native entry stays outside Web/private controllers',()=>{
  const result=execFileSync(process.execPath,['scripts/check-native-boundaries.mjs'],{cwd:root,encoding:'utf8'})
  assert.equal(JSON.parse(result.trim()).privateControllers,0)
})
