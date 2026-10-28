import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { centerEntryUrl, decodePublicOptions } from '../../shared/centerPaths'

export default function CenterEntry() {
  const [error, setError] = useState('')
  const [options, setOptions] = useState({})
  async function open(params) {
    setError('')
    try { await Taro.redirectTo({ url: centerEntryUrl(params) }) }
    catch (_) { setError('赛事中心暂时无法打开，请重试。') }
  }
  useLoad(params => { const decoded = decodePublicOptions(params); setOptions(decoded); return open(decoded) })
  return <div className='shared-root'><div className='shared-state'><p>{error || '正在打开赛事中心…'}</p>{error ? <button onClick={() => open(options)}>重新打开</button> : null}</div></div>
}
