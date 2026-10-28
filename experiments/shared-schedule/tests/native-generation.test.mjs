import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import {transformSync} from '@babel/core'
import nativeHtml from '../scripts/shared-html-tags.cjs'
import { prepareMobileDesign } from '../scripts/prepare-mobile-design.mjs'

const traverse = traverseModule.default || traverseModule

test('compiled native text breaks and table labels use available WeChat components without losing content',()=>{
  const {code}=transformSync('export default function Labels(){return <fieldset><legend>查找范围</legend><table><caption>公开排行说明</caption><colgroup><col/></colgroup><tfoot><tr><td>A<br/>B<wbr/>#1234</td></tr></tfoot></table></fieldset>}',{filename:'src/generated/mobile/TextLabels.jsx',babelrc:false,configFile:false,parserOpts:{plugins:['jsx']},plugins:[nativeHtml]})
  const ast=parse(code,{sourceType:'module',plugins:['jsx']})
  const breaks=[]
  traverse(ast,{
    JSXOpeningElement(p){assert.ok(!['br','wbr','caption','tfoot','legend','colgroup','col'].includes(p.node.name.name),'Unsupported native template')},
    StringLiteral(p){if(['\n','\u200b'].includes(p.node.value))breaks.push(p.node.value)}
  })
  assert.deepEqual(breaks,['\n','\u200b'])
  assert.match(code,/Text as _NativeBreakText/)
  assert.match(code,/公开排行说明/)
  assert.match(code,/shared-tag-caption/)
  assert.match(code,/shared-tag-tfoot/)
  assert.match(code,/查找范围/)
  assert.match(code,/shared-tag-legend/)
})

test('real Stats data tables generate horizontal native scroll containers even with state attributes', () => {
  const temporaryRoot = path.resolve(os.tmpdir())
  const output = fs.mkdtempSync(path.join(temporaryRoot, 'fries-native-generation-'))
  try {
    prepareMobileDesign(fileURLToPath(new URL('../../../', import.meta.url)), output)
    // Check every source branch, including conditional dialogs. SVG shapes
    // and select options are data consumed by our platform adapters, so they
    // are intentionally not mounted as HTML nodes.
    const htmlPlugin=fs.readFileSync(fileURLToPath(new URL('../node_modules/@tarojs/plugin-html/src/index.ts',import.meta.url)),'utf8')
    const nativeTags=new Set([...htmlPlugin.matchAll(/const (?:inline|block|special)Elements = (\[[^\n]+\])/g)].flatMap(match=>JSON.parse(match[1].replaceAll("'",'"'))))
    assert.ok(nativeTags.size>75,'Read supported HTML tags from the installed native compiler')
    for(const file of fs.readdirSync(path.join(output,'mobile')).filter(file=>file.endsWith('.jsx'))){
      const ast=transformSync(fs.readFileSync(path.join(output,'mobile',file),'utf8'),{filename:path.join('src/generated/mobile',file),babelrc:false,configFile:false,ast:true,code:false,parserOpts:{plugins:['jsx']},plugins:[nativeHtml]}).ast
      const canvasDots=new Set()
      traverse(ast,{JSXOpeningElement(p){
        if(p.node.name.name!=='Line')return
        const dot=p.node.attributes.find(attribute=>attribute.name?.name==='dot')?.value?.expression
        if(dot?.type==='JSXElement')canvasDots.add(dot.openingElement.name.name)
      }})
      traverse(ast,{JSXOpeningElement(p){
        const tag=p.node.name.name
        if(!tag||!/^[a-z]/.test(tag)||nativeTags.has(tag))return
        const consumed=p.getAncestry().some(ancestor=>ancestor.isJSXElement()&&['NativeSvg','NativeSelect'].includes(ancestor.node.openingElement.name.name))||canvasDots.has(p.getFunctionParent()?.node.id?.name)
        assert.ok(consumed,`${file}: unsupported native HTML template ${tag}`)
      }})
    }
    for(const file of fs.readdirSync(path.join(output,'mobile')).filter(file=>file.endsWith('.css'))){
      assert.ok(fs.readFileSync(path.join(output,'mobile',file),'utf8').startsWith('/* postcss-pxtransform disable */'),`${file} must retain the same fixed CSS units as Stats, including extracted dialogs`)
    }
    for (const [file, className] of [['SignalMapStats.jsx', 'scroller'], ['SignalMatchPlayers.jsx', 'tableScroll']]) {
      const ast = parse(fs.readFileSync(path.join(output, 'mobile', file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
      const containers = []
      traverse(ast, {
        JSXOpeningElement(nodePath) {
          let expression = nodePath.node.attributes.find(attribute => attribute.name?.name === 'className')?.value?.expression
          while (expression?.type === 'BinaryExpression' && expression.operator === '+') expression = expression.left
          if (expression?.object?.name === 'styles' && expression.property?.name === className) containers.push(nodePath.node)
        }
      })
      assert.equal(containers.length, 1, `${file} must retain its authored table container`)
      assert.equal(containers[0].name.name, 'ScrollView', `${file} must scroll on WeChat`)
      assert.equal(containers[0].attributes.find(attribute => attribute.name?.name === 'scrollX')?.value?.expression?.value, true)
      if (file === 'SignalMapStats.jsx') assert.ok(containers[0].attributes.some(attribute => attribute.name?.name === 'data-map-table-scroll'))
    }
    // A native ref has no DOM querySelectorAll. The current canonical story
    // uses explicit chapters and must not revive the old DOM observer.
    const chronicle=fs.readFileSync(path.join(output,'mobile','TeamSeasonChronicle.jsx'),'utf8')
    assert.doesNotMatch(chronicle,/\.querySelectorAll\(/)
    assert.match(chronicle,/getSeasonStoryChapters\(chronicle, locale\)/)
    const mobileNav=parse(fs.readFileSync(path.join(output,'mobile','PublicMobileNav.jsx'),'utf8'),{sourceType:'module',plugins:['jsx']})
    traverse(mobileNav,{ReferencedIdentifier(p){
      if(!p.scope.hasBinding(p.node.name,true))assert.ok(['undefined','Boolean','URL','URLSearchParams'].includes(p.node.name),'Native navigation has an unbound runtime identifier: '+p.node.name)
    }})
    assert.doesNotMatch(fs.readFileSync(path.join(output,'mobile','FollowingWorkspace.jsx'),'utf8'),/new CustomEvent/,'Native following must not expose Web sign-in dispatch')
    const playerData=parse(fs.readFileSync(path.join(output,'mobile','SignalPlayerData.jsx'),'utf8'),{sourceType:'module',plugins:['jsx']})
    let wordBreaks=0
    traverse(playerData,{
      JSXOpeningElement(p){assert.notEqual(p.node.name.name,'wbr','WeChat has no wbr rendering template')},
      StringLiteral(p){if(p.node.value==='\u200b')wordBreaks++}
    })
    assert.ok(wordBreaks>0,'Public BattleTags must retain an optional line-break opportunity')
  } finally {
    assert.equal(path.dirname(path.resolve(output)), temporaryRoot)
    assert.ok(path.basename(output).startsWith('fries-native-generation-'))
    fs.rmSync(output, { recursive: true, force: true })
  }
})
