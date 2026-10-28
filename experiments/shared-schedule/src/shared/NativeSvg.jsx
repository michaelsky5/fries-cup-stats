import {Children,useEffect,useId,useRef} from 'react'
import Taro from '@tarojs/taro'
import {Canvas} from '@tarojs/components'
const colors={'--fc-data-ink':'#181a17','--fc-data-paper-raised':'#f7f6ef','--fc-data-paper':'#eeede6','--fc-data-signal':'#f4c320','--fc-data-line':'#cbccc3','--fc-data-text-muted':'#66685f'}
const color=(value,currentColor='#181a17')=>String(value||'').replace(/var\((--[^,)]+)(?:,\s*([^)]*))?\)/g,(_,key,fallback)=>colors[key]||fallback||currentColor).replace(/currentColor/g,currentColor)
const number=value=>Number(value)||0
function arc(ctx,x0,y0,rx,ry,rotation,large,sweep,x1,y1){
  rx=Math.abs(rx);ry=Math.abs(ry)
  if(!rx||!ry){ctx.lineTo(x1,y1);return}
  if(x0===x1&&y0===y1)return
  const phi=rotation*Math.PI/180,cos=Math.cos(phi),sin=Math.sin(phi),dx=(x0-x1)/2,dy=(y0-y1)/2,u=cos*dx+sin*dy,v=-sin*dx+cos*dy
  const scale=Math.sqrt(u*u/(rx*rx)+v*v/(ry*ry));if(scale>1){rx*=scale;ry*=scale}
  const factor=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*v*v-ry*ry*u*u)/(rx*rx*v*v+ry*ry*u*u)))
  const uc=factor*rx*v/ry,vc=-factor*ry*u/rx,cx=cos*uc-sin*vc+(x0+x1)/2,cy=sin*uc+cos*vc+(y0+y1)/2
  const angle=(ax,ay,bx,by)=>Math.atan2(ax*by-ay*bx,ax*bx+ay*by)
  const start=angle(1,0,(u-uc)/rx,(v-vc)/ry)
  let delta=angle((u-uc)/rx,(v-vc)/ry,(-u-uc)/rx,(-v-vc)/ry)
  if(!sweep&&delta>0)delta-=Math.PI*2;if(sweep&&delta<0)delta+=Math.PI*2
  const segments=Math.ceil(Math.abs(delta)/(Math.PI/2)),step=delta/segments
  const point=a=>[cx+rx*cos*Math.cos(a)-ry*sin*Math.sin(a),cy+rx*sin*Math.cos(a)+ry*cos*Math.sin(a)]
  const tangent=a=>[-rx*cos*Math.sin(a)-ry*sin*Math.cos(a),-rx*sin*Math.sin(a)+ry*cos*Math.cos(a)]
  for(let index=0;index<segments;index++){const a=start+index*step,b=a+step,k=4/3*Math.tan(step/4),p=point(a),q=point(b),t=tangent(a),s=tangent(b);ctx.bezierCurveTo(p[0]+k*t[0],p[1]+k*t[1],q[0]-k*s[0],q[1]-k*s[1],...q)}
}
function selectorMatches(selector,chain){
  // Canvas has no CSS engine. Match the same authored class, tag and public
  // data-attribute selectors against this SVG tree, including its root.
  const match=(part,node)=>{
    const classes=String(node.props?.className||'').split(/\s+/)
    if([...part.matchAll(/\.([\w-]+)/g)].some(item=>!classes.includes(item[1])))return false
    if([...part.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)].some(item=>item[2]===undefined?node.props?.[item[1]]==null:String(node.props?.[item[1]])!==item[2]))return false
    const tag=/^[a-z]+/.exec(part)?.[0];return !tag||tag===node.type
  }
  return String(selector).split(/,(?![^\[]*\])/).some(option=>{
    const parts=option.trim().replace(/:global\(([^)]*)\)/g,'$1').split(/\s+/),end=parts.pop()
    if(!match(end,chain.at(-1)))return false
    let index=chain.length-2
    while(parts.length){const part=parts.pop();if(part==='>'){const parent=parts.pop();if(index<0||!match(parent,chain[index--]))return false;continue}while(index>=0&&!match(part,chain[index]))index--;if(index--<0)return false}
    return true
  })
}
function path(ctx,d){
  const tokens=String(d||'').match(/[a-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]
  let i=0,command='',x=0,y=0,sx=0,sy=0,cx=0,cy=0
  const n=()=>Number(tokens[i++]),point=relative=>{const px=n(),py=n();return relative?[px+x,py+y]:[px,py]}
  while(i<tokens.length){
    if(/[a-z]/i.test(tokens[i]))command=tokens[i++]
    const relative=command===command.toLowerCase(),kind=command.toUpperCase(),start=i
    if(kind==='Z'){ctx.closePath();x=sx;y=sy;command='';continue}
    if(!command)break
    if(kind==='M'||kind==='L'||kind==='T'){const [px,py]=point(relative);if(kind==='M'){ctx.moveTo(px,py);sx=px;sy=py;command=relative?'l':'L'}else if(kind==='T'){const qx=2*x-cx,qy=2*y-cy;ctx.quadraticCurveTo(qx,qy,px,py);cx=qx;cy=qy}else ctx.lineTo(px,py);x=px;y=py}
    else if(kind==='H'){x=n()+(relative?x:0);ctx.lineTo(x,y)}
    else if(kind==='V'){y=n()+(relative?y:0);ctx.lineTo(x,y)}
    else if(kind==='C'){const a=point(relative),b=point(relative),c=point(relative);ctx.bezierCurveTo(...a,...b,...c);cx=b[0];cy=b[1];x=c[0];y=c[1]}
    else if(kind==='S'){const a=[2*x-cx,2*y-cy],b=point(relative),c=point(relative);ctx.bezierCurveTo(...a,...b,...c);cx=b[0];cy=b[1];x=c[0];y=c[1]}
    else if(kind==='Q'){const a=point(relative),b=point(relative);ctx.quadraticCurveTo(...a,...b);cx=a[0];cy=a[1];x=b[0];y=b[1]}
    else if(kind==='A'){const rx=n(),ry=n(),rotation=n(),large=n(),sweep=n(),p=point(relative);arc(ctx,x,y,rx,ry,rotation,large,sweep,...p);x=p[0];y=p[1]}
    else {throw new Error('Unsupported native vector command: '+kind)}
    if(i===start)break
  }
}
export function drawNativeVector(ctx,children,{paint=[],stroke='#181a17',fill='none',strokeWidth=1.5,className='',currentColor='#181a17'}={},hits=[]){
  const draw=(node,parent,ancestors)=>{
    if(!node)return
    if(Array.isArray(node)){node.forEach(child=>draw(child,parent,ancestors));return}
    if(typeof node!=='object')return
    if(typeof node.type==='function'){draw(node.type(node.props),parent,ancestors);return}
    if(typeof node.type==='symbol'){Children.forEach(node.props.children,child=>draw(child,parent,ancestors));return}
    const p=node.props||{},s={...parent},chain=[...ancestors,node]
    for(const key of ['stroke','fill','strokeWidth','strokeDasharray','fontSize','textAnchor'])if(p[key]!=null)s[key]=p[key]
    for(const rule of paint)if(selectorMatches(rule.selector,chain))Object.assign(s,rule.paint)
    Object.assign(s,p.style)
    const tag=node.type
    if(tag==='g'){Children.forEach(p.children,child=>draw(child,{...s,onClick:p.onClick||parent.onClick},chain));return}
    if(['title','defs'].includes(tag))return
    ctx.save();ctx.beginPath();ctx.lineWidth=Number.parseFloat(s.strokeWidth)||1.5;ctx.strokeStyle=color(s.stroke||stroke,currentColor);ctx.fillStyle=color(s.fill||fill,currentColor)
    ctx.globalAlpha=s.opacity==null?1:Number(s.opacity);ctx.lineCap=s.strokeLinecap||'butt';ctx.lineJoin=s.strokeLinejoin||'miter'
    const transform=/translate\(\s*([-\d.]+)(?:[ ,]+([-\d.]+))?\s*\)/.exec(p.transform||'');if(transform)ctx.translate(Number(transform[1]),Number(transform[2])||0)
    if(s.strokeDasharray)ctx.setLineDash?.(String(s.strokeDasharray).split(/[ ,]+/).map(Number))
    if(tag==='path')path(ctx,p.d)
    if(tag==='circle')ctx.arc(number(p.cx),number(p.cy),number(p.r),0,Math.PI*2)
    if(tag==='line'){ctx.moveTo(number(p.x1),number(p.y1));ctx.lineTo(number(p.x2),number(p.y2))}
    if(tag==='rect')ctx.rect(number(p.x),number(p.y),number(p.width),number(p.height))
    if(tag==='polyline'||tag==='polygon'){const points=String(p.points||'').trim().split(/[ ,]+/).map(Number);for(let i=0;i<points.length;i+=2)i?ctx.lineTo(points[i],points[i+1]):ctx.moveTo(points[i],points[i+1]);if(tag==='polygon')ctx.closePath()}
    if(tag==='text'){ctx.font=`${Number.parseFloat(s.fontSize)||12}px sans-serif`;ctx.textAlign=s.textAnchor==='middle'?'center':s.textAnchor==='end'?'right':'left';ctx.fillStyle=color(s.fill==='none'?'#66685f':s.fill,currentColor);ctx.fillText(Children.toArray(p.children).join(''),number(p.x),number(p.y))}
    else {if(s.fill&&s.fill!=='none'&&s.fill!=='transparent')ctx.fill();if(s.stroke&&s.stroke!=='none')ctx.stroke()}
    if(tag==='circle'&&(p.onClick||parent.onClick))hits.push({x:number(p.cx),y:number(p.cy),r:Math.max(12,number(p.r)),click:p.onClick||parent.onClick})
    ctx.restore()
  }
  const root={type:'svg',props:{className}},base={stroke,fill,strokeWidth}
  for(const rule of paint)if(selectorMatches(rule.selector,[root]))Object.assign(base,rule.paint)
  Children.forEach(children,node=>draw(node,base,[root]))
}
export default function NativeSvg({viewBox='0 0 24 24',children,paint=[],width,height,className='',style,stroke,fill,strokeWidth,...props}){
  const id='vector-'+useId().replace(/[^\w-]/g,''),hitMap=useRef({hits:[],width:1,height:1}),model=useRef(null)
  model.current={viewBox,children,paint,stroke,fill,strokeWidth,className}
  useEffect(()=>{
    let alive=true
    Taro.nextTick(()=>Taro.createSelectorQuery().select('#'+id).fields({node:true,size:true,computedStyle:['color']},res=>{
      if(!alive||!res?.node||!res.width||!res.height)return
      const canvas=res.node,ctx=canvas.getContext('2d'),ratio=Taro.getWindowInfo?.().pixelRatio||2
      canvas.width=res.width*ratio;canvas.height=res.height*ratio
      const [left,top,w,h]=model.current.viewBox.split(/[ ,]+/).map(Number)
      ctx.scale(ratio*res.width/w,ratio*res.height/h);ctx.translate(-left,-top)
      const hits=[];drawNativeVector(ctx,model.current.children,{...model.current,currentColor:res.color},hits);hitMap.current={hits,width:res.width,height:res.height,w,h,left,top}
    }).exec())
    return()=>{alive=false}
  },[children,viewBox])
  const click=event=>{const map=hitMap.current,x=(event.detail.x??event.changedTouches?.[0]?.x)/map.width*map.w+map.left,y=(event.detail.y??event.changedTouches?.[0]?.y)/map.height*map.h+map.top;map.hits.find(hit=>Math.hypot(hit.x-x,hit.y-y)<=hit.r)?.click?.()}
  const dimension=value=>typeof value==='number'||/^\d+(?:\.\d+)?$/.test(value)?value+'px':value
  return <Canvas {...props} id={id} type='2d' className={`${className} shared-element shared-tag-svg native-vector`} style={{...(width?{width:dimension(width)}:{}),...(height?{height:dimension(height)}:{}),...style}} onClick={click}/>
}
