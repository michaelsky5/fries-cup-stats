import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import React from 'react'
const require=createRequire(import.meta.url)
const {transformSync}=require('@babel/core')
const filename=new URL('../src/shared/NativeSvg.jsx',import.meta.url)
const {code}=transformSync(fs.readFileSync(filename,'utf8'),{filename:filename.pathname,babelrc:false,configFile:false,presets:[[require('@babel/preset-react'),{runtime:'automatic'}]],plugins:[require('@babel/plugin-transform-modules-commonjs')]})
const module={exports:{}}
new Function('require','module','exports',code)(name=>name==='@tarojs/taro'?{default:{}}:name==='@tarojs/components'?{Canvas:()=>null}:require(name),module,module.exports)
const {drawNativeVector}=module.exports
function context(){const calls=[],values={};return {calls,ctx:new Proxy(values,{get:(obj,key)=>key in obj?obj[key]:(...args)=>calls.push({method:key,args,stroke:obj.strokeStyle,fill:obj.fillStyle}),set:(obj,key,value)=>{obj[key]=value;return true}})}}

test('the current Stats share-link icon keeps its elliptical arcs and translation on native Canvas',()=>{
  const source=fs.readFileSync(new URL('../../../src/pages/review/ReviewStoryPage.jsx',import.meta.url),'utf8')
  const d=source.match(/d="([^"]*[aA]4 4[^\"]*)"/)?.[1]
  assert.ok(d,'The source share-link icon must still be present')
  const {ctx,calls}=context()
  drawNativeVector(ctx,React.createElement('path',{d,transform:'translate(1 0)'}))
  assert.ok(calls.some(call=>call.method==='bezierCurveTo'))
  assert.ok(calls.some(call=>call.method==='translate'&&call.args[0]===1))
  assert.ok(calls.filter(call=>call.method==='bezierCurveTo').every(call=>call.args.every(Number.isFinite)))
})
test('native SVG painting retains inherited group colors and selected-route attribute styles',()=>{
  const {ctx,calls}=context(),hits=[]
  const selected=()=>{}
  drawNativeVector(ctx,React.createElement('g',{className:'route shared-data-selected'},React.createElement('path',{d:'M0 0 L10 10','data-result':'win'}),React.createElement('circle',{cx:10,cy:10,r:3,onClick:selected})),{className:'network',paint:[{selector:'.network .route',paint:{stroke:'#f4c320',fill:'none'}},{selector:'.network .route path[data-result="win"]',paint:{stroke:'#508258'}}]},hits)
  assert.ok(calls.some(call=>call.method==='stroke'&&call.stroke==='#508258'))
  assert.ok(calls.some(call=>call.method==='stroke'&&call.stroke==='#f4c320'))
  assert.equal(hits[0].click,selected)
})
