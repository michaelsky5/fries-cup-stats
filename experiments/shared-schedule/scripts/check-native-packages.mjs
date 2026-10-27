import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.join(trial, 'dist/weapp')
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
const subPackages = (config.subPackages || []).map(item => item.root.replace(/\/$/, ''))
const bytes = new Map([['main', 0], ...subPackages.map(name => [name, 0])])
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name)
    if (entry.isDirectory()) { visit(filename); continue }
    const relative = path.relative(root, filename).replaceAll('\\', '/')
    const owner = subPackages.find(name => relative.startsWith(name + '/')) || 'main'
    if (/\.(?:js|json)$/.test(relative) && /synthetic\.preview\.token|NativeDemo123!|WECHAT_MINI_APP_SECRET|jscode2session/.test(fs.readFileSync(filename, 'utf8'))) {
      throw new Error('Native output contains a server credential boundary or visual fixture: ' + relative)
    }
    bytes.set(owner, bytes.get(owner) + fs.statSync(filename).size)
  }
}
visit(root)
const sizes = Object.fromEntries(bytes)
const total=[...bytes.values()].reduce((sum,value)=>sum+value,0)
const report={sizes,totalBytes:total,packageBudgetBytes:2*1024*1024,totalBudgetBytes:20*1024*1024}
fs.writeFileSync(path.join(trial,'dist/weapp-package-report.json'),JSON.stringify(report,null,2)+'\n')
const oversized = [...bytes].filter(([, size]) => size > 2 * 1024 * 1024)
if (oversized.length) throw new Error('Native package exceeds 2 MiB: ' + oversized.map(([name,size]) => `${name}: ${size}`).join(', '))
if(total>20*1024*1024)throw new Error('Native edition exceeds the 20 MiB project budget: '+total)
console.log('Native package sizes: ' + JSON.stringify(sizes))
