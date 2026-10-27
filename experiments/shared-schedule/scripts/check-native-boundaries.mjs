import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {parse} from '@babel/parser'
import app from '../src/app.config.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const seen=new Set(),failures=[]
const pages=[...app.pages,...app.subPackages.flatMap(pack=>pack.pages.map(page=>pack.root+'/'+page))]
function resolve(base){return [base,base+'.js',base+'.jsx',path.join(base,'index.js')].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())}
function visit(file,chain=[]){
  if(seen.has(file))return
  seen.add(file)
  if(/[\\/]src[\\/]features[\\/](?:auth|team-lobby|match-feedback)[\\/]/.test(file)&&!file.includes(path.sep+'generated'+path.sep)){
    failures.push([...chain,file].map(name=>path.relative(root,name)))
    return
  }
  if(!/\.[cm]?jsx?$/.test(file))return
  const ast=parse(fs.readFileSync(file,'utf8'),{sourceType:'unambiguous',plugins:['jsx']})
  for(const statement of ast.program.body){
    const request=statement.source?.value
    if(typeof request!=='string')continue
    if(['react-dom','react-router-dom'].includes(request)){failures.push([...chain,file,request]);continue}
    if(!request.startsWith('.'))continue
    // These canonical modules have explicit native webpack replacements.
    if(/[\\/]src[\\/](?:config[\\/]seasons|lib[\\/](?:locales|localeCatalog))\.js$/.test(path.resolve(path.dirname(file),request)))continue
    const dependency=resolve(path.resolve(path.dirname(file),request))
    if(dependency)visit(dependency,[...chain,file])
  }
}
visit(path.join(root,'src/app.js'))
for(const page of pages){const file=resolve(path.join(root,'src',page));if(!file)throw new Error('Missing native entry: '+page);visit(file)}
if(failures.length)throw new Error('Web/private controller entered public native graph:\n'+JSON.stringify(failures,null,2))
console.log(JSON.stringify({registeredPages:pages.length,checkedFiles:seen.size,privateControllers:0}))
