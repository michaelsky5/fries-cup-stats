import fs from 'node:fs'
import path from 'node:path'
import { parseSync } from '@babel/core'
import postcss from 'postcss'
import sharp from 'sharp'
import { portableScheduleCss } from './portable-css.mjs'
import { resolveDesignToken } from './native-design-tokens.mjs'

// Read the website's actual definitions, rather than keeping another set of
// labels, icon paths and layout rules for the trial.
export const navigationSources = [
  'src/components/layout/PublicMobileNav.jsx',
  'src/components/layout/PublicMobileNav.module.css',
  'src/components/layout/publicNavigation.js',
  'src/features/kpr-design/KprLeaderboard.module.css'
]

function parse(source) {
  return parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } }).program
}
function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return []
  return [
    ...(predicate(node) ? [node] : []),
    ...Object.values(node).flatMap(value => Array.isArray(value)
      ? value.flatMap(child => descendants(child, predicate))
      : descendants(value, predicate))
  ]
}
function valueOf(node, constants = {}) {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node?.type)) return node.value
  if (node?.type === 'ArrayExpression') return node.elements.map(value => valueOf(value, constants))
  if (node?.type === 'ObjectExpression') return Object.assign({}, ...node.properties.map(property => {
    if (property.type === 'SpreadElement') return valueOf(property.argument, constants)
    if (property.type !== 'ObjectProperty' || property.computed) throw new Error('Unsupported navigation property')
    return { [property.key.name || property.key.value]: valueOf(property.value, constants) }
  }))
  if (node?.type === 'Identifier' && Object.hasOwn(constants, node.name)) return constants[node.name]
  if (node?.type === 'MemberExpression' && node.computed) return valueOf(node.object, constants)[valueOf(node.property, constants)]
  throw new Error(`Unsupported navigation definition: ${node?.type}`)
}
function constant(ast, name) {
  const declaration = descendants(ast, node => node.type === 'VariableDeclarator' && node.id.name === name)[0]
  if (!declaration) throw new Error(`Missing canonical navigation constant: ${name}`)
  return valueOf(declaration.init)
}

export async function prepareNavigation(stats, out, tokens) {
  const read = file => fs.readFileSync(path.join(stats, file), 'utf8')
  const mobile = parse(read(navigationSources[0]))
  const publicNav = parse(read(navigationSources[2]))
  const dock = constant(mobile, 'DOCK_ITEMS')
  // Keep the website's four destinations. The participation guide is public;
  // its account actions enter the separately authenticated native account page.
  const destinations = constant(publicNav, 'PRIMARY_NAV')
  const personalFunction = descendants(publicNav, node => node.type === 'FunctionDeclaration' && node.id.name === 'getPersonalNavItem')[0]
  const personalReturn = descendants(personalFunction, node => node.type === 'ReturnStatement')[0]?.argument
  if (personalReturn?.type !== 'ConditionalExpression') throw new Error('Canonical personal navigation changed; review the adapter')
  destinations[destinations.length - 1] = valueOf(personalReturn.alternate, { PRIMARY_NAV: destinations, SPACE_NAV: destinations.find(item => item.group === 'space') })
  const moreIcon = descendants(mobile, node => node.type === 'JSXAttribute' && node.name.name === 'path' && node.value?.type === 'StringLiteral')[0]?.value.value
  if (!moreIcon || dock.length !== 4 || !dock.some(item => item.group === 'matches')) throw new Error('Canonical dock changed; review the adapter')
  const icons = [...dock, { group: 'more', icon: moreIcon }]
  const assets = path.join(out, 'navigation')
  fs.mkdirSync(assets, { recursive: true })
  for (const icon of icons) {
    for (const [suffix, color] of [['', resolveDesignToken('--fc-data-paper', tokens)], ['-active', resolveDesignToken('--fc-data-signal', tokens)]]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5"><path d="${icon.icon}"/></svg>`
      await sharp(Buffer.from(svg)).png().toFile(path.join(assets, `${icon.group}${suffix}.png`))
    }
  }
  fs.writeFileSync(path.join(out, 'navigation.json'), JSON.stringify({ dock, destinations, moreIcon }, null, 2) + '\n')
  fs.writeFileSync(path.join(out, 'StatsMobileNav.module.css'), portableScheduleCss(read(navigationSources[1])))

  // KprDialog itself needs browser-only <dialog> methods. Keep its actual
  // dialog/header styles while the shared adapter supplies the modal behavior.
  const dialog = postcss.parse(read(navigationSources[3]))
  dialog.walkRules(rule => {
    if (!/^\.(dialog|dialogHeader|compactDialog)(\b|[.:\s])/.test(rule.selector) || /compareDialog/.test(rule.selector)) rule.remove()
  })
  dialog.walkAtRules(rule => { if (!rule.nodes?.length) rule.remove() })
  fs.writeFileSync(path.join(out, 'StatsDialog.module.css'), portableScheduleCss(dialog.toString()))
}
