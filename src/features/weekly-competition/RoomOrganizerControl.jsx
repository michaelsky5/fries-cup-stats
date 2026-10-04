import { useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './WeeklyLiveRoomPage.module.css'
import controls from './RoomPreparationControl.module.css'
export default function RoomOrganizerControl({data,disabled,mutate}) {
  const locale=useUiLocale(),{liveRoomWrite}=useRoomTransport()
  const [action,setAction]=useState('TIMING'),[reason,setReason]=useState(''),[openEarly,setOpenEarly]=useState(false),[seconds,setSeconds]=useState(600),[retain,setRetain]=useState(true),[statements,setStatements]=useState({A:'',B:''})
  const pending=useRef(null)
  if(data.simulation || !data.access.administrator || !['PENDING','IN_PROGRESS'].includes(data.match.status))return null
  return <details><summary>{uiText('赛事组裁定与时限例外',locale)}</summary><form className={controls.form} onSubmit={async event=>{
    event.preventDefault()
    pending.current ||= {action,reason:reason.trim(),matchRevision:data.match.revision,draftRevision:data.draftRevision,openingRevision:data.opening?.revision||0,clientKey:crypto.randomUUID(),...(action==='TIMING'?{openEarly,extensionSeconds:Number(seconds)}:{}),...(action==='REMATCH'?{retainSetup:retain,statementA:statements.A.trim(),statementB:statements.B.trim()}: {})}
    const saved=await mutate(async()=>{try{return await liveRoomWrite(data.match.id,'/rulings',pending.current)}catch(error){if(error.status&&error.status<500)pending.current=null;throw error}},uiText('裁定已记录并向双方公布。',locale))
    if(saved){pending.current=null;setReason('')}
  }} onChange={()=>{pending.current=null}}>
    <label>{uiText('裁定事项',locale)}<select disabled={disabled} value={action} onChange={event=>setAction(event.target.value)}><option value="TIMING">{uiText('提前开放或延长总准备时间',locale)}</option><option value="PUBLIC_FAULT_BEGIN">{uiText('公共故障 · 暂停准备计时',locale)}</option><option value="PUBLIC_FAULT_END">{uiText('公共故障结束 · 恢复计时',locale)}</option>{['LIVE','COMPLETE'].includes(data.map?.status)&&<option value="REMATCH">{uiText('公共故障 · 当前图重赛',locale)}</option>}</select></label>
    {action==='TIMING'&&<><label className={controls.checkbox}><input type="checkbox" checked={openEarly} onChange={event=>setOpenEarly(event.target.checked)}/>{uiText('允许本场提前开放',locale)}</label><label>{uiText('延长总准备时间（秒）',locale)}<input type="number" min="0" max="7200" step="60" value={seconds} onChange={event=>setSeconds(event.target.value)}/></label></>}
    {action==='REMATCH'&&<><p>{uiText('原图将保留为失效记录，不计有效地图和选手统计；同一图重新进行。由赛事组裁定，对方不同意不构成否决。',locale)}</p>{['A','B'].map(side=><label key={side}>{data.match['team'+side].shortName} · {uiText('双方陈述记录',locale)}<textarea required maxLength={1000} value={statements[side]} onChange={event=>setStatements(current=>({...current,[side]:event.target.value}))}/></label>)}<label className={controls.checkbox}><input type="checkbox" checked={retain} onChange={event=>setRetain(event.target.checked)}/>{uiText('保留已公布的首发与 Ban（取消则重新确认）',locale)}</label></>}
    <label>{uiText('公开裁定依据',locale)}<textarea required minLength={3} maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)}/></label><p>{uiText('实际游戏操作仍由赛管或主队执行；此处记录赛事组裁定并同步房间。',locale)}</p><button className={styles.primary} disabled={disabled||reason.trim().length<3}>{uiText('确认裁定并向双方公布',locale)}</button>
  </form></details>
}
