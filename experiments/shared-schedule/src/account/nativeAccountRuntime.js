import Taro from '@tarojs/taro'
import { createNativeAccountClient } from './nativeAccountClient.js'
export const accountPreviewLabel = ''

export const nativeAccount = createNativeAccountClient({
  request: options => process.env.TARO_ENV === 'weapp' ? wx.request(options) : Taro.request(options),
  login: options => process.env.TARO_ENV === 'weapp' ? wx.login(options) : Taro.login(options),
  storage: {
    get: key => Taro.getStorageSync(key),
    set: (key, value) => Taro.setStorageSync(key, value),
    remove: key => Taro.removeStorageSync(key)
  }
})
