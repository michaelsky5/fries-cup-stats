// Read-only design comparison: run the actual Stats source against the same
// saved public snapshots as native QA. No repository data files are replaced.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from '../../../node_modules/vite/dist/node/index.js'
const stats=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')
const snapshots=path.resolve(process.argv[2])
const server=await createServer({root:stats,configFile:path.join(stats,'vite.config.js'),server:{host:'127.0.0.1',port:3028,strictPort:true},plugins:[{
  name:'read-only-public-design-fixture',configureServer(server) {
    server.middlewares.use((request,response,next)=>{
      const match=/^\/api\/admin-public\/seasons\/(FCW26|FCR26|QGCS4|FCA26)\/publish\/latest\/data(?:\?.*)?$/.exec(request.url||'')
      if(!match||request.method!=='GET')return next()
      response.setHeader('Content-Type','application/json; charset=utf-8');response.setHeader('Cache-Control','no-store')
      response.end(fs.readFileSync(path.join(snapshots,match[1]+'-public.json')))
    })
  }
}]})
await server.listen();server.printUrls()
