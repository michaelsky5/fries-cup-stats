// WeChat's 2D canvas has no browser Path2D constructor. Replay the same authored
// paths as drawing commands; do not replace the hero's signature with a preset.
export function traceSvgPath(ctx, source) {
  const tokens = String(source).match(/[A-DF-Za-df-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) || []
  let i=0, command='', x=0, y=0, startX=0, startY=0, cubic=null, quadratic=null, previous=''
  const arity = {M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,Z:0}
  ctx.beginPath()
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command=tokens[i++]
    const op=command.toUpperCase(), relative=command!==op
    if (!(op in arity)) throw new Error('Unsupported authored canvas path command: '+command)
    if (op==='Z') {ctx.closePath();x=startX;y=startY;cubic=quadratic=null;previous=op;command='';continue}
    const n=arity[op]
    if (i+n>tokens.length || tokens.slice(i,i+n).some(value=>!Number.isFinite(Number(value)))) throw new Error('Incomplete authored canvas path')
    const a=tokens.slice(i,i+n).map(Number);i+=n
    const px=value=>value+(relative?x:0), py=value=>value+(relative?y:0)
    if (op==='M'||op==='L') {const nx=px(a[0]),ny=py(a[1]);ctx[op==='M'?'moveTo':'lineTo'](nx,ny);x=nx;y=ny;if(op==='M'){startX=x;startY=y;command=relative?'l':'L'}}
    else if(op==='H'){x=px(a[0]);ctx.lineTo(x,y)}
    else if(op==='V'){y=py(a[0]);ctx.lineTo(x,y)}
    else if(op==='C'){const v=[px(a[0]),py(a[1]),px(a[2]),py(a[3]),px(a[4]),py(a[5])];ctx.bezierCurveTo(...v);cubic=[v[2],v[3]];x=v[4];y=v[5]}
    else if(op==='S'){const c=(previous==='C'||previous==='S')&&cubic?[2*x-cubic[0],2*y-cubic[1]]:[x,y];const v=[...c,px(a[0]),py(a[1]),px(a[2]),py(a[3])];ctx.bezierCurveTo(...v);cubic=[v[2],v[3]];x=v[4];y=v[5]}
    else if(op==='Q'){const v=[px(a[0]),py(a[1]),px(a[2]),py(a[3])];ctx.quadraticCurveTo(...v);quadratic=[v[0],v[1]];x=v[2];y=v[3]}
    else if(op==='T'){const c=(previous==='Q'||previous==='T')&&quadratic?[2*x-quadratic[0],2*y-quadratic[1]]:[x,y];const nx=px(a[0]),ny=py(a[1]);ctx.quadraticCurveTo(...c,nx,ny);quadratic=c;x=nx;y=ny}
    if(!['C','S'].includes(op))cubic=null
    if(!['Q','T'].includes(op))quadratic=null
    previous=op
  }
}
export function strokeNativePath(ctx, source){traceSvgPath(ctx,source);ctx.stroke()}

// Preserve the original renderer's CSS colour filters on devices whose canvas
// omits ctx.filter. Operate on pixels of an offscreen copy, retaining alpha.
export function applyColorFilters(pixels, source) {
  const filters=[...String(source).matchAll(/(grayscale|saturate|contrast|brightness|sepia)\(([-+\d.]+)(%)?\)/g)].map(([,name,n,percent])=>[name,Number(n)/(percent?100:1)])
  for(let i=0;i<pixels.length;i+=4){
    let r=pixels[i],g=pixels[i+1],b=pixels[i+2]
    for(const [name,value] of filters){
      if(name==='brightness'){r*=value;g*=value;b*=value}
      else if(name==='contrast'){r=(r-127.5)*value+127.5;g=(g-127.5)*value+127.5;b=(b-127.5)*value+127.5}
      else if(name==='saturate'){const s=value,nr=(.213+.787*s)*r+(.715-.715*s)*g+(.072-.072*s)*b,ng=(.213-.213*s)*r+(.715+.285*s)*g+(.072-.072*s)*b,nb=(.213-.213*s)*r+(.715-.715*s)*g+(.072+.928*s)*b;r=nr;g=ng;b=nb}
      else if(name==='grayscale'){const v=Math.min(1,Math.max(0,value)),l=.2126*r+.7152*g+.0722*b;r=r*(1-v)+l*v;g=g*(1-v)+l*v;b=b*(1-v)+l*v}
      else if(name==='sepia'){const v=Math.min(1,Math.max(0,value)),sr=.393*r+.769*g+.189*b,sg=.349*r+.686*g+.168*b,sb=.272*r+.534*g+.131*b;r=r*(1-v)+sr*v;g=g*(1-v)+sg*v;b=b*(1-v)+sb*v}
      r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b))
    }
    pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b
  }
  return pixels
}
