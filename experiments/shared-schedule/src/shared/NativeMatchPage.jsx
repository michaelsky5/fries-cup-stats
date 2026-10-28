import {useEffect,useMemo,useRef,useState} from 'react'
import NativePublicFrame from './NativePublicFrame.jsx'
import SignalMatchDetail from '../generated/mobile/SignalMatchDetail.jsx'
import {getMatchDossier,getValidMapOrder} from '../../../../src/lib/matchDetailSelectors.js'
import {getWeeklyMatchPeriod} from '../../../../src/components/matches/detail/matchPhasePresentation.js'
import {translateUiText} from '../../../../src/lib/uiText.js'
import {createTranslator} from '../../../../src/lib/i18n.js'
import {getSeasonById} from './publicSeasons.js'
import {useOutletContext,useSearchParams,scrollNativeSection} from './nativeDesignRuntime.jsx'
import {backToCenter,copyPublicLink,captureRuntime} from '../platform.js'
import {BUILD} from './build.js'
import NativePublicState from './NativePublicState.jsx'

function MatchRecord({props,dossier,season}) {
  const {locale,params,selection,loading,error}=props
  const t=useMemo(()=>createTranslator(locale),[locale])
  const {withSeason,location}=useOutletContext(),[query,setQuery]=useSearchParams()
  const [copyMessage,setCopyMessage]=useState(''),analysisRef=useRef(null)
  const requested=query.get('map'),order=getValidMapOrder(dossier,requested)
  useEffect(()=>{setCopyMessage('');if(requested&&String(order)!==requested){const next=new URLSearchParams(query);next.set('map',String(order));setQuery(next)}},[params.id,requested,order])
  useEffect(()=>captureRuntime({build:BUILD,seasonId:season.id,locale,view:'matches',loading,error,matchId:params.id,sourceDesign:'SignalMatchDetail',mapOrder:order,mapCount:dossier?.mapRecords?.length||0,readingQuery:location.search.replace(/([?&])(?:pquery|compareA|compareB)=[^&]*/g,'$1'),count:props.raw?.matches?.length||0}),[params.id,locale,loading,error,order,location.search,dossier])
  const back=()=>backToCenter('matches',selection)
  if(!dossier)return <div className='shared-state'><p>{translateUiText('找不到这场比赛',locale)}</p><button onClick={back}>{translateUiText('返回赛程',locale)}</button></div>
  const selectMap=nextOrder=>{const next=new URLSearchParams(query);next.set('map',String(nextOrder));next.delete('expand');setQuery(next);scrollNativeSection('map-records')}
  const copy=async()=>{try{const path=withSeason(`/matches/${encodeURIComponent(dossier.internalId)}${order?'?map='+order:''}`);await copyPublicLink('https://stats.fries-cup.com'+path);setCopyMessage(translateUiText('链接已复制',locale))}catch(_){setCopyMessage(translateUiText('复制失败，请重试。',locale))}}
  return <div className='native-source-match'><SignalMatchDetail dossier={dossier} seasonId={season.id} locale={locale} t={t} withSeason={withSeason} returnState={undefined} onNavigate={()=>{}} backLabel={translateUiText('返回赛程',locale)} onBack={back} roomPath={null} onCopyLink={copy} copyMessage={copyMessage} activeAnchor={requested?order:'overview'} onSelectMap={selectMap} analysisRef={analysisRef} setMapRef={()=>{}} returnTo={withSeason('/matches')} weeklyPeriod={getWeeklyMatchPeriod(props.raw,dossier.match)} isPreview={props.raw?.meta?.preview===true}/></div>
}
export default function NativeMatchPage(props) {
  const season=getSeasonById(props.params.season)
  const dossier=useMemo(()=>props.raw?getMatchDossier(props.raw,props.params.id,{locale:props.locale}):null,[props.raw,props.params.id,props.locale])
  return <NativePublicFrame props={props} season={season}><NativePublicState props={props}/>{props.raw?<MatchRecord props={props} dossier={dossier} season={season}/>:null}</NativePublicFrame>
}
