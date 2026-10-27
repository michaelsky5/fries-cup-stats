import { getActiveLocale } from './nativeLocales.js'
import catalog from '../generated/seasons.js'
import { isReviewReady } from '../../../../src/lib/reviewReadiness.js'
import { translateUiText } from '../../../../src/lib/uiText.js'

export const SEASONS = catalog
export { getSeasonEventKind,getSeasonEventGroups } from '../generated/seasonGroups.js'
export const DEFAULT_SEASON_ID = 'FCW26'
export const SEASON_STORAGE_KEY = 'friescup:active-season:v1'
export function getSeasonById(id = DEFAULT_SEASON_ID) {
  return catalog.find(item => [item.id, item.publicCode].includes(String(id).toUpperCase())) || catalog.find(item => item.id === DEFAULT_SEASON_ID)
}
export function getSeasonName(season, locale) { const language = locale || getActiveLocale(); const name = season?.name?.[language === 'en-US' ? 'en' : language === 'ko-KR' ? 'ko' : language === 'zh-TW' ? 'tw' : 'zh'] || season?.name?.zh || season?.name || '公开赛事'; return translateUiText(name, language) }
export function getSeasonRules(season, db) {
  const rules = db?.meta?.rules || db?.season?.rules || db?.meta?.season_rules
  return { ...(season?.rules || {}), ...(rules && typeof rules === 'object' ? rules : {}) }
}
export function seasonHasReview(season, db) { return isReviewReady(season, db) }
export function isWeeklySeason(season) { return season?.competitionFormat === 'WEEKLY' }
export function resolveSeasonFromUrl(id){return catalog.find(item=>[item.id,item.publicCode].includes(String(id).toUpperCase()))?.id||null}
export function withSeason(path,seasonId,search=''){const [pathname,existing='']=String(path).split('?');const query=new URLSearchParams(existing);const context=new URLSearchParams(search);for(const key of ['lang','design'])if(context.has(key)&&!query.has(key))query.set(key,context.get(key));query.set('season',getSeasonById(seasonId).id);return pathname+'?'+query.toString()}
