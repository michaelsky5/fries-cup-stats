import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react'
import Taro, {useLoad, useShareAppMessage} from '@tarojs/taro'
import {Canvas} from '@tarojs/components'
import {readPublicSchedule, storedSeasonId, backToCenter, captureRuntime} from '../../platform'
import {getSeasonById, getSeasonName} from '../../shared/publicSeasons'
import {ClassicProvider} from '../classicContext'
import {configureClassicStorage} from '../classicStorage'
import {activateLocale, subscribeLocale, getActiveLocale, withLocale} from '../../shared/nativeLocales'
import {nativeCopy, protectPublicIdentities} from '../../shared/nativeCopy'
import LanguageSwitcher from '../../shared/LanguageSwitcher'
import Fantasy from '../../generated/classic/pages/FantasyPage'
import Shop from '../../generated/classic/pages/ShopPage'
import Battle from '../../generated/classic/pages/FantasyBattle'
import Champion from '../../generated/classic/pages/ChampionPage'
import Career from '../../generated/classic/pages/CareerPage'
import './index.css'
const paths = {'/fantasy':'fantasy','/shop':'shop','/fantasy/battle':'battle','/champion':'champion','/career':'career'}
class ClassicBoundary extends React.Component {
  state = {error:null}
  static getDerivedStateFromError(error) { return {error} }
  render() { return this.state.error ? <div className='shared-state'><p>经典经理暂时无法打开，本机存档已保留。</p><button onClick={() => backToCenter('overview',{seasonId:storedSeasonId()})}>返回赛事</button><button onClick={()=>this.setState({error:null})}>重新读取</button></div> : this.props.children }
}
function Contents() {
  const [season, setSeason] = useState(getSeasonById(storedSeasonId()))
  const [raw,setRaw] = useState(null), [error,setError] = useState(''), [view,setView] = useState('fantasy')
  const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, getActiveLocale)
  const alive = useRef(true)
  useEffect(()=>()=>{alive.current=false},[])
  useEffect(()=>captureRuntime({seasonId:season.id,locale,view:'classic:'+view,loading:!raw&&!error,error}),[season.id,locale,view,raw,error])
  const navigate = useCallback(path => { setView(paths[String(path).split('?')[0]] || 'fantasy'); Taro.pageScrollTo({scrollTop:0,duration:0}) }, [])
  async function read(id) { setError(''); try { const response = await readPublicSchedule(false,id); if(!alive.current)return; protectPublicIdentities(response.data);setRaw(response.data) } catch (failure) { if(alive.current)setError(failure.message || '公开数据暂时无法读取。') } }
  useLoad(options => {
    const selected = getSeasonById(options.season || storedSeasonId())
    activateLocale(options.lang)
    setSeason(selected)
    configureClassicStorage({get:key=>Taro.getStorageSync(key),set:(key,value)=>Taro.setStorageSync(key,value),remove:key=>Taro.removeStorageSync(key)}, selected.id)
    if (paths['/'+options.view]) setView(paths['/'+options.view])
    read(selected.id)
  })
  useShareAppMessage(() => ({title:nativeCopy('薯条杯 · 经典经理'),path:withLocale(`/classic/pages/index?season=${season.id}`,locale),imageUrl:'/assets/share-public.png'}))
  async function exportChampion(run, power) {
    const context = Taro.createCanvasContext('classic-poster')
    context.setFillStyle('#101210'); context.fillRect(0,0,360,640)
    context.setFillStyle('#f4c320'); context.fillRect(24,24,312,8); context.setFontSize(17); context.fillText('FRIES CUP / CLASSIC MANAGER',24,68)
    context.setFillStyle('#eeede6'); context.setFontSize(30); context.fillText(`STAGE ${run.currentNode-1}`,24,128)
    context.setFontSize(16); context.fillText(`${getSeasonName(season)} · ${power.powerScore} OVR`,24,164)
    const roleOrder={TANK:0,DPS:1,SUP:2}
    const roster = [...run.roster].sort((a,b)=>roleOrder[a.role]-roleOrder[b.role])
    roster.forEach((player,index)=>{const y=228+index*62;context.setFillStyle('#f4c320');context.setFontSize(12);context.fillText(`${player.role} / OVR ${(player.ovr||0)+(player.upgradeBonus||0)}`,24,y);context.setFillStyle('#eeede6');context.setFontSize(20);context.fillText(String(player.display_name||'').slice(0,22),24,y+28)})
    context.setFontSize(12);context.fillText('经典经理 · 本机模拟存档',24,615)
    const result = await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error(nativeCopy('生成图片超时，请重试。'))),12000)
      context.draw(false,()=>Taro.canvasToTempFilePath({canvasId:'classic-poster',width:360,height:640,destWidth:1080,destHeight:1920,fileType:'png',success:result=>{clearTimeout(timer);resolve(result)},fail:()=>{clearTimeout(timer);reject(new Error(nativeCopy('图片暂时无法生成，请重试。')))}}))
    })
    if(alive.current) await Taro.previewImage({current:result.tempFilePath,urls:[result.tempFilePath]})
  }
  const Component = {fantasy:Fantasy,shop:Shop,battle:Battle,champion:Champion,career:Career}[view]
  return <div className='shared-root classic-root'><header className='classic-nav'><button onClick={()=>backToCenter('overview',{seasonId:season.id})}>← 赛事</button>{[['fantasy','玩法'],['shop','大本营'],['career','生涯']].map(([key,label])=><button key={key} id={'classic-nav-'+key} onClick={()=>navigate('/'+key)} className={view===key?'shared-selected':''}>{label}</button>)}</header><LanguageSwitcher/>{!raw ? <div className='shared-state'>{error ? <><p>{error}</p><button onClick={()=>read(season.id)}>重新读取</button></>:'正在读取经理卡池…'}</div> : <ClassicProvider value={{db:raw,withSeason:path=>path,navigate,exportChampion,locale}}><Component key={view}/></ClassicProvider>}<Canvas canvasId='classic-poster' style={{position:'fixed',left:'-9999px',width:'360px',height:'640px'}}/></div>
}
export default function ClassicPage() {return <ClassicBoundary><Contents/></ClassicBoundary>}
