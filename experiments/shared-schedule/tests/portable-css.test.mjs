import test from 'node:test'
import assert from 'node:assert/strict'
import { portableScheduleCss } from '../scripts/portable-css.mjs'
import postcss from 'postcss'
import pxtransform from 'postcss-pxtransform'
import {nativePublicFoundationCss} from '../scripts/prepare-public-foundation.mjs'

test('canonical responsive CSS keeps fixed pixels through the real native unit compiler',async()=>{
  const source='.header{height:56px}.name{font-size:clamp(30px,8.4vw,48px)}.dock{padding-bottom:env(safe-area-inset-bottom)}'
  const options={platform:'weapp',designWidth:375,deviceRatio:{375:2}}
  const canonical=(await postcss([pxtransform(options)]).process(portableScheduleCss(source,{preserveCssPixels:true}),{from:undefined})).css
  assert.match(canonical,/height:56px/)
  assert.match(canonical,/clamp\(30px,8\.4vw,48px\)/)
  assert.match(canonical,/env\(safe-area-inset-bottom\)/)
  assert.doesNotMatch(canonical,/rpx/)
  // Older trial pages continue using their original design-width conversion.
  const legacy=(await postcss([pxtransform(options)]).process(portableScheduleCss('.header{height:56px}'),{from:undefined})).css
  assert.match(legacy,/height:112rpx/)
})

test('native typography follows later Stats body changes without inheriting its browser page styling',async()=>{
  const foundation=nativePublicFoundationCss('body{font-family:var(--font-sans);font-size:calc(17px + 1vw);line-height:1.65;font-variant-numeric:tabular-nums;background:private-page;overflow-y:scroll}.private{font-size:99px}')
  const compiled=(await postcss([pxtransform({platform:'weapp',designWidth:375,deviceRatio:{375:2}})]).process(foundation,{from:undefined})).css
  assert.match(compiled,/\.shared-root\.native-stats-frame/)
  assert.match(compiled,/font-size:calc\(17px \+ 1vw\)/)
  assert.match(compiled,/line-height:1\.65/)
  assert.match(compiled,/font-variant-numeric:tabular-nums/)
  assert.doesNotMatch(compiled,/private-page|overflow-y|99px|rpx/)
})
test('mobile CSS preserves nth-child arithmetic instead of producing invalid WeChat selectors', () => {
  const css = portableScheduleCss('.table td:nth-last-child(-n+2), .table th:nth-child(2) { text-align: center; }')
  assert.match(css, /:nth-last-child\(-n\+2\)/)
  assert.match(css, /:nth-child\(2\)/)
  assert.match(css, /shared-tag-td/)
  assert.doesNotMatch(css, /shared-tag-(?:2|-n)/)
})
test('canonical intermediate mobile breakpoints collapse into the phone layout in order', () => {
  const css = portableScheduleCss('.page{display:grid;}@media(max-width:1100px){.page{gap:24px;}}@media(max-width:900px){.page{grid-template-columns:1fr;}}@media(max-width:600px){.page{gap:16px;}}@media(min-width:1500px){.page{gap:50px;}}')
  assert.match(css, /grid-template-columns:1fr/)
  assert.ok(css.indexOf('gap:24px') < css.indexOf('gap:16px'))
  assert.doesNotMatch(css, /gap:50px|@media/)
})
test('animation steps remain valid offsets when Classic CSS is compiled for WeChat', () => {
  const css=portableScheduleCss('@keyframes pulse{0%,70%{opacity:0;}to{opacity:1;}}.page span{color:white;}')
  assert.match(css,/0%,70%\{opacity:0;/)
  assert.match(css,/to\{opacity:1;/)
  assert.doesNotMatch(css,/shared-tag-(?:0|70|to)/)
  assert.match(css,/shared-tag-span/)
})
test('Classic retains its narrower phone breakpoints without changing the weekly schedule layout', () => {
  const source='.page{padding:24px;}@media(max-width:560px){.page{padding:10px;}}'
  assert.match(portableScheduleCss(source,{phoneWidth:375}),/padding:10px/)
  assert.doesNotMatch(portableScheduleCss(source),/padding:10px/)
})

test('touch builds preserve current/selected declarations combined with hover selectors',()=>{
  const css=portableScheduleCss('.item:hover,.item[aria-current="true"]{color:gold}.button:hover,.buttonActive{background:gold}')
  assert.doesNotMatch(css,/:hover/)
  assert.match(css,/shared-current/);assert.match(css,/buttonActive/)
  assert.match(css,/color:gold/);assert.match(css,/background:gold/)
})
test('native match layouts retain phone container rules and chapter navigation state',()=>{
  const css=portableScheduleCss('@container players (max-width:600px){.duel{grid-template-columns:1fr}}@container players (min-width:1200px){.duel{gap:50px}}.nav a[aria-current="location"]{border-color:gold}',{phoneWidth:375})
  assert.match(css,/grid-template-columns:1fr/);assert.match(css,/shared-current/)
  assert.doesNotMatch(css,/@container|gap:50px/)
})

test('native specificity retains the same elements in grouped selectors',()=>{
  const css=portableScheduleCss('.root .rail, .root .gate,\n.root .dock{display:none}',{nativeSpecificity:true})
  assert.match(css,/\.root\.root \.rail\.rail, \.root\.root \.gate\.gate,\n\.root\.root \.dock\.dock/)
  assert.doesNotMatch(css,/\.root\s+\.root/)
})

test('structural selectors without a tag remain compilable after native specificity conversion',()=>{
  const css=portableScheduleCss('.dialog > :not(.body){flex-shrink:0}.metrics > :nth-child(2){color:gold}.facts > :last-child{border:0}.table td:not(:first-child):not(:nth-child(2)){text-align:right}',{nativeSpecificity:true})
  assert.match(css,/:global\(\.shared-element\):not\(\.body\.body\)/)
  assert.match(css,/:global\(\.shared-element\):nth-child\(2\)/)
  assert.match(css,/:global\(\.shared-element\):last-child/)
  assert.match(css,/:global\(\.shared-tag-td\):not\(:first-child\)/)
  assert.doesNotMatch(css,/>\s*:(?:not|nth-child|last-child)/)
})

test('native CSS expands grouped where selectors and status attributes',()=>{
  const css=portableScheduleCss('.archive :where(h1,p){margin:0}.meta > [role="status"]{color:gold}')
  assert.doesNotMatch(css,/:where|\[role=/)
  assert.match(css,/shared-tag-h1/);assert.match(css,/shared-tag-p/);assert.match(css,/shared-attr-role-status/)
})
