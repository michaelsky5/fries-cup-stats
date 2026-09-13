import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { confirmPasswordReset, requestPasswordReset } from './authService.js'
import { isPasswordResetComplete, passwordRecoveryFailure, readPasswordResetLocation } from './passwordRecoveryModel.js'
import { validateWeeklyInvitationPassword } from './weeklyInvitationModel.js'

export default function usePasswordRecovery({ open, resetLink, locale, authConfig, refreshSession }) {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useRef(resetLink?.token || '')
  const lock = useRef(false)
  const mounted = useRef(false)
  const [stage, setStage] = useState(resetLink?.present ? resetLink.token ? 'reset' : 'invalid' : 'request')
  const [failure, setFailure] = useState(resetLink?.present && !resetLink.token ? { data: { error: 'PASSWORD_RESET_TOKEN_INVALID' } } : null)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sessionSyncFailed, setSessionSyncFailed] = useState(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!resetLink?.present) return
    const current = readPasswordResetLocation(window.location)
    // Update router context too, so section and language links cannot copy the token.
    if (current.present && current.token === resetLink.token) navigate(resetLink.cleanPath, { replace: true, state: location.state })
  }, [resetLink, navigate, location.state])
  useEffect(() => { if (!open) { setPassword(''); setConfirmation(''); setShowPassword(false) } }, [open])

  function beginRequest(seedEmail) {
    if (lock.current) return
    setStage('request')
    setFailure(null)
    setPassword('')
    setConfirmation('')
    setShowPassword(false)
    if (seedEmail !== undefined) setEmail(seedEmail)
  }

  async function submit(event) {
    event?.preventDefault()
    if (lock.current || !['request', 'sent', 'reset'].includes(stage)) return
    if (stage !== 'reset' && authConfig?.emailVerificationEnabled !== true) return
    if (stage === 'reset') {
      if (!token.current) { setStage('invalid'); setFailure({ data: { error: 'PASSWORD_RESET_TOKEN_INVALID' } }); return }
      const validation = validateWeeklyInvitationPassword({ password, confirmation, passwordMode: 'SET' }, locale)
      if (validation) { setFailure({ validation }); return }
    }
    lock.current = true
    setBusy(true)
    setFailure(null)
    try {
      if (stage !== 'reset') {
        const target = (stage === 'sent' ? sentTo : email).trim()
        const result = await requestPasswordReset(target)
        if (result?.accepted !== true) throw new Error('Unconfirmed reset request')
        if (mounted.current) { setSentTo(target); setStage('sent') }
      } else {
        const result = await confirmPasswordReset(token.current, password)
        if (!isPasswordResetComplete(result)) throw new Error('Unconfirmed password reset')
        token.current = ''
        if (!mounted.current) return
        setPassword('')
        setConfirmation('')
        setShowPassword(false)
        setStage('complete')
        // A read failure must not turn a confirmed password update into a failure.
        // Refresh only the current cookie session: it may belong to another user.
        void refreshSession().catch(error => {
          if (mounted.current && error?.status !== 401) setSessionSyncFailed(true)
        })
      }
    } catch (error) {
      if (!mounted.current) return
      setFailure(error)
      if (passwordRecoveryFailure(error, locale).terminal) {
        token.current = ''
        setPassword('')
        setConfirmation('')
        setStage('invalid')
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false) }
  }

  return { stage, error: failure ? passwordRecoveryFailure(failure, locale) : null, email, setEmail, sentTo, password, setPassword, confirmation, setConfirmation, showPassword, setShowPassword, busy, sessionSyncFailed, beginRequest, submit }
}
