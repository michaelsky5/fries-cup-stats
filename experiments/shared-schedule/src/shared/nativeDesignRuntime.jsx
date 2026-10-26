import { Children, createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Taro, { useDidHide, usePageScroll } from '@tarojs/taro'
import { View, ScrollView, Picker, Image, Input, Checkbox,Radio } from '@tarojs/components'
import { pickUiLocale, translateUiText } from '../../../../src/lib/uiText.js'
import { copyPublicLink, openCenter, changeSeason } from '../platform.js'
import { setStoredLocale, withLocale, getActiveLocale } from './nativeLocales.js'
import { nativePublicPath, publicNativeRoute, nativeOverviewSearch, nativeOverviewSelection } from './nativeDesignModel.js'
import navigation from '../generated/navigation.json'
import { getGlobalSummary } from '../../../../src/lib/selectors.js'
import { formatUpdatedAt } from '../../../../src/lib/format.js'
import { getPublicDataStatus } from '../../../../src/lib/publicDataStatus.js'
import { createMatchReadingQuery,applyMatchReadingQuery } from './nativeMatchState.js'
import {getPlayerFavoriteId,getTeamFavoriteId,sanitizeFavoritesForSeason} from '../../../../src/features/favorites/favoritesSelectors.js'
import {FAVORITE_LIMITS} from '../../../../src/features/favorites/favoritesConstants.js'
import {getStaffProfile} from '../../../../src/lib/staffProfiles.js'
import {activateLocale} from './nativeLocales.js'
import {nativeWindow,nativeDocument,nativeRevealElement} from './nativeBrowser.js'
import {cleanPublicQuery} from './publicQueryState.js'
export * from './nativeBrowser.js'
export {default as NativeSvg} from './NativeSvg.jsx'
export {NativePlayerShareDialog,NativeTeamShareDialog,NativeReviewShareDialog} from './nativeShareBoundary.jsx'
export { nativeSelectorClasses, nativeAssetUrl } from './nativeDesignModel.js'

const PublicContext=createContext(null), Disclosure=createContext(null)
const menuClosers=new Set()
export const nativeDockItems=navigation.dock
export function NativeAccountModeSwitch(){return null}
export function NativeAccountFeature(){return null}
export function useNativeLobbyOpen(){return false}
export function useNativeDeferredNewspaper(){return {loading:false,issue:null,issues:[],error:new Error('周报阅读暂未接入此原生版本')}}
export function nativeStorageLabel(locale){return pickUiLocale(locale,'保存在此设备','Saved on this device','이 기기에 저장됨','儲存在此裝置')}
export function NativeRosterEntry({locale='zh-CN'}) {
  const context=useOutletContext()
  return <View className='native-roster-entry' role='button' aria-label={pickUiLocale(locale,'查找选手和队伍','Find players and teams','선수 및 팀 찾기','查找選手和隊伍')} onClick={()=>context?.navigate('/roster')}><Image className='native-roster-search-icon' src='/assets/mobile/search.png' mode='aspectFit'/></View>
}
export function useNativeMobileTabNavigation() {
  const context=useOutletContext(),location=context?.location||{pathname:'/',search:''}
  const route=publicNativeRoute(location.pathname+location.search)
  const group=['maps','heroes'].includes(route.view)?'database':['staff'].includes(route.view)?'roster':route.view
  return {group,target:(_,path)=>({to:path}),activate:(event,destination,path)=>{
    event.preventDefault?.()
    if(destination!==group)context?.navigate(path)
  }}
}
export function closeNativeMenus() { menuClosers.forEach(close=>close()) }
export function pickLocale(locale,zh,en) { return pickUiLocale(locale,zh,en) }
export function useAuth() { return {isAuthenticated:false} }
export function getReturnState(location) { return {returnTo:getLocationPath(location)} }
export function getSafeInternalPath(path,prefixes=[]) {const value=String(path||'');return value.startsWith('/')&&!value.startsWith('//')&&(!prefixes.length||prefixes.some(prefix=>value===prefix||value.startsWith(prefix+'/')||value.startsWith(prefix+'?')))?value:''}
export function readReturnState(state,{allowedPrefixes=[]}={}) {return {returnTo:getSafeInternalPath(state?.returnTo,allowedPrefixes),returnScrollY:null}}
export function saveReturnScroll() { /* The native page stack retains the originating page. */ }
export function getLocationPath(location) { return location.pathname+location.search }
export function getRestoreScrollY() { return null }
export function getSavedReturnScroll() { return null }
export function restoreWindowScroll() { /* Native page stack preserves the parent page. */ }
export function getRestoreScrollState() { return undefined }
export function useNavigationType() { return 'PUSH' }
export function revealWeeklyFocus() { Taro.pageScrollTo({selector:'#weekly-focus',duration:0}).catch(()=>{}) }

export function NativeDesignProvider({props,season,children}) {
  const {raw,selection,params,view,following,onFollow,onNavigate,onSelection}=props
  const [readingQuery,setReadingQuery]=useState(()=>createMatchReadingQuery(params))
  const [pageQuery,setPageQuery]=useState(()=>cleanPublicQuery(params.filters).toString())
  const [navigationState,setNavigationState]=useState(null)
  useEffect(()=>setReadingQuery(createMatchReadingQuery(params)),[params.id,season.id])
  useEffect(()=>setPageQuery(cleanPublicQuery(params.filters).toString()),[params.filters,season.id])
  const overviewQuery=view==='overview'?nativeOverviewSearch(selection,{...params,season:season.id}):new URLSearchParams(pageQuery)
  overviewQuery.set('season',season.id);overviewQuery.set('lang',props.locale)
  if(params.cycle&&!overviewQuery.has('cycle'))overviewQuery.set('cycle',params.cycle)
  if(params.week&&!overviewQuery.has('week'))overviewQuery.set('week',params.week)
  if(params.hero&&!overviewQuery.has('hero'))overviewQuery.set('hero',params.hero)
  if(params.role&&!overviewQuery.has('role'))overviewQuery.set('role',params.role)
  if(params.scene&&!overviewQuery.has('scene'))overviewQuery.set('scene',params.scene)
  if(params.id)applyMatchReadingQuery(overviewQuery,readingQuery)
  const search=overviewQuery.toString()
  let storyParams=params
  if(params.story==='staff'&&raw){const staff=getStaffProfile(raw,params.subject);if(staff)storyParams=staff.team?{...params,story:'person',subject:staff.identityKey}:{...params,story:'staff-key',role:staff.role,subject:staff.id.split(':').slice(2).join(':')}}
  const pathname=nativePublicPath(view,storyParams)
  // Like React Router, a query change produces a new location key and closes menus.
  const location=useMemo(()=>({pathname,search:search?'?'+search:'',hash:'',key:`${season.id}:${props.locale}:${pathname}:${search}`,state:navigationState||(params.returnTo?{returnTo:params.returnTo}:null)}),[pathname,search,season.id,props.locale,navigationState,params.returnTo])
  useEffect(closeNativeMenus,[location.key])
  useDidHide(closeNativeMenus)
  const summary=getGlobalSummary(raw)
  const favoriteTeamId=value=>typeof value==='object'?getTeamFavoriteId(value):String(value)
  const favoritePlayerId=value=>typeof value==='object'?getPlayerFavoriteId(value):String(value)
  const favorites=sanitizeFavoritesForSeason({favoriteTeamIds:following.teams,favoritePlayerIds:following.players,primaryTeamId:following.primaryTeamId},raw)
  const context={db:raw,season,seasonId:season.id,canonicalSeasonId:season.publicCode||season.id,locale:props.locale,location,nativeStoryType:storyParams.story==='staff-key'?'staff':storyParams.story,isKprHybridDesign:true,isKprDesign:true,isFdDesign:false,isAuthenticated:false,
    t:(key,values)=>translateUiText(key,props.locale,values),favorites,favoriteLimits:FAVORITE_LIMITS,favoritesSyncStatus:'local',favoritesSyncError:props.storageError||'',saveFavorites:props.onSaveFavorites,
    dataStatus:getPublicDataStatus({isLoading:props.loading&&!raw,error:raw?'':props.error,isRefreshing:props.loading&&!!raw,refreshError:raw&&(props.error||props.stale),dataSource:{kind:'public'}},props.locale),updatedAtText:formatUpdatedAt(summary.updatedAt,'—'),
    withSeason:path=>withLocale(`${path}${String(path).includes('?')?'&':'?'}season=${season.id}`,props.locale),
    isFavoriteTeam:value=>following.teams.includes(favoriteTeamId(value)),toggleTeamFavorite:value=>{const id=favoriteTeamId(value);if(!id)return;if(following.teams.includes(id)||following.teams.length<FAVORITE_LIMITS.teams)onFollow('teams',id);else Taro.showToast({title:`最多关注 ${FAVORITE_LIMITS.teams} 支队伍`,icon:'none'})},
    isFavoritePlayer:value=>following.players.includes(favoritePlayerId(value)),togglePlayerFavorite:value=>{const id=favoritePlayerId(value);if(!id)return;if(following.players.includes(id)||following.players.length<FAVORITE_LIMITS.players)onFollow('players',id);else Taro.showToast({title:`最多关注 ${FAVORITE_LIMITS.players} 名选手`,icon:'none'})},
    setSearch:query=>{
      const next=new URLSearchParams(typeof query==='function'?query(new URLSearchParams(location.search)):query)
      if(next.get('lang')&&next.get('lang')!==props.locale)activateLocale(next.get('lang'))
      if(params.id){setReadingQuery(next.toString());props.onPublicRoute?.({mapOrder:next.get('map')||''});return}
      setPageQuery(next.toString());props.onPublicRoute?.({filters:cleanPublicQuery(next).toString(),role:next.get('role')||'',scene:next.get('scene')||'',cycle:next.get('cycle')||'',week:next.get('week')||''})
      if(view==='overview')onSelection(nativeOverviewSelection(raw,selection,next))
    },
    navigate:async (to,options={})=>{
      closeNativeMenus()
      if(typeof to==='number'){await Taro.navigateBack({delta:Math.max(1,-to)});return}
      if(typeof to==='string'&&to.startsWith('#')){scrollNativeSection(to.slice(1));return}
      const route=publicNativeRoute(to,pathname)
      if(route.unavailable){await Taro.showToast({title:'这个功能正在接入小程序。',icon:'none'});return}
      if(route.external) { await copyPublicLink(route.external); return }
      if(nativePublicPath(route.view,route)===pathname){setNavigationState(options.state||null);setPageQuery(route.filters||'');props.onPublicRoute?.({...route,filters:route.filters||''});return}
      if(route.season && route.season!==season.id) { await changeSeason(route.season,route.view); return }
      if(options.state?.returnTo)route.returnTo=options.state.returnTo
      if (['id','team','player','map','hero','staff','story','directory'].some(key=>route[key])) { await openCenter(route,selection); return }
      if(raw && route.cycle) onSelection(nativeOverviewSelection(raw,selection,new URLSearchParams({cycle:route.cycle,...(route.week?{week:route.week}:{})})))
      onNavigate(route.view)
    }}
  return <PublicContext.Provider value={context}>{children}</PublicContext.Provider>
}
export function useLocation() { return useContext(PublicContext)?.location || {pathname:'/',search:'',key:'initial'} }
export function useNativeUiLocale() { return useContext(PublicContext)?.locale || getActiveLocale() }
export function useOutletContext() { return useContext(PublicContext) }
export function useSearchParams() { const context=useOutletContext(); return [new URLSearchParams(context.location.search),context.setSearch] }
export function useNavigate(){return useOutletContext().navigate}
export function useParams(){const context=useOutletContext(),parts=context.location.pathname.split('/').filter(Boolean);return {playerId:parts[0]==='players'?decodeURIComponent(parts[1]||''):parts[2]==='player'?decodeURIComponent(parts[3]||''):undefined,teamId:parts[0]==='teams'?decodeURIComponent(parts[1]||''):parts[2]==='team'?decodeURIComponent(parts[3]||''):undefined,mapName:parts[0]==='maps'?decodeURIComponent(parts[1]||''):undefined,staffId:parts[0]==='staff'?decodeURIComponent(parts[1]||''):undefined,identityKey:parts[2]==='person'?decodeURIComponent(parts[3]||''):undefined,staffKey:parts[2]==='staff'?decodeURIComponent(parts[4]||parts[3]||''):undefined,staffType:parts[2]==='staff'?decodeURIComponent(parts[3]||''):undefined}}
export function Navigate({to,replace,state}){const navigate=useNavigate();useEffect(()=>{navigate(to,{replace,state})},[String(to)]);return null}
export function useBlocker(){return {state:'unblocked',reset(){},proceed(){}}}
export function createPortal(children){return children}
export const NativeLink=forwardRef(function NativeLink({to,href,children,onClick,className='',state,target,rel,end,...props},ref) {
  const context=useOutletContext()
  if(publicNativeRoute(to||href,context?.location?.pathname).unavailable)return null
  const click=event=>{
    let prevented=false
    const nativeEvent={...event,preventDefault:()=>{prevented=true;event.preventDefault?.()},stopPropagation:()=>event.stopPropagation?.()}
    onClick?.(nativeEvent)
    if(prevented||event?.defaultPrevented)return
    const destination=to||href
    if(typeof destination==='string'&&destination.startsWith('#')){scrollNativeSection(destination.slice(1));return}
    Promise.resolve(context?.navigate(destination,{state})).catch(()=>Taro.showToast({title:translateUiText('页面切换失败，请重试。',context?.locale),icon:'none'}))
  }
  return <View {...props} ref={ref} className={`shared-element shared-tag-a ${className}`} role='link' onClick={click}>{children}</View>
})
export const Link=NativeLink

export const NativeDetails=forwardRef(function NativeDetails({children,className='',open:controlledOpen,onToggle,nativeMenu=false,...props},ref) {
  const [expanded,setOpen]=useState(false)
  const open=controlledOpen===undefined?expanded:Boolean(controlledOpen)
  const menu=nativeMenu
  useEffect(()=>{if(!menu)return;const close=()=>setOpen(false); menuClosers.add(close); return()=>menuClosers.delete(close)},[menu])
  const parts=Children.toArray(children)
  return <Disclosure.Provider value={{open,toggle:()=>{const next=!open;if(menu)closeNativeMenus();if(controlledOpen===undefined)setOpen(next);onToggle?.({currentTarget:{open:next},target:{open:next}})}}}>
    {open&&menu?<View className='native-disclosure-backdrop' onClick={closeNativeMenus}/>:null}
    <View {...props} ref={ref} className={`${className} native-disclosure ${open?'shared-open':''}`}>{parts[0]}{open?parts.slice(1):null}</View>
  </Disclosure.Provider>
})
export function NativeSummary({children,className='',onClick,...props}) {
  const disclosure=useContext(Disclosure)
  return <View {...props} className={className} role='button' aria-expanded={disclosure?.open} onClick={event=>{event.stopPropagation?.();let prevented=false;onClick?.({...event,preventDefault:()=>{prevented=true;event.preventDefault?.()}});if(!prevented)disclosure?.toggle()}}>{children}</View>
}
export const NativeDialogSurface=forwardRef(function NativeDialogSurface({open,onDismiss,onClose,children,className='',...props},ref) {
  if(!open)return null
  return <View className='native-dialog-layer' catchMove>
    <View className='native-dialog-backdrop' onClick={onDismiss}/>
    <ScrollView {...props} ref={ref} className={`shared-element shared-tag-dialog ${className} native-dialog-surface shared-open`} scrollY enhanced onClick={event=>event.stopPropagation?.()}>{children}</ScrollView>
  </View>
})
export function NativeSelect({children,value,onChange,disabled,className='',...props}) {
  const label=value=>Array.isArray(value)?value.map(label).join(''):value&&typeof value==='object'?label(value.props?.children):String(value??'')
  const options=Children.toArray(children).filter(child=>child?.props).map(child=>({value:child.props.value,label:label(child.props.children)}))
  const selected=Math.max(0,options.findIndex(item=>String(item.value)===String(value)))
  return <Picker {...props} className={`${className} shared-element shared-tag-select`} mode='selector' range={options.map(item=>item.label)} value={selected} disabled={disabled} onChange={event=>onChange?.({target:{value:options[Number(event.detail.value)]?.value}})}><View>{options[selected]?.label || '—'}</View></Picker>
}
// Web images supply an intrinsic width for CSS height + width:auto. WeChat
// does not, even with heightFix when authored CSS still specifies width:auto.
// Keep the original CSS height/position and calculate only its missing width.
export function NativeIntrinsicImage({src,className='',style,onLoad,intrinsic=true,mode:ignoredMode,...props}) {
  const id='native-art-'+useId().replace(/[^\w-]/g,''), current=useRef(src)
  const [width,setWidth]=useState(null)
  current.current=src
  useEffect(()=>{current.current=src;setWidth(null);return()=>{current.current=null}},[src])
  const loaded=event=>{
    onLoad?.(event)
    const natural=event.detail, loadedSource=src
    if(!intrinsic||!natural?.width||!natural?.height)return
    Taro.nextTick(()=>{
      Taro.createSelectorQuery().select('#'+id).boundingClientRect(rect=>{
        if(current.current===loadedSource&&rect?.height>0)setWidth(rect.height*natural.width/natural.height)
      }).exec()
    })
  }
  return <Image {...props} id={id} src={src} mode='aspectFit' webp={/\.webp(?:$|[?#])/i.test(String(src))} className={`${className} shared-element shared-tag-img`} style={{...style,...(width?{width:`${width}px`}:{})}} onLoad={loaded}/>
}
export function NativeNavIcon({path,active}) {
  const icon=[...navigation.dock,{group:'more',icon:navigation.moreIcon}].find(item=>item.icon===path)?.group || 'more'
  return <img className='shared-element shared-tag-svg' src={`/assets/navigation/${icon}${active?'-active':''}.png`} alt='' />
}
export function NativeAccountEntry(){return null}
export function changeNativeLanguage(locale) { closeNativeMenus();setStoredLocale(locale) }

export const copyNativeText=value=>Taro.setClipboardData({data:String(value)})
export function useNativeCompactLayout() { return true }
export function useNativeStagePointer() { /* Authored phone layout has no pointer scene. */ }
export function useNativeExhibitionScene(){const rootRef=useRef(null),stageRef=useRef(null),identityRef=useRef(null),peopleRef=useRef(null);const [chapter,setChapter]=useState(0);return {rootRef,stageRef,identityRef,peopleRef,animated:false,pinned:false,reduced:true,chapter,moveTo:target=>{setChapter(target);nativeRevealElement(target?peopleRef.current:identityRef.current)},toggleMotion(){}}}
export function useNativeArchiveStory() {
  const trackRef=useRef(null),stageRef=useRef(null)
  return {trackRef,stageRef,act:0,goToAct:()=>{},reducedMotion:true,motionPaused:true,setMotionPaused:()=>{},prefersReducedMotion:true}
}
export function afterNativeRender(callback) {
  let alive=true
  Taro.nextTick(()=>{if(alive)callback()})
  return()=>{alive=false}
}
export function scrollNativeSection(id) {
  if(!id)return
  Taro.nextTick(()=>{
    const query=Taro.createSelectorQuery()
    query.select('#'+id).boundingClientRect()
    query.select('.shared-tag-header').boundingClientRect()
    query.select('.shared-data-match-navigation').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec(rects=>{
      const [target,header,nav,viewport]=rects||[]
      if(!target||!viewport)return
      const offset=Math.max(0,header?.bottom||0)+(nav?.height||0)+16
      Taro.pageScrollTo({scrollTop:Math.max(0,viewport.scrollTop+target.top-offset),duration:0}).catch(()=>{})
    })
  })
}
export function useNativeArchiveMotion(rootRef,idsKey) {
  const [activeChapter,setActiveChapter]=useState(()=>idsKey.split('|')[0])
  const scrolling=useRef(false)
  const measure=useCallback(()=>{
    if(scrolling.current)return
    scrolling.current=true
    Taro.nextTick(()=>{
      Taro.createSelectorQuery().selectAll('.shared-data-archive-section').boundingClientRect(rects=>{
        scrolling.current=false
        const sections=(rects||[]).filter(rect=>idsKey.split('|').includes(rect.id))
        const active=sections.filter(rect=>rect.top<=180).slice(-1)[0]||sections[0]
        if(active)setActiveChapter(active.id)
      }).exec()
    })
  },[idsKey])
  useEffect(()=>afterNativeRender(measure),[measure])
  usePageScroll(measure)
  return {activeChapter,scrollToChapter:id=>{setActiveChapter(id);scrollNativeSection(id)}}
}
export function useNativeChronicleSections(setActive,recordsMode,dependencies) {
  const measuring=useRef(false)
  const measure=()=>{
    if(recordsMode||measuring.current)return
    measuring.current=true
    Taro.nextTick(()=>{
      const height=Taro.getWindowInfo?.().windowHeight||812
      Taro.createSelectorQuery().selectAll('.shared-data-chronicle-chapter').boundingClientRect(rects=>{
        measuring.current=false
        const sections=(rects||[]).filter(rect=>String(rect.id||'').startsWith('journey-chapter-'))
        const active=sections.filter(rect=>rect.top<=height*.25).slice(-1)[0]||sections[0]
        if(active)setActive(active.id.slice('journey-chapter-'.length))
      }).exec()
    })
  }
  useEffect(()=>afterNativeRender(measure),dependencies)
  usePageScroll(measure)
}
export function useNativeMatchOffsets(id,mapCount) {
  const [offsets,setOffsets]=useState({})
  useEffect(()=>afterNativeRender(()=>{
    const query=Taro.createSelectorQuery()
    query.select('.shared-tag-header').boundingClientRect()
    query.select('.shared-data-match-navigation').boundingClientRect()
    query.exec(rects=>{const [header,nav]=rects||[];if(header)setOffsets({'--coach-header-offset':`${Math.ceil(header.height)+8}px`,'--coach-navigation-height':`${Math.ceil(nav?.height||48)}px`})})
  }),[id,mapCount])
  return offsets
}
export function useNativeMatchSections(setSection,setOrder,dependencies) {
  const measuring=useRef(false)
  const measure=()=>{
    if(measuring.current)return
    measuring.current=true
    Taro.nextTick(()=>{
      const query=Taro.createSelectorQuery()
      query.selectAll('.shared-data-match-section').boundingClientRect()
      query.selectAll('.shared-data-map-order').boundingClientRect()
      query.exec(rects=>{measuring.current=false;const [sections,maps]=rects||[];const current=(sections||[]).filter(rect=>rect.top<=170).slice(-1)[0];if(current)setSection(current.dataset.matchSection);const map=(maps||[]).filter(rect=>rect.top<=210).slice(-1)[0];if(map)setOrder(Number(map.dataset.mapOrder))})
    })
  }
  useEffect(()=>afterNativeRender(measure),dependencies)
  usePageScroll(measure)
}
export const NativeSearchInput=forwardRef(function NativeSearchInput({onValueChange,onChange,type, ...props},ref) {
  const inputId='native-input-'+useId().replace(/[^\w-]/g,'')
  const [focused,setFocused]=useState(false)
  useImperativeHandle(ref,()=>({focus:()=>{setFocused(false);Taro.nextTick(()=>setFocused(true))}}),[])
  return <Input {...props} id={props.id||inputId} type='text' className={`${props.className||''} shared-element shared-tag-input`} focus={focused} onBlur={()=>setFocused(false)} onInput={event=>{onValueChange?.(event.detail.value);onChange?.({...event,target:{...event.target,value:event.detail.value}})}}/>
})
export const NativeInput=forwardRef(function NativeInput({type,checked,onChange,value,...props},ref){
  const chooseFile=async()=>{try{const result=await Taro.chooseMessageFile({count:1,type:'file',extension:['json']});const files=result.tempFiles.map(file=>({...file,text:()=>new Promise((resolve,reject)=>Taro.getFileSystemManager().readFile({filePath:file.path,encoding:'utf8',success:r=>resolve(r.data),fail:reject}))}));await onChange?.({target:{files,value:''}})}catch(error){if(!String(error.errMsg||'').includes('cancel'))Taro.showToast({title:'文件暂时无法读取，请重试。',icon:'none'})}}
  useImperativeHandle(ref,()=>type==='file'?{click:chooseFile}:null,[type,onChange])
  if(type==='file')return <View {...props}/>
  if(type==='checkbox'||type==='radio'){const Control=type==='radio'?Radio:Checkbox;return <Control {...props} checked={checked} value={String(value||'choice')} color='#181a17' onClick={event=>onChange?.({...event,target:{checked:!checked,value}})}/>}
  return <NativeSearchInput {...props} value={value} onChange={onChange}/>
})
export function NativeSearchGlyph() {return <Image className='shared-element shared-tag-svg' src='/assets/mobile/search.png' mode='aspectFit'/>}
