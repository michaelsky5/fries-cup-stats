module.exports = function ({ types: t }) {
  return {
    name: 'shared-html-selector-classes',
    visitor: {
      Program: {
        exit(programPath,state){
          if(state.nativeBreakText)programPath.unshiftContainer('body',t.importDeclaration([t.importSpecifier(state.nativeBreakText,t.identifier('Text'))],t.stringLiteral('@tarojs/components')))
        }
      },
      JSXOpeningElement(nodePath, state) {
        if (!/[\\/]src[\\/](?:shared|classic|poster|generated[\\/](?:classic|mobile))[\\/].+\.jsx$/.test(state.filename || '')) return
        const node = nodePath.node
        if (!t.isJSXIdentifier(node.name) || !/^[a-z]/.test(node.name.name)) return
        const extra = `shared-element shared-tag-${node.name.name}`
        const attribute = node.attributes.find(item => t.isJSXAttribute(item) && item.name.name === 'className')
        if (!attribute) node.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(extra)))
        else if (t.isStringLiteral(attribute.value)) attribute.value.value += ` ${extra}`
        else if (t.isJSXExpressionContainer(attribute.value)) attribute.value.expression = t.binaryExpression('+', attribute.value.expression, t.stringLiteral(` ${extra}`))
      },
      JSXElement(nodePath, state) {
        if (!/[\\/]generated[\\/](?:classic|mobile)[\\/].+\.jsx$/.test(state.filename || '')) return
        const element = nodePath.node, name = element.openingElement.name.name
        // The HTML runtime hardcodes '#text' for br children, but the WeChat
        // template uses numeric aliases. Use a real Text node for breaks.
        if(name==='br'||name==='wbr'){
          if(!state.nativeBreakText)state.nativeBreakText=nodePath.scope.getProgramParent().generateUidIdentifier('NativeBreakText')
          element.openingElement.name=t.jsxIdentifier(state.nativeBreakText.name)
          element.openingElement.selfClosing=false
          element.closingElement=t.jsxClosingElement(t.jsxIdentifier(state.nativeBreakText.name))
          element.children=[t.jsxExpressionContainer(t.stringLiteral(name==='br'?'\n':'\u200b'))]
          const attr=element.openingElement.attributes.find(item=>item.name?.name==='className')
          const extra=`shared-element shared-tag-${name}`
          if(!attr)element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral(extra)))
          else if(t.isStringLiteral(attr.value))attr.value.value+=' '+extra
          else if(t.isJSXExpressionContainer(attr.value))attr.value.expression=t.binaryExpression('+',attr.value.expression,t.stringLiteral(' '+extra))
          return
        }
        // Table/form grouping tags have no WeChat HTML templates. Keep their
        // text and selector classes in supported containers; column metadata
        // stays hidden because native table cells own the visible layout.
        const replacement = {table:'div',caption:'div',thead:'div',tbody:'div',tfoot:'div',colgroup:'div',col:'div',tr:'div',td:'span',th:'span',legend:'div'}[name]
        if (replacement) {
          const extra = ` shared-tag-${name}`
          const attr=element.openingElement.attributes.find(item=>item.name?.name==='className')
          if (!attr) element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'),t.stringLiteral(extra.trim())))
          else if (t.isStringLiteral(attr.value)) attr.value.value += extra
          else if (t.isJSXExpressionContainer(attr.value)) attr.value.expression=t.binaryExpression('+',attr.value.expression,t.stringLiteral(extra))
          element.openingElement.name.name=replacement; if (element.closingElement) element.closingElement.name.name=replacement
        }
      }
    }
  }
}
