import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { AuthDialog } from '../auth/AuthDialog.jsx'
import { createUserFeedback, fetchUserFeedback } from '../auth/userDataApi.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { buildMatchFeedbackPayload, getMatchFeedbackContext, isFeedbackOutcomeUnknown, isMatchingFeedback, MATCH_FEEDBACK_ISSUES } from './matchFeedbackModel.js'
import styles from './MatchDataFeedback.module.css'

function FeedbackDialog({ dossier, seasonId, initialMap, locale, onClose, returnFocusRef }) {
  const en = locale === 'en-US'
  const label = (zh, english) => en ? english : uiText(zh, locale)
  const { user, isAuthenticated, isBootstrapping, clearRevokedSession } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [form, setForm] = useState({ mapOrder: initialMap || '', issueType: 'PLAYER_STATS', description: '' })
  const [state, setState] = useState('editing')
  const [error, setError] = useState('')
  const [record, setRecord] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const dialog = useRef(null)
  const requestLock = useRef(false)
  const lastPayload = useRef(null)
  const currentUser = useRef(user?.id)
  useEffect(() => { currentUser.current = user?.id; setHistory(null) }, [user?.id])
  useEffect(() => {
    const node = dialog.current
    if (!node) return undefined
    if (!authOpen && !node.open) { node.showModal(); node.querySelector('textarea')?.focus() }
    if (authOpen && node.open) node.close()
    return () => { if (node.open) node.close() }
  }, [authOpen])
  useEffect(() => () => { returnFocusRef?.current?.focus() }, [returnFocusRef])

  const context = getMatchFeedbackContext(dossier, seasonId, form.mapOrder)
  const busy = state === 'submitting' || state === 'checking'
  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); setError('') }
  const submit = async event => {
    event.preventDefault()
    if (requestLock.current || state === 'unconfirmed') return
    if (!isAuthenticated) { setAuthOpen(true); return }
    let payload
    try { payload = buildMatchFeedbackPayload(dossier, seasonId, form) } catch {
      setError(label('请填写至少 5 个字，并控制在字数上限内。', 'Enter at least 5 characters within the limit.'))
      return
    }
    payload.clientKey = isMatchingFeedback({ ...lastPayload.current, id: 'draft' }, payload)
      ? lastPayload.current.clientKey : crypto.randomUUID()
    requestLock.current = true
    lastPayload.current = payload
    const submittedBy = user.id
    setState('submitting')
    setError('')
    try {
      const saved = await createUserFeedback(payload)
      if (!isMatchingFeedback(saved, payload)) throw new Error('UNCONFIRMED_RESPONSE')
      if (currentUser.current !== submittedBy) { setState('unconfirmed'); return }
      setRecord(saved)
      setState('submitted')
    } catch (cause) {
      if (cause.status === 401) {
        clearRevokedSession()
        setState('editing')
        setError(label('登录已过期，草稿已保留。请重新登录后提交。', 'Your session expired. Sign in again to submit your saved draft.'))
      } else if (isFeedbackOutcomeUnknown(cause)) {
        setState('unconfirmed')
        setError(label('提交结果尚未确认，草稿已保留。请先核对记录，再决定是否重试。', 'The submission result is unconfirmed. Check your reports before retrying. Your draft is retained.'))
      } else {
        setState('editing')
        setError(label('提交失败，草稿已保留，请稍后重试。', 'Submission failed. Your draft is retained; please retry later.'))
      }
    } finally { requestLock.current = false }
  }
  const check = async () => {
    if (requestLock.current) return
    if (!isAuthenticated) { setAuthOpen(true); return }
    const checkedBy = user.id
    requestLock.current = true
    setState('checking')
    try {
      const reports = await fetchUserFeedback(lastPayload.current.targetId)
      if (currentUser.current !== checkedBy) { setState('unconfirmed'); return }
      const saved = reports.find(item => isMatchingFeedback(item, lastPayload.current))
      if (saved) { setRecord(saved); setState('submitted'); setError('') }
      else { setState('editing'); setError(label('暂未查到这条反馈，草稿已保留，可以重试。', 'This report was not found. Your draft is retained and you can retry.')) }
    } catch { setState('unconfirmed'); setError(label('核对失败，请稍后再核对。草稿已保留。', 'Could not check your reports. Try checking again later; your draft is retained.')) }
    finally { requestLock.current = false }
  }
  const readHistory = async () => {
    if (historyLoading) return
    if (!isAuthenticated) { setAuthOpen(true); return }
    const checkedBy = user.id
    setHistoryLoading(true); setHistoryError('')
    try {
      const reports = await fetchUserFeedback(context.targetId)
      if (currentUser.current === checkedBy) setHistory(reports)
    } catch { setHistoryError(label('反馈记录读取失败，请稍后重试。', 'Could not load your reports. Please retry later.')) }
    finally { setHistoryLoading(false) }
  }
  const historyStatuses = { OPEN: label('待核对', 'Open'), TRIAGED: label('已受理', 'Triaged'), FIXING: label('修正中', 'Fixing'), RESOLVED: label('已解决', 'Resolved'), REJECTED: label('未采纳', 'Rejected'), DUPLICATE: label('重复反馈', 'Duplicate') }

  return createPortal(<>
    <dialog ref={dialog} data-design="signal" data-match-feedback className={styles.dialog} aria-labelledby="match-feedback-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
      <header className={styles.header}><div><span data-deco-en>FRIES CUP / DATA</span><h2 id="match-feedback-title">{label('数据错误反馈', 'Report a data error')}</h2></div><button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label={label('关闭反馈', 'Close feedback')}>×</button></header>
      <div className={styles.context}><strong>{dossier.teamA.short} vs {dossier.teamB.short}</strong><span>{dossier.displayCode}</span></div>
      {state === 'submitted' ? <div className={styles.success} role="status"><strong>{label('反馈已提交', 'Report submitted')}</strong><p>{label('已进入数据核对队列，工作人员会检查你指出的错误。', 'Your report is in the data review queue for staff to check.')}</p><small>{label('反馈编号', 'Report ID')}：{record.id}</small><button type="button" onClick={onClose}>{label('完成', 'Done')}</button></div> : <form onSubmit={submit}>
        <div className={styles.fields}>
          <label><span>{label('反馈范围', 'Scope')}</span><select value={form.mapOrder} disabled={busy || state === 'unconfirmed'} onChange={event => update('mapOrder', event.target.value)}><option value="">{label('整场比赛', 'Whole match')}</option>{dossier.mapRecords.map(map => <option key={map.order} value={map.order}>{map.orderLabel} · {map.name}</option>)}</select></label>
          <label><span>{label('错误类型', 'Error type')}</span><select value={form.issueType} disabled={busy || state === 'unconfirmed'} onChange={event => update('issueType', event.target.value)}>{MATCH_FEEDBACK_ISSUES.map(issue => <option key={issue.value} value={issue.value}>{label(issue.zh, issue.en)}</option>)}</select></label>
        </div>
        <label className={styles.description}><span>{label('错误内容', 'What is incorrect?')}</span><textarea autoFocus required minLength={5} maxLength={context.maximumDescriptionLength} rows={5} disabled={busy || state === 'unconfirmed'} value={form.description} onChange={event => update('description', event.target.value)} placeholder={label('例如：第 3 图，某位选手的治疗量有误。请写明现在显示的值、正确值和核对依据（如战报或截图链接）。', 'For example: a player’s healing on map 3 is incorrect. Include the displayed value, correct value, and supporting report or screenshot link.')} /><small>{form.description.length} / {context.maximumDescriptionLength}</small></label>
        <p className={styles.hint}>{label('自动附上比赛编号、地图和页面地址，方便核对。', 'The match ID, selected map, and page address are included automatically.')}</p>
        {!isAuthenticated ? <p className={styles.hint}>{label('提交需登录普通薯条杯账号，登录后会回到此处，保留已填写内容。', 'Sign in with a Fries Cup account to submit. Your draft will stay here.')}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <footer className={styles.actions}><button type="button" onClick={onClose} disabled={busy}>{label('取消', 'Cancel')}</button>{state === 'unconfirmed' || state === 'checking' ? <button className={styles.primary} type="button" onClick={check} disabled={busy}>{state === 'checking' ? label('正在核对…', 'Checking…') : label('核对提交结果', 'Check submission')}</button> : <button className={styles.primary} type="submit" disabled={busy || isBootstrapping}>{state === 'submitting' ? label('正在提交…', 'Submitting…') : isAuthenticated ? label('提交反馈', 'Submit report') : label('登录并继续', 'Sign in to continue')}</button>}</footer>
      </form>}
      <div className={styles.history}><button type="button" disabled={busy || historyLoading} onClick={readHistory}>{historyLoading ? label('正在读取…', 'Loading…') : label('查看我的本场反馈', 'My reports for this match')}</button>{historyError ? <p role="alert">{historyError}</p> : null}{history ? <div role="status">{history.length ? history.map(item => <details key={item.id}><summary>{historyStatuses[item.status] || item.status} · {new Date(item.createdAt).toLocaleDateString(en ? 'en-US' : 'zh-CN')}</summary><p>{item.description}</p>{item.adminReply ? <p><strong>{label('处理说明', 'Staff reply')}：</strong>{item.adminReply}</p> : null}</details>) : <p>{label('你还没有提交本场反馈。', 'You have no reports for this match yet.')}</p>}</div> : null}</div>
    </dialog>
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} locale={locale} />
  </>, document.body)
}

export default function MatchDataFeedback({ dossier, seasonId, locale, mapOrder, isPreview }) {
  const [open, setOpen] = useState(false)
  const entryRef = useRef(null)
  if (isPreview) return null
  return <><button ref={entryRef} type="button" data-match-feedback-entry onClick={() => setOpen(true)}>{locale === 'en-US' ? 'Report data error' : uiText('数据错误反馈', locale)}</button>{open ? <FeedbackDialog dossier={dossier} seasonId={seasonId} initialMap={mapOrder} locale={locale} onClose={() => setOpen(false)} returnFocusRef={entryRef} /> : null}</>
}
