import { useEffect, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
export default function PublicPlayerStream({ seasonId, playerId }) {
  const [streams,setStreams]=useState([])
  useEffect(()=>{
    let current=true, pending=false
    const controller=new AbortController()
    setStreams([])
    const refresh=async()=>{
      if(!seasonId || !playerId || pending || document.hidden)return
      pending=true
      try {const data=await platformRequest('/public/seasons/'+encodeURIComponent(seasonId)+'/player-streams',{signal:controller.signal});if(current)setStreams(data.streams || [])}
      catch {if(current)setStreams([])}
      finally{pending=false}
    }
    refresh()
    const interval=setInterval(refresh,60000)
    document.addEventListener('visibilitychange',refresh)
    return()=>{current=false;controller.abort();clearInterval(interval);document.removeEventListener('visibilitychange',refresh)}
  },[seasonId,playerId])
  const stream=streams.find(item=>item.playerId===playerId)
  return stream ? <aside aria-label="选手直播"><strong>选手第一视角</strong> · <a href={stream.url} target="_blank" rel="noreferrer">{stream.platform} 直播间 ↗</a><small> 选手已声明设置 {stream.delaySeconds} 秒延迟；直播状态以平台为准。</small></aside> : null
}
