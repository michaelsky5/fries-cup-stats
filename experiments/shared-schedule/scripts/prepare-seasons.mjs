import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stats = path.resolve(trial, '../..')
const source = fs.readFileSync(path.join(stats, 'src/config/seasons.js'), 'utf8')
const ast = parse(source, { sourceType: 'module' })
const declaration = ast.program.body.flatMap(item => item.declaration?.declarations || []).find(item => item.id.name === 'SEASONS')
function literal(node) {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node?.type)) return node.value
  if (node?.type === 'NullLiteral') return null
  if (node?.type === 'ArrayExpression') return node.elements.map(literal)
  if (node?.type === 'ObjectExpression') return Object.fromEntries(node.properties.map(property => [property.key.name ?? property.key.value, literal(property.value)]))
  throw new Error(`Public season config must be literal: ${node?.type}`)
}
// Read the real catalog without executing Web-only env switches or including
// private partner trials. Native URLs always target the public System service.
const keys = new Set(['id', 'name', 'kind', 'lifecycle', 'publicCode', 'seriesCode', 'seriesName', 'competitionFormat', 'reviewEnabled', 'reviewRequirements', 'rankingMinTimeMins', 'rules', 'switcherMeta'])
const catalog = declaration.init.elements.map(item => Object.fromEntries(item.properties.filter(property => keys.has(property.key.name)).map(property => [property.key.name, literal(property.value)])))
if (!catalog.length || catalog.some(item => !/^[A-Z0-9]+$/.test(item.id))) throw new Error('Invalid public season catalog')
fs.mkdirSync(path.join(trial, 'src/generated'), { recursive: true })
fs.writeFileSync(path.join(trial, 'src/generated/seasons.json'), JSON.stringify(catalog, null, 2) + '\n')
fs.writeFileSync(path.join(trial, 'src/generated/seasons.js'), `/* Generated from Stats public catalog. */\nexport default ${JSON.stringify(catalog)}\n`)
console.log(`Generated ${catalog.length} public seasons from Stats configuration.`)
