import Taro from '@tarojs/taro'
const fallbackSize={windowWidth:375,windowHeight:812}
const size=()=>{try{return Taro.getWindowInfo()||fallbackSize}catch{return fallbackSize}}
export const nativeAnimationFrame=fn=>setTimeout(fn,16)
export const nativeCancelAnimationFrame=id=>clearTimeout(id)
export const nativeLocalStorage={getItem:key=>{try{return Taro.getStorageSync('native-source:'+key)||null}catch{return null}},setItem:(key,value)=>Taro.setStorageSync('native-source:'+key,String(value)),removeItem:key=>Taro.removeStorageSync('native-source:'+key)}
export const nativeWindow={
  get innerWidth(){return size().windowWidth},get innerHeight(){return size().windowHeight},
  get history(){return {state:{idx:Math.max(0,Taro.getCurrentPages().length-1)}}},
  location:{origin:'https://stats.fries-cup.com',pathname:'/',href:'https://stats.fries-cup.com/'},
  scrollY:0,scrollX:0,localStorage:nativeLocalStorage,
  matchMedia:query=>({matches:/max-width|prefers-reduced-motion/.test(query),addEventListener(){},removeEventListener(){}}),
  requestAnimationFrame:nativeAnimationFrame,cancelAnimationFrame:nativeCancelAnimationFrame,setTimeout,clearTimeout,
  scrollTo:options=>Taro.pageScrollTo({scrollTop:typeof options==='object'?options.top||0:0,duration:0}).catch(()=>{}),
  dispatchEvent:()=>Taro.showToast({title:'账号功能正在接入，本机关注可正常使用。',icon:'none'}),addEventListener(){},removeEventListener(){}
}
export function nativeQueryElement(parent,selector) {return {nativeSelector:selector,id:selector.startsWith('#')?selector.slice(1):'',focus(){},scrollIntoView(){nativeRevealElement(this)}}}
export const nativeDocument={getElementById:id=>nativeQueryElement(null,'#'+id),querySelector:selector=>nativeQueryElement(null,selector),activeElement:null,body:null}
export function nativeRevealElement(node){const selector=node?.nativeSelector||(node?.id?'#'+node.id:node?.props?.id?'#'+node.props.id:'');if(selector)Taro.nextTick(()=>Taro.pageScrollTo({selector,duration:0}).catch(()=>{}))}
export function nativeElementRect(){return {top:0,left:0,right:size().windowWidth,bottom:0,width:size().windowWidth,height:0}}
export class NativeIntersectionObserver {observe(){}disconnect(){}}
export async function exportNativeFollowing(payload) {
  const manager=Taro.getFileSystemManager(),filePath=`${Taro.env.USER_DATA_PATH}/${payload.seasonId.toLowerCase()}-following-${new Date().toISOString().slice(0,10)}.json`
  await new Promise((resolve,reject)=>manager.writeFile({filePath,data:JSON.stringify(payload,null,2),encoding:'utf8',success:resolve,fail:reject}))
  await Taro.shareFileMessage({filePath,fileName:filePath.split('/').pop()})
}
