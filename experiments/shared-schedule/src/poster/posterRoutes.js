import {getActiveLocale,getLocaleParam} from '../shared/nativeLocales.js'
import {getSeasonById} from '../shared/publicSeasons.js'
import {centerEntryUrl} from '../shared/centerPaths.js'
const kinds=new Set(['tournament','player','team','person','staff','staff-key'])
export function posterEntryUrl(params={},seasonId,locale=getActiveLocale()){
  const values={season:getSeasonById(seasonId||params.season).id,lang:getLocaleParam(locale),story:kinds.has(params.story)?params.story:'tournament'}
  if(values.story!=='tournament'&&params.subject)values.subject=String(params.subject).slice(0,512)
  if(['admin','caster'].includes(params.role))values.role=params.role
  const query=Object.entries(values).map(([key,value])=>`${key}=${encodeURIComponent(value)}`).join('&')
  return '/poster/pages/index?'+query
}
export function nativeBoardingReviewUrl(pathname,seasonId,locale){
  if(!/^\/review\/story\/(?:player|person)\/[^/?#]+\/?$/.test(String(pathname||'')))return ''
  return `https://stats.fries-cup.com${pathname}?season=${encodeURIComponent(getSeasonById(seasonId).id)}&lang=${getLocaleParam(locale)}`
}
export function posterReturnUrl(params,locale){return centerEntryUrl({...params,view:'review',lang:getLocaleParam(locale)})}
