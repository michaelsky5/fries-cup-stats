import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'
import * as t from '@babel/types'
import sharp from 'sharp'
const traverse=traverseModule.default||traverseModule, generate=generateModule.default||generateModule
const trial=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), stats=path.resolve(trial,'../..')
const out=path.join(trial,'src/generated/poster')
fs.mkdirSync(out,{recursive:true})
const sourceFile=path.join(stats,'src/lib/reviewPoster.js')
const ast=parse(fs.readFileSync(sourceFile,'utf8'),{sourceType:'module'})
const relativeImport=file=>{const name=path.relative(out,file).replaceAll('\\','/');return name.startsWith('.')?name:'./'+name}
traverse(ast,{
  ImportDeclaration(p){const name=p.node.source.value;if(name==='./reviewBoardingPass.js')return;p.node.source.value=relativeImport(path.resolve(path.dirname(sourceFile),name))},
  FunctionDeclaration(p){
    if(p.node.id?.name==='loadImage')p.node.body=t.blockStatement([t.returnStatement(t.callExpression(t.identifier('nativeLoadImage'),[t.identifier('src')]))])
    if(p.node.id?.name==='canvasToPngUrl')p.node.body=t.blockStatement([t.returnStatement(t.callExpression(t.identifier('nativeCanvasToPng'),[t.identifier('canvas')]))])
  },
  CallExpression(p){
    if(p.node.callee.type==='MemberExpression'&&p.node.callee.property.name==='stroke'&&p.node.arguments[0]?.type==='NewExpression'&&p.node.arguments[0].callee.name==='Path2D'){
      p.replaceWith(t.callExpression(t.identifier('strokeNativePath'),[p.node.callee.object,...p.node.arguments[0].arguments]))
    }
  }
})
ast.program.body.unshift(...parse("import {nativeCreateCanvas,nativeLoadImage,nativeCanvasToPng} from '../../poster/nativeCanvasRuntime.js'; import {strokeNativePath} from '../../poster/canvasCompatibility.js'; const document={createElement:nativeCreateCanvas};",{sourceType:'module'}).program.body)
fs.writeFileSync(path.join(out,'reviewPoster.js'),'// Generated from Stats Canvas renderer; native canvas/image/export boundaries only.\n'+generate(ast,{comments:true}).code+'\n')

// Extract the page's exact payload construction without importing its router,
// browser modal, film components or html2canvas.
const page=parse(fs.readFileSync(path.join(stats,'src/pages/review/ReviewStoryPage.jsx'),'utf8'),{sourceType:'module',plugins:['jsx']})
const names=new Set(['cleanPosterSubject','uniqPosterChips','normalizePosterKind','inferPosterKindFromPage','safeArrForPoster','POSTER_COPY','getPosterCopy','buildReviewPosterPayload'])
const nodes=page.program.body.filter(node=>names.has(node.id?.name)||node.declarations?.some(item=>names.has(item.id.name)))
if(nodes.length!==names.size)throw new Error('Canonical review payload bindings changed; inspect before generating.')
fs.writeFileSync(path.join(out,'reviewPayload.js'),`// Generated from Stats review page's pure payload bindings.\nimport {getPosterPayload} from './reviewPoster.js'\nimport {adaptReviewText} from '${relativeImport(path.join(stats,'src/lib/reviewSeason.js'))}'\n`+nodes.map(node=>generate(node).code).join('\n')+'\nexport {buildReviewPosterPayload}\n')

const boarding=parse(fs.readFileSync(path.join(stats,'src/lib/reviewBoardingPass.js'),'utf8'),{sourceType:'module'})
traverse(boarding,{
  ImportDeclaration(p){if(p.node.source.value==='./reviewNavigation.js')p.remove();else p.node.source.value=relativeImport(path.resolve(stats,'src/lib',p.node.source.value))},
  FunctionDeclaration(p){
    if(p.node.id?.name==='createBoardingQr')p.node.body=t.blockStatement(parse("if(!reviewUrl)return null;return QRCode.create(reviewUrl,{errorCorrectionLevel:'M'}).modules;",{sourceType:'module',allowReturnOutsideFunction:true}).program.body)
    if(p.node.id?.name==='buildBoardingReviewUrl')p.node.body=t.blockStatement([t.returnStatement(t.callExpression(t.identifier('nativeBoardingReviewUrl'),[t.identifier('pathname'),t.identifier('seasonId'),t.identifier('locale')]))])
  }
})
boarding.program.body.unshift(t.importDeclaration([t.importDefaultSpecifier(t.identifier('QRCode'))],t.stringLiteral('qrcode/lib/core/qrcode.js')))
boarding.program.body.unshift(t.importDeclaration([t.importSpecifier(t.identifier('nativeBoardingReviewUrl'),t.identifier('nativeBoardingReviewUrl'))],t.stringLiteral('../../poster/posterRoutes.js')))
fs.writeFileSync(path.join(out,'reviewBoardingPass.js'),'// Generated canonical QR data and canvas painting; no browser QR renderer.\n'+generate(boarding).code+'\n')

// Native canvas image objects do not consistently decode SVG. Rasterize our
// existing vector marks at build time, leaving all authored artwork unchanged.
const assets=path.join(trial,'src/poster/assets'), map={}
fs.mkdirSync(assets,{recursive:true})
for(const name of fs.readdirSync(path.join(stats,'public/review/hero-marks')).filter(name=>name.endsWith('.svg'))){
  const png=name.replace(/\.svg$/,'.png')
  await sharp(path.join(stats,'public/review/hero-marks',name)).resize({width:320}).png({compressionLevel:9}).toFile(path.join(assets,png))
  map['/review/hero-marks/'+name]='/poster/assets/review-emblems/'+png
}
fs.writeFileSync(path.join(out,'assetPaths.json'),JSON.stringify(map,null,2)+'\n')
console.log(`Generated original review Canvas renderer, payload, QR and ${Object.keys(map).length} native hero marks.`)
