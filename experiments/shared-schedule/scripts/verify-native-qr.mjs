// Compare every module in the actual native PNG with the canonical public URL
// matrix, including the four-module quiet zone. This is not a phone scan test.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import QRCode from '../../../node_modules/qrcode/lib/core/qrcode.js'

const [filename,url,output]=process.argv.slice(2)
assert.match(url,/^https:\/\/stats\.fries-cup\.com\/review\/story\/(player|person)\//)
const {data,info}=await sharp(filename).removeAlpha().raw().toBuffer({resolveWithObject:true})
assert.deepEqual([info.width,info.height],[2400,960])
const scale=Math.min((info.width-96)/2080,(info.height-96)/800)
const left=Math.round((info.width-2080*scale)/2+1676*scale)
const top=Math.round((info.height-800*scale)/2+526*scale)
const pixels=Math.round(166*scale),modules=QRCode.create(url,{errorCorrectionLevel:'M'}).modules
const extent=modules.size+8,edge=position=>Math.round(position*pixels/extent)
const mismatches=[]
for(let row=0;row<extent;row++)for(let column=0;column<extent;column++){
  const x=left+Math.floor((edge(column)+edge(column+1))/2),y=top+Math.floor((edge(row)+edge(row+1))/2)
  const offset=(y*info.width+x)*info.channels
  const dark=(data[offset]+data[offset+1]+data[offset+2])/3<128
  const expected=row>=4&&column>=4&&row<modules.size+4&&column<modules.size+4?Boolean(modules.get(row-4,column-4)):false
  if(dark!==expected)mismatches.push({row,column,x,y,dark,expected})
}
const report={filename:path.resolve(filename),url,width:info.width,height:info.height,slot:{left,top,pixels},matrix:modules.size,checked:extent*extent,mismatches}
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2))
console.log(JSON.stringify({...report,mismatches:mismatches.slice(0,5)}))
assert.equal(mismatches.length,0,'Native PNG QR differs from its canonical URL matrix')
