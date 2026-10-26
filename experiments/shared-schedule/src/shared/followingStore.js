export const FOLLOWING_KEY = 'friescup:FCW26:following:v1'
const uniqueIds = values => [...new Set((Array.isArray(values) ? values : []).filter(id => typeof id === 'string' && id.length > 0 && id.length < 160))].slice(0, 500)
export const followingKey = season => `friescup:${season || 'FCW26'}:following:v1`
export function emptyFollowing(season = 'FCW26') { return { version: 1, season, teams: [], players: [] } }
export function decodeFollowing(value, season = 'FCW26') {
  if (!value) return emptyFollowing(season)
  const data = typeof value === 'string' ? JSON.parse(value) : value
  if (data?.version !== 1 || data?.season !== season || !Array.isArray(data.teams) || !Array.isArray(data.players)) throw new Error('invalid following storage')
  return { version: 1, season, teams: uniqueIds(data.teams), players: uniqueIds(data.players),...(uniqueIds(data.teams).includes(data.primaryTeamId)?{primaryTeamId:data.primaryTeamId}:{}) }
}
export function saveFollowing(storage,current,patch) {
  const next={...current,teams:uniqueIds(patch.teams),players:uniqueIds(patch.players),primaryTeamId:patch.primaryTeamId||null}
  try{storage.set(followingKey(current.season),next);return {data:next,error:''}}
  catch{return {data:current,error:'关注未保存，请检查本机存储空间后重试。'}}
}
export function readFollowing(storage, season = 'FCW26') {
  try { return { data: decodeFollowing(storage.get(followingKey(season)), season), error: '' } }
  catch (_) { return { data: emptyFollowing(season), error: '本机关注记录暂时无法读取。重新关注后可保存新的记录。' } }
}
export function toggleFollowing(storage, current, kind, id) {
  if (!['teams', 'players'].includes(kind) || typeof id !== 'string' || !id) return { data: current, error: '关注资料无法识别。' }
  const existing = current[kind] || []
  const next = { ...current, [kind]: existing.includes(id) ? existing.filter(value => value !== id) : uniqueIds([...existing, id]) }
  try { storage.set(followingKey(current.season), next); return { data: next, error: '' } }
  catch (_) { return { data: current, error: '关注未保存，请检查本机存储空间后重试。' } }
}
