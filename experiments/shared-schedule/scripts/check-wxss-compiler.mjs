import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
const [compiler,root,proof]=process.argv.slice(2)
if(!compiler||!root||!proof)throw new Error('Expected installed WXSS compiler, compiled project and proof directory')
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)])
const files=walk(root).filter(file=>file.endsWith('.wxss'))
if(!files.length||!fs.existsSync(path.join(root,'app.json')))throw new Error('No complete native build to validate')
const report=[]
fs.mkdirSync(path.join(proof,'wxss-compiled'),{recursive:true})
for(const [index,file] of files.entries()){
  const seen=new Set(),dependencies=[]
  const visit=file=>{if(seen.has(file))return;seen.add(file);dependencies.push(path.relative(root,file).replaceAll('\\','/'));for(const match of fs.readFileSync(file,'utf8').matchAll(/@import\s*["']([^"']+)["']/g))visit(path.resolve(path.dirname(file),match[1]))}
  visit(file)
  const result=spawnSync(compiler,['-lc','-o',path.join(proof,'wxss-compiled',index+'.js'),...dependencies],{cwd:root,encoding:'utf8',timeout:20000})
  if(result.status!==0)report.push({file:path.relative(root,file),status:result.status,error:result.stderr||result.stdout})
}
fs.writeFileSync(path.join(proof,'wxss-compiler-report.json'),JSON.stringify({files:files.length,failures:report},null,2))
console.log(JSON.stringify({files:files.length,failures:report}))
if(report.length)process.exitCode=1
