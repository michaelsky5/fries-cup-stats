import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'
import * as t from '@babel/types'
import { portableScheduleCss } from './portable-css.mjs'
const traverse = traverseModule.default || traverseModule
const generate = generateModule.default || generateModule
const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(trial, '../../src/EsportsManagerClassic')
const out = path.join(trial, 'src/generated/classic')
for (const dir of ['engine', 'pages', 'components']) {
  fs.mkdirSync(path.join(out, dir), {recursive:true})
  for (const name of fs.readdirSync(path.join(source, dir))) {
    const original = fs.readFileSync(path.join(source, dir, name), 'utf8')
    if (name.endsWith('.css')) { fs.writeFileSync(path.join(out, dir, name), portableScheduleCss(original, {phoneWidth:375})); continue }
    if (!/\.jsx?$/.test(name)) continue
    const ast = parse(original, {sourceType:'module', plugins:['jsx']})
    let needsStorage = false, needsNotice = false, needsScroll = false, needsActions = false, needsScrollView = false
    const expression = source => parse(source, {sourceType:'module'}).program.body[0].expression
    traverse(ast, {
      ImportDeclaration(p) {
        if (p.node.source.value === 'react-router-dom' || p.node.source.value === '../../config/seasons.js') p.node.source.value = '../../../classic/classicContext.jsx'
        if (p.node.source.value === 'html2canvas') p.remove()
        else if (dir === 'engine' && p.node.source.value.startsWith('.') && !p.node.source.value.endsWith('.js')) p.node.source.value += '.js'
      },
      StringLiteral(p) {
        if (p.node.value.startsWith('/heroes/')) p.node.value = 'https://stats.fries-cup.com' + p.node.value
        if (p.node.value === '网页小游戏') p.node.value = '经典经理'
        if (p.node.value === '[系统] 正在连接赛事服务器...') p.node.value = '[系统] 正在准备本机模拟...'
      },
      JSXText(p) { if (p.node.value.includes('网页小游戏')) p.node.value=p.node.value.replace('网页小游戏','经典经理') },
      TemplateElement(p) { for (const key of ['raw','cooked']) if (p.node.value[key]?.startsWith('/heroes/')) p.node.value[key] = 'https://stats.fries-cup.com' + p.node.value[key] },
      ReferencedIdentifier(p) {
        if (p.node.name === 'localStorage') needsStorage = true
        if (p.node.name === 'alert') { p.node.name = 'classicNotice'; needsNotice = true }
      },
      UnaryExpression(p) {
        if (p.node.operator === 'typeof' && p.node.argument.name === 'window') p.replaceWith({type:'StringLiteral',value:'object'})
      },
      MemberExpression(p) {
        if (p.node.object.type === 'MemberExpression' && p.node.object.object.name === 'window' && p.node.object.property.name === 'location' && p.node.property.name === 'search') p.replaceWith({type:'StringLiteral',value:''})
      },
      OptionalCallExpression(p) {
        if (p.node.callee?.property?.name === 'scrollIntoView') {
          const target = p.node.callee.object
          // Log scrolling belongs to its own native ScrollView, not the page.
          if (target?.object?.name === 'logEndRef') p.replaceWith(expression('undefined'))
          else { p.replaceWith(t.callExpression(t.identifier('scrollClassic'), [target])); needsScroll = true }
        }
      },
      JSXOpeningElement(p) {
        const ref = p.node.attributes.find(a => a.name?.name === 'ref')?.value?.expression?.name
        const id = {overviewRef:'native-classic-overview',flowRef:'native-classic-flow',opsPanelRef:'native-classic-ops'}[ref]
        if (id) p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('id'),t.stringLiteral(id)))
        const className = p.node.attributes.find(a => a.name?.name === 'className')?.value?.expression
        const cssKey = className?.object?.name === 'styles' && className.property?.name
        if (['reportTableWrap','termBody'].includes(cssKey)) {
          const element = p.parentPath.node
          element.openingElement.name = t.jsxIdentifier('ScrollView')
          element.closingElement.name = t.jsxIdentifier('ScrollView')
          p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier(cssKey === 'termBody' ? 'scrollY' : 'scrollX'),t.jsxExpressionContainer(t.booleanLiteral(true))))
          if (cssKey === 'termBody') {
            p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('scrollTop'),t.jsxExpressionContainer(expression('logs.length * 500'))))
            p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('style'),t.jsxExpressionContainer(expression('({height:"260px"})'))))
          }
          needsScrollView = true
        }
      },
      JSXAttribute(p) {
        if (p.node.name.name === 'onClick' && p.node.value?.expression) {
          p.node.value.expression = t.callExpression(t.identifier('nativeClassicAction'),[p.node.value.expression]); needsActions = true
        }
      },
      VariableDeclarator(p) {
        if (p.node.id.name === 'handleExport' && name === 'ChampionPage.jsx') {
          p.node.init = parse('const fn = async () => { setIsExporting(true); try { await useChampionExport(runState,teamData) } catch (error) { classicNotice(error) } finally { setIsExporting(false) } }', {sourceType:'module'}).program.body[0].declarations[0].init
          needsNotice = true
        }
        if (p.node.id.name === 'handleReset' && name === 'CareerPage.jsx') {
          p.node.init = parse("const fn = async () => { const result = await Taro.showModal({title:'重置经典经理',content:'清空当前赛事的经理生涯和当前挑战存档？'}); if (!result.confirm) return; localStorage.removeItem('fca_manager_career_v2'); localStorage.removeItem('friesCup_currentRun'); setStats(DEFAULT_STATS); classicNotice('生涯记录已清空。') }", {sourceType:'module'}).program.body[0].declarations[0].init
          needsNotice = true; needsStorage = true
        }
      }
    })
    if (name === 'runEngine.js') {
      // Keep the canonical economy and simulation. Clone only the mutable
      // native input so a failed storage write cannot spend the visible budget.
      traverse(ast, {FunctionDeclaration(p) {
        if (['refreshShop','hirePlayer','firePlayer','processEventChoice','processBattleResult'].includes(p.node.id?.name)) {
          p.node.body.body.unshift(parse('runState = JSON.parse(JSON.stringify(runState))').program.body[0])
        }
      }})
    }
    if (name === 'ShopPage.jsx') {
      traverse(ast, {BlockStatement(p) {
        const items=p.node.body, update=items.findIndex(item => item.expression?.callee?.name==='setRunState' && item.expression.arguments?.[0]?.name==='newState')
        if (update>=0 && items[update+1]?.expression?.callee?.name==='saveRun') [items[update],items[update+1]]=[items[update+1],items[update]]
      }})
    }
    if (name === 'FantasyBattle.jsx') {
      const func = ast.program.body.find(item => item.type === 'ExportDefaultDeclaration').declaration
      func.body.body.unshift(...parse('const nativeAlive = useRef(true); useEffect(() => { nativeAlive.current = true; return () => { nativeAlive.current = false } }, [])', {sourceType:'module'}).program.body)
      traverse(ast, {
        AwaitExpression(p) { if (p.node.argument.callee?.name === 'sleep' && p.parentPath.isExpressionStatement()) p.parentPath.insertAfter(parse('if (!nativeAlive.current) return', {allowReturnOutsideFunction:true}).program.body[0]) },
        CallExpression(p) { if (p.node.callee.name === 'setTimeout' && p.node.arguments[1]?.value === 3000) p.node.arguments[0].body = t.logicalExpression('&&',expression('nativeAlive.current'),p.node.arguments[0].body) }
      })
    }
    let prefix = '// Generated from the current Stats classic implementation. Native storage/navigation/export only.\n'
    if (needsStorage) prefix += "import { classicStorage as localStorage } from '../../../classic/classicStorage.js'\n"
    if (needsNotice) prefix += "import { classicNotice } from '../../../classic/classicContext.jsx'\n"
    if (needsScroll) prefix += "import { scrollClassic } from '../../../classic/classicContext.jsx'\n"
    if (needsActions) prefix += "import { nativeClassicAction } from '../../../classic/classicContext.jsx'\n"
    if (needsScrollView) prefix += "import { ScrollView } from '@tarojs/components'\n"
    if (name === 'CareerPage.jsx') prefix += "import Taro from '@tarojs/taro'\n"
    if (name === 'ChampionPage.jsx') {
      const func = ast.program.body.find(item => item.type === 'ExportDefaultDeclaration').declaration
      func.body.body.unshift(parse('const {exportChampion:useChampionExport} = useOutletContext()', {sourceType:'module'}).program.body[0])
    }
    fs.writeFileSync(path.join(out,dir,name), prefix + generate(ast, {comments:false}).code + '\n')
  }
}
console.log('Generated canonical Classic pages and engine with native adapters.')
