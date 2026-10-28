import Taro from '@tarojs/taro'
import { createNativeAccountClient } from './nativeAccountClient.js'
import { createNativePrivacyGuard, invokeNativePrivacyApi } from './nativePrivacy.js'
export const accountPreviewLabel = ''
export const authorizeNativeAccountPrivacy = createNativePrivacyGuard({
  getSetting: typeof Taro.getPrivacySetting === 'function' ? options => Taro.getPrivacySetting(options) : null,
  authorize: typeof Taro.requirePrivacyAuthorize === 'function' ? options => Taro.requirePrivacyAuthorize(options) : null
})
export const openNativePrivacyPolicy = () => typeof Taro.openPrivacyContract === 'function' ? invokeNativePrivacyApi(options => Taro.openPrivacyContract(options), 8000) : Promise.reject(new Error('请更新微信后查看隐私保护指引。'))

export const nativeAccount = createNativeAccountClient({
  request: options => process.env.TARO_ENV === 'weapp' ? wx.request(options) : Taro.request(options),
  login: options => process.env.TARO_ENV === 'weapp' ? wx.login(options) : Taro.login(options),
  storage: {
    get: key => Taro.getStorageSync(key),
    set: (key, value) => Taro.setStorageSync(key, value),
    remove: key => Taro.removeStorageSync(key)
  }
})
