import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'

const traverse = traverseModule.default || traverseModule
const generate = generateModule.default || generateModule
const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceFile = path.resolve(trial, '../../src/pages/teams/TeamDetailPage.jsx')
const outputFile = path.join(trial, 'src/generated/canonicalTeamModel.js')
const ast = parse(fs.readFileSync(sourceFile, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
let program
traverse(ast, { Program(current) { program = current; current.stop() } })
// Generate the website's pure calculations and their dependency closure.
const exported = ['getTeamMatchRows', 'getMatchSummary', 'getSeasonLedgerStats', 'getMapTypeStats', 'getTeamMapPool', 'getTeamCombatProfile', 'getTournamentCombatBaseline', 'getCombatComparisons', 'getTeamTacticalProfile', 'getPlayerStyleProfiles', 'getRecordedLineups', 'getRecentForm', 'getTeamLeaders']
const bindings = new Map()
function collect(name) {
  if (bindings.has(name)) return
  const binding = program.scope.getBinding(name)
  if (!binding) return
  bindings.set(name, binding.path)
  if (!binding.path.isImportSpecifier() && !binding.path.isImportDefaultSpecifier()) binding.path.traverse({ ReferencedIdentifier(current) {
    const referenced = current.scope.getBinding(current.node.name)
    if (referenced?.scope === program.scope) collect(current.node.name)
  } })
}
exported.forEach(collect)
const nodes = [], imports = new Map()
for (const binding of bindings.values()) {
  if (binding.isImportSpecifier() || binding.isImportDefaultSpecifier()) {
    const declaration = binding.parentPath.node
    if (!imports.has(declaration.source.value)) imports.set(declaration.source.value, [])
    imports.get(declaration.source.value).push(binding.node)
  } else nodes.push(binding.isVariableDeclarator() ? { ...binding.parentPath.node, declarations: [binding.node] } : binding.node)
}
for (const [source, specifiers] of imports) {
  const target = source.startsWith('.') ? path.relative(path.dirname(outputFile), path.resolve(path.dirname(sourceFile), source)).replaceAll('\\', '/') : source
  nodes.push({ type: 'ImportDeclaration', specifiers, source: { type: 'StringLiteral', value: target.startsWith('.') ? target : source.startsWith('.') ? `./${target}` : target } })
}
nodes.sort((left, right) => (left.start || 0) - (right.start || 0))
const code = nodes.map(node => generate(node, { comments: false }).code).join('\n\n')
if (/<[A-Za-z]/.test(code)) throw new Error('Team calculation closure contains a view component')
fs.writeFileSync(outputFile, `// Generated from Stats TeamDetailPage; do not edit.\n${code}\n\nexport { ${exported.join(', ')} };\n`)
console.log(`Generated ${bindings.size} canonical team calculation bindings.`)
