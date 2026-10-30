import { initialSelection } from './model.js'
import {cleanPublicQuery} from './publicQueryState.js'
const HTML_BOOLEAN_ATTRIBUTES=new Set(['hidden','disabled','checked','selected','multiple','required','open'])

export const PUBLIC_PATHS = { overview:'/', matches:'/matches', database:'/leaderboard', play:'/play', roster:'/roster', advance:'/advance', space:'/me', maps:'/maps', heroes:'/heroes', staff:'/staff', review:'/review', history:'/history' }
export function nativePublicPath(view, params = {}) {
  if (params.id) return `/matches/${encodeURIComponent(params.id)}`
  if(params.story==='staff-key')return `/review/story/staff/${encodeURIComponent(params.role||'admin')}/${encodeURIComponent(params.subject||'')}`
  if(params.story)return `/review/story/${params.story}${params.subject?'/'+encodeURIComponent(params.subject):''}`
  for (const [key, plural] of [['team','teams'],['player','players'],['map','maps'],['hero','heroes'],['staff','staff']]) if (params[key]) return `/${plural}/${encodeURIComponent(params[key])}${['team','player'].includes(key)&&['journey','analysis'].includes(params.dossierView)?'/'+params.dossierView:''}`
  if(view==='roster'&&['teams','players'].includes(params.directory))return '/'+params.directory
  return PUBLIC_PATHS[view] || '/'
}
export function publicNativeRoute(to,currentPath='/') {
  const current=String(currentPath||'/').split(/[?#]/)[0]
  const value=typeof to==='object'?`${to.pathname||current}${to.search?('?'+String(to.search).replace(/^\?/,'')):''}${to.hash||''}`:String(to||'/')
  const raw=/^[?#]/.test(value)?current+value:value
  const [pathname, search = ''] = raw.split('#')[0].split('?')
  if (/^(?:https?:|mailto:)/i.test(pathname)) return { external:String(to) }
  if (/^\/(?:fonts|logos|review\/assets)\//.test(pathname))return {external:`https://stats.fries-cup.com${to}`}
  const params = new URLSearchParams(search), parts = pathname.split('/').filter(Boolean)
  if(parts.length===1&&parts[0]==='account')return {account:true}
  if(parts[0]==='me'&&(params.has('competition')||(params.has('section')&&params.get('section')!=='following')))return {account:true}
  const roots = {matches:'matches',leaderboard:'database',play:'play',roster:'roster',teams:'roster',players:'roster',advance:'advance',me:'space',following:'space',maps:'maps',heroes:'heroes',staff:'staff',review:'review',history:'history'}
  const route = {view:roots[parts[0]] || 'overview'}
  if(parts[0]&&!roots[parts[0]])return {unavailable:true}
  if(['teams','players'].includes(parts[0]))route.directory=parts[0]
  const detail = {matches:'id',teams:'team',players:'player',maps:'map',heroes:'hero',staff:'staff'}[parts[0]]
  if (detail && parts[1]) route[detail] = decodeURIComponent(parts[1])
  if(['teams','players'].includes(parts[0])&&['journey','analysis'].includes(parts[2]))route.dossierView=parts[2]
  if (parts[0] === 'review' && parts[1] === 'story' && parts[2]) { route.story=parts[2]; if(parts[3])route.subject=decodeURIComponent(parts[3]) }
  if(route.story==='staff'&&parts[4]){route.story='staff-key';route.role=parts[3];route.subject=decodeURIComponent(parts[4])}
  for (const key of ['season','cycle','week','role','section','scene','topic','mapOrder','lang']) if (params.has(key)) route[key]=params.get(key)
  if(route.id && params.has('map'))route.mapOrder=params.get('map')
  const filters=cleanPublicQuery(params)
  for(const key of ['cycle','week','role','section','scene','topic','mapOrder'])if(Object.hasOwn(route,key))filters.delete(key)
  if(route.id)filters.delete('map')
  if(filters.toString())route.filters=filters.toString().slice(0,1024)
  return route
}
export function nativeOverviewSearch(selection, params = {}) {
  const query = new URLSearchParams()
  for (const [key,value] of Object.entries({cycle:selection?.cycleId,week:selection?.weekId === 'all' ? '' : selection?.weekId,match:selection?.match,season:params.season})) if(value)query.set(key,value)
  return query
}
export function nativeOverviewSelection(raw, current, query) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query)
  const resolved = initialSelection(raw,{cycle:params.get('cycle'),week:params.get('week')})
  return {...current,...resolved,query:current?.query || '',teamId:current?.teamId || '',status:current?.status || 'all',match:params.get('match') || ''}
}
export function nativeSelectorClasses(attributes = {}) {
  const result = []
  for (const [key,value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue
    if(value===false&&HTML_BOOLEAN_ATTRIBUTES.has(key))continue
    if (key.startsWith('data-') || key === 'lang') result.push(`shared-${key}`,`shared-${key}-${String(value).replace(/[^\w-]/g,'-')}`)
    result.push(`shared-attr-${key}`,`shared-attr-${key}-${String(value).replace(/[^\w-]/g,'-')}`)
    if (key === 'aria-current' && (['page','true','location','step'].includes(value) || value === true)) result.push('shared-current')
    if (key === 'aria-pressed' && (value === true || value === 'true')) result.push('shared-selected')
    if (key === 'aria-expanded' && (value === true || value === 'true')) result.push('shared-expanded')
    if (key === 'data-active' && value) result.push('shared-selected')
    if (key === 'data-state') result.push(`shared-state-${value}`)
    if (key === 'data-map-state') result.push(`shared-map-${value}`)
    if (key === 'data-focused' && value) result.push('shared-focused')
  }
  return result.join(' ')
}
export function nativeAssetUrl(value) {
  if (!value || !String(value).startsWith('/') || String(value).startsWith('/assets/')) return value
  return `https://stats.fries-cup.com${value}`
}
