import postcss from 'postcss'

export function rootCustomProperties(...sources) {
  return sources.flatMap(source => postcss.parse(source).nodes
    .filter(node => node.type === 'rule' && node.selector === ':root')
    .flatMap(node => node.nodes.filter(declaration => declaration.type === 'decl' && declaration.prop.startsWith('--'))
      .map(declaration => [declaration.prop, declaration.value])))
}

// Raster generators need literal colours. WXSS keeps the same alias declarations
// so later shared palette changes continue to use the canonical source values.
export function resolveDesignToken(name, properties, seen = []) {
  if (seen.includes(name)) throw new Error('Circular design token: ' + name)
  const value = properties[name]
  if (typeof value !== 'string') throw new Error('Missing design token: ' + name)
  const result = value.replace(/var\((--[\w-]+)\)/g, (_match, key) => resolveDesignToken(key, properties, [...seen, name]))
  if (result.includes('var(')) throw new Error('Unsupported raster design token: ' + name)
  return result
}
