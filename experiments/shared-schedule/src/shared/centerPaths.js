export const CENTER_PATH = '/center/pages/index'
export const PUBLIC_ROUTE_KEYS = ['season', 'lang', 'view', 'cycle', 'week', 'id', 'team', 'player', 'map', 'hero', 'staff', 'story', 'subject', 'role', 'section', 'mapOrder', 'scene', 'topic', 'directory', 'dossierView', 'filters', 'returnTo']
export function publicPageKind(options={}) {
  if(options.id)return 'match'
  if(options.player)return 'player'
  if(options.team)return 'team'
  if(options.story||options.view==='review')return 'review'
  if(options.view==='database')return 'ranking'
  if(options.view==='space')return 'following'
  if(options.view==='roster')return 'directory'
  if(['maps','heroes','staff'].includes(options.view))return 'evidence'
  if(options.view==='advance')return 'advance'
  if(['FCR26','QGCS4','FCA26'].includes(options.season) && (!options.view||options.view==='overview') && !['team','player','map','hero','staff','story'].some(key=>options[key]))return 'archive'
  return 'center'
}
export function centerEntryUrl(options = {}) {
  const query = PUBLIC_ROUTE_KEYS.filter(key => options[key] != null && options[key] !== '').map(key => `${key}=${encodeURIComponent(String(options[key]).slice(0, key==='filters'||key==='returnTo'?1024:512))}`).join('&')
  const kind=publicPageKind(options)
  return (kind==='center'?CENTER_PATH:`/${kind}/pages/index`) + (query ? `?${query}` : '')
}

// Native onLoad keeps percent escapes in query values. Decode exactly once;
// a literal percent in a public name must survive a route round trip.
export function decodePublicOptions(options = {}) {
  return Object.fromEntries(PUBLIC_ROUTE_KEYS.filter(key => options[key] != null).map(key => {
    const raw = String(options[key]).slice(0, 1536)
    try { return [key, decodeURIComponent(raw)] } catch (_) { return [key, raw] }
  }))
}
