import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import app from '../src/app.config.js'
import {publicNativeRoute} from '../src/shared/nativeDesignModel.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')

test('public native routes reject account writes, payment, lobby and disabled experiments',()=>{
  for(const route of ['/account','/login','/register','/lobby','/participate/FCW26','/room/M1','/support','/classic','/reports','/me?section=team&competition=FCW26','/me?section=matches'])assert.equal(publicNativeRoute(route).unavailable,true,route)
  assert.equal(publicNativeRoute('/me?section=following').view,'space')
  assert.equal(publicNativeRoute('/following').view,'space')
  assert.equal(publicNativeRoute('/matches/M1').id,'M1')
  assert.ok(!app.subPackages.some(pack=>['classic','poster'].includes(pack.root)))
})

test('every registered native entry stays outside Web/private controllers',()=>{
  const result=execFileSync(process.execPath,['scripts/check-native-boundaries.mjs'],{cwd:root,encoding:'utf8'})
  assert.equal(JSON.parse(result.trim()).privateControllers,0)
})
