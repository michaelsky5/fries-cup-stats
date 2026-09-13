import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useRegistrationDraft } from '../event-registration/registrationDraftGuard.jsx'
import styles from './WeeklyCoordinationPanel.module.css'

const statuses = { OPEN: '待赛管受理', IN_PROGRESS: '赛管处理中', RESOLVED: '已解决' }
const time = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })
const endpoint = '/me/weekly-coordination'

function RequestThread({ record, disabled, busy, mutate }) {
  const uiLocale = useUiLocale()
  const [body, setBody] = useState('')
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID())
  useRegistrationDraft(Boolean(body), { label: uiText("给赛管的补充：{0}", uiLocale, [record.title]), busy, discard: () => setBody('') })
  return <details className={styles.thread}>
    <summary><strong>{record.title}</strong><span data-state={record.status}>{statuses[record.status]}</span><small>{uiText("最近更新 ", uiLocale)}{time(record.updatedAt)} · {record.messages.length}{uiText(" 条记录", uiLocale)}</small></summary>
    <ol>{record.messages.map(message => <li key={message.id} data-staff={message.staff}><header><strong>{message.staff ? uiText("赛管 · ", uiLocale) : uiText("队伍 · ", uiLocale)}{message.author}</strong><time>{time(message.createdAt)}</time></header><p>{message.body}</p>{message.staff && <small>{statuses[message.status]}</small>}</li>)}</ol>
    <form onSubmit={async event => {
      event.preventDefault()
      if (await mutate('/replies', { requestId: record.id, expectedRevision: record.revision, clientKey, body }, 'POST', value => value?.id === record.id, '补充已提交，赛管将在本条记录中回复。')) { setBody(''); setClientKey(crypto.randomUUID()) }
    }}><label>{record.status === 'RESOLVED' ? uiText("问题仍未解决？补充后会重新打开", uiLocale) : uiText("补充说明", uiLocale)}<textarea value={body} onChange={event => { setBody(event.target.value); setClientKey(crypto.randomUUID()) }} required minLength={2} maxLength={2000} disabled={busy} /></label><button disabled={disabled || body.trim().length < 2}>{record.status === 'RESOLVED' ? uiText("重新打开并提交补充", uiLocale) : uiText("提交补充", uiLocale)}</button></form>
  </details>
}

export default function WeeklyCoordinationPanel({ weekId, teamId, matchId, readOnly = false, showPreparation = true, onActivityChange }) {
  const uiLocale = useUiLocale()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID())
  const mounted = useRef(false)
  const locked = useRef(false)
  const sequence = useRef(0)
  const query = new URLSearchParams({ weekId, teamId, ...(matchId ? { matchId } : {}) }).toString()
  useRegistrationDraft(Boolean(title || body), { label: uiText("尚未提交的赛管协助请求", uiLocale), busy, discard: () => { setTitle(''); setBody('') } })
  const refresh = useCallback(async () => {
    const seq = ++sequence.current
    try {
      const value = await platformRequest(`${endpoint}?${query}`)
      if (!mounted.current || seq !== sequence.current) return false
      if (value?.weekId !== weekId || value?.teamId !== teamId || value?.matchId !== (matchId || null) || !Array.isArray(value.requests) || !Array.isArray(value.matches)) throw new Error('站内协作记录返回不完整，请重新同步。')
      setData(value); setError(''); return true
    } catch (failure) {
      if (mounted.current && seq === sequence.current) {
        setError(failure?.status === 404 ? '当前服务尚未开放站内赛前协作，暂时无法提交。' : failure.message || '协作记录未同步，请重试。')
        if ([401, 403].includes(failure.status)) setData(null)
      }
      return false
    } finally { if (mounted.current && seq === sequence.current) setLoading(false) }
  }, [query, weekId, teamId, matchId])
  useEffect(() => {
    mounted.current = true
    refresh()
    const interval = setInterval(() => { if (!locked.current && document.visibilityState === 'visible') refresh() }, 20000)
    const focus = () => { if (!locked.current) refresh() }
    window.addEventListener('focus', focus)
    return () => { mounted.current = false; clearInterval(interval); window.removeEventListener('focus', focus) }
  }, [refresh])
  async function mutate(path, input, method, valid, success) {
    if (locked.current || readOnly || !data?.canWrite || error) return false
    locked.current = true; setBusy(true); setNotice('')
    try {
      const value = await platformRequest(endpoint + path, { method, body: input })
      if (!valid(value)) throw new Error('提交结果尚未确认，请同步后核对记录。')
      if (!mounted.current) return false
      const synced = await refresh()
      if (!mounted.current) return false
      setNotice(synced ? success : '已保存；最新状态尚未同步，请刷新后继续。')
      onActivityChange?.()
      return true
    } catch (failure) {
      if (!mounted.current) return false
      await refresh()
      if (mounted.current) setNotice(failure.status && failure.status < 500 ? failure.message : '提交结果尚未确认。请核对最新记录；内容已保留，重试会使用同一个提交编号。')
      return false
    } finally { locked.current = false; if (mounted.current) setBusy(false) }
  }
  const disabled = readOnly || !data?.canWrite || Boolean(error) || busy || loading
  const match = data?.matches.find(item => item.id === matchId)
  const ownSide = match?.sides.find(side => side.team.id === teamId)
  const openCount = data?.requests.filter(item => item.status !== 'RESOLVED').length || 0
  return <section className={styles.panel} aria-label={matchId ? uiText("站内比赛协作", uiLocale) : uiText("参赛问题与处理记录", uiLocale)} aria-busy={busy || loading}>
    <header className={styles.heading}><h3>{matchId && showPreparation ? uiText("房间与准备", uiLocale) : uiText("参赛问题与处理记录", uiLocale)}</h3><button type="button" disabled={busy || loading} onClick={refresh}>{uiText("同步记录 ↻", uiLocale)}</button></header>
    {loading && !data && <div className={styles.loading} data-preparation={Boolean(matchId && showPreparation)} role="status">{uiText("正在读取站内安排和处理记录…", uiLocale)}</div>}
    {error && <p className={styles.error} role="alert">{error}{data && uiText(" 当前为上次记录，重新同步前不可操作。", uiLocale)}</p>}
    {notice && <p className={styles.receipt} role="status">{notice}</p>}
    {match && showPreparation && <div className={styles.matchSetup}>
      <div className={styles.brief}>
        <span className={styles.kicker}>{uiText("比赛房间", uiLocale)}</span><strong>{match.brief?.roomName || uiText("等待赛管发布", uiLocale)}</strong>
        {match.brief?.roomCode && <div className={styles.roomCode}><span>{uiText("房间口令", uiLocale)}</span><code>{match.brief.roomCode}</code></div>}
        <div className={styles.instructions}><div className={styles.instructionsHeader}><span>{uiText("赛管安排", uiLocale)}</span>{match.brief && <small>{uiText("更新于 ", uiLocale)}{time(match.brief.updatedAt)}</small>}</div><p>{match.brief?.instructions || uiText("赛管尚未补充本场说明。安排发布后会在这里更新。", uiLocale)}</p></div>
      </div>
      <div className={styles.readinessPanel}>
        <h4>{uiText("双方准备状态", uiLocale)}</h4>
        <div className={styles.readiness} aria-label={uiText("双方准备状态", uiLocale)}>{match.sides.map(side => <div key={side.team.id} data-ready={side.ready}><div><strong>{side.team.shortName || side.team.name}</strong>{side.team.id === teamId && <em>{uiText("本队", uiLocale)}</em>}</div><span>{side.ready ? uiText("已准备好", uiLocale) : side.stale ? uiText("安排有变化 · 需重新确认", uiLocale) : uiText("尚未确认准备好", uiLocale)}</span>{side.ready && <small>{uiText("确认于 ", uiLocale)}{time(side.updatedAt)}</small>}</div>)}</div>
        <div className={styles.readyAction}>
          {ownSide?.canConfirm && !readOnly && <p>{match.bothReady ? uiText("双方均已准备好，等待赛管更新比赛状态。", uiLocale) : ownSide?.ready ? uiText("本队准备状态已保存，等待对方和赛管更新。", uiLocale) : uiText("核对房间与出赛队员后，代表本队确认。", uiLocale)}</p>}
          {ownSide?.canConfirm && !readOnly ? <button className={ownSide.ready ? '' : styles.primary} disabled={disabled} onClick={() => mutate('/readiness', { weekId, matchId, teamId, ready: !ownSide.ready, fingerprint: ownSide.fingerprint, expectedRevision: ownSide.revision }, 'PUT', value => value?.id === matchId && value.sides?.some(side => side.team.id === teamId && side.ready === !ownSide.ready), ownSide.ready ? '已撤回本队准备确认，双方和赛管会看到最新状态。' : '本队准备状态已保存，对方和赛管均可查看。')}>{busy ? uiText("正在保存…", uiLocale) : ownSide.ready ? uiText("撤回本队准备确认", uiLocale) : uiText("确认本队已准备好", uiLocale)}</button> : <p className={styles.muted}>{ownSide?.reason || uiText("本队准备状态由队长或经理确认。", uiLocale)}</p>}
        </div>
      </div>
    </div>}
    <div className={styles.support}>
    <details className={styles.help}>
      <summary>{uiText("需要赛管协助 ", uiLocale)}<span>{openCount ? uiText("{0} 项处理中", uiLocale, [openCount]) : uiText("站内提交与跟踪", uiLocale)}</span></summary>
      <p>{uiText("说明遇到的问题，赛管会在本条记录中受理和回复。本队成员可查看记录；提交问题不会自动更改名单、比赛时间或赛果。", uiLocale)}</p>
      <form onSubmit={async event => {
        event.preventDefault()
        if (await mutate('/requests', { weekId, teamId, ...(matchId ? { matchId } : {}), title, body, clientKey }, 'POST', value => value?.id && value.team?.id === teamId && value.weekId === weekId, '问题已提交给本周赛管。回复与最新状态会显示在下方记录中。')) { setTitle(''); setBody(''); setClientKey(crypto.randomUUID()) }
      }}><label>{uiText("问题概述", uiLocale)}<input value={title} onChange={event => { setTitle(event.target.value); setClientKey(crypto.randomUUID()) }} required minLength={2} maxLength={100} disabled={busy} placeholder={uiText("例如：队员无法进入本场房间", uiLocale)} /></label><label>{uiText("具体情况", uiLocale)}<textarea value={body} onChange={event => { setBody(event.target.value); setClientKey(crypto.randomUUID()) }} required minLength={2} maxLength={2000} disabled={busy} placeholder={uiText("说明影响、已尝试的处理方式，以及需要赛管协助的事项。", uiLocale)} /></label><button className={styles.primary} disabled={disabled || title.trim().length < 2 || body.trim().length < 2}>{uiText("提交给本周赛管", uiLocale)}</button></form>
    </details>
    {!!data?.requests.length && <div className={styles.records}><h4>{uiText("处理记录 · ", uiLocale)}{data.requests.length}</h4>{data.requests.map(record => <RequestThread key={record.id} record={record} disabled={disabled} busy={busy} mutate={mutate} />)}</div>}
    </div>
  </section>
}
