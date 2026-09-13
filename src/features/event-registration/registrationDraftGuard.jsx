import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import styles from './SeasonParticipationPage.module.css'
import { ACCOUNT_SIGN_OUT_EVENT } from '../account-ui/accountNavigationGuard.js'

const DraftContext = createContext(null)

function DraftDiscardDialog({ prompt, title, onFinish }) {
  const uiLocale = useUiLocale()
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const returnFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={dialogRef} className={styles.guardDialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onFinish(false) }}>
    <h2 id={titleId}>{prompt.busy ? uiText("正在保存，请稍候", uiLocale) : title}</h2>
    <div id={descriptionId}><p>{prompt.labels.join('、')}</p><p>{prompt.busy ? uiText("操作完成前请留在当前页面。", uiLocale) : uiText("离开或刷新会丢失这些改动。", uiLocale)}</p></div>
    <footer><button autoFocus type="button" onClick={() => onFinish(false)}>{prompt.busy ? uiText("留在当前页面", uiLocale) : uiText("继续编辑", uiLocale)}</button>{!prompt.busy && <button type="button" onClick={() => onFinish(true)}>{uiText("放弃改动并继续", uiLocale)}</button>}</footer>
  </dialog>
}

export function RegistrationDraftGuard({ children, title = '还有未保存的报名信息' }) {
  const entries = useRef(new Map())
  const pending = useRef(null)
  const [prompt, setPrompt] = useState(null)
  const [draftRevision, setDraftRevision] = useState(0)
  const register = useCallback((id, entry) => {
    entries.current.set(id, entry)
    setDraftRevision(value => value + 1)
    return () => { entries.current.delete(id); setDraftRevision(value => value + 1) }
  }, [])
  const confirmDiscard = useCallback(({ exceptLabels = [] } = {}) => {
    const current = [...entries.current].filter(([, entry]) => !exceptLabels.includes(entry.label))
    if (!current.length) return Promise.resolve(true)
    if (pending.current) return pending.current.promise
    let resolve
    const promise = new Promise(done => { resolve = done })
    pending.current = { promise, resolve, ids: current.map(([id]) => id) }
    setPrompt({ labels: [...new Set(current.map(([, entry]) => entry.label))], busy: current.some(([, entry]) => entry.busy) })
    return promise
  }, [])
  const finish = useCallback(allowed => {
    const request = pending.current
    if (!request) return
    const current = request.ids.map(id => entries.current.get(id)).filter(Boolean)
    if (allowed && current.some(entry => entry.busy)) return
    if (allowed) current.forEach(entry => entry.discard?.())
    pending.current = null; setPrompt(null); request.resolve(allowed)
  }, [])
  useEffect(() => {
    const request = pending.current
    if (!request) return
    const current = request.ids.map(id => entries.current.get(id)).filter(Boolean)
    if (!current.length) { finish(true); return }
    setPrompt({ labels: [...new Set(current.map(entry => entry.label))], busy: current.some(entry => entry.busy) })
  }, [draftRevision, finish])
  useEffect(() => () => { pending.current?.resolve(false); pending.current = null }, [])
  const blocker = useBlocker(useCallback(() => entries.current.size > 0, []))
  const blockerRef = useRef(blocker)
  useLayoutEffect(() => { blockerRef.current = blocker }, [blocker])
  useEffect(() => {
    if (blocker.state !== 'blocked') return undefined
    let cancelled = false
    void confirmDiscard().then(allowed => {
      if (cancelled || blockerRef.current.state !== 'blocked') return
      if (allowed) blockerRef.current.proceed()
      else blockerRef.current.reset()
    })
    return () => { cancelled = true }
  }, [blocker.state, confirmDiscard])
  useEffect(() => {
    const warn = event => { if (entries.current.size) { event.preventDefault(); event.returnValue = '' } }
    const protectDraft = event => { if (entries.current.size) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    window.addEventListener(ACCOUNT_SIGN_OUT_EVENT, protectDraft)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener(ACCOUNT_SIGN_OUT_EVENT, protectDraft) }
  }, [])
  const value = useMemo(() => ({ register, confirmDiscard }), [register, confirmDiscard])
  return <DraftContext.Provider value={value}>{children}{prompt && <DraftDiscardDialog prompt={prompt} title={title} onFinish={finish} />}</DraftContext.Provider>
}

export function useRegistrationDraftActions() { return useContext(DraftContext) }

export function useRegistrationDraft(dirty, { label, busy = false, discard }) {
  const { register } = useRegistrationDraftActions()
  const id = useId()
  const discardRef = useRef(discard)
  useLayoutEffect(() => { discardRef.current = discard }, [discard])
  useEffect(() => {
    if (!dirty && !busy) return undefined
    return register(id, { label, busy, discard: () => discardRef.current?.() })
  }, [dirty, busy, id, label, register])
}
