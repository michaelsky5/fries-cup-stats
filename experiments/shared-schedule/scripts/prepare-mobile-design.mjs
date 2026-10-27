import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'
import * as t from '@babel/types'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { portableScheduleCss } from './portable-css.mjs'
import {collectCanonicalPublicSources,nativeBoundaryImports,pruneCanonicalSource} from './canonical-public-sources.mjs'
const traverse = traverseModule.default || traverseModule
const generate = generateModule.default || generateModule

export const mobileDesignSources = [
  'src/components/layout/PublicHeader.jsx', 'src/components/layout/PublicMobileNav.jsx',
  'src/layouts/DataLayout.jsx',
  'src/components/layout/EventContextBar.jsx', 'src/features/kpr-design/KprDialog.jsx',
  'src/features/auth/AuthDialog.jsx','src/features/account-ui/AccountAvatar.jsx','src/features/account-ui/AccountAvatar.module.css',
  'src/features/weekly-overview/SignalWeeklyOverview.jsx', 'src/features/weekly-overview/WeeklyNavigation.jsx',
  'src/features/kpr-design/MobileSeasonArchive.jsx',
  'src/features/kpr-design/KprImmersiveArchive.jsx', 'src/features/kpr-design/KprImmersiveArchive.module.css',
  'src/features/kpr-design/ArchiveCredits.jsx', 'src/features/kpr-design/ArchiveCredits.module.css',
  ...['SignalMatchDetail','SignalMatchPlayers','SignalPlayerComparison','SignalPlayerData','SignalMapChapter','SignalMapStats','SignalMatchSpotlight','SignalMatchResources','SignalMatchPhase'].flatMap(name => [`src/components/matches/detail/${name}.jsx`,`src/components/matches/detail/${name}.module.css`]),
  'src/components/matches/detail/DualTeamStatsTable.jsx',
  'src/components/matches/TeamLogo.jsx', 'src/components/media/HeroArtwork.jsx', 'src/components/media/HeroArtwork.module.css',
  'src/layouts/DataLayout.module.css', 'src/features/fd-design/FdShell.module.css', 'src/features/kpr-design/KprShell.module.css',
  'src/components/layout/EventContextBar.module.css', 'src/features/fd-design/FdEventContext.module.css', 'src/features/kpr-design/KprEventContext.module.css',
  'src/components/layout/PublicMobileNav.module.css', 'src/features/kpr-design/KprLeaderboard.module.css',
  'src/features/weekly-overview/SignalWeeklyOverview.module.css', 'src/features/weekly-overview/WeeklyNavigation.module.css',
  'src/components/navigation/SignalSectionNav.module.css', 'src/features/kpr-design/MobileSeasonArchive.module.css',
  'src/features/fd-design/layoutStyles.js', 'src/features/fd-design/eventContextStyles.js', 'src/features/fd-design/designPreview.js',
  'src/lib/legacyI18n.js', 'src/config/seasons.js', 'src/components/layout/publicNavigation.js', 'public/logos/fries-cup-symbol.png'
]

export function prepareMobileDesign(stats, out) {
  const target = path.join(out, 'mobile')
  fs.mkdirSync(target, { recursive: true })
  const nativeCss=source=>portableScheduleCss(source,{phoneWidth:375,nativeSpecificity:true,preserveCssPixels:true})
  const astFor = source => parse(source, { sourceType: 'module', plugins: ['jsx'] })
  const expr = source => astFor(source).program.body[0].expression
  const runtime = '../../shared/nativeDesignRuntime.jsx'
  const publicSources=collectCanonicalPublicSources(stats,mobileDesignSources.filter(file=>file.endsWith('.jsx')&&!file.endsWith('/DataLayout.jsx')&&!/features\/(?:auth|account-ui)\//.test(file)))
  const canonical=[...publicSources.files.keys(),...publicSources.styles].map(file=>path.relative(stats,file).replaceAll('\\','/'))
  mobileDesignSources.push(...canonical.filter(file=>!mobileDesignSources.includes(file)),...publicSources.boundaries.filter(file=>!mobileDesignSources.includes(file)))
  const generated = new Map(mobileDesignSources.filter(file => file.endsWith('.jsx') && !file.endsWith('/DataLayout.jsx')).map(file => [path.join(stats, file), path.basename(file)]))
  for(const file of publicSources.files.keys())generated.set(file,path.basename(file))
  // Preserve the canonical guest account entry without importing Web auth.
  generated.delete(path.join(stats,'src/features/auth/AuthDialog.jsx'))
  for(const file of publicSources.boundaries)generated.delete(path.join(stats,file))
  const css = new Map(mobileDesignSources.filter(file => file.endsWith('.css')).map(file => [path.join(stats, file), path.basename(file)]))
  for (const [filename, name] of css) {
    let original = fs.readFileSync(filename, 'utf8')
    // WeChat cannot select HTML attributes or :has(). The same state is
    // expressed as classes by the native JSX adapter; declarations stay authored.
    const rules=postcss.parse(original)
    if(['TeamDetailPage.module.css','FdTeamDetail.module.css','TeamSignal.module.css'].includes(name)){
      const teamAst=publicSources.files.get(path.join(stats,'src/pages/teams/TeamDetailPage.jsx')),used=new Set()
      traverse(teamAst,{MemberExpression(p){if(p.node.object.name==='styles'&&!p.node.computed)used.add(p.node.property.name)}})
      rules.walkRules(rule=>{if(rule.parent?.type==='atrule'&&/keyframes/.test(rule.parent.name))return;const selectors=selectorParser().astSync(rule.selector);selectors.nodes=selectors.nodes.filter(selector=>{const classes=[];selector.walkClasses(node=>classes.push(node.value));return classes.every(value=>used.has(value)||value.startsWith('shared-'))});if(selectors.nodes.length)rule.selector=selectors.toString();else rule.remove()})
    }
    const stateClass=(node,value)=>{
      let global=false,parent=node.parent
      while(parent){if(parent.type==='pseudo'&&parent.value===':global')global=true;parent=parent.parent}
      const cls=selectorParser.className({value})
      node.replaceWith(global?cls:selectorParser.pseudo({value:':global',nodes:[selectorParser.selector({nodes:[cls]})]}))
    }
    rules.walkRules(rule=>{
      const selectors=selectorParser().astSync(rule.selector)
      selectors.walkPseudos(node=>{
        if(node.value!==':has')return
        const text=node.toString()
        if(text.includes('data-phone-navigation'))stateClass(node,'shared-has-phone-navigation')
        else if(text.includes('data-mobile-season-archive'))stateClass(node,'shared-has-mobile-season-archive')
      })
      selectors.walkAttributes(node=>{
        if (/^(data-|lang$|open$)/.test(node.attribute))stateClass(node,`shared-${node.attribute}${node.value?'-'+node.value:''}`)
      })
      rule.selector=selectors.toString()
    })
    original=rules.toString().replace(/url\((['"]?)(\/(?!assets\/)[^)'"\s]+)\1\)/g,(_all,_quote,url)=>`url("https://stats.fries-cup.com${url}")`)
    fs.writeFileSync(path.join(target, name), nativeCss(original))
  }
  const combineAst = astFor(fs.readFileSync(path.join(stats, 'src/features/fd-design/designPreview.js'), 'utf8'))
  // The header's small KprDialog shares a stylesheet with the full leaderboard
  // on the Web. Keep its authored rules without duplicating the entire ranking
  // stylesheet into every native subpackage.
  const dialogClasses=new Set(['dialog','compactDialog','dialogHeader'])
  const dialogCss=postcss.parse(fs.readFileSync(path.join(stats,'src/features/kpr-design/KprLeaderboard.module.css'),'utf8'))
  dialogCss.walkRules(rule=>{const parsed=selectorParser().astSync(rule.selector);parsed.nodes=parsed.nodes.filter(selector=>{const classes=[];selector.walkClasses(node=>classes.push(node.value));return classes.length>0&&classes.every(name=>dialogClasses.has(name))});if(parsed.nodes.length)rule.selector=parsed.toString();else rule.remove()})
  fs.writeFileSync(path.join(target,'KprDialog.module.css'),nativeCss(dialogCss.toString()))
  const authAst=astFor(fs.readFileSync(path.join(stats,'src/features/auth/AuthDialog.jsx'),'utf8'))
  const authFunction=authAst.program.body.find(node=>t.isExportDefaultDeclaration(node)&&node.declaration?.id?.name==='AuthButton')?.declaration
  if(!authFunction)throw new Error('Inspect changed Stats account-entry boundary')
  let authButton
  traverse(authAst,{JSXElement(p){const cls=p.node.openingElement.attributes.find(attr=>attr.name?.name==='className')?.value?.expression;if(p.node.openingElement.name.name==='button'&&cls?.object?.name==='styles'&&cls?.property?.name==='authButton')authButton=t.cloneNode(p.node,true)}})
  if(!authButton)throw new Error('Stats account entry button changed')
  authButton.openingElement.attributes=authButton.openingElement.attributes.filter(attr=>!['onClick','disabled','aria-expanded','aria-controls'].includes(attr.name?.name))
  authButton.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('onClick'),t.jsxExpressionContainer(t.identifier('onOpen'))))
  const declarations=['isEn','label','accountModeLabel'].map(name=>authFunction.body.body.find(node=>t.isVariableDeclaration(node)&&node.declarations[0]?.id?.name===name))
  if(declarations.some(node=>!node))throw new Error('Stats guest entry labels changed')
  const entry=astFor("import AccountAvatar from './AccountAvatar.jsx';import {translateUiText as uiText} from '../../../../../src/lib/uiText.js';import styles from './NativeAccountEntry.module.css';export default function NativeAccountEntry({locale='zh-CN',onOpen}){}")
  entry.program.body.at(-1).declaration.body.body=[...declarations.map(node=>t.cloneNode(node,true)),t.returnStatement(authButton)]
  traverse(entry,{ReferencedIdentifier(p){if(p.node.name==='isAuthenticated'||p.node.name==='isBootstrapping')p.replaceWith(t.booleanLiteral(false));if(p.node.name==='user')p.replaceWith(t.nullLiteral())}})
  fs.writeFileSync(path.join(target,'NativeAccountEntry.jsx'),generate(pruneCanonicalSource(generate(entry).code),{comments:false}).code+'\n')
  const authClasses=new Set(['authButton','avatar','authName','authCopy','authMode','authArrow'])
  const authCss=postcss.parse(fs.readFileSync(path.join(stats,'src/features/auth/AuthDialog.module.css'),'utf8'))
  authCss.walkRules(rule=>{const parsed=selectorParser().astSync(rule.selector);parsed.nodes=parsed.nodes.filter(selector=>{const classes=[];selector.walkClasses(node=>classes.push(node.value));return classes.length>0&&classes.every(name=>authClasses.has(name))});parsed.walkAttributes(node=>{const name=`shared-${node.attribute}${node.value?'-'+node.value:''}`;node.replaceWith(selectorParser.className({value:name}))});if(parsed.nodes.length)rule.selector=parsed.toString();else rule.remove()})
  fs.writeFileSync(path.join(target,'NativeAccountEntry.module.css'),nativeCss(authCss.toString()))
  if(!mobileDesignSources.includes('src/features/auth/AuthDialog.module.css'))mobileDesignSources.push('src/features/auth/AuthDialog.module.css')
  const combine = combineAst.program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'combineDesignStyles')
  if (!combine) throw new Error('Stats style composition changed; inspect native boundary')
  for (const [name, files] of Object.entries({
    layoutStyles: ['DataLayout','FdShell','KprShell'],
    eventContextStyles: ['EventContextBar','FdEventContext','KprEventContext']
  })) fs.writeFileSync(path.join(target, name+'.js'), files.map((file, index) => `import s${index} from './${file}.module.css'`).join('\n')+'\n'+generate(combine).code+'\nexport default combineDesignStyles(combineDesignStyles(s0,s1),s2)\n')
  const pureFunctions=(source,names)=>astFor(fs.readFileSync(path.join(stats,source),'utf8')).program.body.filter(node=>node.type==='ExportNamedDeclaration'&&names.includes(node.declaration?.id?.name)).map(node=>generate(node).code).join('\n')
  fs.writeFileSync(path.join(target,'publicNavigation.js'),`import {translateUiText as formatUiText,translateUiText} from '../../../../../src/lib/uiText.js'\nimport navigation from '../navigation.json'\nexport const PRIMARY_NAV=navigation.destinations\nconst SPACE_NAV=PRIMARY_NAV.find(item=>item.group==='space')\n`+pureFunctions('src/components/layout/publicNavigation.js',['getPersonalNavItem','getPrimaryNavigation','getEventNavigation','getNavLabel','getWeeklyNavigationPath'])+'\n')
  fs.writeFileSync(path.join(out,'seasonGroups.js'),`import {SEASONS} from '../shared/publicSeasons.js'\n`+pureFunctions('src/config/seasons.js',['getSeasonEventKind','getSeasonEventGroups'])+'\n')
  // Keep route-dependent spacing/context rules in the original layout too.
  // Only its pure predicates are extracted; Web auth and lifecycle code stay out.
  const layoutAst=astFor(fs.readFileSync(path.join(stats,'src/layouts/DataLayout.jsx'),'utf8'))
  const layoutNames=['isAccountSpaceRoute','isEditorialDataRoute','isRosterIndexRoute','isRosterDirectoryRoute','isScheduleDirectoryRoute','isPublicMatchDetailRoute','isPlayerRankingsRoute','isHeroDataRoute','isMapDataRoute','isTeamArchiveRoute','isPlayerArchiveRoute','isPlayRoute','isUnifiedContextRoute','isKprSamplePage','isMatchEntry','isWeeklyAdvanceRoute','isWeeklyHomeRoute','isAdvanceIndexRoute','isPublicFollowingRoute','isCompactContextRoute']
  const predicates=new Map()
  traverse(layoutAst,{VariableDeclarator(p){if(layoutNames.includes(p.node.id?.name))predicates.set(p.node.id.name,t.cloneNode(p.node,true))}})
  for(const name of layoutNames)if(!predicates.has(name))throw new Error('Stats layout predicate changed: '+name)
  const activeGroup=layoutAst.program.body.find(node=>t.isFunctionDeclaration(node)&&node.id.name==='getNavActiveGroup')
  if(!activeGroup)throw new Error('Stats active navigation predicate changed')
  const layoutCode=`import {isCompetitionMatchesEntry} from '../../../../../src/features/my-space/personalSpacePolicy.js'\n${generate(activeGroup).code}\nexport function getNativeLayoutState({pathname,search='',isWeekly=false,isAuthenticated=false}) {\nconst location={pathname,search},isKprHybridDesign=true,isKprDesign=true,db=null,season=null,isWeeklyOverview=()=>isWeekly;\n${layoutNames.map(name=>generate(t.variableDeclaration('const',[predicates.get(name)])).code).join('\n')}\nreturn {${layoutNames.join(',')},activeGroup:getNavActiveGroup(pathname,search)}\n}\n`
  fs.writeFileSync(path.join(target,'layoutState.js'),layoutCode)

  for (const [filename, name] of generated) {
    const ast = publicSources.files.get(filename)||astFor(fs.readFileSync(filename, 'utf8'))
    const nativeScrollClasses=new Map(),vectorPaint=[]
    for(const statement of ast.program.body){
      if(!statement.source?.value?.endsWith('.css'))continue
      const stylesheet=path.resolve(path.dirname(filename),statement.source.value)
      if(!fs.existsSync(stylesheet))continue
      const binding=statement.specifiers[0]?.local?.name||'styles'
      postcss.parse(fs.readFileSync(stylesheet,'utf8')).walkRules(rule=>{
        const classes=[...rule.selector.matchAll(/\.([\w-]+)/g)].map(match=>match[1])
        if(!classes.length)return
        const paint={}
        rule.walkDecls(decl=>{if(/^(stroke|fill|stroke-width|stroke-dasharray|stroke-linecap|stroke-linejoin|opacity|font-size|text-anchor)$/.test(decl.prop))paint[decl.prop.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=decl.value})
        if(Object.keys(paint).length&&(paint.stroke||paint.fill||/\b(?:svg|path|circle|line|text)\b/.test(rule.selector))){
          const quasis=[],expressions=[];let end=0
          for(const match of rule.selector.matchAll(/\.([\w-]+)/g)){quasis.push(t.templateElement({raw:rule.selector.slice(end,match.index)+'.',cooked:rule.selector.slice(end,match.index)+'.'}));expressions.push(t.logicalExpression('||',t.memberExpression(t.identifier(binding),t.stringLiteral(match[1]),true),t.stringLiteral(match[1])));end=match.index+match[0].length}
          quasis.push(t.templateElement({raw:rule.selector.slice(end),cooked:rule.selector.slice(end)},true))
          vectorPaint.push(t.objectExpression([t.objectProperty(t.identifier('selector'),t.templateLiteral(quasis,expressions)),t.objectProperty(t.identifier('paint'),t.valueToNode(paint))]))
        }
        rule.walkDecls(decl=>{if(!/^(auto|scroll)$/.test(decl.value))return;if(decl.prop==='overflow-x'||decl.prop==='overflow-y'){const axis=decl.prop==='overflow-x'?'scrollX':'scrollY';nativeScrollClasses.set(binding+'.'+classes.at(-1),axis)}})
      })
    }
    const helpers = new Set(['NativeDetails','NativeSummary','NativeLink','nativeSelectorClasses'])
    const nativeImports = new Set()
    traverse(ast, {
      ImportDeclaration(p) {
        const request = p.node.source.value
        if(name==='KprDialog.jsx'&&request.endsWith('KprLeaderboard.module.css')){p.node.source.value='./KprDialog.module.css';return}
        if (request === 'react-router-dom') { p.node.source.value = runtime; return }
        if (request==='react-dom') {p.node.source.value=runtime;return}
        if (request==='recharts') {p.node.source.value='../../shared/nativeCharts.jsx';return}
        if (!request.startsWith('.')) return
        const original = path.resolve(path.dirname(filename), request)
        const resolved=[original,original+'.js',original+'.jsx'].find(file=>generated.has(file)||css.has(file))||original
        const boundary=nativeBoundaryImports[path.basename(original)]
        if(boundary){p.node.source.value=runtime;p.node.specifiers=[t.importSpecifier(p.node.specifiers[0].local,t.identifier(boundary))];return}
        if (/AuthProvider\.jsx$/.test(original)) { p.node.source.value = runtime; return }
        if (/AccountModeSwitch\.jsx$/.test(original)) { p.node.source.value = runtime; p.node.specifiers=[t.importSpecifier(p.node.specifiers[0].local,t.identifier('NativeAccountModeSwitch'))];return }
        if (/SiteSearch\.jsx$/.test(original)) { p.node.source.value = runtime; p.node.specifiers=[t.importSpecifier(p.node.specifiers[0].local,t.identifier('NativeRosterEntry'))];return }
        if (/AuthDialog\.jsx$/.test(original)) { p.node.source.value = runtime; p.node.specifiers[0] = t.importSpecifier(t.identifier('AuthButton'),t.identifier('NativeAccountEntry')); return }
        if (/ArchiveRecordLink\.jsx$/.test(original)) { p.node.source.value = runtime; p.node.specifiers[0] = t.importSpecifier(t.identifier('Link'),t.identifier('NativeLink')); return }
        if (/legacyI18n\.js$/.test(original)) { p.node.source.value = runtime; return }
        if (/navigationState\.js$/.test(original)) { p.node.source.value = runtime; return }
        const nativeHooks={useMobileTabNavigation:'useNativeMobileTabNavigation',useKprStory:'useNativeArchiveStory',useArchiveMotion:'useNativeArchiveMotion',useStagePointer:'useNativeStagePointer',useCompactMatchLayout:'useNativeCompactLayout',useUiLocale:'useNativeUiLocale',ImeSafeInput:'NativeSearchInput',useExhibitionScene:'useNativeExhibitionScene'}
        const hook=nativeHooks[path.basename(original).replace(/\.[jt]sx?$/,'')]
        if(hook){p.node.source.value=runtime;p.node.specifiers=[t.importSpecifier(p.node.specifiers[0].local,t.identifier(hook))];return}
        if(name==='DualTeamStatsTable.jsx' && /matchDetailStyles\.js$/.test(original)) {p.node.source.value='./emptyLegacyStyles.js';return}
        if (/publicNavigation\.js$/.test(original)) { p.node.source.value = '../../shared/nativePublicNavigation.js'; return }
        if (/config[\\/]seasons\.js$/.test(original)) { p.node.source.value = '../../shared/publicSeasons.js'; return }
        if (/fd-design[\\/](layoutStyles|eventContextStyles)\.js$/.test(original)) { p.node.source.value = './'+path.basename(original); return }
        if (generated.has(resolved)) { p.node.source.value = './'+generated.get(resolved); return }
        if (css.has(resolved)) { p.node.source.value = './'+css.get(resolved); return }
        p.node.source.value = path.relative(target,original).replaceAll('\\','/')
        if (!p.node.source.value.startsWith('.')) p.node.source.value = './'+p.node.source.value
      },
      CallExpression(p) {
        // DOM lifetime/resize listeners belong to the platform boundary.
        if (['useEffect','useLayoutEffect'].includes(p.node.callee.name) && p.parentPath.isExpressionStatement()) {
          const body=generate(p.node.arguments[0]).code
          if(name==='ReviewStoryPage.jsx'&&body.includes('getDb(')){p.parentPath.remove();return}
          if(name==='SignalMatchDetail.jsx' && body.includes('measureHeader')) {
            helpers.add('useNativeMatchOffsets');p.parentPath.replaceWith(astFor('const nativeOffsets=useNativeMatchOffsets(dossier.internalId,dossier.mapRecords.length)').program.body[0]);return
          }
          if(name==='SignalMatchDetail.jsx' && body.includes('pendingAnalysisAction.current')) {
            helpers.add('scrollNativeSection');helpers.add('afterNativeRender')
            p.node.arguments[0]=expr(`()=>{const action=pendingAnalysisAction.current;if(!action||!analysisExpanded)return;return afterNativeRender(()=>{if(pendingAnalysisAction.current!==action)return;pendingAnalysisAction.current=null;if(action.findPlayer)playerSearchRef.current?.focus();scrollNativeSection('series-analysis')})}`);return
          }
          if(name==='SignalMatchDetail.jsx' && body.includes('setVisibleSection(section)')) {
            helpers.add('useNativeMatchSections');p.parentPath.replaceWith(astFor('useNativeMatchSections(setVisibleSection,setVisibleOrder,[progress,analysisExpanded,collapsedKey,compactSelection.map?.order])').program.body[0]);return
          }
          if(name==='TeamSeasonChronicle.jsx' && body.includes('querySelectorAll')) {
            helpers.add('useNativeChronicleSections');p.parentPath.replaceWith(astFor('useNativeChronicleSections(setActive,recordsMode,[chronicle,recordsMode])').program.body[0]);return
          }
          const existingR7=['PublicHeader.jsx','PublicMobileNav.jsx','EventContextBar.jsx','KprDialog.jsx','SignalWeeklyOverview.jsx','WeeklyNavigation.jsx','MobileSeasonArchive.jsx'].includes(name)
          if(existingR7 || /\b(window|document|ResizeObserver|getBoundingClientRect|querySelector(?:All)?|restoreWindowScroll)\b/.test(body)) {p.parentPath.remove();return}
        }
        if(name==='SignalMatchPlayers.jsx' && generate(p.node).code.startsWith('window.requestAnimationFrame')) {helpers.add('scrollNativeSection');p.replaceWith(expr("scrollNativeSection('native-player-view')"));return}
        if(t.isMemberExpression(p.node.callee) && generate(p.node.callee).code==='navigator.clipboard.writeText') {helpers.add('copyNativeText');p.node.callee=t.identifier('copyNativeText')}
        if(p.node.callee?.property?.name==='scrollIntoView'){helpers.add('nativeRevealElement');p.replaceWith(t.callExpression(t.identifier('nativeRevealElement'),[p.node.callee.object]));return}
        if(p.node.callee?.property?.name==='getBoundingClientRect'){helpers.add('nativeElementRect');p.replaceWith(t.callExpression(t.identifier('nativeElementRect'),[p.node.callee.object]));return}
        if(p.node.callee?.property?.name==='querySelector'){helpers.add('nativeQueryElement');p.replaceWith(t.callExpression(t.identifier('nativeQueryElement'),[p.node.callee.object,...p.node.arguments]));return}
      },
      VariableDeclarator(p) {
        if(name==='FollowingWorkspace.jsx'&&p.node.id?.name==='syncLabel'){helpers.add('nativeStorageLabel');p.node.init=expr("syncError || syncStatus === 'error' ? copy.error : nativeStorageLabel(locale)")}
        if(name==='PublicMobileNav.jsx'&&p.node.id?.name==='DOCK_ITEMS'){helpers.add('nativeDockItems');p.node.init=t.identifier('nativeDockItems')}
        if(name==='SeasonRating.jsx'&&p.node.id?.name==='EvidencePanel'){
          helpers.add('NativeDetails');p.node.init=expr("signal ? NativeDetails : 'div'")
        }
        if(name==='ReviewStoryPage.jsx'&&t.isArrayPattern(p.node.id)&&['db','error','loading'].includes(p.node.id.elements[0]?.name)&&p.node.init?.callee?.name==='useState') {
          p.node.id=t.identifier(p.node.id.elements[0].name)
          p.node.init=p.node.id.name==='db'?expr('nativeReviewContext.db'):p.node.id.name==='error'?t.stringLiteral(''):t.booleanLiteral(false)
        }
        if(name==='FavoriteManagerDialog.jsx'&&p.node.id?.name==='exportDraft'){
          helpers.add('exportNativeFollowing')
          p.node.init=expr('async()=>{try{await exportNativeFollowing(createSeasonFavoritesExport(seasonId,draft,db));setNotice({text:copy.exported})}catch{setNotice({error:true,text:copy.saveError})}}')
        }
        if(name==='KprImmersiveArchive.jsx' && t.isArrayPattern(p.node.id) && p.node.id.elements[0]?.name==='isPhone')p.node.init=expr('useState(true)')
        if(name==='KprImmersiveArchive.jsx' && p.node.id.name==='showSeasonAtlas'){helpers.add('scrollNativeSection');p.node.init=expr("()=>scrollNativeSection('archive-season-atlas')")}
        if(name==='SignalMatchDetail.jsx' && p.node.id.name==='selectSection'){
          helpers.add('scrollNativeSection');p.node.init=expr("(event,section)=>{if(section==='analysis')return openAnalysis(event);event.preventDefault();setVisibleSection(section);scrollNativeSection({overview:'match-overview',maps:'map-records',resources:'match-resources'}[section])}")
        }
        if(name==='SignalMapStats.jsx' && p.node.id.name==='syncTableScroll')p.node.init=expr('()=>{}')
      },
      OptionalCallExpression(p) {
        if(p.node.callee?.property?.name==='scrollIntoView'){helpers.add('nativeRevealElement');p.replaceWith(t.callExpression(t.identifier('nativeRevealElement'),[p.node.callee.object]));return}
        if(p.node.callee?.property?.name==='getBoundingClientRect'){helpers.add('nativeElementRect');p.replaceWith(t.callExpression(t.identifier('nativeElementRect'),[p.node.callee.object]));return}
        if(p.node.callee?.property?.name==='querySelector'){helpers.add('nativeQueryElement');p.replaceWith(t.callExpression(t.identifier('nativeQueryElement'),[p.node.callee.object,...p.node.arguments]));return}
        if (p.node.callee?.property?.name === 'removeAttribute' && p.node.arguments[0]?.value === 'open') {
          helpers.add('closeNativeMenus'); p.replaceWith(t.callExpression(t.identifier('closeNativeMenus'),[]))
        }
      },
      FunctionDeclaration(p) {
        if(name==='ReviewStoryPage.jsx'&&p.node.id.name==='ReviewStoryPage'){
          helpers.add('useOutletContext')
          p.node.body.body.unshift(astFor('const nativeReviewContext=useOutletContext()').program.body[0])
        }
        // Only the active Signal branch is used. Keep its original row/award
        // calculations, without importing the unused old Web table styles.
        if(name==='DualTeamStatsTable.jsx' && p.node.id.name==='DualTeamStatsTable') {
          const branch=p.node.body.body.findIndex(node=>t.isIfStatement(node)&&node.test?.name==='signal')
          if(branch<0)throw new Error('Inspect changed Signal map-statistics boundary')
          p.node.body.body=[...p.node.body.body.slice(0,branch),p.node.body.body[branch].consequent]
        }
        if (name === 'PublicMobileNav.jsx' && p.node.id?.name === 'NavIcon') {
          helpers.add('NativeNavIcon')
          p.node.params = [t.objectPattern([t.objectProperty(t.identifier('path'),t.identifier('path'),false,true),t.objectProperty(t.identifier('active'),t.identifier('active'),false,true)])]
          p.node.body = astFor('function NavIcon({path,active}) { return <NativeNavIcon path={path} active={active}/> }').program.body[0].body
        }
      },
      IfStatement(p) {
        // The canonical overview retains its focus choice; native scroll uses an ID.
        if (name === 'SignalWeeklyOverview.jsx' && generate(p.node.test).code.includes('getBoundingClientRect')) {
          helpers.add('revealWeeklyFocus'); p.replaceWith(t.expressionStatement(t.callExpression(t.identifier('revealWeeklyFocus'),[])))
        }
      },
      JSXElement: { exit(p) {
        const element = p.node, tag = element.openingElement.name.name
        if(name==='FollowingWorkspace.jsx'&&tag==='button'&&generate(element).code.includes("new CustomEvent('fries-cup:open-account')")){
          p.replaceWith(t.jsxFragment(t.jsxOpeningFragment(),t.jsxClosingFragment(),[]));p.skip();return
        }
        // WeChat has no wbr template. Keep the browser's optional word-break
        // opportunity between the public name and BattleTag suffix.
        if(tag==='wbr'){
          element.openingElement.name=t.jsxIdentifier('span')
          element.openingElement.selfClosing=false
          element.closingElement=t.jsxClosingElement(t.jsxIdentifier('span'))
          element.children=[t.jsxExpressionContainer(t.stringLiteral('\u200b'))]
          return
        }
        if(name==='ReviewStoryPage.jsx'&&tag==='PosterModal') {helpers.add('NativeReviewShareDialog');element.openingElement.name=t.jsxIdentifier('NativeReviewShareDialog');return}
        // The native menu adds existing public destinations beyond the Web six.
        // Preserve the authored two-digit numbering for those extra entries.
        if(name==='PublicMobileNav.jsx'&&tag==='small'&&element.children.length===2&&element.children[0].value==='0'&&t.isJSXExpressionContainer(element.children[1])&&generate(element.children[1].expression).code==='index + 1')element.children=[t.jsxExpressionContainer(expr("String(index+1).padStart(2,'0')"))]
        if (tag === 'dialog') {
          helpers.add('NativeDialogSurface'); element.openingElement.name=t.jsxIdentifier('NativeDialogSurface'); element.closingElement.name=t.jsxIdentifier('NativeDialogSurface')
          const dialogOpen=name==='KprDialog.jsx'?expr('open'):t.booleanLiteral(true)
          const dismiss=name==='FavoriteManagerDialog.jsx'?expr('()=>{}'):expr("typeof onClose==='function'?onClose:()=>{}")
          element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('open'),t.jsxExpressionContainer(dialogOpen)),t.jsxAttribute(t.jsxIdentifier('onDismiss'),t.jsxExpressionContainer(dismiss)))
        }
        if (tag === 'nav' && name === 'WeeklyNavigation.jsx') {
          nativeImports.add('ScrollView')
          element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('id'),t.stringLiteral('native-week-rail')))
          p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('ScrollView'),[
            t.jsxAttribute(t.jsxIdentifier('scrollX'),t.jsxExpressionContainer(t.booleanLiteral(true))),
            t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('native-week-scroll')),
            t.jsxAttribute(t.jsxIdentifier('scrollIntoView'),t.jsxExpressionContainer(expr('"native-week-"+selectedId')))
          ]),t.jsxClosingElement(t.jsxIdentifier('ScrollView')),[element])); p.skip()
          return
        }
        if (tag==='ol' && name==='SignalWeeklyOverview.jsx') {
          nativeImports.add('ScrollView')
          p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('ScrollView'),[t.jsxAttribute(t.jsxIdentifier('scrollX'),t.jsxExpressionContainer(t.booleanLiteral(true))),t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('native-map-scroll'))]),t.jsxClosingElement(t.jsxIdentifier('ScrollView')),[element]));p.skip();return
        }
        const classAttribute=element.openingElement.attributes.find(attr=>attr.name?.name==='className')
        // Opening-element adaptation has already appended native state classes.
        // Match the original base class when choosing a platform component.
        let authoredExpression=classAttribute?.value?.expression
        while(t.isBinaryExpression(authoredExpression,{operator:'+'}))authoredExpression=authoredExpression.left
        const authoredClass=authoredExpression&&generate(authoredExpression).code
        if(name==='KprImmersiveArchive.jsx' && tag==='div' && authoredClass==='styles.stage') {p.replaceWith(t.jsxExpressionContainer(t.conditionalExpression(t.unaryExpression('!',t.identifier('isPhoneArchive')),element,t.nullLiteral())));p.skip();return}
        if(name==='SignalMatchDetail.jsx' && tag==='nav' && authoredClass==='styles.mapRail') {
          nativeImports.add('ScrollView');p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('ScrollView'),[t.jsxAttribute(t.jsxIdentifier('scrollX'),t.jsxExpressionContainer(t.booleanLiteral(true))),t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('native-match-rail')),t.jsxAttribute(t.jsxIdentifier('scrollIntoView'),t.jsxExpressionContainer(expr('"native-map-nav-"+currentOrder')))]),t.jsxClosingElement(t.jsxIdentifier('ScrollView')),[element]));p.skip();return
        }
        if((name==='SignalMapStats.jsx' && tag==='div' && authoredClass==='styles.scroller') || (name==='SignalMatchPlayers.jsx' && tag==='div' && authoredClass==='styles.tableScroll')) {
          nativeImports.add('ScrollView');element.openingElement.name=t.jsxIdentifier('ScrollView');element.closingElement.name=t.jsxIdentifier('ScrollView');element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('scrollX'),t.jsxExpressionContainer(t.booleanLiteral(true))))
        }
        if(tag==='svg') {
          helpers.add('NativeSvg');element.openingElement.name=t.jsxIdentifier('NativeSvg');if(element.closingElement)element.closingElement.name=t.jsxIdentifier('NativeSvg')
          if(vectorPaint.length)element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('paint'),t.jsxExpressionContainer(t.arrayExpression(vectorPaint.map(item=>t.cloneNode(item,true))))))
        }
        if(['div','nav','ul','ol','section'].includes(tag)&&element.openingElement.name.name===tag&&authoredClass){
          const matched=[...nativeScrollClasses].find(([key])=>new RegExp('\\b'+key.replaceAll('.', '\\.')+'\\b').test(authoredClass))
          if(matched){nativeImports.add('ScrollView');p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('ScrollView'),[t.jsxAttribute(t.jsxIdentifier(matched[1]),t.jsxExpressionContainer(t.booleanLiteral(true))),t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('native-authored-scroll '+(matched[1]==='scrollX'?'native-scroll-x':'native-scroll-y')))]),t.jsxClosingElement(t.jsxIdentifier('ScrollView')),[element]));p.skip();return}
        }
      }},
      JSXOpeningElement(p) {
        const element = p.parentPath.node, tag=p.node.name.name
        const authoredClass=p.node.attributes.find(attr=>attr.name?.name==='className')?.value?.expression
        if(tag==='table' && ['SignalMatchPlayers.jsx','SignalMapStats.jsx'].includes(name)) {
          const attr=p.node.attributes.find(attr=>attr.name?.name==='className')
          const extra=name==='SignalMatchPlayers.jsx'?expr("' native-player-table native-player-'+view"):t.stringLiteral(' native-stat-table')
          attr.value.expression=t.binaryExpression('+',attr.value.expression,extra)
        }
        if(name==='SignalMatchDetail.jsx' && tag==='div' && authoredClass && generate(authoredClass).code==='styles.shell')p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('style'),t.jsxExpressionContainer(t.identifier('nativeOffsets'))))
        if(name==='SignalWeeklyAdvance.jsx'&&authoredClass){
          const attr=p.node.attributes.find(attr=>attr.name?.name==='className')
          if(tag==='table')attr.value.expression=t.binaryExpression('+',attr.value.expression,expr("hasStandings?' native-advance-table native-advance-standings':' native-advance-table native-advance-roster'"))
          if(['td','th'].includes(tag)&&generate(authoredClass).code==='styles.recordColumn')attr.value.expression=t.binaryExpression('+',attr.value.expression,t.stringLiteral(' native-advance-record-column'))
        }
        if(name==='SignalMatchPlayers.jsx' && tag==='div' && p.node.attributes.some(attr=>attr.name?.name==='ref'&&attr.value?.expression?.name==='playerViewRef'))p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('id'),t.stringLiteral('native-player-view')))
        if(name==='SignalMatchDetail.jsx' && tag==='button' && p.node.attributes.some(attr=>attr.name?.name==='aria-current') && !p.node.attributes.some(attr=>attr.name?.name==='id'))p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('id'),t.jsxExpressionContainer(expr('"native-map-nav-"+map.order'))))
        if(tag==='img') {
          helpers.add('nativeAssetUrl')
          const src=p.node.attributes.find(attr=>attr.name?.name==='src')
          if(src)src.value=t.jsxExpressionContainer(t.callExpression(t.identifier('nativeAssetUrl'),[t.isStringLiteral(src.value)?src.value:src.value.expression]))
          // WeChat Image has explicit box dimensions and a native fit mode.
          const imageClass=p.node.attributes.find(attr=>attr.name?.name==='className')?.value?.expression
          const intrinsicWidth=name==='HeroArtwork.jsx'
          p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('mode'),t.stringLiteral(intrinsicWidth?'heightFix':'aspectFit')))
          if(intrinsicWidth){
            if(!imageClass||!generate(imageClass).code.includes('styles.image'))throw new Error('Inspect changed hero artwork sizing boundary')
            helpers.add('NativeIntrinsicImage');p.node.name=t.jsxIdentifier('NativeIntrinsicImage')
            p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('intrinsic'),t.jsxExpressionContainer(t.binaryExpression('===',t.cloneNode(imageClass,true),expr('styles.image')))))
          }
          // Browser-wide TeamLogo sizing is not inherited by a WeChat Image.
          // Keep the canonical wrapper dimensions rather than its 320px default.
          if(name==='TeamLogo.jsx')p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('native-team-logo-image')))
        }
        if (tag === 'NavIcon') p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('active'),t.jsxExpressionContainer(expr(p.node.attributes.find(attr=>attr.name?.name==='path')?.value?.type==='StringLiteral' ? 'open' : 'navigation.group === item.group'))))
        if (tag === 'select') {
          helpers.add('NativeSelect'); p.node.name=t.jsxIdentifier('NativeSelect'); element.closingElement.name=t.jsxIdentifier('NativeSelect')
        }
        if(tag==='input'){
          helpers.add('NativeInput');p.node.name=t.jsxIdentifier('NativeInput')
        }
        if (['a','details','summary'].includes(tag)) {
          if(tag==='details'&&authoredClass&&/languageMenu|mobileNavMenu|eventSwitcher/.test(generate(authoredClass).code))p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('nativeMenu'),t.jsxExpressionContainer(t.booleanLiteral(true))))
          const replacement={a:'NativeLink',details:'NativeDetails',summary:'NativeSummary'}[tag]
          p.node.name=t.jsxIdentifier(replacement); if(element.closingElement)element.closingElement.name=t.jsxIdentifier(replacement)
          // Keep the original tag's stylesheet selectors despite using a native component.
          const attr=p.node.attributes.find(attr=>attr.name?.name==='className')
          if (!attr) p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral('shared-element shared-tag-'+tag)))
          else if (t.isStringLiteral(attr.value)) attr.value.value+=' shared-element shared-tag-'+tag
          else attr.value.expression=t.binaryExpression('+',attr.value.expression,t.stringLiteral(' shared-element shared-tag-'+tag))
        }
        if (tag === 'button' && name==='WeeklyNavigation.jsx' && p.node.attributes.some(attr=>attr.name?.name==='aria-current')) p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('id'),t.jsxExpressionContainer(expr('"native-week-"+item.id'))))
        const stateAttrs=p.node.attributes.filter(attr=>attr.name && (/^(data-|aria-)/.test(attr.name.name)||['lang','role','type','hidden','disabled'].includes(attr.name.name)))
        if (stateAttrs.length) {
          const properties=stateAttrs.map(attr=>t.objectProperty(t.stringLiteral(attr.name.name),attr.value==null ? t.booleanLiteral(true) : t.isStringLiteral(attr.value) ? attr.value : attr.value.expression))
          const state=t.callExpression(t.identifier('nativeSelectorClasses'),[t.objectExpression(properties)])
          const attr=p.node.attributes.find(attr=>attr.name?.name==='className')
          if(!attr)p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'),t.jsxExpressionContainer(state)))
          else { const original=t.isStringLiteral(attr.value)?attr.value:attr.value.expression; attr.value=t.jsxExpressionContainer(t.binaryExpression('+',original,t.binaryExpression('+',t.stringLiteral(' '),state))) }
        }
      },
      StringLiteral(p) {
        if(p.node.value==='/logos/fries-cup-symbol.png')p.node.value='/assets/mobile/fries-cup-symbol.png'
        if(name==='TeamArchiveNavigation.jsx'){
          const labels={'导出海报':'分享卡片','导出阵容海报':'分享公开队伍卡片','Export roster poster':'Share public team card','Poster':'Share'}
          if(labels[p.node.value])p.node.value=labels[p.node.value]
        }
      },
      JSXText(p){if(name==='TeamArchiveNavigation.jsx')p.node.value=p.node.value.replaceAll('↓','→')}
    })
    // Explicit native platform objects replace the remaining click handlers and
    // responsive predicates. No browser global is evaluated in a phone runtime.
    const globals={window:'nativeWindow',document:'nativeDocument',requestAnimationFrame:'nativeAnimationFrame',cancelAnimationFrame:'nativeCancelAnimationFrame',localStorage:'nativeLocalStorage',IntersectionObserver:'NativeIntersectionObserver'}
    traverse(ast,{ReferencedIdentifier(p){const replacement=globals[p.node.name];if(replacement){helpers.add(replacement);p.replaceWith(t.identifier(replacement))}}})
    // A removed Web modal/controller must not keep its renderer or browser APIs
    // in the generated public bundle.
    for(let pass=0;pass<4;pass++)traverse(ast,{Program(p){p.scope.crawl()},FunctionDeclaration(p){if(p.node.id?.name==='PosterModal'&&name==='ReviewStoryPage.jsx')p.remove()},ImportDeclaration(p){p.node.specifiers=p.node.specifiers.filter(spec=>p.scope.getBinding(spec.local.name)?.referenced);if(!p.node.specifiers.length&&!/\.css$/.test(p.node.source.value))p.remove()}})
    const finalAst=pruneCanonicalSource(generate(ast).code)
    let code = '// Generated from current Stats JSX. Native browser-boundary replacements only.\n'+generate(finalAst,{comments:false}).code+'\n'
    const forbidden=/\b(?:document|window|ResizeObserver)\b|\.getBoundingClientRect\(|\.querySelector(?:All)?\(|\.scrollIntoView\(/
    if(forbidden.test(code))throw new Error('Unadapted browser operation in '+name)
    code=`import {${[...helpers].join(',')}} from '${runtime}'\n`+code
    if(nativeImports.size)code=`import {${[...nativeImports].join(',')}} from '@tarojs/components'\n`+code
    fs.writeFileSync(path.join(target,name),code)
  }
  const assets=path.join(out,'mobile-assets'); fs.mkdirSync(assets,{recursive:true})
  fs.writeFileSync(path.join(target,'emptyLegacyStyles.js'),'export default {}\n')
  fs.copyFileSync(path.join(stats,'public/logos/fries-cup-symbol.png'),path.join(assets,'fries-cup-symbol.png'))
  console.log('Generated Stats public header, context, phone dock, weekly home and mobile archive from current JSX/CSS.')
}
