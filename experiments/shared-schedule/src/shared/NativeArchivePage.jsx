import {useEffect,useMemo} from 'react'
import NativePublicFrame from './NativePublicFrame.jsx'
import KprImmersiveArchive from '../generated/mobile/KprImmersiveArchive.jsx'
import {getSeasonById,seasonHasReview} from './publicSeasons.js'
import {getArchiveHighlights,getHomeSummary,getOverviewStatus} from '../../../../src/lib/homeSelectors.js'
import {captureRuntime} from '../platform.js'
import {BUILD} from './build.js'
import NativePublicState from './NativePublicState.jsx'

export default function NativeArchivePage(props) {
  const {raw,params,locale,loading,error}=props,season=getSeasonById(params.season)
  const value=useMemo(()=>raw?{archive:getArchiveHighlights(raw,season),overview:getOverviewStatus(raw,season),summary:getHomeSummary(raw)}:null,[raw,season])
  useEffect(()=>captureRuntime({build:BUILD,seasonId:season.id,locale,view:'overview',loading,error,count:raw?.matches?.length||0,teams:raw?.teams?.length||0,players:raw?.players?.length||0,sourceDesign:'KprImmersiveArchive',chapters:raw?(season.seriesCode?6:5):0}),[raw,season,locale,loading,error])
  return <NativePublicFrame props={props} season={season}><NativePublicState props={props}/>{value?<KprImmersiveArchive {...value} presentation='hybrid' includeReview={seasonHasReview(season,raw)}/>:null}</NativePublicFrame>
}
