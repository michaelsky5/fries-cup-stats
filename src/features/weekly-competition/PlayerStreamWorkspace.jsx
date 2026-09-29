import { useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { accountRequestError } from '../auth/accountRequestError.js'
import styles from './WeeklyCompetitionWorkspace.module.css'
const STATUS = { PENDING_REVIEW: '等待审核', APPROVED: '已展示', REJECTED: '需要调整', WITHDRAWN: '已撤回' }
export default function PlayerStreamWorkspace({ seasonId }) {
  const [data,setData] = useState(null), [form,setForm] = useState({platform:'哔哩哔哩',url:'',delaySeconds:120,titleSuggestion:'',delayConfirmed:false})
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('')
  const lock = useRef(false)
  const [refresh,setRefresh]=useState(0)
  useEffect(() => {
    let active=true
    setData(null); setError('')
    platformRequest('/me/player-stream?seasonId='+encodeURIComponent(seasonId)).then(value => {
      if (!active) return
      setData(value)
      setForm({platform:value.application?.platform || '哔哩哔哩',url:value.application?.url || '',delaySeconds:value.application?.delaySeconds || 120,titleSuggestion:value.application?.titleSuggestion || value.suggestedTitle,delayConfirmed:false})
    }).catch(failure => { if(active) setError(accountRequestError(failure,'选手直播申请')) })
    return () => {active=false}
  },[seasonId,refresh])
  const update = patch => { setForm(current=>({...current,...patch}));setNotice('') }
  async function save(withdraw=false) {
    if (lock.current || !data) return
    lock.current=true;setBusy(true);setError('');setNotice('')
    try {
      const input={seasonId,expectedRevision:data.application?.revision || 0}
      const result=await platformRequest(withdraw ? '/me/player-stream/withdraw' : '/me/player-stream',{method:withdraw?'POST':'PUT',body:withdraw?input:{...input,...form,delaySeconds:Number(form.delaySeconds)}})
      setData(current=>({...current,application:result.application}))
      setNotice(withdraw?'展示已撤回。':'展示申请已提交，审核通过后会出现在选手页面。')
    } catch(failure) {setError(failure.data?.message || accountRequestError(failure,'直播申请'))}
    finally {lock.current=false;setBusy(false)}
  }
  return <section className={`${styles.card} ${styles.streamCard}`}><header><h2>选手直播展示</h2><strong>{data?.application ? STATUS[data.application.status] : '申请展示'}</strong></header>
    <p>在赛事中心展示你的第一视角直播间。按 V3.0，比赛直播须设置至少 120 秒延迟。直播标题建议带上「薯条杯周赛」，便于观众识别；此建议不作为审核条件。</p>
    {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>重新读取服务器内容</button></p>}{notice && <p role="status">{notice}</p>}
    {data?.application?.reviewNote && <p>审核说明：{data.application.reviewNote}</p>}
    {data && <form className={`${styles.responseForm} ${styles.streamForm}`} onSubmit={event=>{event.preventDefault();save()}}>
      <label>平台<input required maxLength={40} value={form.platform} onChange={event=>update({platform:event.target.value})} disabled={busy}/></label>
      <label>直播间链接<input type="url" required placeholder="https://…" maxLength={1200} value={form.url} onChange={event=>update({url:event.target.value})} disabled={busy}/></label>
      <label>延迟秒数<input type="number" required min={120} max={3600} value={form.delaySeconds} onChange={event=>update({delaySeconds:event.target.value})} disabled={busy}/></label>
      <label className={styles.streamWide}>建议标题（可选）<input maxLength={120} value={form.titleSuggestion} onChange={event=>update({titleSuggestion:event.target.value})} disabled={busy}/></label>
      <label className={styles.streamDeclaration}><input type="checkbox" required checked={form.delayConfirmed} onChange={event=>update({delayConfirmed:event.target.checked})} disabled={busy}/>我已在直播工具中设置至少 120 秒延迟</label>
      <button disabled={busy || !form.delayConfirmed}>提交展示申请</button>
      {data.application && data.application.status !== 'WITHDRAWN' && <button type="button" disabled={busy} onClick={()=>save(true)}>撤回展示</button>}
      <small className={styles.streamWide}>修改已展示的链接后会重新审核。网页无法替你启用或验证直播延迟，请在导播工具中实际设置。</small>
    </form>}
  </section>
}
