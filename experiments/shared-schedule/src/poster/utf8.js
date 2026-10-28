// Local provider for the canonical QR library, including older Android JSCore.
// Browser globals are left alone; encoded URLs produce the same QR matrix.
export class TextEncoder {
  get encoding(){return 'utf-8'}
  encode(value=''){
    const text=String(value),bytes=[]
    for(let i=0;i<text.length;i++){
      let n=text.charCodeAt(i)
      if(n>=0xd800&&n<=0xdbff){const low=text.charCodeAt(i+1);if(low>=0xdc00&&low<=0xdfff){n=0x10000+((n-0xd800)<<10)+(low-0xdc00);i++}else n=0xfffd}
      else if(n>=0xdc00&&n<=0xdfff)n=0xfffd
      if(n<0x80)bytes.push(n)
      else if(n<0x800)bytes.push(0xc0|(n>>6),0x80|(n&63))
      else if(n<0x10000)bytes.push(0xe0|(n>>12),0x80|((n>>6)&63),0x80|(n&63))
      else bytes.push(0xf0|(n>>18),0x80|((n>>12)&63),0x80|((n>>6)&63),0x80|(n&63))
    }
    return new Uint8Array(bytes)
  }
}
