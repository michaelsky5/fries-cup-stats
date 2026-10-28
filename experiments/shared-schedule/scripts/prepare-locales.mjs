import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import extraCopy from '../src/shared/nativeExtraCopy.js'
import generateModule from '@babel/generator'
const traverse = traverseModule.default || traverseModule
const generate = generateModule.default || generateModule
const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stats = path.resolve(trial, '../..')
const out = path.join(trial, 'src/generated')
const identity = parse(fs.readFileSync(path.join(stats, 'src/lib/locales.js'), 'utf8'), { sourceType: 'module' })
const keep = new Set(['LOCALES', 'DEFAULT_LOCALE', 'LOCALE_STORAGE_KEY', 'LOCALE_CHANGE_EVENT', 'resolveLocale', 'normalizeLocale', 'getLocaleParam'])
const nodes = identity.program.body.filter(node => {
  const declaration = node.declaration || node
  return keep.has(declaration.id?.name) || declaration.declarations?.some(item => keep.has(item.id.name))
})
fs.writeFileSync(path.join(out, 'localeIdentity.js'), '// Generated from Stats locale contract.\n' + nodes.map(node => generate(node).code).join('\n'))

const files = new Set(), literals = new Set(), parts = new Set()
function visit(file) {
  if (files.has(file) || !/\.(?:[cm]?jsx?|json)$/.test(file)) return
  files.add(file)
  if (file.endsWith('.json')) {
    const collect = value => {
      if (typeof value === 'string' && /[\u4e00-\u9fff]/.test(value)) literals.add(value.trim().replace(/\s+/g, ' '))
      else if (value && typeof value === 'object') Object.values(value).forEach(collect)
    }
    collect(JSON.parse(fs.readFileSync(file, 'utf8')))
    return
  }
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
  traverse(ast, {
    StringLiteral(p) { if (/[\u4e00-\u9fff]/.test(p.node.value)) literals.add(p.node.value.trim().replace(/\s+/g, ' ')) },
    JSXText(p) { if (/[\u4e00-\u9fff]/.test(p.node.value)) literals.add(p.node.value.trim().replace(/\s+/g, ' ')) },
    TemplateLiteral(p) {
      literals.add(p.node.quasis.map((item, index) => item.value.cooked + (index < p.node.expressions.length ? `{${index}}` : '')).join('').trim())
      p.node.quasis.forEach(item => { if (item.value.cooked.trim().length >= 2 && /[\u4e00-\u9fff]/.test(item.value.cooked)) parts.add(item.value.cooked.trim()) })
    }
  })
  for (const statement of ast.program.body) {
    const source = statement.source?.value
    if (!source?.startsWith('.')) continue
    const base = path.resolve(path.dirname(file), source)
    const dependency = [base, `${base}.js`, `${base}.jsx`, `${base}.json`, path.join(base, 'index.js')].find(item => fs.existsSync(item) && fs.statSync(item).isFile())
    if (dependency && !/localeCatalog\.js$/.test(dependency) && dependency.startsWith(stats + path.sep)) visit(dependency)
  }
}
for (const name of fs.readdirSync(path.join(trial, 'src/shared'))) if (/\.[cm]?jsx?$/.test(name)) visit(path.join(trial, 'src/shared', name))
for (const dir of ['pages','components','engine']) for (const name of fs.readdirSync(path.join(out,'classic',dir))) if (/\.[cm]?jsx?$/.test(name)) visit(path.join(out,'classic',dir,name))
visit(path.join(trial,'src/classic/pages/index.jsx'))
visit(path.join(trial,'src/poster/pages/index.jsx'))
visit(path.join(stats, 'src/lib/reviewLocale.js'))
const catalogs = {}
for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
  const full = (await import(pathToFileURL(path.join(stats, `src/locales/${locale}.js`)).href)).default
  catalogs[locale] = Object.fromEntries(Object.entries(full).filter(([key]) => literals.has(key.trim().replace(/\s+/g, ' ')) || /\{\d+\}/.test(key) && [...parts].some(part => key.includes(part))))
}
for (const [zh,en,ko] of extraCopy) { if (!catalogs['en-US'][zh]) catalogs['en-US'][zh]=en; if (!catalogs['ko-KR'][zh]) catalogs['ko-KR'][zh]=ko }
const preset = await import(pathToFileURL(path.join(stats, 'node_modules/opencc-js/dist/esm-lib/preset/cn2t.js')).href)
const core = await import(pathToFileURL(path.join(stats, 'node_modules/opencc-js/dist/esm-lib/core.js')).href)
const fullConvert = core.ConverterBuilder(preset)({from:'cn',to:'twp'})
for (const [zh] of extraCopy) if (!catalogs['zh-TW'][zh]) catalogs['zh-TW'][zh]=fullConvert(zh).replaceAll('薯條盃','薯條杯')
const intermediate = core.ConverterBuilder(preset)({from:'cn',to:'t'})
const corpus = [...literals, ...parts, ...[...literals, ...parts].map(intermediate), ...[...literals, ...parts].map(fullConvert)].join('\n')
const slim = dict => (typeof dict === 'string' ? dict.split('|').map(row => { const index = row.indexOf(' '); return [row.slice(0,index), row.slice(index+1)] }) : dict).filter(([word]) => Array.from(word).length === 1 || corpus.includes(word)).map(row => row.join(' ')).join('|') || '\uFDD0 \uFDD0'
const config = preset.configs.s2twp
const restricted = { normalizationChain: config.normalizationChain.map(group => group.map(slim)), segmentation: config.segmentation.map(slim), conversionChain: config.conversionChain.map(group => group.map(slim)) }
const convert = core.ConverterBuilder({from:{cn:[]},to:{twp:[]},configs:{s2twp:restricted}})({from:'cn',to:'twp'})
for (const text of literals) if (/[\u4e00-\u9fff]/.test(text) && convert(text) !== fullConvert(text)) throw new Error('Traditional subset drift: '+JSON.stringify([text.slice(0,60),convert(text),fullConvert(text)]))
fs.writeFileSync(path.join(out, 'traditionalConverter.js'), '// Generated canonical OpenCC dictionary subset for authored review copy only.\nimport { ConverterBuilder } from \'../../../../node_modules/opencc-js/dist/esm-lib/core.js\'\nconst convert = ConverterBuilder({from:{cn:[]},to:{twp:[]},configs:{s2twp:'+JSON.stringify(restricted)+'}})({from:\'cn\',to:\'twp\'})\nexport const convertTraditional = text => convert(text).replaceAll(\'薯條盃\',\'薯條杯\').replaceAll(\'籤下\',\'簽下\').replaceAll(\'籤個名\',\'簽個名\').replaceAll(\'籤名\',\'簽名\')\n')
fs.writeFileSync(path.join(out, 'localeCatalog.js'), `// Generated subset of canonical Stats UI dictionaries.\nimport { convertTraditional } from './traditionalConverter.js'\nconst catalogs = ${JSON.stringify(catalogs)}\nexport function getUiCatalog(locale) { return catalogs[locale] }\nexport function ensureUiLocale() { return Promise.resolve() }\nexport function ensureTraditionalReview() { return Promise.resolve() }\nexport function convertTraditionalCopy(text) { return convertTraditional(text) }\n`)
console.log(`Prepared canonical UI dictionaries: ${Object.entries(catalogs).map(([locale, copy]) => `${locale}:${Object.keys(copy).length}`).join(', ')}`)
