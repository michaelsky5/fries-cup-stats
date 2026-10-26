import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react'
import Taro,{useLoad,useShareAppMessage} from '@tarojs/taro'
import {Canvas,Image,Input,Picker,Slider} from '@tarojs/components'
import {readPublicSchedule,storedSeasonId,captureRuntime} from '../../platform'
import {decodePublicOptions} from '../../shared/centerPaths'
import {getSeasonById,getSeasonName} from '../../shared/publicSeasons'
import {activateLocale,getActiveLocale,subscribeLocale} from '../../shared/nativeLocales'
import {nativeCopy,protectPublicIdentities} from '../../shared/nativeCopy'
import LanguageSwitcher from '../../shared/LanguageSwitcher'
import ScheduleRuntimeBoundary from '../../shared/ScheduleRuntimeBoundary'
import {centerShare} from '../../shared/centerRoutes'
import {BUILD} from '../../shared/build'
import {reviewText} from '../../../../../src/lib/reviewLocale.js'
import {generatePosterPng} from '../../generated/poster/reviewPoster'
import {nativePosterModel,getDirectorCutHeroOptions} from '../posterModel'
import {renderWithNativeCanvas} from '../nativeCanvasRuntime'
import {posterReturnUrl} from '../posterRoutes'
import './index.css'

const formats=['ticket','poster','movieTicket','directorCut']
function Contents(){
  const [params,setParams]=useState({season:storedSeasonId(),story:'tournament'})
  const [raw,setRaw]=useState(null),[readError,setReadError]=useState(''),[renderError,setRenderError]=useState('')
  const [settings,setSettings]=useState({format:'ticket',boardingPassVersion:'modern',heroChoice:'auto',viewerId:'',artScale:1,artOffsetY:0})
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[saving,setSaving]=useState(false),[albumDenied,setAlbumDenied]=useState(false)
  const locale=useSyncExternalStore(subscribeLocale,getActiveLocale,getActiveLocale)
  const alive=useRef(true), generation=useRef(0), busyRef=useRef(false)
  const season=getSeasonById(params.season)
  useEffect(()=>()=>{alive.current=false;generation.current++},[])
  useEffect(()=>{setResult(null);setRenderError('')},[settings,locale])
  async function read(next){
    setReadError('')
    try{const response=await readPublicSchedule(false,next.season);if(!alive.current)return;protectPublicIdentities(response.data);setRaw(response.data)}
    catch(failure){if(alive.current)setReadError(failure.message||'公开数据暂时无法读取。')}
  }
  useLoad(options=>{const decoded=decodePublicOptions(options),next={...decoded,season:getSeasonById(decoded.season||storedSeasonId()).id};activateLocale(next.lang);setParams(next);read(next)})
  useShareAppMessage(()=>centerShare(raw,'review',params,{seasonId:season.id}))
  const prepared=useMemo(()=>{if(!raw)return {};try{return {model:nativePosterModel(raw,params,locale,settings)}}catch(error){return {error:error.message}}},[raw,params,locale,settings])
  const model=prepared.model
  const heroes=useMemo(()=>[{id:'auto',label:nativeCopy('自动选择赛季代表英雄')},...getDirectorCutHeroOptions(locale).map(hero=>({id:hero.id,label:hero.label||hero.name||hero.zh||hero.en}))],[locale])
  useEffect(()=>captureRuntime({build:BUILD,view:'poster',seasonId:season.id,locale,story:params.story||'',loading:!raw&&!readError,error:readError||prepared.error||renderError,busy,format:settings.format,hasImage:Boolean(result?.path),width:result?.width||0,height:result?.height||0,missing:result?.missing.length||0}),[season.id,locale,params,raw,readError,prepared.error,renderError,busy,settings.format,result])
  function update(patch){if(!busyRef.current)setSettings(current=>({...current,...patch}))}
  async function back(){if(busyRef.current)return;try{if(Taro.getCurrentPages().length>1)await Taro.navigateBack();else await Taro.reLaunch({url:posterReturnUrl(params,locale)})}catch(_){setRenderError('返回失败，请重试。')}}
  async function make(){
    if(busyRef.current||!model)return
    busyRef.current=true;setBusy(true);setRenderError('');setResult(null)
    const own=++generation.current,isCurrent=()=>alive.current&&own===generation.current
    try{
      if(model.format==='directorCut'&&!model.director.ready)throw new Error('请先选择导演版英雄。')
      const canvas=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('画布尚未就绪，请重试。')),5000)
        Taro.createSelectorQuery().select('#native-review-canvas').fields({node:true,size:true}).exec(results=>{
          clearTimeout(timer)
          if(results?.[0]?.node)resolve(results[0].node)
          else reject(new Error('画布尚未就绪，请重试。'))
        })
      })
      if(!isCurrent())return
      const required=[model.payload.eventLogo,model.format==='directorCut'?model.payload.heroRender:''].filter(Boolean)
      const next=await renderWithNativeCanvas(canvas,()=>generatePosterPng(model.payload,{format:model.format}),{isCurrent,required})
      if(!next.path||next.width!==model.width||next.height!==model.height)throw new Error('图片输出未完成，请重试。')
      if(isCurrent())setResult(next)
    }catch(failure){if(isCurrent())setRenderError(failure.message||'图片暂时无法生成，请重试。')}
    finally{busyRef.current=false;if(isCurrent())setBusy(false)}
  }
  async function preview(){try{await Taro.previewImage({current:result.path,urls:[result.path]})}catch(_){if(alive.current)setRenderError('图片暂时无法预览，请重试。')}}
  async function albumSettings(){try{await Taro.openSetting()}catch(_){if(alive.current)setRenderError('无法打开相册权限设置，请重试。')}}
  async function save(){
    if(saving||!result?.path)return
    setSaving(true);setAlbumDenied(false);setRenderError('')
    try{await Taro.saveImageToPhotosAlbum({filePath:result.path})}
    catch(failure){if(alive.current){setAlbumDenied(/auth|denied|authorize/i.test(failure.errMsg||''));setRenderError('图片没有保存成功，请检查相册权限后重试。')}}
    finally{if(alive.current)setSaving(false)}
  }
  return <div className='shared-root native-poster-root'>
    <button className='center-back' disabled={busy} onClick={back}>← 返回回顾</button>
    <LanguageSwitcher disabled={busy}/>
    <header className='native-poster-heading'><small>FRIES CUP / KEEPSAKE</small><h1>留下这一季。</h1><p>{getSeasonName(season)}</p></header>
    {!raw?<div className='shared-state'>{readError?<><p>{readError}</p><button onClick={()=>read(params)}>重新读取</button></>:'正在读取公开赛事记录…'}</div>:prepared.error?<p role='alert'>{prepared.error}</p>:<>
      <div className='native-poster-tabs'>{formats.map(format=><button id={'poster-format-'+format} key={format} disabled={busy} className={format===settings.format?'shared-selected':''} onClick={()=>update({format})}>{reviewText(locale,{ticket:'ticketFormat',poster:'filmPosterFormat',movieTicket:'movieTicketFormat',directorCut:'directorCutFormat'}[format])}</button>)}</div>
      <div className='native-poster-controls'>
        {params.story==='tournament'?<label>观众署名<Input maxlength={64} value={settings.viewerId} disabled={busy} placeholder='选填，仅用于这张纪念票' onInput={event=>update({viewerId:event.detail.value})}/></label>:null}
        {settings.format==='ticket'&&(model.payload.usesRegularTemplate||season.id==='FCR26')?<Picker disabled={busy} range={[nativeCopy('现代登机牌'),nativeCopy('经典纪念票')]} value={settings.boardingPassVersion==='classic'?1:0} onChange={event=>update({boardingPassVersion:Number(event.detail.value)?'classic':'modern'})}><p>纪念票样式 · {settings.boardingPassVersion==='classic'?'经典纪念票':'现代登机牌'}⌄</p></Picker>:null}
        {settings.format==='directorCut'?<Picker disabled={busy} range={heroes.map(hero=>hero.label)} value={Math.max(0,heroes.findIndex(hero=>hero.id===settings.heroChoice))} onChange={event=>update({heroChoice:heroes[Number(event.detail.value)]?.id||'auto'})}><p>导演版英雄 · {heroes.find(hero=>hero.id===settings.heroChoice)?.label}⌄</p></Picker>:null}
        {settings.format==='movieTicket'&&model.payload.heroRender?<><label>人物大小 · {Math.round(settings.artScale*100)}%<Slider min={72} max={180} step={2} value={Math.round(settings.artScale*100)} disabled={busy} onChange={event=>update({artScale:event.detail.value/100})}/></label><label>人物位置 · {settings.artOffsetY}<Slider min={-180} max={180} step={10} value={settings.artOffsetY} disabled={busy} onChange={event=>update({artOffsetY:event.detail.value})}/></label></>:null}
        <p>{model.width} × {model.height} · PNG</p>
        <button id='native-poster-generate' className='native-poster-primary' disabled={busy} onClick={make}>{busy?'正在制作图片…':result?'重新生成图片':'生成纪念图片'}</button>
      </div>
      {result?<div className='native-poster-result'><Image className='native-poster-image' src={result.path} mode='widthFix' showMenuByLongpress onClick={preview}/><div className='native-poster-actions'><button id='native-poster-preview' onClick={preview}>查看完整图片 ↗</button><button id='native-poster-save' disabled={saving} onClick={save}>{saving?'正在保存…':'保存到相册 ↓'}</button></div>{result.missing.length?<p>部分图片未能读取，可重新生成。</p>:null}</div>:null}
    </>}
    {renderError?<p className='native-poster-error' role='alert'>{renderError}</p>:null}
    {albumDenied?<button onClick={albumSettings}>设置相册权限</button>:null}
    <Canvas type='2d' id='native-review-canvas' className='native-poster-canvas'/>
  </div>
}
export default function PosterPage(){return <ScheduleRuntimeBoundary><Contents/></ScheduleRuntimeBoundary>}
