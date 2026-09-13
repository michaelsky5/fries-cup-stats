import { translateUiText as uiText } from '../../lib/uiText.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getInitialSeasonId, withSeason } from '../../config/seasons.js'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import useAccountCompetition from '../my-space/useAccountCompetition.js'
import {
  DEFAULT_REGION_GROUP,
  REGION_GROUPS,
  getLocalizedOption,
  getRegionGroup,
  getRegionGroupValueForCode,
  getRegionOption
} from './regionOptions.js'
import PasswordRecoveryPanel from './PasswordRecoveryPanel.jsx'
import usePasswordRecovery from './usePasswordRecovery.js'
import { passwordRecoveryTitle, readPasswordResetLocation } from './passwordRecoveryModel.js'
import styles from './AuthDialog.module.css'
import { canSignOutOfAccount, UNSAVED_ACCOUNT_MESSAGE } from '../account-ui/accountNavigationGuard.js'

function createLocalAuthError(code) {
  return {
    data: { error: code }
  }
}

function getInitial(user) {
  const source = user?.username || user?.displayName || user?.email || 'FC'
  return String(source).trim().slice(0, 1) || 'F'
}

const QQ_FIRST_REGION_CODES = new Set(['CN', 'HK', 'MO', 'TW'])

function getAuthErrorText(error, locale) {
  const fallback = locale === 'en-US'
    ? 'Unable to complete this request.'
    : uiText("请求未完成，请稍后重试。", locale)

  if (!error) return ''
  const errorCode = error?.data?.error
  if (errorCode === 'REGISTRATION_DISABLED') return locale === 'en-US' ? 'Access is by invitation. Open the link from your organizer or team captain.' : uiText("当前采用邀请制，请打开赛事负责人或队长提供的邀请链接。", locale)
  if (errorCode === 'ORIGIN_NOT_ALLOWED') return locale === 'en-US' ? 'This site is not connected to the account service yet.' : uiText("当前站点尚未接通账号服务，请联系赛事负责人。", locale)
  if (errorCode === 'EMAIL_DELIVERY_UNAVAILABLE') return locale === 'en-US' ? 'Email delivery is not available yet.' : uiText("邮件服务暂未开放，请联系赛事负责人。", locale)
  if (error.status >= 500 || error.name === 'TypeError') return locale === 'en-US' ? 'The account service is unavailable. Please try again later.' : uiText("账号服务暂时不可用，请稍后重试。", locale)
  if (errorCode === 'PASSWORD_MISMATCH') {
    return locale === 'en-US' ? 'Passwords do not match.' : uiText("两次输入的密码不一致。", locale)
  }
  if (errorCode === 'USERNAME_EXISTS') {
    return locale === 'en-US' ? 'This username is already taken.' : uiText("这个用户名已经被使用。", locale)
  }
  if (errorCode === 'INVALID_USERNAME') {
    return locale === 'en-US'
      ? 'Username can only use letters, numbers, underscore, dash, or dot.'
      : uiText("用户名只能使用文字、数字、下划线、短横线或点号。", locale)
  }
  if (errorCode === 'USERNAME_REQUIRED') {
    return locale === 'en-US' ? 'Username is required.' : uiText("请填写用户名。", locale)
  }
  if (errorCode === 'CONTACT_REQUIRED') {
    return locale === 'en-US'
      ? 'Please provide at least one QQ or Discord contact.'
      : uiText("请至少填写 QQ 或 Discord 联系方式。", locale)
  }
  if (errorCode === 'INVALID_QQ_CONTACT') {
    return locale === 'en-US' ? 'QQ must be a 5-12 digit number.' : uiText("QQ 必须是 5-12 位数字。", locale)
  }
  if (errorCode === 'INVALID_DISCORD_CONTACT') {
    return locale === 'en-US' ? 'Discord contact is too short.' : uiText("Discord 联系方式太短。", locale)
  }
  if (errorCode === 'CONTACT_TYPE_REGION_MISMATCH') {
    return locale === 'en-US'
      ? 'The contact type does not match the selected region.'
      : uiText("联系方式类型和选择的地区不匹配。", locale)
  }
  if (['PASSWORD_RESET_TOKEN_INVALID', 'PASSWORD_RESET_TOKEN_USED'].includes(errorCode)) {
    return locale === 'en-US' ? 'This reset link is no longer usable.' : uiText("这个密码重置链接已失效或已使用。", locale)
  }
  if (errorCode === 'PASSWORD_RESET_TOKEN_EXPIRED') {
    return locale === 'en-US' ? 'This reset link has expired.' : uiText("这个密码重置链接已经过期。", locale)
  }
  if (error.status === 401) {
    return locale === 'en-US' ? 'Invalid email or password.' : uiText("邮箱或密码不正确。", locale)
  }
  if (error.status === 409) {
    return locale === 'en-US' ? 'This email is already registered.' : uiText("这个邮箱已经注册。", locale)
  }
  if (error.status === 404) {
    return locale === 'en-US'
      ? 'The account API is not ready yet.'
      : uiText("账号服务暂未开放，请稍后重试。", locale)
  }

  return error.message || fallback
}

export function AuthDialog({ open, onClose, onSignedIn, locale, initialMode = 'login', resetLink }) {
  const {
    authConfig,
    authConfigError,
    retryAuthConfig,
    emailAppealState,
    emailChangeState,
    emailVerificationState,
    isAuthenticated,
    login,
    refreshSession,
    register,
    user
  } = useAuth()
  const [mode, setMode] = useState(resetLink?.present ? 'reset' : initialMode === 'forgot' ? 'forgot' : 'login')
  const [forceSignIn, setForceSignIn] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [regionGroup, setRegionGroup] = useState(DEFAULT_REGION_GROUP)
  const [regionCode, setRegionCode] = useState('CN')
  const [regionSearch, setRegionSearch] = useState('')
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false)
  const [qqContact, setQqContact] = useState('')
  const [discordContact, setDiscordContact] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef(null)
  const submitLock = useRef(false)
  const pending = useRef(false)
  const registrationAllowed = authConfig?.selfRegistrationEnabled === true
  const recovery = usePasswordRecovery({ open, resetLink, locale, authConfig, refreshSession })
  const isRecovery = mode === 'forgot' || mode === 'reset'
  useEffect(() => { pending.current = recovery.busy || isSubmitting }, [recovery.busy, isSubmitting])
  useEffect(() => { if (!open) { setPassword(''); setConfirmPassword('') } }, [open])

  const copy = useMemo(() => {
    const isEn = locale === 'en-US'
    return {
      account: isEn ? 'Account' : uiText("账号", locale),
      close: isEn ? 'Close' : uiText("关闭", locale),
      login: isEn ? 'Sign In' : uiText("登录", locale),
      register: isEn ? 'Create Account' : uiText("注册", locale),
      email: isEn ? 'Email' : uiText("邮箱", locale),
      displayName: isEn ? 'Username' : uiText("用户名", locale),
      password: isEn ? 'Password' : uiText("密码", locale),
      confirmPassword: isEn ? 'Confirm Password' : uiText("确认密码", locale),
      regionGroup: isEn ? 'Area' : uiText("区域", locale),
      region: isEn ? 'Country / Region' : uiText("国家 / 地区", locale),
      regionSearch: isEn ? 'Search country / region' : uiText("搜索国家 / 地区", locale),
      noRegionResults: isEn ? 'No matching country or region.' : uiText("没有匹配的国家或地区。", locale),
      qqContact: isEn ? 'QQ' : 'QQ',
      discordContact: isEn ? 'Discord' : 'Discord',
      contactGroup: isEn ? 'Contact' : uiText("联系方式", locale),
      contactHint: isEn ? 'At least one required' : uiText("至少填写一项", locale),
      submitLogin: isEn ? 'Sign In' : uiText("登录", locale),
      submitRegister: isEn ? 'Create Account' : uiText("创建账号", locale),
      signingIn: isEn ? 'Working' : uiText("处理中", locale),
      logout: isEn ? 'Sign Out' : uiText("退出登录", locale)
    }
  }, [locale])

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('input:not([type="hidden"]), button')?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape' && !pending.current) onClose()
      if (event.key === 'Tab') {
        const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled)') || [])].filter(element => element.getClientRects().length)
        const first = focusable[0]
        const last = focusable.at(-1)
        const outsideTabOrder = !focusable.includes(document.activeElement)
        if (event.shiftKey && (document.activeElement === first || outsideTabOrder)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || outsideTabOrder)) { event.preventDefault(); first?.focus() }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose, open])

  useEffect(() => {
    if (open) dialogRef.current?.querySelector('h2')?.focus()
  }, [open, mode, recovery.stage])

  useEffect(() => {
    if (!open) return
    setError(null)
    setIsSubmitting(false)
    setIsRegionPickerOpen(false)
  }, [open, mode])

  useEffect(() => {
    if (!registrationAllowed && mode === 'register') setMode('login')
  }, [registrationAllowed, mode])

  const selectedRegionGroup = getRegionGroup(regionGroup)
  const selectedRegionOption = getRegionOption(regionCode)
  const searchableRegionOptions = useMemo(() => (
    REGION_GROUPS.flatMap(group => (
      group.options.map(option => ({
        ...option,
        groupValue: group.value,
        groupLabel: getLocalizedOption(group, locale)
      }))
    ))
  ), [locale])
  const regionOptions = useMemo(() => {
    const query = regionSearch.trim().toLocaleLowerCase()
    const baseOptions = query
      ? searchableRegionOptions
      : selectedRegionGroup.options.map(option => ({
          ...option,
          groupValue: selectedRegionGroup.value,
          groupLabel: getLocalizedOption(selectedRegionGroup, locale)
        }))

    if (!query) return baseOptions

    return baseOptions.filter(option => [
      option.value,
      option.zh,
      option.en,
      option.groupLabel
    ].some(value => String(value || '').toLocaleLowerCase().includes(query)))
  }, [locale, regionSearch, searchableRegionOptions, selectedRegionGroup])
  const contactFields = QQ_FIRST_REGION_CODES.has(regionCode)
    ? ['QQ', 'DISCORD']
    : ['DISCORD', 'QQ']

  const handleRegionSelect = option => {
    setRegionCode(option.value)
    setRegionGroup(option.groupValue || getRegionGroupValueForCode(option.value))
    setRegionSearch('')
    setIsRegionPickerOpen(false)
  }

  if (!open) return null

  const clearCredentials = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (submitLock.current) return
    submitLock.current = true
    setError(null)
    setSuccess('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        if (!registrationAllowed) { setError(createLocalAuthError('REGISTRATION_DISABLED')); return }
        if (password !== confirmPassword) {
          setError(createLocalAuthError('PASSWORD_MISMATCH'))
          return
        }
        if (!qqContact.trim() && !discordContact.trim()) {
          setError(createLocalAuthError('CONTACT_REQUIRED'))
          return
        }

        await register({
          email,
          password,
          username: displayName,
          displayName,
          regionCode,
          qqContact,
          discordContact
        })
      } else {
        const signedIn = await login({ email, password })
        await onSignedIn?.(signedIn)
      }
      clearCredentials()
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div data-design="signal" className={styles.backdrop} role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget && !recovery.busy && !isSubmitting) onClose()
    }}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label={copy.account}>
        <header className={styles.dialogHeader}>
          <div className={styles.dialogHeading}>
            <span>FRIES CUP / ACCOUNT</span>
            <h2 tabIndex={-1} className={styles.dialogTitle}>{isRecovery ? passwordRecoveryTitle(recovery.stage, locale, recovery.error) : mode === 'register' ? copy.register : (locale === 'en-US' ? 'Welcome back' : uiText("欢迎回到薯条杯", locale))}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={recovery.busy || isSubmitting} aria-label={copy.close}>
            ×
          </button>
        </header>

        <div className={styles.dialogBody}>
          {emailChangeState?.status === 'COMPLETED' ? (
            <p className={styles.emailChangeNotice} data-tone="success">{uiText("邮箱已更换，所有登录设备均已退出。请使用新邮箱重新登录。", locale)}</p>
          ) : emailChangeState?.status === 'CONFIRMED' ? (
            <p className={styles.emailChangeNotice} data-tone="success">{uiText("这一侧邮箱已确认；完成另一封确认邮件后才会正式更换。", locale)}</p>
          ) : emailChangeState?.status === 'ERROR' ? (
            <p className={styles.emailChangeNotice} data-tone="error">{uiText("邮箱确认链接无效、已过期或已被取消。", locale)}</p>
          ) : null}
          {emailAppealState?.status === 'PENDING_REVIEW' ? (
            <p className={styles.emailChangeNotice} data-tone="success">{uiText("新邮箱已验证，换绑申请已经进入 System 人工审核。", locale)}</p>
          ) : emailAppealState?.status === 'ERROR' ? (
            <p className={styles.emailChangeNotice} data-tone="error">{uiText("新邮箱验证链接无效、已过期或申请已取消。", locale)}</p>
          ) : null}
          {isRecovery ? <PasswordRecoveryPanel recovery={recovery} locale={locale} deliveryEnabled={authConfig?.emailVerificationEnabled === true} configLoading={!authConfig && !authConfigError} configError={authConfigError} retryConfig={retryAuthConfig} onLogin={() => { setForceSignIn(true); setMode('login'); setPassword(''); setConfirmPassword(''); if (recovery.email) setEmail(recovery.email) }} /> : isAuthenticated && !onSignedIn && !forceSignIn ? (
            <div className={styles.formIntro}><strong>{user?.displayName || user?.email}</strong><p>{locale === 'en-US' ? 'Manage your profile, password, email and devices in account settings.' : uiText("前往账号设置，管理资料、密码、邮箱和登录设备。", locale)}</p><Link to="/account" onClick={onClose}>{locale === 'en-US' ? 'Open account settings →' : uiText("打开账号设置 →", locale)}</Link></div>
          ) : (
            <>
              {['login', 'register'].includes(mode) ? registrationAllowed ? <div className={styles.tabs} role="tablist" aria-label={copy.account}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${mode === 'login' ? styles.tabButtonActive : ''}`}
                  disabled={isSubmitting}
                  onClick={() => { setMode('login'); setSuccess('') }}
                >
                  {copy.login}
                </button>
                {registrationAllowed ? <button
                  type="button"
                  className={`${styles.tabButton} ${mode === 'register' ? styles.tabButtonActive : ''}`}
                  disabled={isSubmitting}
                  onClick={() => { setMode('register'); setSuccess('') }}
                >
                  {copy.register}
                </button> : null}
              </div> : null : (
                <button type="button" className={styles.formSwitch} onClick={() => { setMode('login'); setSuccess('') }}>
                  ← {locale === 'en-US' ? 'Back to sign in' : uiText("返回登录", locale)}
                </button>
              )}

              {!registrationAllowed && mode === 'login' ? <p className={styles.invitationNotice}>{locale === 'en-US' ? 'Access is by invitation. Sign in with your invited email, or open the invitation link from your organizer or team captain.' : uiText("当前采用邀请制。请使用受邀邮箱登录；首次参加，请打开赛事负责人或队长提供的邀请链接。", locale)}</p> : null}
              {authConfigError ? <p className={styles.invitationNotice}>{locale === 'en-US' ? 'Account configuration is unavailable.' : uiText("账号服务配置暂时不可用。", locale)} <button type="button" onClick={retryAuthConfig}>{locale === 'en-US' ? 'Retry' : uiText("重试", locale)}</button></p> : null}
              {emailVerificationState?.status === 'VERIFIED' ? <p className={styles.invitationNotice}>{locale === 'en-US' ? 'Email verified. You can sign in now.' : uiText("邮箱已验证，可以登录账号。", locale)}</p> : null}
              {emailVerificationState?.status === 'ERROR' ? <p className={styles.errorText}>{locale === 'en-US' ? 'This email verification link could not be confirmed.' : uiText("邮箱验证链接未能确认，请登录账号设置后重新申请。", locale)}</p> : null}
              <form className={styles.form} onSubmit={handleSubmit}>
                {mode === 'register' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="fries-cup-auth-name">{copy.displayName}</label>
                      <input
                        id="fries-cup-auth-name"
                        type="text"
                        autoComplete="username"
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.regionControl}>
                      <div className={styles.fieldPair}>
                        <div className={styles.field}>
                          <label htmlFor="fries-cup-auth-region-group">{copy.regionGroup}</label>
                          <select
                            id="fries-cup-auth-region-group"
                            value={regionGroup}
                            onChange={event => {
                              const nextGroup = getRegionGroup(event.target.value)
                              const nextRegionCode = nextGroup.options[0].value
                              setRegionGroup(nextGroup.value)
                              setRegionCode(nextRegionCode)
                              setRegionSearch('')
                              setIsRegionPickerOpen(true)
                            }}
                            required
                          >
                            {REGION_GROUPS.map(option => (
                              <option key={option.value} value={option.value}>
                                {getLocalizedOption(option, locale)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="fries-cup-auth-region-toggle">{copy.region}</label>
                          <button
                            id="fries-cup-auth-region-toggle"
                            type="button"
                            className={styles.regionToggle}
                            aria-expanded={isRegionPickerOpen}
                            aria-controls="fries-cup-auth-region-list"
                            onClick={() => {
                              setRegionSearch('')
                              setIsRegionPickerOpen(value => !value)
                            }}
                          >
                            <span>{getLocalizedOption(selectedRegionOption, locale)}</span>
                            <em>{regionCode}</em>
                          </button>
                        </div>
                      </div>

                      {isRegionPickerOpen ? (
                        <div className={styles.regionPicker}>
                          <div className={styles.regionSearchField}>
                            <input
                              id="fries-cup-auth-region-search"
                              type="search"
                              autoComplete="off"
                              value={regionSearch}
                              placeholder={copy.regionSearch}
                              onChange={event => setRegionSearch(event.target.value)}
                            />
                          </div>

                          <div
                            id="fries-cup-auth-region-list"
                            className={styles.regionOptionList}
                            role="listbox"
                            aria-label={copy.region}
                          >
                            {regionOptions.length === 0 ? (
                              <div className={styles.regionEmpty}>{copy.noRegionResults}</div>
                            ) : regionOptions.map(option => (
                              <button
                                key={`${option.groupValue}-${option.value}`}
                                type="button"
                                className={`${styles.regionOption} ${option.value === regionCode ? styles.regionOptionActive : ''}`}
                                onClick={() => handleRegionSelect(option)}
                                role="option"
                                aria-selected={option.value === regionCode}
                              >
                                <span>{getLocalizedOption(option, locale)}</span>
                                <em>{option.groupLabel} / {option.value}</em>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.contactGroup} aria-describedby="fries-cup-auth-contact-hint">
                      <div className={styles.contactHeader}>
                        <span>{copy.contactGroup}</span>
                        <em id="fries-cup-auth-contact-hint">{copy.contactHint}</em>
                      </div>
                      <div className={styles.contactPair}>
                        {contactFields.map(contactField => (
                          <div className={styles.field} key={contactField}>
                            <label htmlFor={`fries-cup-auth-contact-${contactField.toLowerCase()}`}>
                              {contactField === 'QQ' ? copy.qqContact : copy.discordContact}
                            </label>
                            <input
                              id={`fries-cup-auth-contact-${contactField.toLowerCase()}`}
                              type={contactField === 'QQ' ? 'tel' : 'text'}
                              inputMode={contactField === 'QQ' ? 'numeric' : 'text'}
                              pattern={contactField === 'QQ' ? '[1-9][0-9]{4,11}' : undefined}
                              autoComplete="off"
                              value={contactField === 'QQ' ? qqContact : discordContact}
                              onChange={event => {
                                if (contactField === 'QQ') {
                                  setQqContact(event.target.value)
                                } else {
                                  setDiscordContact(event.target.value)
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {mode !== 'reset' ? <div className={styles.field}>
                  <label htmlFor="fries-cup-auth-email">{copy.email}</label>
                  <input
                    id="fries-cup-auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                  />
                </div> : null}

                {mode !== 'forgot' ? <div className={styles.field}>
                  <label htmlFor="fries-cup-auth-password">{copy.password}</label>
                  <input
                    id="fries-cup-auth-password"
                    type="password"
                    autoComplete={['register', 'reset'].includes(mode) ? 'new-password' : 'current-password'}
                    minLength={['register', 'reset'].includes(mode) ? 8 : 1}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                  />
                </div> : null}

                {['register', 'reset'].includes(mode) ? (
                  <div className={styles.field}>
                    <label htmlFor="fries-cup-auth-confirm-password">{copy.confirmPassword}</label>
                    <input
                      id="fries-cup-auth-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>
                ) : null}

                {error ? (
                  <p className={styles.errorText} role="alert">{getAuthErrorText(error, locale)}</p>
                ) : null}
                {success ? <p className={styles.successText} role="status">{success}</p> : null}

                <button type="submit" className={styles.submitButton} disabled={isSubmitting || (mode === 'forgot' && authConfig?.emailVerificationEnabled !== true)}>
                  {isSubmitting ? copy.signingIn : mode === 'register' ? copy.submitRegister : mode === 'forgot' ? (locale === 'en-US' ? 'Send reset link' : uiText("发送重置链接", locale)) : mode === 'reset' ? (locale === 'en-US' ? 'Update password' : uiText("更新密码", locale)) : copy.submitLogin}
                </button>
                {mode === 'login' ? <button type="button" className={styles.formSwitch} disabled={isSubmitting} onClick={() => { recovery.beginRequest(email); setMode('forgot'); setSuccess(''); setPassword(''); setConfirmPassword('') }}>{locale === 'en-US' ? 'Forgot password?' : uiText("忘记密码？", locale)}</button> : null}
              </form>
            </>
          )}
        </div>
        <footer className={styles.dialogRail}>
          <span>{locale === 'en-US' ? 'Your matches. Your team. One account.' : uiText("比赛、队伍与个人事务，都从这里继续。", locale)}</span>
        </footer>
      </section>
    </div>, document.body
  )
}

export default function AuthButton({ locale = 'zh-CN', dialogOnly = false }) {
  const {
    emailAppealState,
    emailChangeState,
    emailVerificationState,
    isAuthenticated,
    isBootstrapping,
    logout,
    user
  } = useAuth()
  const [open, setOpen] = useState(false)
  const [resetLink] = useState(() => readPasswordResetLocation(window.location))
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutState, setLogoutState] = useState('')
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return undefined
    const dismiss = event => {
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        menuRef.current?.querySelector('button')?.focus()
      } else if (menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss) }
  }, [menuOpen])
  const [emailLinkVisit] = useState(() => ['verifyEmail', 'emailChangeToken', 'emailAppealToken'].some(key => new URLSearchParams(window.location.search).has(key)))
  const emailLinkHandled = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const close = useCallback(() => setOpen(false), [])
  const competition = useAccountCompetition(getInitialSeasonId())
  const spaceHref = competition.link(withSeason('/me', getInitialSeasonId(), location.search))
  const accountHref = competition.link(withSeason('/account', getInitialSeasonId(), location.search))
  const openAccount = useCallback(() => {
    if (isAuthenticated && !resetLink.present) {
      setOpen(false)
      if (location.pathname !== '/account') navigate(accountHref)
    } else setOpen(true)
  }, [isAuthenticated, location.pathname, navigate, accountHref, resetLink.present])
  const isEn = locale === 'en-US'
  const label = isAuthenticated
    ? user?.username || user?.displayName || user?.email || (isEn ? 'Account' : uiText("账号", locale))
    : isEn ? 'SIGN IN' : uiText("登录", locale)
  const accountModeLabel = isAuthenticated
    ? (isEn ? 'ACCOUNT' : uiText("账号中心", locale))
    : (isEn ? 'ACCOUNT ACCESS' : uiText("账户入口", locale))

  useEffect(() => {
    window.addEventListener('fries-cup:open-account', openAccount)
    return () => window.removeEventListener('fries-cup:open-account', openAccount)
  }, [openAccount])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (resetLink.present) setOpen(true)
  }, [resetLink.present])

  useEffect(() => {
    const resultStatuses = [
      emailAppealState?.status,
      emailChangeState?.status,
      emailVerificationState?.status
    ]
    if (emailLinkVisit && !emailLinkHandled.current && resultStatuses.some(status => ['VERIFIED', 'COMPLETED', 'CONFIRMED', 'PENDING_REVIEW', 'ERROR'].includes(status))) {
      emailLinkHandled.current = true
      openAccount()
    }
  }, [emailLinkVisit, emailAppealState?.status, emailChangeState?.status, emailVerificationState?.status, openAccount])

  return (
    <>
      {!dialogOnly ? <div ref={menuRef} className={styles.accountEntry}><button
        type="button"
        className={styles.authButton}
        aria-label={label}
        onClick={() => isAuthenticated ? setMenuOpen(value => !value) : openAccount()}
        aria-expanded={isAuthenticated ? menuOpen : undefined}
        aria-controls={isAuthenticated ? "account-navigation" : undefined}
        disabled={isBootstrapping}
      >
        <span className={styles.avatar} aria-hidden="true">{isAuthenticated ? getInitial(user) : 'FC'}</span>
        <span className={styles.authCopy}>
          <span className={styles.authName}>{isBootstrapping ? (isEn ? 'CHECKING' : uiText("检查中", locale)) : label}</span>
          <small className={styles.authMode}>{accountModeLabel}</small>
        </span>
        <span className={styles.authArrow} aria-hidden="true">⌄</span>
      </button>
      {menuOpen && isAuthenticated ? <nav id="account-navigation" className={styles.accountMenu} aria-label={isEn ? 'Account navigation' : uiText("账号导航", locale)}><div><strong>{user?.displayName || label}</strong><span>{user?.email}</span></div><Link to={spaceHref} onClick={() => setMenuOpen(false)}>{isEn ? 'My Space' : uiText("我的空间", locale)} <span>→</span></Link><Link to={accountHref} onClick={() => setMenuOpen(false)}>{isEn ? 'Account settings' : uiText("账号设置", locale)} <span>↗</span></Link><button type="button" disabled={logoutState === 'busy'} onClick={async () => { if (!canSignOutOfAccount()) { setLogoutState('unsaved'); return } setLogoutState('busy'); try { await logout(); setMenuOpen(false); setLogoutState('') } catch { setLogoutState('error') } }}>{logoutState === 'busy' ? (isEn ? 'Signing out…' : uiText("正在退出…", locale)) : (isEn ? 'Sign out' : uiText("退出登录", locale))}</button>{logoutState === 'unsaved' ? <p role="alert">{isEn ? 'Save or discard your changes before signing out.' : UNSAVED_ACCOUNT_MESSAGE}</p> : null}{logoutState === 'error' ? <p role="alert">{isEn ? 'Sign out failed. Please retry.' : uiText("退出失败，请重试。", locale)}</p> : null}</nav> : null}
      </div> : null}
      <AuthDialog open={open} onClose={close} locale={locale} resetLink={resetLink} />
    </>
  )
}
