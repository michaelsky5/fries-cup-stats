import { createContext, useContext } from 'react'
import Taro from '@tarojs/taro'
import { nativeCopy } from '../shared/nativeCopy.js'
const Context = createContext(null)
export const ClassicProvider = Context.Provider
export function useOutletContext() { return useContext(Context) }
export function useNavigate() { return useContext(Context).navigate }
export const withSeason = path => path
export const getInitialSeasonId = () => ''
export function classicNotice(error) { return Taro.showModal({ title: nativeCopy('经典经理'), content: nativeCopy(error?.message || String(error)), showCancel: false }) }
export function nativeClassicAction(action) {
  return (...args) => {
    try {
      const result = action(...args)
      if (result?.catch) return result.catch(classicNotice)
      return result
    } catch (error) { return classicNotice(error) }
  }
}
export function scrollClassic(ref) {
  const node = ref?.current || ref
  const selector = typeof ref === 'string' ? ref : node?.id && '#' + node.id
  if (selector) return Taro.pageScrollTo({selector, duration:200}).catch(() => undefined)
}
