import {test} from 'node:test'
import assert from 'node:assert/strict'
import {traceSvgPath,applyColorFilters} from '../src/poster/canvasCompatibility.js'
import {DIRECTOR_CUT_AMBIENT_FIELDS} from '../../../src/lib/directorCutAmbientFields.js'
import {TextEncoder as NativeTextEncoder} from '../src/poster/utf8.js'
import QRCode from '../../../node_modules/qrcode/lib/core/qrcode.js'
function recording(){const commands=[];return {commands,context:new Proxy({},{get:(_,name)=>(...args)=>{assert.ok(args.every(Number.isFinite));commands.push([name,...args])}})}}
test('all canonical authored ambient fields draw without browser Path2D',()=>{
  let count=0
  for(const field of Object.values(DIRECTOR_CUT_AMBIENT_FIELDS))for(const path of field.paths||[]){const {context,commands}=recording();traceSvgPath(context,path.d);assert.ok(commands.some(([name])=>name==='moveTo'));assert.ok(commands.length>2);count++}
  assert.ok(count>100)
})
test('relative paths and smooth controls retain the original geometry',()=>{
  const {context,commands}=recording()
  traceSvgPath(context,'M10 20 c5 0 10 5 15 10 s10 5 15 0 h5 v-10 z')
  assert.deepEqual(commands,[['beginPath'],['moveTo',10,20],['bezierCurveTo',15,20,20,25,25,30],['bezierCurveTo',30,35,35,35,40,30],['lineTo',45,30],['lineTo',45,20],['closePath']])
  assert.throws(()=>traceSvgPath(context,'M10 20 C1 2'),'Incomplete')
})
test('canvas filter fallback preserves alpha and ordered colour transforms',()=>{
  const pixel=filter=>[...applyColorFilters(new Uint8ClampedArray([200,100,50,128]),filter)]
  assert.deepEqual(pixel('saturate(0)'),[118,118,118,128])
  assert.deepEqual(pixel('brightness(0)'),[0,0,0,128])
  assert.deepEqual(pixel('contrast(0)'),[128,128,128,128])
  assert.deepEqual(pixel('brightness(.5) contrast(2)'),[72,0,0,128])
  assert.deepEqual(pixel('none'),[200,100,50,128])
})
test('native UTF-8 provider retains canonical QR data for names and public URLs',()=>{
  const original=globalThis.TextEncoder
  const values=['','Fries Cup','薯条杯','리뷰 🎟️','\ud800x\udc00','https://stats.fries-cup.com/review/story/person/%E5%A4%8F?season=FCR26&lang=ko']
  try {
    for(const value of values){
      globalThis.TextEncoder=original
      const bytes=new original().encode(value)
      // The canonical QR library rejects malformed UTF-16, while TextEncoder
      // replaces unpaired surrogates. Check each contract independently.
      const validQr=value&&value!=='\ud800x\udc00'
      const expected=validQr?QRCode.create(value,{errorCorrectionLevel:'M'}).modules:null
      globalThis.TextEncoder=NativeTextEncoder
      assert.deepEqual(new NativeTextEncoder().encode(value),bytes)
      if(validQr){const actual=QRCode.create(value,{errorCorrectionLevel:'M'}).modules;assert.equal(actual.size,expected.size);assert.deepEqual(actual.data,expected.data)}
    }
  } finally {globalThis.TextEncoder=original}
})
