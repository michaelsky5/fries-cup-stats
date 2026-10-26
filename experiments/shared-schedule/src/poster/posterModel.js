import {publicStoryScenes} from '../shared/publicStoryModel.js'
import {buildReviewPosterPayload} from '../generated/poster/reviewPayload.js'
import {applyDirectorCutSelection,getDirectorCutHeroOptions,getDirectorCutSelection} from '../../../../src/lib/directorCutProfiles.js'
import {getReviewSeasonProfile} from '../../../../src/lib/reviewSeason.js'
import {getReviewReadiness} from '../../../../src/lib/reviewReadiness.js'
import {getSeasonById} from '../shared/publicSeasons.js'
import {nativeBoardingReviewUrl} from './posterRoutes.js'
export {getDirectorCutHeroOptions}
export function nativePosterModel(raw,params,locale,settings={}){
  const season=getSeasonById(params.season||raw?.season?.id||raw?.meta?.season_id)
  if(!getReviewReadiness(season,raw).available)throw new Error('这个赛事尚未开放回顾。')
  const scenes=publicStoryScenes(raw,params,locale)
  if(!scenes.length)throw new Error('没有找到对应的公开故事。')
  const profile=getReviewSeasonProfile(raw)
  const context={storyType:params.story==='staff-key'?'staff':params.story,staffType:params.role,locale,viewerId:String(settings.viewerId||'').trim().slice(0,64)}
  const base=buildReviewPosterPayload(scenes,context)
  const path=['person','player'].includes(params.story)?`/review/story/${params.story}/${encodeURIComponent(params.subject)}`:''
  const payload={...base,reviewUrl:profile.usesRegularTemplate?nativeBoardingReviewUrl(path,season.id,locale):'',boardingPassVersion:settings.boardingPassVersion==='classic'?'classic':'modern'}
  const format=['poster','movieTicket','directorCut'].includes(settings.format)?settings.format:'ticket'
  const director=getDirectorCutSelection(payload,settings.heroChoice||'auto',locale)
  const selected=format==='directorCut'?applyDirectorCutSelection(payload,director):payload
  if(format==='movieTicket'&&selected.heroRender)selected.movieTicketArtwork={scale:Math.max(.72,Math.min(1.8,Number(settings.artScale)||1)),offsetY:Math.max(-180,Math.min(180,Number(settings.artOffsetY)||0))}
  const wide=format==='ticket'&&Boolean(selected.playerTicket||selected.identityTicket)&&payload.boardingPassVersion!=='classic'&&profile.usesRegularTemplate
  return {payload:selected,format,director,width:wide?2400:format==='poster'?1080:(format==='movieTicket'||format==='directorCut'||selected.playerTicket||selected.identityTicket)?1920:1080,height:wide?960:format==='poster'?1920:(format==='movieTicket'||format==='directorCut'||selected.playerTicket||selected.identityTicket)?1080:1920}
}
