import { useEffect, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { startVisiblePolling } from '../../lib/visiblePolling.js'
export default function PublicPlayerStream({ seasonId, playerId }) {
  const [streams,setStreams]=useState([])
  useEffect(()=>{
    let current=true
    setStreams([])
    if (!seasonId || !playerId) return
    const refresh=async({signal})=>{
      try {const data=await platformRequest('/public/seasons/'+encodeURIComponent(seasonId)+'/player-streams',{signal});if(current)setStreams(data.streams || [])}
      catch (error) {if(current)setStreams([]);throw error}
    }
    const polling=startVisiblePolling(refresh,{intervalMs:60000})
    return()=>{current=false;polling.stop()}
  },[seasonId,playerId])
  const stream=streams.find(item=>item.playerId===playerId)
  return stream ? <aside aria-label="选手直播"><strong>选手第一视角</strong> · <a href={stream.url} target="_blank" rel="noreferrer">{stream.platform} 直播间 ↗</a><small> 选手已声明设置 {stream.delaySeconds} 秒延迟；直播状态以平台为准。</small></aside> : null
}
