const path = require('node:path')
module.exports = function ({ types: t }) {
  return {
    name: 'native-localized-interface-copy',
    visitor: {
      Program: {
        enter(current, state) {
          state.nativeCopyEnabled = /[\\/]src[\\/](?:shared|classic|poster|generated[\\/]classic)[\\/].+\.jsx$/.test(state.filename || '')
          if (!state.nativeCopyEnabled) return
          const localePath = path.relative(path.dirname(state.filename), path.resolve(__dirname, '../src/shared/nativeLocales.js')).replaceAll('\\', '/')
          current.unshiftContainer('body', t.importDeclaration([t.importSpecifier(t.identifier('__nativeLocale'), t.identifier('getActiveLocale'))], t.stringLiteral(localePath.startsWith('.') ? localePath : './'+localePath)))
          const target = path.resolve(__dirname, '../src/shared/nativeCopy.js')
          const relative = path.relative(path.dirname(state.filename), target).replaceAll('\\', '/')
          current.unshiftContainer('body', t.importDeclaration([t.importSpecifier(t.identifier('__nativeCopy'), t.identifier('nativeCopy'))], t.stringLiteral(relative.startsWith('.') ? relative : `./${relative}`)))
        }
      },
      CallExpression(current, state) {
        if (!state.nativeCopyEnabled || current.node.arguments.length !== 1 || !t.isIdentifier(current.node.callee) || !['formatOwHeroName','formatOwHeroNames','formatOwMapName','formatOwMapMode'].includes(current.node.callee.name)) return
        current.node.arguments.push(t.callExpression(t.identifier('__nativeLocale'), []))
      },
      JSXText(current, state) {
        if (!state.nativeCopyEnabled || !current.node.value.trim()) return
        const text = current.node.value.replace(/\s+/g, ' ')
        current.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('__nativeCopy'), [t.stringLiteral(text)])))
        current.skip()
      },
      JSXExpressionContainer: {
        exit(current, state) {
          if (!state.nativeCopyEnabled || t.isJSXEmptyExpression(current.node.expression)) return
          const parent = current.parent
          const readable = t.isJSXAttribute(parent) && ['title', 'lead', 'label', 'placeholder', 'aria-label', 'alt'].includes(parent.name.name)
          if (t.isJSXAttribute(parent) && !readable) return
          if (t.isCallExpression(current.node.expression) && t.isIdentifier(current.node.expression.callee, { name: '__nativeCopy' })) return
          current.node.expression = t.callExpression(t.identifier('__nativeCopy'), [current.node.expression])
        }
      },
      JSXAttribute(current, state) {
        if (!state.nativeCopyEnabled || !['title', 'lead', 'label', 'placeholder', 'aria-label', 'alt'].includes(current.node.name.name) || !t.isStringLiteral(current.node.value)) return
        current.node.value = t.jsxExpressionContainer(t.callExpression(t.identifier('__nativeCopy'), [current.node.value]))
      }
    }
  }
}
