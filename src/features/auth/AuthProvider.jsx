import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearStoredAuth,
  confirmEmailAppeal,
  confirmEmailChange,
  confirmEmailVerification,
  fetchAuthConfig,
  fetchCurrentUser,
  loginWithPassword,
  registerWithPassword,
  revokeCurrentSession,
  requestEmailVerification as requestEmailVerificationApi
} from './authService.js'
import {
  fetchUserIdentityBundle,
  fetchUserProfile,
  fetchVerificationRequests,
  updatePrimaryIdentityPreference
} from './userDataApi.js'

const AuthContext = createContext(null)

function getInitialAuthState() {
  return {
    user: null,
    isBootstrapping: true
  }
}

function emptyAccountState() {
  return { profile: null, requests: [], identities: [], competitionSeasons: null, primaryIdentity: null, capabilities: null, isLoading: false, error: null }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState)
  const [authConfig, setAuthConfig] = useState(null)
  const [authConfigError, setAuthConfigError] = useState(null)
  const [authConfigAttempt, setAuthConfigAttempt] = useState(0)
  const [accountState, setAccountState] = useState(emptyAccountState)
  const [emailVerificationState, setEmailVerificationState] = useState({
    status: 'IDLE',
    result: null,
    error: null
  })
  const [emailChangeState, setEmailChangeState] = useState({
    status: 'IDLE',
    result: null,
    error: null
  })
  const [emailAppealState, setEmailAppealState] = useState({
    status: 'IDLE',
    result: null,
    error: null
  })
  const processedEmailToken = useRef(null)
  const processedEmailChangeToken = useRef(null)
  const processedEmailAppealToken = useRef(null)
  const sessionEpoch = useRef(0)
  const accountRequest = useRef(0)
  const currentUserId = useRef('')
  const sessionChannel = useRef(null)

  const resetEmailStates = useCallback(() => {
    setEmailVerificationState({ status: 'IDLE', result: null, error: null })
    setEmailChangeState({ status: 'IDLE', result: null, error: null })
    setEmailAppealState({ status: 'IDLE', result: null, error: null })
  }, [])

  const retryAuthConfig = useCallback(() => setAuthConfigAttempt(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setAuthConfigError(null)
    fetchAuthConfig({ signal: controller.signal }).then(config => {
      if (!controller.signal.aborted) setAuthConfig(config)
    }).catch(error => {
      if (!controller.signal.aborted) { setAuthConfig(null); setAuthConfigError(error) }
    })
    return () => controller.abort()
  }, [authConfigAttempt])

  const installSession = useCallback(user => {
    if (currentUserId.current !== (user?.id || '')) resetEmailStates()
    sessionEpoch.current += 1
    accountRequest.current += 1
    currentUserId.current = user?.id || ''
    clearStoredAuth()
    setAuthState({ user: user || null, isBootstrapping: false })
    setAccountState({ ...emptyAccountState(), isLoading: Boolean(user?.id) })
  }, [resetEmailStates])

  const clearRevokedSession = useCallback(() => {
    installSession(null)
    sessionChannel.current?.postMessage('SESSION_CHANGED')
  }, [installSession])

  // Account settings remain usable independently of season/identity services.
  const refreshSession = useCallback(async () => {
    const epoch = sessionEpoch.current
    try {
      const user = await fetchCurrentUser()
      if (epoch !== sessionEpoch.current) return null
      if (user?.id !== currentUserId.current) installSession(user)
      else setAuthState({ user, isBootstrapping: false })
      return user
    } catch (error) {
      if (epoch !== sessionEpoch.current) return null
      if (error?.status === 401) clearRevokedSession()
      throw error
    }
  }, [clearRevokedSession, installSession])

  useEffect(() => {
    clearStoredAuth()
    let controller
    const syncCookieSession = () => {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      const epoch = ++sessionEpoch.current
      accountRequest.current += 1
      currentUserId.current = ''
      resetEmailStates()
      setAuthState({ user: null, isBootstrapping: true })
      setAccountState(emptyAccountState())
      fetchCurrentUser({ signal })
        .then(user => {
          if (signal.aborted || epoch !== sessionEpoch.current) return
          installSession(user)
        })
        .catch(error => {
          if (signal.aborted || epoch !== sessionEpoch.current) return
          installSession(null)
          if (error?.status !== 401) setAccountState({ ...emptyAccountState(), error })
        })
    }
    // Broadcast only an invalidation signal, never an identity or a credential.
    // Every tab must resolve the new account from the HttpOnly cookie itself.
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('fries-cup:session') : null
    sessionChannel.current = channel
    if (channel) channel.onmessage = event => { if (event.data === 'SESSION_CHANGED') syncCookieSession() }
    syncCookieSession()
    return () => {
      controller?.abort()
      channel?.close()
      sessionChannel.current = null
      sessionEpoch.current += 1
      accountRequest.current += 1
    }
  }, [installSession, resetEmailStates])

  const refreshAccountData = useCallback(async () => {
    const userId = currentUserId.current
    if (!userId) return emptyAccountState()
    const epoch = sessionEpoch.current
    const requestId = ++accountRequest.current
    const isCurrent = () => epoch === sessionEpoch.current && requestId === accountRequest.current && userId === currentUserId.current
    setAccountState(current => ({ ...current, isLoading: true, error: null }))

    try {
      const [currentUser, profile, identityBundle] = await Promise.all([
        fetchCurrentUser(),
        fetchUserProfile(),
        fetchUserIdentityBundle()
      ])
      if (!isCurrent()) return null
      // A cookie can change in another tab. Never attach its identity data to
      // the previous user; verify the new account in a fresh request instead.
      if (currentUser?.id !== userId || (identityBundle.userId && identityBundle.userId !== userId)) {
        installSession(currentUser)
        return null
      }
      const requests = identityBundle.capabilities?.canReadVerificationRequests === true
        ? await fetchVerificationRequests()
        : []
      if (!isCurrent()) return null
      setAuthState({ user: currentUser, isBootstrapping: false })
      const nextState = {
        profile,
        requests,
        identities: identityBundle.identities,
        competitionSeasons: identityBundle.competitionSeasons,
        primaryIdentity: identityBundle.primaryIdentity,
        capabilities: identityBundle.capabilities,
        isLoading: false,
        error: null
      }
      setAccountState(nextState)
      return nextState
    } catch (error) {
      if (!isCurrent()) return null
      if (error?.status === 401) installSession(null)
      // Failed identity refreshes must not retain previously granted actions.
      setAccountState({ ...emptyAccountState(), error })
      throw error
    }
  }, [installSession])

  const setPrimaryIdentity = useCallback(async identityType => {
    if (accountState.capabilities?.canSetPrimaryIdentity !== true) {
      throw new Error('当前账号版本暂不支持更改默认身份。')
    }
    await updatePrimaryIdentityPreference(identityType)
    return refreshAccountData()
  }, [accountState.capabilities?.canSetPrimaryIdentity, refreshAccountData])

  useEffect(() => {
    if (!authState.user?.id) return undefined
    refreshAccountData().catch(() => {})
    return () => { accountRequest.current += 1 }
  }, [authState.user?.id, refreshAccountData])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const params = new URLSearchParams(window.location.search)
    const token = params.get('emailAppealToken') || ''
    if (!token) return undefined
    if (processedEmailAppealToken.current?.token !== token) {
      processedEmailAppealToken.current = { token, promise: confirmEmailAppeal(token) }
    }
    let cancelled = false
    setEmailAppealState({ status: 'VERIFYING', result: null, error: null })
    processedEmailAppealToken.current.promise
      .then(async result => {
        if (cancelled) return
        if (currentUserId.current) await refreshAccountData().catch(() => {})
        if (cancelled) return
        setEmailAppealState({ status: 'PENDING_REVIEW', result, error: null })
        params.delete('emailAppealToken')
        const nextSearch = params.toString()
        window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`)
        window.dispatchEvent(new Event('fries-cup:open-account'))
      })
      .catch(error => {
        if (cancelled) return
        setEmailAppealState({ status: 'ERROR', result: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [refreshAccountData])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const params = new URLSearchParams(window.location.search)
    const token = params.get('emailChangeToken') || ''
    if (!token) return undefined
    if (processedEmailChangeToken.current?.token !== token) {
      processedEmailChangeToken.current = { token, promise: confirmEmailChange(token) }
    }
    let cancelled = false
    setEmailChangeState({ status: 'VERIFYING', result: null, error: null })
    processedEmailChangeToken.current.promise
      .then(async result => {
        if (cancelled) return
        if (result?.completed) {
          installSession(null)
          sessionChannel.current?.postMessage('SESSION_CHANGED')
        } else if (currentUserId.current) {
          await refreshAccountData().catch(() => {})
        }
        if (cancelled) return
        setEmailChangeState({ status: result?.completed ? 'COMPLETED' : 'CONFIRMED', result, error: null })
        params.delete('emailChangeToken')
        const nextSearch = params.toString()
        window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`)
        window.dispatchEvent(new Event('fries-cup:open-account'))
      })
      .catch(error => {
        if (cancelled) return
        setEmailChangeState({ status: 'ERROR', result: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [installSession, refreshAccountData])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const params = new URLSearchParams(window.location.search)
    const token = params.get('verifyEmail') || ''
    if (!token) return undefined
    if (processedEmailToken.current?.token !== token) {
      processedEmailToken.current = { token, promise: confirmEmailVerification(token) }
    }
    let cancelled = false
    setEmailVerificationState({ status: 'VERIFYING', result: null, error: null })

    processedEmailToken.current.promise
      .then(async result => {
        if (cancelled) return
        if (currentUserId.current) await refreshSession()
        if (cancelled) return
        setEmailVerificationState({ status: 'VERIFIED', result, error: null })
        params.delete('verifyEmail')
        const nextSearch = params.toString()
        window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`)
        window.dispatchEvent(new Event('fries-cup:open-account'))
      })
      .catch(error => {
        if (cancelled) return
        setEmailVerificationState({ status: 'ERROR', result: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const login = useCallback(async ({ email, password }) => {
    const epoch = ++sessionEpoch.current
    const auth = await loginWithPassword({ email: email.trim(), password })
    if (!auth?.user?.id) throw new Error('登录响应缺少有效账号，请重新登录。')
    if (epoch !== sessionEpoch.current) return null
    installSession(auth.user)
    sessionChannel.current?.postMessage('SESSION_CHANGED')
    return auth.user
  }, [installSession])

  const register = useCallback(async ({ email, password, username, displayName, regionCode, qqContact, discordContact }) => {
    const epoch = ++sessionEpoch.current
    const normalizedUsername = String(username || displayName || '').trim()
    const auth = await registerWithPassword({
      email: email.trim(),
      password,
      username: normalizedUsername,
      displayName: String(displayName || normalizedUsername).trim(),
      regionCode,
      qqContact: String(qqContact || '').trim(),
      discordContact: String(discordContact || '').trim()
    })
    if (!auth?.user?.id) throw new Error('注册响应缺少有效账号，请重新登录。')
    if (epoch !== sessionEpoch.current) return null
    installSession(auth.user)
    sessionChannel.current?.postMessage('SESSION_CHANGED')
    setEmailVerificationState({
      status: auth.emailVerification?.delivered ? 'SENT' : 'IDLE',
      result: auth.emailVerification || null,
      error: null
    })
    return auth.user
  }, [installSession])

  const requestEmailVerification = useCallback(async () => {
    const epoch = sessionEpoch.current
    setEmailVerificationState({ status: 'SENDING', result: null, error: null })
    try {
      const result = await requestEmailVerificationApi()
      if (epoch !== sessionEpoch.current) return null
      if (result?.verified) await refreshSession()
      if (epoch !== sessionEpoch.current) return null
      setEmailVerificationState({ status: result?.verified ? 'VERIFIED' : result?.delivered ? 'SENT' : 'UNDELIVERED', result, error: null })
      return result
    } catch (error) {
      if (epoch === sessionEpoch.current) setEmailVerificationState({ status: 'ERROR', result: null, error })
      throw error
    }
  }, [refreshSession])

  const logout = useCallback(async () => {
    const epoch = ++sessionEpoch.current
    accountRequest.current += 1
    try {
      await revokeCurrentSession()
    } catch (error) {
      // JavaScript cannot clear an HttpOnly cookie. Report a failed logout
      // instead of displaying a guest while the server session remains active.
      if (error?.status !== 401) throw error
    }
    if (epoch !== sessionEpoch.current) return
    installSession(null)
    sessionChannel.current?.postMessage('SESSION_CHANGED')
  }, [installSession])

  const value = useMemo(() => ({
    user: authState.user,
    isBootstrapping: authState.isBootstrapping,
    isAuthenticated: Boolean(authState.user?.id),
    authConfig,
    authConfigError,
    retryAuthConfig,
    refreshSession,
    clearRevokedSession,
    accountProfile: accountState.profile,
    accountRequests: accountState.requests,
    accountIdentities: accountState.identities,
    accountCompetitions: accountState.competitionSeasons,
    accountPrimaryIdentity: accountState.primaryIdentity,
    accountCapabilities: accountState.capabilities,
    accountDataError: accountState.error,
    isAccountDataLoading: accountState.isLoading,
    emailVerificationState,
    emailChangeState,
    emailAppealState,
    login,
    logout,
    refreshAccountData,
    setPrimaryIdentity,
    register,
    requestEmailVerification
  }), [accountState, authState, authConfig, authConfigError, retryAuthConfig, refreshSession, clearRevokedSession, emailAppealState, emailChangeState, emailVerificationState, login, logout, refreshAccountData, register, requestEmailVerification, setPrimaryIdentity])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
