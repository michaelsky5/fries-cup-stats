import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

function expandIs(selector) {
  let pseudo
  selector.walkPseudos(node => { if (!pseudo && [':is',':where'].includes(node.value)) pseudo = node })
  if (!pseudo) return [selector]
  return pseudo.nodes.flatMap(option => {
    const copy = selector.clone()
    let target
    copy.walkPseudos(node => { if (!target && [':is',':where'].includes(node.value)) target = node })
    target.replaceWith(...option.nodes.map(node => node.clone()))
    return expandIs(copy)
  })
}
function globalClass(name) {
  return selectorParser.pseudo({ value: ':global', nodes: [selectorParser.selector({ nodes: [selectorParser.className({ value: name })] })] })
}
function replaceGlobalClass(node,name){let parent=node.parent,inside=false;while(parent){if(parent.type==='pseudo'&&parent.value===':global')inside=true;parent=parent.parent}node.replaceWith(inside?selectorParser.className({value:name}):globalClass(name))}
// Generate the canonical <=600px layout. Selector classes survive both Taro's
// HTML remapping and CSS Modules, without keeping a second designed stylesheet.
export function portableScheduleCss(source, {phoneWidth = 600, nativeSpecificity = false, preserveCssPixels = false} = {}) {
  const css = postcss.parse(source)
  css.walkAtRules('media', rule => {
    const maximum = /max-width:\s*(\d+)px/.exec(rule.params)
    if (maximum && Number(maximum[1]) >= phoneWidth && !/min-width|prefers-/.test(rule.params)) rule.replaceWith(...rule.nodes)
    else rule.remove()
  })
  // WXSS has no CSS container queries. These page contents use the same phone
  // width as the authored mobile viewport; preserve the matching compact rules.
  css.walkAtRules('container', rule => {
    const maximum = /max-width:\s*(\d+)px/.exec(rule.params)
    if(maximum && Number(maximum[1]) >= phoneWidth && !/min-width/.test(rule.params))rule.replaceWith(...rule.nodes)
    else rule.remove()
  })
  css.walkRules(rule => {
    // Keyframe offsets are animation steps, not HTML selectors.
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
    const parsed = selectorParser().astSync(rule.selector)
    // A hover selector must not discard an authored active/selected selector
    // when the website combines them in the same declaration block.
    parsed.nodes=parsed.nodes.filter(selector=>! /:(?:hover|focus-visible|focus-within|disabled|has|only-child)\b/.test(selector.toString()))
    if(!parsed.nodes.length){rule.remove();return}
    parsed.nodes = parsed.nodes.flatMap(expandIs)
    // WXSS requires a concrete selector before a structural pseudo-class;
    // Web CSS also allows an omitted universal, e.g. `.facts > :last-child`.
    // A native tag is represented by a class. Raise authored class weights
    // before remapping tags so a generic `page a` reset cannot override the
    // original two-class component rule such as `cover champion`.
    if(nativeSpecificity){
      const authored=[]
      parsed.walkClasses(node=>authored.push(node))
      for(const node of authored){
        const duplicate=node.clone()
        // Leading whitespace belongs to the selector, not the duplicate. If
        // copied after a comma, it would turn `.root.root` into `.root .root`.
        duplicate.spaces.before=''
        duplicate.spaces.after=''
        node.parent.insertAfter(node,duplicate)
      }
    }
    parsed.walkPseudos(node=>{if(!/^:(?:not|nth-|first-|last-|only-)/.test(node.value)||node.parent?.parent?.type==='pseudo')return;const previous=node.prev();if(!previous||previous.type==='combinator'){const element=globalClass('shared-element');element.spaces.before=node.spaces.before;node.spaces.before='';node.parent.insertBefore(node,element)}})
    parsed.walkTags(tag => {
      // selector-parser represents nth-child arithmetic as tag nodes too.
      // They are arguments, not HTML elements, and must remain unchanged.
      let parent = tag.parent
      while (parent) {
        if (parent.type === 'pseudo' && /^:nth-/.test(parent.value)) return
        parent = parent.parent
      }
      replaceGlobalClass(tag,`shared-tag-${tag.value}`)
    })
    parsed.walkUniversals(node => replaceGlobalClass(node,'shared-element'))
    parsed.walkAttributes(node => {
      let name=`shared-attr-${node.attribute}${node.value?'-'+String(node.value).replace(/[^\w-]/g,'-'):''}`
      if (node.attribute === 'aria-pressed' && node.value === 'true') name='shared-selected'
      if (node.attribute === 'aria-current' && ['page','true','location','step'].includes(node.value)) name='shared-current'
      if (node.attribute === 'data-active' && node.value === 'true') name='shared-selected'
      if (node.attribute === 'data-selected' && node.value === 'true') name='shared-selected'
      if (node.attribute === 'data-focused') name='shared-focused'
      if (node.attribute === 'aria-expanded' && node.value === 'true') name='shared-expanded'
      if (node.attribute === 'data-state') name=`shared-state-${node.value}`
      if (node.attribute === 'data-map-state') name=`shared-map-${node.value}`
      replaceGlobalClass(node,name)
    })
    rule.selector = parsed.toString()
  })
  // Canonical Web layouts already use responsive CSS. Scaling their fixed px
  // again as rpx changes the authored header, controls and type on every phone.
  return `${preserveCssPixels ? '/* postcss-pxtransform disable */\n' : ''}/* Generated from Stats mobile CSS; do not edit. */\n${css.toString()}\n`
}
