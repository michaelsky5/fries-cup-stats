import Taro from '@tarojs/taro'
import { createPublicScheduleReader, formatRequestDiagnostic, requestWithDeadline } from './shared/publicScheduleReader'
import { centerUrl } from './shared/centerRoutes'
import { createCenterNavigation } from './shared/centerNavigation'
import { getSeasonById, SEASON_STORAGE_KEY } from './shared/publicSeasons'
import { createPublicSeasonReader } from './shared/publicSeasonReader'
import { configureLocaleStorage } from './shared/nativeLocales'
export { centerUrl }
export function openNativeAccount() {
  const options = { url: '/account/pages/index' }
  return Taro.getCurrentPages().length >= 8 ? Taro.redirectTo(options) : Taro.navigateTo(options)
}

// Keep platform transport separate from the shared Stats UI/model. Native
// callbacks give the phone a RequestTask without an SDK interceptor/Promise.
const requestPublic = process.env.TARO_ENV === 'weapp'
  ? options => wx.request(options)
  : options => Taro.request(options)

export const readPublicSchedule = createPublicSeasonReader({ request: requestPublic, origin: process.env.TARO_ENV === 'h5' ? '' : 'https://admin.fries-cup.com' })
export function storedSeasonId() { try { return getSeasonById(Taro.getStorageSync(SEASON_STORAGE_KEY)).id } catch (_) { return 'FCW26' } }
export async function changeSeason(id, view = 'overview') {
  const season = getSeasonById(id)
  await Taro.reLaunch({ url: centerUrl({ view, season: season.id }) })
  try { Taro.setStorageSync(SEASON_STORAGE_KEY, season.id) } catch (_) { /* Selection works without storage. */ }
}
export async function checkPublicConnection() {
  if (process.env.TARO_ENV !== 'weapp') return ''
  const startedAt = Date.now()
  try {
    const response = await requestWithDeadline(requestPublic, {
      url: 'https://admin.fries-cup.com/api/health',
      method: 'GET', dataType: 'json'
    }, 5000)
    if (response.statusCode !== 200 || response.data?.status !== 'ok' || response.data?.service !== 'fries-cup-api') return '服务器连接检测未通过。'
    return `服务器连接正常（HTTP 200，${((Date.now() - startedAt) / 1000).toFixed(1)} 秒）。`
  } catch (failure) {
    return `服务器连接检测失败：${formatRequestDiagnostic(failure.diagnostic) || failure.message}`
  }
}
export function changeMatch(id, context) {
  return openCenter({ id }, context)
}
export function openCenter(params, context) {
  const options = { url: centerUrl(params, context) }
  return Taro.getCurrentPages().length >= 8 ? Taro.redirectTo(options) : Taro.navigateTo(options)
}
const centerNavigation = createCenterNavigation({
  getPages: () => Taro.getCurrentPages(),
  navigateBack: options => Taro.navigateBack(options),
  reLaunch: options => Taro.reLaunch(options)
})
export function switchCenter(view, context) { return centerNavigation.switchTo(view, context) }
export function takeCenterVisit() { return centerNavigation.takeVisit() }
export function backToCenter(view, context) {
  return Taro.getCurrentPages().length > 1 ? Taro.navigateBack() : switchCenter(view, context)
}
export function scrollToTop() { return Taro.pageScrollTo({ scrollTop: 0, duration: 0 }) }
export function finishPullDownRefresh() {
  if (process.env.TARO_ENV === 'weapp') Taro.stopPullDownRefresh()
}
export const followingStorage = {
  get: key => Taro.getStorageSync(key),
  set: (key, value) => Taro.setStorageSync(key, value)
}
export function copyPublicLink(url) { return Taro.setClipboardData({ data: url }) }
export function backToSchedule(context = {}) {
  if (Taro.getCurrentPages().length > 1) return Taro.navigateBack()
  return switchCenter('matches', context)
}
export function captureRuntime(info) {
  try {
    if (process.env.TARO_ENV === 'h5') window.__sharedScheduleQA = info
    else Taro.getApp().__sharedScheduleQA = info
  } catch (_) { /* Diagnostics never affect rendering. */ }
}

configureLocaleStorage(followingStorage)
