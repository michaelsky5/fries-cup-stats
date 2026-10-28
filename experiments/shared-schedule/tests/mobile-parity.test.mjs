import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { transformSync } from '@babel/core'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import nativeHtml from '../scripts/shared-html-tags.cjs'
import sharp from 'sharp'
import { centerEntryUrl, publicPageKind } from '../src/shared/centerPaths.js'
import { publicNativeRoute } from '../src/shared/nativeDesignModel.js'

const traverse = traverseModule.default || traverseModule

test('all four canonical phone destinations resolve to working public native entries', () => {
  const navigation = JSON.parse(fs.readFileSync(new URL('../src/generated/navigation.json', import.meta.url)))
  assert.deepEqual(navigation.dock.map(item => item.zh), ['总览', '赛程', '数据', '参赛'])
  assert.deepEqual(navigation.dock.map(item => item.group), ['overview', 'matches', 'database', 'play'])
  const shared = fs.readFileSync(new URL('../src/shared/SharedCenter.jsx', import.meta.url), 'utf8')
  assert.match(shared, /props.view==='play'\?<ParticipationHubPage/)
  for (const [path, view] of [['/', 'overview'], ['/matches', 'matches'], ['/leaderboard', 'database'], ['/play', 'play']]) {
    assert.equal(publicNativeRoute(path).view, view)
    assert.match(centerEntryUrl({ view, season: 'FCW26' }), new RegExp('^/' + publicPageKind({ view }) + '/pages/index'))
  }
})

test('dock icons compile as native images with explicit dimensions and visible packaged pixels', async () => {
  const source = fs.readFileSync(new URL('../src/shared/nativeDesignRuntime.jsx', import.meta.url), 'utf8')
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
  let icon
  traverse(ast, { FunctionDeclaration(path) { if (path.node.id?.name === 'NativeNavIcon') icon = path.node } })
  assert.ok(icon)
  const converted = transformSync(source.slice(icon.start, icon.end), { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] }, plugins: [nativeHtml] }).code
  assert.match(converted, /<Image/)
  assert.match(converted, /width: '21px'/)
  assert.match(converted, /height: '21px'/)
  const navigation = JSON.parse(fs.readFileSync(new URL('../src/generated/navigation.json', import.meta.url)))
  for (const item of navigation.dock) for (const suffix of ['', '-active']) {
    const asset = fs.readFileSync(new URL('../src/generated/navigation/' + item.group + suffix + '.png', import.meta.url))
    assert.ok(asset.length > 100)
    assert.equal(asset.subarray(1, 4).toString(), 'PNG')
    const pixels = await sharp(asset).stats()
    assert.ok(pixels.channels[3].max > 0, 'Navigation colour aliases must produce visible strokes')
  }
})

test('the shared participation guide keeps native account actions and labels website-only links as copies', () => {
  const guide = fs.readFileSync(new URL('../src/generated/mobile/ParticipationHubPage.jsx', import.meta.url), 'utf8')
  const literals=[]
  traverse(parse(guide,{sourceType:'module',plugins:['jsx']}),{StringLiteral(path){literals.push(path.node.value)}})
  assert.match(guide, /const signIn = nativeOpenAccount/)
  assert.match(guide, /https:\/\/stats.fries-cup.com\/participate\//)
  assert.ok(literals.includes('复制报名页链接'))
  assert.ok(literals.includes('比赛房指南 · 复制链接'))
  assert.doesNotMatch(guide, /fries-cup:open-account|window\.dispatchEvent/)
  assert.equal(publicNativeRoute('/me?section=team&token=never-forward-this').account, true)
  assert.deepEqual(publicNativeRoute('/me?section=team&token=never-forward-this'), { account: true })
})
