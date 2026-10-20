import { useEffect, useState } from 'react'
import { publicSupportView } from './supportModel.js'

export function usePublicSupport(seasonId,cycleId='') {
  const scope=seasonId+':'+cycleId
  const [state,setState]=useState({scope,loading:true,data:null,error:false})
  const [attempt,setAttempt]=useState(0)
  useEffect(()=>{
    let alive=true,controller,timer,generation=0
    setState({scope,loading:true,data:null,error:false})
    async function load() {
      const version=++generation
      controller?.abort();const current=new AbortController();controller=current
      const timeout=setTimeout(()=>current.abort(),15000)
      try {
        const url=`/api/admin-public/seasons/${encodeURIComponent(seasonId)}/support${cycleId?'?cycleId='+encodeURIComponent(cycleId):''}`
        const response=await fetch(url,{signal:current.signal,cache:'no-store',credentials:'omit'})
        if(!response.ok)throw new Error('SUPPORT_UNAVAILABLE')
        const data=publicSupportView(await response.json(),seasonId)
        if(alive && version===generation)setState({scope,loading:false,data,error:false})
      }catch{if(alive && version===generation)setState({scope,loading:false,data:null,error:true})}
      finally{clearTimeout(timeout);if(alive && version===generation)timer=setTimeout(()=>{if(document.visibilityState==='visible')void load()},30000)}
    }
    const visible=()=>{if(document.visibilityState==='visible'){clearTimeout(timer);void load()}}
    void load();document.addEventListener('visibilitychange',visible)
    return ()=>{alive=false;generation++;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visible)}
  },[seasonId,cycleId,attempt,scope])
  return {...(state.scope===scope?state:{loading:true,data:null,error:false}),retry:()=>setAttempt(n=>n+1)}
}
