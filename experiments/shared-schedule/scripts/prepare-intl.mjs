import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = require.resolve('@formatjs/intl-datetimeformat/add-golden-tz.js')
let data
// Read the library's generated registration data in a data-only context.
runInNewContext(fs.readFileSync(source, 'utf8'), {
  Intl: { DateTimeFormat: { __addTZData: value => { data = value } } }
}, { timeout: 1000 })
const zones = data.zones.filter(zone => /^(Asia\/Shanghai|Etc\/UTC|UTC)\|/.test(zone))
if (!zones.some(zone => zone.startsWith('Asia/Shanghai|'))) throw new Error('Shanghai timezone data missing')
const selected = { ...data, zones }
fs.mkdirSync(path.join(root, 'src/generated'), { recursive: true })
fs.writeFileSync(path.join(root, 'src/generated/intlTimezones.js'),
  '// Generated from FormatJS IANA data for this UTC+8 schedule trial.\n' +
  `export default ${JSON.stringify(selected)}\n`)
console.log(`Prepared Intl timezone data: ${zones.map(zone => zone.split('|')[0]).join(', ')}`)
