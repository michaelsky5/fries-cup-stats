import postcss from 'postcss'

// Copy only inherited public-page typography. Browser background, scrollbar,
// form and private-page rules do not belong to the native page container.
export function nativePublicFoundationCss(source) {
  const globals=postcss.parse(source)
  const body=globals.nodes.find(node=>node.type==='rule'&&node.selector==='body')
  if(!body?.nodes.some(node=>node.type==='decl'&&node.prop==='font-size'))throw new Error('Inspect changed Stats body typography')
  const typography=body.nodes.filter(node=>node.type==='decl'&&/^(?:font(?:-.+)?|line-height|letter-spacing|word-spacing|text-rendering)$/.test(node.prop)).map(node=>node.toString()+';').join('\n')
  return `/* postcss-pxtransform disable */\n/* Generated from Stats globals; do not edit. */\n.shared-root.native-stats-frame {\n${typography}\n}\n`
}
