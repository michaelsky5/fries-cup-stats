import { useEffect, useRef, useState } from 'react'
import { platformRequest } from '../auth/platformApi.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import styles from '../../pages/account/AccountSettingsPage.module.css'

const labels = { PENDING: '等待管理员审核', APPROVED: '已通过', REJECTED: '已退回', WITHDRAWN: '已撤回' }

export default function BattleTagChangePanel({ onDirtyChange }) {
  const { clearRevokedSession } = useAuth()
  const [record, setRecord] = useState(null), [attempt, setAttempt] = useState(0)
  const [newBattleTag, setNewBattleTag] = useState(''), [reason, setReason] = useState(''), [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null)
  const locked = useRef(false)
  const dirty = Boolean(newBattleTag || reason || evidence)
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    platformRequest('/me/battletag-changes', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setRecord(data) })
      .catch(error => { if (!controller.signal.aborted) { if (error.status === 401) clearRevokedSession(); setNotice({ tone: 'error', text: error.message || '无法读取战网 ID，请稍后重试。' }) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, clearRevokedSession])
  const pending = record?.requests?.find(row => row.status === 'PENDING')
  async function act(withdraw = false) {
    if (locked.current) return
    locked.current = true; setBusy(true); setNotice(null)
    try {
      await platformRequest(withdraw ? `/me/battletag-changes/${encodeURIComponent(pending.id)}/withdraw` : '/me/battletag-changes', {
        method: 'POST', body: withdraw ? { expectedRevision: pending.revision } : { newBattleTag: newBattleTag.trim(), reason: reason.trim(), evidence: evidence.trim() }
      })
      setNewBattleTag(''); setReason(''); setEvidence(''); setAttempt(value => value + 1)
      setNotice({ tone: 'success', text: withdraw ? '申请已撤回，原战网 ID 继续生效。' : '申请已提交，等待管理员审核。通过前请继续使用原战网 ID 参赛。' })
    } catch (error) { if (error.status === 401) clearRevokedSession(); setNotice({ tone: 'error', text: error.message || '操作未完成，请重新读取核对。' }) }
    finally { locked.current = false; setBusy(false) }
  }
  return <section id="battletag" className={styles.card} aria-labelledby="battletag-title">
    <header className={styles.cardHeader}><h2 id="battletag-title" tabIndex={-1}>战网 ID</h2><p>更改已关联的游戏 ID 需要管理员审核，通过前原 ID 继续生效。</p></header>
    <div className={styles.cardBody}>
      {notice && <p className={styles.notice} data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      {loading ? <p role="status">正在读取战网 ID…</p> : !record ? <button type="button" className={styles.secondary} onClick={() => { setNotice(null); setAttempt(value => value + 1) }}>重新读取</button> : <>
        <div className={styles.securityImpact}><strong>当前生效的战网 ID</strong><p className={styles.battleTagValue} data-i18n-ignore>{record.currentBattleTag || '尚未关联选手身份'}</p></div>
        {pending ? <div className={styles.emailChange}><h3>等待管理员审核</h3><p className={styles.battleTagValue} data-i18n-ignore>{pending.oldBattleTag} → {pending.newBattleTag}</p><p className={styles.hint}>审核结果会显示在本页。需要修改申请时，先撤回再重新提交。</p><button className={styles.secondary} type="button" disabled={busy} onClick={() => act(true)}>{busy ? '正在处理…' : '撤回申请'}</button></div>
          : record.canRequest ? <form className={styles.emailChange} onSubmit={event => { event.preventDefault(); act() }}>
            <fieldset className={styles.fields} disabled={busy}>
              <label className={styles.wide}>新的完整战网 ID<input autoComplete="off" value={newBattleTag} onChange={event => setNewBattleTag(event.target.value)} placeholder="Player#12345" pattern="[^\s#]+#[0-9]+" maxLength={120} required /><small className={styles.fieldHint}>包含 # 后的数字；账号昵称和选手显示名称不受影响。</small></label>
              <label>改名原因<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={2} maxLength={1000} rows={3} required /></label>
              <label>核对依据<textarea value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="提供新旧 ID 的关联说明或可查看的截图链接，供管理员核对。" minLength={2} maxLength={2000} rows={3} required /></label>
            </fieldset>
            <div className={styles.saveBar}><p className={styles.hint}>只更改战网 ID；队伍、历史成绩和积分保留。</p><button className={styles.primary} type="submit" disabled={busy}>{busy ? '正在提交…' : '提交改名申请'}</button></div>
          </form> : <p className={styles.hint}>{record.unavailableReason || '关联有效的选手身份后，可在这里申请更改战网 ID。'}</p>}
        {record.requests?.length > 0 && <details className={styles.emailChange}><summary>改名记录</summary>{record.requests.map(row => <div key={row.id} className={styles.securityImpact}><strong>{labels[row.status] || row.status}</strong><p className={styles.battleTagValue} data-i18n-ignore>{row.oldBattleTag} → {row.newBattleTag}</p>{row.reviewNote && <p className={styles.battleTagValue}>审核说明：{row.reviewNote}</p>}</div>)}</details>}
      </>}
    </div>
  </section>
}
