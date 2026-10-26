import fs from 'node:fs'
import path from 'node:path'
import {parse} from '@babel/parser'
import traverseModule from '@babel/traverse'
import * as t from '@babel/types'
const traverse=traverseModule.default||traverseModule

// These are the public routes rendered by the current Stats mobile layout.
// Account and participation controllers are deliberately outside this closure.
export const publicPageSources=[
  'pages/leaderboard/LeaderboardPage.jsx','pages/roster/RosterHubPage.jsx',
  'pages/players/PlayersPage.jsx','pages/players/PlayerDetailPage.jsx',
  'pages/teams/TeamsPage.jsx','pages/teams/TeamDetailPage.jsx',
  'pages/staff/StaffPage.jsx','pages/staff/StaffDetailPage.jsx',
  'pages/stats/MapStatsPage.jsx','pages/stats/MapDetailPage.jsx',
  'pages/heroes/HeroesPage.jsx','pages/matches/MatchesPage.jsx',
  'pages/advance/AdvancePage.jsx','pages/following/FollowingPage.jsx',
  'pages/review/ReviewEntryPage.jsx','pages/review/ReviewStoryPage.jsx'
].map(file=>'src/'+file)

export const nativeBoundaryImports={
  'SiteSearch.jsx':'NativeRosterEntry',
  'AccountModeSwitch.jsx':'NativeAccountModeSwitch',
  'useLobbyOpen.js':'useNativeLobbyOpen',
  'useMobileTabNavigation.js':'useNativeMobileTabNavigation',
  'usePublishedNewspaper.js':'useNativeDeferredNewspaper',
  'MatchDataFeedback.jsx':'NativeAccountFeature',
  'TeamShareDialog.jsx':'NativeTeamShareDialog',
  'PlayerStoryShareDialog.jsx':'NativePlayerShareDialog'
}
const flags={isKprDesign:true,isKprHybridDesign:true,isFdDesign:false}
const astFor=code=>parse(code,{sourceType:'module',plugins:['jsx']})
const returns=node=>t.isReturnStatement(node)||t.isBlockStatement(node)&&node.body.some(returns)

export function pruneCanonicalSource(code) {
  const ast=astFor(code)
  const lazyImports=[]
  traverse(ast,{
    ReferencedIdentifier(p){if(Object.hasOwn(flags,p.node.name))p.replaceWith(t.booleanLiteral(flags[p.node.name]))},
    VariableDeclarator(p){
      const init=p.node.init
      if(!t.isCallExpression(init)||init.callee.name!=='lazy')return
      const call=init.arguments[0]?.body
      if(t.isCallExpression(call)&&call.callee.type==='Import'&&t.isStringLiteral(call.arguments[0])) {
        lazyImports.push(t.importDeclaration([t.importDefaultSpecifier(t.cloneNode(p.node.id))],t.cloneNode(call.arguments[0])))
        p.remove()
      }
    }
  })
  ast.program.body.unshift(...lazyImports)
  for(let pass=0;pass<4;pass++)traverse(ast,{
    ConditionalExpression:{exit(p){const value=p.get('test').evaluate();if(value.confident)p.replaceWith(value.value?p.node.consequent:p.node.alternate)}},
    LogicalExpression:{exit(p){const value=p.get('left').evaluate();if(!value.confident)return;const op=p.node.operator;if(op==='&&')p.replaceWith(value.value?p.node.right:p.node.left);else if(op==='||')p.replaceWith(value.value?p.node.left:p.node.right)}},
    IfStatement:{exit(p){const value=p.get('test').evaluate();if(!value.confident)return;const chosen=value.value?p.node.consequent:p.node.alternate;if(chosen)p.replaceWith(chosen);else p.remove()}},
    BlockStatement:{exit(p){const end=p.node.body.findIndex(returns);if(end>=0)p.node.body=p.node.body.slice(0,end+1)}}
  })
  // Tree-shake the discarded desktop controllers before following their imports.
  // Never execute/evaluate authored helpers during generation.
  for(let pass=0;pass<16;pass++) {
    let changed=false
    traverse(ast,{Program(p){p.scope.crawl()},
      ImportSpecifier(p){if(!p.scope.getBinding(p.node.local.name)?.referenced){p.remove();changed=true}},
      ImportDefaultSpecifier(p){if(!p.scope.getBinding(p.node.local.name)?.referenced){p.remove();changed=true}},
      ImportNamespaceSpecifier(p){if(!p.scope.getBinding(p.node.local.name)?.referenced){p.remove();changed=true}},
      FunctionDeclaration(p){
        if(p.parentPath.isExportDeclaration())return
        const binding=p.scope.parent?.getBinding(p.node.id?.name)||p.scope.getBinding(p.node.id?.name)
        if(binding&&!binding.referencePaths.some(ref=>!ref.findParent(parent=>parent===p))){p.remove();changed=true}
      },
      VariableDeclarator(p){
        if(!t.isIdentifier(p.node.id)||p.parentPath.parentPath.isExportDeclaration())return
        const binding=p.scope.getBinding(p.node.id.name)
        if(binding&&!binding.referenced){p.remove();changed=true}
      }
    })
    traverse(ast,{ImportDeclaration(p){if(!p.node.specifiers.length&&!/\.css$/.test(p.node.source.value)){p.remove();changed=true}}})
    if(!changed)break
  }
  return ast
}

export function collectCanonicalPublicSources(stats,extraSources=[]) {
  const files=new Map(),seen=new Set(),styles=new Set(),boundaries=[]
  function visit(file) {
    if(seen.has(file))return
    seen.add(file)
    const ast=pruneCanonicalSource(fs.readFileSync(file,'utf8'))
    files.set(file,ast)
    for(const statement of ast.program.body) {
      const request=statement.source?.value
      if(!request?.startsWith('.'))continue
      const base=path.resolve(path.dirname(file),request)
      const dependency=[base,base+'.js',base+'.jsx'].find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile())
      if(!dependency)continue
      if(nativeBoundaryImports[path.basename(dependency)]){boundaries.push(path.relative(stats,dependency).replaceAll('\\','/'));continue}
      if(dependency.endsWith('.css')){styles.add(dependency);continue}
      if(/(?:AuthProvider|AuthDialog|ArchiveRecordLink|ImeSafeInput|useUiLocale|useStagePointer|useKprStory|useArchiveMotion|useCompactMatchLayout|navigationState)\.[jt]sx?$/.test(dependency))continue
      const content=fs.readFileSync(dependency,'utf8')
      if(dependency.endsWith('.jsx')||/^import .*?['"](?:react(?:-router-dom)?|.*\.(?:css|jsx))['"]/m.test(content))visit(dependency)
    }
  }
  [...publicPageSources,...extraSources].forEach(file=>visit(path.join(stats,file)))
  return {files,styles,boundaries:[...new Set(boundaries)]}
}
