import Taro from '@tarojs/taro'
import assets from '../generated/poster/assetPaths.json'
import {applyColorFilters} from './canvasCompatibility.js'
const wrapped = new WeakMap(), rawCanvases = new WeakMap()
let active=null
const raw=value=>rawCanvases.get(value)||value
const current=()=>{if(!active||active.cancelled||!active.isCurrent())throw new Error('图片生成已取消。');return active}

function wrapCanvas(canvas) {
  if(wrapped.has(canvas))return wrapped.get(canvas)
  const contexts=new Map()
  const proxy=new Proxy(canvas,{
    get(target,name){
      if(name==='getContext')return (type,options)=>{
        if(contexts.has(type))return contexts.get(type)
        const context=target.getContext(type,options)
        if(!context)return null
        let filter='none'
        const stack=[], supportsFilter=typeof context.filter==='string'
        const result=new Proxy(context,{
          get(ctx,key){
            if(key==='canvas')return proxy
            if(key==='filter'&&!supportsFilter)return filter
            if(key==='save')return ()=>{stack.push(filter);ctx.save()}
            if(key==='restore')return ()=>{filter=stack.pop()||'none';ctx.restore()}
            if(key==='drawImage')return (image,...args)=>{
              current()
              const bitmap=!supportsFilter&&filter!=='none'?filteredImage(raw(image),filter):raw(image)
              return ctx.drawImage(bitmap,...args)
            }
            const value=Reflect.get(ctx,key,ctx)
            return typeof value==='function'?value.bind(ctx):value
          },
          set(ctx,key,value){if(key==='filter'&&!supportsFilter){filter=String(value);return true}return Reflect.set(ctx,key,value,ctx)}
        })
        contexts.set(type,result)
        return result
      }
      const value=Reflect.get(target,name,target)
      return typeof value==='function'?value.bind(target):value
    },
    set(target,name,value){return Reflect.set(target,name,value,target)}
  })
  wrapped.set(canvas,proxy);rawCanvases.set(proxy,canvas)
  return proxy
}
function filteredImage(image,filter){
  const session=current()
  let map=session.filtered.get(image)
  if(!map){map=new Map();session.filtered.set(image,map)}
  if(map.has(filter))return map.get(filter)
  const canvas=wx.createOffscreenCanvas({type:'2d',width:Math.max(1,image.width),height:Math.max(1,image.height)})
  session.children.push(canvas)
  const context=canvas.getContext('2d')
  context.drawImage(image,0,0)
  const pixels=context.getImageData(0,0,canvas.width,canvas.height)
  applyColorFilters(pixels.data,filter)
  context.putImageData(pixels,0,0)
  map.set(filter,canvas)
  return canvas
}
export function nativeCreateCanvas(){
  const session=current()
  if(!session.mainUsed){session.mainUsed=true;return wrapCanvas(session.canvas)}
  const child=wx.createOffscreenCanvas({type:'2d',width:1,height:1})
  session.children.push(child)
  return wrapCanvas(child)
}
function sourcePath(source){return assets[source]||(String(source).startsWith('/')?'https://stats.fries-cup.com'+source:String(source))}
export function nativeLoadImage(source){
  if(!source)return Promise.resolve(null)
  const session=current(), src=sourcePath(source)
  if(session.images.has(src))return session.images.get(src)
  const promise=new Promise(resolve=>{
    const image=session.canvas.createImage()
    let settled=false
    const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);session.pending.delete(cancel);if(!result)session.failed.add(source);resolve(result)}
    const cancel=()=>finish(null)
    const timer=setTimeout(cancel,8000)
    session.pending.add(cancel)
    image.onload=()=>finish(session.isCurrent()&&!session.cancelled?image:null)
    image.onerror=cancel
    image.src=src
  })
  session.images.set(src,promise)
  return promise
}
export function nativeCanvasToPng(canvas){
  const session=current(), node=raw(canvas)
  // Required artwork must be present; a missing hero should not produce a
  // seemingly successful, empty director's cut.
  if(session.required.some(source=>session.failed.has(source)))throw new Error('必要的图片未能加载，请检查连接后重试。')
  return new Promise((resolve,reject)=>Taro.canvasToTempFilePath({canvas:node,width:node.width,height:node.height,destWidth:node.width,destHeight:node.height,fileType:'png',success:result=>resolve(result.tempFilePath),fail:()=>reject(new Error('图片暂时无法生成，请重试。'))}))
}
export async function renderWithNativeCanvas(canvas,work,{isCurrent=()=>true,required=[]}={}){
  if(active)throw new Error('上一张图片仍在生成，请稍后重试。')
  const session={canvas,isCurrent,required,mainUsed:false,cancelled:false,children:[],images:new Map(),failed:new Set(),filtered:new WeakMap(),pending:new Set()}
  active=session
  let timer
  const stop=()=>{session.cancelled=true;for(const cancel of session.pending)cancel()}
  try{
    const result=await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{stop();reject(new Error('生成图片超时，请重试。'))},25000)})])
    current()
    return {path:result,width:canvas.width,height:canvas.height,missing:[...session.failed]}
  }finally{
    clearTimeout(timer);stop();for(const child of session.children){child.width=1;child.height=1}if(active===session)active=null
  }
}
